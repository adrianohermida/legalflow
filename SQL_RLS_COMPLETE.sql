-- ===================================
-- ROW LEVEL SECURITY (RLS) - COMPLETE
-- ===================================

-- Helper function to check if user is a client or team member
CREATE OR REPLACE FUNCTION public.get_user_type()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM user_advogado ua 
      WHERE ua.user_id = auth.uid()
    ) THEN 'team'
    WHEN auth.jwt() ->> 'email' = 'adrianohermida@gmail.com' THEN 'superadmin'
    ELSE 'cliente'
  END;
$$;

-- Helper function to get user's CPF/CNPJ if they are a client
CREATE OR REPLACE FUNCTION public.get_user_cpfcnpj()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT c.cpfcnpj 
  FROM public.clientes c
  WHERE c.user_id = auth.uid()
  LIMIT 1;
$$;

-- Helper function to get user's OAB if they are a lawyer
CREATE OR REPLACE FUNCTION public.get_user_oab()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT a.oab 
  FROM public.advogados a
  JOIN user_advogado ua ON ua.advogado_oab = a.oab
  WHERE ua.user_id = auth.uid()
  LIMIT 1;
$$;

-- ===================================
-- CORE TABLES RLS POLICIES
-- ===================================

-- CLIENTES: Clients see only their own data, team sees all
DROP POLICY IF EXISTS "clientes_access_policy" ON public.clientes;
CREATE POLICY "clientes_access_policy" ON public.clientes
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true  -- Lawyers see all clients
    WHEN 'cliente' THEN user_id = auth.uid()  -- Clients see only themselves
    ELSE false
  END
);

-- PROCESSOS: Clients see only their processes, team sees all
DROP POLICY IF EXISTS "processos_access_policy" ON public.processos;
CREATE POLICY "processos_access_policy" ON public.processos
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true  -- Lawyers see all processes
    WHEN 'cliente' THEN cliente_cpfcnpj = public.get_user_cpfcnpj()
    ELSE false
  END
);

-- ADVOGADOS: Lawyers see their own data + public info, clients see public info only
DROP POLICY IF EXISTS "advogados_access_policy" ON public.advogados;
CREATE POLICY "advogados_access_policy" ON public.advogados
FOR SELECT USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true  -- Lawyers see all lawyer data
    WHEN 'cliente' THEN true  -- Clients can see lawyer public info
    ELSE false
  END
);

-- MOVIMENTACOES: Linked to processes, follow same access pattern
DROP POLICY IF EXISTS "movimentacoes_access_policy" ON public.movimentacoes;
CREATE POLICY "movimentacoes_access_policy" ON public.movimentacoes
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    WHEN 'cliente' THEN EXISTS (
      SELECT 1 FROM public.processos p 
      WHERE p.numero_cnj = movimentacoes.numero_cnj 
        AND p.cliente_cpfcnpj = public.get_user_cpfcnpj()
    )
    ELSE false
  END
);

-- PUBLICACOES: Linked to processes, follow same access pattern
DROP POLICY IF EXISTS "publicacoes_access_policy" ON public.publicacoes;
CREATE POLICY "publicacoes_access_policy" ON public.publicacoes
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    WHEN 'cliente' THEN EXISTS (
      SELECT 1 FROM public.processos p 
      WHERE p.numero_cnj = publicacoes.numero_cnj 
        AND p.cliente_cpfcnpj = public.get_user_cpfcnpj()
    )
    ELSE false
  END
);

-- AUDIENCIAS: Linked to processes, follow same access pattern
DROP POLICY IF EXISTS "audiencias_access_policy" ON public.audiencias;
CREATE POLICY "audiencias_access_policy" ON public.audiencias
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    WHEN 'cliente' THEN EXISTS (
      SELECT 1 FROM public.processos p 
      WHERE p.numero_cnj = audiencias.numero_cnj 
        AND p.cliente_cpfcnpj = public.get_user_cpfcnpj()
    )
    ELSE false
  END
);

-- DOCUMENTS: Linked to processes, follow same access pattern
DROP POLICY IF EXISTS "documents_access_policy" ON public.documents;
CREATE POLICY "documents_access_policy" ON public.documents
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    WHEN 'cliente' THEN 
      (metadata->>'numero_cnj') IN (
        SELECT p.numero_cnj FROM public.processos p 
        WHERE p.cliente_cpfcnpj = public.get_user_cpfcnpj()
      )
    ELSE false
  END
);

