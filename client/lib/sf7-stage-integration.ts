import { lf } from "./supabase";

// ============================================================================
// SF-7: STAGE INTEGRATION - Automação para eventos vindos de etapas
// ============================================================================

/**
 * Interface para criação de evento automático a partir de uma etapa
 */
export interface AutoEventFromStage {
  stage_instance_id: string;
  numero_cnj: string;
  cliente_cpfcnpj?: string;
  title: string;
  description?: string;
  event_type?: 'reuniao' | 'audiencia' | 'prazo' | 'entrega' | 'compromisso' | 'videoconferencia' | 'outros';
  starts_at: string; // ISO timestamp
  ends_at?: string;
  location?: string;
  video_link?: string;
  priority?: 'baixa' | 'normal' | 'alta' | 'urgente';
}

/**
 * Cria um evento na agenda automaticamente a partir de uma etapa do processo
 * Esta função implementa a automação SF-7: "Se evento veio de etapa, persistir stage_instance_id"
 */
export async function createEventFromStage(eventData: AutoEventFromStage) {
  try {
    // Usar a função RPC para criação rápida, mas com stage_instance_id
    const { data: eventoId, error } = await lf.rpc("sf7_create_evento_rapido", {
      p_title: eventData.title,
      p_starts_at: eventData.starts_at,
      p_event_type: eventData.event_type || 'compromisso',
      p_cnj_or_cpf: eventData.numero_cnj,
      p_video_link: eventData.video_link || null,
      p_description: eventData.description || null,
      p_location: eventData.location || null,
    });

    if (error) throw error;

    // Após criação, atualizar com stage_instance_id e metadados específicos
    const { error: updateError } = await lf
      .from("eventos_agenda")
      .update({
        stage_instance_id: eventData.stage_instance_id,
        priority: eventData.priority || 'normal',
        ends_at: eventData.ends_at || null,
        metadata: {
          auto_created_from_stage: true,
          stage_instance_id: eventData.stage_instance_id,
          numero_cnj: eventData.numero_cnj,
          created_method: 'stage_automation',
          timezone: 'America/Sao_Paulo',
          original_event_data: eventData,
        }
      })
      .eq("id", eventoId);

    if (updateError) throw updateError;

    return { success: true, evento_id: eventoId };
  } catch (error) {
    console.error("Erro ao criar evento a partir da etapa:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca eventos relacionados a uma etapa específica
 */
export async function getEventsFromStage(stage_instance_id: string) {
  try {
    const { data, error } = await lf
      .from("eventos_agenda")
      .select("*")
      .eq("stage_instance_id", stage_instance_id)
      .order("starts_at", { ascending: true });

    if (error) throw error;
    return { success: true, events: data || [] };
  } catch (error) {
    console.error("Erro ao buscar eventos da etapa:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Busca eventos relacionados a um processo (CNJ)
 */
export async function getEventsFromProcess(numero_cnj: string) {
  try {
    const { data, error } = await lf.rpc("sf7_list_eventos_periodo", {
      data_inicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias atrás
      data_fim: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano no futuro
      p_numero_cnj: numero_cnj,
    });

    if (error) throw error;
    return { success: true, events: data || [] };
  } catch (error) {
    console.error("Erro ao buscar eventos do processo:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualiza status de um evento (por exemplo, quando uma etapa é concluída)
 */
export async function updateEventStatusFromStage(
  stage_instance_id: string, 
  new_status: 'agendado' | 'confirmado' | 'em_andamento' | 'realizado' | 'cancelado' | 'reagendado'
) {
  try {
    const { data, error } = await lf
      .from("eventos_agenda")
      .update({ 
        status: new_status,
        metadata: lf.sql`
          COALESCE(metadata, '{}'::jsonb) || 
          jsonb_build_object(
            'status_updated_from_stage', true,
            'status_updated_at', (now() AT TIME ZONE 'America/Sao_Paulo')::text,
            'previous_status_update_method', 'stage_automation'
          )
        `
      })
      .eq("stage_instance_id", stage_instance_id)
      .select();

    if (error) throw error;
    return { success: true, updated_events: data || [] };
  } catch (error) {
    console.error("Erro ao atualizar status dos eventos da etapa:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Cancela eventos de uma etapa (por exemplo, quando a etapa é removida)
 */
export async function cancelEventsFromStage(stage_instance_id: string, reason?: string) {
  return updateEventStatusFromStage(stage_instance_id, 'cancelado');
}

/**
 * Reagenda eventos de uma etapa
 */
export async function rescheduleEventsFromStage(
  stage_instance_id: string, 
  new_starts_at: string,
  new_ends_at?: string
) {
  try {
    const { data, error } = await lf
      .from("eventos_agenda")
      .update({ 
        starts_at: new_starts_at,
        ends_at: new_ends_at,
        status: 'reagendado',
        metadata: lf.sql`
          COALESCE(metadata, '{}'::jsonb) || 
          jsonb_build_object(
            'rescheduled_from_stage', true,
            'rescheduled_at', (now() AT TIME ZONE 'America/Sao_Paulo')::text,
            'original_starts_at', starts_at::text
          )
        `
      })
      .eq("stage_instance_id", stage_instance_id)
      .select();

    if (error) throw error;
    return { success: true, rescheduled_events: data || [] };
  } catch (error) {
    console.error("Erro ao reagendar eventos da etapa:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Hook React para integração com etapas
 */
export const useSF7StageIntegration = () => {
  return {
    createEventFromStage,
    getEventsFromStage,
    getEventsFromProcess,
    updateEventStatusFromStage,
    cancelEventsFromStage,
    rescheduleEventsFromStage,
  };
};

/**
 * Tipos de eventos automáticos baseados em tipos de etapas
 */
export const STAGE_EVENT_TEMPLATES = {
  audiencia: {
    event_type: 'audiencia' as const,
    priority: 'alta' as const,
    title_prefix: 'Audiência',
  },
  prazo: {
    event_type: 'prazo' as const,
    priority: 'urgente' as const,
    title_prefix: 'Prazo',
  },
  reuniao_cliente: {
    event_type: 'reuniao' as const,
    priority: 'normal' as const,
    title_prefix: 'Reunião com Cliente',
  },
  entrega_documento: {
    event_type: 'entrega' as const,
    priority: 'alta' as const,
    title_prefix: 'Entrega de Documento',
  },
} as const;

/**
 * Utility para gerar título automático baseado no tipo de etapa
 */
export function generateEventTitleFromStage(
  stage_type: keyof typeof STAGE_EVENT_TEMPLATES,
  numero_cnj: string,
  custom_title?: string
): string {
  const template = STAGE_EVENT_TEMPLATES[stage_type];
  if (custom_title) {
    return `${template.title_prefix}: ${custom_title}`;
  }
  return `${template.title_prefix} - Processo ${numero_cnj}`;
}
