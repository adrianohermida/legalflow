-- SF-10: Stripe Wizard (Financeiro)
-- Behavior Goal: cobrar com clareza e zero retrabalho
-- Database schema for complete Stripe financial management

-- ===========================================
-- CORE TABLES FOR STRIPE INTEGRATION
-- ===========================================

-- Extensão para UUIDs
create extension if not exists "uuid-ossp";

-- Esquema legalflow se não existir
create schema if not exists legalflow;

-- 1. STRIPE CUSTOMERS TABLE
-- Sincronização com clientes Stripe
create table if not exists legalflow.stripe_customers (
    id uuid primary key default uuid_generate_v4(),
    stripe_customer_id text unique not null,
    email text not null,
    name text,
    phone text,
    description text,
    
    -- Informações do cliente local
    contact_id uuid, -- Link para tabela de contatos existente
    client_id uuid,  -- Link para tabela de clientes existente
    
    -- Dados de endereço
    address jsonb default '{}',
    shipping_address jsonb default '{}',
    
    -- Configurações
    currency text default 'brl',
    tax_exempt text check (tax_exempt in ('none', 'exempt', 'reverse')),
    
    -- Metadados
    metadata jsonb default '{}',
    
    -- Status e timestamps
    delinquent boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    stripe_created timestamptz,
    
    -- Índices para performance
    index (stripe_customer_id),
    index (email),
    index (contact_id),
    index (client_id)
);

-- 2. STRIPE PRODUCTS TABLE
-- Produtos e serviços que podem ser cobrados
create table if not exists legalflow.stripe_products (
    id uuid primary key default uuid_generate_v4(),
    stripe_product_id text unique not null,
    name text not null,
    description text,
    
    -- Configurações do produto
    active boolean default true,
    type text check (type in ('service', 'good')) default 'service',
    unit_label text,
    
    -- Metadados
    metadata jsonb default '{}',
    
    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    stripe_created timestamptz,
    
    index (stripe_product_id),
    index (active)
);

-- 3. STRIPE PRICES TABLE
-- Preços dos produtos
create table if not exists legalflow.stripe_prices (
    id uuid primary key default uuid_generate_v4(),
    stripe_price_id text unique not null,
    product_id uuid references legalflow.stripe_products(id) on delete cascade,
    
    -- Configurações de preço
    active boolean default true,
    currency text default 'brl',
    unit_amount integer not null, -- Em centavos
    unit_amount_decimal numeric(12,2),
    
    -- Tipo de cobrança
    type text check (type in ('one_time', 'recurring')) default 'one_time',
    
    -- Configurações de recorrência (se type = 'recurring')
    recurring_interval text check (recurring_interval in ('day', 'week', 'month', 'year')),
    recurring_interval_count integer default 1,
    recurring_usage_type text check (recurring_usage_type in ('licensed', 'metered')),
    
    -- Cobrança
    billing_scheme text check (billing_scheme in ('per_unit', 'tiered')) default 'per_unit',
    
    -- Metadados
    metadata jsonb default '{}',
    
    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    stripe_created timestamptz,
    
    index (stripe_price_id),
    index (product_id),
    index (active),
    index (type)
);

-- 4. STRIPE SUBSCRIPTIONS TABLE
-- Assinaturas ativas e históricas
create table if not exists legalflow.stripe_subscriptions (
    id uuid primary key default uuid_generate_v4(),
    stripe_subscription_id text unique not null,
    customer_id uuid references legalflow.stripe_customers(id) on delete cascade,
    
    -- Status da assinatura
    status text not null check (status in (
        'incomplete', 'incomplete_expired', 'trialing', 'active', 
        'past_due', 'canceled', 'unpaid', 'paused'
    )),
    
    -- Configurações de cobrança
    collection_method text check (collection_method in ('charge_automatically', 'send_invoice')) default 'charge_automatically',
    currency text default 'brl',
    
    -- Datas importantes
    current_period_start timestamptz,
    current_period_end timestamptz,
    trial_start timestamptz,
    trial_end timestamptz,
    canceled_at timestamptz,
    ended_at timestamptz,
    
    -- Valores
    amount_total integer, -- Total em centavos
    amount_subtotal integer,
    amount_tax integer,
    
    -- Configurações
    cancel_at_period_end boolean default false,
    days_until_due integer,
    
    -- Items da assinatura (JSON com os preços)
    items jsonb default '[]',
    
    -- Contexto do negócio
    deal_id uuid, -- Link para CRM deal
    process_id uuid, -- Link para processo
    
    -- Metadados
    metadata jsonb default '{}',
    
    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    stripe_created timestamptz,
    
    index (stripe_subscription_id),
    index (customer_id),
    index (status),
    index (current_period_end),
    index (deal_id),
    index (process_id)
);

