-- Sistema de Backlog para Autofix - Pipeline de Melhorias
-- Criado para gerenciar ideias, melhorias e tarefas de desenvolvimento

-- Tabela principal para itens do backlog
CREATE TABLE IF NOT EXISTS public.autofix_backlog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação e categorização
  title text NOT NULL,
  description text NOT NULL,
  type text NOT NULL DEFAULT 'improvement', -- 'bug_fix', 'feature', 'improvement', 'refactor', 'research'
  priority text NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  category text NOT NULL DEFAULT 'general', -- 'ui', 'performance', 'database', 'security', 'api', 'documentation'
  tags text[] DEFAULT '{}',
  
  -- Status e pipeline
  status text NOT NULL DEFAULT 'backlog', -- 'backlog', 'ready', 'in_progress', 'review', 'testing', 'done', 'blocked'
  pipeline_stage text NOT NULL DEFAULT 'ideation', -- 'ideation', 'analysis', 'design', 'development', 'testing', 'deployment'
  
  -- Estimativas e complexidade
  story_points integer, -- Pontos de história (1, 2, 3, 5, 8, 13, 21)
  complexity text DEFAULT 'medium', -- 'low', 'medium', 'high', 'unknown'
  estimated_hours integer, -- Estimativa em horas
  
  -- Relações e dependências
  parent_item_id uuid REFERENCES public.autofix_backlog_items(id), -- Para sub-tarefas
  depends_on uuid[] DEFAULT '{}', -- IDs de outros itens que são dependências
  blocks uuid[] DEFAULT '{}', -- IDs de outros itens que este item bloqueia
  
  -- Usuários e responsabilidades
  created_by uuid REFERENCES auth.users(id),
  assigned_to uuid REFERENCES auth.users(id),
  reviewer_id uuid REFERENCES auth.users(id),
  stakeholders uuid[] DEFAULT '{}', -- IDs de usuários interessados
  
  -- Builder.io integration
  builder_prompt text, -- Prompt que pode ser executado no Builder.io
  builder_prompt_template text, -- Template do prompt para reutilização
  builder_execution_context jsonb DEFAULT '{}', -- Contexto para execução
  can_execute_in_builder boolean DEFAULT false, -- Se pode ser executado como prompt
  
  -- Metadados e contexto
  acceptance_criteria text[], -- Critérios de aceitaç��o
  technical_notes text, -- Notas técnicas
  business_value text, -- Valor de negócio
  user_impact text, -- Impacto no usuário
  risk_assessment text, -- Avaliação de riscos
  
  -- Dados estruturados
  metadata jsonb DEFAULT '{}',
  custom_fields jsonb DEFAULT '{}',
  
  -- Controle de datas
  due_date timestamp with time zone,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Constraints
  CONSTRAINT autofix_backlog_items_type_check CHECK (type IN ('bug_fix', 'feature', 'improvement', 'refactor', 'research')),
  CONSTRAINT autofix_backlog_items_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT autofix_backlog_items_status_check CHECK (status IN ('backlog', 'ready', 'in_progress', 'review', 'testing', 'done', 'blocked')),
  CONSTRAINT autofix_backlog_items_complexity_check CHECK (complexity IN ('low', 'medium', 'high', 'unknown')),
  CONSTRAINT autofix_backlog_items_story_points_check CHECK (story_points IN (1, 2, 3, 5, 8, 13, 21))
);

-- Tabela para comentários nos itens
CREATE TABLE IF NOT EXISTS public.autofix_backlog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.autofix_backlog_items(id) ON DELETE CASCADE,
  
  -- Conteúdo do comentário
  content text NOT NULL,
  type text NOT NULL DEFAULT 'comment', -- 'comment', 'status_change', 'system', 'approval', 'rejection'
  
  -- Usuário e metadados
  author_id uuid NOT NULL REFERENCES auth.users(id),
  mentions uuid[] DEFAULT '{}', -- IDs de usuários mencionados
  
  -- Anexos e referências
  attachments jsonb DEFAULT '{}', -- URLs de arquivos anexados
  references jsonb DEFAULT '{}', -- Referências externas (PRs, issues, etc.)
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Soft delete
  deleted_at timestamp with time zone,
  
  CONSTRAINT autofix_backlog_comments_type_check CHECK (type IN ('comment', 'status_change', 'system', 'approval', 'rejection'))
);

