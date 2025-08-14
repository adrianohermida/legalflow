-- ===================================
-- FASE 4 — SLA & Relatórios, RLS, Automações e Métricas
-- SQL Schema Patches (Idempotente)
-- ===================================

-- Ensure legalflow schema exists
CREATE SCHEMA IF NOT EXISTS legalflow;

-- 1) SLA por Ticket (políticas)
CREATE TABLE IF NOT EXISTS legalflow.sla_policies (
  id bigserial PRIMARY KEY,
  group_key text,                   -- área/equipe (ex.: "Trabalhista")
  priority text DEFAULT 'normal',   -- baixa|normal|alta|urgente
  frt_hours int NOT NULL DEFAULT 4, -- First Response Target (horas)
  ttr_hours int NOT NULL DEFAULT 48,-- Time To Resolve (horas)
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (group_key, priority)
);

-- 2) Tickets table (if not exists) with SLA fields
CREATE TABLE IF NOT EXISTS legalflow.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_cnj text,
  cliente_cpfcnpj text,
  group_key text,                   -- área/equipe
  priority text DEFAULT 'normal',   -- baixa|normal|alta|urgente
  status text DEFAULT 'open',       -- open|in_progress|resolved|closed
  title text NOT NULL,
  description text,
  frt_due_at timestamptz,           -- First Response Target due
  ttr_due_at timestamptz,           -- Time To Resolve due
  first_response_at timestamptz,    -- When first agent response occurred
  resolved_at timestamptz,          -- When ticket was resolved
  created_by uuid,
  assigned_to uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for tickets
CREATE INDEX IF NOT EXISTS idx_tickets_status ON legalflow.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_cliente ON legalflow.tickets(cliente_cpfcnpj);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON legalflow.tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON legalflow.tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_group_key ON legalflow.tickets(group_key);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON legalflow.tickets(assigned_to);

-- 3) Time tracking (Freshdesk-like) + CSAT
CREATE TABLE IF NOT EXISTS legalflow.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES legalflow.tickets(id) ON DELETE CASCADE,
  activity_id uuid, -- references legalflow.activities(id) on delete set null,
  user_id uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  duration_minutes int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_time_entries_ticket ON legalflow.time_entries(ticket_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON legalflow.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_started_at ON legalflow.time_entries(started_at);

CREATE TABLE IF NOT EXISTS legalflow.csat_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES legalflow.tickets(id) ON DELETE CASCADE,
  rating int CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_csat_ticket ON legalflow.csat_ratings(ticket_id);
CREATE INDEX IF NOT EXISTS idx_csat_created_at ON legalflow.csat_ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_csat_rating ON legalflow.csat_ratings(rating);

-- 4) Ticket threads for messaging
CREATE TABLE IF NOT EXISTS legalflow.ticket_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES legalflow.tickets(id) ON DELETE CASCADE,
  thread_link_id text, -- link to ai_messages or other messaging system
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ticket_threads_ticket_id ON legalflow.ticket_threads(ticket_id);

-- 5) Activities table (if not exists)
CREATE TABLE IF NOT EXISTS legalflow.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending', -- pending|in_progress|completed|cancelled
  due_at timestamptz,
  completed_at timestamptz,
  assigned_to uuid,
  created_by uuid,
  numero_cnj text,
  cliente_cpfcnpj text,
  journey_instance_id uuid,
  stage_instance_id uuid,
  priority text DEFAULT 'normal',
  activity_type text DEFAULT 'task', -- task|call|meeting|document|review
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for activities
CREATE INDEX IF NOT EXISTS idx_activities_status ON legalflow.activities(status);
CREATE INDEX IF NOT EXISTS idx_activities_assigned_to ON legalflow.activities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_due_at ON legalflow.activities(due_at);
CREATE INDEX IF NOT EXISTS idx_activities_numero_cnj ON legalflow.activities(numero_cnj);
CREATE INDEX IF NOT EXISTS idx_activities_cliente_cpfcnpj ON legalflow.activities(cliente_cpfcnpj);