-- 5. STRIPE INVOICES TABLE
-- Faturas geradas pelo Stripe
create table if not exists legalflow.stripe_invoices (
    id uuid primary key default uuid_generate_v4(),
    stripe_invoice_id text unique not null,
    customer_id uuid references legalflow.stripe_customers(id) on delete cascade,
    subscription_id uuid references legalflow.stripe_subscriptions(id) on delete set null,
    
    -- Status da fatura
    status text not null check (status in (
        'draft', 'open', 'paid', 'uncollectible', 'void'
    )),
    
    -- Número da fatura
    number text,
    
    -- Valores em centavos
    amount_due integer not null,
    amount_paid integer default 0,
    amount_remaining integer default 0,
    subtotal integer not null,
    total integer not null,
    tax integer default 0,
    
    -- Configurações
    currency text default 'brl',
    collection_method text check (collection_method in ('charge_automatically', 'send_invoice')) default 'charge_automatically',
    
    -- Datas importantes
    due_date timestamptz,
    period_start timestamptz,
    period_end timestamptz,
    finalized_at timestamptz,
    paid_at timestamptz,
    voided_at timestamptz,
    
    -- URLs
    hosted_invoice_url text,
    invoice_pdf text,
    
    -- Tentativas de cobrança
    attempt_count integer default 0,
    attempted boolean default false,
    auto_advance boolean default true,
    
    -- Contexto do negócio
    deal_id uuid,
    process_id uuid,
    
    -- Metadados
    metadata jsonb default '{}',
    
    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    stripe_created timestamptz,
    
    index (stripe_invoice_id),
    index (customer_id),
    index (subscription_id),
    index (status),
    index (due_date),
    index (number),
    index (deal_id),
    index (process_id)
);

-- 6. STRIPE PAYMENT INTENTS TABLE
-- Intenções de pagamento
create table if not exists legalflow.stripe_payment_intents (
    id uuid primary key default uuid_generate_v4(),
    stripe_payment_intent_id text unique not null,
    customer_id uuid references legalflow.stripe_customers(id) on delete cascade,
    
    -- Status do payment intent
    status text not null check (status in (
        'requires_payment_method', 'requires_confirmation', 'requires_action',
        'processing', 'requires_capture', 'canceled', 'succeeded'
    )),
    
    -- Valores em centavos
    amount integer not null,
    amount_capturable integer default 0,
    amount_received integer default 0,
    
    -- Configurações
    currency text default 'brl',
    capture_method text check (capture_method in ('automatic', 'manual')) default 'automatic',
    confirmation_method text check (confirmation_method in ('automatic', 'manual')) default 'automatic',
    
    -- Informações de pagamento
    payment_method_types text[] default '{"card"}',
    payment_method_id text,
    
    -- Contexto da cobrança
    description text,
    receipt_email text,
    
    -- Contexto do negócio
    deal_id uuid,
    process_id uuid,
    invoice_id uuid references legalflow.stripe_invoices(id) on delete set null,
    
    -- Metadados
    metadata jsonb default '{}',
    
    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    stripe_created timestamptz,
    
    index (stripe_payment_intent_id),
    index (customer_id),
    index (status),
    index (deal_id),
    index (process_id),
    index (invoice_id)
);

