-- SF-2: Processo > Detalhes — Chat Multi-thread + Memória
-- Database schema and functions for multi-thread chat system

-- Ensure thread_links table exists with proper structure
DO $$ 
BEGIN
    -- Create thread_links if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'thread_links') THEN
        CREATE TABLE public.thread_links (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            numero_cnj text NOT NULL,
            context_type text NOT NULL DEFAULT 'geral',
            properties jsonb NOT NULL DEFAULT '{}',
            created_at timestamptz DEFAULT now(),
            updated_at timestamptz DEFAULT now()
        );
        
        -- Indexes for performance
        CREATE INDEX idx_thread_links_numero_cnj ON public.thread_links USING gin ((properties->>'numero_cnj'));
        CREATE INDEX idx_thread_links_context_type ON public.thread_links (context_type);
        CREATE INDEX idx_thread_links_updated_at ON public.thread_links (updated_at DESC);
        
        COMMENT ON TABLE public.thread_links IS 'SF-2: Thread links for multi-thread chat conversations';
    END IF;
    
    -- Ensure properties column has proper structure
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'thread_links' AND column_name = 'updated_at') THEN
        ALTER TABLE public.thread_links ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- Ensure ai_messages table exists with proper structure  
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_messages') THEN
        CREATE TABLE public.ai_messages (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            thread_link_id uuid NOT NULL REFERENCES public.thread_links(id) ON DELETE CASCADE,
            role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
            content text NOT NULL,
            metadata jsonb DEFAULT '{}',
            attachments jsonb,
            created_at timestamptz DEFAULT now()
        );
        
        -- Indexes for performance
        CREATE INDEX idx_ai_messages_thread_link_id ON public.ai_messages (thread_link_id);
        CREATE INDEX idx_ai_messages_role ON public.ai_messages (role);
        CREATE INDEX idx_ai_messages_created_at ON public.ai_messages (created_at);
        CREATE INDEX idx_ai_messages_metadata ON public.ai_messages USING gin (metadata);
        
        COMMENT ON TABLE public.ai_messages IS 'SF-2: AI messages for multi-thread chat conversations';
    END IF;
    
    -- Ensure attachments column exists
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'ai_messages' AND column_name = 'attachments') THEN
        ALTER TABLE public.ai_messages ADD COLUMN attachments jsonb;
    END IF;
END $$;

-- Ensure ticket_threads table exists in legalflow schema
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'legalflow' AND table_name = 'ticket_threads') THEN
        CREATE TABLE legalflow.ticket_threads (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            ticket_id uuid, -- References legalflow.tickets(id) if exists
            thread_link_id text, -- Reference to public.thread_links 
            properties jsonb DEFAULT '{}',
            created_at timestamptz DEFAULT now()
        );
        
        CREATE INDEX idx_ticket_threads_thread_link_id ON legalflow.ticket_threads (thread_link_id);
        CREATE INDEX idx_ticket_threads_ticket_id ON legalflow.ticket_threads (ticket_id);
        
        COMMENT ON TABLE legalflow.ticket_threads IS 'SF-2: Links between tickets and chat threads';
    END IF;
END $$;

-- Function to update thread timestamp when new message is added
CREATE OR REPLACE FUNCTION update_thread_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.thread_links 
    SET updated_at = NOW()
    WHERE id = NEW.thread_link_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS trigger_update_thread_timestamp ON public.ai_messages;
CREATE TRIGGER trigger_update_thread_timestamp
    AFTER INSERT ON public.ai_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_thread_timestamp();

-- Function to get thread statistics
CREATE OR REPLACE FUNCTION get_thread_stats(p_numero_cnj text)
RETURNS TABLE (
    total_threads bigint,
    total_messages bigint,
    quick_actions_executed bigint,
    last_activity timestamptz
) AS $$
BEGIN
    RETURN QUERY
    WITH thread_data AS (
        SELECT tl.id, tl.created_at, tl.updated_at
        FROM public.thread_links tl
        WHERE tl.properties->>'numero_cnj' = p_numero_cnj
    ),
    message_data AS (
        SELECT am.id, am.metadata, am.created_at
        FROM public.ai_messages am
        JOIN thread_data td ON am.thread_link_id = td.id
    )
    SELECT 
        (SELECT COUNT(*) FROM thread_data)::bigint as total_threads,
        (SELECT COUNT(*) FROM message_data)::bigint as total_messages,
        (SELECT COUNT(*) FROM message_data WHERE 
            metadata ? 'action_type' OR 
            metadata ? 'quick_action'
        )::bigint as quick_actions_executed,
        (SELECT MAX(created_at) FROM message_data) as last_activity;
