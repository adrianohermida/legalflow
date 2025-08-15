import { ApiResponse, PaginatedResponse, PaginationParams } from "@shared/api";

// Base API configuration - Builder.io environment
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  // Use Builder.io preview URL if available, otherwise relative path
  window.location.hostname.includes('builder.codes') || window.location.hostname.includes('fly.dev')
    ? `${window.location.protocol}//${window.location.host}/api`
    : "/api"
);
const API_VERSION = "v1";

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Generic HTTP client
class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data: ApiResponse<T> = await response.json();

      if (!response.ok || !data.success) {
        throw new ApiError(
          data.error || "Erro na requisição",
          response.status,
          data.data
        );
      }

      return data.data as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Network or other errors
      throw new ApiError(
        "Erro de conexão",
        0,
        error
      );
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : "";
    return this.request<T>(`${endpoint}${searchParams}`, {
      method: "GET",
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
    });
  }

  async getPaginated<T>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<PaginatedResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const searchParams = params ? `?${new URLSearchParams(params).toString()}` : "";
    
    const response = await fetch(`${url}${searchParams}`);
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new ApiError(
        data.error || "Erro na requisição",
        response.status,
        data.data
      );
    }

    return {
      data: data.data,
      pagination: data.pagination,
    };
  }
}

// Initialize HTTP client
const client = new HttpClient(`${API_BASE_URL}/${API_VERSION}`);

// ============================================================================
// PROCESSOS API
// ============================================================================

export const processosApiClient = {
  async getAll(params?: PaginationParams & {
    query?: string;
    tribunal_sigla?: string;
    created_after?: string;
    created_before?: string;
  }) {
    return client.getPaginated<any>("/processos", params);
  },

  async getById(cnj: string) {
    return client.get<any>(`/processos/${cnj}`);
  },

  async create(data: {
    numero_cnj: string;
    tribunal_sigla?: string;
    titulo_polo_ativo?: string;
    titulo_polo_passivo?: string;
    data?: any;
  }) {
    return client.post<any>("/processos", data);
  },

  async update(cnj: string, data: {
    tribunal_sigla?: string;
    titulo_polo_ativo?: string;
    titulo_polo_passivo?: string;
    data?: any;
  }) {
    return client.put<any>(`/processos/${cnj}`, data);
  },

  async delete(cnj: string) {
    return client.delete<void>(`/processos/${cnj}`);
  },

  async getMovimentacoes(cnj: string) {
    return client.get<any[]>(`/processos/${cnj}/movimentacoes`);
  },

  async getPublicacoes(cnj: string) {
    return client.get<any[]>(`/processos/${cnj}/publicacoes`);
  },
};

// ============================================================================
// CLIENTES API
// ============================================================================

export const clientesApiClient = {
  async getAll(params?: PaginationParams & {
    query?: string;
    created_after?: string;
    created_before?: string;
    has_whatsapp?: boolean;
  }) {
    return client.getPaginated<any>("/clientes", params);
  },

  async getById(cpfcnpj: string) {
    return client.get<any>(`/clientes/${cpfcnpj}`);
  },

  async create(data: {
    cpfcnpj: string;
    nome: string;
    whatsapp?: string;
  }) {
    return client.post<any>("/clientes", data);
  },

  async update(cpfcnpj: string, data: {
    nome?: string;
    whatsapp?: string;
  }) {
    return client.put<any>(`/clientes/${cpfcnpj}`, data);
  },

  async delete(cpfcnpj: string) {
    return client.delete<void>(`/clientes/${cpfcnpj}`);
  },

  async getProcessos(cpfcnpj: string) {
    return client.get<any[]>(`/clientes/${cpfcnpj}/processos`);
  },

  async getPlanos(cpfcnpj: string) {
    return client.get<any[]>(`/clientes/${cpfcnpj}/planos`);
  },

  async getJornadas(cpfcnpj: string) {
    return client.get<any[]>(`/clientes/${cpfcnpj}/jornadas`);
  },
};

// ============================================================================
// DOCUMENTOS API
// ============================================================================

export const documentosApiClient = {
  async getAll(params?: PaginationParams & {
    query?: string;
    numero_cnj?: string;
    cliente_cpfcnpj?: string;
    file_type?: string;
  }) {
    return client.getPaginated<any>("/documentos", params);
  },

  async getById(id: string) {
    return client.get<any>(`/documentos/${id}`);
  },

  async create(data: {
    file_name: string;
    numero_cnj?: string;
    cliente_cpfcnpj?: string;
    file_type?: string;
    file_size?: number;
    category?: string;
    metadata?: any;
  }) {
    return client.post<any>("/documentos", data);
  },

  async update(id: string, data: {
    file_name?: string;
    category?: string;
    metadata?: any;
  }) {
    return client.put<any>(`/documentos/${id}`, data);
  },

  async delete(id: string) {
    return client.delete<void>(`/documentos/${id}`);
  },

  async getDownloadUrl(id: string) {
    return client.get<{ download_url: string; expires_at: string }>(`/documentos/${id}/download`);
  },

  async getByProcesso(cnj: string) {
    return client.get<any[]>(`/documentos/processo/${cnj}`);
  },

  async getByCliente(cpfcnpj: string) {
    return client.get<any[]>(`/documentos/cliente/${cpfcnpj}`);
  },
};

// ============================================================================
// HEALTH CHECK API
// ============================================================================

export const healthApi = {
  async check() {
    return client.get<{
      status: string;
      timestamp: string;
      version: string;
      environment: string;
      uptime: number;
    }>("/health");
  },

  async checkV1() {
    return client.get<{
      version: string;
      status: string;
      timestamp: string;
      endpoints: string[];
    }>("/health");
  },
};

// ============================================================================
// UNIFIED API CLIENT
// ============================================================================

export const apiClient = {
  processos: processosApiClient,
  clientes: clientesApiClient,
  documentos: documentosApiClient,
  health: healthApi,
  
  // Error handling utilities
  isApiError: (error: any): error is ApiError => error instanceof ApiError,
  
  // Response utilities
  extractData: <T>(response: ApiResponse<T>): T => response.data as T,
  extractPagination: <T>(response: PaginatedResponse<T>) => response.pagination,
};

export default apiClient;
export { ApiError };