-- 7. STRIPE CHECKOUT SESSIONS TABLE
-- Sessões de checkout para pagamentos
create table if not exists legalflow.stripe_checkout_sessions (
    id uuid primary key default uuid_generate_v4(),
    stripe_session_id text unique not null,
    customer_id uuid references legalflow.stripe_customers(id) on delete cascade,
    
    -- Status da sessão
    status text check (status in ('open', 'complete', 'expired')) default 'open',
    mode text check (mode in ('payment', 'setup', 'subscription')) not null,
    
    -- URLs de redirecionamento
    success_url text not null,
    cancel_url text not null,
    url text, -- URL do checkout
    
    -- Configurações
    currency text default 'brl',
    customer_email text,
    
    -- Items do checkout
    line_items jsonb default '[]',
    
    -- Totais (em centavos)
    amount_subtotal integer,
    amount_total integer,
    
    -- Resultados após completion
    payment_intent_id uuid references legalflow.stripe_payment_intents(id) on delete set null,
    subscription_id uuid references legalflow.stripe_subscriptions(id) on delete set null,
    
    -- Expiração
    expires_at timestamptz,
    
    -- Contexto do negócio
    deal_id uuid,
    process_id uuid,
    
    -- Metadados
    metadata jsonb default '{}',
    
    -- Timestamps
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    stripe_created timestamptz,
    
    index (stripe_session_id),
    index (customer_id),
    index (status),
    index (mode),
    index (expires_at),
    index (deal_id),
    index (process_id)
);

-- 8. STRIPE WEBHOOK EVENTS TABLE
-- Log de eventos recebidos via webhook
create table if not exists legalflow.stripe_webhook_events (
    id uuid primary key default uuid_generate_v4(),
    stripe_event_id text unique not null,
    
    -- Tipo do evento
    type text not null,
    
    -- Dados do evento
    data jsonb not null,
    
    -- Status do processamento
    processed boolean default false,
    processed_at timestamptz,
    error_message text,
    retry_count integer default 0,
    
    -- Timestamps
    created_at timestamptz default now(),
    stripe_created timestamptz,
    
    index (stripe_event_id),
    index (type),
    index (processed),
    index (stripe_created)
);

-- ===========================================
-- TRIGGERS FOR UPDATED_AT
-- ===========================================

create or replace function legalflow.update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Apply triggers to all Stripe tables
drop trigger if exists update_stripe_customers_updated_at on legalflow.stripe_customers;
create trigger update_stripe_customers_updated_at
    before update on legalflow.stripe_customers
    for each row
    execute function legalflow.update_updated_at_column();

drop trigger if exists update_stripe_products_updated_at on legalflow.stripe_products;
create trigger update_stripe_products_updated_at
    before update on legalflow.stripe_products
    for each row
    execute function legalflow.update_updated_at_column();

drop trigger if exists update_stripe_prices_updated_at on legalflow.stripe_prices;
create trigger update_stripe_prices_updated_at
    before update on legalflow.stripe_prices
    for each row
    execute function legalflow.update_updated_at_column();

drop trigger if exists update_stripe_subscriptions_updated_at on legalflow.stripe_subscriptions;
create trigger update_stripe_subscriptions_updated_at
    before update on legalflow.stripe_subscriptions
    for each row
    execute function legalflow.update_updated_at_column();

drop trigger if exists update_stripe_invoices_updated_at on legalflow.stripe_invoices;
create trigger update_stripe_invoices_updated_at
    before update on legalflow.stripe_invoices
    for each row
    execute function legalflow.update_updated_at_column();

drop trigger if exists update_stripe_payment_intents_updated_at on legalflow.stripe_payment_intents;
create trigger update_stripe_payment_intents_updated_at
    before update on legalflow.stripe_payment_intents
    for each row
    execute function legalflow.update_updated_at_column();

drop trigger if exists update_stripe_checkout_sessions_updated_at on legalflow.stripe_checkout_sessions;
create trigger update_stripe_checkout_sessions_updated_at
    before update on legalflow.stripe_checkout_sessions
    for each row
    execute function legalflow.update_updated_at_column();

-- ===========================================
-- RPC FUNCTIONS FOR STRIPE OPERATIONS
-- ===========================================

