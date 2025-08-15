-- Script para configurar dados de teste para SF-5 Journey Card
-- Garante que o sistema tenha dados consistentes para teste

-- 1. Inserir tipos de etapas básicos se não existirem
INSERT INTO legalflow.stage_types (code, name, description) VALUES
('initial_review', 'Análise Inicial', 'Análise inicial do processo'),
('document_collection', 'Coleta de Documentos', 'Coleta de documentos necessários'),
('strategy_definition', 'Definição de Estratégia', 'Definição da estratégia processual'),
('petition_filing', 'Peticionamento', 'Elaboração e protocolo de petições'),
('hearing_preparation', 'Preparação de Audiência', 'Preparação para audiência'),
('case_monitoring', 'Acompanhamento', 'Acompanhamento processual contínuo')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2. Criar template de jornada de teste se não existir
INSERT INTO legalflow.journey_templates (id, name, area, description, active) 
VALUES (1, 'Jornada Processual Padrão', 'Cível', 'Jornada padrão para processos cíveis', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  area = EXCLUDED.area,
  description = EXCLUDED.description,
  active = EXCLUDED.active;

-- 3. Criar etapas do template se não existirem
INSERT INTO legalflow.journey_template_stages (template_id, stage_type_id, title, description, order_index, sla_days) 
SELECT 
  1,
  st.id,
  stage_data.title,
  stage_data.description,
  stage_data.order_index,
  stage_data.sla_days
FROM (
  VALUES 
    ('initial_review', 'Análise Inicial do Processo', 'Revisar documentos e avaliar mérito', 1, 2),
    ('document_collection', 'Coleta de Documentos', 'Reunir documentação necessária', 2, 5),
    ('strategy_definition', 'Definição de Estratégia', 'Definir abordagem processual', 3, 3),
    ('petition_filing', 'Elaboração de Petição', 'Redigir e protocolar petição inicial', 4, 7),
    ('hearing_preparation', 'Preparação para Audiência', 'Preparar argumentos e documentos', 5, 10),
    ('case_monitoring', 'Acompanhamento Processual', 'Monitorar andamentos e prazos', 6, NULL)
) AS stage_data(code, title, description, order_index, sla_days)
JOIN legalflow.stage_types st ON st.code = stage_data.code
WHERE NOT EXISTS (
  SELECT 1 FROM legalflow.journey_template_stages jts
  WHERE jts.template_id = 1 AND jts.stage_type_id = st.id
);

-- 4. Função para criar jornada de teste rápida
CREATE OR REPLACE FUNCTION legalflow.create_test_journey(
  p_numero_cnj text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_journey_id uuid;
  v_cnj text;
BEGIN
  -- Gerar CNJ único se não fornecido
  v_cnj := COALESCE(p_numero_cnj, '5000001-12.2024.8.26.0100-test-' || extract(epoch from now())::bigint);
  
  -- Criar jornada usando a função existente
  SELECT legalflow.create_journey_with_stages(1, v_cnj, '12345678901') INTO v_journey_id;
  
  RETURN v_journey_id;
END;
$$;

-- 5. Função para simular progressão automática de uma jornada (para testes)
CREATE OR REPLACE FUNCTION legalflow.simulate_journey_progress(
  p_journey_id uuid,
  p_steps integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stage_record RECORD;
  v_step_count integer := 0;
BEGIN
  -- Progressir através das etapas pendentes
  FOR v_stage_record IN 
    SELECT si.id, si.status
    FROM legalflow.stage_instances si
    JOIN legalflow.journey_template_stages jts ON si.template_stage_id = jts.id
    WHERE si.journey_instance_id = p_journey_id
      AND si.status IN ('pending', 'in_progress')
    ORDER BY jts.order_index ASC
    LIMIT p_steps
  LOOP
    IF v_stage_record.status = 'pending' THEN
      -- Iniciar etapa
      UPDATE legalflow.stage_instances 
      SET 
        status = 'in_progress',
        started_at = NOW()
      WHERE id = v_stage_record.id;
      
      v_step_count := v_step_count + 1;
      
      -- Se ainda temos steps, completar também
      IF v_step_count < p_steps THEN
        UPDATE legalflow.stage_instances 
        SET 
          status = 'completed',
          completed_at = NOW()
        WHERE id = v_stage_record.id;
      END IF;
      
    ELSIF v_stage_record.status = 'in_progress' THEN
      -- Completar etapa
      UPDATE legalflow.stage_instances 
      SET 
        status = 'completed',
        completed_at = NOW()
      WHERE id = v_stage_record.id;
      
      v_step_count := v_step_count + 1;
    END IF;
    
    EXIT WHEN v_step_count >= p_steps;
  END LOOP;
  
  -- Recalcular progresso
  PERFORM legalflow.compute_next_action(p_journey_id);
  
  RETURN true;
END;
$$;

-- 6. Função para limpar jornadas de teste
CREATE OR REPLACE FUNCTION legalflow.cleanup_test_journeys()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  -- Deletar etapas de jornadas de teste
  DELETE FROM legalflow.stage_instances 
  WHERE journey_instance_id IN (
    SELECT id FROM legalflow.journey_instances 
    WHERE numero_cnj LIKE '%-test-%'
  );
  
  -- Deletar jornadas de teste
  DELETE FROM legalflow.journey_instances 
  WHERE numero_cnj LIKE '%-test-%';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Comentários
COMMENT ON FUNCTION legalflow.create_test_journey(text) IS 'Cria uma jornada de teste com CNJ único para desenvolvimento e testes';
COMMENT ON FUNCTION legalflow.simulate_journey_progress(uuid, integer) IS 'Simula progressão automática de uma jornada para testes';
COMMENT ON FUNCTION legalflow.cleanup_test_journeys() IS 'Remove todas as jornadas de teste do sistema';

-- Log de finalização
DO $$
BEGIN
  RAISE NOTICE 'SF-5 Test Data Setup completado com sucesso!';
  RAISE NOTICE 'Funções disponíveis:';
  RAISE NOTICE '  - legalflow.create_test_journey(cnj) - Cria jornada de teste';
  RAISE NOTICE '  - legalflow.simulate_journey_progress(journey_id, steps) - Simula progresso';
  RAISE NOTICE '  - legalflow.cleanup_test_journeys() - Limpa dados de teste';
END $$;