END;
$$ LANGUAGE plpgsql;

-- Function to search messages across threads
CREATE OR REPLACE FUNCTION search_chat_messages(
    p_numero_cnj text,
    p_search_term text,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    message_id uuid,
    thread_id uuid,
    thread_title text,
    role text,
    content text,
    created_at timestamptz,
    relevance_score real
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        am.id as message_id,
        tl.id as thread_id,
        (tl.properties->>'titulo') as thread_title,
        am.role,
        am.content,
        am.created_at,
        ts_rank(to_tsvector('portuguese', am.content), plainto_tsquery('portuguese', p_search_term)) as relevance_score
    FROM public.ai_messages am
    JOIN public.thread_links tl ON am.thread_link_id = tl.id
    WHERE tl.properties->>'numero_cnj' = p_numero_cnj
    AND to_tsvector('portuguese', am.content) @@ plainto_tsquery('portuguese', p_search_term)
    ORDER BY relevance_score DESC, am.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get conversation properties for advanced search
CREATE OR REPLACE FUNCTION get_conversation_properties(p_thread_id uuid)
RETURNS TABLE (
    thread_id uuid,
    numero_cnj text,
    titulo text,
    canal text,
    tipo text,
    created_at timestamptz,
    updated_at timestamptz,
    message_count bigint,
    participants text[],
    last_message_at timestamptz
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tl.id as thread_id,
        (tl.properties->>'numero_cnj') as numero_cnj,
        (tl.properties->>'titulo') as titulo,
        (tl.properties->>'canal') as canal,
        (tl.properties->>'tipo') as tipo,
        tl.created_at,
        tl.updated_at,
        COUNT(am.id) as message_count,
        ARRAY_AGG(DISTINCT am.role) as participants,
        MAX(am.created_at) as last_message_at
    FROM public.thread_links tl
    LEFT JOIN public.ai_messages am ON tl.id = am.thread_link_id
    WHERE tl.id = p_thread_id
    GROUP BY tl.id, tl.properties, tl.created_at, tl.updated_at;
END;
$$ LANGUAGE plpgsql;

-- RPC Function for creating thread with validation
CREATE OR REPLACE FUNCTION create_chat_thread(
    p_numero_cnj text,
    p_titulo text,
    p_canal text DEFAULT 'geral',
    p_tipo text DEFAULT 'geral',
    p_context jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
    v_thread_id uuid;
BEGIN
    -- Validate inputs
    IF p_numero_cnj IS NULL OR length(trim(p_numero_cnj)) = 0 THEN
        RAISE EXCEPTION 'número CNJ é obrigatório';
    END IF;
    
    IF p_titulo IS NULL OR length(trim(p_titulo)) = 0 THEN
        RAISE EXCEPTION 'título é obrigatório';
    END IF;
    
    -- Insert new thread
    INSERT INTO public.thread_links (
        numero_cnj,
        context_type,
        properties
    ) VALUES (
        p_numero_cnj,
        p_tipo,
        jsonb_build_object(
            'numero_cnj', p_numero_cnj,
            'titulo', p_titulo,
            'canal', p_canal,
            'tipo', p_tipo,
            'contexto', p_context,
            'criado_em', NOW()
        )
    ) RETURNING id INTO v_thread_id;
    
    RETURN v_thread_id;
END;
$$ LANGUAGE plpgsql;

-- RPC Function for quick actions integration
CREATE OR REPLACE FUNCTION execute_chat_quick_action(
    p_action_type text,
    p_thread_id uuid,
    p_numero_cnj text,
    p_parameters jsonb DEFAULT '{}'
)
RETURNS jsonb AS $$
DECLARE
    v_result jsonb;
    v_activity_id uuid;
BEGIN
    CASE p_action_type
        WHEN 'CREATE_TASK' THEN
            INSERT INTO legalflow.activities (
                numero_cnj,
                title,
                description,
                status,
                due_at,
                metadata
            ) VALUES (
                p_numero_cnj,
                COALESCE(p_parameters->>'titulo', 'Tarefa criada via chat'),
                COALESCE(p_parameters->>'descricao', ''),
                'pending',
                COALESCE((p_parameters->>'due_date')::timestamptz, NOW() + INTERVAL '7 days'),
                jsonb_build_object(
                    'created_via', 'chat',
                    'thread_id', p_thread_id,
                    'quick_action', true,
                    'sf2_integration', true
                )
            ) RETURNING id INTO v_activity_id;
            
            v_result = jsonb_build_object(
                'success', true,
                'activity_id', v_activity_id,
                'action', 'CREATE_TASK'
            );
            
        WHEN 'LINK_TICKET' THEN
            INSERT INTO legalflow.ticket_threads (
                thread_link_id,
                properties
            ) VALUES (
                p_thread_id::text,
                p_parameters
            );
            
            v_result = jsonb_build_object(
                'success', true,
                'action', 'LINK_TICKET'
            );
            
        WHEN 'REQUEST_DOCUMENT' THEN
            INSERT INTO legalflow.activities (
                numero_cnj,
                title,
                description,
                status,
                activity_type,
                due_at,
                metadata
            ) VALUES (
                p_numero_cnj,
                'Solicitação: ' || COALESCE(p_parameters->>'tipo_documento', 'Documento'),
                COALESCE(p_parameters->>'justificativa', ''),
                'pending',
                'document_request',
                COALESCE((p_parameters->>'prazo')::timestamptz, NOW() + INTERVAL '7 days'),
                jsonb_build_object(
                    'created_via', 'chat',
                    'thread_id', p_thread_id,
                    'quick_action', true,
                    'document_request', true,
                    'sf2_integration', true,
                    'document_type', COALESCE(p_parameters->>'tipo_documento', 'Documento')
                )
            ) RETURNING id INTO v_activity_id;
            
            v_result = jsonb_build_object(
                'success', true,
                'activity_id', v_activity_id,
                'action', 'REQUEST_DOCUMENT'
            );
            
        WHEN 'COMPLETE_STEP' THEN
            INSERT INTO legalflow.activities (
                numero_cnj,
                title,
                description,
                status,
                completed_at,
                metadata
            ) VALUES (
                p_numero_cnj,
                'Etapa concluída: ' || COALESCE(p_parameters->>'nome_etapa', 'Etapa'),
                COALESCE(p_parameters->>'observacoes', ''),
                'completed',
                NOW(),
                jsonb_build_object(
                    'created_via', 'chat',
                    'thread_id', p_thread_id,
                    'quick_action', true,
                    'step_completion', true,
                    'sf2_integration', true,
                    'step_name', COALESCE(p_parameters->>'nome_etapa', 'Etapa')
                )
            ) RETURNING id INTO v_activity_id;
            
            v_result = jsonb_build_object(
                'success', true,
                'activity_id', v_activity_id,
                'action', 'COMPLETE_STEP'
            );
            
        ELSE
            RAISE EXCEPTION 'Ação não reconhecida: %', p_action_type;
    END CASE;
    
    -- Log the action as a system message
    INSERT INTO public.ai_messages (
        thread_link_id,
        role,
        content,
        metadata
    ) VALUES (
        p_thread_id,
        'system',
        format('Ação executada: %s', p_action_type),
        jsonb_build_object(
            'action_type', p_action_type,
            'result', v_result,
            'timestamp', NOW()
        )
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies if not exists
DO $$
BEGIN
    -- Enable RLS on thread_links if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'thread_links' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.thread_links ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on ai_messages if not already enabled  
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'ai_messages' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- RLS Policies for thread_links
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'thread_links_select_policy' AND tablename = 'thread_links') THEN
        CREATE POLICY "thread_links_select_policy" ON public.thread_links
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'thread_links_insert_policy' AND tablename = 'thread_links') THEN
        CREATE POLICY "thread_links_insert_policy" ON public.thread_links
            FOR INSERT WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'thread_links_update_policy' AND tablename = 'thread_links') THEN
        CREATE POLICY "thread_links_update_policy" ON public.thread_links
            FOR UPDATE USING (true);
    END IF;
END $$;

-- RLS Policies for ai_messages
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_messages_select_policy' AND tablename = 'ai_messages') THEN
        CREATE POLICY "ai_messages_select_policy" ON public.ai_messages
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'ai_messages_insert_policy' AND tablename = 'ai_messages') THEN
        CREATE POLICY "ai_messages_insert_policy" ON public.ai_messages
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Grant necessary permissions
GRANT ALL ON public.thread_links TO authenticated;
GRANT ALL ON public.ai_messages TO authenticated;
GRANT USAGE ON SCHEMA legalflow TO authenticated;
GRANT ALL ON legalflow.ticket_threads TO authenticated;

