import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  PageContainer,
  SectionContainer,
  CardContainer,
} from "@/components/ui/responsive-container";
import { ResponsiveGrid, Stack } from "@/components/ui/responsive-grid";
import {
  useAsyncOperation,
  useSimpleAsync,
  useAsyncList,
  useAsyncTable,
  useAsyncForm,
} from "@/hooks/useAsyncOperation";

// Mock data types
interface Process {
  id: string;
  cnj: string;
  client: string;
  area: string;
  status: "active" | "archived";
  date: string;
}

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
}

// Mock async functions
const fetchProcesses = (): Promise<Process[]> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.8) {
        reject(new Error("Falha na conexão com o servidor"));
        return;
      }
      
      const processes: Process[] = [
        {
          id: "1",
          cnj: "1234567-89.2023.8.26.0001",
          client: "João Silva Ltda",
          area: "Trabalhista",
          status: "active",
          date: "2024-01-15",
        },
        {
          id: "2", 
          cnj: "9876543-21.2023.8.26.0002",
          client: "Maria Oliveira S.A",
          area: "Cível",
          status: "active",
          date: "2024-01-12",
        },
      ];
      
      resolve(processes);
    }, 1500);
  });
};

const fetchClients = (): Promise<Client[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: "1",
          name: "João Silva",
          email: "joao@example.com",
          phone: "(11) 99999-9999",
          company: "Silva & Associados",
        },
        {
          id: "2",
          name: "Maria Oliveira", 
          email: "maria@example.com",
          phone: "(11) 88888-8888",
          company: "Oliveira Advogados",
        },
      ]);
    }, 1000);
  });
};

const fetchEmptyData = (): Promise<[]> => {
  return new Promise((resolve) => {
    setTimeout(() => resolve([]), 800);
  });
};

const saveForm = (data: any): Promise<{ success: boolean }> => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.7) {
        reject(new Error("Erro ao salvar os dados"));
        return;
      }
      resolve({ success: true });
    }, 1200);
  });
};

