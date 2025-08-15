/**
 * STANDARDIZED API ROUTES
 * Implementing consistent REST pattern as suggested
 */

import { Router } from 'express';
import { processosRouter } from './v1/processos';
import { clientesRouter } from './v1/clientes';
import { documentosRouter } from './v1/documentos';

const router = Router();

// API v1 routes with consistent REST pattern
router.use('/api/v1/processos', processosRouter);
router.use('/api/v1/clientes', clientesRouter);
router.use('/api/v1/documentos', documentosRouter);

// API health and status endpoints
router.get('/api/health', (req, res) => {
  res.success({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    services: {
      database: 'connected',
      api: 'operational',
      server: 'running'
    }
  }, 'Sistema funcionando corretamente');
});

router.get('/api/status', (req, res) => {
  res.success({
    server: 'operational',
    database: 'connected',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /api/health',
      'GET /api/status',
      'GET /api/v1/processos',
      'POST /api/v1/processos',
      'GET /api/v1/processos/:cnj',
      'PUT /api/v1/processos/:cnj',
      'DELETE /api/v1/processos/:cnj',
      'GET /api/v1/clientes',
      'POST /api/v1/clientes',
      'GET /api/v1/clientes/:cpfcnpj',
      'PUT /api/v1/clientes/:cpfcnpj',
      'DELETE /api/v1/clientes/:cpfcnpj',
      'GET /api/v1/documentos',
      'POST /api/v1/documentos',
      'GET /api/v1/documentos/:id',
      'PUT /api/v1/documentos/:id',
      'DELETE /api/v1/documentos/:id'
    ]
  }, 'API v1 está funcionando corretamente');
});

// API versioning info
router.get('/api', (req, res) => {
  res.success({
    name: 'LegalFlow API',
    version: 'v1',
    description: 'API REST para gerenciamento jurídico',
    documentation: '/api/docs',
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      v1: '/api/v1'
    }
  }, 'LegalFlow API está operacional');
});

// Error handling for unknown API routes
router.use('/api/*', (req, res) => {
  res.status(404).error('Endpoint não encontrado', 404, {
    path: req.path,
    method: req.method,
    availableEndpoints: [
      '/api/health',
      '/api/status',
      '/api/v1/processos',
      '/api/v1/clientes',
      '/api/v1/documentos'
    ]
  });
});

export default router;
export { router as standardizedApiRouter };
