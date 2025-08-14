-- SQL_CRM_UNIFICADO_FASE5.sql
-- FASE 5 — CRM Unificado (Contatos, Leads, Deals & Stripe)
-- Script SQL idempotente

create schema if not exists legalflow;
create extension if not exists pgcrypto;

-- Tipos
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace
    where t.typname='pipeline_kind' and n.nspname='legalflow') then
    create type legalflow.pipeline_kind as enum ('sales','legal','finance');
  end if;
end $$;

-- Contatos (pessoas/empresas; independem de public.clientes)
create table if not exists legalflow.contacts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'person',      -- person|org
  name text not null,
  email text,
  phone text,
  whatsapp text,
  cpfcnpj varchar,
  public_cliente_cpfcnpj varchar references public.clientes(cpfcnpj) on delete set null,
  stripe_customer_id text unique,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contacts_email on legalflow.contacts(lower(email));
create index if not exists idx_contacts_cpfcnpj on legalflow.contacts(cpfcnpj);

-- Organizações (empresas) e vínculo N:N contato↔empresa
create table if not exists legalflow.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  cnpj varchar,
  website text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists ux_org_cnpj on legalflow.organizations(coalesce(cnpj,''));
create table if not exists legalflow.org_contacts (
  org_id uuid references legalflow.organizations(id) on delete cascade,
  contact_id uuid references legalflow.contacts(id) on delete cascade,
  role text,
  primary key (org_id, contact_id)
);

-- Pipelines (aproveita deals já existentes)
create table if not exists legalflow.pipeline_defs (
  id bigserial primary key,
  code text unique not null,                -- 'sales'|'legal'|'finance'
  name text not null,
  kind legalflow.pipeline_kind not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists legalflow.pipeline_stages (
  id bigserial primary key,
  pipeline_id bigint not null references legalflow.pipeline_defs(id) on delete cascade,
  code text not null,
  name text not null,
  order_index int not null,
  is_won boolean not null default false,
  is_lost boolean not null default false,
  unique(pipeline_id, code)
);

-- Ajusta deals para aderir à pipeline
alter table if exists legalflow.deals
  add column if not exists contact_id uuid references legalflow.contacts(id) on delete set null,
  add column if not exists pipeline_id bigint references legalflow.pipeline_defs(id) on delete set null,
  add column if not exists stage_id    bigint references legalflow.pipeline_stages(id) on delete set null;

-- Seeds básicos de pipeline/stages
insert into legalflow.pipeline_defs(code,name,kind) values
  ('sales','Pipeline de Vendas','sales')
on conflict (code) do nothing;

insert into legalflow.pipeline_stages(pipeline_id,code,name,order_index,is_won,is_lost)
select d.id, v.code, v.name, v.ord, v.won, v.lost
from legalflow.pipeline_defs d
join (values
  ('sales','novo','Novo',1,false,false),
  ('sales','qualificado','Qualificado',2,false,false),
  ('sales','proposta','Proposta',3,false,false),
  ('sales','ganho','Ganho',4,true,false),
  ('sales','perdido','Perdido',5,false,true)
) as v(pcode,code,name,ord,won,lost) on d.code=v.pcode
on conflict do nothing;

-- View de contatos unificados (public.clientes + contacts)
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

-- Helpers de atualização
create or replace function legalflow.trg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists t_touch_contacts on legalflow.contacts;
create trigger t_touch_contacts
before update on legalflow.contacts
for each row execute function legalflow.trg_touch_updated_at();

drop trigger if exists t_touch_orgs on legalflow.organizations;
create trigger t_touch_orgs
before update on legalflow.organizations
for each row execute function legalflow.trg_touch_updated_at();

-- Funções utilitárias
create or replace function legalflow.crm_upsert_contact(
  p jsonb  -- {name,email,phone,whatsapp,cpfcnpj,public_cliente_cpfcnpj,stripe_customer_id,kind,properties}
) returns uuid
language plpgsql
as $$
declare v_id uuid;
begin
  insert into legalflow.contacts(name,email,phone,whatsapp,cpfcnpj,public_cliente_cpfcnpj,stripe_customer_id,kind,properties)
  values (
    coalesce(p->>'name','Sem nome'),
    p->>'email', p->>'phone', p->>'whatsapp',
    p->>'cpfcnpj', p->>'public_cliente_cpfcnpj', p->>'stripe_customer_id',
    coalesce(p->>'kind','person'),
    coalesce(p->'properties','{}'::jsonb)
  )
  returning id into v_id;
  return v_id;
exception when unique_violation then
  update legalflow.contacts
     set name=coalesce(p->>'name',name),
         email=coalesce(p->>'email',email),
         phone=coalesce(p->>'phone',phone),
         whatsapp=coalesce(p->>'whatsapp',whatsapp),
         cpfcnpj=coalesce(p->>'cpfcnpj',cpfcnpj),
         public_cliente_cpfcnpj=coalesce(p->>'public_cliente_cpfcnpj',public_cliente_cpfcnpj),
         stripe_customer_id=coalesce(p->>'stripe_customer_id',stripe_customer_id),
         properties=coalesce(p->'properties',properties),
         updated_at=now()
   where stripe_customer_id = p->>'stripe_customer_id' or
         (email is not distinct from p->>'email' and email is not null)
  returning id into v_id;
  return v_id;
end $$;

-- Conversão Lead → Contato + Deal (usa public.leads)
create or replace function legalflow.crm_convert_lead(p_lead_whatsapp text)
returns jsonb
language plpgsql
as $$
declare r public.leads%rowtype; v_contact uuid; v_deal uuid;
begin
  select * into r from public.leads where whatsapp = p_lead_whatsapp;
  if not found then raise exception 'Lead não encontrado'; end if;

  v_contact := legalflow.crm_upsert_contact(jsonb_build_object(
    'name', r.nome,
    'whatsapp', r.whatsapp,
    'properties', r.dados
  ));

  insert into legalflow.deals(title,value,currency,stage,probability,cliente_cpfcnpj,owner_oab,pipeline_id,stage_id,contact_id)
  values (
    coalesce(r.nome,'Novo Lead'), 0,'BRL','novo',10, null, null,
    (select id from legalflow.pipeline_defs where code='sales'),
    (select id from legalflow.pipeline_stages s join legalflow.pipeline_defs d on d.id=s.pipeline_id where d.code='sales' and s.code='novo'),
    v_contact
  )
  returning id into v_deal;

  return jsonb_build_object('contact_id', v_contact, 'deal_id', v_deal);
end $$;
