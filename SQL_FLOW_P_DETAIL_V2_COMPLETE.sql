-- ===================================
-- SQL FLOW P-DETAIL V2 & INBOX V2 - COMPLETO
-- ===================================

-- 0) Criar tipos necessários
DO $$ 
BEGIN
    -- Monitor provider enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'monitor_provider') THEN
        CREATE TYPE legalflow.monitor_provider AS ENUM ('advise','escavador');
    END IF;
    
    -- Sync status enum  
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status') THEN
        CREATE TYPE legalflow.sync_status AS ENUM ('queued','running','ok','error');
    END IF;
END $$;

-- 1) Função para detectar se movimentação é publicação
CREATE OR REPLACE FUNCTION public.is_publicacao(m jsonb)
RETURNS boolean 
LANGUAGE sql 
IMMUTABLE AS $$
  SELECT
    COALESCE(
      (m->>'tipo') ILIKE '%publica%' OR
      (m->>'categoria') ILIKE '%diário%' OR
      (m->>'origem') ILIKE '%diário%' OR
      (m->>'fonte') ILIKE '%diário%' OR
      (m ? 'diario') OR
      (m @> '{"classe":"PUBLICACAO"}'::jsonb),
      false
    )
$$;

-- 2) View unificada para publicações (publicações + movimentações que são publicações)
CREATE OR REPLACE VIEW public.vw_publicacoes_unificadas AS
SELECT
  'publicacoes'::text as source,
  p.id::bigint       as uid,
  p.numero_cnj,
  p.data_publicacao  as occured_at,
  p.data             as payload,
  p.created_at
FROM public.publicacoes p

UNION ALL

SELECT
  'movimentacoes'::text as source,
  m.id::bigint          as uid,
  m.numero_cnj,
  COALESCE(m.data_movimentacao::timestamp, (m.data->>'data')::timestamp) as occured_at,
  m.data as payload,
  m.created_at
FROM public.movimentacoes m
WHERE public.is_publicacao(m.data);

-- 3) Tabela de partes do processo (se não existir)
CREATE TABLE IF NOT EXISTS legalflow.partes_processo (
  id bigserial PRIMARY KEY,
  numero_cnj varchar NOT NULL,
  nome text NOT NULL,
  cpfcnpj varchar,
  polo text,            -- ATIVO|PASSIVO|ADVOGADO etc.
  tipo text,
  papel text,
  is_cliente boolean DEFAULT false,
  advogado_oabs integer[],
  raw jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (numero_cnj, COALESCE(cpfcnpj,''), nome, COALESCE(polo,''))
);

-- 4) RPC para sincronizar partes
CREATE OR REPLACE FUNCTION legalflow.lf_sync_partes(p_cnj varchar)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, legalflow
AS $$
DECLARE
  v_data jsonb;
  v_count int := 0;
  f jsonb; e jsonb; adv jsonb;
  nome text; doc text; polo text; tipo text;
BEGIN
  SELECT data INTO v_data FROM public.processos WHERE numero_cnj = p_cnj;
  IF v_data IS NULL THEN RETURN 0; END IF;

  -- Limpar partes existentes
  DELETE FROM legalflow.partes_processo WHERE numero_cnj = p_cnj;

  -- Processar fontes
  FOR f IN SELECT jsonb_array_elements(COALESCE(v_data->'fontes','[]'::jsonb))
  LOOP
    -- Processar envolvidos
    FOR e IN SELECT jsonb_array_elements(COALESCE(f->'envolvidos','[]'::jsonb))
    LOOP
      nome := e->>'nome';
      doc  := COALESCE(e->>'cpf', e->>'cnpj');
      polo := e->>'polo';
      tipo := e->>'tipo';
      
      INSERT INTO legalflow.partes_processo(numero_cnj, nome, cpfcnpj, polo, tipo, raw)
      VALUES (p_cnj, nome, doc, polo, tipo, e)
      ON CONFLICT (numero_cnj, COALESCE(cpfcnpj,''), nome, COALESCE(polo,'')) DO NOTHING;
      v_count := v_count + 1;

      -- Advogados associados
      FOR adv IN SELECT jsonb_array_elements(COALESCE(e->'advogados','[]'::jsonb))
      LOOP
        INSERT INTO legalflow.partes_processo(numero_cnj, nome, cpfcnpj, polo, tipo, raw)
        VALUES (
          p_cnj,
          adv->>'nome',
          adv->>'cpf',
          'ADVOGADO',
          'Advogado',
          adv
        )
        ON CONFLICT (numero_cnj, COALESCE(cpfcnpj,''), nome, COALESCE(polo,'')) DO NOTHING;
        v_count := v_count + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN v_count;
END $$;

-- 5) Tabela de configurações de monitoramento
CREATE TABLE IF NOT EXISTS legalflow.monitoring_settings (
  numero_cnj        varchar PRIMARY KEY
    REFERENCES public.processos(numero_cnj) ON DELETE CASCADE,
  provider          legalflow.monitor_provider NOT NULL DEFAULT 'advise',
  active            boolean NOT NULL DEFAULT false,
  premium           boolean NOT NULL DEFAULT false,
  options           jsonb   NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at      timestamptz,
  last_status       legalflow.sync_status,
  last_error        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- 6) Fila de jobs de sincronização