-- 6) Deals table (if not exists)
CREATE TABLE IF NOT EXISTS legalflow.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  cliente_cpfcnpj text,
  value numeric(15,2),
  stage text DEFAULT 'lead', -- lead|qualified|proposal|negotiation|closed_won|closed_lost
  probability int DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date date,
  actual_close_date date,
  assigned_to uuid,
  created_by uuid,
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for deals
CREATE INDEX IF NOT EXISTS idx_deals_stage ON legalflow.deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_assigned_to ON legalflow.deals(assigned_to);
CREATE INDEX IF NOT EXISTS idx_deals_cliente_cpfcnpj ON legalflow.deals(cliente_cpfcnpj);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON legalflow.deals(expected_close_date);

-- 7) Auto-aplicar SLA ao criar Ticket
CREATE OR REPLACE FUNCTION legalflow.apply_ticket_sla()
RETURNS trigger 
LANGUAGE plpgsql AS $$
DECLARE 
  frt int; 
  ttr int;
BEGIN
  SELECT frt_hours, ttr_hours INTO frt, ttr
  FROM legalflow.sla_policies
  WHERE active IS true
    AND COALESCE(group_key,'') = COALESCE(NEW.group_key,'')
    AND COALESCE(priority,'normal') = COALESCE(NEW.priority,'normal')
  ORDER BY id DESC LIMIT 1;

  IF frt IS NOT NULL THEN
    NEW.frt_due_at := (NEW.created_at AT TIME ZONE 'America/Manaus') + make_interval(hours => frt);
  END IF;
  IF ttr IS NOT NULL THEN
    NEW.ttr_due_at := (NEW.created_at AT TIME ZONE 'America/Manaus') + make_interval(hours => ttr);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS t_ticket_apply_sla ON legalflow.tickets;
CREATE TRIGGER t_ticket_apply_sla
BEFORE INSERT ON legalflow.tickets
FOR EACH ROW EXECUTE FUNCTION legalflow.apply_ticket_sla();

-- 8) Métricas de tickets (FRT/TTR e violação)
CREATE OR REPLACE VIEW legalflow.vw_ticket_metrics AS
WITH first_agent_msg AS (
  SELECT tt.ticket_id,
         MIN(CASE 
           WHEN tt.thread_link_id IS NOT NULL THEN tt.created_at
           ELSE NULL
         END) as first_agent_at
  FROM legalflow.ticket_threads tt
  GROUP BY tt.ticket_id
)
SELECT t.id as ticket_id,
       t.created_at,
       t.first_response_at,
       fam.first_agent_at,
       EXTRACT(epoch FROM (COALESCE(t.first_response_at, fam.first_agent_at) - t.created_at))/60.0 as frt_minutes,
       t.resolved_at,
       EXTRACT(epoch FROM (t.resolved_at - t.created_at))/60.0 as ttr_minutes,
       t.frt_due_at, 
       t.ttr_due_at,
       CASE 
         WHEN COALESCE(t.first_response_at, fam.first_agent_at) IS NOT NULL 
              AND COALESCE(t.first_response_at, fam.first_agent_at) > t.frt_due_at 
         THEN true 
         ELSE false 
       END as frt_violated,
       CASE 
         WHEN t.resolved_at IS NOT NULL AND t.resolved_at > t.ttr_due_at 
         THEN true 
         ELSE false 
       END as ttr_violated,
       t.status, 
       t.priority, 
       t.group_key, 
       t.cliente_cpfcnpj,
       t.title,
       t.assigned_to
FROM legalflow.tickets t
LEFT JOIN first_agent_msg fam ON fam.ticket_id = t.id;

-- 9) Visões executivas
CREATE OR REPLACE VIEW legalflow.vw_csat_30d AS
SELECT date_trunc('day', created_at)::date as dia,
       AVG(rating)::numeric(4,2) as csat_avg, 
       COUNT(*) as responses
FROM legalflow.csat_ratings
WHERE created_at >= now() - interval '30 days'
GROUP BY 1 
ORDER BY 1 DESC;

