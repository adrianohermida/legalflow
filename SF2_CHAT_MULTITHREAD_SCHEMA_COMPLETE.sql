-- SF-2: Processo > Detalhes — Chat Multi-thread + Memória
-- 
-- Este arquivo contém todas as configurações de banco necessárias para
-- implementar o sistema de chat multi-thread na página de processos.

-- =====================================================
-- 1. TABELAS PRINCIPAIS
-- =====================================================

-- Verificar se as tabelas principais existem, caso contrário criar
CREATE TABLE IF NOT EXISTS public.thread_links (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  channel TEXT NOT NULL DEFAULT 'chat',
  title TEXT,
  summary TEXT,
  status TEXT DEFAULT 'active',
  properties JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_link_id TEXT NOT NULL REFERENCES public.thread_links(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela para propriedades de conversação (legalflow schema)
CREATE TABLE IF NOT EXISTS legalflow.conversation_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_link_id TEXT NOT NULL REFERENCES public.thread_links(id) ON DELETE CASCADE,
  numero_cnj TEXT,
  context_type TEXT DEFAULT 'processo',
  context_data JSONB DEFAULT '{}',
  quick_actions JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para thread_links
CREATE INDEX IF NOT EXISTS idx_thread_links_properties_cnj 
  ON public.thread_links USING GIN ((properties->>'numero_cnj'));

CREATE INDEX IF NOT EXISTS idx_thread_links_status 
  ON public.thread_links(status);

CREATE INDEX IF NOT EXISTS idx_thread_links_created_at 
  ON public.thread_links(created_at DESC);

-- Índices para ai_messages
CREATE INDEX IF NOT EXISTS idx_ai_messages_thread_link_id 
  ON public.ai_messages(thread_link_id);

CREATE INDEX IF NOT EXISTS idx_ai_messages_created_at 
  ON public.ai_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_messages_role 
  ON public.ai_messages(role);

-- Índices para conversation_properties
CREATE INDEX IF NOT EXISTS idx_conversation_properties_thread_link_id 
  ON legalflow.conversation_properties(thread_link_id);

CREATE INDEX IF NOT EXISTS idx_conversation_properties_numero_cnj 
  ON legalflow.conversation_properties(numero_cnj);

-- =====================================================
-- 3. FUNÇÕES DE AUTOMAÇÃO
-- =====================================================

-- Função para criar uma nova thread de chat para um processo
CREATE OR REPLACE FUNCTION sf2_create_process_chat_thread(
  p_numero_cnj TEXT,
  p_title TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT 'chat'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_thread_id TEXT;
  v_conversation_id UUID;
  v_result JSON;
BEGIN
  -- Gerar ID único para a thread
  v_thread_id := gen_random_uuid()::TEXT;
  
  -- Criar thread_link com properties contendo numero_cnj
  INSERT INTO public.thread_links (
    id,
    channel,
    title,
    properties,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_thread_id,
    p_channel,
    COALESCE(p_title, 'Chat - Processo ' || p_numero_cnj),
    json_build_object('numero_cnj', p_numero_cnj),
    'active',
    NOW(),
    NOW()
  );
  
  -- Criar registro de propriedades da conversação
  INSERT INTO legalflow.conversation_properties (
    id,
    thread_link_id,
    numero_cnj,
    context_type,
    context_data,
    quick_actions,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_thread_id,
    p_numero_cnj,
    'processo',
    json_build_object(
      'numero_cnj', p_numero_cnj,
      'created_by', 'sf2_system'
    ),
    json_build_array(
      json_build_object('id', 'create_task', 'label', 'Criar tarefa', 'icon', 'plus'),
      json_build_object('id', 'link_ticket', 'label', 'Vincular a ticket', 'icon', 'link'),
      json_build_object('id', 'request_document', 'label', 'Solicitar documento', 'icon', 'file'),
      json_build_object('id', 'complete_stage', 'label', 'Concluir etapa', 'icon', 'check'),
      json_build_object('id', 'advogaai_analysis', 'label', 'Análise AdvogaAI', 'icon', 'brain'),
      json_build_object('id', 'start_journey', 'label', 'Iniciar jornada', 'icon', 'play')
    ),
    NOW(),
    NOW()
  )
  RETURNING id INTO v_conversation_id;
  
  -- Criar mensagem inicial do sistema
  INSERT INTO public.ai_messages (
    thread_link_id,
    role,
    content,
    metadata,
    created_at
  )
  VALUES (
    v_thread_id,
    'system',
    'Chat iniciado para o processo ' || p_numero_cnj || '. Use as ações rápidas para interagir com o sistema.',
    json_build_object(
      'tipo', 'system_welcome',
      'numero_cnj', p_numero_cnj
    ),
    NOW()
  );
  
  v_result := json_build_object(
    'success', true,
    'thread_id', v_thread_id,
    'conversation_id', v_conversation_id,
    'numero_cnj', p_numero_cnj,
    'title', COALESCE(p_title, 'Chat - Processo ' || p_numero_cnj),
    'created_at', NOW()
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'error_detail', SQLSTATE,
    'numero_cnj', p_numero_cnj
  );
END;
$$;

-- Função para buscar threads de um processo
CREATE OR REPLACE FUNCTION sf2_get_process_threads(
  p_numero_cnj TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_threads JSON;
  v_result JSON;
BEGIN
  -- Buscar todas as threads do processo com informações resumidas
  SELECT json_agg(
    json_build_object(
      'thread_id', tl.id,
      'title', tl.title,
      'channel', tl.channel,
      'status', tl.status,
      'created_at', tl.created_at,
      'updated_at', tl.updated_at,
      'last_message', last_msg.content,
      'last_message_at', last_msg.created_at,
      'message_count', msg_count.count,
      'quick_actions', cp.quick_actions
    )
    ORDER BY tl.updated_at DESC
  )
  INTO v_threads
  FROM public.thread_links tl
  LEFT JOIN legalflow.conversation_properties cp ON cp.thread_link_id = tl.id
  LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM public.ai_messages am
    WHERE am.thread_link_id = tl.id
      AND am.role != 'system'
    ORDER BY am.created_at DESC
    LIMIT 1
  ) last_msg ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) as count
    FROM public.ai_messages am
    WHERE am.thread_link_id = tl.id
  ) msg_count ON true
  WHERE tl.properties->>'numero_cnj' = p_numero_cnj
    AND tl.status = 'active';
  
  v_result := json_build_object(
    'success', true,
    'numero_cnj', p_numero_cnj,
    'threads', COALESCE(v_threads, '[]'::json),
    'count', COALESCE(json_array_length(v_threads), 0)
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'numero_cnj', p_numero_cnj
  );
END;
$$;

-- Função para buscar mensagens de uma thread
CREATE OR REPLACE FUNCTION sf2_get_thread_messages(
  p_thread_id TEXT,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_messages JSON;
  v_thread_info JSON;
  v_result JSON;
BEGIN
  -- Verificar se a thread existe e buscar informações básicas
  SELECT json_build_object(
    'thread_id', tl.id,
    'title', tl.title,
    'numero_cnj', tl.properties->>'numero_cnj',
    'channel', tl.channel,
    'status', tl.status
  )
  INTO v_thread_info
  FROM public.thread_links tl
  WHERE tl.id = p_thread_id;
  
  IF v_thread_info IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Thread não encontrada',
      'thread_id', p_thread_id
    );
  END IF;
  
  -- Buscar mensagens da thread
  SELECT json_agg(
    json_build_object(
      'id', am.id,
      'role', am.role,
      'content', am.content,
      'attachments', am.attachments,
      'metadata', am.metadata,
      'created_at', am.created_at,
      'updated_at', am.updated_at
    )
    ORDER BY am.created_at ASC
  )
  INTO v_messages
  FROM public.ai_messages am
  WHERE am.thread_link_id = p_thread_id
  ORDER BY am.created_at ASC
  LIMIT p_limit
  OFFSET p_offset;
  
  v_result := json_build_object(
    'success', true,
    'thread_info', v_thread_info,
    'messages', COALESCE(v_messages, '[]'::json),
    'limit', p_limit,
    'offset', p_offset
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'thread_id', p_thread_id
  );
END;
$$;

-- Função para adicionar mensagem a uma thread
CREATE OR REPLACE FUNCTION sf2_add_thread_message(
  p_thread_id TEXT,
  p_role TEXT,
  p_content TEXT,
  p_attachments JSONB DEFAULT '[]',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
  v_result JSON;
BEGIN
  -- Verificar se a thread existe
  IF NOT EXISTS (SELECT 1 FROM public.thread_links WHERE id = p_thread_id) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Thread não encontrada',
      'thread_id', p_thread_id
    );
  END IF;
  
  -- Inserir nova mensagem
  INSERT INTO public.ai_messages (
    id,
    thread_link_id,
    role,
    content,
    attachments,
    metadata,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    p_thread_id,
    p_role,
    p_content,
    p_attachments,
    p_metadata,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_message_id;
  
  -- Atualizar timestamp da thread
  UPDATE public.thread_links 
  SET updated_at = NOW()
  WHERE id = p_thread_id;
  
  v_result := json_build_object(
    'success', true,
    'message_id', v_message_id,
    'thread_id', p_thread_id,
    'role', p_role,
    'created_at', NOW()
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'thread_id', p_thread_id
  );
END;
$$;

-- =====================================================
-- 4. FUNÇÕES PARA QUICK ACTIONS
-- =====================================================

-- Função para executar quick action: Criar tarefa
CREATE OR REPLACE FUNCTION sf2_quick_action_create_task(
  p_thread_id TEXT,
  p_task_title TEXT,
  p_task_description TEXT DEFAULT NULL,
  p_due_date TIMESTAMP DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numero_cnj TEXT;
  v_activity_id UUID;
  v_result JSON;
BEGIN
  -- Obter número CNJ da thread
  SELECT properties->>'numero_cnj'
  INTO v_numero_cnj
  FROM public.thread_links
  WHERE id = p_thread_id;
  
  IF v_numero_cnj IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Thread ou CNJ não encontrado'
    );
  END IF;
  
  -- Criar activity
  INSERT INTO legalflow.activities (
    id,
    title,
    status,
    priority,
    numero_cnj,
    created_by,
    due_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    p_task_title,
    'todo',
    'media',
    v_numero_cnj,
    'sf2_chat_system',
    p_due_date,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_activity_id;
  
  -- Adicionar mensagem de confirmação no chat
  PERFORM sf2_add_thread_message(
    p_thread_id,
    'assistant',
    'Tarefa criada com sucesso: "' || p_task_title || '"',
    '[]'::jsonb,
    json_build_object(
      'action_type', 'create_task',
      'activity_id', v_activity_id,
      'numero_cnj', v_numero_cnj
    )
  );
  
  v_result := json_build_object(
    'success', true,
    'action_type', 'create_task',
    'activity_id', v_activity_id,
    'task_title', p_task_title,
    'numero_cnj', v_numero_cnj
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'action_type', 'create_task'
  );
END;
$$;

-- Função para executar quick action: Vincular a ticket
CREATE OR REPLACE FUNCTION sf2_quick_action_link_ticket(
  p_thread_id TEXT,
  p_ticket_subject TEXT,
  p_priority TEXT DEFAULT 'media'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_numero_cnj TEXT;
  v_ticket_id UUID;
  v_result JSON;
BEGIN
  -- Obter número CNJ da thread
  SELECT properties->>'numero_cnj'
  INTO v_numero_cnj
  FROM public.thread_links
  WHERE id = p_thread_id;
  
  IF v_numero_cnj IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Thread ou CNJ não encontrado'
    );
  END IF;
  
  -- Criar ticket
  INSERT INTO legalflow.tickets (
    id,
    subject,
    status,
    priority,
    channel,
    numero_cnj,
    created_by,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    p_ticket_subject,
    'aberto',
    p_priority,
    'chat',
    v_numero_cnj,
    'sf2_chat_system',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_ticket_id;
  
  -- Vincular thread ao ticket
  INSERT INTO legalflow.ticket_threads (
    id,
    ticket_id,
    thread_link_id,
    created_at
  )
  VALUES (
    gen_random_uuid(),
    v_ticket_id,
    p_thread_id,
    NOW()
  );
  
  -- Adicionar mensagem de confirmação
  PERFORM sf2_add_thread_message(
    p_thread_id,
    'assistant',
    'Ticket criado e vinculado: "' || p_ticket_subject || '"',
    '[]'::jsonb,
    json_build_object(
      'action_type', 'link_ticket',
      'ticket_id', v_ticket_id,
      'numero_cnj', v_numero_cnj
    )
  );
  
  v_result := json_build_object(
    'success', true,
    'action_type', 'link_ticket',
    'ticket_id', v_ticket_id,
    'ticket_subject', p_ticket_subject,
    'numero_cnj', v_numero_cnj
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'action_type', 'link_ticket'
  );
END;
$$;

-- =====================================================
-- 5. TRIGGERS PARA AUTOMAÇÃO
-- =====================================================

-- Função trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Aplicar trigger nas tabelas principais
DROP TRIGGER IF EXISTS trigger_thread_links_updated_at ON public.thread_links;
CREATE TRIGGER trigger_thread_links_updated_at
  BEFORE UPDATE ON public.thread_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_ai_messages_updated_at ON public.ai_messages;
CREATE TRIGGER trigger_ai_messages_updated_at
  BEFORE UPDATE ON public.ai_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_conversation_properties_updated_at ON legalflow.conversation_properties;
CREATE TRIGGER trigger_conversation_properties_updated_at
  BEFORE UPDATE ON legalflow.conversation_properties
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. PERMISSÕES E SEGURANÇA
-- =====================================================

-- Garantir permissões apropriadas para as funções
GRANT EXECUTE ON FUNCTION sf2_create_process_chat_thread(TEXT, TEXT, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION sf2_get_process_threads(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION sf2_get_thread_messages(TEXT, INTEGER, INTEGER) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION sf2_add_thread_message(TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION sf2_quick_action_create_task(TEXT, TEXT, TEXT, TIMESTAMP) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION sf2_quick_action_link_ticket(TEXT, TEXT, TEXT) TO authenticated, anon;

-- Permissões nas tabelas
GRANT SELECT, INSERT, UPDATE ON public.thread_links TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.ai_messages TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON legalflow.conversation_properties TO authenticated, anon;

-- =====================================================
-- 7. COMENTÁRIOS E DOCUMENTAÇÃO
-- =====================================================

COMMENT ON FUNCTION sf2_create_process_chat_thread(TEXT, TEXT, TEXT) IS 
'SF-2: Cria uma nova thread de chat para um processo específico com automação de properties';

COMMENT ON FUNCTION sf2_get_process_threads(TEXT) IS 
'SF-2: Busca todas as threads de chat de um processo com informações resumidas';

COMMENT ON FUNCTION sf2_get_thread_messages(TEXT, INTEGER, INTEGER) IS 
'SF-2: Busca mensagens de uma thread específica com paginação';

COMMENT ON FUNCTION sf2_add_thread_message(TEXT, TEXT, TEXT, JSONB, JSONB) IS 
'SF-2: Adiciona uma nova mensagem a uma thread existente';

COMMENT ON FUNCTION sf2_quick_action_create_task(TEXT, TEXT, TEXT, TIMESTAMP) IS 
'SF-2: Quick action para criar tarefa a partir do chat';

COMMENT ON FUNCTION sf2_quick_action_link_ticket(TEXT, TEXT, TEXT) IS 
'SF-2: Quick action para criar e vincular ticket a partir do chat';

COMMENT ON TABLE public.thread_links IS 
'SF-2: Tabela principal de threads de chat com properties para contexto de processo';

COMMENT ON TABLE public.ai_messages IS 
'SF-2: Mensagens do chat multi-thread com suporte a anexos';

COMMENT ON TABLE legalflow.conversation_properties IS 
'SF-2: Propriedades e configurações específicas das conversações de processo';

-- =====================================================
-- 8. DADOS DE EXEMPLO (OPCIONAL)
-- =====================================================

-- Função para criar dados de exemplo para desenvolvimento
CREATE OR REPLACE FUNCTION sf2_create_sample_data()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sample_cnj TEXT := '1234567-89.2023.8.26.0001';
  v_thread_result JSON;
  v_result JSON;
BEGIN
  -- Criar thread de exemplo
  SELECT sf2_create_process_chat_thread(
    v_sample_cnj,
    'Chat Principal - Processo Teste',
    'chat'
  ) INTO v_thread_result;
  
  IF (v_thread_result->>'success')::boolean THEN
    -- Adicionar algumas mensagens de exemplo
    PERFORM sf2_add_thread_message(
      v_thread_result->>'thread_id',
      'user',
      'Olá! Preciso verificar o andamento deste processo.',
      '[]'::jsonb,
      '{}'::jsonb
    );
    
    PERFORM sf2_add_thread_message(
      v_thread_result->>'thread_id',
      'assistant',
      'Olá! Posso ajudar você com informações sobre este processo. Use as ações rápidas para criar tarefas ou tickets.',
      '[]'::jsonb,
      '{}'::jsonb
    );
  END IF;
  
  v_result := json_build_object(
    'success', true,
    'sample_cnj', v_sample_cnj,
    'thread_created', v_thread_result
  );
  
  RETURN v_result;
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

GRANT EXECUTE ON FUNCTION sf2_create_sample_data() TO authenticated, anon;

-- Finalização
SELECT 'SF-2: Chat Multi-thread schema instalado com sucesso!' as status;
