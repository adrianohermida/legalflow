// Process API Service - Integrations with Advise and Escavador
// Handles data fetching, normalization and persistence for processo details

interface EscavadorCapaResponse {
  area: string;
  classe: string;
  assunto: string;
  valor_causa: number | null;
  orgao_julgador: string;
  data_distribuicao: string;
  data_arquivamento: string | null;
  tribunal: string;
  grau: number;
  fontes: Array<{
    sigla: string;
    sistema: string;
    grau: number;
    tribunal: string;
  }>;
  audiencias?: Array<{
    data: string;
    tipo: string;
    situacao: string;
    participantes: string[];
  }>;
}

interface EscavadorEnvolvidosResponse {
  envolvidos: Array<{
    nome: string;
    tipo_pessoa: "fisica" | "juridica";
    cpf_cnpj: string | null;
    polo: "ativo" | "passivo" | "outros";
    papel: string;
    advogados: Array<{
      nome: string;
      oab: number;
      uf: string;
    }>;
  }>;
}

interface EscavadorMovimentacaoResponse {
  movimentacoes: Array<{
    data: string;
    orgao: string;
    texto: string;
    anexos?: string[];
  }>;
}

interface AdviseCapaResponse {
  numero_cnj: string;
  tribunal: string;
  classe: string;
  assunto: string;
  area: string;
  valor_causa: number | null;
  orgao_julgador: string;
  data_distribuicao: string;
  data_arquivamento: string | null;
}

interface AdviseSujeitosResponse {
  sujeitos: Array<{
    nome: string;
    tipo_pessoa: "fisica" | "juridica";
    cpf_cnpj: string | null;
    polo: "ativo" | "passivo" | "terceiro";
    papel: string;
    advogados: Array<{
      nome: string;
      oab: number;
      uf: string;
    }>;
  }>;
}

interface AdviseAndamentosResponse {
  andamentos: Array<{
    data: string;
    orgao: string;
    movimento: string;
    tipo_movimento: string;
    anexos?: Array<{
      nome: string;
      url: string;
    }>;
  }>;
}

interface AdvisePublicacoesResponse {
  publicacoes: Array<{
    id: number;
    diario: string;
    data_publicacao: string;
    resumo: string;
    palavra_chave: string;
    lido: boolean;
  }>;
}

interface ProcessDataResult {
  capa?: EscavadorCapaResponse | AdviseCapaResponse;
  partes?: Array<{
    numero_cnj: string;
    polo: "ativo" | "passivo" | "outros";
    papel: string;
    nome: string;
    tipo_pessoa: "fisica" | "juridica";
    cpfcnpj: string | null;
    is_cliente: boolean;
    advogado_oabs: number[];
  }>;
  movimentacoes?: Array<{
    numero_cnj: string;
    data: string;
    orgao: string;
    texto: string;
    anexos: string[] | null;
  }>;
  publicacoes?: AdvisePublicacoesResponse["publicacoes"];
}

class ProcessAPIService {
  private escavadorBaseUrl =
    import.meta.env.VITE_ESCAVADOR_API_URL || "https://api.escavador.com";
  private escavadorToken = import.meta.env.VITE_ESCAVADOR_TOKEN || "";
  private adviseBaseUrl =
    import.meta.env.VITE_ADVISE_API_URL || "https://api.advise.com.br";
  private adviseToken = import.meta.env.VITE_ADVISE_TOKEN || "";

  /**
   * Fetch comprehensive process data from active source
   */
  async fetchProcessData(
    numero_cnj: string,
    fonte: "advise" | "escavador",
  ): Promise<ProcessDataResult> {
    try {
      if (fonte === "escavador") {
        return await this.fetchFromEscavador(numero_cnj);
      } else {
        return await this.fetchFromAdvise(numero_cnj);
      }
    } catch (error) {
      console.error(`Error fetching from ${fonte}:`, error);

      // Fallback to Advise if Escavador fails
      if (fonte === "escavador") {
        console.log("Falling back to Advise...");
        return await this.fetchFromAdvise(numero_cnj);
      }

      throw error;
    }
  }