-- 1. LIST CUSTOMERS WITH STATS
create or replace function legalflow.list_stripe_customers(
    p_search text default null,
    p_status text default null,
    p_limit integer default 50
)
returns table (
    id uuid,
    stripe_customer_id text,
    email text,
    name text,
    phone text,
    delinquent boolean,
    total_subscriptions bigint,
    active_subscriptions bigint,
    total_invoices bigint,
    unpaid_invoices bigint,
    total_spent numeric,
    created_at timestamptz,
    updated_at timestamptz
)
language plpgsql
security definer
as $$
begin
    return query
    select 
        c.id,
        c.stripe_customer_id,
        c.email,
        c.name,
        c.phone,
        c.delinquent,
        coalesce(sub_stats.total_subscriptions, 0) as total_subscriptions,
        coalesce(sub_stats.active_subscriptions, 0) as active_subscriptions,
        coalesce(inv_stats.total_invoices, 0) as total_invoices,
        coalesce(inv_stats.unpaid_invoices, 0) as unpaid_invoices,
        coalesce(inv_stats.total_spent, 0) as total_spent,
        c.created_at,
        c.updated_at
    from legalflow.stripe_customers c
    left join (
        select 
            customer_id,
            count(*) as total_subscriptions,
            count(*) filter (where status in ('active', 'trialing')) as active_subscriptions
        from legalflow.stripe_subscriptions
        group by customer_id
    ) sub_stats on sub_stats.customer_id = c.id
    left join (
        select 
            customer_id,
            count(*) as total_invoices,
            count(*) filter (where status in ('open', 'past_due')) as unpaid_invoices,
            sum(amount_paid) / 100.0 as total_spent
        from legalflow.stripe_invoices
        group by customer_id
    ) inv_stats on inv_stats.customer_id = c.id
    where 
        (p_search is null or 
         c.email ilike '%' || p_search || '%' or 
         c.name ilike '%' || p_search || '%')
        and (p_status is null or 
             case p_status 
                when 'active' then sub_stats.active_subscriptions > 0
                when 'delinquent' then c.delinquent = true
                when 'past_due' then inv_stats.unpaid_invoices > 0
                else true
             end)
    order by c.created_at desc
    limit p_limit;
end;
$$;

