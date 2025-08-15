// Mock API implementations for server-side demonstration
// In production, these would connect to your database directly

export const mockProcessosApi = {
  async getAll() {
    return [
      {
        numero_cnj: "1234567-89.2023.8.26.0001",
        tribunal_sigla: "TJSP",
        titulo_polo_ativo: "João Silva",
        titulo_polo_passivo: "Estado de São Paulo",
        data: null,
        created_at: new Date().toISOString(),
        crm_id: null,
        decisoes: null,
        clientes_processos: [
          {
            clientes: {
              nome: "João Silva",
              cpfcnpj: "12345678901"
            }
          }
        ],
        advogados_processos: [
          {
            advogados: {
              nome: "Dr. Pedro Santos",
              oab: 123456
            }
          }
        ]
      }
    ];
  },

  async getById(numero_cnj: string) {
    if (numero_cnj === "1234567-89.2023.8.26.0001") {
      return {
        numero_cnj,
        tribunal_sigla: "TJSP",
        titulo_polo_ativo: "João Silva",
        titulo_polo_passivo: "Estado de São Paulo",
        data: null,
        created_at: new Date().toISOString(),
        crm_id: null,
        decisoes: null,
        clientes_processos: [
          {
            clientes: {
              nome: "João Silva",
              cpfcnpj: "12345678901",
              whatsapp: "+5511999999999"
            }
          }
        ],
        advogados_processos: [
          {
            advogados: {
              nome: "Dr. Pedro Santos",
              oab: 123456
            }
          }
        ]
      };
    }
    throw new Error("Processo não encontrado");
  },

  async create(processo: any) {
    return {
      ...processo,
      created_at: new Date().toISOString(),
      crm_id: null,
      decisoes: null,
    };
  },

  async update(numero_cnj: string, updates: any) {
    return {
      numero_cnj,
      tribunal_sigla: "TJSP",
      titulo_polo_ativo: "João Silva (Atualizado)",
      titulo_polo_passivo: "Estado de São Paulo",
      data: null,
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      crm_id: null,
      decisoes: null,
      ...updates,
    };
  },
};

export const mockClientesApi = {
  async getAll() {
    return [
      {
        cpfcnpj: "12345678901",
        nome: "João Silva",
        whatsapp: "+5511999999999",
        created_at: new Date().toISOString(),
        crm_id: null,
      },
      {
        cpfcnpj: "98765432100",
        nome: "Maria Oliveira",
        whatsapp: "+5511888888888",
        created_at: new Date(Date.now() - 86400000).toISOString(),
        crm_id: null,
      }
    ];
  },

  async getById(cpfcnpj: string) {
    if (cpfcnpj === "12345678901") {
      return {
        cpfcnpj,
        nome: "João Silva",
        whatsapp: "+5511999999999",
        created_at: new Date().toISOString(),
        crm_id: null,
      };
    }
    throw new Error("Cliente não encontrado");
  },

  async create(cliente: any) {
    return {
      ...cliente,
      created_at: new Date().toISOString(),
      crm_id: null,
    };
  },

  async update(cpfcnpj: string, updates: any) {
    return {
      cpfcnpj,
      nome: "João Silva (Atualizado)",
      whatsapp: "+5511999999999",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date().toISOString(),
      crm_id: null,
      ...updates,
    };
  },

  async delete(cpfcnpj: string) {
    return true;
  },
};

export const mockMovimentacoesApi = {
  async getByProcesso(numero_cnj: string) {
    return [
      {
        id: 1,
        numero_cnj,
        data: { descricao: "Petição inicial protocolada" },
        data_movimentacao: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        numero_cnj,
        data: { descricao: "Despacho do juiz" },
        data_movimentacao: new Date(Date.now() - 86400000).toISOString(),
        created_at: new Date(Date.now() - 86400000).toISOString(),
      }
    ];
  },
};

export const mockPublicacoesApi = {
  async getByProcesso(numero_cnj: string) {
    return [
      {
        id: 1,
        numero_cnj,
        data: { conteudo: "Publicação no DJE sobre audiência" },
        data_publicacao: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }
    ];
  },
};

export const mockPlanosPagamentoApi = {
  async getByCliente(cpfcnpj: string) {
    return [
      {
        id: "plano-1",
        cliente_cpfcnpj: cpfcnpj,
        processo_numero_cnj: "1234567-89.2023.8.26.0001",
        amount_total: 5000,
        installments: 10,
        paid_amount: 2000,
        status: "pendente",
        created_at: new Date().toISOString(),
        parcelas_pagamento: [
          {
            id: "parcela-1",
            n_parcela: 1,
            amount: 500,
            status: "pago",
            due_date: new Date().toISOString(),
            paid_at: new Date().toISOString(),
          }
        ]
      }
    ];
  },
};

export const mockJourneyInstancesApi = {
  async getByCliente(cpfcnpj: string) {
    return [
      {
        id: "journey-1",
        template_id: "template-1",
        cliente_cpfcnpj: cpfcnpj,
        processo_numero_cnj: "1234567-89.2023.8.26.0001",
        owner_oab: 123456,
        start_date: new Date().toISOString(),
        status: "ativo",
        progress_pct: 65,
        next_action: { action: "aguardando_documento" },
        created_at: new Date().toISOString(),
        stage_instances: []
      }
    ];
  },
};