  /**
   * Fetch data from Escavador API (Premium)
   */
  private async fetchFromEscavador(
    numero_cnj: string,
  ): Promise<ProcessDataResult> {
    const headers = {
      Authorization: `Bearer ${this.escavadorToken}`,
      "Content-Type": "application/json",
    };

    // Parallel requests for different data types
    const [capaResponse, envolvidosResponse, movimentacoesResponse] =
      await Promise.allSettled([
        this.escavadorRequest(
          `/api/v2/processos/numero_cnj/${numero_cnj}`,
          headers,
        ),
        this.escavadorRequest(
          `/api/v2/processos/${numero_cnj}/envolvidos`,
          headers,
        ),
        this.escavadorRequest(
          `/api/v2/processos/${numero_cnj}/movimentacoes`,
          headers,
        ),
      ]);

    const result: ProcessDataResult = {};

    // Process capa data
    if (capaResponse.status === "fulfilled" && capaResponse.value) {
      result.capa = capaResponse.value as EscavadorCapaResponse;
    }

    // Process envolvidos (partes)
    if (envolvidosResponse.status === "fulfilled" && envolvidosResponse.value) {
      const envolvidos =
        envolvidosResponse.value as EscavadorEnvolvidosResponse;
      result.partes = envolvidos.envolvidos.map((envolvido) => ({
        numero_cnj,
        polo: envolvido.polo,
        papel: envolvido.papel,
        nome: envolvido.nome,
        tipo_pessoa: envolvido.tipo_pessoa,
        cpfcnpj: envolvido.cpf_cnpj,
        is_cliente: false, // Will be determined by backend
        advogado_oabs: envolvido.advogados.map((adv) => adv.oab),
      }));
    }

    // Process movimentações
    if (
      movimentacoesResponse.status === "fulfilled" &&
      movimentacoesResponse.value
    ) {
      const movimentacoes =
        movimentacoesResponse.value as EscavadorMovimentacaoResponse;
      result.movimentacoes = movimentacoes.movimentacoes.map((mov) => ({
        numero_cnj,
        data: mov.data,
        orgao: mov.orgao,
        texto: mov.texto,
        anexos: mov.anexos || null,
      }));
    }

    return result;
  }

  /**
   * Fetch data from Advise API (Fallback)
   */
  private async fetchFromAdvise(
    numero_cnj: string,
  ): Promise<ProcessDataResult> {
    const headers = {
      Authorization: `Bearer ${this.adviseToken}`,
      "Content-Type": "application/json",
    };

    // Parallel requests for different data types
    const [
      capaResponse,
      sujeitosResponse,
      andamentosResponse,
      publicacoesResponse,
    ] = await Promise.allSettled([
      this.adviseRequest(
        `/core/v1/processos-clientes/dados-numero-processo?numero_cnj=${numero_cnj}`,
        headers,
      ),
      this.adviseRequest(
        `/core/v1/processos-clientes/sujeitos?numero_cnj=${numero_cnj}`,
        headers,
      ),
      this.adviseRequest(
        `/core/v1/processos-clientes/andamentos?numero_cnj=${numero_cnj}`,
        headers,
      ),
      this.adviseRequest(
        `/core/v1/publicacoes-clientes?numero_cnj=${numero_cnj}`,
        headers,
      ),
    ]);

    const result: ProcessDataResult = {};

    // Process capa data
    if (capaResponse.status === "fulfilled" && capaResponse.value) {
      const capa = capaResponse.value as AdviseCapaResponse;
      result.capa = {
        area: capa.area,
        classe: capa.classe,
        assunto: capa.assunto,
        valor_causa: capa.valor_causa,
        orgao_julgador: capa.orgao_julgador,
        data_distribuicao: capa.data_distribuicao,
        data_arquivamento: capa.data_arquivamento,
        fontes: [
          {
            sigla: "ADVISE",
            sistema: "Advise",
            grau: 1,
            tribunal: capa.tribunal,
          },
        ],
      };
    }

    // Process sujeitos (partes)
    if (sujeitosResponse.status === "fulfilled" && sujeitosResponse.value) {
      const sujeitos = sujeitosResponse.value as AdviseSujeitosResponse;
      result.partes = sujeitos.sujeitos.map((sujeito) => ({
        numero_cnj,
        polo: sujeito.polo === "terceiro" ? "outros" : sujeito.polo,
        papel: sujeito.papel,
        nome: sujeito.nome,
        tipo_pessoa: sujeito.tipo_pessoa,
        cpfcnpj: sujeito.cpf_cnpj,
        is_cliente: false, // Will be determined by backend
        advogado_oabs: sujeito.advogados.map((adv) => adv.oab),
      }));
    }

    // Process andamentos (movimentações)
    if (andamentosResponse.status === "fulfilled" && andamentosResponse.value) {
      const andamentos = andamentosResponse.value as AdviseAndamentosResponse;
      result.movimentacoes = andamentos.andamentos.map((andamento) => ({
        numero_cnj,
        data: andamento.data,
        orgao: andamento.orgao,
        texto: andamento.movimento,
        anexos: andamento.anexos?.map((anexo) => anexo.nome) || null,
      }));
    }

    // Process publicações
    if (
      publicacoesResponse.status === "fulfilled" &&
      publicacoesResponse.value
    ) {
      const publicacoes =
        publicacoesResponse.value as AdvisePublicacoesResponse;
      result.publicacoes = publicacoes.publicacoes;
    }

    return result;
  }

