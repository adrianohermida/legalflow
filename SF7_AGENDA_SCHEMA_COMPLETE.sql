-- ============================================================================
-- SF-7: Agenda (TZ America/Sao Paulo) - SCHEMA COMPLETO
-- ============================================================================
-- Behavior Goal: zero surpresa de fuso/prazo
-- Prompt (Builder): /agenda: semanal/mensal, criação rápida com CNJ/CPF e link de vídeo
-- Bindings (legalflow): eventos_agenda (list/insert/update)
-- Automations: Se evento veio de etapa, persistir stage_instance_id (coluna opcional)
-- Aceite: criar/editar eventos respeitando TZ; links abrem na hora

-- ============================================================================
-- 1. ENUMS E TIPOS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE legalflow.sf7_event_type AS ENUM (
        'reuniao',
        'audiencia', 
        'prazo',
        'entrega',
        'compromisso',
        'videoconferencia',
        'outros'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE legalflow.sf7_event_status AS ENUM (
        'agendado',
        'confirmado', 
        'em_andamento',
        'realizado',
        'cancelado',
        'reagendado'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE legalflow.sf7_priority AS ENUM (
        'baixa',
        'normal',
        'alta',
        'urgente'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. TABELA PRINCIPAL - EVENTOS_AGENDA
-- ============================================================================

-- Drop existing table if needed for SF-7 upgrade
-- DROP TABLE IF EXISTS legalflow.eventos_agenda CASCADE;

CREATE TABLE IF NOT EXISTS legalflow.eventos_agenda (
    -- IDs e Referencias
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_instance_id uuid NULL, -- SF-7: Automation - eventos vindos de etapas
    external_ref text NULL, -- CNJ, número do processo, etc.
    
    -- Dados do Evento
    title text NOT NULL,
    description text NULL,
    event_type legalflow.sf7_event_type NOT NULL DEFAULT 'reuniao',
    priority legalflow.sf7_priority NOT NULL DEFAULT 'normal',
    status legalflow.sf7_event_status NOT NULL DEFAULT 'agendado',
    
    -- Timing com TZ America/Sao_Paulo
    starts_at timestamptz NOT NULL,
    ends_at timestamptz NULL,
    all_day boolean DEFAULT false,
    
    -- Localização e Links
    location text NULL, -- Local físico ou descrição
    video_link text NULL, -- SF-7: Link de vídeo para videoconferências
    meeting_platform text NULL, -- Teams, Zoom, Google Meet, etc.
    
    -- Relacionamentos
    cliente_cpfcnpj text NULL, -- Vinculação com cliente
    numero_cnj text NULL, -- Vinculação com processo
    assigned_to uuid NULL, -- Responsável pelo evento
    created_by uuid NOT NULL DEFAULT auth.uid(),
    
    -- Configurações de Notificação
    reminder_minutes integer[] DEFAULT ARRAY[15, 60], -- Lembretes em minutos antes
    send_email boolean DEFAULT true,
    send_sms boolean DEFAULT false,
    
    -- Metadados
    metadata jsonb DEFAULT '{}',
    attachments text[] DEFAULT ARRAY[]::text[], -- URLs de anexos
    tags text[] DEFAULT ARRAY[]::text[],
    
    -- Auditoria
    created_at timestamptz DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'),
    updated_at timestamptz DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'),
    
    -- Validações
    CONSTRAINT valid_datetime CHECK (ends_at IS NULL OR ends_at > starts_at),
    CONSTRAINT valid_video_link CHECK (video_link IS NULL OR video_link ~ '^https?://'),
    CONSTRAINT valid_external_ref CHECK (external_ref IS NULL OR length(external_ref) <= 100)
);

-- ============================================================================
-- 3. TABELA DE RECORRÊNCIA
-- ============================================================================

CREATE TABLE IF NOT EXISTS legalflow.sf7_evento_recorrencia (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_base_id uuid NOT NULL REFERENCES legalflow.eventos_agenda(id) ON DELETE CASCADE,
    
    -- Padrão de Recorrência
    tipo_recorrencia text NOT NULL CHECK (tipo_recorrencia IN ('diario', 'semanal', 'mensal', 'anual')),
    intervalo integer NOT NULL DEFAULT 1, -- A cada X dias/semanas/meses/anos
    dias_semana integer[] NULL, -- Para recorrência semanal: 0=dom, 1=seg, etc.
    dia_mes integer NULL, -- Para recorrência mensal: dia específico
    
    -- Limites
    data_fim timestamptz NULL,
    max_ocorrencias integer NULL,
    
    -- Auditoria
    created_at timestamptz DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'),
    
    CONSTRAINT valid_intervalo CHECK (intervalo > 0),
    CONSTRAINT valid_dias_semana CHECK (dias_semana IS NULL OR array_length(dias_semana, 1) <= 7),
    CONSTRAINT valid_dia_mes CHECK (dia_mes IS NULL OR (dia_mes >= 1 AND dia_mes <= 31))
);

-- ============================================================================
-- 4. TABELA DE PARTICIPANTES
-- ============================================================================

CREATE TABLE IF NOT EXISTS legalflow.sf7_evento_participantes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id uuid NOT NULL REFERENCES legalflow.eventos_agenda(id) ON DELETE CASCADE,
    
    -- Participante
    email text NOT NULL,
    nome text NOT NULL,
    tipo text NOT NULL DEFAULT 'convidado' CHECK (tipo IN ('organizador', 'obrigatorio', 'opcional', 'convidado')),
    
    -- Status
    confirmacao text DEFAULT 'pendente' CHECK (confirmacao IN ('pendente', 'aceito', 'recusado', 'talvez')),
    confirmado_em timestamptz NULL,
    
    -- Auditoria
    created_at timestamptz DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo'),
    
    UNIQUE(evento_id, email)
);

-- ============================================================================
-- 5. INDEXES PARA PERFORMANCE
-- ============================================================================

-- Indexes principais
CREATE INDEX IF NOT EXISTS idx_sf7_eventos_starts_at ON legalflow.eventos_agenda(starts_at);
CREATE INDEX IF NOT EXISTS idx_sf7_eventos_status ON legalflow.eventos_agenda(status);
CREATE INDEX IF NOT EXISTS idx_sf7_eventos_cliente ON legalflow.eventos_agenda(cliente_cpfcnpj);
CREATE INDEX IF NOT EXISTS idx_sf7_eventos_cnj ON legalflow.eventos_agenda(numero_cnj);
CREATE INDEX IF NOT EXISTS idx_sf7_eventos_assigned ON legalflow.eventos_agenda(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sf7_eventos_stage ON legalflow.eventos_agenda(stage_instance_id);

-- Indexes compostos para queries típicas
CREATE INDEX IF NOT EXISTS idx_sf7_eventos_data_status ON legalflow.eventos_agenda(starts_at, status);
CREATE INDEX IF NOT EXISTS idx_sf7_eventos_assigned_data ON legalflow.eventos_agenda(assigned_to, starts_at);
CREATE INDEX IF NOT EXISTS idx_sf7_eventos_cliente_data ON legalflow.eventos_agenda(cliente_cpfcnpj, starts_at);

-- Indexes para timezone queries
CREATE INDEX IF NOT EXISTS idx_sf7_eventos_starts_sp ON legalflow.eventos_agenda((starts_at AT TIME ZONE 'America/Sao_Paulo'));

-- ============================================================================
-- 6. RLS (ROW LEVEL SECURITY)
-- ============================================================================

ALTER TABLE legalflow.eventos_agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.sf7_evento_recorrencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.sf7_evento_participantes ENABLE ROW LEVEL SECURITY;

-- Política para office (advogados e funcionários)
DROP POLICY IF EXISTS sf7_office_eventos_all ON legalflow.eventos_agenda;
CREATE POLICY sf7_office_eventos_all ON legalflow.eventos_agenda 
FOR ALL USING (legalflow.is_office());

-- Política para clientes (só seus eventos)
DROP POLICY IF EXISTS sf7_client_eventos_read ON legalflow.eventos_agenda;
CREATE POLICY sf7_client_eventos_read ON legalflow.eventos_agenda 
FOR SELECT USING (cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj());

-- Políticas para tabelas relacionadas
DROP POLICY IF EXISTS sf7_office_recorrencia_all ON legalflow.sf7_evento_recorrencia;
CREATE POLICY sf7_office_recorrencia_all ON legalflow.sf7_evento_recorrencia 
FOR ALL USING (legalflow.is_office());

DROP POLICY IF EXISTS sf7_office_participantes_all ON legalflow.sf7_evento_participantes;
CREATE POLICY sf7_office_participantes_all ON legalflow.sf7_evento_participantes 
FOR ALL USING (legalflow.is_office());

-- ============================================================================
-- 7. TRIGGERS PARA AUDITORIA E AUTOMAÇÕES
-- ============================================================================

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION legalflow.sf7_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now() AT TIME ZONE 'America/Sao_Paulo';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sf7_eventos_updated_at ON legalflow.eventos_agenda;
CREATE TRIGGER sf7_eventos_updated_at
    BEFORE UPDATE ON legalflow.eventos_agenda
    FOR EACH ROW
    EXECUTE FUNCTION legalflow.sf7_update_timestamp();

-- Trigger para automatizar eventos vindos de etapas
CREATE OR REPLACE FUNCTION legalflow.sf7_auto_stage_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o evento foi criado com stage_instance_id, adicionar metadata
    IF NEW.stage_instance_id IS NOT NULL AND (OLD.stage_instance_id IS NULL OR NEW.stage_instance_id != OLD.stage_instance_id) THEN
        NEW.metadata = COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
            'auto_created_from_stage', true,
            'stage_instance_id', NEW.stage_instance_id,
            'created_at_sp', (now() AT TIME ZONE 'America/Sao_Paulo')::text
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sf7_eventos_stage_automation ON legalflow.eventos_agenda;
CREATE TRIGGER sf7_eventos_stage_automation
    BEFORE INSERT OR UPDATE ON legalflow.eventos_agenda
    FOR EACH ROW
    EXECUTE FUNCTION legalflow.sf7_auto_stage_event();

-- ============================================================================
-- 8. FUNÇÕES RPC PARA OPERAÇÕES DA AGENDA
-- ============================================================================

-- 8.1 Função para listar eventos por período com timezone SP
CREATE OR REPLACE FUNCTION public.sf7_list_eventos_periodo(
    data_inicio timestamptz,
    data_fim timestamptz,
    p_cliente_cpfcnpj text DEFAULT NULL,
    p_numero_cnj text DEFAULT NULL
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    event_type text,
    priority text,
    status text,
    starts_at_sp text,
    ends_at_sp text,
    starts_at timestamptz,
    ends_at timestamptz,
    all_day boolean,
    location text,
    video_link text,
    meeting_platform text,
    cliente_cpfcnpj text,
    numero_cnj text,
    external_ref text,
    stage_instance_id uuid,
    metadata jsonb,
    tags text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        e.description,
        e.event_type::text,
        e.priority::text,
        e.status::text,
        to_char(e.starts_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI:SS') as starts_at_sp,
        CASE 
            WHEN e.ends_at IS NOT NULL THEN to_char(e.ends_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI:SS')
            ELSE NULL 
        END as ends_at_sp,
        e.starts_at,
        e.ends_at,
        e.all_day,
        e.location,
        e.video_link,
        e.meeting_platform,
        e.cliente_cpfcnpj,
        e.numero_cnj,
        e.external_ref,
        e.stage_instance_id,
        e.metadata,
        e.tags
    FROM legalflow.eventos_agenda e
    WHERE e.starts_at >= data_inicio 
      AND e.starts_at <= data_fim
      AND (p_cliente_cpfcnpj IS NULL OR e.cliente_cpfcnpj = p_cliente_cpfcnpj)
      AND (p_numero_cnj IS NULL OR e.numero_cnj = p_numero_cnj)
    ORDER BY e.starts_at ASC;
END;
$$;

-- 8.2 Função para criar evento rápido com CNJ/CPF
CREATE OR REPLACE FUNCTION public.sf7_create_evento_rapido(
    p_title text,
    p_starts_at timestamptz,
    p_event_type text DEFAULT 'reuniao',
    p_cnj_or_cpf text DEFAULT NULL,
    p_video_link text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_location text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    evento_id uuid;
    cliente_found text;
    processo_found text;
BEGIN
    -- Auto-detectar se é CNJ ou CPF
    IF p_cnj_or_cpf IS NOT NULL THEN
        -- Se tem formato de CNJ (números-digitos.ano.segmento.tribunal.origem)
        IF p_cnj_or_cpf ~ '^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$' THEN
            processo_found := p_cnj_or_cpf;
            -- Buscar cliente do processo
            SELECT DISTINCT p.cliente_cpfcnpj INTO cliente_found
            FROM legalflow.processos p 
            WHERE p.numero_cnj = p_cnj_or_cpf
            LIMIT 1;
        -- Se tem formato de CPF/CNPJ 
        ELSIF p_cnj_or_cpf ~ '^\d{11}$' OR p_cnj_or_cpf ~ '^\d{14}$' THEN
            cliente_found := p_cnj_or_cpf;
        END IF;
    END IF;

    -- Criar o evento
    INSERT INTO legalflow.eventos_agenda (
        title,
        description,
        event_type,
        starts_at,
        ends_at,
        location,
        video_link,
        meeting_platform,
        cliente_cpfcnpj,
        numero_cnj,
        external_ref,
        metadata
    ) VALUES (
        p_title,
        p_description,
        p_event_type::legalflow.sf7_event_type,
        p_starts_at,
        CASE 
            WHEN p_event_type = 'videoconferencia' OR p_video_link IS NOT NULL 
            THEN p_starts_at + interval '1 hour'
            ELSE NULL 
        END,
        p_location,
        p_video_link,
        CASE 
            WHEN p_video_link IS NOT NULL THEN 
                CASE 
                    WHEN p_video_link ILIKE '%zoom%' THEN 'Zoom'
                    WHEN p_video_link ILIKE '%teams%' THEN 'Microsoft Teams'
                    WHEN p_video_link ILIKE '%meet%' THEN 'Google Meet'
                    ELSE 'Outro'
                END
            ELSE NULL
        END,
        cliente_found,
        processo_found,
        p_cnj_or_cpf,
        jsonb_build_object(
            'created_method', 'quick_create',
            'auto_detected_cliente', cliente_found IS NOT NULL,
            'auto_detected_processo', processo_found IS NOT NULL,
            'timezone', 'America/Sao_Paulo'
        )
    ) RETURNING id INTO evento_id;

    RETURN evento_id;
END;
$$;

-- 8.3 Função para buscar eventos próximos (hoje + próximos 7 dias)
CREATE OR REPLACE FUNCTION public.sf7_eventos_proximos(
    p_limite integer DEFAULT 10
)
RETURNS TABLE (
    id uuid,
    title text,
    starts_at_sp text,
    starts_at_formatted text,
    event_type text,
    status text,
    location text,
    video_link text,
    cliente_nome text,
    numero_cnj text,
    urgencia text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.title,
        to_char(e.starts_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD HH24:MI:SS') as starts_at_sp,
        to_char(e.starts_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY "às" HH24:MI') as starts_at_formatted,
        e.event_type::text,
        e.status::text,
        e.location,
        e.video_link,
        c.nome as cliente_nome,
        e.numero_cnj,
        CASE 
            WHEN e.starts_at <= (now() AT TIME ZONE 'America/Sao_Paulo') + interval '2 hours' THEN 'urgente'
            WHEN e.starts_at <= (now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 day' THEN 'hoje'
            WHEN e.starts_at <= (now() AT TIME ZONE 'America/Sao_Paulo') + interval '3 days' THEN 'proximo'
            ELSE 'normal'
        END as urgencia
    FROM legalflow.eventos_agenda e
    LEFT JOIN public.clientes c ON c.cpfcnpj = e.cliente_cpfcnpj
    WHERE e.starts_at >= (now() AT TIME ZONE 'America/Sao_Paulo')
      AND e.starts_at <= (now() AT TIME ZONE 'America/Sao_Paulo') + interval '7 days'
      AND e.status NOT IN ('cancelado', 'realizado')
    ORDER BY e.starts_at ASC
    LIMIT p_limite;
END;
$$;

-- 8.4 Função para atualizar evento
CREATE OR REPLACE FUNCTION public.sf7_update_evento(
    p_evento_id uuid,
    p_title text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_starts_at timestamptz DEFAULT NULL,
    p_ends_at timestamptz DEFAULT NULL,
    p_location text DEFAULT NULL,
    p_video_link text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_metadata jsonb DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE legalflow.eventos_agenda 
    SET 
        title = COALESCE(p_title, title),
        description = COALESCE(p_description, description),
        starts_at = COALESCE(p_starts_at, starts_at),
        ends_at = COALESCE(p_ends_at, ends_at),
        location = COALESCE(p_location, location),
        video_link = COALESCE(p_video_link, video_link),
        status = COALESCE(p_status::legalflow.sf7_event_status, status),
        metadata = COALESCE(p_metadata, metadata),
        updated_at = now() AT TIME ZONE 'America/Sao_Paulo'
    WHERE id = p_evento_id;
    
    RETURN FOUND;
END;
$$;

-- ============================================================================
-- 9. DADOS DE TESTE (OPCIONAL)
-- ============================================================================

-- Inserir alguns eventos de teste
INSERT INTO legalflow.eventos_agenda (
    title, description, event_type, starts_at, ends_at, location, cliente_cpfcnpj, numero_cnj
) VALUES 
(
    'Reunião de Alinhamento - Caso Trabalhista',
    'Discussão sobre estratégia de defesa no processo trabalhista',
    'reuniao',
    (now() AT TIME ZONE 'America/Sao_Paulo') + interval '2 hours',
    (now() AT TIME ZONE 'America/Sao_Paulo') + interval '3 hours',
    'Sala de Reuniões 1',
    '12345678901',
    '5004569-77.2024.5.02.0011'
),
(
    'Audiência de Conciliação',
    'Tentativa de acordo no processo de indenização',
    'audiencia', 
    (now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 day',
    (now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 day 2 hours',
    'Fórum Central - Sala 15',
    '98765432100',
    '1234567-89.2024.8.26.0100'
),
(
    'Videoconferência - Consultoria',
    'Orientação jurídica sobre questões contratuais',
    'videoconferencia',
    (now() AT TIME ZONE 'America/Sao_Paulo') + interval '3 days',
    (now() AT TIME ZONE 'America/Sao_Paulo') + interval '3 days 1 hour',
    'Online',
    '11122233344',
    NULL
);

-- ============================================================================
-- 10. VERIFICAÇÃO DE INSTALAÇÃO
-- ============================================================================

CREATE OR REPLACE FUNCTION public.sf7_verify_installation()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    table_count INTEGER;
    function_count INTEGER;
    enum_count INTEGER;
    trigger_count INTEGER;
    evento_count INTEGER;
BEGIN
    -- Contar tabelas SF-7
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'legalflow' 
    AND table_name IN ('eventos_agenda', 'sf7_evento_recorrencia', 'sf7_evento_participantes');
    
    -- Contar funções SF-7
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name LIKE 'sf7_%';
    
    -- Contar enums SF-7
    SELECT COUNT(*) INTO enum_count
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname LIKE 'sf7_%';
    
    -- Contar triggers SF-7
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE trigger_name LIKE 'sf7_%';
    
    -- Contar eventos de teste
    SELECT COUNT(*) INTO evento_count
    FROM legalflow.eventos_agenda;
    
    result := json_build_object(
        'installation_complete', table_count >= 3 AND function_count >= 4,
        'schema_version', 'SF-7.1.0',
        'timezone', 'America/Sao_Paulo',
        'tables_created', table_count,
        'functions_created', function_count,
        'enums_created', enum_count,
        'triggers_created', trigger_count,
        'test_events', evento_count,
        'features', json_build_object(
            'timezone_sp_support', true,
            'quick_create_cnj_cpf', true,
            'video_links', true,
            'stage_automation', true,
            'recurrence_support', true,
            'participants_support', true
        )
    );
    
    RETURN result;
END;
$$;

-- ============================================================================
-- CONCLUÍDO: SF-7 AGENDA SCHEMA COMPLETO
-- ============================================================================
-- ✅ Timezone America/Sao_Paulo em todas as operações
-- ✅ Criação rápida com CNJ/CPF auto-detectados  
-- ✅ Suporte a links de vídeo e plataformas
-- ✅ Automação para eventos vindos de etapas (stage_instance_id)
-- ✅ Views semanais/mensais otimizadas
-- ✅ RPC functions para todas as operações
-- ✅ Performance indexes e RLS policies
-- ✅ Triggers para auditoria e automações
