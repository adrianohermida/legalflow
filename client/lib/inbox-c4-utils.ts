/**
 * Inbox C4 Utilities - Flow C4
 * Helper functions for triagem → vínculo → notificação workflow
 */

import { supabase } from "./supabase";

export interface TriagemItem {
  id: number;
  numero_cnj: string | null;
  data: any;
  data_publicacao?: string;
  data_movimentacao?: string;
  created_at: string;
  resumo_extraido?: string;
  tribunal_origem?: string;
  vinculada: boolean;
  prioridade?: "alta" | "media" | "baixa";
  status_triagem?: "pendente" | "em_analise" | "vinculado" | "rejeitado";
}

export interface NotificationResult {
  success: boolean;
  notification_id?: string;
  error?: string;
}

export interface EtlSearchResult {
  success: boolean;
  imported: number;
  errors: number;
  items: any[];
}

/**
 * Extract resumo from publication or movement data
 */
export const extractResumo = (data: any, tipo: "publicacao" | "movimentacao"): string => {
  if (!data) return "Sem resumo";
  
  if (tipo === "publicacao") {
    return data.resumo || 
           data.conteudo || 
           data.texto ||
           data.description ||
           "Sem resumo disponível";
  } else {
    return data.texto || 
           data.conteudo || 
           data.movimento ||
           data.description ||
           "Sem resumo disponível";
  }
};

/**
 * Extract tribunal/origin from data
 */
export const extractTribunalOrigem = (data: any): string => {
  if (!data) return "Não informado";
  
  return data.tribunal ||
         data.orgao ||
         data.orgaoJulgador ||
         data.source ||
         data.origem ||
         "Não informado";
};

/**
 * Detect CNJ patterns in content
 */
export const detectCNJInContent = (content: string): string[] => {
  const cnjPattern = /\b\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}\b/g;
  const matches = content.match(cnjPattern) || [];
  return [...new Set(matches)]; // Remove duplicates
};

/**
 * Validate CNJ format
 */
export const validateCNJ = (cnj: string): boolean => {
  const cleanCnj = cnj.replace(/\D/g, "");
  return cleanCnj.length === 20;
};

/**
 * Format CNJ for display
 */
export const formatCNJForInput = (cnj: string): string => {
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
 * Calculate priority based on content analysis
 */
export const calculatePriority = (item: TriagemItem): "alta" | "media" | "baixa" => {
  const content = item.resumo_extraido?.toLowerCase() || "";
  
  // High priority keywords
  const highPriorityKeywords = [
    "urgente", "liminar", "tutela", "medida cautelar", 
    "citação", "intimação", "prazo", "recurso",
    "sentença", "acórdão", "decisão"
  ];
  
  // Medium priority keywords  
  const mediumPriorityKeywords = [
    "manifestação", "petição", "juntada", "certidão",
    "conclusão", "vista", "carga"
  ];
  
  const hasHighPriority = highPriorityKeywords.some(keyword => 
    content.includes(keyword)
  );
  
  const hasMediumPriority = mediumPriorityKeywords.some(keyword => 
    content.includes(keyword)
  );
  
  if (hasHighPriority) return "alta";
  if (hasMediumPriority) return "media";
  return "baixa";
};

/**
 * Get priority color for UI display
 */
export const getPriorityColor = (prioridade: "alta" | "media" | "baixa"): string => {
  switch (prioridade) {
    case "alta":
      return "text-red-600 bg-red-50 border-red-200";
    case "media":
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case "baixa":
      return "text-green-600 bg-green-50 border-green-200";
  }
};

/**
 * Check if process exists in database
 */
export const checkProcessExists = async (cnj: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from("processos")
      .select("numero_cnj")
      .eq("numero_cnj", cnj)
      .single();
    
    return !error && !!data;
  } catch {
    return false;
  }
};

/**
 * Get responsible attorney for process
 */
export const getProcessResponsible = async (cnj: string): Promise<{ oab: number; nome: string } | null> => {
  try {
    const { data, error } = await supabase
      .from("processos")
      .select(`
        advogados_processos (
          advogados (
            oab,
            nome
          )
        )
      `)
      .eq("numero_cnj", cnj)
      .single();
    
    if (error || !data?.advogados_processos?.[0]) return null;
    
    return data.advogados_processos[0].advogados;
  } catch {
    return null;
  }
};

