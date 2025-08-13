-- =============================================
-- RPCs para Monitoramento e Sync
-- =============================================

-- 1) RPC para configurar monitoramento
CREATE OR REPLACE FUNCTION legalflow.lf_set_monitoring(
  p_numero_cnj varchar,
  p_provider varchar,
  p_active boolean,
  p_premium boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, legalflow
AS $$
BEGIN
  INSERT INTO legalflow.monitoring_settings (
    numero_cnj, 
    provider, 
    active, 
    premium_on, 
    updated_at
  )
  VALUES (
    p_numero_cnj, 
    p_provider, 
    p_active, 
    p_premium, 
    now()
  )
  ON CONFLICT (numero_cnj) 
  DO UPDATE SET
    provider = EXCLUDED.provider,
    active = EXCLUDED.active,
    premium_on = EXCLUDED.premium_on,
    updated_at = now();
END $$;

-- 2) Tabela de jobs de sync
CREATE TABLE IF NOT EXISTS legalflow.sync_jobs (
  id bigserial PRIMARY KEY,
  numero_cnj varchar NOT NULL,
  provider varchar NOT NULL, -- 'advise' | 'escavador'
  status varchar DEFAULT 'queued', -- 'queued' | 'running' | 'ok' | 'error'
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  results jsonb
);

-- 3) RPC para executar sync
CREATE OR REPLACE FUNCTION legalflow.lf_run_sync(p_numero_cnj varchar)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, legalflow
AS $$
DECLARE
  v_provider varchar;
  v_job_id bigint;
BEGIN
  -- Buscar provider das configurações
  SELECT provider 
  INTO v_provider 
  FROM legalflow.monitoring_settings 
  WHERE numero_cnj = p_numero_cnj AND active = true
  LIMIT 1;
  
  -- Default para advise se não encontrar
  IF v_provider IS NULL THEN
    v_provider := 'advise';
  END IF;
  
  -- Criar job de sync
  INSERT INTO legalflow.sync_jobs (numero_cnj, provider, status)
  VALUES (p_numero_cnj, v_provider, 'queued')
  RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END $$;

-- 4) RPC para marcar resultado do sync
CREATE OR REPLACE FUNCTION legalflow.lf_mark_sync_result(
  p_job_id bigint,
  p_status varchar,
  p_error text DEFAULT NULL,
  p_results jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, legalflow
AS $$
BEGIN
  UPDATE legalflow.sync_jobs
  SET 
    status = p_status,
    error_message = p_error,
    results = p_results,
    completed_at = now()
  WHERE id = p_job_id;
END $$;

-- 5) Função para buscar status de sync mais recente
CREATE OR REPLACE FUNCTION legalflow.lf_get_latest_sync_status(p_numero_cnj varchar)
RETURNS TABLE(
  job_id bigint,
  status varchar,
  provider varchar,
  created_at timestamptz,
  completed_at timestamptz,
  error_message text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, legalflow
AS $$
  SELECT 
    id as job_id,
    status,
    provider,
    created_at,
    completed_at,
    error_message
  FROM legalflow.sync_jobs
  WHERE numero_cnj = p_numero_cnj
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- 6) Índices para performance
CREATE INDEX IF NOT EXISTS idx_sync_jobs_numero_cnj ON legalflow.sync_jobs(numero_cnj);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON legalflow.sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON legalflow.sync_jobs(created_at DESC);

-- 7) Trigger para notificar realtime em sync_jobs
CREATE OR REPLACE FUNCTION notify_sync_job_change()
RETURNS trigger AS $$
BEGIN
  PERFORM pg_notify('sync_job_change', 
    json_build_object(
      'id', NEW.id,
      'numero_cnj', NEW.numero_cnj,
      'status', NEW.status,
      'operation', TG_OP
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_jobs_notify ON legalflow.sync_jobs;
CREATE TRIGGER sync_jobs_notify
  AFTER INSERT OR UPDATE ON legalflow.sync_jobs
  FOR EACH ROW EXECUTE FUNCTION notify_sync_job_change();

-- Grant permissions
GRANT EXECUTE ON FUNCTION legalflow.lf_set_monitoring(varchar, varchar, boolean, boolean) TO postgres, anon, authenticated;
GRANT EXECUTE ON FUNCTION legalflow.lf_run_sync(varchar) TO postgres, anon, authenticated;
GRANT EXECUTE ON FUNCTION legalflow.lf_mark_sync_result(bigint, varchar, text, jsonb) TO postgres, anon, authenticated;
GRANT EXECUTE ON FUNCTION legalflow.lf_get_latest_sync_status(varchar) TO postgres, anon, authenticated;
GRANT ALL ON legalflow.sync_jobs TO postgres, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE legalflow.sync_jobs_id_seq TO postgres, anon, authenticated;
