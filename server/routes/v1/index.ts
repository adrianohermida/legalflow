import { Router } from "express";
import processosRouter from "./processos";
import clientesRouter from "./clientes";
import documentosRouter from "./documentos";

const router = Router();

// API v1 routes
router.use("/processos", processosRouter);
router.use("/clientes", clientesRouter);
router.use("/documentos", documentosRouter);

// Health check endpoint for v1
router.get("/health", (req, res) => {
  res.success({
    version: "1.0.0",
    status: "healthy",
    timestamp: new Date().toISOString(),
    endpoints: [
      "GET /api/v1/processos",
      "POST /api/v1/processos",
      "GET /api/v1/processos/:cnj",
      "PUT /api/v1/processos/:cnj",
      "DELETE /api/v1/processos/:cnj",
      "GET /api/v1/processos/:cnj/movimentacoes",
      "GET /api/v1/processos/:cnj/publicacoes",
      "GET /api/v1/clientes",
      "POST /api/v1/clientes",
      "GET /api/v1/clientes/:cpfcnpj",
      "PUT /api/v1/clientes/:cpfcnpj",
      "DELETE /api/v1/clientes/:cpfcnpj",
      "GET /api/v1/clientes/:cpfcnpj/processos",
      "GET /api/v1/clientes/:cpfcnpj/planos",
      "GET /api/v1/clientes/:cpfcnpj/jornadas",
      "GET /api/v1/documentos",
      "POST /api/v1/documentos",
      "GET /api/v1/documentos/:id",
      "PUT /api/v1/documentos/:id",
      "DELETE /api/v1/documentos/:id",
      "GET /api/v1/documentos/:id/download",
      "GET /api/v1/documentos/processo/:cnj",
      "GET /api/v1/documentos/cliente/:cpfcnpj"
    ]
  }, "API v1 está funcionando corretamente");
});

export default router;
