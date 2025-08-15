-- Função para computar próxima ação de uma jornada
-- Utilizada pelo SF-5 Journey Card para atualizar automaticamente o progresso

CREATE OR REPLACE FUNCTION legalflow.compute_next_action(journey_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_stages integer;
  v_completed_stages integer;
  v_progress_pct numeric;
  v_next_stage_id uuid;
  v_next_stage_title text;
  v_next_stage_description text;
  v_next_stage_due_at timestamp with time zone;
  v_next_action jsonb;
  v_current_stage legalflow.stage_instances%ROWTYPE;
BEGIN
  -- Verificar se a jornada existe
  IF NOT EXISTS (SELECT 1 FROM legalflow.journey_instances WHERE id = journey_id) THEN
    RAISE EXCEPTION 'Jornada não encontrada: %', journey_id;
  END IF;

  -- Contar total de etapas
  SELECT COUNT(*) INTO v_total_stages
  FROM legalflow.stage_instances si
  WHERE si.journey_instance_id = journey_id;

  -- Contar etapas concluídas
  SELECT COUNT(*) INTO v_completed_stages
  FROM legalflow.stage_instances si
  WHERE si.journey_instance_id = journey_id
    AND si.status = 'completed';

  -- Calcular progresso percentual
  v_progress_pct := CASE 
    WHEN v_total_stages > 0 THEN (v_completed_stages::numeric / v_total_stages::numeric) * 100
    ELSE 0
  END;

  -- Buscar próxima etapa pendente (ordenada por order_index)
  SELECT si.*, jts.title, jts.sla_days
  INTO v_current_stage, v_next_stage_title, v_next_stage_due_at
  FROM legalflow.stage_instances si
  JOIN legalflow.journey_template_stages jts ON si.template_stage_id = jts.id
  WHERE si.journey_instance_id = journey_id
    AND si.status IN ('pending', 'in_progress')
  ORDER BY jts.order_index ASC
  LIMIT 1;

  -- Determinar próxima ação
  IF v_current_stage.id IS NOT NULL THEN
    -- Calcular due_at baseado no SLA se disponível
    IF v_next_stage_due_at IS NULL AND v_current_stage.sla_days IS NOT NULL THEN
      v_next_stage_due_at := COALESCE(v_current_stage.started_at, NOW()) + (v_current_stage.sla_days || ' days')::interval;
    END IF;

    -- Definir próxima ação baseada no status da etapa
    IF v_current_stage.status = 'pending' THEN
      v_next_action := jsonb_build_object(
        'type', 'start_stage',
        'title', 'Iniciar: ' || v_next_stage_title,
        'description', 'Clique para iniciar esta etapa da jornada',
        'stage_id', v_current_stage.id,
        'due_at', v_next_stage_due_at,
        'priority', CASE 
          WHEN v_next_stage_due_at IS NOT NULL AND v_next_stage_due_at < NOW() + interval '1 day' THEN 'high'
          WHEN v_next_stage_due_at IS NOT NULL AND v_next_stage_due_at < NOW() + interval '3 days' THEN 'medium'
          ELSE 'low'
        END
      );
    ELSIF v_current_stage.status = 'in_progress' THEN
      v_next_action := jsonb_build_object(
        'type', 'complete_stage',
        'title', 'Concluir: ' || v_next_stage_title,
        'description', 'Marque esta etapa como concluída para prosseguir',
        'stage_id', v_current_stage.id,
        'due_at', v_next_stage_due_at,
        'priority', CASE 
          WHEN v_next_stage_due_at IS NOT NULL AND v_next_stage_due_at < NOW() THEN 'high'
          WHEN v_next_stage_due_at IS NOT NULL AND v_next_stage_due_at < NOW() + interval '2 days' THEN 'medium'
          ELSE 'low'
        END
      );
    END IF;
  ELSE
    -- Jornada concluída
    v_next_action := jsonb_build_object(
      'type', 'journey_completed',
      'title', 'Jornada Concluída!',
      'description', 'Todas as etapas foram finalizadas com sucesso',
      'priority', 'low'
    );
  END IF;

  -- Atualizar a jornada com o novo progresso e próxima ação
  UPDATE legalflow.journey_instances
  SET 
    progress_pct = v_progress_pct,
    next_action = v_next_action,
    status = CASE 
      WHEN v_progress_pct = 100 THEN 'completed'::legalflow.journey_status
      WHEN v_progress_pct > 0 THEN 'in_progress'::legalflow.journey_status
      ELSE status
    END,
    ended_at = CASE 
      WHEN v_progress_pct = 100 AND ended_at IS NULL THEN NOW()
      ELSE ended_at
    END
  WHERE id = journey_id;

  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao computar próxima ação: %', SQLERRM;
END;
$$;

-- Trigger para atualizar automaticamente quando uma etapa muda de status
CREATE OR REPLACE FUNCTION legalflow.trigger_stage_refresh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Recalcular próxima ação quando status de etapa muda
  IF TG_OP = 'UPDATE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM legalflow.compute_next_action(NEW.journey_instance_id);
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM legalflow.compute_next_action(NEW.journey_instance_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Instalar trigger
DROP TRIGGER IF EXISTS t_stage_refresh ON legalflow.stage_instances;
CREATE TRIGGER t_stage_refresh
  AFTER INSERT OR UPDATE ON legalflow.stage_instances
  FOR EACH ROW
  EXECUTE FUNCTION legalflow.trigger_stage_refresh();

-- Função auxiliar para criar nova jornada com etapas
CREATE OR REPLACE FUNCTION legalflow.create_journey_with_stages(
  p_template_id bigint,
  p_numero_cnj text,
  p_cliente_cpfcnpj text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_journey_id uuid;
  v_stage_record RECORD;
  v_stage_id uuid;
BEGIN
  -- Criar instância da jornada
  INSERT INTO legalflow.journey_instances (
    template_id,
    numero_cnj,
    cliente_cpfcnpj,
    status,
    started_at,
    progress_pct,
    next_action
  ) VALUES (
    p_template_id,
    p_numero_cnj,
    p_cliente_cpfcnpj,
    'created'::legalflow.journey_status,
    NOW(),
    0,
    jsonb_build_object(
      'type', 'journey_created',
      'title', 'Jornada Criada',
      'description', 'Jornada foi criada e está pronta para ser iniciada'
    )
  ) RETURNING id INTO v_journey_id;

  -- Criar etapas baseadas no template
  FOR v_stage_record IN 
    SELECT * FROM legalflow.journey_template_stages 
    WHERE template_id = p_template_id 
    ORDER BY order_index ASC
  LOOP
    INSERT INTO legalflow.stage_instances (
      journey_instance_id,
      template_stage_id,
      status,
      due_at
    ) VALUES (
      v_journey_id,
      v_stage_record.id,
      'pending'::legalflow.stage_status,
      CASE 
        WHEN v_stage_record.sla_days IS NOT NULL 
        THEN NOW() + (v_stage_record.sla_days || ' days')::interval
        ELSE NULL
      END
    );
  END LOOP;

  -- Computar primeira ação
  PERFORM legalflow.compute_next_action(v_journey_id);

  RETURN v_journey_id;
END;
$$;

-- Comentários para documentação
COMMENT ON FUNCTION legalflow.compute_next_action(uuid) IS 'Computa automaticamente o progresso e próxima ação de uma jornada baseado no status das etapas';
COMMENT ON FUNCTION legalflow.trigger_stage_refresh() IS 'Trigger que atualiza automaticamente a próxima ação quando o status de uma etapa muda';
COMMENT ON FUNCTION legalflow.create_journey_with_stages(bigint, text, text) IS 'Cria uma nova jornada com todas as etapas baseadas no template';

-- Dados de exemplo para testar
-- Inserir template de exemplo se não existir
INSERT INTO legalflow.journey_templates (name, area, description, active) 
VALUES ('Jornada Processual Padrão', 'Cível', 'Jornada padrão para processos cíveis', true)
ON CONFLICT DO NOTHING;

-- Inserir tipos de etapas se não existirem
INSERT INTO legalflow.stage_types (code, name, description) VALUES
('initial_review', 'Análise Inicial', 'Análise inicial do processo'),
('document_collection', 'Coleta de Documentos', 'Coleta de documentos necessários'),
('strategy_definition', 'Definição de Estratégia', 'Definição da estratégia processual'),
('petition_filing', 'Peticionamento', 'Elaboração e protocolo de petições'),
('hearing_preparation', 'Preparação de Audiência', 'Preparação para audiência'),
('case_monitoring', 'Acompanhamento', 'Acompanhamento processual contínuo')
ON CONFLICT (code) DO NOTHING;
