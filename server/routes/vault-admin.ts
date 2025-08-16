/**
 * ADMINISTRAÇÃO DO VAULT - LEGALFLOW
 * Endpoints para gerenciar secrets do vault
 */

import { Router } from "express";
import { getVault, getSecret, getAllSecrets } from "../lib/vault";
import { validateApiKey } from "../middleware/security";

const router = Router();

/**
 * GET /vault/health - Status do vault
 */
router.get("/health", async (req, res) => {
  try {
    const vault = getVault();
    
    // Tentar buscar um secret de teste
    const testSecret = await getSecret('api_version');
    
    res.success({
      status: 'healthy',
      vaultConfigured: !!vault,
      testSecretFound: !!testSecret,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }, "Vault funcionando corretamente");
    
  } catch (error) {
    res.error("Vault não configurado ou com problemas", 503, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /vault/secrets - Listar secrets (apenas nomes)
 * Requer API Key para segurança
 */
router.get("/secrets", validateApiKey, async (req, res) => {
  try {
    const secrets = await getAllSecrets();
    
    // Retornar apenas os nomes dos secrets, não os valores
    const secretNames = Object.keys(secrets);
    
    res.success({
      count: secretNames.length,
      secrets: secretNames,
      environment: process.env.NODE_ENV
    }, "Secrets listados com sucesso");
    
  } catch (error) {
    res.error("Erro ao listar secrets", 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /vault/secret/:name - Buscar secret específico
 * Requer API Key para segurança
 */
router.get("/secret/:name", validateApiKey, async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.error("Nome do secret é obrigatório", 400);
    }
    
    const secret = await getSecret(name);
    
    if (!secret) {
      return res.error(`Secret '${name}' não encontrado`, 404);
    }
    
    // Por segurança, apenas mostrar se o secret existe, não o valor real
    res.success({
      name,
      exists: true,
      length: secret.length,
      masked: secret.substring(0, 3) + "*".repeat(Math.max(0, secret.length - 3))
    }, `Secret '${name}' encontrado`);
    
  } catch (error) {
    res.error("Erro ao buscar secret", 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /vault/secret - Criar/atualizar secret
 * Requer API Key para segurança
 */
router.post("/secret", validateApiKey, async (req, res) => {
  try {
    const { name, value, description } = req.body;
    
    if (!name || !value) {
      return res.error("Nome e valor do secret são obrigatórios", 400);
    }
    
    const vault = getVault();
    const success = await vault.setSecret(name, value, description);
    
    if (success) {
      res.success({
        name,
        created: true,
        environment: process.env.NODE_ENV
      }, `Secret '${name}' criado/atualizado com sucesso`);
    } else {
      res.error(`Erro ao criar/atualizar secret '${name}'`, 500);
    }
    
  } catch (error) {
    res.error("Erro ao criar/atualizar secret", 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * DELETE /vault/secret/:name - Deletar secret
 * Requer API Key para segurança
 */
router.delete("/secret/:name", validateApiKey, async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name) {
      return res.error("Nome do secret é obrigatório", 400);
    }
    
    const vault = getVault();
    const success = await vault.deleteSecret(name);
    
    if (success) {
      res.success({
        name,
        deleted: true,
        environment: process.env.NODE_ENV
      }, `Secret '${name}' deletado com sucesso`);
    } else {
      res.error(`Erro ao deletar secret '${name}'`, 500);
    }
    
  } catch (error) {
    res.error("Erro ao deletar secret", 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /vault/clear-cache - Limpar cache do vault
 * Requer API Key para segurança
 */
router.post("/clear-cache", validateApiKey, async (req, res) => {
  try {
    const vault = getVault();
    vault.clearCache();
    
    res.success({
      cleared: true,
      timestamp: new Date().toISOString()
    }, "Cache do vault limpo com sucesso");
    
  } catch (error) {
    res.error("Erro ao limpar cache do vault", 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /vault/config - Configuração atual de segurança
 */
router.get("/config", async (req, res) => {
  try {
    const securityConfig = await getSecret('security_config');
    const rateLimitConfig = await getSecret('rate_limit_config');
    
    res.success({
      securityConfigured: !!securityConfig,
      rateLimitConfigured: !!rateLimitConfig,
      environment: process.env.NODE_ENV,
      features: {
        vault: true,
        apiKeyValidation: true,
        securityLogging: true,
        dynamicConfig: true
      }
    }, "Configuração de segurança obtida com sucesso");
    
  } catch (error) {
    res.error("Erro ao obter configuração", 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
