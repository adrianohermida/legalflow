import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface RealtimeUpdatesConfig {
  numero_cnj?: string;
  enableMovimentacoes?: boolean;
  enablePublicacoes?: boolean;
  enableAiMessages?: boolean;
  enableActivities?: boolean;
  enableEventos?: boolean;
  enableDocuments?: boolean;
}

export function useRealtimeUpdates(config: RealtimeUpdatesConfig = {}) {
  const queryClient = useQueryClient();
  const {
    numero_cnj,
    enableMovimentacoes = false,
    enablePublicacoes = false,
    enableAiMessages = false,
    enableActivities = false,
    enableEventos = false,
    enableDocuments = false
  } = config;

  useEffect(() => {
    const subscriptions: any[] = [];

    // Subscription para movimentações
    if (enableMovimentacoes) {
      const movimentacoesSubscription = supabase
        .channel(`movimentacoes-${numero_cnj || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'movimentacoes',
            ...(numero_cnj && { filter: `numero_cnj=eq.${numero_cnj}` })
          },
          (payload) => {
            console.log('Movimentação atualizada:', payload);
            
            // Invalidar queries relacionadas
            queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
            queryClient.invalidateQueries({ queryKey: ['vw_timeline_processo'] });
            
            if (numero_cnj) {
              queryClient.invalidateQueries({ queryKey: ['movimentacoes', numero_cnj] });
            }
          }
        )
        .subscribe();

      subscriptions.push(movimentacoesSubscription);
    }

    // Subscription para publicações
    if (enablePublicacoes) {
      const publicacoesSubscription = supabase
        .channel(`publicacoes-${numero_cnj || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'publicacoes',
            ...(numero_cnj && { filter: `numero_cnj=eq.${numero_cnj}` })
          },
          (payload) => {
            console.log('Publicação atualizada:', payload);
            
            // Invalidar queries relacionadas
            queryClient.invalidateQueries({ queryKey: ['publicacoes'] });
            queryClient.invalidateQueries({ queryKey: ['publicacoes-unificadas'] });
            
            if (numero_cnj) {
              queryClient.invalidateQueries({ queryKey: ['publicacoes-unificadas', numero_cnj] });
            }
          }
        )
        .subscribe();

      subscriptions.push(publicacoesSubscription);
    }

    // Subscription para mensagens de IA
    if (enableAiMessages) {
      const aiMessagesSubscription = supabase
        .channel('ai-messages')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ai_messages'
          },
          (payload) => {
            console.log('Mensagem IA atualizada:', payload);
            
            // Invalidar queries de mensagens
            queryClient.invalidateQueries({ queryKey: ['ai-messages'] });
            
            // Se payload contém thread_link_id, invalidar específicamente
            if (payload.new && 'thread_link_id' in payload.new) {
              queryClient.invalidateQueries({
                queryKey: ['ai-messages', (payload.new as any).thread_link_id]
              });
            }
          }
        )
        .subscribe();

      subscriptions.push(aiMessagesSubscription);
    }

    // Subscription para atividades/tarefas
    if (enableActivities) {
      const activitiesSubscription = supabase
        .channel(`activities-${numero_cnj || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'legalflow',
            table: 'activities',
            ...(numero_cnj && { filter: `numero_cnj=eq.${numero_cnj}` })
          },
          (payload) => {
            console.log('Atividade atualizada:', payload);
            
            // Invalidar queries relacionadas
            queryClient.invalidateQueries({ queryKey: ['activities'] });
            
            if (numero_cnj) {
              queryClient.invalidateQueries({ queryKey: ['activities', numero_cnj] });
            }
          }
        )
        .subscribe();

      subscriptions.push(activitiesSubscription);
    }

    // Subscription para eventos da agenda
    if (enableEventos) {
      const eventosSubscription = supabase
        .channel(`eventos-${numero_cnj || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'legalflow',
            table: 'eventos_agenda',
            ...(numero_cnj && { filter: `numero_cnj=eq.${numero_cnj}` })
          },
          (payload) => {
            console.log('Evento atualizado:', payload);
            
            // Invalidar queries relacionadas
            queryClient.invalidateQueries({ queryKey: ['eventos_agenda'] });
            queryClient.invalidateQueries({ queryKey: ['agenda'] });
            
            if (numero_cnj) {
              queryClient.invalidateQueries({ queryKey: ['eventos_agenda', numero_cnj] });
            }
          }
        )
        .subscribe();

      subscriptions.push(eventosSubscription);
    }

    // Subscription para documentos
    if (enableDocuments) {
      const documentsSubscription = supabase
        .channel(`documents-${numero_cnj || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents'
          },
          (payload) => {
            console.log('Documento atualizado:', payload);
            
            // Verificar se documento é relacionado ao processo
            const documentCnj = payload.new?.metadata?.numero_cnj || payload.old?.metadata?.numero_cnj;
            
            if (!numero_cnj || documentCnj === numero_cnj) {
              queryClient.invalidateQueries({ queryKey: ['documentos'] });
              
              if (numero_cnj) {
                queryClient.invalidateQueries({ queryKey: ['documentos', numero_cnj] });
              }
            }
          }
        )
        .subscribe();

      subscriptions.push(documentsSubscription);

      // Subscription para petições
      const peticoesSubscription = supabase
        .channel(`peticoes-${numero_cnj || 'all'}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'peticoes',
            ...(numero_cnj && { filter: `numero_cnj=eq.${numero_cnj}` })
          },
          (payload) => {
            console.log('Petição atualizada:', payload);
            
            queryClient.invalidateQueries({ queryKey: ['documentos'] });
            
            if (numero_cnj) {
              queryClient.invalidateQueries({ queryKey: ['documentos', numero_cnj] });
            }
          }
        )
        .subscribe();

      subscriptions.push(peticoesSubscription);
    }

    // Subscription para thread_links (chats)
    if (enableAiMessages && numero_cnj) {
      const threadLinksSubscription = supabase
        .channel(`thread-links-${numero_cnj}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'thread_links',
            filter: `properties->>numero_cnj=eq.${numero_cnj}`
          },
          (payload) => {
            console.log('Thread link atualizado:', payload);
            
            queryClient.invalidateQueries({ queryKey: ['thread-links', numero_cnj] });
          }
        )
        .subscribe();

      subscriptions.push(threadLinksSubscription);
    }

    // Subscription para configurações de monitoramento
    if (numero_cnj) {
      const monitoringSubscription = supabase
        .channel(`monitoring-${numero_cnj}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'legalflow',
            table: 'monitoring_settings',
            filter: `numero_cnj=eq.${numero_cnj}`
          },
          (payload) => {
            console.log('Configuração de monitoramento atualizada:', payload);
            
            queryClient.invalidateQueries({ 
              queryKey: ['monitoring-settings', numero_cnj] 
            });
          }
        )
        .subscribe();

      subscriptions.push(monitoringSubscription);
    }

    // Cleanup function
    return () => {
      subscriptions.forEach(subscription => {
        supabase.removeChannel(subscription);
      });
    };
  }, [
    queryClient,
    numero_cnj,
    enableMovimentacoes,
    enablePublicacoes,
    enableAiMessages,
    enableActivities,
    enableEventos,
    enableDocuments
  ]);
}

// Hook específico para ProcessoDetail
export function useProcessoRealtimeUpdates(numero_cnj: string) {
  return useRealtimeUpdates({
    numero_cnj,
    enableMovimentacoes: true,
    enablePublicacoes: true,
    enableAiMessages: true,
    enableActivities: true,
    enableEventos: true,
    enableDocuments: true
  });
}

// Hook específico para Inbox
export function useInboxRealtimeUpdates() {
  return useRealtimeUpdates({
    enableMovimentacoes: true,
    enablePublicacoes: true
  });
}

// Hook específico para Chat
export function useChatRealtimeUpdates(numero_cnj?: string) {
  return useRealtimeUpdates({
    numero_cnj,
    enableAiMessages: true
  });
}

// Hook específico para Agenda
export function useAgendaRealtimeUpdates() {
  return useRealtimeUpdates({
    enableEventos: true,
    enableActivities: true
  });
}

export default useRealtimeUpdates;