-- Tabela para aprovações/rejeições
CREATE TABLE IF NOT EXISTS public.autofix_backlog_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.autofix_backlog_items(id) ON DELETE CASCADE,
  
  -- Dados da aprovação
  type text NOT NULL, -- 'approve', 'reject', 'request_changes'
  approver_id uuid NOT NULL REFERENCES auth.users(id),
  comments text,
  
  -- Metadados
  metadata jsonb DEFAULT '{}',
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  
  CONSTRAINT autofix_backlog_approvals_type_check CHECK (type IN ('approve', 'reject', 'request_changes'))
);

-- Tabela para anexos de documentos
CREATE TABLE IF NOT EXISTS public.autofix_backlog_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.autofix_backlog_items(id) ON DELETE CASCADE,
  
  -- Dados do arquivo
  filename text NOT NULL,
  file_url text NOT NULL,
  file_type text, -- mime type
  file_size integer, -- tamanho em bytes
  
  -- Metadados
  description text,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  
  -- Soft delete
  deleted_at timestamp with time zone
);

-- Tabela para histórico de mudanças de status
CREATE TABLE IF NOT EXISTS public.autofix_backlog_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.autofix_backlog_items(id) ON DELETE CASCADE,
  
  -- Mudança de status
  from_status text,
  to_status text NOT NULL,
  from_pipeline_stage text,
  to_pipeline_stage text,
  
  -- Usuário e contexto
  changed_by uuid NOT NULL REFERENCES auth.users(id),
  reason text, -- Motivo da mudança
  
  -- Metadados
  metadata jsonb DEFAULT '{}',
  
  -- Timestamp
  created_at timestamp with time zone DEFAULT now()
);

-- Tabela para execuções de prompts no Builder.io
CREATE TABLE IF NOT EXISTS public.autofix_builder_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.autofix_backlog_items(id) ON DELETE CASCADE,
  
  -- Dados da execução
  prompt_used text NOT NULL,
  execution_context jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  
  -- Resultados
  result_data jsonb DEFAULT '{}',
  error_message text,
  execution_logs text,
  
  -- Usuário e timestamps
  executed_by uuid NOT NULL REFERENCES auth.users(id),
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  
  CONSTRAINT autofix_builder_executions_status_check CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_autofix_backlog_items_status ON public.autofix_backlog_items(status);