CREATE OR REPLACE VIEW legalflow.vw_time_by_user_7d AS
SELECT user_id, 
       date_trunc('day', started_at)::date as dia,
       SUM(duration_minutes) as minutes
FROM legalflow.time_entries
WHERE started_at >= now() - interval '7 days'
GROUP BY 1,2 
ORDER BY 2 DESC;

-- 10) SLA para Etapas (Jornadas)
CREATE OR REPLACE VIEW legalflow.vw_sla_etapas AS
WITH stage_buckets AS (
  SELECT si.id,
         si.instance_id,
         si.status,
         si.sla_at,
         si.completed_at,
         si.assigned_oab,
         jts.title as stage_title,
         ji.cliente_cpfcnpj,
         ji.processo_numero_cnj,
         CASE 
           WHEN si.status = 'completed' THEN 'completed'
           WHEN si.sla_at IS NULL THEN 'no_sla'
           WHEN si.sla_at < now() THEN 'overdue'
           WHEN si.sla_at < now() + interval '24 hours' THEN '<24h'
           WHEN si.sla_at < now() + interval '72 hours' THEN '24-72h'
           ELSE '>72h'
         END as bucket,
         EXTRACT(epoch FROM (now() - si.sla_at))/3600.0 as hours_overdue
  FROM legalflow.stage_instances si
  JOIN legalflow.journey_instances ji ON ji.id = si.instance_id
  LEFT JOIN legalflow.journey_template_stages jts ON jts.id = si.template_stage_id
  WHERE si.status IN ('pending', 'in_progress')
)
SELECT *,
       CASE 
         WHEN bucket = 'overdue' THEN 1
         WHEN bucket = '<24h' THEN 2  
         WHEN bucket = '24-72h' THEN 3
         WHEN bucket = '>72h' THEN 4
         ELSE 0
       END as priority_order
FROM stage_buckets;

-- 11) Financeiro: parcelas de pagamento (if not exists)
CREATE TABLE IF NOT EXISTS legalflow.planos_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_instance_id uuid, -- references journey_instances(id)
  cliente_cpfcnpj text NOT NULL,
  descricao text NOT NULL,
  valor_total numeric(15,2) NOT NULL,
  status text DEFAULT 'active', -- active|cancelled|completed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legalflow.parcelas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES legalflow.planos_pagamento(id) ON DELETE CASCADE,
  numero_parcela int NOT NULL,
  valor numeric(15,2) NOT NULL,
  due_date date NOT NULL,
  status text DEFAULT 'pending', -- pending|paid|overdue|cancelled
  paid_at timestamptz,
  payment_method text,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for financeiro
CREATE INDEX IF NOT EXISTS idx_planos_pagamento_cliente ON legalflow.planos_pagamento(cliente_cpfcnpj);
CREATE INDEX IF NOT EXISTS idx_planos_pagamento_journey ON legalflow.planos_pagamento(journey_instance_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_pagamento_plano ON legalflow.parcelas_pagamento(plano_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_pagamento_status ON legalflow.parcelas_pagamento(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_pagamento_due_date ON legalflow.parcelas_pagamento(due_date);

-- 12) Função: marcar parcelas vencidas (dunning)
CREATE OR REPLACE FUNCTION legalflow.flag_overdue_installments()
RETURNS void 
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE legalflow.parcelas_pagamento
  SET status = 'overdue',
      updated_at = now()
  WHERE status = 'pending' 
    AND due_date < current_date;
END $$;

-- 13) Eventos de produto (telemetria) - extended
CREATE TABLE IF NOT EXISTS legalflow.app_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event text NOT NULL,         -- 'ticket_created','first_reply','ticket_resolved','stage_done','invoice_paid'
  payload jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_events_event ON legalflow.app_events(event);
CREATE INDEX IF NOT EXISTS idx_app_events_user_id ON legalflow.app_events(user_id);
CREATE INDEX IF NOT EXISTS idx_app_events_created_at ON legalflow.app_events(created_at);

-- 14) View: Inbox processada (7d)
CREATE OR REPLACE VIEW legalflow.vw_inbox_processed_7d AS
SELECT date_trunc('day', created_at)::date as dia,
       COUNT(*) as triagens_dia
