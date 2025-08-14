-- ===================================
-- AUDIT LOGGING SYSTEM - COMPLETE
-- ===================================

-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- Audit log table to store all changes
CREATE TABLE IF NOT EXISTS audit.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_schema text NOT NULL,
  table_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id uuid,
  user_email text,
  user_type text,
  old_values jsonb,
  new_values jsonb,
  changed_fields text[],
  record_id text,
  client_ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit.audit_log(table_schema, table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_operation ON audit.audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_record_id ON audit.audit_log(record_id);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit.audit_trigger_function()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_data jsonb;
  new_data jsonb;
  changed_fields text[] = '{}';
  record_id text;
  user_email text;
  user_type text;
BEGIN
  -- Get user context
  user_email := COALESCE(auth.jwt() ->> 'email', 'system');
  user_type := COALESCE(public.get_user_type(), 'unknown');

  -- Determine record ID
  CASE TG_OP
    WHEN 'DELETE' THEN
      record_id := COALESCE(OLD.id::text, OLD.numero_cnj::text, OLD.cpfcnpj::text, OLD.oab::text, 'unknown');
      old_data := to_jsonb(OLD);
      new_data := null;
    WHEN 'UPDATE' THEN
      record_id := COALESCE(NEW.id::text, NEW.numero_cnj::text, NEW.cpfcnpj::text, NEW.oab::text, 'unknown');
      old_data := to_jsonb(OLD);
      new_data := to_jsonb(NEW);
      -- Find changed fields
      SELECT array_agg(key) INTO changed_fields
      FROM jsonb_each(old_data) o
      JOIN jsonb_each(new_data) n ON o.key = n.key
      WHERE o.value IS DISTINCT FROM n.value;
    WHEN 'INSERT' THEN
      record_id := COALESCE(NEW.id::text, NEW.numero_cnj::text, NEW.cpfcnpj::text, NEW.oab::text, 'unknown');
      old_data := null;
      new_data := to_jsonb(NEW);
  END CASE;

  -- Insert audit record
  INSERT INTO audit.audit_log (
    table_schema,
    table_name,
    operation,
    user_id,
    user_email,
    user_type,
    old_values,
    new_values,
    changed_fields,
    record_id,
    client_ip,
    user_agent
  ) VALUES (
    TG_TABLE_SCHEMA,
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    user_email,
    user_type,
    old_data,
    new_data,
    changed_fields,
    record_id,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit triggers for key tables

-- PUBLIC SCHEMA TABLES
DROP TRIGGER IF EXISTS audit_trigger ON public.clientes;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON public.processos;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON public.advogados;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.advogados
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON public.movimentacoes;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.movimentacoes
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON public.publicacoes;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.publicacoes
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON public.audiencias;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.audiencias
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON public.documents;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

-- LEGALFLOW SCHEMA TABLES
DROP TRIGGER IF EXISTS audit_trigger ON legalflow.journey_templates;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON legalflow.journey_templates
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON legalflow.journey_instances;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON legalflow.journey_instances
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON legalflow.stage_instances;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON legalflow.stage_instances
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON legalflow.document_uploads;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON legalflow.document_uploads
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON legalflow.partes_processo;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON legalflow.partes_processo
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON legalflow.monitoring_settings;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON legalflow.monitoring_settings
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON legalflow.sync_jobs;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON legalflow.sync_jobs
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

DROP TRIGGER IF EXISTS audit_trigger ON legalflow.planos_pagamento;
CREATE TRIGGER audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON legalflow.planos_pagamento
  FOR EACH ROW EXECUTE FUNCTION audit.audit_trigger_function();

-- RLS for audit table (team only access)
ALTER TABLE audit.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_access_policy" ON audit.audit_log;
CREATE POLICY "audit_log_access_policy" ON audit.audit_log
FOR SELECT USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    ELSE false
  END
);

-- Audit cleanup function (remove old logs)
CREATE OR REPLACE FUNCTION audit.cleanup_old_logs(days_to_keep integer DEFAULT 365)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM audit.audit_log 
  WHERE created_at < now() - (days_to_keep || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- View for recent audit activities
CREATE OR REPLACE VIEW audit.vw_recent_activities AS
SELECT 
  al.id,
  al.table_schema || '.' || al.table_name as table_full_name,
  al.operation,
  al.user_email,
  al.user_type,
  al.record_id,
  al.changed_fields,
  al.created_at,
  CASE 
    WHEN al.table_name = 'clientes' THEN al.new_values->>'nome'
    WHEN al.table_name = 'processos' THEN al.new_values->>'numero_cnj'
    WHEN al.table_name = 'journey_instances' THEN 
      (SELECT jt.name FROM legalflow.journey_templates jt 
       WHERE jt.id::text = al.new_values->>'template_id')
    ELSE al.record_id
  END as display_name
FROM audit.audit_log al
WHERE al.created_at >= now() - interval '30 days'
ORDER BY al.created_at DESC;

-- Grant permissions
GRANT USAGE ON SCHEMA audit TO authenticated;
GRANT SELECT ON audit.audit_log TO authenticated;
GRANT SELECT ON audit.vw_recent_activities TO authenticated;
GRANT EXECUTE ON FUNCTION audit.cleanup_old_logs(integer) TO authenticated;

-- Comments
COMMENT ON SCHEMA audit IS 'Audit logging system for tracking all data changes';
COMMENT ON TABLE audit.audit_log IS 'Complete audit trail of all INSERT/UPDATE/DELETE operations';
COMMENT ON FUNCTION audit.audit_trigger_function() IS 'Generic trigger function for auditing table changes';
COMMENT ON FUNCTION audit.cleanup_old_logs(integer) IS 'Cleanup function to remove old audit logs';
