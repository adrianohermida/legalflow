-- SQL_STRIPE_INTEGRATION_SCHEMA.sql
-- Integração Stripe ⇄ CRM/LegalFlow
-- Schema de Contatos, Pipelines e Espelho do Stripe (idempotente)

-- Requisitos
create extension if not exists pgcrypto;
create schema if not exists legalflow;

-- ================
-- Tipos auxiliares
-- ================
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace
                 where t.typname='pipeline_kind' and n.nspname='legalflow') then
    create type legalflow.pipeline_kind as enum ('sales','legal','finance');
  end if;
end $$;

-- ==========================
-- Núcleo de CONTATOS (CRM)
-- ==========================
create table if not exists legalflow.contacts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'person',                 -- person|org
  name text not null,
  email text,
  phone text,
  whatsapp text,
  cpfcnpj varchar,
  public_cliente_cpfcnpj varchar
    references public.clientes(cpfcnpj) on delete set null,
  stripe_customer_id text unique,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contacts_email on legalflow.contacts(lower(email));
create index if not exists idx_contacts_cpfcnpj on legalflow.contacts(cpfcnpj);

create or replace function legalflow.trg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists t_touch_contacts on legalflow.contacts;
create trigger t_touch_contacts
before update on legalflow.contacts
for each row execute function legalflow.trg_touch_updated_at();

-- View: CONTATOS unificados (Clientes do public + Contacts)
create or replace view legalflow.vw_contacts_unified as
select
  'public.clientes'::text as source,
  gen_random_uuid()       as id,
  'person'::text          as kind,
  c.nome                  as name,
  null::text              as email,
  null::text              as phone,
  c.whatsapp              as whatsapp,
  c.cpfcnpj               as cpfcnpj,
  c.cpfcnpj               as public_cliente_cpfcnpj,
  null::text              as stripe_customer_id,
  '{}'::jsonb             as properties,
  c.created_at            as created_at,
  c.created_at            as updated_at
from public.clientes c
union all
select
  'legalflow.contacts', id, kind, name, email, phone, whatsapp,
  cpfcnpj, public_cliente_cpfcnpj, stripe_customer_id, properties, created_at, updated_at
from legalflow.contacts;

