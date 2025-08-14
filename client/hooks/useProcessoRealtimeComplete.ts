import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, lf } from '../lib/supabase';
import { useToast } from './use-toast';

export function useProcessoRealtimeComplete(numero_cnj: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!numero_cnj) return;

    const subscriptions: any[] = [];

    // 1. Movimentações
    const movimentacoesChannel = supabase
      .channel('movimentacoes_processo')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'movimentacoes',
          filter: `numero_cnj=eq.${numero_cnj}`
        },
        (payload) => {
          console.log('Movimentação update:', payload);
          queryClient.invalidateQueries({
            queryKey: ['movimentacoes', numero_cnj]
          });
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Nova movimentação",
              description: "Processo atualizado com nova movimentação"
            });
          }
        }
      )
      .subscribe();

    subscriptions.push(movimentacoesChannel);

    // 2. Publicações
    const publicacoesChannel = supabase
      .channel('publicacoes_processo')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'publicacoes',
          filter: `numero_cnj=eq.${numero_cnj}`
        },
        (payload) => {
          console.log('Publicação update:', payload);
          queryClient.invalidateQueries({
            queryKey: ['publicacoes', numero_cnj]
          });
          queryClient.invalidateQueries({
            queryKey: ['publicacoes-unificadas', numero_cnj]
          });
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Nova publicação",
              description: "Nova publicação vinculada ao processo"
            });
          }
        }
      )
      .subscribe();

    subscriptions.push(publicacoesChannel);

    // 3. AI Messages (para todos os threads do processo)
    const aiMessagesChannel = supabase
      .channel('ai_messages_processo')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_messages'
        },
        async (payload) => {
          // Verificar se a mensagem é de um thread deste processo
          const { data: threadLink } = await supabase
            .from('thread_links')
            .select('properties')
            .eq('id', payload.new.thread_link_id)
            .single();

          if (threadLink?.properties?.numero_cnj === numero_cnj) {
            console.log('AI Message update:', payload);
            queryClient.invalidateQueries({
              queryKey: ['ai-messages', payload.new.thread_link_id]
            });
            queryClient.invalidateQueries({
              queryKey: ['thread-links', numero_cnj]
            });
          }
        }
      )
      .subscribe();

    subscriptions.push(aiMessagesChannel);

    // 4. Activities (tarefas)
    const activitiesChannel = supabase
      .channel('activities_processo')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'legalflow',
          table: 'activities',
          filter: `numero_cnj=eq.${numero_cnj}`
        },
        (payload) => {
          console.log('Activity update:', payload);
          queryClient.invalidateQueries({
            queryKey: ['activities', numero_cnj]
          });

          if (payload.eventType === 'INSERT') {
            toast({
              title: "Nova tarefa criada",
              description: "Tarefa adicionada ao processo"
            });
          }
        }
      )
      .subscribe();

    subscriptions.push(activitiesChannel);

    // 5. Eventos da agenda
    const eventosChannel = lf
      .channel('eventos_agenda_processo')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'legalflow',
          table: 'eventos_agenda',
          filter: `numero_cnj=eq.${numero_cnj}`
        },
        (payload) => {
          console.log('Evento agenda update:', payload);
          queryClient.invalidateQueries({
            queryKey: ['eventos-agenda', numero_cnj]
          });
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Evento agendado",
              description: "Novo evento adicionado à agenda do processo"
            });
          }
        }
      )
      .subscribe();

    subscriptions.push(eventosChannel);

    // 6. Sync Jobs (para feedback de sincronização)
    const syncJobsChannel = lf
      .channel('sync_jobs_processo')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'legalflow',
          table: 'sync_jobs',
          filter: `numero_cnj=eq.${numero_cnj}`
        },
        (payload) => {
          console.log('Sync job update:', payload);
          
          if (payload.eventType === 'UPDATE') {
            const job = payload.new as any;
            
            if (job.status === 'ok') {
              toast({
                title: "Sincronização concluída",
                description: `Dados do processo atualizados (Job #${job.id.slice(0, 8)})`
              });
              
              // Invalidar todas as queries do processo
              queryClient.invalidateQueries({
                queryKey: ['processo', numero_cnj]
              });
              queryClient.invalidateQueries({
                queryKey: ['movimentacoes', numero_cnj]
              });
              queryClient.invalidateQueries({
                queryKey: ['publicacoes', numero_cnj]
              });
              queryClient.invalidateQueries({
                queryKey: ['partes', numero_cnj]
              });
              queryClient.invalidateQueries({
                queryKey: ['documentos', numero_cnj]
              });
            }
            
            if (job.status === 'error') {
              toast({
                title: "Erro na sincronização",
                description: job.error || `Falha no Job #${job.id.slice(0, 8)}`,
                variant: "destructive"
              });
            }
          }
        }
      )
      .subscribe();

    subscriptions.push(syncJobsChannel);

    // 7. Documentos
    const documentosChannel = supabase
      .channel('documentos_processo')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents'
        },
        (payload) => {
          // Verificar se é deste processo
          const doc = payload.new || payload.old;
          if (doc?.numero_cnj === numero_cnj) {
            console.log('Documento update:', payload);
            queryClient.invalidateQueries({
              queryKey: ['documentos', numero_cnj]
            });
            
            if (payload.eventType === 'INSERT') {
              toast({
                title: "Novo documento",
                description: "Documento anexado ao processo"
              });
            }
          }
        }
      )
      .subscribe();

    subscriptions.push(documentosChannel);

    // 8. Peticões
    const peticoesChannel = supabase
      .channel('peticoes_processo')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'peticoes',
          filter: `numero_cnj=eq.${numero_cnj}`
        },
        (payload) => {
          console.log('Petição update:', payload);
          queryClient.invalidateQueries({
            queryKey: ['documentos', numero_cnj]
          });
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: "Nova petição",
              description: "Petição adicionada ao processo"
            });
          }
        }
      )
      .subscribe();

    subscriptions.push(peticoesChannel);

    // Cleanup
    return () => {
      subscriptions.forEach(subscription => {
        subscription.unsubscribe();
      });
    };
  }, [numero_cnj, queryClient, toast]);
}
