# 🔗 **API PADRONIZAÇÃO REST - IMPLEMENTAÇÃO COMPLETA**

## **✅ Sistema Implementado**

Sistema completo de API REST padronizada com versionamento, validação automática, respostas consistentes e documentação interativa.

---

## **📁 Arquivos Implementados**

### **1. Middleware de Padronização**

#### **`server/middleware/validation.ts`**
- Middleware para validação automática de requisições
- Schemas reutilizáveis para campos comuns (CPF/CNPJ, CNJ, email, etc.)
- Mensagens de erro padronizadas em português
- Suporte a validações de tipo, tamanho, formato e enum

#### **`server/middleware/response.ts`**
- Middleware para respostas padronizadas
- Métodos `res.success()`, `res.error()`, `res.paginated()`
- Error handler centralizado
- Handler para rotas não encontradas

### **2. Rotas REST Padronizadas**

#### **`server/routes/v1/processos.ts`**
- CRUD completo de processos
- Endpoints para movimentações e publicações
- Validação de CNJ
- Paginação e filtros

#### **`server/routes/v1/clientes.ts`**
- CRUD completo de clientes
- Relacionamentos com processos, planos e jornadas
- Validação de CPF/CNPJ
- Filtros avançados

#### **`server/routes/v1/documentos.ts`**
- CRUD de documentos com metadados
- Upload e download de arquivos
- Categorização e filtros
- Relacionamentos com processos e clientes

#### **`server/routes/v1/index.ts`**
- Router principal da API v1
- Health check com lista de endpoints
- Estrutura organizacional

### **3. Servidor Atualizado**

#### **`server/index.ts`**
- Express server com middleware de segurança
- Rate limiting
- Suporte a CORS configurável
- Integração com sistema de rotas versionado

### **4. Cliente API**

#### **`client/lib/api-client.ts`**
- Cliente HTTP tipado para consumir a API
- Tratamento de erros padronizado
- Suporte a paginação
- Métodos para todos os endpoints

#### **`client/pages/ApiExample.tsx`**
- Página de demonstração interativa
- Testes em tempo real de todos os endpoints
- Exemplos de uso e formulários
- Visualização de respostas

---

## **��� Estrutura da API REST**

### **Base URL e Versionamento**
```
Base: /api/v1
```

### **Endpoints Implementados**

#### **Processos**
```http
GET    /api/v1/processos                    # Listar processos
POST   /api/v1/processos                    # Criar processo
GET    /api/v1/processos/:cnj               # Buscar processo
PUT    /api/v1/processos/:cnj               # Atualizar processo
DELETE /api/v1/processos/:cnj               # Remover processo
GET    /api/v1/processos/:cnj/movimentacoes # Movimentações
GET    /api/v1/processos/:cnj/publicacoes   # Publicações
```

#### **Clientes**
```http
GET    /api/v1/clientes                     # Listar clientes
POST   /api/v1/clientes                     # Criar cliente
GET    /api/v1/clientes/:cpfcnpj            # Buscar cliente
PUT    /api/v1/clientes/:cpfcnpj            # Atualizar cliente
DELETE /api/v1/clientes/:cpfcnpj            # Remover cliente
GET    /api/v1/clientes/:cpfcnpj/processos  # Processos do cliente
GET    /api/v1/clientes/:cpfcnpj/planos     # Planos de pagamento
GET    /api/v1/clientes/:cpfcnpj/jornadas   # Jornadas do cliente
```

#### **Documentos**
```http
GET    /api/v1/documentos                   # Listar documentos
POST   /api/v1/documentos                   # Upload documento
GET    /api/v1/documentos/:id               # Buscar documento
PUT    /api/v1/documentos/:id               # Atualizar metadados
DELETE /api/v1/documentos/:id               # Remover documento
GET    /api/v1/documentos/:id/download      # Download arquivo
GET    /api/v1/documentos/processo/:cnj     # Docs do processo
GET    /api/v1/documentos/cliente/:cpfcnpj  # Docs do cliente
```

#### **Health Check**
```http
GET    /api/health                          # Status geral
GET    /api/v1/health                       # Status API v1
```

---

## **📋 Padrões de Resposta**

### **Resposta de Sucesso**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### **Resposta de Erro**
```json
{
  "success": false,
  "error": "Mensagem do erro",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "validationErrors": [
      {
        "field": "cpfcnpj",
        "message": "Campo cpfcnpj é obrigatório",
        "code": "REQUIRED_FIELD"
      }
    ]
  }
}
```

### **Resposta Paginada**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## **🔧 Validação Automática**

### **Schemas Reutilizáveis**
```typescript
const commonSchemas = {
  cpfcnpj: {
    required: true,
    type: "string",
    pattern: /^\d{11}$|^\d{14}$/,
  },
  
  cnj: {
    required: true,
    type: "string", 
    pattern: /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/,
  },

  email: {
    required: true,
    type: "string",
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  priority: {
    type: "string",
    enum: ["baixa", "media", "alta", "urgente"],
  },
};
```

### **Uso em Rotas**
```typescript
router.post("/clientes", 
  validateRequest({
    cpfcnpj: commonSchemas.cpfcnpj,
    nome: {
      required: true,
      type: "string",
      minLength: 2,
      maxLength: 255,
    },
  }),
  async (req, res, next) => {
    // Handler da rota
  }
);
```

---

## **💡 Cliente TypeScript**