-- ==========================
-- PIPELINES (Kanban multi-área)
-- ==========================
create table if not exists legalflow.pipeline_defs (
  id bigserial primary key,
  code text unique not null,                -- 'sales' | 'legal' | 'finance'
  name text not null,
  kind legalflow.pipeline_kind not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists legalflow.pipeline_stages (
  id bigserial primary key,
  pipeline_id bigint not null references legalflow.pipeline_defs(id) on delete cascade,
  code text not null,                       -- ex: 'novo','qualificado','proposta','ganho','perdido'
  name text not null,
  order_index int not null,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  unique(pipeline_id, code)
);

-- Ajuste em DEALS para aderir a pipeline (mantém compatibilidade)
alter table if exists legalflow.deals
  add column if not exists pipeline_id bigint references legalflow.pipeline_defs(id) on delete set null,
  add column if not exists stage_id    bigint references legalflow.pipeline_stages(id) on delete set null;

-- (Opcional) pipeline para processos (jurídico) — vínculo leve
create table if not exists legalflow.case_pipeline_links (
  id bigserial primary key,
  numero_cnj varchar not null references public.processos(numero_cnj) on delete cascade,
  pipeline_id bigint not null references legalflow.pipeline_defs(id) on delete cascade,
  stage_id    bigint not null references legalflow.pipeline_stages(id) on delete set null,
  unique (numero_cnj, pipeline_id)
);

-- Seeds dos pipelines (se não existirem)
insert into legalflow.pipeline_defs(code,name,kind) values
  ('sales','Pipeline de Vendas','sales'),
  ('legal','Pipeline Jurídico','legal'),
  ('finance','Pipeline Financeiro','finance')
on conflict (code) do nothing;

-- Stages comuns (exemplo)
insert into legalflow.pipeline_stages(pipeline_id,code,name,order_index,is_won,is_lost)
select d.id, v.code, v.name, v.ord, v.won, v.lost
from legalflow.pipeline_defs d
join (values
  -- SALES
  ('sales','novo','Novo',1,false,false),
  ('sales','qualificado','Qualificado',2,false,false),
  ('sales','proposta','Proposta',3,false,false),
  ('sales','ganho','Ganho',4,true,false),
  ('sales','perdido','Perdido',5,false,true),
  -- LEGAL
  ('legal','captado','Captado',1,false,false),
  ('legal','em_andamento','Em andamento',2,false,false),
  ('legal','sentenca','Sentença',3,false,false),
  ('legal','exito','Êxito',4,true,false),
  ('legal','sem_exito','Sem êxito',5,false,true),
  -- FINANCE
  ('finance','novo','Novo',1,false,false),
  ('finance','cobranca','Cobrança',2,false,false),
  ('finance','negociado','Negociado',3,false,false),
  ('finance','pago','Pago',4,true,false),
  ('finance','inadimplente','Inadimplente',5,false,true)
) as v(pcode,code,name,ord,won,lost)
on d.code = v.pcode
on conflict do nothing;

-- Para deals existentes: default pipeline 'sales' se ainda vazio
update legalflow.deals d
set pipeline_id = (select id from legalflow.pipeline_defs where code='sales')
where d.pipeline_id is null;

-- ==========================
-- ESPELHO DO STRIPE (mínimo)
-- ==========================
-- Credenciais/headers já podem reaproveitar a tabela legalflow.api_credentials se desejar,
-- mas criamos o espelho de dados do Stripe (referências úteis)

create table if not exists legalflow.stripe_customers (
  id text primary key,                      -- cus_...
  email text,
  name text,
  phone text,
  contact_id uuid references legalflow.contacts(id) on delete set null,
  public_cliente_cpfcnpj varchar references public.clientes(cpfcnpj) on delete set null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_stripe_cust_email on legalflow.stripe_customers(lower(email));

create table if not exists legalflow.stripe_products (
  id text primary key,                      -- prod_...
  name text,
  active boolean,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists legalflow.stripe_prices (
  id text primary key,                      -- price_...
  product_id text references legalflow.stripe_products(id) on delete cascade,
  currency text,
  unit_amount bigint,
  recurring_interval text,                  -- day|week|month|year
  interval_count int,
  active boolean,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists legalflow.stripe_subscriptions (
  id text primary key,                      -- sub_...
  customer_id text references legalflow.stripe_customers(id) on delete cascade,
  status text,                              -- trialing|active|past_due|canceled|unpaid|incomplete...
  current_period_start timestamptz,
  current_period_end   timestamptz,
  cancel_at            timestamptz,
  canceled_at          timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists legalflow.stripe_subscription_items (
  id text primary key,                      -- si_...
  subscription_id text references legalflow.stripe_subscriptions(id) on delete cascade,
  price_id text references legalflow.stripe_prices(id) on delete set null,
  quantity int,
  data jsonb not null default '{}'::jsonb
);

create table if not exists legalflow.stripe_invoices (
  id text primary key,                      -- in_...
  customer_id text references legalflow.stripe_customers(id) on delete cascade,
  subscription_id text references legalflow.stripe_subscriptions(id) on delete set null,
  status text,                              -- draft|open|paid|uncollectible|void|...
  number text,
  hosted_invoice_url text,
  amount_due bigint,
  amount_paid bigint,
  amount_remaining bigint,
  due_date timestamptz,
  created_ts timestamptz,                   -- from Stripe's 'created'
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists legalflow.stripe_payment_intents (
  id text primary key,                      -- pi_...
  customer_id text references legalflow.stripe_customers(id) on delete set null,
  amount bigint,
  currency text,
  status text,                              -- requires_payment_method|succeeded|processing|requires_action|canceled...
  receipt_url text,
  created_ts timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists legalflow.stripe_checkout_sessions (
  id text primary key,                      -- cs_...
  customer_id text references legalflow.stripe_customers(id) on delete set null,
  url text,
  status text,                              -- open|complete|expired
  mode text,                                -- payment|subscription
  payment_intent_id text references legalflow.stripe_payment_intents(id) on delete set null,
  subscription_id text references legalflow.stripe_subscriptions(id) on delete set null,
  success_url text,
  cancel_url text,
  created_ts timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Logs de Webhook (idempotência)
create table if not exists legalflow.stripe_event_logs (
  id text primary key,                      -- evt_...
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  ok boolean,
  error text,
  payload jsonb not null
);
create index if not exists idx_stripe_event_type on legalflow.stripe_event_logs(type);

-- ==========================
-- Funções de UPSERT Stripe
-- ==========================
create or replace function legalflow.stripe_upsert_customer(p jsonb)
returns text
language plpgsql
security definer
as $$
declare
  v_id text := p->>'id';
  v_email text := p->>'email';
  v_name  text := p->>'name';
  v_phone text := p->>'phone';
  v_contact uuid;
begin
  if v_id is null then raise exception 'stripe_upsert_customer: id ausente'; end if;

  -- tenta linkar a um contact existente por email (ou cria novo contato rascunho)
  select id into v_contact
  from legalflow.contacts
  where lower(email) = lower(v_email)
  limit 1;

  if v_contact is null and v_email is not null then
    insert into legalflow.contacts(name,email,kind)
    values (coalesce(v_name, v_email), v_email, 'person')
    returning id into v_contact;
  end if;

  insert into legalflow.stripe_customers(id,email,name,phone,contact_id,data)
  values (v_id, v_email, v_name, v_phone, v_contact, p)
  on conflict (id) do update
    set email = excluded.email,
        name  = excluded.name,
        phone = excluded.phone,
        contact_id = coalesce(excluded.contact_id, legalflow.stripe_customers.contact_id),
        data  = excluded.data,
        updated_at = now();

  -- também grava o stripe_customer_id no contato se existir
  if v_contact is not null then
    update legalflow.contacts
       set stripe_customer_id = v_id
     where id = v_contact and coalesce(stripe_customer_id,'') <> v_id;
  end if;

  return v_id;
end $$;

create or replace function legalflow.stripe_upsert_product(p jsonb)
returns text language plpgsql security definer as $$
declare v_id text := p->>'id';
begin
  if v_id is null then raise exception 'product id ausente'; end if;
  insert into legalflow.stripe_products(id,name,active,data)
  values (v_id, p->>'name', (p->>'active')::boolean, p)
  on conflict (id) do update
    set name = excluded.name, active = excluded.active, data = excluded.data, updated_at = now();
  return v_id;
end $$;

create or replace function legalflow.stripe_upsert_price(p jsonb)
returns text language plpgsql security definer as $$
declare v_id text := p->>'id';
begin
  if v_id is null then raise exception 'price id ausente'; end if;
  insert into legalflow.stripe_prices(
    id, product_id, currency, unit_amount, recurring_interval, interval_count, active, data
  ) values (
    v_id,
    p->>'product',
    p->>'currency',
    nullif(p->>'unit_amount','')::bigint,
    coalesce(p#>>'{recurring,interval}', null),
    nullif(p#>>'{recurring,interval_count}','')::int,
    (p->>'active')::boolean,
    p
  )
  on conflict (id) do update set
    product_id = excluded.product_id,
    currency = excluded.currency,
    unit_amount = excluded.unit_amount,
    recurring_interval = excluded.recurring_interval,
    interval_count = excluded.interval_count,
    active = excluded.active,
    data = excluded.data,
    updated_at = now();
  return v_id;
end $$;

create or replace function legalflow.stripe_upsert_subscription(p jsonb)
returns text language plpgsql security definer as $$
declare v_id text := p->>'id';
begin
  if v_id is null then raise exception 'subscription id ausente'; end if;
  insert into legalflow.stripe_subscriptions(
    id, customer_id, status, current_period_start, current_period_end, cancel_at, canceled_at, data
  ) values (
    v_id,
    p->>'customer',
    p->>'status',
    to_timestamp(nullif(p->>'current_period_start','')::bigint),
    to_timestamp(nullif(p->>'current_period_end','')::bigint),
    to_timestamp(nullif(p->>'cancel_at','')::bigint),
    to_timestamp(nullif(p->>'canceled_at','')::bigint),
    p
  )
  on conflict (id) do update set
    customer_id = excluded.customer_id,
    status = excluded.status,
    current_period_start = excluded.current_period_start,
    current_period_end   = excluded.current_period_end,
    cancel_at = excluded.cancel_at,
    canceled_at = excluded.canceled_at,
    data = excluded.data,
    updated_at = now();

  -- itens
  if (p ? 'items') then
    delete from legalflow.stripe_subscription_items where subscription_id = v_id;
    insert into legalflow.stripe_subscription_items(id, subscription_id, price_id, quantity, data)
    select
      (i->>'id'),
      v_id,
      (i#>>'{price,id}'),
      nullif(i->>'quantity','')::int,
      i
    from jsonb_array_elements(p#>'{items,data}') as i;
  end if;

  return v_id;
end $$;

create or replace function legalflow.stripe_upsert_invoice(p jsonb)
returns text language plpgsql security definer as $$
declare v_id text := p->>'id';
begin
  if v_id is null then raise exception 'invoice id ausente'; end if;
  insert into legalflow.stripe_invoices(
    id, customer_id, subscription_id, status, number, hosted_invoice_url,
    amount_due, amount_paid, amount_remaining, due_date, created_ts, data
  ) values (
    v_id,
    p->>'customer',
    p->>'subscription',
    p->>'status',
    p->>'number',
    p->>'hosted_invoice_url',
    nullif(p->>'amount_due','')::bigint,
    nullif(p->>'amount_paid','')::bigint,
    nullif(p->>'amount_remaining','')::bigint,
    to_timestamp(nullif(p->>'due_date','')::bigint),
    to_timestamp(nullif(p->>'created','')::bigint),
    p
  )
  on conflict (id) do update set
    customer_id = excluded.customer_id,
    subscription_id = excluded.subscription_id,
    status = excluded.status,
    number = excluded.number,
    hosted_invoice_url = excluded.hosted_invoice_url,
    amount_due = excluded.amount_due,
    amount_paid = excluded.amount_paid,
    amount_remaining = excluded.amount_remaining,
    due_date = excluded.due_date,
    created_ts = excluded.created_ts,
    data = excluded.data,
    updated_at = now();
  return v_id;
end $$;

create or replace function legalflow.stripe_upsert_payment_intent(p jsonb)
returns text language plpgsql security definer as $$
declare v_id text := p->>'id';
begin
  if v_id is null then raise exception 'payment_intent id ausente'; end if;
  insert into legalflow.stripe_payment_intents(
    id, customer_id, amount, currency, status, receipt_url, created_ts, data
  ) values (
    v_id,
    p->>'customer',
    nullif(p->>'amount','')::bigint,
    p->>'currency',
    p->>'status',
    p#>>'{charges,data,0,receipt_url}',
    to_timestamp(nullif(p->>'created','')::bigint),
    p
  )
  on conflict (id) do update set
    customer_id = excluded.customer_id,
    amount = excluded.amount,
    currency = excluded.currency,
    status = excluded.status,
    receipt_url = excluded.receipt_url,
    created_ts = excluded.created_ts,
    data = excluded.data,
    updated_at = now();
  return v_id;
end $$;

create or replace function legalflow.stripe_upsert_checkout_session(p jsonb)
returns text language plpgsql security definer as $$
declare v_id text := p->>'id';
begin
  if v_id is null then raise exception 'checkout_session id ausente'; end if;
  insert into legalflow.stripe_checkout_sessions(
    id, customer_id, url, status, mode, payment_intent_id, subscription_id,
    success_url, cancel_url, created_ts, data
  ) values (
    v_id,
    p->>'customer',
    p->>'url',
    p->>'status',
    p->>'mode',
    p->>'payment_intent',
    p->>'subscription',
    p->>'success_url',
    p->>'cancel_url',
    to_timestamp(nullif(p->>'created','')::bigint),
    p
  )
  on conflict (id) do update set
    customer_id = excluded.customer_id,
    url = excluded.url,
    status = excluded.status,
    mode = excluded.mode,
    payment_intent_id = excluded.payment_intent_id,
    subscription_id = excluded.subscription_id,
    success_url = excluded.success_url,
    cancel_url = excluded.cancel_url,
    created_ts = excluded.created_ts,
    data = excluded.data,
    updated_at = now();
  return v_id;
end $$;

-- Idempotência de Webhook
create or replace function legalflow.stripe_record_event(p_event jsonb)
returns boolean
language plpgsql
security definer
as $$
declare v_id text := p_event->>'id';
begin
  if v_id is null then raise exception 'event id ausente'; end if;

  insert into legalflow.stripe_event_logs(id,type,payload,ok)
  values (v_id, p_event->>'type', p_event, null)
  on conflict (id) do nothing;

  return (not exists(select 1 from legalflow.stripe_event_logs where id = v_id and processed_at is not null));
end $$;

create or replace function legalflow.stripe_mark_event_processed(p_event_id text, p_ok boolean, p_error text default null)
returns void language plpgsql security definer as $$
begin
  update legalflow.stripe_event_logs
     set processed_at = now(),
         ok = p_ok,
         error = p_error
   where id = p_event_id;
end $$;

-- ==========================
-- RLS (Row Level Security)
-- ==========================
-- Enable RLS on all new tables
alter table legalflow.contacts enable row level security;
alter table legalflow.pipeline_defs enable row level security;
alter table legalflow.pipeline_stages enable row level security;
alter table legalflow.case_pipeline_links enable row level security;
alter table legalflow.stripe_customers enable row level security;
alter table legalflow.stripe_products enable row level security;
alter table legalflow.stripe_prices enable row level security;
alter table legalflow.stripe_subscriptions enable row level security;
alter table legalflow.stripe_subscription_items enable row level security;
alter table legalflow.stripe_invoices enable row level security;
alter table legalflow.stripe_payment_intents enable row level security;
alter table legalflow.stripe_checkout_sessions enable row level security;
alter table legalflow.stripe_event_logs enable row level security;

-- Basic RLS policies (authenticated users can access their data)
create policy "contacts_all" on legalflow.contacts for all using (auth.uid() is not null);
create policy "pipeline_defs_all" on legalflow.pipeline_defs for all using (auth.uid() is not null);
create policy "pipeline_stages_all" on legalflow.pipeline_stages for all using (auth.uid() is not null);
create policy "case_pipeline_links_all" on legalflow.case_pipeline_links for all using (auth.uid() is not null);
create policy "stripe_customers_all" on legalflow.stripe_customers for all using (auth.uid() is not null);
create policy "stripe_products_all" on legalflow.stripe_products for all using (auth.uid() is not null);
create policy "stripe_prices_all" on legalflow.stripe_prices for all using (auth.uid() is not null);
create policy "stripe_subscriptions_all" on legalflow.stripe_subscriptions for all using (auth.uid() is not null);
create policy "stripe_subscription_items_all" on legalflow.stripe_subscription_items for all using (auth.uid() is not null);
create policy "stripe_invoices_all" on legalflow.stripe_invoices for all using (auth.uid() is not null);
create policy "stripe_payment_intents_all" on legalflow.stripe_payment_intents for all using (auth.uid() is not null);
create policy "stripe_checkout_sessions_all" on legalflow.stripe_checkout_sessions for all using (auth.uid() is not null);
create policy "stripe_event_logs_all" on legalflow.stripe_event_logs for all using (auth.uid() is not null);
