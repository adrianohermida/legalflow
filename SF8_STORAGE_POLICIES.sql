-- ============================================================================
-- SF-8: Storage Policies para Documentos & Flipbook
-- ============================================================================
-- Este arquivo configura os buckets e políticas de storage do Supabase
-- para o sistema de documentos organizados por processo

-- ============================================================================
-- 1. CRIAÇÃO DOS BUCKETS
-- ============================================================================

-- Bucket principal para documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents', 
    false, -- Privado por padrão
    52428800, -- 50MB limite por arquivo
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'text/csv'
    ]
) ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket para peças processuais (PDFs principalmente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'peticoes',
    'peticoes',
    false, -- Privado
    104857600, -- 100MB para PDFs grandes
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
) ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket para previews e thumbnails (público para performance)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'document-previews',
    'document-previews',
    true, -- Público para previews
    5242880, -- 5MB para previews
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp'
    ]
) ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- 2. POLÍTICAS DE ACESSO PARA BUCKET DOCUMENTS
-- ============================================================================

-- Política para visualizar documentos
DROP POLICY IF EXISTS "sf8_documents_select" ON storage.objects;
CREATE POLICY "sf8_documents_select" ON storage.objects
FOR SELECT USING (
    bucket_id = 'documents' AND
    (
        -- Office pode ver tudo
        EXISTS (
            SELECT 1 FROM legalflow.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'advogado', 'funcionario')
        )
        OR
        -- Cliente pode ver apenas documentos do seu processo
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.file_path = name
            AND d.cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj()
        )
        OR
        -- Usuário pode ver documentos que ele próprio criou
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.file_path = name
            AND d.created_by = auth.uid()
        )
    )
);

-- Política para upload de documentos
DROP POLICY IF EXISTS "sf8_documents_insert" ON storage.objects;
CREATE POLICY "sf8_documents_insert" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND
    (
        -- Office pode fazer upload
        EXISTS (
            SELECT 1 FROM legalflow.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'advogado', 'funcionario')
        )
        OR
        -- Cliente pode fazer upload em processos onde está envolvido
        EXISTS (
            SELECT 1 FROM legalflow.processos p
            WHERE p.cliente_cpfcnpj = legalflow.current_cliente_cpfcnpj()
            -- Assumindo que o path contém o CNJ: 'cnj/1234567-89.2024.8.26.0100/arquivo.pdf'
            AND name LIKE '%' || p.numero_cnj || '%'
        )
    )
);

-- Política para atualizar documentos
DROP POLICY IF EXISTS "sf8_documents_update" ON storage.objects;
CREATE POLICY "sf8_documents_update" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'documents' AND
    (
        -- Office pode atualizar tudo
        EXISTS (
            SELECT 1 FROM legalflow.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'advogado', 'funcionario')
        )
        OR
        -- Usuário pode atualizar documentos que criou
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.file_path = name
            AND d.created_by = auth.uid()
        )
    )
);

-- Política para deletar documentos
DROP POLICY IF EXISTS "sf8_documents_delete" ON storage.objects;
CREATE POLICY "sf8_documents_delete" ON storage.objects
FOR DELETE USING (
    bucket_id = 'documents' AND
    (
        -- Apenas office pode deletar
        EXISTS (
            SELECT 1 FROM legalflow.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'advogado')
        )
    )
);

-- ============================================================================
-- 3. POLÍTICAS PARA BUCKET PETICOES
-- ============================================================================

-- Política para visualizar peças
DROP POLICY IF EXISTS "sf8_peticoes_select" ON storage.objects;
CREATE POLICY "sf8_peticoes_select" ON storage.objects
FOR SELECT USING (
    bucket_id = 'peticoes' AND
    -- Apenas office pode ver peças (documentos mais sensíveis)
    EXISTS (
        SELECT 1 FROM legalflow.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'advogado', 'funcionario')
    )
);

-- Política para upload de peças
DROP POLICY IF EXISTS "sf8_peticoes_insert" ON storage.objects;
CREATE POLICY "sf8_peticoes_insert" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'peticoes' AND
    -- Apenas office pode fazer upload de peças
    EXISTS (
        SELECT 1 FROM legalflow.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'advogado', 'funcionario')
    )
);

-- Política para atualizar peças
DROP POLICY IF EXISTS "sf8_peticoes_update" ON storage.objects;
CREATE POLICY "sf8_peticoes_update" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'peticoes' AND
    EXISTS (
        SELECT 1 FROM legalflow.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'advogado', 'funcionario')
    )
);

-- Política para deletar peças
DROP POLICY IF EXISTS "sf8_peticoes_delete" ON storage.objects;
CREATE POLICY "sf8_peticoes_delete" ON storage.objects
FOR DELETE USING (
    bucket_id = 'peticoes' AND
    EXISTS (
        SELECT 1 FROM legalflow.users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'advogado')
    )
);

-- ============================================================================
-- 4. POLÍTICAS PARA BUCKET DOCUMENT-PREVIEWS (PÚBLICO)
-- ============================================================================

-- Como o bucket é público, apenas política para upload
DROP POLICY IF EXISTS "sf8_previews_insert" ON storage.objects;
CREATE POLICY "sf8_previews_insert" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'document-previews' AND
    -- Qualquer usuário autenticado pode gerar previews
    auth.uid() IS NOT NULL
);

