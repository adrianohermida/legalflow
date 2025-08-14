import {
  supabase,
  lf,
  legalflow,
  supabaseConfigured,
  type PublicDatabase,
  type LegalFlowDatabase,
} from "./supabase";

// Export lf for testing utilities
export { lf };

// Check if Supabase is properly configured
function checkSupabaseConfig() {
  if (!supabaseConfigured) {
    throw new Error(
      "Banco de dados não configurado. Configure as credenciais do Supabase para acessar os dados.",
    );
  }
}

// Type aliases for easier use
type PublicTables = PublicDatabase["public"]["Tables"];
type LegalFlowTables = LegalFlowDatabase["legalflow"]["Tables"];

// PUBLIC SCHEMA TYPES (AdvogaAI - PRESERVE)
type Cliente = PublicTables["clientes"]["Row"];
type Processo = PublicTables["processos"]["Row"];
type Advogado = PublicTables["advogados"]["Row"];
type Movimentacao = PublicTables["movimentacoes"]["Row"];
type Publicacao = PublicTables["publicacoes"]["Row"];
type Lead = PublicTables["leads"]["Row"];
type Peticao = PublicTables["peticoes"]["Row"];

// LEGALFLOW SCHEMA TYPES (new)
type JourneyTemplate = LegalFlowTables["journey_templates"]["Row"];
type JourneyTemplateStage = LegalFlowTables["journey_template_stages"]["Row"];
type JourneyInstance = LegalFlowTables["journey_instances"]["Row"];
type StageInstance = LegalFlowTables["stage_instances"]["Row"];
type StageType = LegalFlowTables["stage_types"]["Row"];
type PlanoPagamento = LegalFlowTables["planos_pagamento"]["Row"];
type ParcelaPagamento = LegalFlowTables["parcelas_pagamento"]["Row"];
type EventoAgenda = LegalFlowTables["eventos_agenda"]["Row"];
type FormDefinition = LegalFlowTables["form_definitions"]["Row"];
type FormResponse = LegalFlowTables["form_responses"]["Row"];
type DocumentRequirement = LegalFlowTables["document_requirements"]["Row"];
type DocumentUpload = LegalFlowTables["document_uploads"]["Row"];

// ============================================================================
// PUBLIC SCHEMA - ADVOGAAI TABLES (PRESERVE EXISTING CONNECTIONS)
// ============================================================================

export const clientesApi = {
  async getAll() {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(cpfcnpj: string) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("cpfcnpj", cpfcnpj)
      .single();

    if (error) throw error;
    return data;
  },

  async create(cliente: PublicTables["clientes"]["Insert"]) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("clientes")
      .insert(cliente)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(cpfcnpj: string, updates: PublicTables["clientes"]["Update"]) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("clientes")
      .update(updates)
      .eq("cpfcnpj", cpfcnpj)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(cpfcnpj: string) {
    checkSupabaseConfig();
    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("cpfcnpj", cpfcnpj);

    if (error) throw error;
    return true;
  },
};