-- Comments for documentation
COMMENT ON FUNCTION get_thread_stats(text) IS 'SF-2: Get statistics for chat threads by processo CNJ';
COMMENT ON FUNCTION search_chat_messages(text, text, integer) IS 'SF-2: Full-text search across chat messages';
COMMENT ON FUNCTION get_conversation_properties(uuid) IS 'SF-2: Get detailed properties and stats for a conversation thread';
COMMENT ON FUNCTION create_chat_thread(text, text, text, text, jsonb) IS 'SF-2: Create new chat thread with validation';
COMMENT ON FUNCTION execute_chat_quick_action(text, uuid, text, jsonb) IS 'SF-2: Execute quick actions from chat interface';

-- Create view for thread summary
CREATE OR REPLACE VIEW vw_thread_summary AS
SELECT 
    tl.id,
    tl.numero_cnj,
    tl.properties->>'titulo' as titulo,
    tl.properties->>'canal' as canal,
    tl.properties->>'tipo' as tipo,
    tl.created_at,
    tl.updated_at,
    COUNT(am.id) as message_count,
    MAX(am.created_at) as last_message_at,
    COALESCE(
        (SELECT am2.content 
         FROM public.ai_messages am2 
         WHERE am2.thread_link_id = tl.id 
         ORDER BY am2.created_at DESC 
         LIMIT 1),
        'Sem mensagens'
    ) as ultima_mensagem
