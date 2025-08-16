/**
 * SISTEMA DE VAULT - LEGALFLOW
 * Gerenciamento seguro de credenciais e secrets
 * Integração com legalflow.secrets schema
 */

import { createClient } from "@supabase/supabase-js";

interface VaultSecret {
  id: string;
  name: string;
  value: string;
  description?: string;
  environment: "development" | "staging" | "production";
  created_at: string;
  updated_at: string;
}

interface VaultConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
}

class VaultManager {
  private supabase: any;
  private cache: Map<string, VaultSecret> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastFetch: number = 0;

  constructor(config: VaultConfig) {
    this.supabase = createClient(
      config.supabaseUrl,
      config.supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );
  }

  /**
   * Busca secret do vault com cache
   */
  async getSecret(name: string): Promise<string | null> {
    try {
      // Verificar cache primeiro
      if (this.isCacheValid() && this.cache.has(name)) {
        return this.cache.get(name)!.value;
      }

      // Buscar do banco se não estiver em cache
      await this.refreshCache();

      const secret = this.cache.get(name);
      return secret ? secret.value : null;
    } catch (error) {
      console.error(`Erro ao buscar secret '${name}':`, error);
      return null;
    }
  }

  /**
   * Busca todos os secrets do ambiente atual
   */
  async getAllSecrets(): Promise<Record<string, string>> {
    try {
      await this.refreshCache();

      const secrets: Record<string, string> = {};
      this.cache.forEach((secret, name) => {
        secrets[name] = secret.value;
      });

      return secrets;
    } catch (error) {
      console.error("Erro ao buscar todos os secrets:", error);
      return {};
    }
  }

  /**
   * Armazena secret no vault
   */
  async setSecret(
    name: string,
    value: string,
    description?: string,
  ): Promise<boolean> {
    try {
      const environment =
        (process.env.NODE_ENV as "development" | "staging" | "production") ||
        "development";

      const { error } = await this.supabase.from("legalflow.secrets").upsert(
        {
          name,
          value,
          description,
          environment,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "name,environment",
        },
      );

      if (error) {
        console.error(`Erro ao armazenar secret '${name}':`, error);
        return false;
      }

      // Atualizar cache
      this.cache.set(name, {
        id: "",
        name,
        value,
        description,
        environment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      return true;
    } catch (error) {
      console.error(`Erro ao armazenar secret '${name}':`, error);
      return false;
    }
  }

  /**
   * Remove secret do vault
   */
  async deleteSecret(name: string): Promise<boolean> {
    try {
      const environment =
        (process.env.NODE_ENV as "development" | "staging" | "production") ||
        "development";

      const { error } = await this.supabase
        .from("legalflow.secrets")
        .delete()
        .eq("name", name)
        .eq("environment", environment);

      if (error) {
        console.error(`Erro ao deletar secret '${name}':`, error);
        return false;
      }

      // Remover do cache
      this.cache.delete(name);
      return true;
    } catch (error) {
      console.error(`Erro ao deletar secret '${name}':`, error);
      return false;
    }
  }

  /**
   * Atualiza cache com secrets do banco
   */
  private async refreshCache(): Promise<void> {
    if (this.isCacheValid()) {
      return;
    }

    try {
      const environment =
        (process.env.NODE_ENV as "development" | "staging" | "production") ||
        "development";

      const { data, error } = await this.supabase
        .from("legalflow.secrets")
        .select("*")
        .eq("environment", environment);

      if (error) {
        console.error("Erro ao atualizar cache de secrets:", error);
        return;
      }

      // Limpar cache anterior
      this.cache.clear();

      // Popular novo cache
      if (data) {
        data.forEach((secret: VaultSecret) => {
          this.cache.set(secret.name, secret);
        });
      }

      this.lastFetch = Date.now();
    } catch (error) {
      console.error("Erro ao atualizar cache de secrets:", error);
    }
  }

  /**
   * Verifica se cache ainda é válido
   */
  private isCacheValid(): boolean {
    return Date.now() - this.lastFetch < this.cacheExpiry;
  }

  /**
   * Limpa cache manualmente
   */
  public clearCache(): void {
    this.cache.clear();
    this.lastFetch = 0;
  }
}

// Instância singleton do vault
let vaultInstance: VaultManager | null = null;

/**
 * Inicializa o vault com configurações
 */
export function initializeVault(config: VaultConfig): VaultManager {
  vaultInstance = new VaultManager(config);
  return vaultInstance;
}

/**
 * Obtém instância do vault
 */
export function getVault(): VaultManager {
  if (!vaultInstance) {
    throw new Error(
      "Vault não foi inicializado. Chame initializeVault() primeiro.",
    );
  }
  return vaultInstance;
}

/**
 * Helper para buscar secret rapidamente
 */
export async function getSecret(name: string): Promise<string | null> {
  try {
    const vault = getVault();
    return await vault.getSecret(name);
  } catch (error) {
    console.error(`Erro ao buscar secret '${name}':`, error);
    return null;
  }
}

/**
 * Helper para buscar todos os secrets
 */
export async function getAllSecrets(): Promise<Record<string, string>> {
  try {
    const vault = getVault();
    return await vault.getAllSecrets();
  } catch (error) {
    console.error("Erro ao buscar todos os secrets:", error);
    return {};
  }
}

/**
 * Helper para configuração com fallback para environment variables
 */
export async function getSecretOrEnv(
  name: string,
  envName?: string,
): Promise<string | null> {
  try {
    // Tentar buscar do vault primeiro
    const secret = await getSecret(name);
    if (secret) {
      return secret;
    }

    // Fallback para environment variable
    const envVar = process.env[envName || name];
    if (envVar) {
      return envVar;
    }

    return null;
  } catch (error) {
    // Se vault falhar, usar env var como fallback
    return process.env[envName || name] || null;
  }
}

export { VaultManager, VaultSecret, VaultConfig };
