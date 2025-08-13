-- =============================================
-- FLOW P-DETAIL v2 - SQL SETUP 
-- =============================================

-- 1) Função para detectar se JSON de movimentação é publicação
CREATE OR REPLACE FUNCTION public.is_publicacao(m jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT
    COALESCE(
      (m->>'tipo') ILIKE '%publica%' OR
      (m->>'categoria') ILIKE '%diário%' OR  
      (m->>'origem') ILIKE '%diário%' OR
      (m->>'fonte') ILIKE '%diário%' OR
      (m ? 'diario') OR
      (m @> '{"classe":"PUBLICACAO"}'::jsonb) OR
      (m->>'movimento') ILIKE '%publica%' OR
      (m->>'texto') ILIKE '%diário%' OR
      (m->>'resumo') ILIKE '%diário%',
      false
    )
$$;

-- 2) View unificada para Inbox - publicações + movimentações que são publicações
CREATE OR REPLACE VIEW public.vw_publicacoes_unificadas AS
SELECT
  'publicacoes'::text as source,
  p.id::bigint       as uid,
  p.numero_cnj,
  p.data_publicacao::timestamp  as occured_at,
  p.data             as payload,
  p.created_at
FROM public.publicacoes p

UNION ALL

SELECT
  'movimentacoes'::text as source,
  m.id::bigint          as uid,
  m.numero_cnj,
  COALESCE(
    m.data_movimentacao::timestamp, 
    (m.data->>'data')::timestamp,
    m.created_at
  ) as occured_at,
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
  raw jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (numero_cnj, COALESCE(cpfcnpj,''), nome, COALESCE(polo,''))
);

-- 4) Tabela de configurações de monitoramento
CREATE TABLE IF NOT EXISTS legalflow.monitoring_settings (
  id bigserial PRIMARY KEY,
  numero_cnj varchar NOT NULL UNIQUE,
  provider text DEFAULT 'advise', -- 'advise' | 'escavador'
  premium_on boolean DEFAULT false,
  active boolean DEFAULT true,
  last_sync timestamptz,
  sync_frequency interval DEFAULT '1 day',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5) RPC para sincronizar partes (lendo processos.data do Advise/Escavador)
CREATE OR REPLACE FUNCTION legalflow.lf_sync_partes(p_cnj varchar)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, legalflow
AS $$
DECLARE
  v_data jsonb;
  v_count int := 0;
  f jsonb; 
  e jsonb; 
  adv jsonb;
  nome text; 
  doc text; 
  polo text; 
  tipo text;
  papel text;
BEGIN
  SELECT data INTO v_data FROM public.processos WHERE numero_cnj = p_cnj;
  IF v_data IS NULL THEN RETURN 0; END IF;

  -- Processar envolvidos de cada fonte
  FOR f IN SELECT jsonb_array_elements(COALESCE(v_data->'fontes','[]'::jsonb))
  LOOP
    FOR e IN SELECT jsonb_array_elements(COALESCE(f->'envolvidos','[]'::jsonb))
    LOOP
      nome := e->>'nome';
      doc  := COALESCE(e->>'cpf', e->>'cnpj', e->>'cpfcnpj');
      polo := UPPER(COALESCE(e->>'polo', 'OUTROS'));
      tipo := e->>'tipo';
      papel := e->>'papel';
      
      INSERT INTO legalflow.partes_processo(numero_cnj, nome, cpfcnpj, polo, tipo, papel, raw)
      VALUES (p_cnj, nome, doc, polo, tipo, papel, e)
      ON CONFLICT (numero_cnj, COALESCE(cpfcnpj,''), nome, COALESCE(polo,'')) DO NOTHING;
      v_count := v_count + 1;

      -- Advogados associados (se houver)
      FOR adv IN SELECT jsonb_array_elements(COALESCE(e->'advogados','[]'::jsonb))
      LOOP
        INSERT INTO legalflow.partes_processo(numero_cnj, nome, cpfcnpj, polo, tipo, papel, raw)
        VALUES (
          p_cnj,
          adv->>'nome',
          COALESCE(adv->>'cpf', adv->>'oab'),
          'ADVOGADO',
          'Advogado',
          adv->>'papel',
          adv
        )
        ON CONFLICT (numero_cnj, COALESCE(cpfcnpj,''), nome, COALESCE(polo,'')) DO NOTHING;
        v_count := v_count + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Processar capa se disponível
  IF v_data ? 'capa' THEN
    -- Processar partes da capa se existirem
    FOR e IN SELECT jsonb_array_elements(COALESCE(v_data->'capa'->'partes','[]'::jsonb))
    LOOP
      nome := e->>'nome';
      doc  := COALESCE(e->>'cpf', e->>'cnpj', e->>'cpfcnpj');
      polo := UPPER(COALESCE(e->>'polo', 'OUTROS'));
      tipo := e->>'tipo';
      papel := e->>'papel';
      
      INSERT INTO legalflow.partes_processo(numero_cnj, nome, cpfcnpj, polo, tipo, papel, raw)
      VALUES (p_cnj, nome, doc, polo, tipo, papel, e)
      ON CONFLICT (numero_cnj, COALESCE(cpfcnpj,''), nome, COALESCE(polo,'')) DO NOTHING;
      v_count := v_count + 1;
    END LOOP;
  END IF;

  RETURN v_count;
