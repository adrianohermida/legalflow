-- Schema para controle de leitura do Inbox Legal
-- Permite rastrear quais publicações e movimentações foram lidas por cada usuário

-- Tabela para tracking de itens lidos no inbox
CREATE TABLE IF NOT EXISTS public.inbox_read_tracking (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    source_table TEXT NOT NULL CHECK (source_table IN ('publicacoes', 'movimentacoes')),
    source_id BIGINT NOT NULL,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    marked_as_treated BOOLEAN DEFAULT FALSE,
    treated_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint para evitar duplicatas
    UNIQUE(user_id, source_table, source_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_inbox_read_tracking_user_id ON public.inbox_read_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_read_tracking_source ON public.inbox_read_tracking(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_inbox_read_tracking_read_at ON public.inbox_read_tracking(read_at);
CREATE INDEX IF NOT EXISTS idx_inbox_read_tracking_treated ON public.inbox_read_tracking(marked_as_treated, treated_at);

-- RLS Policy para acesso por usuário
ALTER TABLE public.inbox_read_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inbox_read_tracking_policy" ON public.inbox_read_tracking;
CREATE POLICY "inbox_read_tracking_policy" ON public.inbox_read_tracking
FOR ALL USING (
    user_id = auth.uid() OR
    CASE public.get_user_type()
        WHEN 'superadmin' THEN true
        WHEN 'team' THEN true
        ELSE false
    END
);

-- Função para marcar item como lido
CREATE OR REPLACE FUNCTION public.mark_inbox_item_as_read(
    p_source_table TEXT,
    p_source_id BIGINT,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.inbox_read_tracking (user_id, source_table, source_id)
    VALUES (p_user_id, p_source_table, p_source_id)
    ON CONFLICT (user_id, source_table, source_id) 
    DO UPDATE SET read_at = NOW();
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Função para marcar item como tratado
CREATE OR REPLACE FUNCTION public.mark_inbox_item_as_treated(
    p_source_table TEXT,
    p_source_id BIGINT,
    p_notes TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.inbox_read_tracking (user_id, source_table, source_id, marked_as_treated, treated_at, notes)
    VALUES (p_user_id, p_source_table, p_source_id, TRUE, NOW(), p_notes)
    ON CONFLICT (user_id, source_table, source_id) 
    DO UPDATE SET 
        marked_as_treated = TRUE,
        treated_at = NOW(),
        notes = COALESCE(p_notes, inbox_read_tracking.notes);
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

-- Função para obter estatísticas de leitura
CREATE OR REPLACE FUNCTION public.get_inbox_read_stats(
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    table_name TEXT,
    total_items BIGINT,
    read_items BIGINT,
    unread_items BIGINT,
    treated_items BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        -- Publicações
        SELECT 
            'publicacoes'::TEXT as table_name,
            COUNT(*)::BIGINT as total,
            COUNT(rt.id)::BIGINT as read_count,
            COUNT(*) - COUNT(rt.id) as unread_count,
            COUNT(CASE WHEN rt.marked_as_treated THEN 1 END)::BIGINT as treated_count
        FROM public.publicacoes p
        LEFT JOIN public.inbox_read_tracking rt ON (
            rt.user_id = p_user_id AND 
            rt.source_table = 'publicacoes' AND 
            rt.source_id = p.id
        )
        
        UNION ALL
        
        -- Movimentações
        SELECT 
            'movimentacoes'::TEXT as table_name,
            COUNT(*)::BIGINT as total,
            COUNT(rt.id)::BIGINT as read_count,
            COUNT(*) - COUNT(rt.id) as unread_count,
            COUNT(CASE WHEN rt.marked_as_treated THEN 1 END)::BIGINT as treated_count
        FROM public.movimentacoes m
        LEFT JOIN public.inbox_read_tracking rt ON (
            rt.user_id = p_user_id AND 
            rt.source_table = 'movimentacoes' AND 
            rt.source_id = m.id
        )
    )
    SELECT 
        s.table_name,
        s.total as total_items,
        s.read_count as read_items,
        s.unread_count as unread_items,
        s.treated_count as treated_items
    FROM stats s;
END;
$$;

-- View para publicações unificadas com status de leitura
CREATE OR REPLACE VIEW public.vw_publicacoes_unificadas_with_read_status AS
SELECT
    p.*,
    CASE WHEN rt.id IS NOT NULL THEN true ELSE false END as is_read,
    CASE WHEN rt.marked_as_treated THEN true ELSE false END as is_treated,
    rt.read_at,
    rt.treated_at,
    rt.notes as read_notes
FROM public.vw_publicacoes_unificadas p
LEFT JOIN public.inbox_read_tracking rt ON (
    rt.user_id = auth.uid() AND
    rt.source_table = p.source AND
    rt.source_id = p.uid
);

-- View para movimentações com status de leitura  
CREATE OR REPLACE VIEW public.vw_movimentacoes_with_read_status AS
SELECT
    m.*,
    CASE WHEN rt.id IS NOT NULL THEN true ELSE false END as is_read,
    CASE WHEN rt.marked_as_treated THEN true ELSE false END as is_treated,
    rt.read_at,
    rt.treated_at,
    rt.notes as read_notes,
    -- Extrair informações do tribunal e tipo da estrutura JSON
    COALESCE(
        m.data->>'tipo',
        CASE WHEN public.is_publicacao(m.data) THEN 'PUBLICAÇÃO' ELSE 'ANDAMENTO' END
    ) as tipo_movimentacao,
    COALESCE(
        m.data->'fonte'->>'sigla',
        m.data->'fonte'->>'nome',
        m.data->>'tribunal',
        'N/A'
    ) as tribunal_origem,
    COALESCE(
        m.data->'fonte'->>'grau_formatado',
        m.data->'fonte'->>'grau'::TEXT,
        'N/A'
    ) as grau_instancia,
    COALESCE(
        m.data->>'conteudo',
        m.data->>'texto',
        m.data->>'resumo',
        'Sem conteúdo'
    ) as conteudo_resumo,
    COALESCE(
        m.data->>'data',
        m.data_movimentacao::TEXT,
        m.created_at::TEXT
    ) as data_evento
FROM public.movimentacoes m
LEFT JOIN public.inbox_read_tracking rt ON (
    rt.user_id = auth.uid() AND
    rt.source_table = 'movimentacoes' AND
    rt.source_id = m.id
);

-- Função para buscar processos com nome das partes (autor x réu)
CREATE OR REPLACE FUNCTION public.search_processos_with_parts(
    p_search_term TEXT DEFAULT NULL
)
RETURNS TABLE (
    numero_cnj TEXT,
    titulo_polo_ativo TEXT,
    titulo_polo_passivo TEXT,
    display_name TEXT,
    tribunal_sigla TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.numero_cnj,
        p.titulo_polo_ativo,
        p.titulo_polo_passivo,
        CONCAT(
            COALESCE(p.titulo_polo_ativo, 'Requerente'), 
            ' x ', 
            COALESCE(p.titulo_polo_passivo, 'Requerido')
        ) as display_name,
        p.tribunal_sigla,
        p.created_at
    FROM public.processos p
    WHERE 
        p_search_term IS NULL OR
        p.numero_cnj ILIKE '%' || p_search_term || '%' OR
        p.titulo_polo_ativo ILIKE '%' || p_search_term || '%' OR
        p.titulo_polo_passivo ILIKE '%' || p_search_term || '%' OR
        CONCAT(p.titulo_polo_ativo, ' x ', p.titulo_polo_passivo) ILIKE '%' || p_search_term || '%'
    ORDER BY p.created_at DESC
    LIMIT 100;
END;
$$;

-- Função para detectar CNJ automaticamente no conteúdo de movimentações
CREATE OR REPLACE FUNCTION public.extract_cnj_from_movimentacao(
    p_movimentacao_data JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    content_text TEXT;
    cnj_match TEXT;
BEGIN
    -- Concatenar todos os campos de texto disponíveis
    content_text := COALESCE(
        p_movimentacao_data->>'conteudo', ''
    ) || ' ' || COALESCE(
        p_movimentacao_data->>'texto', ''
    ) || ' ' || COALESCE(
        p_movimentacao_data->>'resumo', ''
    );
    
    -- Usar regex para encontrar padrão CNJ
    SELECT 
        (regexp_matches(content_text, '\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}', 'g'))[1]
    INTO cnj_match
    LIMIT 1;
    
    RETURN cnj_match;
END;
$$;

-- Trigger para auto-detectar CNJ em movimentações não vinculadas
CREATE OR REPLACE FUNCTION public.auto_detect_cnj_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    detected_cnj TEXT;
BEGIN
    -- Só processar se CNJ não estiver preenchido
    IF NEW.numero_cnj IS NULL OR NEW.numero_cnj = '' THEN
        detected_cnj := public.extract_cnj_from_movimentacao(NEW.data);
        
        -- Se encontrou CNJ e existe processo correspondente, vincular
        IF detected_cnj IS NOT NULL THEN
            IF EXISTS (SELECT 1 FROM public.processos WHERE numero_cnj = detected_cnj) THEN
                NEW.numero_cnj := detected_cnj;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS auto_detect_cnj_movimentacoes ON public.movimentacoes;
CREATE TRIGGER auto_detect_cnj_movimentacoes
    BEFORE INSERT OR UPDATE ON public.movimentacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_detect_cnj_trigger();

COMMENT ON TABLE public.inbox_read_tracking IS 'Controle de leitura e tratamento de itens do Inbox Legal';
COMMENT ON FUNCTION public.mark_inbox_item_as_read IS 'Marca um item do inbox como lido pelo usuário';
COMMENT ON FUNCTION public.mark_inbox_item_as_treated IS 'Marca um item do inbox como tratado pelo usuário';
COMMENT ON FUNCTION public.get_inbox_read_stats IS 'Retorna estatísticas de leitura do inbox por usuário';
COMMENT ON FUNCTION public.search_processos_with_parts IS 'Busca processos incluindo nome das partes para facilitar identificação';
COMMENT ON FUNCTION public.extract_cnj_from_movimentacao IS 'Extrai número CNJ do conteúdo de uma movimentação';
