-- ===================================
-- PHASE 3 - JOURNEY PATCHES
-- ===================================

-- Ensure journey_instances has required columns
DO $$ 
BEGIN
    -- Add next_action column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'legalflow' 
                   AND table_name = 'journey_instances' 
                   AND column_name = 'next_action') THEN
        ALTER TABLE legalflow.journey_instances ADD COLUMN next_action jsonb;
    END IF;

    -- Add progress_pct column if not exists  
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'legalflow' 
                   AND table_name = 'journey_instances' 
                   AND column_name = 'progress_pct') THEN
        ALTER TABLE legalflow.journey_instances ADD COLUMN progress_pct numeric(5,2) DEFAULT 0;
    END IF;
END $$;

-- Create vw_process_journey view
CREATE OR REPLACE VIEW legalflow.vw_process_journey AS
SELECT 
    ji.id,
    ji.template_id,
    ji.cliente_cpfcnpj,
    ji.processo_numero_cnj AS numero_cnj,
    ji.owner_oab,
    ji.start_date,
    ji.status,
    ji.progress_pct,
    ji.next_action,
    ji.created_at,
    jt.name AS template_name,
    jt.niche AS template_niche,
    jt.eta_days,
    jt.tags AS template_tags,
    c.nome AS cliente_nome,
    p.id AS processo_id,
    p.numero AS processo_numero,
    p.vara,
    p.tribunal,
    adv.nome AS owner_nome
FROM legalflow.journey_instances ji
LEFT JOIN legalflow.journey_templates jt ON jt.id = ji.template_id
LEFT JOIN public.clientes c ON c.cpfcnpj = ji.cliente_cpfcnpj
LEFT JOIN public.processos p ON p.numero_cnj = ji.processo_numero_cnj
LEFT JOIN public.advogados adv ON adv.oab = ji.owner_oab;