// Example 1: Basic Process List
function ProcessListExample() {
  const {
    data: processes,
    isLoading,
    error,
    execute,
    LoadingComponent,
    ErrorComponent,
    EmptyComponent,
    shouldShowContent,
  } = useAsyncList<Process[]>("processos", {
    emptyActionLabel: "Sincronizar Processos",
    onEmptyAction: () => console.log("Sincronizando processos..."),
  });

  useEffect(() => {
    execute(fetchProcesses);
  }, []);

  if (isLoading) return <LoadingComponent />;
  if (error) return <ErrorComponent />;
  if (!shouldShowContent()) return <EmptyComponent />;

  return (
    <Stack spacing="md">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Processos ({processes?.length})</h3>
        <Button size="sm" onClick={() => execute(fetchProcesses)}>
          Atualizar
        </Button>
      </div>

      <ResponsiveGrid pattern="cards">
        {processes?.map((process) => (
          <CardContainer key={process.id}>
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium">{process.client}</h4>
                  <p className="text-sm text-gray-600">{process.cnj}</p>
                </div>
                <Badge variant={process.status === "active" ? "default" : "secondary"}>
                  {process.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Área:</span>
                  <div className="font-medium">{process.area}</div>
                </div>
                <div>
                  <span className="text-gray-500">Data:</span>
                  <div className="font-medium">{process.date}</div>
                </div>
              </div>
            </div>
          </CardContainer>
        ))}
      </ResponsiveGrid>
    </Stack>
  );
}

// Example 2: Client Table
function ClientTableExample() {
  const {
    data: clients,
    isLoading,
    error,
    LoadingComponent,
    ErrorComponent,
    EmptyComponent,
    shouldShowContent,
  } = useAsyncTable<Client[]>("clientes");

  const { execute } = useSimpleAsync(() => fetchClients(), []);

  useEffect(() => {
    execute(fetchClients);
  }, []);

  if (isLoading) return <LoadingComponent />;
  if (error) return <ErrorComponent />;
  if (!shouldShowContent()) return <EmptyComponent />;

  return (
    <CardContainer>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium">Nome</th>
              <th className="text-left py-3 px-4 font-medium">Email</th>
              <th className="text-left py-3 px-4 font-medium">Telefone</th>
              <th className="text-left py-3 px-4 font-medium">Empresa</th>
            </tr>
          </thead>
          <tbody>
            {clients?.map((client) => (
              <tr
                key={client.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="py-3 px-4 font-medium">{client.name}</td>
                <td className="py-3 px-4 text-gray-600">{client.email}</td>
                <td className="py-3 px-4 text-gray-600">{client.phone}</td>
                <td className="py-3 px-4 text-gray-600">{client.company}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContainer>
  );
}

// Example 3: Empty State Demo
function EmptyStateExample() {
  const {
    LoadingComponent,
    EmptyComponent,
    execute,
    isLoading,
    shouldShowContent,
  } = useAsyncList("tickets", {
    emptyActionLabel: "Criar Primeiro Ticket",
    onEmptyAction: () => alert("Redirecionar para criação de ticket"),
  });

  useEffect(() => {
    execute(fetchEmptyData);
  }, []);

  if (isLoading) return <LoadingComponent />;
  if (!shouldShowContent()) return <EmptyComponent />;

  return <div>Conteúdo carregado (nunca será mostrado neste exemplo)</div>;
}

// Example 4: Form with Async Submit
function FormExample() {
  const [formData, setFormData] = useState({ name: "", email: "" });
  
  const {
    isLoading,
    error,
    isSuccess,
    execute,
    LoadingComponent,
    ErrorComponent,
  } = useAsyncForm();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await execute(() => saveForm(formData));
  };

  if (isLoading) {
    return <LoadingComponent />;
  }

  return (
    <CardContainer>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Nome</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Digite seu nome"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="Digite seu email"
          />
        </div>

        {error && <ErrorComponent />}
        
        {isSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-800">Dados salvos com sucesso!</p>
          </div>
        )}

        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Salvando..." : "Salvar"}
        </Button>
      </form>
    </CardContainer>
  );
}

// Example 5: Manual State Control
function ManualControlExample() {
  const {
    data,
    isLoading,
    error,
    setData,
    setError,
    execute,
    reset,
    LoadingComponent,
    ErrorComponent,
  } = useAsyncOperation<string>({
    initialData: "Estado inicial",
  });

  return (
    <CardContainer>
      <Stack spacing="md">
        <h4 className="font-medium">Controle Manual de Estado</h4>
        
        <div className="p-3 bg-gray-50 rounded">
          <strong>Estado atual:</strong> {isLoading ? "Carregando..." : data}
        </div>

        {error && <ErrorComponent />}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={() => setData("Novo valor definido manualmente")}
          >
            Definir Dados
          </Button>
          
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setError("Erro simulado")}
          >
            Simular Erro
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => execute(() => 
              new Promise(resolve => setTimeout(() => resolve("Dados carregados!"), 2000))
            )}
          >
            Carregar Async
          </Button>
          
          <Button
            size="sm"
            variant="secondary"
            onClick={reset}
          >
            Reset
          </Button>
        </div>

        {isLoading && <LoadingComponent />}
      </Stack>
    </CardContainer>
  );
}

export default function AsyncOperationExample() {
  return (
    <PageContainer>
      <Stack spacing="lg">
        <SectionContainer>
          <h1 className="text-2xl font-bold">Sistema de Estado Global Padronizado</h1>
          <p className="text-gray-600">
            Exemplos do hook useAsyncOperation() com estados unificados de loading, erro e vazio.
          </p>
        </SectionContainer>

        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="table">Tabela</TabsTrigger>
            <TabsTrigger value="empty">Estado Vazio</TabsTrigger>
            <TabsTrigger value="form">Formulário</TabsTrigger>
            <TabsTrigger value="manual">Controle Manual</TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lista de Processos</CardTitle>
                <p className="text-sm text-gray-600">
                  Exemplo usando useAsyncList() com loading, error e retry automático
                </p>
              </CardHeader>
              <CardContent>
                <ProcessListExample />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="table" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tabela de Clientes</CardTitle>
                <p className="text-sm text-gray-600">
                  Exemplo usando useAsyncTable() com skeleton de tabela
                </p>
              </CardHeader>
              <CardContent>
                <ClientTableExample />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="empty" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Estado Vazio</CardTitle>
                <p className="text-sm text-gray-600">
                  Demonstra o estado vazio com call-to-action
                </p>
              </CardHeader>
              <CardContent>
                <EmptyStateExample />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="form" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Formulário com Async Submit</CardTitle>
                <p className="text-sm text-gray-600">
                  Exemplo usando useAsyncForm() com loading e erro inline
                </p>
              </CardHeader>
              <CardContent>
                <FormExample />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Controle Manual de Estado</CardTitle>
                <p className="text-sm text-gray-600">
                  Demonstra setData(), setError(), execute() e reset()
                </p>
              </CardHeader>
              <CardContent>
                <ManualControlExample />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <SectionContainer>
          <h2 className="text-xl font-semibold mb-4">Código de Exemplo</h2>
          <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-x-auto">
{`// Hook unificado para estados
function useAsyncOperation() {
  return {
    data,
    isLoading,
    error,
    LoadingComponent: () => <LoadingState />,
    ErrorComponent: () => <ErrorState onRetry={refetch} />,
    EmptyComponent: () => <EmptyState />
  };
}

// Uso em componentes
function ProcessList() {
  const {
    data: processes,
    isLoading,
    error,
    execute,
    LoadingComponent,
    ErrorComponent,
    EmptyComponent,
    shouldShowContent
  } = useAsyncList("processos");

  useEffect(() => {
    execute(() => fetchProcesses());
  }, []);

  if (isLoading) return <LoadingComponent />;
  if (error) return <ErrorComponent />;
  if (!shouldShowContent()) return <EmptyComponent />;

  return (
    <div>
      {processes?.map(process => 
        <ProcessCard key={process.id} process={process} />
      )}
    </div>
  );
}`}
          </pre>
        </SectionContainer>
      </Stack>
    </PageContainer>
  );
}
