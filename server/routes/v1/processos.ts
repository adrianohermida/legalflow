import { Router } from "express";
import {
  mockProcessosApi as processosApi,
  mockMovimentacoesApi,
  mockPublicacoesApi
} from "../../lib/mock-api";
import { validateRequest, commonSchemas } from "../../middleware/validation";
import { CreateProcessoRequest, UpdateRequest, ProcessoFilters, PaginationParams } from "@shared/api";

const router = Router();

// GET /api/v1/processos - List all processes with pagination and filters
router.get("/", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort_by = "created_at",
      sort_order = "desc",
      query,
      tribunal_sigla,
      created_after,
      created_before,
    } = req.query as PaginationParams & ProcessoFilters;

    // For now, get all processes (in production, add filtering and pagination)
    const processes = await processosApi.getAll();

    // Apply client-side filtering for demonstration
    let filteredProcesses = processes;

    if (query) {
      filteredProcesses = filteredProcesses.filter(p => 
        p.numero_cnj?.includes(query as string) ||
        p.titulo_polo_ativo?.toLowerCase().includes((query as string).toLowerCase()) ||
        p.titulo_polo_passivo?.toLowerCase().includes((query as string).toLowerCase())
      );
    }

    if (tribunal_sigla) {
      filteredProcesses = filteredProcesses.filter(p => p.tribunal_sigla === tribunal_sigla);
    }

    // Apply pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    const paginatedProcesses = filteredProcesses.slice(offset, offset + limitNum);

    res.paginated(paginatedProcesses, {
      page: pageNum,
      limit: limitNum,
      total: filteredProcesses.length,
      totalPages: Math.ceil(filteredProcesses.length / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/processos/:cnj - Get specific process by CNJ
router.get("/:cnj", async (req, res, next) => {
  try {
    const { cnj } = req.params;
    
    if (!cnj || !/^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/.test(cnj)) {
      return res.error("CNJ inválido", 400);
    }

    const processo = await processosApi.getById(cnj);
    
    if (!processo) {
      return res.error("Processo não encontrado", 404);
    }

    res.success(processo, "Processo encontrado com sucesso");
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/processos - Create new process
router.post("/", 
  validateRequest({
    numero_cnj: commonSchemas.cnj,
    tribunal_sigla: {
      type: "string",
      maxLength: 10,
    },
    titulo_polo_ativo: {
      type: "string",
      maxLength: 500,
    },
    titulo_polo_passivo: {
      type: "string",
      maxLength: 500,
    },
  }),
  async (req, res, next) => {
    try {
      const processoData: CreateProcessoRequest = req.body;
      
      // Check if process already exists
      try {
        const existingProcess = await processosApi.getById(processoData.numero_cnj);
        if (existingProcess) {
          return res.error("Processo já existe", 409);
        }
      } catch (error) {
        // Process doesn't exist, continue with creation
      }

      const newProcess = await processosApi.create({
        numero_cnj: processoData.numero_cnj,
        tribunal_sigla: processoData.tribunal_sigla || null,
        titulo_polo_ativo: processoData.titulo_polo_ativo || null,
        titulo_polo_passivo: processoData.titulo_polo_passivo || null,
        data: processoData.data || null,
        crm_id: null,
        decisoes: null,
      });

      res.success(newProcess, "Processo criado com sucesso");
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/processos/:cnj - Update existing process
router.put("/:cnj",
  validateRequest({
    tribunal_sigla: {
      type: "string",
      maxLength: 10,
    },
    titulo_polo_ativo: {
      type: "string",
      maxLength: 500,
    },
    titulo_polo_passivo: {
      type: "string",
      maxLength: 500,
    },
  }),
  async (req, res, next) => {
    try {
      const { cnj } = req.params;
      
      if (!cnj || !/^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/.test(cnj)) {
        return res.error("CNJ inválido", 400);
      }

      // Check if process exists
      try {
        await processosApi.getById(cnj);
      } catch (error) {
        return res.error("Processo não encontrado", 404);
      }

      const updateData = req.body;
      const updatedProcess = await processosApi.update(cnj, updateData);

      res.success(updatedProcess, "Processo atualizado com sucesso");
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/processos/:cnj - Delete process (soft delete)
router.delete("/:cnj", async (req, res, next) => {
  try {
    const { cnj } = req.params;
    
    if (!cnj || !/^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/.test(cnj)) {
      return res.error("CNJ inválido", 400);
    }

    // Check if process exists
    try {
      await processosApi.getById(cnj);
    } catch (error) {
      return res.error("Processo não encontrado", 404);
    }

    // Since we don't have a delete method, we'll mark as deleted
    await processosApi.update(cnj, { 
      decisoes: "PROCESSO_DELETADO" // Using decisoes field as a status indicator
    });

    res.success(null, "Processo removido com sucesso");
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/processos/:cnj/movimentacoes - Get process movements
router.get("/:cnj/movimentacoes", async (req, res, next) => {
  try {
    const { cnj } = req.params;
    
    if (!cnj || !/^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/.test(cnj)) {
      return res.error("CNJ inválido", 400);
    }

    const movimentacoes = await mockMovimentacoesApi.getByProcesso(cnj);

    res.success(movimentacoes, "Movimentações encontradas com sucesso");
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/processos/:cnj/publicacoes - Get process publications
router.get("/:cnj/publicacoes", async (req, res, next) => {
  try {
    const { cnj } = req.params;
    
    if (!cnj || !/^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/.test(cnj)) {
      return res.error("CNJ inválido", 400);
    }

    const publicacoes = await mockPublicacoesApi.getByProcesso(cnj);

    res.success(publicacoes, "Publicações encontradas com sucesso");
  } catch (error) {
    next(error);
  }
});

export default router;