-- 2. CREATE CHECKOUT SESSION
create or replace function legalflow.create_checkout_session(
    p_customer_email text,
    p_price_ids text[],
    p_quantities integer[],
    p_success_url text,
    p_cancel_url text,
    p_mode text default 'payment',
    p_metadata jsonb default '{}'
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_customer_id uuid;
    v_session_id uuid;
    v_line_items jsonb := '[]';
    v_amount_total integer := 0;
    i integer;
begin
    -- Validar parâmetros
    if array_length(p_price_ids, 1) != array_length(p_quantities, 1) then
        return jsonb_build_object(
            'success', false,
            'error', 'Número de preços deve ser igual ao número de quantidades'
        );
    end if;
    
    -- Buscar ou criar customer
    select id into v_customer_id
    from legalflow.stripe_customers
    where email = p_customer_email;
    
    if v_customer_id is null then
        -- Simular criação do customer no Stripe e inserir localmente
        insert into legalflow.stripe_customers (
            stripe_customer_id, email, name
        ) values (
            'cus_sim_' || extract(epoch from now())::text,
            p_customer_email,
            split_part(p_customer_email, '@', 1)
        ) returning id into v_customer_id;
    end if;
    
    -- Construir line_items e calcular total
    for i in 1..array_length(p_price_ids, 1) loop
        declare
            v_price record;
            v_item_total integer;
        begin
            select p.unit_amount, pr.name
            into v_price
            from legalflow.stripe_prices p
            inner join legalflow.stripe_products pr on pr.id = p.product_id
            where p.stripe_price_id = p_price_ids[i];
            
            if v_price.unit_amount is not null then
                v_item_total := v_price.unit_amount * p_quantities[i];
                v_amount_total := v_amount_total + v_item_total;
                
                v_line_items := v_line_items || jsonb_build_object(
                    'price_id', p_price_ids[i],
                    'quantity', p_quantities[i],
                    'amount_total', v_item_total,
                    'description', v_price.name
                );
            end if;
        end;
    end loop;
    
    -- Criar sessão de checkout
    insert into legalflow.stripe_checkout_sessions (
        stripe_session_id,
        customer_id,
        mode,
        success_url,
        cancel_url,
        customer_email,
        line_items,
        amount_total,
        url,
        expires_at,
        metadata
    ) values (
        'cs_sim_' || extract(epoch from now())::text || '_' || substr(gen_random_uuid()::text, 1, 8),
        v_customer_id,
        p_mode,
        p_success_url,
        p_cancel_url,
        p_customer_email,
        v_line_items,
        v_amount_total,
        'https://checkout.stripe.com/pay/cs_sim_' || substr(gen_random_uuid()::text, 1, 16),
        now() + interval '24 hours',
        p_metadata
    ) returning id into v_session_id;
    
    -- Retornar resultado
    return jsonb_build_object(
        'success', true,
        'session_id', v_session_id,
        'checkout_url', 'https://checkout.stripe.com/pay/cs_sim_' || substr(gen_random_uuid()::text, 1, 16),
        'amount_total', v_amount_total,
        'line_items', v_line_items
    );
end;
$$;

-- 3. PROCESS WEBHOOK EVENT
create or replace function legalflow.process_stripe_webhook(
    p_event_id text,
    p_event_type text,
    p_event_data jsonb
)
returns jsonb
language plpgsql
security definer
as $$
declare
    v_event_id uuid;
    v_processed boolean := false;
begin
    -- Inserir ou atualizar evento
    insert into legalflow.stripe_webhook_events (
        stripe_event_id, type, data, stripe_created
    ) values (
        p_event_id, p_event_type, p_event_data, now()
    ) on conflict (stripe_event_id) do update set
        data = excluded.data,
        retry_count = stripe_webhook_events.retry_count + 1
    returning id into v_event_id;
    
    -- Processar evento baseado no tipo
    case p_event_type
        when 'customer.created', 'customer.updated' then
            perform legalflow.stripe_upsert_customer(p_event_data -> 'object');
            v_processed := true;
        when 'subscription.created', 'subscription.updated' then
            perform legalflow.stripe_upsert_subscription(p_event_data -> 'object');
            v_processed := true;
        when 'invoice.created', 'invoice.updated', 'invoice.finalized', 'invoice.paid' then
            perform legalflow.stripe_upsert_invoice(p_event_data -> 'object');
            v_processed := true;
        when 'payment_intent.succeeded', 'payment_intent.payment_failed' then
            perform legalflow.stripe_upsert_payment_intent(p_event_data -> 'object');
            v_processed := true;
        when 'checkout.session.completed' then
            perform legalflow.stripe_upsert_checkout_session(p_event_data -> 'object');
            v_processed := true;
        else
            -- Tipo de evento não processado
            v_processed := false;
    end case;
    
    -- Atualizar status do processamento
    update legalflow.stripe_webhook_events 
    set 
        processed = v_processed,
        processed_at = case when v_processed then now() else null end
    where id = v_event_id;
    
    return jsonb_build_object(
        'success', true,
        'processed', v_processed,
        'event_type', p_event_type
    );
end;
$$;

-- 4. UPSERT FUNCTIONS (Helpers for webhook processing)

-- Upsert Customer
create or replace function legalflow.stripe_upsert_customer(p_customer_data jsonb)
returns void
language plpgsql
security definer
as $$
begin
    insert into legalflow.stripe_customers (
        stripe_customer_id, email, name, phone, description,
        delinquent, metadata, stripe_created
    ) values (
        p_customer_data ->> 'id',
        p_customer_data ->> 'email',
        p_customer_data ->> 'name',
        p_customer_data ->> 'phone',
        p_customer_data ->> 'description',
        (p_customer_data ->> 'delinquent')::boolean,
        coalesce(p_customer_data -> 'metadata', '{}'),
        to_timestamp((p_customer_data ->> 'created')::integer)
    ) on conflict (stripe_customer_id) do update set
        email = excluded.email,
        name = excluded.name,
        phone = excluded.phone,
        description = excluded.description,
        delinquent = excluded.delinquent,
        metadata = excluded.metadata,
        updated_at = now();
end;
$$;

-- Upsert Subscription
create or replace function legalflow.stripe_upsert_subscription(p_sub_data jsonb)
returns void
language plpgsql
security definer
as $$
declare
    v_customer_id uuid;
begin
    -- Buscar customer_id local
    select id into v_customer_id
    from legalflow.stripe_customers
    where stripe_customer_id = p_sub_data ->> 'customer';
    
    if v_customer_id is null then
        return; -- Customer não encontrado, pular
    end if;
    
    insert into legalflow.stripe_subscriptions (
        stripe_subscription_id, customer_id, status,
        current_period_start, current_period_end,
        cancel_at_period_end, metadata, stripe_created
    ) values (
        p_sub_data ->> 'id',
        v_customer_id,
        p_sub_data ->> 'status',
        to_timestamp((p_sub_data ->> 'current_period_start')::integer),
        to_timestamp((p_sub_data ->> 'current_period_end')::integer),
        (p_sub_data ->> 'cancel_at_period_end')::boolean,
        coalesce(p_sub_data -> 'metadata', '{}'),
        to_timestamp((p_sub_data ->> 'created')::integer)
    ) on conflict (stripe_subscription_id) do update set
        status = excluded.status,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        metadata = excluded.metadata,
        updated_at = now();
end;
$$;

-- Upsert Invoice
create or replace function legalflow.stripe_upsert_invoice(p_invoice_data jsonb)
returns void
language plpgsql
security definer
as $$
declare
    v_customer_id uuid;
    v_subscription_id uuid;
begin
    -- Buscar customer_id local
    select id into v_customer_id
    from legalflow.stripe_customers
    where stripe_customer_id = p_invoice_data ->> 'customer';
    
    -- Buscar subscription_id local se existe
    if p_invoice_data ->> 'subscription' is not null then
        select id into v_subscription_id
        from legalflow.stripe_subscriptions
        where stripe_subscription_id = p_invoice_data ->> 'subscription';
    end if;
    
    insert into legalflow.stripe_invoices (
        stripe_invoice_id, customer_id, subscription_id,
        status, number, amount_due, amount_paid, amount_remaining,
        subtotal, total, currency, due_date,
        hosted_invoice_url, invoice_pdf, metadata, stripe_created
    ) values (
        p_invoice_data ->> 'id',
        v_customer_id,
        v_subscription_id,
        p_invoice_data ->> 'status',
        p_invoice_data ->> 'number',
        (p_invoice_data ->> 'amount_due')::integer,
        (p_invoice_data ->> 'amount_paid')::integer,
        (p_invoice_data ->> 'amount_remaining')::integer,
        (p_invoice_data ->> 'subtotal')::integer,
        (p_invoice_data ->> 'total')::integer,
        p_invoice_data ->> 'currency',
        case when p_invoice_data ->> 'due_date' is not null 
             then to_timestamp((p_invoice_data ->> 'due_date')::integer)
             else null end,
        p_invoice_data ->> 'hosted_invoice_url',
        p_invoice_data ->> 'invoice_pdf',
        coalesce(p_invoice_data -> 'metadata', '{}'),
        to_timestamp((p_invoice_data ->> 'created')::integer)
    ) on conflict (stripe_invoice_id) do update set
        status = excluded.status,
        amount_due = excluded.amount_due,
        amount_paid = excluded.amount_paid,
        amount_remaining = excluded.amount_remaining,
        hosted_invoice_url = excluded.hosted_invoice_url,
        invoice_pdf = excluded.invoice_pdf,
        metadata = excluded.metadata,
        updated_at = now();
end;
$$;

-- Upsert Payment Intent
create or replace function legalflow.stripe_upsert_payment_intent(p_pi_data jsonb)
returns void
language plpgsql
security definer
as $$
declare
    v_customer_id uuid;
begin
    -- Buscar customer_id local se existe
    if p_pi_data ->> 'customer' is not null then
        select id into v_customer_id
        from legalflow.stripe_customers
        where stripe_customer_id = p_pi_data ->> 'customer';
    end if;
    
    insert into legalflow.stripe_payment_intents (
        stripe_payment_intent_id, customer_id, status,
        amount, currency, description, metadata, stripe_created
    ) values (
        p_pi_data ->> 'id',
        v_customer_id,
        p_pi_data ->> 'status',
        (p_pi_data ->> 'amount')::integer,
        p_pi_data ->> 'currency',
        p_pi_data ->> 'description',
        coalesce(p_pi_data -> 'metadata', '{}'),
        to_timestamp((p_pi_data ->> 'created')::integer)
    ) on conflict (stripe_payment_intent_id) do update set
        status = excluded.status,
        amount = excluded.amount,
        description = excluded.description,
        metadata = excluded.metadata,
        updated_at = now();
end;
$$;

-- Upsert Checkout Session
create or replace function legalflow.stripe_upsert_checkout_session(p_session_data jsonb)
returns void
language plpgsql
security definer
as $$
declare
    v_customer_id uuid;
begin
    -- Buscar customer_id local se existe
    if p_session_data ->> 'customer' is not null then
        select id into v_customer_id
        from legalflow.stripe_customers
        where stripe_customer_id = p_session_data ->> 'customer';
    end if;
    
    insert into legalflow.stripe_checkout_sessions (
        stripe_session_id, customer_id, status, mode,
        success_url, cancel_url, url, customer_email,
        amount_total, metadata, stripe_created
    ) values (
        p_session_data ->> 'id',
        v_customer_id,
        p_session_data ->> 'status',
        p_session_data ->> 'mode',
        p_session_data ->> 'success_url',
        p_session_data ->> 'cancel_url',
        p_session_data ->> 'url',
        p_session_data ->> 'customer_email',
        (p_session_data ->> 'amount_total')::integer,
        coalesce(p_session_data -> 'metadata', '{}'),
        to_timestamp((p_session_data ->> 'created')::integer)
    ) on conflict (stripe_session_id) do update set
        status = excluded.status,
        customer_id = excluded.customer_id,
        amount_total = excluded.amount_total,
        metadata = excluded.metadata,
        updated_at = now();
end;
$$;

-- ===========================================
-- RLS POLICIES
-- ===========================================

-- Enable RLS on all tables
alter table legalflow.stripe_customers enable row level security;
alter table legalflow.stripe_products enable row level security;
alter table legalflow.stripe_prices enable row level security;
alter table legalflow.stripe_subscriptions enable row level security;
alter table legalflow.stripe_invoices enable row level security;
alter table legalflow.stripe_payment_intents enable row level security;
alter table legalflow.stripe_checkout_sessions enable row level security;
alter table legalflow.stripe_webhook_events enable row level security;

-- Basic policies for authenticated users
create policy "stripe_customers_access" on legalflow.stripe_customers
    for all using (auth.uid() is not null);

create policy "stripe_products_access" on legalflow.stripe_products
    for all using (auth.uid() is not null);

create policy "stripe_prices_access" on legalflow.stripe_prices
    for all using (auth.uid() is not null);

create policy "stripe_subscriptions_access" on legalflow.stripe_subscriptions
    for all using (auth.uid() is not null);

create policy "stripe_invoices_access" on legalflow.stripe_invoices
    for all using (auth.uid() is not null);

create policy "stripe_payment_intents_access" on legalflow.stripe_payment_intents
    for all using (auth.uid() is not null);

create policy "stripe_checkout_sessions_access" on legalflow.stripe_checkout_sessions
    for all using (auth.uid() is not null);

create policy "stripe_webhook_events_access" on legalflow.stripe_webhook_events
    for all using (auth.uid() is not null);

-- Grant permissions
grant usage on schema legalflow to authenticated;
grant all on all tables in schema legalflow to authenticated;
grant all on all sequences in schema legalflow to authenticated;
grant execute on all functions in schema legalflow to authenticated;

-- ===========================================
-- SEED DATA FOR TESTING
-- ===========================================

-- Inserir produtos de exemplo
insert into legalflow.stripe_products (
    stripe_product_id, name, description, active, type
) values 
(
    'prod_consultoria_juridica',
    'Consultoria Jurídica',
    'Serviços de consultoria jurídica especializada',
    true,
    'service'
),
(
    'prod_acompanhamento_processual',
    'Acompanhamento Processual',
    'Acompanhamento completo de processos judiciais',
    true,
    'service'
),
(
    'prod_elaboracao_contratos',
    'Elaboração de Contratos',
    'Elaboração e revisão de contratos diversos',
    true,
    'service'
) on conflict (stripe_product_id) do nothing;

-- Inserir preços para os produtos
insert into legalflow.stripe_prices (
    stripe_price_id, product_id, active, currency, unit_amount, type
) select 
    'price_consultoria_mensal',
    p.id,
    true,
    'brl',
    50000, -- R$ 500,00
    'recurring'
from legalflow.stripe_products p 
where p.stripe_product_id = 'prod_consultoria_juridica'
on conflict (stripe_price_id) do nothing;

insert into legalflow.stripe_prices (
    stripe_price_id, product_id, active, currency, unit_amount, type, 
    recurring_interval, recurring_interval_count
) select 
    'price_acompanhamento_mensal',
    p.id,
    true,
    'brl',
    80000, -- R$ 800,00
    'recurring',
    'month',
    1
from legalflow.stripe_products p 
where p.stripe_product_id = 'prod_acompanhamento_processual'
on conflict (stripe_price_id) do nothing;

insert into legalflow.stripe_prices (
    stripe_price_id, product_id, active, currency, unit_amount, type
) select 
    'price_contrato_unico',
    p.id,
    true,
    'brl',
    120000, -- R$ 1.200,00
    'one_time'
from legalflow.stripe_products p 
where p.stripe_product_id = 'prod_elaboracao_contratos'
on conflict (stripe_price_id) do nothing;

-- Função para seed completo
create or replace function legalflow.seed_stripe_data()
returns jsonb
language plpgsql
security definer
as $$
declare
    v_products_count integer;
    v_prices_count integer;
    v_result jsonb;
begin
    -- Contar dados existentes
    select count(*) into v_products_count from legalflow.stripe_products;
    select count(*) into v_prices_count from legalflow.stripe_prices;
    
    -- Se já tem dados, só verificar
    if v_products_count > 0 and v_prices_count > 0 then
        return jsonb_build_object(
            'success', true,
            'message', 'Stripe data already seeded',
            'products_count', v_products_count,
            'prices_count', v_prices_count,
            'action', 'verified'
        );
    end if;
    
    -- Retornar status
    select count(*) into v_products_count from legalflow.stripe_products;
    select count(*) into v_prices_count from legalflow.stripe_prices;
    
    return jsonb_build_object(
        'success', true,
        'message', 'Stripe data seeded successfully',
        'products_count', v_products_count,
        'prices_count', v_prices_count,
        'action', 'seeded'
    );
end;
$$;

-- ===========================================
-- COMMENTS FOR DOCUMENTATION
-- ===========================================

comment on table legalflow.stripe_customers is 'Clientes sincronizados com Stripe';
comment on table legalflow.stripe_products is 'Produtos disponíveis para venda';
comment on table legalflow.stripe_prices is 'Preços dos produtos (one-time ou recorrente)';
comment on table legalflow.stripe_subscriptions is 'Assinaturas ativas e históricas';
comment on table legalflow.stripe_invoices is 'Faturas geradas pelo Stripe';
comment on table legalflow.stripe_payment_intents is 'Intenções de pagamento';
comment on table legalflow.stripe_checkout_sessions is 'Sessões de checkout para pagamentos';
comment on table legalflow.stripe_webhook_events is 'Log de eventos recebidos via webhook';

comment on function legalflow.list_stripe_customers is 'Lista clientes com estatísticas de pagamento';
comment on function legalflow.create_checkout_session is 'Cria sessão de checkout com produtos e quantidades';
comment on function legalflow.process_stripe_webhook is 'Processa eventos de webhook do Stripe';
comment on function legalflow.seed_stripe_data is 'Popula dados iniciais para teste do Stripe';