FROM public.thread_links tl
LEFT JOIN public.ai_messages am ON tl.id = am.thread_link_id
GROUP BY tl.id, tl.numero_cnj, tl.properties, tl.created_at, tl.updated_at;

COMMENT ON VIEW vw_thread_summary IS 'SF-2: Summary view of chat threads with basic statistics';

-- Insert sample data if tables are empty (for testing)
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM public.thread_links) = 0 THEN
        -- Insert a sample thread for testing
        INSERT INTO public.thread_links (numero_cnj, context_type, properties) 
        VALUES (
            '1234567-89.2023.4.01.1234',
            'analise_juridica',
            jsonb_build_object(
                'numero_cnj', '1234567-89.2023.4.01.1234',
                'titulo', 'Thread de exemplo - Análise inicial',
                'canal', 'analise',
                'tipo', 'analise_juridica',
                'criado_em', NOW()
            )
        );
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_thread_links_properties_numero_cnj 
ON public.thread_links USING gin ((properties->>'numero_cnj'));

CREATE INDEX IF NOT EXISTS idx_thread_links_properties_canal 
ON public.thread_links USING gin ((properties->>'canal'));

CREATE INDEX IF NOT EXISTS idx_ai_messages_content_search 
ON public.ai_messages USING gin (to_tsvector('portuguese', content));

-- Final validation
DO $$
BEGIN
    RAISE NOTICE 'SF-2: Chat Multi-thread schema setup completed successfully!';
    RAISE NOTICE 'Tables created: thread_links, ai_messages, ticket_threads';
    RAISE NOTICE 'Functions created: get_thread_stats, search_chat_messages, get_conversation_properties, create_chat_thread, execute_chat_quick_action';
    RAISE NOTICE 'View created: vw_thread_summary';
    RAISE NOTICE 'RLS policies and permissions configured';
END $$;