CREATE TABLE IF NOT EXISTS legalflow.sync_jobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_cnj        varchar NOT NULL REFERENCES public.processos(numero_cnj) ON DELETE CASCADE,
  provider          legalflow.monitor_provider NOT NULL,
  force_full        boolean NOT NULL DEFAULT false,
  requested_by      uuid,
  status            legalflow.sync_status NOT NULL DEFAULT 'queued',
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  queued_at         timestamptz NOT NULL DEFAULT now(),
  started_at        timestamptz,
  finished_at       timestamptz,
  error             text
);

-- Índices para sync_jobs
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON legalflow.sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_cnj ON legalflow.sync_jobs(numero_cnj);

-- 7) Trigger para updated_at
CREATE OR REPLACE FUNCTION legalflow.trg_touch_updated_at()
RETURNS trigger 
LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at := now(); 
  RETURN NEW; 
END $$;

DROP TRIGGER IF EXISTS t_touch_monitoring ON legalflow.monitoring_settings;
CREATE TRIGGER t_touch_monitoring
BEFORE UPDATE ON legalflow.monitoring_settings
FOR EACH ROW EXECUTE FUNCTION legalflow.trg_touch_updated_at();

-- 8) RPC para definir/alterar monitoramento
CREATE OR REPLACE FUNCTION legalflow.lf_set_monitoring(
  p_numero_cnj varchar,
  p_provider   legalflow.monitor_provider DEFAULT 'advise',
  p_active     boolean DEFAULT true,
  p_premium    boolean DEFAULT false,
  p_options    jsonb    DEFAULT '{}'::jsonb
) RETURNS legalflow.monitoring_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE r legalflow.monitoring_settings;
BEGIN
  INSERT INTO legalflow.monitoring_settings (numero_cnj, provider, active, premium, options)
  VALUES (p_numero_cnj, p_provider, p_active, p_premium, COALESCE(p_options,'{}'::jsonb))
  ON CONFLICT (numero_cnj) DO UPDATE
    SET provider = EXCLUDED.provider,
        active   = EXCLUDED.active,
        premium  = EXCLUDED.premium,
        options  = EXCLUDED.options,
        updated_at = now()
  RETURNING * INTO r;
  RETURN r;
END $$;

-- 9) RPC para enfileirar sincronização
CREATE OR REPLACE FUNCTION legalflow.lf_run_sync(
  p_numero_cnj varchar,
  p_provider   legalflow.monitor_provider DEFAULT null,
  p_force_full boolean DEFAULT false,
  p_payload    jsonb    DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  v_provider legalflow.monitor_provider; 
  v_id uuid;
BEGIN
  SELECT COALESCE(p_provider, ms.provider) INTO v_provider
  FROM legalflow.monitoring_settings ms
  WHERE ms.numero_cnj = p_numero_cnj;

  IF v_provider IS NULL THEN
    -- Fallback: criar settings padrão e usar advise
    PERFORM legalflow.lf_set_monitoring(p_numero_cnj,'advise',false,false,'{}'::jsonb);
    v_provider := 'advise';
  END IF;

  INSERT INTO legalflow.sync_jobs(numero_cnj, provider, force_full, requested_by, status, payload)
  VALUES (p_numero_cnj, v_provider, COALESCE(p_force_full,false), auth.uid(), 'queued', COALESCE(p_payload,'{}'::jsonb))
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- 10) RPC para marcar resultado do sync
CREATE OR REPLACE FUNCTION legalflow.lf_mark_sync_result(
  p_job_id uuid,
  p_status legalflow.sync_status,
  p_error  text DEFAULT null
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_cnj varchar; v_provider legalflow.monitor_provider;
BEGIN
  UPDATE legalflow.sync_jobs
     SET status = p_status,
         error  = p_error,
         finished_at = now()
   WHERE id = p_job_id
   RETURNING numero_cnj, provider INTO v_cnj, v_provider;

  -- Atualizar monitoring_settings
  UPDATE legalflow.monitoring_settings
     SET last_sync_at = now(),
         last_status  = p_status,
         last_error   = p_error,
         updated_at   = now()
   WHERE numero_cnj = v_cnj;
END $$;

-- 11) Garantir que document_requirements existe
CREATE TABLE IF NOT EXISTS legalflow.document_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_stage_id uuid,
  name text NOT NULL,
  required boolean DEFAULT true,
  file_types text[] DEFAULT ARRAY['pdf'],
  max_size_mb integer DEFAULT 10,
  created_at timestamptz DEFAULT now()
);

-- Comentários para documentação
COMMENT ON VIEW public.vw_publicacoes_unificadas IS 'View unificada que combina publicações e movimentações que são publicações';
COMMENT ON FUNCTION legalflow.lf_sync_partes(varchar) IS 'Sincroniza partes do processo baseado nos dados do Advise/Escavador';
COMMENT ON FUNCTION legalflow.lf_set_monitoring IS 'Define configurações de monitoramento para um processo';
COMMENT ON FUNCTION legalflow.lf_run_sync IS 'Enfileira job de sincronização para um processo';
COMMENT ON FUNCTION legalflow.lf_mark_sync_result IS 'Marca resultado de um job de sincronização';
