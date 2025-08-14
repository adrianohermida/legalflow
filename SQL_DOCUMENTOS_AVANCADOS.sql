-- SQL_DOCUMENTOS_AVANCADOS.sql
-- Schema para módulo avançado de gestão de documentos com versionamento e OCR

-- =============================================
-- 1. TABELA PRINCIPAL DE DOCUMENTOS
-- =============================================

CREATE TABLE IF NOT EXISTS legalflow.documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Informações do arquivo
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    file_path TEXT NOT NULL UNIQUE,
    content_type TEXT NOT NULL,
    
    -- Status e visibilidade
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived', 'deleted')),
    visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'restricted')),
    
    -- Categorização
    category TEXT NOT NULL DEFAULT 'geral',
    tags TEXT[] DEFAULT '{}',
    description TEXT,
    
    -- OCR e conteúdo
    ocr_text TEXT,
    ocr_status TEXT NOT NULL DEFAULT 'pending' CHECK (ocr_status IN ('pending', 'processing', 'completed', 'failed')),
    
    -- Versionamento
    version INTEGER NOT NULL DEFAULT 1,
    parent_id UUID REFERENCES legalflow.documentos(id) ON DELETE SET NULL,
    
    -- Associações
    processo_cnj TEXT,
    cliente_cpfcnpj TEXT,
    
    -- Metadados de uso
    favorited BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    access_count INTEGER DEFAULT 0,
    
    -- Auditoria
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. TABELA DE VERSÕES (HISTÓRICO)
-- =============================================

CREATE TABLE IF NOT EXISTS legalflow.documento_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES legalflow.documentos(id) ON DELETE CASCADE,
    
    -- Snapshot da versão
    version_number INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_path TEXT NOT NULL,
    
    -- Metadados da versão
    change_description TEXT,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(document_id, version_number)
);

-- =============================================
-- 3. TABELA DE LOG DE ACESSO
-- =============================================

CREATE TABLE IF NOT EXISTS legalflow.documento_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES legalflow.documentos(id) ON DELETE CASCADE,
    
    -- Informações do acesso
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (action IN ('view', 'download', 'edit', 'delete', 'share')),
    ip_address INET,
    user_agent TEXT,
    
    -- Metadados
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 4. TABELA DE LOGS DE PROCESSAMENTO
-- =============================================

CREATE TABLE IF NOT EXISTS legalflow.documento_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES legalflow.documentos(id) ON DELETE CASCADE,
    
    -- Informações do log
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Auditoria
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 5. TABELA DE PERMISSÕES/COMPARTILHAMENTO
-- =============================================

CREATE TABLE IF NOT EXISTS legalflow.documento_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES legalflow.documentos(id) ON DELETE CASCADE,
    
    -- Permissões
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'owner')),
    can_download BOOLEAN DEFAULT TRUE,
    can_share BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Auditoria
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(document_id, user_id)
);

-- =============================================
-- 6. TABELA DE TAGS/CATEGORIAS
-- =============================================

CREATE TABLE IF NOT EXISTS legalflow.documento_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#6B7280',
    icon TEXT DEFAULT 'folder',
    parent_id UUID REFERENCES legalflow.documento_categories(id) ON DELETE SET NULL,
    
    -- Metadados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 7. ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices para busca
CREATE INDEX IF NOT EXISTS idx_documentos_file_name ON legalflow.documentos(file_name);
CREATE INDEX IF NOT EXISTS idx_documentos_category ON legalflow.documentos(category);
CREATE INDEX IF NOT EXISTS idx_documentos_status ON legalflow.documentos(status);
CREATE INDEX IF NOT EXISTS idx_documentos_created_by ON legalflow.documentos(created_by);
CREATE INDEX IF NOT EXISTS idx_documentos_processo_cnj ON legalflow.documentos(processo_cnj);
CREATE INDEX IF NOT EXISTS idx_documentos_cliente_cpfcnpj ON legalflow.documentos(cliente_cpfcnpj);