-- Function to compute next action based on current stage instances
CREATE OR REPLACE FUNCTION legalflow.compute_next_action(p_instance_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_next_stage record;
    v_action jsonb;
BEGIN
    -- Find the next pending stage with earliest due date
    SELECT 
        si.id,
        si.template_stage_id,
        si.status,
        si.sla_at AS due_at,
        jts.title,
        jts.type_id,
        st.code AS stage_type_code,
        st.label AS stage_type_label
    INTO v_next_stage
    FROM legalflow.stage_instances si
    JOIN legalflow.journey_template_stages jts ON jts.id = si.template_stage_id
    LEFT JOIN legalflow.stage_types st ON st.id = jts.type_id
    WHERE si.instance_id = p_instance_id
      AND si.status IN ('pending', 'in_progress')
      AND si.completed_at IS NULL
    ORDER BY COALESCE(si.sla_at, '2099-12-31'::timestamp), jts.position
    LIMIT 1;

    IF v_next_stage.id IS NULL THEN
        -- No pending stages, journey might be complete
        RETURN jsonb_build_object(
            'type', 'completed',
            'title', 'Jornada Concluída',
            'description', 'Todas as etapas foram concluídas.',
            'cta', 'Ver Resumo'
        );
    END IF;

    -- Build action based on stage type
    CASE v_next_stage.stage_type_code
        WHEN 'lesson' THEN
            v_action := jsonb_build_object(
                'type', 'lesson',
                'stage_id', v_next_stage.id,
                'title', 'Assistir: ' || v_next_stage.title,
                'description', 'Próxima aula disponível para assistir.',
                'cta', 'Assistir Agora',
                'due_at', v_next_stage.due_at
            );
        WHEN 'form' THEN
            v_action := jsonb_build_object(
                'type', 'form',
                'stage_id', v_next_stage.id,
                'title', 'Responder: ' || v_next_stage.title,
                'description', 'Formulário aguardando preenchimento.',
                'cta', 'Responder',
                'due_at', v_next_stage.due_at
            );
        WHEN 'upload' THEN
            v_action := jsonb_build_object(
                'type', 'upload',
                'stage_id', v_next_stage.id,
                'title', 'Enviar: ' || v_next_stage.title,
                'description', 'Documentos necessários para prosseguir.',
                'cta', 'Enviar Documentos',
                'due_at', v_next_stage.due_at
            );
        WHEN 'meeting' THEN
            v_action := jsonb_build_object(
                'type', 'meeting',
                'stage_id', v_next_stage.id,
                'title', 'Agendar: ' || v_next_stage.title,
                'description', 'Reunião pendente de agendamento.',
                'cta', 'Agendar',
                'due_at', v_next_stage.due_at
            );
        WHEN 'gate' THEN
            v_action := jsonb_build_object(
                'type', 'gate',
                'stage_id', v_next_stage.id,
                'title', 'Revisar: ' || v_next_stage.title,
                'description', 'Aguardando revisão e aprovação.',
                'cta', 'Revisar',
                'due_at', v_next_stage.due_at
            );
        ELSE
            v_action := jsonb_build_object(
                'type', 'task',
                'stage_id', v_next_stage.id,
                'title', v_next_stage.title,
                'description', 'Próxima etapa da jornada.',
                'cta', 'Executar',
                'due_at', v_next_stage.due_at
            );
    END CASE;

    RETURN v_action;
END $$;

-- Function to refresh next action and progress for a journey instance
CREATE OR REPLACE FUNCTION legalflow.refresh_next_action(p_instance_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_stages integer;
    v_completed_stages integer;
    v_progress numeric(5,2);
    v_next_action jsonb;
BEGIN
    -- Calculate progress
    SELECT COUNT(*) INTO v_total_stages
    FROM legalflow.stage_instances
    WHERE instance_id = p_instance_id;

    SELECT COUNT(*) INTO v_completed_stages
    FROM legalflow.stage_instances
    WHERE instance_id = p_instance_id
      AND status = 'completed'
      AND completed_at IS NOT NULL;

    v_progress := CASE 
        WHEN v_total_stages = 0 THEN 0
        ELSE ROUND((v_completed_stages::numeric / v_total_stages::numeric) * 100, 2)
    END;

    -- Compute next action
    v_next_action := legalflow.compute_next_action(p_instance_id);

    -- Update the journey instance
    UPDATE legalflow.journey_instances
    SET progress_pct = v_progress,
        next_action = v_next_action
    WHERE id = p_instance_id;
END $$;

-- Trigger function for stage_instances changes
CREATE OR REPLACE FUNCTION legalflow.trg_stage_instance_changed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Refresh next action when stage status changes
    PERFORM legalflow.refresh_next_action(COALESCE(NEW.instance_id, OLD.instance_id));
    RETURN COALESCE(NEW, OLD);
END $$;

-- Create triggers
DROP TRIGGER IF EXISTS t_stage_instance_changed ON legalflow.stage_instances;
CREATE TRIGGER t_stage_instance_changed
    AFTER INSERT OR UPDATE OR DELETE ON legalflow.stage_instances
    FOR EACH ROW EXECUTE FUNCTION legalflow.trg_stage_instance_changed();

-- RPC to start a journey instance  
CREATE OR REPLACE FUNCTION legalflow.start_journey_instance(
    p_template_id uuid,
    p_cpfcnpj varchar,
    p_numero_cnj varchar DEFAULT NULL,
    p_owner_oab integer DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_instance_id uuid;
    v_stage record;
    v_stage_instance_id uuid;
    v_start_date timestamp := now();
BEGIN
    -- Create journey instance
    INSERT INTO legalflow.journey_instances (
        template_id,
        cliente_cpfcnpj,
        processo_numero_cnj,
        owner_oab,
        start_date,
        status,
        progress_pct
    ) VALUES (
        p_template_id,
        p_cpfcnpj,
        p_numero_cnj,
        COALESCE(p_owner_oab, auth.uid()::integer),
        v_start_date,
        'active',
        0
    ) RETURNING id INTO v_instance_id;

    -- Create stage instances from template stages
    FOR v_stage IN 
        SELECT *
        FROM legalflow.journey_template_stages
        WHERE template_id = p_template_id
        ORDER BY position
    LOOP
        INSERT INTO legalflow.stage_instances (
            instance_id,
            template_stage_id,
            status,
            mandatory,
            sla_at
        ) VALUES (
            v_instance_id,
            v_stage.id,
            'pending',
            v_stage.mandatory,
            v_start_date + (COALESCE(v_stage.sla_hours, 24) || ' hours')::interval
        );
    END LOOP;

    -- Refresh next action
    PERFORM legalflow.refresh_next_action(v_instance_id);

    RETURN v_instance_id;
END $$;

-- Ensure document_uploads table exists
CREATE TABLE IF NOT EXISTS legalflow.document_uploads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_instance_id uuid REFERENCES legalflow.stage_instances(id) ON DELETE CASCADE,
    document_requirement_id uuid REFERENCES legalflow.document_requirements(id),
    filename text NOT NULL,
    file_size bigint,
    file_type text,
    storage_path text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    uploaded_by uuid,
    uploaded_at timestamptz DEFAULT now(),
    reviewed_by uuid,
    reviewed_at timestamptz,
    review_notes text
);

-- Ensure stage_payment_links table exists for financial milestones
CREATE TABLE IF NOT EXISTS legalflow.stage_payment_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_instance_id uuid REFERENCES legalflow.stage_instances(id) ON DELETE CASCADE,
    plano_pagamento_id uuid,
    parcela_numero integer,
    trigger_on_status text DEFAULT 'completed' CHECK (trigger_on_status IN ('started', 'completed')),
    created_at timestamptz DEFAULT now()
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA legalflow TO authenticated;
GRANT SELECT ON legalflow.vw_process_journey TO authenticated;
GRANT EXECUTE ON FUNCTION legalflow.compute_next_action(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION legalflow.refresh_next_action(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION legalflow.start_journey_instance(uuid, varchar, varchar, integer) TO authenticated;
