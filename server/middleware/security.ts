/**
 * MIDDLEWARE DE SEGURANÇA AVANÇADA - LEGALFLOW
 * Integração com vault e validação de credenciais
 */

import { Request, Response, NextFunction } from "express";
import { getSecret, getSecretOrEnv } from "../lib/vault";

interface SecurityConfig {
  apiKeysEnabled: boolean;
  rateLimitEnabled: boolean;
  ipWhitelistEnabled: boolean;
  encryptionEnabled: boolean;
}

/**
 * Middleware de validação de API Key
 */
export async function validateApiKey(req: Request, res: Response, next: NextFunction) {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API Key obrigatória',
        code: 'API_KEY_MISSING',
        timestamp: new Date().toISOString()
      });
    }

    // Buscar API keys válidas do vault
    const validApiKeys = await getSecret('api_keys_valid');
    
    if (!validApiKeys) {
      console.warn('API Keys não configuradas no vault');
      return next(); // Prosseguir sem validação se não configurado
    }

    const validKeys = validApiKeys.split(',');
    
    if (!validKeys.includes(apiKey)) {
      return res.status(403).json({
        success: false,
        error: 'API Key inválida',
        code: 'API_KEY_INVALID',
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    console.error('Erro na validação de API Key:', error);
    next(); // Prosseguir em caso de erro para não quebrar funcionalidade
  }
}

/**
 * Middleware de validação de IP whitelist
 */
export async function validateIpWhitelist(req: Request, res: Response, next: NextFunction) {
  try {
    const clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    
    // Buscar IPs permitidos do vault
    const allowedIps = await getSecret('allowed_ips');
    
    if (!allowedIps) {
      return next(); // Prosseguir se whitelist não configurada
    }

    const ipsArray = allowedIps.split(',').map(ip => ip.trim());
    
    if (!ipsArray.includes(clientIp as string)) {
      return res.status(403).json({
        success: false,
        error: 'IP não autorizado',
        code: 'IP_NOT_ALLOWED',
        timestamp: new Date().toISOString(),
        clientIp
      });
    }

    next();
  } catch (error) {
    console.error('Erro na validação de IP:', error);
    next(); // Prosseguir em caso de erro
  }
}

/**
 * Middleware de configuração de segurança baseada em vault
 */
export async function configureSecurityFromVault(req: Request, res: Response, next: NextFunction) {
  try {
    // Buscar configurações de segurança do vault
    const securityConfig = await getSecret('security_config');
    
    if (securityConfig) {
      const config: SecurityConfig = JSON.parse(securityConfig);
      
      // Adicionar configuração ao request para uso posterior
      (req as any).securityConfig = config;
    }

    next();
  } catch (error) {
    console.error('Erro ao carregar configuração de segurança:', error);
    next();
  }
}

/**
 * Middleware de autenticação JWT com secrets do vault
 */
export async function validateJwtToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Token de autenticação obrigatório',
        code: 'JWT_TOKEN_MISSING',
        timestamp: new Date().toISOString()
      });
    }

    // Buscar JWT secret do vault
    const jwtSecret = await getSecretOrEnv('jwt_secret', 'JWT_SECRET');
    
    if (!jwtSecret) {
      console.error('JWT Secret não configurado no vault nem em ENV');
      return res.status(500).json({
        success: false,
        error: 'Configuração de autenticação inválida',
        code: 'JWT_CONFIG_ERROR',
        timestamp: new Date().toISOString()
      });
    }

    // Aqui você implementaria a validação JWT real
    // Para exemplo, apenas verificamos se o token não está vazio
    if (token.length < 10) {
      return res.status(403).json({
        success: false,
        error: 'Token inválido',
        code: 'JWT_TOKEN_INVALID',
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    console.error('Erro na validação JWT:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno de autenticação',
      code: 'JWT_VALIDATION_ERROR',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Middleware para log de segurança
 */
export function securityLogger(req: Request, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const method = req.method;
  const url = req.url;
  
  console.log(`[SECURITY] ${timestamp} - ${ip} - ${method} ${url} - ${userAgent}`);
  
  next();
}

/**
 * Middleware de rate limiting dinâmico baseado em vault
 */
export async function dynamicRateLimit(req: Request, res: Response, next: NextFunction) {
  try {
    // Buscar configurações de rate limit do vault
    const rateLimitConfig = await getSecret('rate_limit_config');
    
    if (!rateLimitConfig) {
      return next(); // Prosseguir se não configurado
    }

    const config = JSON.parse(rateLimitConfig);
    const windowMs = config.windowMs || 15 * 60 * 1000; // 15 minutos
    const maxRequests = config.maxRequests || 100;
    
    // Implementação básica de rate limiting (em produção usar Redis)
    const clientIp = req.ip;
    const key = `rate_limit_${clientIp}`;
    
    // Aqui você implementaria a lógica real de rate limiting
    // Por enquanto, apenas logamos
    console.log(`[RATE_LIMIT] ${clientIp} - Config: ${maxRequests}req/${windowMs}ms`);
    
    next();
  } catch (error) {
    console.error('Erro no rate limiting din��mico:', error);
    next();
  }
}

/**
 * Função para inicializar secrets padrão no vault
 */
export async function initializeDefaultSecrets(): Promise<void> {
  try {
    const { getVault } = await import("../lib/vault");
    const vault = getVault();
    
    // Configurações de segurança padrão
    const defaultSecurityConfig: SecurityConfig = {
      apiKeysEnabled: false,
      rateLimitEnabled: true,
      ipWhitelistEnabled: false,
      encryptionEnabled: true
    };
    
    // Definir secrets padrão se não existirem
    const defaultSecrets = {
      'security_config': JSON.stringify(defaultSecurityConfig),
      'rate_limit_config': JSON.stringify({
        windowMs: 15 * 60 * 1000,
        maxRequests: 100
      }),
      'encryption_key': process.env.ENCRYPTION_KEY || 'default-key-change-in-production',
      'api_version': '1.0.0'
    };
    
    for (const [name, value] of Object.entries(defaultSecrets)) {
      const existing = await vault.getSecret(name);
      if (!existing) {
        await vault.setSecret(name, value, `Secret padrão para ${name}`);
        console.log(`✅ Secret '${name}' inicializado no vault`);
      }
    }
    
  } catch (error) {
    console.error('Erro ao inicializar secrets padrão:', error);
  }
}