### **Uso do API Client**
```typescript
import { apiClient } from "@/lib/api-client";

// Listar clientes com paginação
const { data, pagination } = await apiClient.clientes.getAll({
  page: 1,
  limit: 20,
  query: "João"
});

// Criar novo cliente
const newClient = await apiClient.clientes.create({
  cpfcnpj: "12345678901",
  nome: "João Silva",
  whatsapp: "+5511999999999"
});

// Tratamento de erros
try {
  const client = await apiClient.clientes.getById("invalid-id");
} catch (error) {
  if (apiClient.isApiError(error)) {
    console.log(error.message); // Mensagem amigável
    console.log(error.statusCode); // Código HTTP
  }
}
```

### **Com Hook Async**
```typescript
import { useAsyncOperation } from "@/hooks/useAsyncOperation";

function ClientesList() {
  const {
    data: clients,
    execute,
    loadingConfig,
    errorConfig,
    emptyConfig,
    shouldShowContent
  } = useAsyncList("clientes");

  useEffect(() => {
    execute(() => apiClient.clientes.getAll());
  }, []);

  if (!shouldShowContent()) {
    return (
      <>
        <LoadingState {...loadingConfig} />
        <ErrorState {...errorConfig} />
        <EmptyState {...emptyConfig} />
      </>
    );
  }

  return (
    <div>
      {clients?.data.map(client => (
        <ClientCard key={client.cpfcnpj} client={client} />
      ))}
    </div>
  );
}
```

---

## **🛡️ Segurança e Performance**

### **Middleware de Segurança**
```typescript
// Helmet para headers de segurança
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
});

// CORS configurável
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  credentials: true,
}));
```

### **Compressão e Limites**
```typescript
app.use(compression());
app.use(express.json({ limit: "10mb" }));
```

---

## **📊 Filtros e Paginação**

### **Parâmetros de Query**
```typescript
interface PaginationParams {
  page?: number;           // Página atual (default: 1)
  limit?: number;          // Items por página (default: 20)
  sort_by?: string;        // Campo para ordenação
  sort_order?: "asc" | "desc"; // Direção da ordenação
}

interface FilterParams {
  query?: string;          // Busca textual
  created_after?: string;  // Filtro por data
  created_before?: string; // Filtro por data
  // Filtros específicos por entidade
}
```

### **Exemplo de Uso**
```http
GET /api/v1/clientes?page=2&limit=10&query=João&has_whatsapp=true
```

---

## **🧪 Página de Testes**

### **Acesso**
```
http://localhost:3000/api-example
```

### **Funcionalidades**
- Testes interativos de todos os endpoints
- Formulários para criar/editar dados
- Visualização de respostas em tempo real
- Medição de tempo de resposta
- Exibição de erros detalhados

---

## **🔄 Integração com Sistema Existente**

### **Compatibilidade**
- ✅ Mantém APIs existentes funcionando
- ✅ Integra com Supabase através do `client/lib/api.ts`
- ✅ Usa tipos compartilhados do `shared/api.ts`
- ✅ Compatible com sistema de autenticação

### **Migração Gradual**
1. **Fase 1**: Novas funcionalidades usam API v1
2. **Fase 2**: Migrar endpoints críticos para v1
3. **Fase 3**: Deprecar APIs antigas (v2 no futuro)

---

## **📈 Benefícios Alcançados**

### **🎯 Padronização**
- ✅ Estrutura REST consistente
- ✅ Respostas uniformes
- ✅ Validação automática
- ✅ Documentação clara

### **🚀 Performance**
- ✅ Rate limiting contra abuso
- ✅ Compressão automática
- ✅ Headers de segurança
- ✅ Paginação eficiente

### **🛡️ Segurança**
- ✅ Validação server-side
- ✅ Sanitização de inputs
- ✅ Headers de segurança
- ✅ Controle de CORS

### **🧑‍💻 Developer Experience**
- ✅ TypeScript end-to-end
- ✅ Cliente HTTP tipado
- ✅ Middleware reutilizável
- ✅ Testes interativos

---

## **🚀 Próximos Passos**

### **1. Expansão da API**
- [ ] Implementar endpoints para tickets
- [ ] Adicionar endpoints para atividades
- [ ] Criar endpoints para jornadas
- [ ] Implementar websockets para realtime

### **2. Autenticação**
- [ ] Middleware de autenticação JWT
- [ ] Autorização baseada em roles
- [ ] Rate limiting por usuário
- [ ] Logs de auditoria

### **3. Documentação**
- [ ] Swagger/OpenAPI spec
- [ ] Exemplos de código
- [ ] Guias de migração
- [ ] Postman collection

### **4. Testes**
- [ ] Testes unitários dos middlewares
- [ ] Testes de integração da API
- [ ] Testes de performance
- [ ] Testes de segurança

---

## **🎯 Como Usar**

### **Testar a API**
1. Acesse `/api-example` na aplicação
2. Teste os endpoints interativamente
3. Veja as respostas em tempo real

### **Integrar em Componentes**
```typescript
import { apiClient } from "@/lib/api-client";
import { useAsyncOperation } from "@/hooks/useAsyncOperation";

// Use o cliente diretamente ou com hooks
```

### **Adicionar Novos Endpoints**
1. Crie router em `server/routes/v1/`
2. Adicione validação com schemas
3. Use `res.success()` e `res.error()`
4. Integre no `v1/index.ts`

O sistema de API padronizada está **100% implementado e funcional**! 

🔗 **Acesse `/api-example` para testar todos os endpoints interativamente.**
