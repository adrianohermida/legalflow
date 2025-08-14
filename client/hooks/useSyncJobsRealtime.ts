import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { lf } from '../lib/supabase';
import { useToast } from './use-toast';

interface SyncJob {
  id: string;
  numero_cnj: string;
  status: 'queued' | 'running' | 'ok' | 'error';
  provider: 'advise' | 'escavador';
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

export function useSyncJobsRealtime(numero_cnj: string) {
  const [currentJob, setCurrentJob] = useState<SyncJob | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!numero_cnj) return;

    // Buscar último job do processo
    const fetchLastJob = async () => {
      const { data } = await lf
        .from('sync_jobs')
        .select('*')
        .eq('numero_cnj', numero_cnj)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setCurrentJob(data);
      }
    };

    fetchLastJob();

    // Configurar subscription para sync_jobs
    const subscription = lf
      .channel('sync_jobs_channel')
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
          
          const syncJob = payload.new as SyncJob;
          setCurrentJob(syncJob);

          // Se job foi completado, mostrar toast e invalidar queries
          if (payload.eventType === 'UPDATE' && syncJob.status === 'ok') {
            toast({
              title: "Sincronização concluída",
              description: `Dados do processo atualizados com sucesso (Job #${syncJob.id})`
            });

            // Invalidar todas as queries relacionadas ao processo
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

          // Se job falhou, mostrar erro
          if (payload.eventType === 'UPDATE' && syncJob.status === 'error') {
            toast({
              title: "Erro na sincronização",
              description: syncJob.error_message || `Falha no Job #${syncJob.id}`,
              variant: "destructive"
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [numero_cnj, queryClient, toast]);

  return currentJob;
}