FROM public.movimentacoes
WHERE created_at >= now() - interval '7 days'
UNION ALL
SELECT date_trunc('day', created_at)::date as dia,
       COUNT(*) as triagens_dia
FROM public.publicacoes
WHERE created_at >= now() - interval '7 days'
ORDER BY dia DESC;

-- 15) Agenda/Eventos (if not exists)
CREATE TABLE IF NOT EXISTS legalflow.eventos_agenda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  descricao text,
  data_inicio timestamptz NOT NULL,
  data_fim timestamptz,
  cliente_cpfcnpj text,
  numero_cnj text,
  tipo_evento text DEFAULT 'reuniao', -- reuniao|audiencia|prazo|tarefa
  status text DEFAULT 'agendado', -- agendado|confirmado|cancelado|realizado
  assigned_to uuid,
  created_by uuid,
  location text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for agenda
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_data_inicio ON legalflow.eventos_agenda(data_inicio);
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_cliente ON legalflow.eventos_agenda(cliente_cpfcnpj);
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_assigned_to ON legalflow.eventos_agenda(assigned_to);
CREATE INDEX IF NOT EXISTS idx_eventos_agenda_status ON legalflow.eventos_agenda(status);

-- 16) Default SLA policies
INSERT INTO legalflow.sla_policies (group_key, priority, frt_hours, ttr_hours) 
VALUES 
  ('Trabalhista', 'baixa', 8, 72),
  ('Trabalhista', 'normal', 4, 48),
  ('Trabalhista', 'alta', 2, 24),
  ('Trabalhista', 'urgente', 1, 8),
  ('Civil', 'baixa', 12, 96),
  ('Civil', 'normal', 6, 72),
  ('Civil', 'alta', 3, 36),
  ('Civil', 'urgente', 1, 12),
  ('Criminal', 'normal', 2, 24),
  ('Criminal', 'alta', 1, 12),
  ('Criminal', 'urgente', 0.5, 6)
ON CONFLICT (group_key, priority) DO NOTHING;

-- 17) Trigger para updated_at
CREATE OR REPLACE FUNCTION legalflow.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_tickets_updated_at ON legalflow.tickets;
CREATE TRIGGER update_tickets_updated_at 
    BEFORE UPDATE ON legalflow.tickets 
    FOR EACH ROW EXECUTE FUNCTION legalflow.update_updated_at_column();

DROP TRIGGER IF EXISTS update_activities_updated_at ON legalflow.activities;
CREATE TRIGGER update_activities_updated_at 
    BEFORE UPDATE ON legalflow.activities 
    FOR EACH ROW EXECUTE FUNCTION legalflow.update_updated_at_column();

DROP TRIGGER IF EXISTS update_deals_updated_at ON legalflow.deals;
CREATE TRIGGER update_deals_updated_at 
    BEFORE UPDATE ON legalflow.deals 
    FOR EACH ROW EXECUTE FUNCTION legalflow.update_updated_at_column();

-- 18) Grant permissions
GRANT USAGE ON SCHEMA legalflow TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA legalflow TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA legalflow TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA legalflow TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA legalflow TO authenticated;

-- Comments for documentation
COMMENT ON TABLE legalflow.sla_policies IS 'SLA policies for tickets by group and priority';
COMMENT ON TABLE legalflow.tickets IS 'Support tickets with SLA tracking';
COMMENT ON TABLE legalflow.time_entries IS 'Time tracking entries for tickets and activities';
COMMENT ON TABLE legalflow.csat_ratings IS 'Customer satisfaction ratings for tickets';
COMMENT ON VIEW legalflow.vw_ticket_metrics IS 'Ticket metrics with FRT/TTR calculations and violations';
COMMENT ON VIEW legalflow.vw_sla_etapas IS 'Journey stage SLA buckets and priorities';
COMMENT ON FUNCTION legalflow.flag_overdue_installments() IS 'Marks overdue payment installments';