-- Política para deletar previews
DROP POLICY IF EXISTS "sf8_previews_delete" ON storage.objects;
CREATE POLICY "sf8_previews_delete" ON storage.objects
FOR DELETE USING (
    bucket_id = 'document-previews' AND
    (
        -- Office pode deletar qualquer preview
        EXISTS (
            SELECT 1 FROM legalflow.users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'advogado', 'funcionario')
        )
        OR
        -- Usuário pode deletar previews que criou (baseado no nome do arquivo)
        name LIKE auth.uid()::text || '_%'
    )
);

-- ============================================================================
-- 5. FUNÇÕES HELPER PARA STORAGE
-- ============================================================================

-- Função para gerar path organizado por processo
CREATE OR REPLACE FUNCTION public.sf8_generate_file_path(
    p_numero_cnj text,
    p_filename text,
    p_document_type text DEFAULT 'document'
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_clean_cnj text;
    v_clean_filename text;
    v_timestamp text;
    v_uuid text;
BEGIN
    -- Limpar CNJ removendo caracteres especiais
    v_clean_cnj := regexp_replace(p_numero_cnj, '[^0-9]', '', 'g');
    
    -- Limpar filename removendo caracteres especiais e espaços
    v_clean_filename := regexp_replace(p_filename, '[^a-zA-Z0-9._-]', '_', 'g');
    
    -- Gerar timestamp para evitar conflitos
    v_timestamp := to_char(NOW(), 'YYYYMMDD_HH24MISS');
    
    -- Gerar UUID curto
    v_uuid := substring(gen_random_uuid()::text, 1, 8);
    
    -- Estrutura: cnj/YYYYMMDD_HHMMSS_uuid_filename
    RETURN format(
        'cnj/%s/%s_%s_%s',
        v_clean_cnj,
        v_timestamp,
        v_uuid,
        v_clean_filename
    );
END;
$$;

-- Função para gerar URL de preview público
CREATE OR REPLACE FUNCTION public.sf8_generate_preview_url(
    p_document_id uuid,
    p_page_number integer DEFAULT 1
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_preview_path text;
    v_base_url text;
BEGIN
    -- Gerar path do preview
    v_preview_path := format('previews/%s_page_%s.webp', p_document_id, p_page_number);
    
    -- Buscar URL base do Supabase (seria configurável)
    v_base_url := current_setting('app.supabase_url', true);
    
    IF v_base_url IS NULL THEN
        v_base_url := 'https://your-project.supabase.co';
    END IF;
    
    RETURN format('%s/storage/v1/object/public/document-previews/%s', v_base_url, v_preview_path);
END;
$$;

-- Função para upload de documento com path automático
CREATE OR REPLACE FUNCTION public.sf8_prepare_document_upload(
    p_numero_cnj text,
    p_filename text,
    p_title text,
    p_document_type text,
    p_bucket text DEFAULT 'documents'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_document_id uuid;
    v_file_path text;
    v_upload_session_id text;
    v_result JSON;
BEGIN
    -- Gerar IDs únicos
    v_document_id := gen_random_uuid();
    v_upload_session_id := gen_random_uuid()::text;
    
    -- Gerar path organizado
    v_file_path := public.sf8_generate_file_path(p_numero_cnj, p_filename, p_document_type);
    
    -- Criar registro de documento pendente
    INSERT INTO public.documents (
        id,
        title,
        document_type,
        numero_cnj,
        file_path,
        file_name,
        status,
        created_by
    ) VALUES (
        v_document_id,
        p_title,
        p_document_type::public.sf8_document_type,
        p_numero_cnj,
        v_file_path,
        p_filename,
        'pendente',
        auth.uid()
    );
    
    -- Criar registro de upload
    INSERT INTO public.document_uploads (
        document_id,
        upload_session_id,
        original_filename,
        file_path,
        status,
        numero_cnj,
        created_by
    ) VALUES (
        v_document_id,
        v_upload_session_id,
        p_filename,
        v_file_path,
        'uploading',
        p_numero_cnj,
        auth.uid()
    );
    
    v_result := json_build_object(
        'success', true,
        'document_id', v_document_id,
        'upload_session_id', v_upload_session_id,
        'file_path', v_file_path,
        'bucket', p_bucket,
        'full_storage_path', format('%s/%s', p_bucket, v_file_path)
    );
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- 6. PERMISSÕES PARA FUNÇÕES HELPER
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.sf8_generate_file_path(text, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf8_generate_preview_url(uuid, integer) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.sf8_prepare_document_upload(text, text, text, text, text) TO authenticated, anon;

-- ============================================================================
-- 7. COMENTÁRIOS
-- ============================================================================

COMMENT ON FUNCTION public.sf8_generate_file_path(text, text, text) IS 
'SF-8: Gera path organizado para arquivos por processo no storage';

COMMENT ON FUNCTION public.sf8_generate_preview_url(uuid, integer) IS 
'SF-8: Gera URL pública para preview de documento';

COMMENT ON FUNCTION public.sf8_prepare_document_upload(text, text, text, text, text) IS 
'SF-8: Prepara upload de documento criando registros necessários';

-- Mensagem final
SELECT 'SF-8 Storage Policies configuradas com sucesso!' as status,
       'Buckets: documents, peticoes, document-previews com RLS apropriado' as details;
