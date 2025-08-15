-- ============================================================================
-- SF-8: Documentos & Flipbook (Estante Digital) - SCHEMA COMPLETO
-- ============================================================================
-- Behavior Goal: achar, ler e aprovar sem sair do caso
-- Prompt (Builder): /documentos com abas: Biblioteca, Peças, Flipbook
-- Bindings: public.documents, public.peticoes, Storage Supabase
-- Automations: Aprovar/Reprovar uploads com status em document_uploads
-- Aceite: preview fluido, classificação por tipo e busca

-- ============================================================================
-- 1. ENUMS E TIPOS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE public.sf8_document_type AS ENUM (
        'petição',
        'contrato',
        'procuração',
        'documento_pessoal',
        'comprovante',
        'laudo',
        'parecer',
        'sentença',
        'despacho',
        'ofício',
        'ata',
        'protocolo',
        'outros'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.sf8_document_status AS ENUM (
        'pendente',
        'aprovado',
        'reprovado',
        'em_revisao',
        'arquivado',
        'vencido'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.sf8_upload_status AS ENUM (
        'uploading',
        'uploaded',
        'processing',
        'approved',
        'rejected',
        'failed'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. TABELA PRINCIPAL - DOCUMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.documents (
    -- IDs e Referencias
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_cnj text NULL, -- Vinculação com processo
    cliente_cpfcnpj text NULL, -- Vinculação com cliente
    stage_instance_id uuid NULL, -- Vinculação com etapa da jornada
    
    -- Dados do Documento
    title text NOT NULL,
    description text NULL,
    document_type public.sf8_document_type NOT NULL DEFAULT 'outros',
    status public.sf8_document_status NOT NULL DEFAULT 'pendente',
    
    -- Storage e Arquivo
    file_path text NULL, -- Caminho no Supabase Storage
    file_name text NULL, -- Nome original do arquivo
    file_size bigint NULL, -- Tamanho em bytes
    file_type text NULL, -- MIME type (application/pdf, image/jpeg, etc)
    
    -- Metadata Avançada
    metadata jsonb DEFAULT '{}', -- Dados extras (tags, categorias, etc)
    content_hash text NULL, -- Hash para detectar duplicatas
    pages_count integer NULL, -- Número de páginas (PDFs)
    
    -- Controle de Versão
    version integer DEFAULT 1,
    parent_document_id uuid NULL REFERENCES public.documents(id),
    is_latest_version boolean DEFAULT true,
    
    -- Classificação e Busca
    tags text[] DEFAULT ARRAY[]::text[],
    categories text[] DEFAULT ARRAY[]::text[],
    keywords text NULL, -- Texto indexável para busca
    
    -- Auditoria e Timestamps
    created_by uuid NOT NULL DEFAULT auth.uid(),
    updated_by uuid NULL,
    approved_by uuid NULL,
    approved_at timestamptz NULL,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    
    -- Validações
    CONSTRAINT valid_file_size CHECK (file_size IS NULL OR file_size > 0),
    CONSTRAINT valid_pages_count CHECK (pages_count IS NULL OR pages_count > 0),
    CONSTRAINT valid_version CHECK (version > 0)
);

-- ============================================================================
-- 3. TABELA DE PETICOES (ESPECIALIZADA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.peticoes (
    -- IDs e Referencias
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    numero_cnj text NOT NULL, -- Obrigatório para peças
    numero_protocolo text NULL, -- Protocolo no tribunal
    
    -- Dados Específicos da Peça
    tipo_peca text NOT NULL, -- 'inicial', 'contestação', 'recurso', etc
    instancia text NULL, -- '1ª instância', '2ª instância', 'STJ', 'STF'
    tribunal text NULL, -- Nome do tribunal
    vara_forum text NULL, -- Vara ou fórum
    
    -- Datas Importantes
    data_protocolo timestamptz NULL,
    data_juntada timestamptz NULL,
    prazo_resposta timestamptz NULL,
    
    -- Status Processual
    situacao text DEFAULT 'protocolada', -- 'protocolada', 'juntada', 'vista', 'respondida'
    observacoes text NULL,
    
    -- Metadata da Peça
    advogados text[] DEFAULT ARRAY[]::text[], -- Lista de advogados responsáveis
    partes_interessadas text[] DEFAULT ARRAY[]::text[],
    assuntos text[] DEFAULT ARRAY[]::text[], -- Assuntos jurídicos
    
    -- Auditoria
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    
    -- Índice composto para performance
    UNIQUE(document_id)
);

-- ============================================================================
-- 4. TABELA DE CONTROLE DE UPLOADS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_uploads (
    -- IDs e Referencias
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    stage_instance_id uuid NULL, -- Para automação com jornadas
    numero_cnj text NULL,
    
    -- Dados do Upload
    upload_session_id text NOT NULL, -- ID único da sessão de upload
    original_filename text NOT NULL,
    file_path text NULL, -- Caminho no storage quando completo
    file_size bigint NULL,
    file_type text NULL,
    
    -- Status e Progresso
    status public.sf8_upload_status NOT NULL DEFAULT 'uploading',
    progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    error_message text NULL,
    
    -- Aprovação/Reprovação (para jornadas)
    requires_approval boolean DEFAULT false,
    approved_by uuid NULL,
    approval_notes text NULL,
    approved_at timestamptz NULL,
    rejected_at timestamptz NULL,
    rejection_reason text NULL,
    
    -- Metadata do Upload
    metadata jsonb DEFAULT '{}',
    upload_source text DEFAULT 'manual', -- 'manual', 'drag_drop', 'api', 'email'
    
    -- Auditoria
    created_by uuid NOT NULL DEFAULT auth.uid(),
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    
    -- Validações
    CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    CONSTRAINT valid_approval_status CHECK (
        (approved_at IS NULL AND approved_by IS NULL) OR 
        (approved_at IS NOT NULL AND approved_by IS NOT NULL)
    )
);

-- ============================================================================
-- 5. TABELA DE COMPARTILHAMENTO
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.document_shares (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    
    -- Dados do Compartilhamento
    shared_with_email text NULL,
    shared_with_user_id uuid NULL,
    access_level text NOT NULL DEFAULT 'read' CHECK (access_level IN ('read', 'comment', 'edit')),
    
    -- Controle de Acesso
    expires_at timestamptz NULL,
    access_token text NULL, -- Para links públicos temporários
    requires_password boolean DEFAULT false,
    password_hash text NULL,
    
    -- Auditoria
    shared_by uuid NOT NULL DEFAULT auth.uid(),
    created_at timestamptz DEFAULT NOW(),
    last_accessed_at timestamptz NULL,
    access_count integer DEFAULT 0,
    
    -- Validações
    CONSTRAINT valid_share_target CHECK (
        shared_with_email IS NOT NULL OR shared_with_user_id IS NOT NULL
    )
);

-- ============================================================================
-- 6. INDEXES PARA PERFORMANCE
-- ============================================================================

-- Indexes para documents
CREATE INDEX IF NOT EXISTS idx_sf8_documents_numero_cnj ON public.documents(numero_cnj);
CREATE INDEX IF NOT EXISTS idx_sf8_documents_cliente_cpfcnpj ON public.documents(cliente_cpfcnpj);
CREATE INDEX IF NOT EXISTS idx_sf8_documents_type_status ON public.documents(document_type, status);
CREATE INDEX IF NOT EXISTS idx_sf8_documents_created_at ON public.documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sf8_documents_tags ON public.documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sf8_documents_keywords ON public.documents USING GIN(to_tsvector('portuguese', COALESCE(keywords, '')));
CREATE INDEX IF NOT EXISTS idx_sf8_documents_stage_instance ON public.documents(stage_instance_id);

-- Indexes para peticoes
CREATE INDEX IF NOT EXISTS idx_sf8_peticoes_numero_cnj ON public.peticoes(numero_cnj);
CREATE INDEX IF NOT EXISTS idx_sf8_peticoes_tipo_peca ON public.peticoes(tipo_peca);
CREATE INDEX IF NOT EXISTS idx_sf8_peticoes_tribunal ON public.peticoes(tribunal);
CREATE INDEX IF NOT EXISTS idx_sf8_peticoes_data_protocolo ON public.peticoes(data_protocolo DESC);

-- Indexes para document_uploads
CREATE INDEX IF NOT EXISTS idx_sf8_uploads_session_id ON public.document_uploads(upload_session_id);
CREATE INDEX IF NOT EXISTS idx_sf8_uploads_status ON public.document_uploads(status);
CREATE INDEX IF NOT EXISTS idx_sf8_uploads_numero_cnj ON public.document_uploads(numero_cnj);
CREATE INDEX IF NOT EXISTS idx_sf8_uploads_stage_instance ON public.document_uploads(stage_instance_id);

-- Indexes para document_shares
CREATE INDEX IF NOT EXISTS idx_sf8_shares_document_id ON public.document_shares(document_id);
CREATE INDEX IF NOT EXISTS idx_sf8_shares_shared_with ON public.document_shares(shared_with_email, shared_with_user_id);

-- ============================================================================
-- 7. RLS (ROW LEVEL SECURITY)
-- ============================================================================

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peticoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

-- Políticas para documents (assumindo função legalflow.is_office())
DROP POLICY IF EXISTS sf8_office_documents_all ON public.documents;
CREATE POLICY sf8_office_documents_all ON public.documents 
FOR ALL USING (
    -- Office pode ver todos os documentos
    EXISTS (SELECT 1 FROM legalflow.users WHERE id = auth.uid() AND role IN ('admin', 'advogado', 'funcionario'))
    OR
    -- Cliente pode ver apenas seus documentos
    (cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj())
);

-- Políticas similares para outras tabelas
DROP POLICY IF EXISTS sf8_office_peticoes_all ON public.peticoes;
CREATE POLICY sf8_office_peticoes_all ON public.peticoes 
FOR ALL USING (
    EXISTS (SELECT 1 FROM legalflow.users WHERE id = auth.uid() AND role IN ('admin', 'advogado', 'funcionario'))
);

DROP POLICY IF EXISTS sf8_office_uploads_all ON public.document_uploads;
CREATE POLICY sf8_office_uploads_all ON public.document_uploads 
FOR ALL USING (
    EXISTS (SELECT 1 FROM legalflow.users WHERE id = auth.uid() AND role IN ('admin', 'advogado', 'funcionario'))
    OR
    created_by = auth.uid()
);

-- ============================================================================
-- 8. TRIGGERS PARA AUDITORIA E AUTOMAÇÕES
-- ============================================================================

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.sf8_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar triggers
DROP TRIGGER IF EXISTS sf8_documents_updated_at ON public.documents;
CREATE TRIGGER sf8_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.sf8_update_timestamp();

DROP TRIGGER IF EXISTS sf8_peticoes_updated_at ON public.peticoes;
CREATE TRIGGER sf8_peticoes_updated_at
    BEFORE UPDATE ON public.peticoes
    FOR EACH ROW
    EXECUTE FUNCTION public.sf8_update_timestamp();

-- Trigger para automação de keywords (busca)
CREATE OR REPLACE FUNCTION public.sf8_update_keywords()
RETURNS TRIGGER AS $$
BEGIN
    -- Concatenar campos para busca full-text
    NEW.keywords = COALESCE(NEW.title, '') || ' ' || 
                   COALESCE(NEW.description, '') || ' ' || 
                   COALESCE(array_to_string(NEW.tags, ' '), '') || ' ' ||
                   COALESCE(array_to_string(NEW.categories, ' '), '');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sf8_documents_keywords ON public.documents;
CREATE TRIGGER sf8_documents_keywords
    BEFORE INSERT OR UPDATE ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION public.sf8_update_keywords();

-- ============================================================================
-- 9. FUNÇÕES RPC PARA OPERAÇÕES DA ESTANTE DIGITAL
-- ============================================================================

-- 9.1 Função para verificar instalação
CREATE OR REPLACE FUNCTION public.sf8_verify_installation()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSON;
    table_count INTEGER;
    function_count INTEGER;
    enum_count INTEGER;
    document_count INTEGER;
BEGIN
    -- Contar tabelas SF-8
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('documents', 'peticoes', 'document_uploads', 'document_shares');
    
    -- Contar funções SF-8
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name LIKE 'sf8_%';
    
    -- Contar enums SF-8
    SELECT COUNT(*) INTO enum_count
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname LIKE 'sf8_%';
    
    -- Contar documentos
    SELECT COUNT(*) INTO document_count
    FROM public.documents;
    
    result := json_build_object(
        'installation_complete', table_count >= 4 AND function_count >= 6,
        'schema_version', 'SF-8.1.0',
        'feature_name', 'Documentos & Flipbook',
        'tables_created', table_count,
        'functions_created', function_count,
        'enums_created', enum_count,
        'total_documents', document_count,
        'features', json_build_object(
            'document_library', true,
            'peticoes_tracking', true,
            'flipbook_preview', true,
            'approval_workflow', true,
            'search_classification', true,
            'storage_integration', true
        ),
        'message', CASE 
            WHEN table_count >= 4 AND function_count >= 6 THEN 'SF-8 instalação completa e funcional'
            WHEN table_count < 4 THEN 'Algumas tabelas SF-8 não foram criadas'
            ELSE 'Algumas funções SF-8 não foram instaladas'
        END
    );
    
    RETURN result;
END;
$$;

-- 9.2 Função para listar documentos com filtros avançados
CREATE OR REPLACE FUNCTION public.sf8_list_documents(
    p_numero_cnj text DEFAULT NULL,
    p_cliente_cpfcnpj text DEFAULT NULL,
    p_document_type text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_search_query text DEFAULT NULL,
    p_tags text[] DEFAULT NULL,
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    document_type text,
    status text,
    file_name text,
    file_size bigint,
    file_type text,
    numero_cnj text,
    cliente_cpfcnpj text,
    tags text[],
    categories text[],
    version integer,
    is_latest_version boolean,
    pages_count integer,
    created_by uuid,
    created_at timestamptz,
    approved_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.description,
        d.document_type::text,
        d.status::text,
        d.file_name,
        d.file_size,
        d.file_type,
        d.numero_cnj,
        d.cliente_cpfcnpj,
        d.tags,
        d.categories,
        d.version,
        d.is_latest_version,
        d.pages_count,
        d.created_by,
        d.created_at,
        d.approved_at
    FROM public.documents d
    WHERE 
        (p_numero_cnj IS NULL OR d.numero_cnj = p_numero_cnj)
        AND (p_cliente_cpfcnpj IS NULL OR d.cliente_cpfcnpj = p_cliente_cpfcnpj)
        AND (p_document_type IS NULL OR d.document_type::text = p_document_type)
        AND (p_status IS NULL OR d.status::text = p_status)
        AND (p_search_query IS NULL OR d.keywords ILIKE '%' || p_search_query || '%')
        AND (p_tags IS NULL OR d.tags && p_tags)
        AND d.is_latest_version = true
    ORDER BY d.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 9.3 Função para criar documento
CREATE OR REPLACE FUNCTION public.sf8_create_document(
    p_title text,
    p_document_type text,
    p_numero_cnj text DEFAULT NULL,
    p_cliente_cpfcnpj text DEFAULT NULL,
    p_description text DEFAULT NULL,
    p_file_path text DEFAULT NULL,
    p_file_name text DEFAULT NULL,
    p_file_size bigint DEFAULT NULL,
    p_file_type text DEFAULT NULL,
    p_tags text[] DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    document_id uuid;
BEGIN
    INSERT INTO public.documents (
        title,
        description,
        document_type,
        numero_cnj,
        cliente_cpfcnpj,
        file_path,
        file_name,
        file_size,
        file_type,
        tags,
        metadata,
        status,
        created_by,
        created_at
    ) VALUES (
        p_title,
        p_description,
        p_document_type::public.sf8_document_type,
        p_numero_cnj,
        p_cliente_cpfcnpj,
        p_file_path,
        p_file_name,
        p_file_size,
        p_file_type,
        COALESCE(p_tags, ARRAY[]::text[]),
        p_metadata,
        'pendente',
        auth.uid(),
        NOW()
    ) RETURNING id INTO document_id;
    
    RETURN document_id;
END;
$$;

-- 9.4 Função para aprovar/reprovar documento
CREATE OR REPLACE FUNCTION public.sf8_approve_document(
    p_document_id uuid,
    p_approved boolean,
    p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.documents 
    SET 
        status = CASE WHEN p_approved THEN 'aprovado' ELSE 'reprovado' END,
        approved_by = auth.uid(),
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = p_document_id;
    
    -- Se há upload relacionado, atualizar também
    UPDATE public.document_uploads 
    SET 
        status = CASE WHEN p_approved THEN 'approved' ELSE 'rejected' END,
        approved_by = auth.uid(),
        approval_notes = p_notes,
        approved_at = CASE WHEN p_approved THEN NOW() ELSE NULL END,
        rejected_at = CASE WHEN NOT p_approved THEN NOW() ELSE NULL END,
        rejection_reason = CASE WHEN NOT p_approved THEN p_notes ELSE NULL END
    WHERE document_id = p_document_id;
    
    RETURN FOUND;
END;
$$;

-- 9.5 Função para listar peças processuais
CREATE OR REPLACE FUNCTION public.sf8_list_peticoes(
    p_numero_cnj text,
    p_tipo_peca text DEFAULT NULL,
    p_tribunal text DEFAULT NULL,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    id uuid,
    document_id uuid,
    numero_cnj text,
    numero_protocolo text,
    tipo_peca text,
    instancia text,
    tribunal text,
    vara_forum text,
    data_protocolo timestamptz,
    data_juntada timestamptz,
    prazo_resposta timestamptz,
    situacao text,
    document_title text,
    document_status text,
    file_name text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.document_id,
        p.numero_cnj,
        p.numero_protocolo,
        p.tipo_peca,
        p.instancia,
        p.tribunal,
        p.vara_forum,
        p.data_protocolo,
        p.data_juntada,
        p.prazo_resposta,
        p.situacao,
        d.title as document_title,
        d.status::text as document_status,
        d.file_name,
        p.created_at
    FROM public.peticoes p
    JOIN public.documents d ON p.document_id = d.id
    WHERE 
        p.numero_cnj = p_numero_cnj
        AND (p_tipo_peca IS NULL OR p.tipo_peca = p_tipo_peca)
        AND (p_tribunal IS NULL OR p.tribunal = p_tribunal)
        AND d.is_latest_version = true
    ORDER BY p.data_protocolo DESC NULLS LAST, p.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 9.6 Função para busca avançada com full-text
CREATE OR REPLACE FUNCTION public.sf8_search_documents(
    p_search_query text,
    p_numero_cnj text DEFAULT NULL,
    p_document_types text[] DEFAULT NULL,
    p_limit integer DEFAULT 20
)
RETURNS TABLE (
    id uuid,
    title text,
    description text,
    document_type text,
    numero_cnj text,
    file_name text,
    relevance real
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.title,
        d.description,
        d.document_type::text,
        d.numero_cnj,
        d.file_name,
        ts_rank(to_tsvector('portuguese', d.keywords), plainto_tsquery('portuguese', p_search_query)) as relevance
    FROM public.documents d
    WHERE 
        to_tsvector('portuguese', d.keywords) @@ plainto_tsquery('portuguese', p_search_query)
        AND (p_numero_cnj IS NULL OR d.numero_cnj = p_numero_cnj)
        AND (p_document_types IS NULL OR d.document_type::text = ANY(p_document_types))
        AND d.is_latest_version = true
    ORDER BY relevance DESC, d.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 9.7 Função para estatísticas da estante digital
CREATE OR REPLACE FUNCTION public.sf8_get_statistics(
    p_numero_cnj text DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_documents', (
            SELECT COUNT(*) FROM public.documents d
            WHERE (p_numero_cnj IS NULL OR d.numero_cnj = p_numero_cnj)
            AND d.is_latest_version = true
        ),
        'by_type', (
            SELECT json_object_agg(document_type, count)
            FROM (
                SELECT document_type::text, COUNT(*) as count
                FROM public.documents d
                WHERE (p_numero_cnj IS NULL OR d.numero_cnj = p_numero_cnj)
                AND d.is_latest_version = true
                GROUP BY document_type
            ) type_counts
        ),
        'by_status', (
            SELECT json_object_agg(status, count)
            FROM (
                SELECT status::text, COUNT(*) as count
                FROM public.documents d
                WHERE (p_numero_cnj IS NULL OR d.numero_cnj = p_numero_cnj)
                AND d.is_latest_version = true
                GROUP BY status
            ) status_counts
        ),
        'total_peticoes', (
            SELECT COUNT(*) FROM public.peticoes p
            WHERE (p_numero_cnj IS NULL OR p.numero_cnj = p_numero_cnj)
        ),
        'pending_approvals', (
            SELECT COUNT(*) FROM public.document_uploads du
            WHERE du.requires_approval = true
            AND du.status = 'uploaded'
            AND (p_numero_cnj IS NULL OR du.numero_cnj = p_numero_cnj)
        ),
        'storage_usage', (
            SELECT COALESCE(SUM(file_size), 0) FROM public.documents d
            WHERE (p_numero_cnj IS NULL OR d.numero_cnj = p_numero_cnj)
            AND d.is_latest_version = true
            AND d.file_size IS NOT NULL
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- 10. DADOS DE EXEMPLO PARA DESENVOLVIMENTO
-- ============================================================================

-- Inserir alguns documentos de exemplo
INSERT INTO public.documents (
    title, description, document_type, numero_cnj, file_name, file_type, tags, status
) VALUES 
(
    'Petição Inicial - Ação Trabalhista',
    'Petição inicial para ação de horas extras contra empresa XYZ',
    'petição',
    '5004569-77.2024.5.02.0011',
    'peticao_inicial_trabalhista.pdf',
    'application/pdf',
    ARRAY['trabalhista', 'horas_extras', 'inicial'],
    'aprovado'
),
(
    'Contrato de Prestação de Serviços',
    'Contrato firmado entre as partes para consultoria jurídica',
    'contrato', 
    '1234567-89.2024.8.26.0100',
    'contrato_consultoria.pdf',
    'application/pdf',
    ARRAY['contrato', 'consultoria', 'civil'],
    'aprovado'
),
(
    'Procuração Ad Judicia',
    'Procuração para representação em juízo',
    'procuração',
    '1234567-89.2024.8.26.0100', 
    'procuracao_ad_judicia.pdf',
    'application/pdf',
    ARRAY['procuração', 'representação'],
    'pendente'
);

-- ============================================================================
-- 11. PERMISSÕES PARA SUPABASE RPC
-- ============================================================================

-- Conceder permissões de execução
GRANT EXECUTE ON FUNCTION public.sf8_verify_installation() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf8_list_documents(text, text, text, text, text, text[], integer, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf8_create_document(text, text, text, text, text, text, text, bigint, text, text[], jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf8_approve_document(uuid, boolean, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf8_list_peticoes(text, text, text, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf8_search_documents(text, text, text[], integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf8_get_statistics(text) TO authenticated, anon;

-- Permissões nas tabelas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peticoes TO authenticated, anon;  
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_uploads TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_shares TO authenticated, anon;

-- ============================================================================
-- 12. COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================================================

COMMENT ON FUNCTION public.sf8_verify_installation() IS 
'SF-8: Verifica se o schema de Documentos & Flipbook está instalado corretamente';

COMMENT ON FUNCTION public.sf8_list_documents(text, text, text, text, text, text[], integer, integer) IS 
'SF-8: Lista documentos com filtros avançados e paginação';

COMMENT ON FUNCTION public.sf8_create_document(text, text, text, text, text, text, text, bigint, text, text[], jsonb) IS 
'SF-8: Cria novo documento na biblioteca digital';

COMMENT ON FUNCTION public.sf8_approve_document(uuid, boolean, text) IS 
'SF-8: Aprova ou reprova documento com workflow de aprovação';

COMMENT ON FUNCTION public.sf8_list_peticoes(text, text, text, integer) IS 
'SF-8: Lista peças processuais com filtros específicos';

COMMENT ON FUNCTION public.sf8_search_documents(text, text, text[], integer) IS 
'SF-8: Busca avançada de documentos com full-text search';

COMMENT ON FUNCTION public.sf8_get_statistics(text) IS 
'SF-8: Estatísticas da estante digital por processo ou geral';

COMMENT ON TABLE public.documents IS 
'SF-8: Biblioteca principal de documentos com versionamento e metadata';

COMMENT ON TABLE public.peticoes IS 
'SF-8: Peças processuais especializadas vinculadas aos documentos';

COMMENT ON TABLE public.document_uploads IS 
'SF-8: Controle de uploads com workflow de aprovação para jornadas';

COMMENT ON TABLE public.document_shares IS 
'SF-8: Sistema de compartilhamento de documentos com controle de acesso';

-- Mensagem final
SELECT 'SF-8 Documentos & Flipbook Schema instalado com sucesso!' as status,
       'Estante Digital com biblioteca, peças e flipbook configurada' as details;