/**
 * Create optimized notification
 */
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  processoCnj?: string
): Promise<NotificationResult> => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .insert([{
        user_id: userId,
        title,
        message,
        read: false,
        created_at: new Date().toISOString(),
      }])
      .select("id")
      .single();
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    return { 
      success: true, 
      notification_id: data.id 
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || "Erro ao criar notificação" 
    };
  }
};

/**
 * Bulk link CNJ to multiple items
 */
export const bulkLinkCNJ = async (
  items: { id: number; tipo: "publicacao" | "movimentacao" }[],
  cnj: string
): Promise<{ success: number; errors: number }> => {
  let success = 0;
  let errors = 0;
  
  for (const item of items) {
    try {
      const table = item.tipo === "publicacao" ? "publicacoes" : "movimentacoes";
      
      const { error } = await supabase
        .from(table)
        .update({ numero_cnj: cnj })
        .eq("id", item.id);
      
      if (error) {
        errors++;
      } else {
        success++;
      }
    } catch {
      errors++;
    }
  }
  
  return { success, errors };
};

/**
 * Search external APIs and import results
 */
export const searchAndImportExternal = async (
  searchTerm: string,
  apis: ("advise" | "escavador")[] = ["advise", "escavador"]
): Promise<EtlSearchResult> => {
  try {
    const results: EtlSearchResult = {
      success: false,
      imported: 0,
      errors: 0,
      items: []
    };
    
    for (const api of apis) {
      try {
        const response = await fetch(`/api/ingest/${api}/publicacoes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            search_term: searchTerm,
            auto_register: true,
            limit: 50,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          results.imported += data.imported || 0;
          results.items.push(...(data.items || []));
        } else {
          results.errors++;
        }
      } catch {
        results.errors++;
      }
    }
    
    results.success = results.imported > 0 || results.errors === 0;
    return results;
  } catch (error) {
    return {
      success: false,
      imported: 0,
      errors: 1,
      items: []
    };
  }
};

/**
 * Generate workflow summary for item
 */
export const generateWorkflowSummary = (item: TriagemItem): {
  status: "triagem" | "vinculo" | "notificacao" | "concluido";
  nextAction: string;
  canProceed: boolean;
} => {
  if (!item.vinculada || !item.numero_cnj) {
    return {
      status: "triagem",
      nextAction: "Vincular ao CNJ",
      canProceed: true
    };
  }
  
  if (item.vinculada && item.numero_cnj) {
    return {
      status: "vinculo",
      nextAction: "Notificar responsável",
      canProceed: true
    };
  }
  
  // This would be extended based on notification tracking
  return {
    status: "concluido",
    nextAction: "Fluxo concluído",
    canProceed: false
  };
};

/**
 * Get workflow progress percentage
 */
export const getWorkflowProgress = (items: TriagemItem[]): {
  triagem: number;
  vinculo: number;
  notificacao: number;
  concluido: number;
  total: number;
} => {
  const total = items.length;
  let triagem = 0;
  let vinculo = 0;
  let notificacao = 0;
  let concluido = 0;
  
  items.forEach(item => {
    const summary = generateWorkflowSummary(item);
    switch (summary.status) {
      case "triagem":
        triagem++;
        break;
      case "vinculo":
        vinculo++;
        break;
      case "notificacao":
        notificacao++;
        break;
      case "concluido":
        concluido++;
        break;
    }
  });
  
  return { triagem, vinculo, notificacao, concluido, total };
};

/**
 * Auto-suggest CNJ based on content analysis
 */
export const autoSuggestCNJ = async (content: string): Promise<string[]> => {
  // First, try to detect CNJ patterns in content
  const detectedCNJs = detectCNJInContent(content);
  
  if (detectedCNJs.length > 0) {
    return detectedCNJs;
  }
  
  // If no CNJ detected, try to find similar processes by content keywords
  try {
    const keywords = content
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5); // Take first 5 meaningful words
    
    if (keywords.length > 0) {
      const { data } = await supabase
        .from("processos")
        .select("numero_cnj, titulo_polo_ativo, titulo_polo_passivo")
        .or(keywords.map(keyword => 
          `titulo_polo_ativo.ilike.%${keyword}%,titulo_polo_passivo.ilike.%${keyword}%`
        ).join(","))
        .limit(5);
      
      return data?.map(processo => processo.numero_cnj) || [];
    }
  } catch {
    // Silent fail for suggestion feature
  }
  
  return [];
};