END $$;

-- 6) Atualizar timestamp na alteração
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_partes_processo_updated_at ON legalflow.partes_processo;
CREATE TRIGGER update_partes_processo_updated_at 
  BEFORE UPDATE ON legalflow.partes_processo 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monitoring_settings_updated_at ON legalflow.monitoring_settings;
CREATE TRIGGER update_monitoring_settings_updated_at 
  BEFORE UPDATE ON legalflow.monitoring_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7) Índices para performance
CREATE INDEX IF NOT EXISTS idx_partes_processo_cnj ON legalflow.partes_processo(numero_cnj);
CREATE INDEX IF NOT EXISTS idx_partes_processo_polo ON legalflow.partes_processo(polo);
CREATE INDEX IF NOT EXISTS idx_partes_processo_cpfcnpj ON legalflow.partes_processo(cpfcnpj) WHERE cpfcnpj IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_monitoring_settings_cnj ON legalflow.monitoring_settings(numero_cnj);
CREATE INDEX IF NOT EXISTS idx_monitoring_settings_active ON legalflow.monitoring_settings(active) WHERE active = true;

-- 8) View para timeline unificada (substitui vw_timeline_processo)
CREATE OR REPLACE VIEW public.vw_timeline_processo AS
SELECT 
  'movimentacao'::text as tipo,
  m.numero_cnj,
  COALESCE(m.data_movimentacao::timestamp, (m.data->>'data')::timestamp, m.created_at) as data,
  COALESCE(m.data->>'texto', m.data->>'resumo', 'Movimentação') as conteudo,
  m.id::text as source_id,
  m.data as metadata
FROM public.movimentacoes m

UNION ALL

SELECT
  'publicacao'::text as tipo,
  p.numero_cnj,
  COALESCE(p.data_publicacao::timestamp, p.created_at) as data,
  COALESCE(p.data->>'resumo', p.data->>'texto', 'Publicação') as conteudo,
  p.id::text as source_id,
  p.data as metadata
FROM public.publicacoes p

ORDER BY data DESC;

-- Grant permissions
GRANT USAGE ON SCHEMA legalflow TO postgres, anon, authenticated;
GRANT ALL ON legalflow.partes_processo TO postgres, anon, authenticated;
GRANT ALL ON legalflow.monitoring_settings TO postgres, anon, authenticated;
GRANT EXECUTE ON FUNCTION legalflow.lf_sync_partes(varchar) TO postgres, anon, authenticated;
GRANT SELECT ON public.vw_publicacoes_unificadas TO postgres, anon, authenticated;
GRANT SELECT ON public.vw_timeline_processo TO postgres, anon, authenticated;
