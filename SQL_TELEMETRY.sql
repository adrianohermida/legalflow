-- ===================================
-- TELEMETRY SYSTEM - DATABASE SETUP
-- ===================================

-- Create telemetry table
CREATE TABLE IF NOT EXISTS public.telemetry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid,
  user_email text,
  user_type text,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now(),
  session_id text NOT NULL,
  page_url text,
  user_agent text,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_events_event_name ON public.telemetry_events(event_name);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_id ON public.telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_timestamp ON public.telemetry_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_session_id ON public.telemetry_events(session_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_created_at ON public.telemetry_events(created_at);

-- GIN index for properties JSONB queries
CREATE INDEX IF NOT EXISTS idx_telemetry_events_properties ON public.telemetry_events USING GIN(properties);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_event ON public.telemetry_events(user_id, event_name, timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_daily_metrics ON public.telemetry_events(event_name, date_trunc('day', timestamp));

-- ===================================
-- PERFORMANCE INDEXES FOR MAIN TABLES
-- ===================================

-- PROCESSOS - Critical query performance
CREATE INDEX IF NOT EXISTS idx_processos_cliente_cpfcnpj ON public.processos(cliente_cpfcnpj);
CREATE INDEX IF NOT EXISTS idx_processos_tribunal_sigla ON public.processos(tribunal_sigla);
CREATE INDEX IF NOT EXISTS idx_processos_created_at ON public.processos(created_at);
CREATE INDEX IF NOT EXISTS idx_processos_numero_cnj_trgm ON public.processos USING GIN(numero_cnj gin_trgm_ops);

-- MOVIMENTACOES - Inbox performance
CREATE INDEX IF NOT EXISTS idx_movimentacoes_numero_cnj ON public.movimentacoes(numero_cnj);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_created_at ON public.movimentacoes(created_at);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data_movimentacao ON public.movimentacoes(data_movimentacao);

-- PUBLICACOES - Inbox performance  
CREATE INDEX IF NOT EXISTS idx_publicacoes_numero_cnj ON public.publicacoes(numero_cnj);
CREATE INDEX IF NOT EXISTS idx_publicacoes_created_at ON public.publicacoes(created_at);
CREATE INDEX IF NOT EXISTS idx_publicacoes_data_publicacao ON public.publicacoes(data_publicacao);

-- CLIENTES - User access performance
CREATE INDEX IF NOT EXISTS idx_clientes_cpfcnpj ON public.clientes(cpfcnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome_trgm ON public.clientes USING GIN(nome gin_trgm_ops);

-- ADVOGADOS - Team access performance
CREATE INDEX IF NOT EXISTS idx_advogados_oab ON public.advogados(oab);
CREATE INDEX IF NOT EXISTS idx_advogados_nome_trgm ON public.advogados USING GIN(nome gin_trgm_ops);

-- USER_ADVOGADO - Authentication performance
CREATE INDEX IF NOT EXISTS idx_user_advogado_user_id ON public.user_advogado(user_id);
CREATE INDEX IF NOT EXISTS idx_user_advogado_advogado_oab ON public.user_advogado(advogado_oab);

-- DOCUMENTS - Document search performance
CREATE INDEX IF NOT EXISTS idx_documents_metadata_numero_cnj ON public.documents USING GIN((metadata->>'numero_cnj'));
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents(file_type);

-- ===================================
-- LEGALFLOW SCHEMA INDEXES
-- ===================================

-- JOURNEY_INSTANCES - Journey performance
CREATE INDEX IF NOT EXISTS idx_journey_instances_cliente_cpfcnpj ON legalflow.journey_instances(cliente_cpfcnpj);
CREATE INDEX IF NOT EXISTS idx_journey_instances_processo_numero_cnj ON legalflow.journey_instances(processo_numero_cnj);
CREATE INDEX IF NOT EXISTS idx_journey_instances_template_id ON legalflow.journey_instances(template_id);
CREATE INDEX IF NOT EXISTS idx_journey_instances_status ON legalflow.journey_instances(status);
CREATE INDEX IF NOT EXISTS idx_journey_instances_owner_oab ON legalflow.journey_instances(owner_oab);

-- STAGE_INSTANCES - Stage management performance
CREATE INDEX IF NOT EXISTS idx_stage_instances_instance_id ON legalflow.stage_instances(instance_id);
CREATE INDEX IF NOT EXISTS idx_stage_instances_template_stage_id ON legalflow.stage_instances(template_stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_instances_status ON legalflow.stage_instances(status);
CREATE INDEX IF NOT EXISTS idx_stage_instances_sla_at ON legalflow.stage_instances(sla_at);
CREATE INDEX IF NOT EXISTS idx_stage_instances_assigned_oab ON legalflow.stage_instances(assigned_oab);

-- DOCUMENT_UPLOADS - Document management performance
CREATE INDEX IF NOT EXISTS idx_document_uploads_stage_instance_id ON legalflow.document_uploads(stage_instance_id);
CREATE INDEX IF NOT EXISTS idx_document_uploads_status ON legalflow.document_uploads(status);
CREATE INDEX IF NOT EXISTS idx_document_uploads_uploaded_at ON legalflow.document_uploads(uploaded_at);

-- PARTES_PROCESSO - Process parties performance
CREATE INDEX IF NOT EXISTS idx_partes_processo_numero_cnj ON legalflow.partes_processo(numero_cnj);
CREATE INDEX IF NOT EXISTS idx_partes_processo_cpfcnpj ON legalflow.partes_processo(cpfcnpj);
CREATE INDEX IF NOT EXISTS idx_partes_processo_polo ON legalflow.partes_processo(polo);

-- SYNC_JOBS - Monitoring performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_numero_cnj ON legalflow.sync_jobs(numero_cnj);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON legalflow.sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_queued_at ON legalflow.sync_jobs(queued_at);

-- ===================================
-- TELEMETRY VIEWS FOR ANALYTICS
-- ===================================

-- Critical events summary
CREATE OR REPLACE VIEW public.vw_telemetry_critical_events AS
SELECT 
  event_name,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  date_trunc('day', timestamp) as event_date
FROM public.telemetry_events
WHERE event_name IN (
  'user_login',
  'process_created', 
  'journey_started',
  'document_uploaded',
  'ai_tool_executed',
  'stage_completed',
  'sync_job_completed'
)
GROUP BY event_name, date_trunc('day', timestamp)
ORDER BY event_date DESC, event_count DESC;

-- User activity summary
CREATE OR REPLACE VIEW public.vw_telemetry_user_activity AS
SELECT 
  user_email,
  user_type,
  COUNT(*) as total_events,
  COUNT(DISTINCT event_name) as unique_event_types,
  COUNT(DISTINCT session_id) as sessions,
  MIN(timestamp) as first_activity,
  MAX(timestamp) as last_activity,
  date_trunc('day', MAX(timestamp)) as last_active_date
FROM public.telemetry_events
WHERE user_id IS NOT NULL
GROUP BY user_email, user_type
ORDER BY last_activity DESC;

-- Performance metrics
CREATE OR REPLACE VIEW public.vw_telemetry_performance AS
SELECT 
  properties->>'metric_name' as metric_name,
  AVG((properties->>'value')::numeric) as avg_value,
  MIN((properties->>'value')::numeric) as min_value,
  MAX((properties->>'value')::numeric) as max_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (properties->>'value')::numeric) as p95_value,
  COUNT(*) as measurement_count,
  date_trunc('hour', timestamp) as measurement_hour
FROM public.telemetry_events
WHERE event_name = 'performance_metric'
  AND properties->>'metric_name' IS NOT NULL
  AND properties->>'value' ~ '^[0-9]+\.?[0-9]*$'
GROUP BY properties->>'metric_name', date_trunc('hour', timestamp)
ORDER BY measurement_hour DESC;

-- RLS for telemetry (team access only)
ALTER TABLE public.telemetry_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "telemetry_events_access_policy" ON public.telemetry_events;
CREATE POLICY "telemetry_events_access_policy" ON public.telemetry_events
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    ELSE false
  END
);

-- Grant permissions
GRANT SELECT ON public.vw_telemetry_critical_events TO authenticated;
GRANT SELECT ON public.vw_telemetry_user_activity TO authenticated;
GRANT SELECT ON public.vw_telemetry_performance TO authenticated;

-- Telemetry cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_telemetry_events(days_to_keep integer DEFAULT 90)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.telemetry_events 
  WHERE created_at < now() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Comments
COMMENT ON TABLE public.telemetry_events IS 'Telemetry events tracking for product analytics and business metrics';
COMMENT ON VIEW public.vw_telemetry_critical_events IS 'Summary of critical business events for monitoring';
COMMENT ON VIEW public.vw_telemetry_user_activity IS 'User activity patterns and engagement metrics';
COMMENT ON VIEW public.vw_telemetry_performance IS 'Performance metrics aggregated by time periods';
