/**
 * Process Overview Utilities - Flow C3
 * Helper functions for data extraction and formatting
 */

import { supabase } from "./supabase";

export interface ProcessoAdviseData {
  area: string;
  classe: string;
  assunto: string;
  orgao: string;
  valor: number | null;
  audiencias: any[];
  [key: string]: any;
}

export interface ProcessoCompleto {
  numero_cnj: string;
  tribunal_sigla: string;
  titulo_polo_ativo: string;
  titulo_polo_passivo: string;
  data: any;
  created_at: string;
  cliente?: {
    nome: string;
    cpfcnpj: string;
  };
  responsavel?: {
    nome: string;
    oab: number;
  };
  documentos_count?: number;
  peticoes_count?: number;
  movimentacoes_count?: number;
  publicacoes_count?: number;
}

/**
 * Extract structured data from Advise/Escavador raw data
 */
export const extractAdviseData = (data: any): ProcessoAdviseData => {
  if (!data) {
    return {
      area: "Não informado",
      classe: "Não informado", 
      assunto: "Não informado",
      orgao: "Não informado",
      valor: null,
      audiencias: [],
    };
  }

  // Handle different data structures from Advise/Escavador
  const area = data.area || 
               data.classe?.area || 
               data.classeProcessual?.area ||
               "Não informado";

  const classe = data.classe?.nome || 
                data.classeProcessual?.nome ||
                data.classeProcessual ||
                "Não informado";

  const assunto = data.assunto?.[0]?.nome ||
                 data.assuntoPrincipal?.nome ||
                 data.assuntoPrincipal ||
                 data.assuntos?.[0] ||
                 "Não informado";

  const orgao = data.orgaoJulgador?.nome ||
               data.tribunal?.nome ||
               data.tribunal ||
               data.varaDistribuicao ||
               "Não informado";

  const valor = data.valorCausa || 
               data.valor ||
               data.valorDaCausa ||
               null;

  const audiencias = data.audiencias || 
                    data.proximasAudiencias ||
                    [];

  return {
    area,
    classe,
    assunto,
    orgao,
    valor: valor ? parseFloat(valor.toString().replace(/[^\d.,]/g, '').replace(',', '.')) : null,
    audiencias: Array.isArray(audiencias) ? audiencias : [],
  };
};

/**
 * Fetch complete process data with all relationships
 */
export const fetchProcessoCompleto = async (numero_cnj: string): Promise<ProcessoCompleto> => {
  const { data: processo, error } = await supabase
    .from("processos")
    .select(`
      numero_cnj,
      tribunal_sigla,
      titulo_polo_ativo,
      titulo_polo_passivo,
      data,
      created_at,
      clientes_processos (
        clientes (
          nome,
          cpfcnpj
        )
      ),
      advogados_processos (
        advogados (
          nome,
          oab
        )
      )
    `)
    .eq("numero_cnj", numero_cnj)
    .single();

  if (error) throw error;

  // Get additional counts
  const [
    { count: documentosCount },
    { count: peticoesCount },
    { count: movimentacoesCount },
    { count: publicacoesCount }
  ] = await Promise.all([
    supabase.from("documents").select("*", { count: "exact", head: true }).eq("numero_cnj", numero_cnj),
    supabase.from("peticoes").select("*", { count: "exact", head: true }).eq("numero_cnj", numero_cnj),
    supabase.from("movimentacoes").select("*", { count: "exact", head: true }).eq("numero_cnj", numero_cnj),
    supabase.from("publicacoes").select("*", { count: "exact", head: true }).eq("numero_cnj", numero_cnj),
  ]);

  return {
    ...processo,
    cliente: processo.clientes_processos?.[0]?.clientes,
    responsavel: processo.advogados_processos?.[0]?.advogados,
    documentos_count: documentosCount || 0,
    peticoes_count: peticoesCount || 0,
    movimentacoes_count: movimentacoesCount || 0,
    publicacoes_count: publicacoesCount || 0,
  };
};

