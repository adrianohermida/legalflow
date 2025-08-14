-- ============================================
-- 🚀 PHASE 5 SQL SCHEMA - Hardening & Go-Live
-- ============================================
-- File: SQL_PHASE5_SCHEMA.sql
-- Description: SQL schema for observability, feature flags, and monitoring

-- ============================================
-- 📊 App Events (if not exists from Phase 4)
-- ============================================

create table if not exists legalflow.app_events(
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  event text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  ip_address inet,
  user_agent text
);

-- Index for real-time monitoring
create index if not exists idx_app_events_created_event on legalflow.app_events(created_at desc, event);
create index if not exists idx_app_events_user_created on legalflow.app_events(user_id, created_at desc);

-- ============================================
-- 🎌 Feature Flags
-- ============================================

create table if not exists legalflow.feature_flags(
  key text primary key,
  enabled boolean not null default false,
  payload jsonb default '{}'::jsonb,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- Insert default feature flags
insert into legalflow.feature_flags (key, enabled, description) values
  ('jornadas', true, 'Sistema de Jornadas'),
  ('tickets', true, 'Sistema de Tickets/Helpdesk'),
  ('activities', true, 'Gestão de Atividades'),
  ('deals', true, 'Pipeline de Vendas'),
  ('financeiro', true, 'Módulo Financeiro'),
  ('relatorios', true, 'Relatórios e Analytics'),
  ('helpdesk', true, 'Central de Atendimento'),
  ('notificacoes', true, 'Sistema de Notificações'),
  ('kill_switch', false, 'Kill Switch Global (Somente Leitura)')
on conflict (key) do nothing;

-- Trigger para updated_at
create or replace function legalflow.update_feature_flags_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_feature_flags_updated_at on legalflow.feature_flags;
create trigger tr_feature_flags_updated_at
  before update on legalflow.feature_flags
  for each row execute function legalflow.update_feature_flags_updated_at();

-- ============================================
-- 🔐 HMAC Verification Function
-- ============================================

create extension if not exists pgcrypto;

create or replace function legalflow.verify_hmac(sig text, secret text, payload text)
returns boolean language sql immutable as $$
  select encode(hmac(payload::bytea, secret::bytea, 'sha256'), 'hex') = lower(sig)
$$;

-- ============================================
-- 📈 System Health Monitoring
-- ============================================

create table if not exists legalflow.system_health(
  id uuid primary key default gen_random_uuid(),
  metric_name text not null,
  metric_value numeric,
  metric_unit text,
  status text check (status in ('healthy', 'warning', 'critical')),
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_system_health_created_metric on legalflow.system_health(created_at desc, metric_name);

-- ============================================
-- 🧪 QA Test Results
-- ============================================

create table if not exists legalflow.qa_test_results(
  id uuid primary key default gen_random_uuid(),
  test_type text not null check (test_type in ('smoke', 'e2e', 'rls', 'performance')),
  test_name text not null,
  status text not null check (status in ('pass', 'fail', 'skip')),
  duration_ms integer,
  error_message text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_qa_test_results_type_created on legalflow.qa_test_results(test_type, created_at desc);
create index if not exists idx_qa_test_results_status on legalflow.qa_test_results(status, created_at desc);

-- ============================================
-- 📊 Performance Metrics
-- ============================================

create table if not exists legalflow.performance_metrics(
  id uuid primary key default gen_random_uuid(),
  route text not null,
  method text default 'GET',
  response_time_ms integer not null,
  status_code integer not null,
  user_id uuid,
  created_at timestamptz default now(),
  user_agent text,
  ip_address inet
);

create index if not exists idx_performance_metrics_route_created on legalflow.performance_metrics(route, created_at desc);
create index if not exists idx_performance_metrics_created on legalflow.performance_metrics(created_at desc);
create index if not exists idx_performance_metrics_status_code on legalflow.performance_metrics(status_code, created_at desc);

-- ============================================
-- 🔄 Backup & Restore Logs
-- ============================================

create table if not exists legalflow.backup_logs(
  id uuid primary key default gen_random_uuid(),
  backup_type text not null check (backup_type in ('scheduled', 'manual', 'pre_deploy')),
  status text not null check (status in ('started', 'completed', 'failed')),
  file_path text,
  file_size_bytes bigint,
  duration_seconds integer,
  error_message text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id)
);

create index if not exists idx_backup_logs_created_status on legalflow.backup_logs(created_at desc, status);

-- ============================================
-- 📊 Views for Monitoring Dashboard
-- ============================================

-- Últimos eventos do sistema (24h)
create or replace view legalflow.vw_recent_events as
select 
  event,
  count(*) as event_count,
  max(created_at) as last_occurrence,
  array_agg(distinct user_id::text) filter (where user_id is not null) as users_involved
from legalflow.app_events 
where created_at >= now() - interval '24 hours'
group by event
order by event_count desc, last_occurrence desc;

-- Health status summary
create or replace view legalflow.vw_system_health_summary as
select 
  metric_name,
  status,
  metric_value,
  metric_unit,
  created_at
from legalflow.system_health
where created_at = (
  select max(created_at) 
  from legalflow.system_health sh2 
  where sh2.metric_name = system_health.metric_name
)
order by 
  case status 
    when 'critical' then 1 
    when 'warning' then 2 
    when 'healthy' then 3 
  end,
  metric_name;

-- Performance summary (24h)
create or replace view legalflow.vw_performance_24h as
select 
  route,
  count(*) as requests,
  round(avg(response_time_ms)) as avg_response_ms,
  round(percentile_cont(0.95) within group (order by response_time_ms)) as p95_response_ms,
  round(percentile_cont(0.99) within group (order by response_time_ms)) as p99_response_ms,
  sum(case when status_code >= 400 then 1 else 0 end) as error_count,
  round(sum(case when status_code >= 400 then 1 else 0 end) * 100.0 / count(*), 2) as error_rate
from legalflow.performance_metrics 
where created_at >= now() - interval '24 hours'
group by route
order by requests desc, p95_response_ms desc;

-- Latest QA test results
create or replace view legalflow.vw_latest_qa_results as
select 
  test_type,
  test_name,
  status,
  duration_ms,
  error_message,
  created_at
from legalflow.qa_test_results
where created_at = (
  select max(created_at) 
  from legalflow.qa_test_results qtr2 
  where qtr2.test_type = qa_test_results.test_type 
    and qtr2.test_name = qa_test_results.test_name
)
order by 
  case status 
    when 'fail' then 1 
    when 'skip' then 2 
    when 'pass' then 3 
  end,
  test_type, test_name;

-- ============================================
-- 🔄 Utility Functions
-- ============================================

-- Function to log system events
create or replace function legalflow.log_system_event(
  p_event text,
  p_user_id uuid default null,
  p_payload jsonb default '{}'::jsonb
) returns uuid language plpgsql as $$
declare
  v_event_id uuid;
begin
  insert into legalflow.app_events (event, user_id, payload)
  values (p_event, p_user_id, p_payload)
  returning id into v_event_id;
  
  return v_event_id;
end;
$$;

-- Function to record performance metric
create or replace function legalflow.record_performance(
  p_route text,
  p_method text,
  p_response_time_ms integer,
  p_status_code integer,
  p_user_id uuid default null
) returns uuid language plpgsql as $$
declare
  v_metric_id uuid;
begin
  insert into legalflow.performance_metrics (route, method, response_time_ms, status_code, user_id)
  values (p_route, p_method, p_response_time_ms, p_status_code, p_user_id)
  returning id into v_metric_id;
  
  return v_metric_id;
end;
$$;

-- Function to check if feature is enabled
create or replace function legalflow.is_feature_enabled(p_feature_key text)
returns boolean language sql stable as $$
  select coalesce(
    (select enabled from legalflow.feature_flags where key = p_feature_key),
    false
  );
$$;

-- Function to check kill switch
create or replace function legalflow.is_kill_switch_active()
returns boolean language sql stable as $$
  select coalesce(
    (select enabled from legalflow.feature_flags where key = 'kill_switch'),
    false
  );
$$;

-- ============================================
-- 🔒 RLS Policies for Phase 5 Tables
-- ============================================

-- Enable RLS on new tables
alter table legalflow.app_events enable row level security;
alter table legalflow.feature_flags enable row level security;
alter table legalflow.system_health enable row level security;
alter table legalflow.qa_test_results enable row level security;
alter table legalflow.performance_metrics enable row level security;
alter table legalflow.backup_logs enable row level security;

-- Office access to monitoring tables
create policy "office_app_events_access" on legalflow.app_events
  for all using (legalflow.is_office());

create policy "office_feature_flags_access" on legalflow.feature_flags
  for all using (legalflow.is_office());

create policy "office_system_health_access" on legalflow.system_health
  for all using (legalflow.is_office());

create policy "office_qa_test_results_access" on legalflow.qa_test_results
  for all using (legalflow.is_office());

create policy "office_performance_metrics_access" on legalflow.performance_metrics
  for all using (legalflow.is_office());

create policy "office_backup_logs_access" on legalflow.backup_logs
  for all using (legalflow.is_office());

-- ============================================
-- 📊 Sample Health Checks
-- ============================================

-- Insert initial health metrics
insert into legalflow.system_health (metric_name, metric_value, metric_unit, status, details) values
  ('supabase_connection', 1, 'boolean', 'healthy', '{"last_check": "startup"}'),
  ('rls_enabled', 1, 'boolean', 'healthy', '{"schemas": ["legalflow"]}'),
  ('database_size', 0, 'mb', 'healthy', '{"threshold_warning": 1000, "threshold_critical": 5000}'),
  ('active_connections', 0, 'count', 'healthy', '{"max_connections": 100}'),
  ('query_performance', 0, 'ms', 'healthy', '{"p95_threshold": 1000}')
on conflict do nothing;

-- Log Phase 5 initialization
select legalflow.log_system_event('phase5_schema_initialized', null, '{"version": "5.0", "tables_created": 6}'::jsonb);

-- ============================================
-- 🏁 Schema Complete
-- ============================================

-- Summary of tables created:
-- ✅ legalflow.app_events (monitoring)
-- ✅ legalflow.feature_flags (feature toggles)  
-- ✅ legalflow.system_health (health metrics)
-- ✅ legalflow.qa_test_results (test tracking)
-- ✅ legalflow.performance_metrics (performance monitoring)
-- ✅ legalflow.backup_logs (backup tracking)
-- ✅ Views for monitoring dashboard
-- ✅ Utility functions for logging and checks
-- ✅ RLS policies for office access
-- ✅ HMAC verification function