-- ===================================
-- LEGALFLOW SCHEMA RLS POLICIES
-- ===================================

-- JOURNEY_TEMPLATES: Team can manage, clients can view
DROP POLICY IF EXISTS "journey_templates_access_policy" ON legalflow.journey_templates;
CREATE POLICY "journey_templates_access_policy" ON legalflow.journey_templates
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true  -- Lawyers can manage templates
    WHEN 'cliente' THEN false  -- Clients cannot see templates directly
    ELSE false
  END
);

-- JOURNEY_INSTANCES: Clients see only their journeys, team sees all
DROP POLICY IF EXISTS "journey_instances_access_policy" ON legalflow.journey_instances;
CREATE POLICY "journey_instances_access_policy" ON legalflow.journey_instances
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    WHEN 'cliente' THEN cliente_cpfcnpj = public.get_user_cpfcnpj()
    ELSE false
  END
);

-- STAGE_INSTANCES: Follow journey access pattern
DROP POLICY IF EXISTS "stage_instances_access_policy" ON legalflow.stage_instances;
CREATE POLICY "stage_instances_access_policy" ON legalflow.stage_instances
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    WHEN 'cliente' THEN EXISTS (
      SELECT 1 FROM legalflow.journey_instances ji 
      WHERE ji.id = stage_instances.instance_id 
        AND ji.cliente_cpfcnpj = public.get_user_cpfcnpj()
    )
    ELSE false
  END
);

-- DOCUMENT_UPLOADS: Follow stage access pattern
DROP POLICY IF EXISTS "document_uploads_access_policy" ON legalflow.document_uploads;
CREATE POLICY "document_uploads_access_policy" ON legalflow.document_uploads
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    WHEN 'cliente' THEN EXISTS (
      SELECT 1 FROM legalflow.stage_instances si
      JOIN legalflow.journey_instances ji ON ji.id = si.instance_id
      WHERE si.id = document_uploads.stage_instance_id 
        AND ji.cliente_cpfcnpj = public.get_user_cpfcnpj()
    )
    ELSE false
  END
);

-- PARTES_PROCESSO: Follow process access pattern
DROP POLICY IF EXISTS "partes_processo_access_policy" ON legalflow.partes_processo;
CREATE POLICY "partes_processo_access_policy" ON legalflow.partes_processo
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    WHEN 'cliente' THEN EXISTS (
      SELECT 1 FROM public.processos p 
      WHERE p.numero_cnj = partes_processo.numero_cnj 
        AND p.cliente_cpfcnpj = public.get_user_cpfcnpj()
    )
    ELSE false
  END
);

-- MONITORING_SETTINGS: Team only
DROP POLICY IF EXISTS "monitoring_settings_access_policy" ON legalflow.monitoring_settings;
CREATE POLICY "monitoring_settings_access_policy" ON legalflow.monitoring_settings
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    ELSE false
  END
);

-- SYNC_JOBS: Team only
DROP POLICY IF EXISTS "sync_jobs_access_policy" ON legalflow.sync_jobs;
CREATE POLICY "sync_jobs_access_policy" ON legalflow.sync_jobs
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    ELSE false
  END
);

-- PLANOS_PAGAMENTO: Clients see only their own, team sees all
DROP POLICY IF EXISTS "planos_pagamento_access_policy" ON legalflow.planos_pagamento;
CREATE POLICY "planos_pagamento_access_policy" ON legalflow.planos_pagamento
FOR ALL USING (
  CASE public.get_user_type()
    WHEN 'superadmin' THEN true
    WHEN 'team' THEN true
    WHEN 'cliente' THEN cliente_cpfcnpj = public.get_user_cpfcnpj()
    ELSE false
  END
);

-- ===================================
-- ENABLE RLS ON ALL TABLES
-- ===================================

-- Public schema
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.advogados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audiencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Legalflow schema
ALTER TABLE legalflow.journey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.journey_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.stage_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.partes_processo ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.monitoring_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.planos_pagamento ENABLE ROW LEVEL SECURITY;

-- Grant usage on helper functions
GRANT EXECUTE ON FUNCTION public.get_user_type() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_cpfcnpj() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_oab() TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION public.get_user_type() IS 'Returns user type: superadmin, team, or cliente based on auth context';
COMMENT ON FUNCTION public.get_user_cpfcnpj() IS 'Returns CPF/CNPJ for authenticated client users';
COMMENT ON FUNCTION public.get_user_oab() IS 'Returns OAB number for authenticated lawyer users';
