// SF-2: Processo > Detalhes — Chat Multi-thread + Memória
// Database operations and helper functions

import { supabase, lf } from "./supabase";

export interface ThreadLinkData {
  id?: string;
  numero_cnj: string;
  context_type: string;
  properties: {
    numero_cnj: string;
    titulo: string;
    canal: string;
    tipo: string;
    contexto?: any;
    criado_em: string;
    tags?: string[];
    participantes?: string[];
  };
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id?: string;
  thread_link_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: {
    contexto_processo?: any;
    timestamp: string;
    attachments?: any[];
    model?: string;
    tokens_used?: number;
    action_type?: string;
    result?: any;
    context_used?: boolean;
  };
  attachments?: any[];
  created_at?: string;
}

export interface ProcessContext {
  processo: any;
  ultimasMovimentacoes: any[];
  ultimasPublicacoes: any[];
  tarefasAbertas: any[];
  eventosProximos: any[];
  documentos?: any[];
  partes?: any[];
}

export class SF2ChatOperations {
  /**
   * Criar nova thread de conversa
   */
  static async createThread(
    data: Omit<ThreadLinkData, "id" | "created_at" | "updated_at">,
  ): Promise<ThreadLinkData> {
    const { data: newThread, error } = await supabase
      .from("thread_links")
      .insert({
        numero_cnj: data.numero_cnj,
        context_type: data.context_type,
        properties: {
          ...data.properties,
          criado_em: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (error) throw error;
    return newThread;
  }

  /**
   * Buscar threads por processo CNJ
   */
  static async getThreadsByProcesso(
    numero_cnj: string,
  ): Promise<ThreadLinkData[]> {
    const { data, error } = await supabase
      .from("thread_links")
      .select("*")
      .eq("properties->>numero_cnj", numero_cnj)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Buscar mensagens por thread
   */
  static async getMessagesByThread(thread_id: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("thread_link_id", thread_id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Adicionar mensagem ao thread
   */
  static async addMessage(
    message: Omit<ChatMessage, "id" | "created_at">,
  ): Promise<ChatMessage> {
    const { data, error } = await supabase
      .from("ai_messages")
      .insert({
        thread_link_id: message.thread_link_id,
        role: message.role,
        content: message.content,
        metadata: {
          ...message.metadata,
          timestamp: new Date().toISOString(),
        },
        attachments: message.attachments || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Atualizar timestamp da thread
    await this.updateThreadTimestamp(message.thread_link_id);

    return data;
  }

  /**
   * Atualizar timestamp da thread
   */
  static async updateThreadTimestamp(thread_id: string): Promise<void> {
    const { error } = await supabase
      .from("thread_links")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", thread_id);

    if (error) throw error;
  }

  /**
   * Buscar contexto completo do processo
   */
  static async getProcessContext(numero_cnj: string): Promise<ProcessContext> {
    try {
      const [
        processoResult,
        movimentacoesResult,
        publicacoesResult,
        tarefasResult,
        eventosResult,
        documentosResult,
        partesResult,
      ] = await Promise.allSettled([
        supabase
          .from("processos")
          .select("*")
          .eq("numero_cnj", numero_cnj)
          .single(),
        supabase
          .from("movimentacoes")
          .select("*")
          .eq("numero_cnj", numero_cnj)
          .order("data_movimentacao", { ascending: false })
          .limit(10),
        supabase
          .from("vw_publicacoes_unificadas")
          .select("*")
          .eq("numero_cnj", numero_cnj)
          .order("occured_at", { ascending: false })
          .limit(10),
        lf
          .from("activities")
          .select("*")
          .eq("numero_cnj", numero_cnj)
          .in("status", ["pending", "in_progress"])
          .limit(20),
        lf
          .from("eventos_agenda")
          .select("*")
          .eq("numero_cnj", numero_cnj)
          .gte("scheduled_at", new Date().toISOString())
          .limit(10),
        supabase
          .from("documents")
          .select("*")
          .eq("metadata->>numero_cnj", numero_cnj)
          .limit(20),
        lf.from("partes_processo").select("*").eq("numero_cnj", numero_cnj),
      ]);

      return {
        processo:
          processoResult.status === "fulfilled"
            ? processoResult.value.data
            : null,
        ultimasMovimentacoes:
          movimentacoesResult.status === "fulfilled"
            ? movimentacoesResult.value.data || []
            : [],
        ultimasPublicacoes:
          publicacoesResult.status === "fulfilled"
            ? publicacoesResult.value.data || []
            : [],
        tarefasAbertas:
          tarefasResult.status === "fulfilled"
            ? tarefasResult.value.data || []
            : [],
        eventosProximos:
          eventosResult.status === "fulfilled"
            ? eventosResult.value.data || []
            : [],
        documentos:
          documentosResult.status === "fulfilled"
            ? documentosResult.value.data || []
            : [],
        partes:
          partesResult.status === "fulfilled"
            ? partesResult.value.data || []
            : [],
      };
    } catch (error) {
      console.error("Erro ao buscar contexto do processo:", error);
      throw error;
    }
  }

  /**
   * Executar quick action - Criar Tarefa
   */
  static async executeCreateTask(params: {
    numero_cnj: string;
    thread_id: string;
    titulo: string;
    descricao: string;
    due_date?: string;
  }): Promise<any> {
    const { data, error } = await lf
      .from("activities")
      .insert({
        numero_cnj: params.numero_cnj,
        title: params.titulo,
        description: params.descricao,
        due_at:
          params.due_date ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        metadata: {
          created_via: "chat",
          thread_id: params.thread_id,
          quick_action: true,
          sf2_integration: true,
        },
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar ação como mensagem do sistema
    await this.addMessage({
      thread_link_id: params.thread_id,
      role: "system",
      content: `✅ Tarefa criada: "${params.titulo}"`,
      metadata: {
        action_type: "CREATE_TASK",
        result: data,
        timestamp: new Date().toISOString(),
      },
    });

    return data;
  }

  /**
   * Executar quick action - Vincular Ticket
   */
  static async executeLinkTicket(params: {
    thread_id: string;
    ticket_description: string;
  }): Promise<any> {
    // Criar entrada na tabela ticket_threads
    const { data, error } = await lf
      .from("ticket_threads")
      .insert({
        thread_link_id: params.thread_id,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar ação como mensagem do sistema
    await this.addMessage({
      thread_link_id: params.thread_id,
      role: "system",
      content: `🎫 Ticket vinculado ao thread`,
      metadata: {
        action_type: "LINK_TICKET",
        result: data,
        timestamp: new Date().toISOString(),
      },
    });

    return data;
  }

  /**
   * Executar quick action - Solicitar Documento
   */
  static async executeRequestDocument(params: {
    numero_cnj: string;
    thread_id: string;
    tipo_documento: string;
    justificativa: string;
    prazo?: string;
  }): Promise<any> {
    const { data, error } = await lf
      .from("activities")
      .insert({
        numero_cnj: params.numero_cnj,
        title: `Solicitação: ${params.tipo_documento}`,
        description: params.justificativa,
        due_at:
          params.prazo ||
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
        activity_type: "document_request",
        metadata: {
          created_via: "chat",
          thread_id: params.thread_id,
          quick_action: true,
          document_request: true,
          sf2_integration: true,
          document_type: params.tipo_documento,
        },
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar ação como mensagem do sistema
    await this.addMessage({
      thread_link_id: params.thread_id,
      role: "system",
      content: `📄 Documento solicitado: ${params.tipo_documento}`,
      metadata: {
        action_type: "REQUEST_DOCUMENT",
        result: data,
        timestamp: new Date().toISOString(),
      },
    });

    return data;
  }

  /**
   * Executar quick action - Concluir Etapa
   */
  static async executeCompleteStep(params: {
    numero_cnj: string;
    thread_id: string;
    nome_etapa: string;
    observacoes: string;
  }): Promise<any> {
    const { data, error } = await lf
      .from("activities")
      .insert({
        numero_cnj: params.numero_cnj,
        title: `Etapa concluída: ${params.nome_etapa}`,
        description: params.observacoes,
        status: "completed",
        completed_at: new Date().toISOString(),
        metadata: {
          created_via: "chat",
          thread_id: params.thread_id,
          quick_action: true,
          step_completion: true,
          sf2_integration: true,
          step_name: params.nome_etapa,
        },
      })
      .select()
      .single();

    if (error) throw error;

    // Registrar ação como mensagem do sistema
    await this.addMessage({
      thread_link_id: params.thread_id,
      role: "system",
      content: `✅ Etapa concluída: ${params.nome_etapa}`,
      metadata: {
        action_type: "COMPLETE_STEP",
        result: data,
        timestamp: new Date().toISOString(),
      },
    });

    return data;
  }

  /**
   * Buscar estatísticas de uso do chat
   */
  static async getChatStats(numero_cnj: string): Promise<{
    total_threads: number;
    total_messages: number;
    quick_actions_executed: number;
    last_activity: string | null;
  }> {
    try {
      // Buscar threads
      const { data: threads } = await supabase
        .from("thread_links")
        .select("id, created_at")
        .eq("properties->>numero_cnj", numero_cnj);

      if (!threads || threads.length === 0) {
        return {
          total_threads: 0,
          total_messages: 0,
          quick_actions_executed: 0,
          last_activity: null,
        };
      }

      const threadIds = threads.map((t) => t.id);

      // Buscar mensagens
      const { data: messages } = await supabase
        .from("ai_messages")
        .select("id, metadata, created_at")
        .in("thread_link_id", threadIds);

      // Contar quick actions
      const quickActions =
        messages?.filter(
          (m) => m.metadata?.action_type || m.metadata?.quick_action,
        ) || [];

      // Última atividade
      const lastActivity =
        messages && messages.length > 0
          ? messages.sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime(),
            )[0].created_at
          : null;

      return {
        total_threads: threads.length,
        total_messages: messages?.length || 0,
        quick_actions_executed: quickActions.length,
        last_activity: lastActivity,
      };
    } catch (error) {
      console.error("Erro ao buscar estatísticas do chat:", error);
      return {
        total_threads: 0,
        total_messages: 0,
        quick_actions_executed: 0,
        last_activity: null,
      };
    }
  }

  /**
   * Exportar histórico de thread como markdown
   */
  static async exportThreadToMarkdown(thread_id: string): Promise<string> {
    try {
      // Buscar thread
      const { data: thread } = await supabase
        .from("thread_links")
        .select("*")
        .eq("id", thread_id)
        .single();

      if (!thread) throw new Error("Thread não encontrado");

      // Buscar mensagens
      const messages = await this.getMessagesByThread(thread_id);

      // Gerar markdown
      let markdown = `# ${thread.properties.titulo}\n\n`;
      markdown += `**Processo:** ${thread.properties.numero_cnj}\n`;
      markdown += `**Canal:** ${thread.properties.canal}\n`;
      markdown += `**Tipo:** ${thread.properties.tipo}\n`;
      markdown += `**Criado em:** ${new Date(thread.created_at).toLocaleString("pt-BR")}\n\n`;
      markdown += `---\n\n`;

      for (const message of messages) {
        const timestamp = new Date(message.created_at!).toLocaleString("pt-BR");
        const roleIcon =
          message.role === "user"
            ? "👤"
            : message.role === "assistant"
              ? "🤖"
              : "⚙️";

        markdown += `## ${roleIcon} ${message.role.toUpperCase()} - ${timestamp}\n\n`;
        markdown += `${message.content}\n\n`;

        if (message.attachments && message.attachments.length > 0) {
          markdown += `**Anexos:**\n`;
          for (const attachment of message.attachments) {
            markdown += `- ${attachment.name} (${attachment.type})\n`;
          }
          markdown += `\n`;
        }

        if (message.metadata?.action_type) {
          markdown += `*Ação executada: ${message.metadata.action_type}*\n\n`;
        }

        markdown += `---\n\n`;
      }

      return markdown;
    } catch (error) {
      console.error("Erro ao exportar thread:", error);
      throw error;
    }
  }
}

// Tipos utilitários para integração com AdvogaAI Tools
export interface AdvogaAIToolExecution {
  tool_id: string;
  parameters: Record<string, any>;
  context: {
    numero_cnj: string;
    thread_link_id: string;
    user_message: string;
  };
}

export const SF2_TOOL_MAPPINGS = {
  criar_tarefa: "CREATE_TASK",
  vincular_ticket: "LINK_TICKET",
  solicitar_documento: "REQUEST_DOCUMENT",
  concluir_etapa: "COMPLETE_STEP",
} as const;

export type SF2QuickActionType = keyof typeof SF2_TOOL_MAPPINGS;
