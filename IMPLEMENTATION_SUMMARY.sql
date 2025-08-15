-- Inserir notificação sobre as melhorias implementadas
INSERT INTO public.system_notifications (
  type, 
  priority, 
  category, 
  title, 
  message, 
  action_label, 
  action_url, 
  persistent,
  metadata
) VALUES (
  'system',
  'high',
  'sistema',
  'Melhorias importantes implementadas!',
  'Sistema monocromático aprimorado com mais variações de cor, formato de número de processo atualizado com polos, sistema de notificações com histórico completo e backlog do autofix com pipeline de melhorias foram implementados com sucesso.',
  'Ver Autofix',
  '/autofix',
  true,
  '{
    "improvements": [
      "Sistema de cores monocromático expandido",
      "Formato de número de processo com polo ativo x polo passivo", 
      "Sistema de notificações com histórico e marcação de leitura",
      "Backlog do autofix com pipeline de melhorias"
    ],
    "completion_date": "' || now()::text || '"
  }'::jsonb
);