export const processosApi = {
  async getAll() {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("processos")
      .select(
        `
        *,
        clientes_processos(
          clientes(nome, cpfcnpj)
        ),
        advogados_processos(
          advogados(nome, oab)
        )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(numero_cnj: string) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("processos")
      .select(
        `
        *,
        clientes_processos(
          clientes(nome, cpfcnpj, whatsapp)
        ),
        advogados_processos(
          advogados(nome, oab)
        )
      `,
      )
      .eq("numero_cnj", numero_cnj)
      .single();

    if (error) throw error;
    return data;
  },

  async create(processo: PublicTables["processos"]["Insert"]) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("processos")
      .insert(processo)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(
    numero_cnj: string,
    updates: PublicTables["processos"]["Update"],
  ) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("processos")
      .update(updates)
      .eq("numero_cnj", numero_cnj)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export const advogadosApi = {
  async getAll() {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("advogados")
      .select("*")
      .order("nome");

    if (error) throw error;
    return data;
  },

  async getByOab(oab: number) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("advogados")
      .select("*")
      .eq("oab", oab)
      .single();

    if (error) throw error;
    return data;
  },
};

export const movimentacoesApi = {
  async getByProcesso(numero_cnj: string) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("movimentacoes")
      .select("*")
      .eq("numero_cnj", numero_cnj)
      .order("data_movimentacao", { ascending: false });

    if (error) throw error;
    return data;
  },
};

export const publicacoesApi = {
  async getByProcesso(numero_cnj: string) {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("publicacoes")
      .select("*")
      .eq("numero_cnj", numero_cnj)
      .order("data_publicacao", { ascending: false });

    if (error) throw error;
    return data;
  },
};

export const leadsApi = {
  async getAll() {
    checkSupabaseConfig();
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },
};

// ============================================================================
// LEGALFLOW SCHEMA - NEW TABLES
// ============================================================================

export const journeyTemplatesApi = {
  async getAll() {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("journey_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("journey_templates")
      .select(
        `
        *,
        journey_template_stages(
          *,
          stage_types(*)
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(template: LegalFlowTables["journey_templates"]["Insert"]) {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("journey_templates")
      .insert(template)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(
    id: string,
    updates: LegalFlowTables["journey_templates"]["Update"],
  ) {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("journey_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export const journeyInstancesApi = {
  async getAll() {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("journey_instances")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("journey_instances")
      .select(
        `
        *,
        stage_instances(*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(instance: LegalFlowTables["journey_instances"]["Insert"]) {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("journey_instances")
      .insert(instance)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getByCliente(cpfcnpj: string) {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("journey_instances")
      .select("*")
      .eq("cliente_cpfcnpj", cpfcnpj)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getByProcesso(numero_cnj: string) {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("journey_instances")
      .select("*")
      .eq("processo_numero_cnj", numero_cnj)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },
};

export const stageTypesApi = {
  async getAll() {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("stage_types")
      .select("*")
      .order("id");

    if (error) throw error;
    return data;
  },
};

export const planosPagamentoApi = {
  async getAll() {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("planos_pagamento")
      .select(
        `
        *,
        parcelas_pagamento(*)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async getById(id: string) {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("planos_pagamento")
      .select(
        `
        *,
        parcelas_pagamento(*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(plano: LegalFlowTables["planos_pagamento"]["Insert"]) {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("planos_pagamento")
      .insert(plano)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getByCliente(cpfcnpj: string) {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("planos_pagamento")
      .select(
        `
        *,
        parcelas_pagamento(*)
      `,
      )
      .eq("cliente_cpfcnpj", cpfcnpj)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },
};

export const eventosAgendaApi = {
  async getAll() {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("eventos_agenda")
      .select("*")
      .order("start_time");

    if (error) throw error;
    return data;
  },

  async getByAdvogado(oab: number) {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("eventos_agenda")
      .select("*")
      .eq("advogado_oab", oab)
      .order("start_time");

    if (error) throw error;
    return data;
  },

  async create(evento: LegalFlowTables["eventos_agenda"]["Insert"]) {
    checkSupabaseConfig();
    const { data, error } = await lf
      .from("eventos_agenda")
      .insert(evento)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ============================================================================
// LEGALFLOW VIEWS AND ADVANCED QUERIES
// ============================================================================

export const contactsUnifiedApi = {
  async getAll({
    searchTerm = "",
    filterSource = "all",
    page = 1,
    pageSize = 50,
  }: {
    searchTerm?: string;
    filterSource?: string;
    page?: number;
    pageSize?: number;
  } = {}) {
    checkSupabaseConfig();

    let query = lf.from("vw_contacts_unified" as any).select("*");

    // Add search filters
    if (searchTerm && searchTerm.trim() !== "") {
      query = query.or(
        `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,whatsapp.ilike.%${searchTerm}%,cpfcnpj.ilike.%${searchTerm}%`,
      );
    }

    // Add source filter
    if (filterSource && filterSource !== "all") {
      query = query.eq("source", filterSource);
    }

    // Add pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    // Add sorting
    query = query.order("updated_at", { ascending: false });

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  },
};

// ============================================================================
// CROSS-SCHEMA QUERIES (combining PUBLIC and LEGALFLOW)
// ============================================================================

export const crossSchemaApi = {
  // Get journey instance with related processo and cliente data
  async getJourneyWithProcess(instanceId: string) {
    checkSupabaseConfig();

    // First get the journey instance
    const { data: instance, error: instanceError } = await lf
      .from("journey_instances")
      .select("*")
      .eq("id", instanceId)
      .single();

    if (instanceError) throw instanceError;

    // Then get related processo data from public schema
    if (instance.processo_numero_cnj) {
      const { data: processo, error: processoError } = await supabase
        .from("processos")
        .select("*")
        .eq("numero_cnj", instance.processo_numero_cnj)
        .single();

      if (processoError) throw processoError;
      instance.processo = processo;
    }

    // Get related cliente data from public schema
    if (instance.cliente_cpfcnpj) {
      const { data: cliente, error: clienteError } = await supabase
        .from("clientes")
        .select("*")
        .eq("cpfcnpj", instance.cliente_cpfcnpj)
        .single();

      if (clienteError) throw clienteError;
      instance.cliente = cliente;
    }

    return instance;
  },

  // Get all payment plans with related client data
  async getPlanosPagamentoWithClientes() {
    checkSupabaseConfig();

    const { data: planos, error: planosError } = await lf
      .from("planos_pagamento")
      .select("*")
      .order("created_at", { ascending: false });

    if (planosError) throw planosError;

    // Enrich with cliente data
    const planosEnriched = await Promise.all(
      planos.map(async (plano) => {
        const { data: cliente, error: clienteError } = await supabase
          .from("clientes")
          .select("*")
          .eq("cpfcnpj", plano.cliente_cpfcnpj)
          .single();

        if (clienteError) throw clienteError;
        return { ...plano, cliente };
      }),
    );

    return planosEnriched;
  },
};

// Error handling utility
export const handleApiError = (error: any) => {
  console.error("API Error:", error.message || error);
  throw new Error(error.message || "Erro na operação do banco de dados");
};

// Export types for external use
export type {
  Cliente,
  Processo,
  Advogado,
  Movimentacao,
  Publicacao,
  Lead,
  Peticao,
  JourneyTemplate,
  JourneyTemplateStage,
  JourneyInstance,
  StageInstance,
  StageType,
  PlanoPagamento,
  ParcelaPagamento,
  EventoAgenda,
  FormDefinition,
  FormResponse,
  DocumentRequirement,
  DocumentUpload,
};

// Export all APIs for easier use
// Note: contactsUnifiedApi is already exported above
