import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  PageContainer,
  SectionContainer,
  CardContainer,
} from "@/components/ui/responsive-container";
import { Stack } from "@/components/ui/responsive-grid";
import { TYPOGRAPHY_PATTERNS } from "@/lib/responsive-design";
import { apiClient, ApiError } from "@/lib/api-client";
import { useAsyncOperation } from "@/hooks/useAsyncOperation";
import { LoadingState, ErrorState } from "@/components/states";

interface ApiTestResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  duration: number;
}

export default function ApiExample() {
  const [results, setResults] = useState<Record<string, ApiTestResult>>({});
  const [formData, setFormData] = useState({
    cliente: { cpfcnpj: "12345678901", nome: "João Silva", whatsapp: "+5511999999999" },
    processo: { numero_cnj: "1234567-89.2023.8.26.0001", titulo_polo_ativo: "João Silva", tribunal_sigla: "TJSP" },
    documento: { file_name: "documento_teste.pdf", category: "peticao", file_type: "application/pdf" }
  });

  const {
    execute: executeApiCall,
    isLoading,
    error,
    loadingConfig,
    errorConfig,
  } = useAsyncOperation();

  const runApiTest = async (testName: string, apiCall: () => Promise<any>) => {
    const startTime = Date.now();
    
    try {
      const result = await executeApiCall(apiCall);
      const duration = Date.now() - startTime;
      
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
          duration,
        }
      }));
    } catch (error) {
      const duration = Date.now() - startTime;
      
      setResults(prev => ({
        ...prev,
        [testName]: {
          success: false,
          error: apiClient.isApiError(error) ? error.message : "Erro desconhecido",
          timestamp: new Date().toISOString(),
          duration,
        }
      }));
    }
  };

  const TestResult: React.FC<{ testName: string }> = ({ testName }) => {
    const result = results[testName];
    
    if (!result) return null;

    return (
      <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
        <AlertDescription>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant={result.success ? "default" : "destructive"}>
                {result.success ? "✅ Sucesso" : "❌ Erro"}
              </Badge>
              <span className="text-xs text-gray-500">{result.duration}ms</span>
            </div>
            
            {result.success ? (
              <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            ) : (
              <p className="text-red-700 text-sm">{result.error}</p>
            )}
            
            <p className="text-xs text-gray-500">
              {new Date(result.timestamp).toLocaleString()}
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  if (isLoading) {
    return <LoadingState {...loadingConfig} />;
  }

  if (error) {
    return <ErrorState {...errorConfig} />;
  }

  return (
    <PageContainer>
      <Stack spacing="lg">
        <SectionContainer>
          <div className="space-y-4">
            <div>
              <h1 className={TYPOGRAPHY_PATTERNS.h1}>
                🔗 API Padronização REST
              </h1>
              <p className={`${TYPOGRAPHY_PATTERNS.body} text-gray-600`}>
                Demonstração da API REST padronizada com endpoints versionados, 
                validação automática e respostas consistentes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">REST API</Badge>
              <Badge variant="outline">Versionamento</Badge>
              <Badge variant="outline">Validação</Badge>
              <Badge variant="outline">Paginação</Badge>
              <Badge variant="outline">TypeScript</Badge>
            </div>
          </div>
        </SectionContainer>

        <Tabs defaultValue="health" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="health">Health Check</TabsTrigger>
            <TabsTrigger value="clientes">Clientes API</TabsTrigger>
            <TabsTrigger value="processos">Processos API</TabsTrigger>
            <TabsTrigger value="documentos">Documentos API</TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>🏥 Health Check Endpoints</CardTitle>
                <p className="text-sm text-gray-600">
                  Verificação de saúde do sistema e disponibilidade da API
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => runApiTest("health-general", () => 
                      fetch("/api/health").then(r => r.json())
                    )}
                    variant="outline"
                    className="w-full"
                  >
                    GET /api/health
                  </Button>
                  
                  <Button 
                    onClick={() => runApiTest("health-v1", () => 
                      apiClient.health.checkV1()
                    )}
                    variant="outline"
                    className="w-full"
                  >
                    GET /api/v1/health
                  </Button>
                </div>

                <TestResult testName="health-general" />
                <TestResult testName="health-v1" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clientes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>👥 Clientes API</CardTitle>
                <p className="text-sm text-gray-600">
                  CRUD completo de clientes com validação e relacionamentos
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cliente-cpfcnpj">CPF/CNPJ</Label>
                    <Input
                      id="cliente-cpfcnpj"
                      value={formData.cliente.cpfcnpj}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        cliente: { ...prev.cliente, cpfcnpj: e.target.value }
                      }))}
                      placeholder="12345678901"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="cliente-nome">Nome</Label>
                    <Input
                      id="cliente-nome"
                      value={formData.cliente.nome}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        cliente: { ...prev.cliente, nome: e.target.value }
                      }))}
                      placeholder="João Silva"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Button 
                    onClick={() => runApiTest("clientes-list", () => 
                      apiClient.clientes.getAll({ page: 1, limit: 5 })
                    )}
                    variant="outline"
                    size="sm"
                  >
                    GET /api/v1/clientes
                  </Button>
                  
                  <Button 
                    onClick={() => runApiTest("clientes-create", () => 
                      apiClient.clientes.create(formData.cliente)
                    )}
                    variant="outline"
                    size="sm"
                  >
                    POST /api/v1/clientes
                  </Button>
                  
                  <Button 
                    onClick={() => runApiTest("clientes-get", () => 
                      apiClient.clientes.getById(formData.cliente.cpfcnpj)
                    )}
                    variant="outline"
                    size="sm"
                  >
                    GET /api/v1/clientes/:id
                  </Button>
                </div>

                <TestResult testName="clientes-list" />
                <TestResult testName="clientes-create" />
                <TestResult testName="clientes-get" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>⚖️ Processos API</CardTitle>
                <p className="text-sm text-gray-600">
                  Gestão de processos jurídicos com movimentações e publicações
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="processo-cnj">Número CNJ</Label>
                    <Input
                      id="processo-cnj"
                      value={formData.processo.numero_cnj}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        processo: { ...prev.processo, numero_cnj: e.target.value }
                      }))}
                      placeholder="1234567-89.2023.8.26.0001"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="processo-polo">Polo Ativo</Label>
                    <Input
                      id="processo-polo"
                      value={formData.processo.titulo_polo_ativo}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        processo: { ...prev.processo, titulo_polo_ativo: e.target.value }
                      }))}
                      placeholder="João Silva"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Button 
                    onClick={() => runApiTest("processos-list", () => 
                      apiClient.processos.getAll({ page: 1, limit: 5 })
                    )}
                    variant="outline"
                    size="sm"
                  >
                    GET /api/v1/processos
                  </Button>
                  
                  <Button 
                    onClick={() => runApiTest("processos-create", () => 
                      apiClient.processos.create(formData.processo)
                    )}
                    variant="outline"
                    size="sm"
                  >
                    POST /api/v1/processos
                  </Button>
                  
                  <Button 
                    onClick={() => runApiTest("processos-get", () => 
                      apiClient.processos.getById(formData.processo.numero_cnj)
                    )}
                    variant="outline"
                    size="sm"
                  >
                    GET /api/v1/processos/:cnj
                  </Button>
                </div>

                <TestResult testName="processos-list" />
                <TestResult testName="processos-create" />
                <TestResult testName="processos-get" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documentos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>📄 Documentos API</CardTitle>
                <p className="text-sm text-gray-600">
                  Upload e gestão de documentos com metadados e categorização
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="doc-name">Nome do Arquivo</Label>
                    <Input
                      id="doc-name"
                      value={formData.documento.file_name}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        documento: { ...prev.documento, file_name: e.target.value }
                      }))}
                      placeholder="documento_teste.pdf"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="doc-category">Categoria</Label>
                    <Input
                      id="doc-category"
                      value={formData.documento.category}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        documento: { ...prev.documento, category: e.target.value }
                      }))}
                      placeholder="peticao"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Button 
                    onClick={() => runApiTest("documentos-list", () => 
                      apiClient.documentos.getAll({ page: 1, limit: 5 })
                    )}
                    variant="outline"
                    size="sm"
                  >
                    GET /api/v1/documentos
                  </Button>
                  
                  <Button 
                    onClick={() => runApiTest("documentos-create", () => 
                      apiClient.documentos.create(formData.documento)
                    )}
                    variant="outline"
                    size="sm"
                  >
                    POST /api/v1/documentos
                  </Button>
                  
                  <Button 
                    onClick={() => runApiTest("documentos-get", () => 
                      apiClient.documentos.getById("doc-1")
                    )}
                    variant="outline"
                    size="sm"
                  >
                    GET /api/v1/documentos/:id
                  </Button>
                </div>

                <TestResult testName="documentos-list" />
                <TestResult testName="documentos-create" />
                <TestResult testName="documentos-get" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <SectionContainer>
          <Card>
            <CardHeader>
              <CardTitle>📋 Estrutura da API Padronizada</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">✨ Benefícios Implementados</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Versionamento:</strong> API v1 com estrutura /api/v1/*</li>
                    <li>• <strong>Validação automática:</strong> Middleware de validação com schemas</li>
                    <li>• <strong>Respostas padronizadas:</strong> ApiResponse e PaginatedResponse</li>
                    <li>• <strong>Tratamento de erros:</strong> Error handling centralizado</li>
                    <li>• <strong>Rate limiting:</strong> Proteção contra abuso</li>
                    <li>• <strong>Type safety:</strong> TypeScript em toda a stack</li>
                  </ul>
                </div>

                <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`// Estrutura REST padronizada
app.use('/api/v1/processos', processosRouter);
app.use('/api/v1/clientes', clientesRouter); 
app.use('/api/v1/documentos', documentosRouter);

// Endpoints implementados:
GET    /api/v1/processos          - Listar processos
POST   /api/v1/processos          - Criar processo
GET    /api/v1/processos/:cnj     - Buscar processo
PUT    /api/v1/processos/:cnj     - Atualizar processo
DELETE /api/v1/processos/:cnj     - Remover processo

// Resposta padronizada:
{
  "success": true,
  "data": { ... },
  "message": "Operação realizada com sucesso",
  "timestamp": "2024-01-15T10:30:00.000Z"
}`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </SectionContainer>
      </Stack>
    </PageContainer>
  );
}