  /**
   * Mark publicação as read/unread via Advise API
   */
  async markPublicacaoLida(publicacaoId: number, lido: boolean): Promise<void> {
    const headers = {
      Authorization: `Bearer ${this.adviseToken}`,
      "Content-Type": "application/json",
    };

    await this.adviseRequest(
      `/core/v1/publicacoes-clientes/${publicacaoId}`,
      headers,
      {
        method: "PUT",
        body: JSON.stringify({ lido }),
      },
    );
  }

  /**
   * Download anexo from Advise
   */
  async downloadAnexo(anexoId: string): Promise<Blob> {
    const headers = {
      Authorization: `Bearer ${this.adviseToken}`,
    };

    const response = await fetch(
      `${this.adviseBaseUrl}/core/v1/anexo-fonte-processo/${anexoId}`,
      {
        headers,
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to download anexo: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Check Escavador API status and credits
   */
  async checkEscavadorStatus(): Promise<{
    available: boolean;
    credits: number;
    rate_limit_remaining: number;
  }> {
    try {
      const headers = {
        Authorization: `Bearer ${this.escavadorToken}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(`${this.escavadorBaseUrl}/api/v2/status`, {
        headers,
      });

      if (!response.ok) {
        return { available: false, credits: 0, rate_limit_remaining: 0 };
      }

      const data = await response.json();

      return {
        available: true,
        credits: data.credits || 0,
        rate_limit_remaining: parseInt(
          response.headers.get("X-RateLimit-Remaining") || "0",
        ),
      };
    } catch (error) {
      console.error("Error checking Escavador status:", error);
      return { available: false, credits: 0, rate_limit_remaining: 0 };
    }
  }

  /**
   * Setup webhook callback for Escavador real-time updates
   */
  async setupEscavadorCallback(
    numero_cnj: string,
    callbackUrl: string,
  ): Promise<void> {
    const headers = {
      Authorization: `Bearer ${this.escavadorToken}`,
      "Content-Type": "application/json",
    };

    await this.escavadorRequest("/api/v2/webhooks", headers, {
      method: "POST",
      body: JSON.stringify({
        numero_cnj,
        callback_url: callbackUrl,
        events: ["movimentacao", "publicacao", "audiencia"],
      }),
    });
  }

  /**
   * Generic Escavador API request with rate limiting
   */
  private async escavadorRequest(
    endpoint: string,
    headers: Record<string, string>,
    options?: RequestInit,
  ): Promise<any> {
    // Rate limiting: 500 requests per minute
    await this.rateLimiter("escavador", 500, 60000);

    const response = await fetch(`${this.escavadorBaseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Escavador API error: ${response.status} - ${errorData.message || response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Generic Advise API request
   */
  private async adviseRequest(
    endpoint: string,
    headers: Record<string, string>,
    options?: RequestInit,
  ): Promise<any> {
    const response = await fetch(`${this.adviseBaseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Advise API error: ${response.status} - ${errorData.message || response.statusText}`,
      );
    }

    return response.json();
  }

  /**
   * Simple rate limiter
   */
  private rateLimiters: Map<string, { requests: number; resetTime: number }> =
    new Map();

  private async rateLimiter(
    key: string,
    maxRequests: number,
    windowMs: number,
  ): Promise<void> {
    const now = Date.now();
    const limiter = this.rateLimiters.get(key);

    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(key, { requests: 1, resetTime: now + windowMs });
      return;
    }

    if (limiter.requests >= maxRequests) {
      const waitTime = limiter.resetTime - now;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.rateLimiter(key, maxRequests, windowMs);
    }

    limiter.requests++;
  }

  /**
   * Normalize CNJ format
   */
  normalizeCNJ(cnj: string): string {
    return cnj.replace(/\D/g, "");
  }

  /**
   * Validate CNJ format
   */
  validateCNJ(cnj: string): boolean {
    const normalized = this.normalizeCNJ(cnj);
    return normalized.length === 20 && /^\d{20}$/.test(normalized);
  }
}

export const processAPIService = new ProcessAPIService();

// Utility functions
export const formatCNJ = (cnj: string): string => {
  const clean = cnj.replace(/\D/g, "");
  if (clean.length === 20) {
    return clean.replace(
      /(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/,
      "$1-$2.$3.$4.$5.$6",
    );
  }
  return cnj;
};

export const formatCPFCNPJ = (cpfcnpj: string): string => {
  const clean = cpfcnpj.replace(/\D/g, "");
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  } else if (clean.length === 14) {
    return clean.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return cpfcnpj;
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("pt-BR");
};

export const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString("pt-BR");
};
