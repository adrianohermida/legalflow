import { Router } from "express";
import { clientesApi } from "@/lib/api";
import { validateRequest, commonSchemas } from "../../middleware/validation";
import { CreateClienteRequest, ClienteFilters, PaginationParams } from "@shared/api";

const router = Router();

// GET /api/v1/clientes - List all clients with pagination and filters
router.get("/", async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      sort_by = "created_at",
      sort_order = "desc",
      query,
      created_after,
      created_before,
      has_whatsapp,
    } = req.query as PaginationParams & ClienteFilters;

    // Get all clients
    const clients = await clientesApi.getAll();

    // Apply client-side filtering
    let filteredClients = clients;

    if (query) {
      filteredClients = filteredClients.filter(c => 
        c.nome?.toLowerCase().includes((query as string).toLowerCase()) ||
        c.cpfcnpj?.includes(query as string) ||
        c.whatsapp?.includes(query as string)
      );
    }

    if (has_whatsapp !== undefined) {
      const hasWhatsappBool = has_whatsapp === "true";
      filteredClients = filteredClients.filter(c => 
        hasWhatsappBool ? !!c.whatsapp : !c.whatsapp
      );
    }

    if (created_after) {
      filteredClients = filteredClients.filter(c => 
        new Date(c.created_at) >= new Date(created_after as string)
      );
    }

    if (created_before) {
      filteredClients = filteredClients.filter(c => 
        new Date(c.created_at) <= new Date(created_before as string)
      );
    }

    // Apply pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    const paginatedClients = filteredClients.slice(offset, offset + limitNum);

    res.paginated(paginatedClients, {
      page: pageNum,
      limit: limitNum,
      total: filteredClients.length,
      totalPages: Math.ceil(filteredClients.length / limitNum),
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/clientes/:cpfcnpj - Get specific client by CPF/CNPJ
router.get("/:cpfcnpj", async (req, res, next) => {
  try {
    const { cpfcnpj } = req.params;
    
    if (!cpfcnpj || !/^\d{11}$|^\d{14}$/.test(cpfcnpj)) {
      return res.error("CPF/CNPJ inválido", 400);
    }

    const cliente = await clientesApi.getById(cpfcnpj);
    
    if (!cliente) {
      return res.error("Cliente não encontrado", 404);
    }

    res.success(cliente, "Cliente encontrado com sucesso");
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/clientes - Create new client
router.post("/", 
  validateRequest({
    cpfcnpj: commonSchemas.cpfcnpj,
    nome: {
      required: true,
      type: "string",
      minLength: 2,
      maxLength: 255,
    },
    whatsapp: {
      type: "string",
      pattern: /^\+?\d{10,15}$/,
    },
  }),
  async (req, res, next) => {
    try {
      const clienteData: CreateClienteRequest = req.body;
      
      // Check if client already exists
      try {
        const existingClient = await clientesApi.getById(clienteData.cpfcnpj);
        if (existingClient) {
          return res.error("Cliente já existe", 409);
        }
      } catch (error) {
        // Client doesn't exist, continue with creation
      }

      const newClient = await clientesApi.create({
        cpfcnpj: clienteData.cpfcnpj,
        nome: clienteData.nome || null,
        whatsapp: clienteData.whatsapp || null,
        crm_id: null,
      });

      res.success(newClient, "Cliente criado com sucesso");
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/v1/clientes/:cpfcnpj - Update existing client
router.put("/:cpfcnpj",
  validateRequest({
    nome: {
      type: "string",
      minLength: 2,
      maxLength: 255,
    },
    whatsapp: {
      type: "string",
      pattern: /^\+?\d{10,15}$/,
    },
  }),
  async (req, res, next) => {
    try {
      const { cpfcnpj } = req.params;
      
      if (!cpfcnpj || !/^\d{11}$|^\d{14}$/.test(cpfcnpj)) {
        return res.error("CPF/CNPJ inválido", 400);
      }

      // Check if client exists
      try {
        await clientesApi.getById(cpfcnpj);
      } catch (error) {
        return res.error("Cliente não encontrado", 404);
      }

      const updateData = req.body;
      const updatedClient = await clientesApi.update(cpfcnpj, updateData);

      res.success(updatedClient, "Cliente atualizado com sucesso");
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/v1/clientes/:cpfcnpj - Delete client
router.delete("/:cpfcnpj", async (req, res, next) => {
  try {
    const { cpfcnpj } = req.params;
    
    if (!cpfcnpj || !/^\d{11}$|^\d{14}$/.test(cpfcnpj)) {
      return res.error("CPF/CNPJ inválido", 400);
    }

    // Check if client exists
    try {
      await clientesApi.getById(cpfcnpj);
    } catch (error) {
      return res.error("Cliente não encontrado", 404);
    }

    await clientesApi.delete(cpfcnpj);

    res.success(null, "Cliente removido com sucesso");
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/clientes/:cpfcnpj/processos - Get client's processes
router.get("/:cpfcnpj/processos", async (req, res, next) => {
  try {
    const { cpfcnpj } = req.params;
    
    if (!cpfcnpj || !/^\d{11}$|^\d{14}$/.test(cpfcnpj)) {
      return res.error("CPF/CNPJ inválido", 400);
    }

    // Check if client exists
    try {
      await clientesApi.getById(cpfcnpj);
    } catch (error) {
      return res.error("Cliente não encontrado", 404);
    }

    // Get all processes and filter by client
    const { processosApi } = await import("@/lib/api");
    const allProcesses = await processosApi.getAll();
    
    // Filter processes that belong to this client
    const clientProcesses = allProcesses.filter(processo => 
      processo.clientes_processos?.some((cp: any) => 
        cp.clientes?.cpfcnpj === cpfcnpj
      )
    );

    res.success(clientProcesses, "Processos do cliente encontrados com sucesso");
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/clientes/:cpfcnpj/planos - Get client's payment plans
router.get("/:cpfcnpj/planos", async (req, res, next) => {
  try {
    const { cpfcnpj } = req.params;
    
    if (!cpfcnpj || !/^\d{11}$|^\d{14}$/.test(cpfcnpj)) {
      return res.error("CPF/CNPJ inválido", 400);
    }

    // Check if client exists
    try {
      await clientesApi.getById(cpfcnpj);
    } catch (error) {
      return res.error("Cliente não encontrado", 404);
    }

    const { planosPagamentoApi } = await import("@/lib/api");
    const planos = await planosPagamentoApi.getByCliente(cpfcnpj);

    res.success(planos, "Planos de pagamento do cliente encontrados com sucesso");
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/clientes/:cpfcnpj/jornadas - Get client's journey instances
router.get("/:cpfcnpj/jornadas", async (req, res, next) => {
  try {
    const { cpfcnpj } = req.params;
    
    if (!cpfcnpj || !/^\d{11}$|^\d{14}$/.test(cpfcnpj)) {
      return res.error("CPF/CNPJ inválido", 400);
    }

    // Check if client exists
    try {
      await clientesApi.getById(cpfcnpj);
    } catch (error) {
      return res.error("Cliente não encontrado", 404);
    }

    const { journeyInstancesApi } = await import("@/lib/api");
    const jornadas = await journeyInstancesApi.getByCliente(cpfcnpj);

    res.success(jornadas, "Jornadas do cliente encontradas com sucesso");
  } catch (error) {
    next(error);
  }
});

export default router;