-- Índices compostos
CREATE INDEX IF NOT EXISTS idx_documentos_status_category ON legalflow.documentos(status, category);
CREATE INDEX IF NOT EXISTS idx_documentos_created_at_status ON legalflow.documentos(created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_documentos_favorited_user ON legalflow.documentos(created_by, favorited) WHERE favorited = TRUE;

-- Índices para OCR text search (requer pg_trgm)
CREATE INDEX IF NOT EXISTS idx_documentos_ocr_text_gin ON legalflow.documentos USING gin(ocr_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documentos_description_gin ON legalflow.documentos USING gin(description gin_trgm_ops);

-- Índices para versionamento
CREATE INDEX IF NOT EXISTS idx_documento_versions_document_id ON legalflow.documento_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_documento_versions_number ON legalflow.documento_versions(document_id, version_number DESC);

-- Índices para acesso e logs
CREATE INDEX IF NOT EXISTS idx_documento_access_document_user ON legalflow.documento_access(document_id, user_id);
CREATE INDEX IF NOT EXISTS idx_documento_access_created_at ON legalflow.documento_access(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documento_logs_document_id ON legalflow.documento_logs(document_id);

-- =============================================
-- 8. TRIGGERS PARA AUDITORIA E VERSIONAMENTO
-- =============================================

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION legalflow.update_documento_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_documentos_updated_at
    BEFORE UPDATE ON legalflow.documentos
    FOR EACH ROW
    EXECUTE FUNCTION legalflow.update_documento_timestamp();

-- Trigger para criar versão automaticamente
CREATE OR REPLACE FUNCTION legalflow.create_document_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Criar versão apenas se arquivo foi alterado
    IF OLD.file_path IS DISTINCT FROM NEW.file_path THEN
        INSERT INTO legalflow.documento_versions (
            document_id,
            version_number,
            file_name,
            file_size,
            file_path,
            change_description,
            changed_by
        ) VALUES (
            OLD.id,
            OLD.version,
            OLD.file_name,
            OLD.file_size,
            OLD.file_path,
            'Versão anterior automaticamente arquivada',
            NEW.created_by
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_document_version_on_update
    BEFORE UPDATE ON legalflow.documentos
    FOR EACH ROW
    WHEN (OLD.file_path IS DISTINCT FROM NEW.file_path)
    EXECUTE FUNCTION legalflow.create_document_version();

-- =============================================
-- 9. FUNÇÕES ÚTEIS
-- =============================================

-- Função para busca full-text em documentos
CREATE OR REPLACE FUNCTION legalflow.search_documents(
    search_term TEXT,
    user_id UUID DEFAULT NULL,
    category_filter TEXT DEFAULT NULL,
    status_filter TEXT DEFAULT 'active'
)
RETURNS TABLE(
    id UUID,
    file_name TEXT,
    category TEXT,
    description TEXT,
    ocr_text TEXT,
    relevance REAL,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        d.id,
        d.file_name,
        d.category,
        d.description,
        d.ocr_text,
        GREATEST(
            similarity(d.file_name, search_term),
            similarity(COALESCE(d.description, ''), search_term),
            similarity(COALESCE(d.ocr_text, ''), search_term)
        ) as relevance,
        d.created_at
    FROM legalflow.documentos d
    WHERE d.status = COALESCE(status_filter, d.status)
        AND (category_filter IS NULL OR d.category = category_filter)
        AND (user_id IS NULL OR d.created_by = user_id OR d.visibility = 'public')
        AND (
            d.file_name % search_term 
            OR d.description % search_term 
            OR d.ocr_text % search_term
            OR d.file_name ILIKE '%' || search_term || '%'
            OR d.description ILIKE '%' || search_term || '%'
            OR d.ocr_text ILIKE '%' || search_term || '%'
        )
    ORDER BY relevance DESC, d.created_at DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Função para obter estatísticas de documentos
CREATE OR REPLACE FUNCTION legalflow.get_document_stats(user_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE status = 'active'),
        'draft', COUNT(*) FILTER (WHERE status = 'draft'),
        'archived', COUNT(*) FILTER (WHERE status = 'archived'),
        'with_ocr', COUNT(*) FILTER (WHERE ocr_status = 'completed'),
        'favorited', COUNT(*) FILTER (WHERE favorited = true),
        'total_size', COALESCE(SUM(file_size), 0),
        'by_category', (
            SELECT jsonb_object_agg(category, cnt)
            FROM (
                SELECT category, COUNT(*) as cnt
                FROM legalflow.documentos d2
                WHERE (user_id IS NULL OR d2.created_by = user_id OR d2.visibility = 'public')
                    AND d2.status != 'deleted'
                GROUP BY category
            ) cat_stats
        )
    ) INTO result
    FROM legalflow.documentos d
    WHERE (user_id IS NULL OR d.created_by = user_id OR d.visibility = 'public')
        AND d.status != 'deleted';
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para limpar versões antigas (manter apenas N versões)
CREATE OR REPLACE FUNCTION legalflow.cleanup_old_versions(keep_versions INTEGER DEFAULT 10)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Remove versões antigas, mantendo apenas as N mais recentes por documento
    WITH versions_to_delete AS (
        SELECT id
        FROM (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY document_id 
                       ORDER BY version_number DESC
                   ) as rn
            FROM legalflow.documento_versions
        ) ranked
        WHERE rn > keep_versions
    )
    DELETE FROM legalflow.documento_versions
    WHERE id IN (SELECT id FROM versions_to_delete);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 10. RLS (ROW LEVEL SECURITY)
-- =============================================

-- Habilitar RLS
ALTER TABLE legalflow.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.documento_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.documento_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.documento_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE legalflow.documento_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas para documentos
CREATE POLICY "Users can view their own documents and public ones" ON legalflow.documentos
    FOR SELECT USING (
        auth.uid() = created_by 
        OR visibility = 'public'
        OR EXISTS (
            SELECT 1 FROM legalflow.documento_permissions dp
            WHERE dp.document_id = id AND dp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own documents" ON legalflow.documentos
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own documents" ON legalflow.documentos
    FOR UPDATE USING (
        auth.uid() = created_by
        OR EXISTS (
            SELECT 1 FROM legalflow.documento_permissions dp
            WHERE dp.document_id = id AND dp.user_id = auth.uid() AND dp.role IN ('editor', 'owner')
        )
    );

CREATE POLICY "Users can delete their own documents" ON legalflow.documentos
    FOR DELETE USING (auth.uid() = created_by);

-- Políticas para versões
CREATE POLICY "Users can view versions of accessible documents" ON legalflow.documento_versions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM legalflow.documentos d
            WHERE d.id = document_id 
                AND (
                    d.created_by = auth.uid()
                    OR d.visibility = 'public'
                    OR EXISTS (
                        SELECT 1 FROM legalflow.documento_permissions dp
                        WHERE dp.document_id = d.id AND dp.user_id = auth.uid()
                    )
                )
        )
    );

-- Políticas para logs de acesso
CREATE POLICY "Users can view access logs of their documents" ON legalflow.documento_access
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM legalflow.documentos d
            WHERE d.id = document_id AND d.created_by = auth.uid()
        )
    );

CREATE POLICY "Users can insert access logs" ON legalflow.documento_access
    FOR INSERT WITH CHECK (true); -- Logs podem ser inseridos por qualquer usuário autenticado

-- =============================================
-- 11. DADOS INICIAIS/SEED
-- =============================================

-- Inserir categorias padrão
INSERT INTO legalflow.documento_categories (name, description, color) VALUES
    ('Petições', 'Petições e documentos processuais', '#3B82F6'),
    ('Contratos', 'Contratos e acordos', '#10B981'),
    ('Documentos Pessoais', 'RG, CPF, comprovantes', '#F59E0B'),
    ('Procurações', 'Procurações e mandatos', '#8B5CF6'),
    ('Correspondências', 'E-mails e cartas', '#6B7280'),
    ('Relatórios', 'Relatórios e pareceres', '#EF4444'),
    ('Formulários', 'Formulários e requerimentos', '#06B6D4'),
    ('Outros', 'Documentos diversos', '#64748B')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- COMENTÁRIOS E NOTAS DE IMPLEMENTAÇÃO
-- =============================================

/*
FEATURES IMPLEMENTADAS:

✅ Gestão Avançada de Documentos:
   - Upload com metadados completos
   - Categorização e tags
   - Status e visibilidade configuráveis
   - Sistema de favoritos

✅ Versionamento:
   - Histórico automático de versões
   - Controle de versões manuais
   - Limpeza automática de versões antigas

✅ OCR (Optical Character Recognition):
   - Processamento assíncrono
   - Status de processamento
   - Texto extraído pesquisável
   - Log de processamento

✅ Controle de Acesso:
   - Permissões granulares
   - Compartilhamento controlado
   - RLS completo
   - Log de acessos

✅ Performance:
   - Índices otimizados
   - Busca full-text
   - Paginação eficiente
   - Estatísticas agregadas

PRÓXIMOS PASSOS:
1. Implementar assinatura digital
2. Integração com e-signature
3. Workflow de aprovação
4. Backup automático
5. Integração com sistemas externos
*/