/**
 * Fetch recent timeline events (last 30 days)
 */
export const fetchTimelineRecente = async (numero_cnj: string, limit: number = 10) => {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("vw_timeline_processo")
    .select("*")
    .eq("numero_cnj", numero_cnj)
    .gte("data", thirtyDaysAgo.toISOString())
    .order("data", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
};

/**
 * Fetch complete timeline with pagination
 */
export const fetchTimelineCompleto = async (
  numero_cnj: string, 
  page: number = 1, 
  pageSize: number = 20
) => {
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize - 1;

  const { data, error, count } = await supabase
    .from("vw_timeline_processo")
    .select("*", { count: "exact" })
    .eq("numero_cnj", numero_cnj)
    .order("data", { ascending: false })
    .range(startIndex, endIndex);

  if (error) throw error;
  return { data, total: count || 0 };
};

/**
 * Fetch process threads for chat
 */
export const fetchProcessThreads = async (numero_cnj: string) => {
  const { data, error } = await supabase
    .from("thread_links")
    .select(`
      id,
      context_type,
      properties,
      created_at,
      updated_at
    `)
    .eq("context_type", "processo")
    .contains("properties", { numero_cnj })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
};

/**
 * Create a new andamento (movement)
 */
export const createAndamento = async (numero_cnj: string, conteudo: string) => {
  const { data, error } = await supabase
    .from("movimentacoes")
    .insert([{
      numero_cnj,
      data: { 
        texto: conteudo, 
        tipo: "andamento_manual",
        origem: "sistema_interno"
      },
      data_movimentacao: new Date().toISOString(),
    }])
    .select();

  if (error) throw error;
  return data;
};

/**
 * Create a new publication
 */
export const createPublicacao = async (numero_cnj: string, conteudo: string) => {
  const { data, error } = await supabase
    .from("publicacoes")
    .insert([{
      numero_cnj,
      data: { 
        resumo: conteudo, 
        tipo: "publicacao_manual",
        origem: "sistema_interno"
      },
      data_publicacao: new Date().toISOString(),
    }])
    .select();

  if (error) throw error;
  return data;
};

/**
 * Create a new petition
 */
export const createPeticao = async (numero_cnj: string, tipo: string, conteudo: string) => {
  const { data, error } = await supabase
    .from("peticoes")
    .insert([{
      numero_cnj,
      tipo,
      conteudo,
    }])
    .select();

  if (error) throw error;
  return data;
};

/**
 * Format CNJ number for display
 */
export const formatCNJDisplay = (cnj: string): string => {
  const clean = cnj.replace(/\D/g, "");
  if (clean.length === 20) {
    return clean.replace(
      /(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/,
      "$1-$2.$3.$4.$5.$6"
    );
  }
  return cnj;
};

/**
 * Format currency value
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value);
};

/**
 * Format date for display
 */
export const formatDateDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit", 
    year: "numeric"
  });
};

/**
 * Get event icon type based on event type
 */
export const getEventIconType = (tipo: string): "movement" | "publication" | "document" => {
  if (tipo.includes("movimentacao") || tipo.includes("andamento")) {
    return "movement";
  } else if (tipo.includes("publicacao")) {
    return "publication";
  } else {
    return "document";
  }
};

/**
 * Generate quick action context for process
 */
export const getProcessActionContext = (processo: ProcessoCompleto) => {
  const adviseData = extractAdviseData(processo.data);
  
  return {
    canAddAndamento: true,
    canAddPublicacao: true,
    canCreatePeticao: true,
    hasActiveAudiencias: adviseData.audiencias.length > 0,
    hasResponsavel: !!processo.responsavel,
    isRecent: new Date(processo.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    summary: {
      totalDocumentos: processo.documentos_count || 0,
      totalPeticoes: processo.peticoes_count || 0,
      totalMovimentacoes: processo.movimentacoes_count || 0,
      totalPublicacoes: processo.publicacoes_count || 0,
    }
  };
};
