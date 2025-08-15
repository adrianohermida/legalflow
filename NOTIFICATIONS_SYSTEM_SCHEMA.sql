-- Sistema de Notificações com Histórico e Marcação de Leitura
-- Criado para resolver o problema de notificações que não podem ser eliminadas

-- Tabela principal para notificações do sistema
CREATE TABLE IF NOT EXISTS public.system_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação da notificação
  type text NOT NULL, -- 'system', 'update', 'alert', 'info', 'warning', 'error'
  priority text NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  category text NOT NULL, -- 'processo', 'cliente', 'agenda', 'sistema', 'autofix'
  
  -- Conteúdo da notificação
  title text NOT NULL,
  message text NOT NULL,
  action_label text, -- ex: "Ver processo", "Atualizar", "Revisar"
  action_url text, -- URL para onde a ação direciona
  action_data jsonb DEFAULT '{}', -- Dados adicionais para a ação
  
  -- Contexto e metadados
  context jsonb DEFAULT '{}', -- Contexto adicional (numero_cnj, cliente_id, etc.)
  metadata jsonb DEFAULT '{}', -- Metadados diversos
  
  -- Expiração e configuração
  expires_at timestamp with time zone, -- Quando a notificação expira
  auto_dismiss boolean DEFAULT false, -- Se deve ser removida automaticamente após leitura
  persistent boolean DEFAULT false, -- Se deve permanecer mesmo após leitura
  
  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Índices para performance
  CONSTRAINT system_notifications_type_check CHECK (type IN ('system', 'update', 'alert', 'info', 'warning', 'error')),
  CONSTRAINT system_notifications_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Tabela para rastrear quais usuários leram cada notificação
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.system_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps da interação
  read_at timestamp with time zone DEFAULT now(),
  dismissed_at timestamp with time zone, -- Quando o usuário dispensou/fechou
  action_clicked_at timestamp with time zone, -- Quando clicou na ação
  
  -- Metadados da interação
  interaction_data jsonb DEFAULT '{}', -- Dados sobre como interagiu
  
  created_at timestamp with time zone DEFAULT now(),
  
  -- Constraint única: um usuário só pode ler uma notificação uma vez
  UNIQUE(notification_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_notifications_type ON public.system_notifications(type);
CREATE INDEX IF NOT EXISTS idx_system_notifications_category ON public.system_notifications(category);
CREATE INDEX IF NOT EXISTS idx_system_notifications_priority ON public.system_notifications(priority);
CREATE INDEX IF NOT EXISTS idx_system_notifications_created_at ON public.system_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_notifications_expires_at ON public.system_notifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_system_notifications_context_gin ON public.system_notifications USING gin(context);

CREATE INDEX IF NOT EXISTS idx_notification_reads_notification_id ON public.notification_reads(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_user_id ON public.notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_reads_read_at ON public.notification_reads(read_at DESC);

-- View para notificações não lidas por usuário
CREATE OR REPLACE VIEW public.vw_unread_notifications AS
SELECT 
  sn.*,
  CASE WHEN nr.user_id IS NULL THEN true ELSE false END as is_unread,
  nr.read_at,
  nr.dismissed_at,
  nr.action_clicked_at
FROM public.system_notifications sn
LEFT JOIN public.notification_reads nr ON sn.id = nr.notification_id
WHERE 
  -- Não expiradas
  (sn.expires_at IS NULL OR sn.expires_at > now())
  -- E não lidas ou persistentes
  AND (nr.user_id IS NULL OR sn.persistent = true);

-- View para histórico completo de notificações por usuário
CREATE OR REPLACE VIEW public.vw_notification_history AS
SELECT 
  sn.*,
  nr.user_id,
  nr.read_at,
  nr.dismissed_at,
  nr.action_clicked_at,
  nr.interaction_data,
  CASE 
    WHEN nr.user_id IS NULL THEN 'unread'
    WHEN nr.dismissed_at IS NOT NULL THEN 'dismissed'
    WHEN nr.action_clicked_at IS NOT NULL THEN 'acted'
    ELSE 'read'
  END as status
FROM public.system_notifications sn
LEFT JOIN public.notification_reads nr ON sn.id = nr.notification_id
ORDER BY sn.created_at DESC;

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION public.mark_notification_read(
  p_notification_id uuid,
  p_user_id uuid,
  p_interaction_data jsonb DEFAULT '{}'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notification_reads (notification_id, user_id, interaction_data)
  VALUES (p_notification_id, p_user_id, p_interaction_data)
  ON CONFLICT (notification_id, user_id) 
  DO UPDATE SET 
    interaction_data = EXCLUDED.interaction_data,
    read_at = now();
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Função para dispensar/fechar notificação
CREATE OR REPLACE FUNCTION public.dismiss_notification(
  p_notification_id uuid,
  p_user_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notification_reads (notification_id, user_id, dismissed_at)
  VALUES (p_notification_id, p_user_id, now())
  ON CONFLICT (notification_id, user_id) 
  DO UPDATE SET 
    dismissed_at = now();
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Função para registrar clique na ação
CREATE OR REPLACE FUNCTION public.mark_notification_action_clicked(
  p_notification_id uuid,
  p_user_id uuid,
  p_interaction_data jsonb DEFAULT '{}'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notification_reads (notification_id, user_id, action_clicked_at, interaction_data)
  VALUES (p_notification_id, p_user_id, now(), p_interaction_data)
  ON CONFLICT (notification_id, user_id) 
  DO UPDATE SET 
    action_clicked_at = now(),
    interaction_data = EXCLUDED.interaction_data;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Função para criar nova notificação do sistema
CREATE OR REPLACE FUNCTION public.create_system_notification(
  p_type text,
  p_priority text DEFAULT 'normal',
  p_category text DEFAULT 'sistema',
  p_title text,
  p_message text,
  p_action_label text DEFAULT NULL,
  p_action_url text DEFAULT NULL,
  p_action_data jsonb DEFAULT '{}',
  p_context jsonb DEFAULT '{}',
  p_metadata jsonb DEFAULT '{}',
  p_expires_at timestamp with time zone DEFAULT NULL,
  p_auto_dismiss boolean DEFAULT false,
  p_persistent boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO public.system_notifications (
    type, priority, category, title, message, action_label, action_url,
    action_data, context, metadata, expires_at, auto_dismiss, persistent
  ) VALUES (
    p_type, p_priority, p_category, p_title, p_message, p_action_label, p_action_url,
    p_action_data, p_context, p_metadata, p_expires_at, p_auto_dismiss, p_persistent
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Função para limpeza automática de notificações expiradas
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM public.system_notifications 
  WHERE expires_at IS NOT NULL AND expires_at < now();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Row Level Security (RLS)
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

-- Política para system_notifications: todos podem ver notificações não expiradas
CREATE POLICY "Public can view active notifications" ON public.system_notifications
  FOR SELECT USING (expires_at IS NULL OR expires_at > now());

-- Política para notification_reads: usuários só podem ver/modificar suas próprias leituras
CREATE POLICY "Users can manage own reads" ON public.notification_reads
  FOR ALL USING (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE public.system_notifications IS 'Armazena todas as notificações do sistema com controle de expiração e persistência';
COMMENT ON TABLE public.notification_reads IS 'Rastreia quais usuários leram/interagiram com cada notificação';
COMMENT ON VIEW public.vw_unread_notifications IS 'View otimizada para buscar notificações não lidas de um usuário';
COMMENT ON VIEW public.vw_notification_history IS 'Histórico completo de notificações com status de leitura';

-- Inserir algumas notificações de exemplo
INSERT INTO public.system_notifications (type, priority, category, title, message, action_label, action_url, persistent) VALUES
('info', 'normal', 'sistema', 'Novas funcionalidades implementadas!', 'Sistema de cores monocromático aprimorado e formato de número de processo atualizado.', 'Ver detalhes', '/processos', true),
('system', 'high', 'sistema', 'Sistema de notificações ativo', 'O novo sistema de notificações está funcionando. Agora você pode eliminar notificações e elas não serão reexibidas.', 'Entendi', '', false),
('update', 'normal', 'autofix', 'Autofix melhorado', 'Sistema autofix foi aprimorado com recurso de backlog para gerenciar melhorias.', 'Ver Autofix', '/autofix', true);