CREATE INDEX IF NOT EXISTS idx_autofix_backlog_items_priority ON public.autofix_backlog_items(priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autofix_backlog_items_assigned_to ON public.autofix_backlog_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_autofix_backlog_items_created_by ON public.autofix_backlog_items(created_by);
CREATE INDEX IF NOT EXISTS idx_autofix_backlog_items_pipeline_stage ON public.autofix_backlog_items(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_autofix_backlog_items_type_category ON public.autofix_backlog_items(type, category);
CREATE INDEX IF NOT EXISTS idx_autofix_backlog_items_due_date ON public.autofix_backlog_items(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_autofix_backlog_items_tags_gin ON public.autofix_backlog_items USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_autofix_backlog_items_metadata_gin ON public.autofix_backlog_items USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_autofix_backlog_comments_item_id ON public.autofix_backlog_comments(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_autofix_backlog_comments_author_id ON public.autofix_backlog_comments(author_id);

CREATE INDEX IF NOT EXISTS idx_autofix_backlog_approvals_item_id ON public.autofix_backlog_approvals(item_id);
CREATE INDEX IF NOT EXISTS idx_autofix_backlog_approvals_approver_id ON public.autofix_backlog_approvals(approver_id);

CREATE INDEX IF NOT EXISTS idx_autofix_backlog_attachments_item_id ON public.autofix_backlog_attachments(item_id);

CREATE INDEX IF NOT EXISTS idx_autofix_backlog_status_history_item_id ON public.autofix_backlog_status_history(item_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_autofix_builder_executions_item_id ON public.autofix_builder_executions(item_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_autofix_builder_executions_status ON public.autofix_builder_executions(status);

-- Views úteis

-- View para kanban board
CREATE OR REPLACE VIEW public.vw_autofix_kanban AS
SELECT 
  abi.*,
  u_created.email as created_by_email,
  u_assigned.email as assigned_to_email,
  u_reviewer.email as reviewer_email,
  COALESCE(
    (SELECT COUNT(*) FROM public.autofix_backlog_comments abc WHERE abc.item_id = abi.id AND abc.deleted_at IS NULL),
    0
  ) as comment_count,
  COALESCE(
    (SELECT COUNT(*) FROM public.autofix_backlog_attachments aba WHERE aba.item_id = abi.id AND aba.deleted_at IS NULL),
    0
  ) as attachment_count,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.autofix_backlog_approvals aba WHERE aba.item_id = abi.id AND aba.type = 'approve') THEN 'approved'
    WHEN EXISTS (SELECT 1 FROM public.autofix_backlog_approvals aba WHERE aba.item_id = abi.id AND aba.type = 'reject') THEN 'rejected'
    WHEN EXISTS (SELECT 1 FROM public.autofix_backlog_approvals aba WHERE aba.item_id = abi.id AND aba.type = 'request_changes') THEN 'changes_requested'
    ELSE 'pending'
  END as approval_status
FROM public.autofix_backlog_items abi
LEFT JOIN auth.users u_created ON abi.created_by = u_created.id
LEFT JOIN auth.users u_assigned ON abi.assigned_to = u_assigned.id
LEFT JOIN auth.users u_reviewer ON abi.reviewer_id = u_reviewer.id;

-- View para dashboard metrics
CREATE OR REPLACE VIEW public.vw_autofix_metrics AS
SELECT 
  COUNT(*) as total_items,
  COUNT(*) FILTER (WHERE status = 'backlog') as backlog_count,
  COUNT(*) FILTER (WHERE status = 'ready') as ready_count,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
  COUNT(*) FILTER (WHERE status = 'review') as review_count,
  COUNT(*) FILTER (WHERE status = 'testing') as testing_count,
  COUNT(*) FILTER (WHERE status = 'done') as done_count,
  COUNT(*) FILTER (WHERE status = 'blocked') as blocked_count,
  COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
  COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count,
  COUNT(*) FILTER (WHERE can_execute_in_builder = true) as builder_executable_count,
  AVG(story_points) FILTER (WHERE story_points IS NOT NULL) as avg_story_points,
  SUM(story_points) FILTER (WHERE status IN ('in_progress', 'review', 'testing')) as active_story_points
FROM public.autofix_backlog_items;

-- Funções

-- Função para criar novo item no backlog
CREATE OR REPLACE FUNCTION public.create_backlog_item(
  p_title text,
  p_description text,
  p_type text DEFAULT 'improvement',
  p_priority text DEFAULT 'medium',
  p_category text DEFAULT 'general',
  p_tags text[] DEFAULT '{}',
  p_builder_prompt text DEFAULT NULL,
  p_can_execute_in_builder boolean DEFAULT false,
  p_acceptance_criteria text[] DEFAULT '{}',
  p_business_value text DEFAULT NULL,
  p_technical_notes text DEFAULT NULL,
  p_story_points integer DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_due_date timestamp with time zone DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  INSERT INTO public.autofix_backlog_items (
    title, description, type, priority, category, tags,
    builder_prompt, can_execute_in_builder, acceptance_criteria,
    business_value, technical_notes, story_points, assigned_to,
    due_date, created_by
  ) VALUES (
    p_title, p_description, p_type, p_priority, p_category, p_tags,
    p_builder_prompt, p_can_execute_in_builder, p_acceptance_criteria,
    p_business_value, p_technical_notes, p_story_points, p_assigned_to,
    p_due_date, v_user_id
  ) RETURNING id INTO v_item_id;
  
  -- Registrar mudança de status inicial
  INSERT INTO public.autofix_backlog_status_history (
    item_id, to_status, to_pipeline_stage, changed_by, reason
  ) VALUES (
    v_item_id, 'backlog', 'ideation', v_user_id, 'Item criado'
  );
  
  RETURN v_item_id;
END;
$$;

-- Função para mudar status
CREATE OR REPLACE FUNCTION public.update_backlog_item_status(
  p_item_id uuid,
  p_new_status text,
  p_new_pipeline_stage text DEFAULT NULL,
  p_reason text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_current_status text;
  v_current_stage text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Get current status
  SELECT status, pipeline_stage INTO v_current_status, v_current_stage
  FROM public.autofix_backlog_items
  WHERE id = p_item_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item não encontrado';
  END IF;
  
  -- Update status
  UPDATE public.autofix_backlog_items 
  SET 
    status = p_new_status,
    pipeline_stage = COALESCE(p_new_pipeline_stage, pipeline_stage),
    updated_at = now(),
    started_at = CASE WHEN p_new_status = 'in_progress' AND started_at IS NULL THEN now() ELSE started_at END,
    completed_at = CASE WHEN p_new_status = 'done' THEN now() ELSE completed_at END
  WHERE id = p_item_id;
  
  -- Record status change
  INSERT INTO public.autofix_backlog_status_history (
    item_id, from_status, to_status, from_pipeline_stage, to_pipeline_stage,
    changed_by, reason
  ) VALUES (
    p_item_id, v_current_status, p_new_status, v_current_stage, 
    COALESCE(p_new_pipeline_stage, v_current_stage), v_user_id, p_reason
  );
  
  RETURN true;
END;
$$;

-- Função para executar prompt no Builder.io
CREATE OR REPLACE FUNCTION public.execute_builder_prompt(
  p_item_id uuid,
  p_prompt text DEFAULT NULL,
  p_execution_context jsonb DEFAULT '{}'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_execution_id uuid;
  v_item_prompt text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;
  
  -- Get item prompt if not provided
  IF p_prompt IS NULL THEN
    SELECT builder_prompt INTO v_item_prompt
    FROM public.autofix_backlog_items
    WHERE id = p_item_id AND can_execute_in_builder = true;
    
    IF v_item_prompt IS NULL THEN
      RAISE EXCEPTION 'Item não possui prompt executável no Builder.io';
    END IF;
    
    p_prompt := v_item_prompt;
  END IF;
  
  -- Create execution record
  INSERT INTO public.autofix_builder_executions (
    item_id, prompt_used, execution_context, executed_by
  ) VALUES (
    p_item_id, p_prompt, p_execution_context, v_user_id
  ) RETURNING id INTO v_execution_id;
  
  RETURN v_execution_id;
END;
$$;

-- Row Level Security (RLS)
ALTER TABLE public.autofix_backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autofix_backlog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autofix_backlog_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autofix_backlog_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autofix_backlog_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autofix_builder_executions ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (todos usuários autenticados podem ver/editar)
CREATE POLICY "Authenticated users can view backlog items" ON public.autofix_backlog_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert backlog items" ON public.autofix_backlog_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update backlog items" ON public.autofix_backlog_items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage comments" ON public.autofix_backlog_comments
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage approvals" ON public.autofix_backlog_approvals
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage attachments" ON public.autofix_backlog_attachments
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view status history" ON public.autofix_backlog_status_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view builder executions" ON public.autofix_builder_executions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Inserir dados de exemplo
INSERT INTO public.autofix_backlog_items (
  title, description, type, priority, category, tags,
  builder_prompt, can_execute_in_builder, acceptance_criteria,
  business_value, technical_notes, story_points
) VALUES
(
  'Melhorar performance do dashboard',
  'O dashboard está carregando lentamente, principalmente na visualização de métricas. Investigar e otimizar queries e componentes.',
  'improvement',
  'high',
  'performance',
  ARRAY['performance', 'dashboard', 'optimization'],
  'Analyze and optimize the dashboard components for better performance. Focus on database queries, component re-renders, and data fetching patterns.',
  true,
  ARRAY['Dashboard deve carregar em menos de 2 segundos', 'Métricas devem ser atualizadas em tempo real', 'Não deve haver travamentos na UI'],
  'Melhor experiência do usuário e maior produtividade',
  'Verificar uso de React.memo, useMemo, useCallback. Otimizar queries SQL.',
  8
),
(
  'Sistema de notificações em tempo real',
  'Implementar sistema de notificações push em tempo real usando WebSockets ou Server-Sent Events.',
  'feature',
  'medium',
  'ui',
  ARRAY['notifications', 'realtime', 'websockets'],
  'Implement a real-time notification system with WebSocket support. Include notification persistence, read status tracking, and browser notifications.',
  true,
  ARRAY['Notificações devem aparecer em tempo real', 'Usuário deve poder marcar como lida', 'Deve funcionar offline'],
  'Comunicação mais eficiente e melhor engajamento',
  'Usar Supabase Realtime ou implementar WebSocket customizado',
  13
),
(
  'Documentação da API',
  'Criar documentação completa da API REST com exemplos de uso e casos de teste.',
  'research',
  'low',
  'documentation',
  ARRAY['api', 'documentation', 'swagger'],
  'Generate comprehensive API documentation using OpenAPI/Swagger. Include examples, error codes, and authentication flows.',
  true,
  ARRAY['Todos endpoints devem estar documentados', 'Deve incluir exemplos de request/response', 'Deve ter ambiente de teste'],
  'Melhor experiência para desenvolvedores e integrações',
  'Usar Swagger/OpenAPI 3.0, considerar auto-geração a partir do código',
  5
);
