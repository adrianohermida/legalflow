import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import {
  Database,
  Download,
  Upload,
  Trash2,
  Play,
  RefreshCw,
  FileText,
  Users,
  Calendar,
  DollarSign,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  Package,
} from "lucide-react";

interface SeedData {
  clientes: number;
  processos: number;
  jornadas: number;
  planos: number;
  tickets: number;
  activities: number;
  deals: number;
}

const DevTools: React.FC = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importData, setImportData] = useState("");
  const [selectedProcesso, setSelectedProcesso] = useState("");
  const [exportResult, setExportResult] = useState<any>(null);
  const { toast } = useToast();

  // Sample seed data configuration
  const seedConfig: SeedData = {
    clientes: 3,
    processos: 5,
    jornadas: 1,
    planos: 3,
    tickets: 3,
    activities: 5,
    deals: 3,
  };

  const runSeed = async () => {
    setIsSeeding(true);
    setSeedProgress(0);

    try {
      // 1. Create test clients
      setSeedProgress(10);
      const clientesData = [
        {
          nome: "João Silva",
          cpfcnpj: "123.456.789-00",
          email: "joao@email.com",
          telefone: "(11) 98765-4321",
          endereco: "Rua das Flores, 123 - São Paulo/SP",
        },
        {
          nome: "Maria Santos",
          cpfcnpj: "987.654.321-00",
          email: "maria@email.com",
          telefone: "(21) 87654-3210",
          endereco: "Av. Principal, 456 - Rio de Janeiro/RJ",
        },
        {
          nome: "Empresa LTDA",
          cpfcnpj: "12.345.678/0001-90",
          email: "contato@empresa.com",
          telefone: "(11) 3333-4444",
          endereco: "Av. Empresarial, 789 - São Paulo/SP",
        },
      ];

      await supabase.from("legalflow.clientes").insert(clientesData);
      setSeedProgress(25);

      // 2. Create test processes
      const processosData = [
        {
          cnj: "1234567-89.2024.8.26.0001",
          numero: "1234567-89.2024.8.26.0001",
          tribunal: "TJSP",
          valor_causa: 50000.0,
          situacao: "Ativo",
          instancia: "1º Grau",
          data_distribuicao: "2024-01-15",
          area: "Cível",
          classe: "Ação de Cobrança",
          assunto: "Inadimplemento de Contrato",
          orgao_julgador: "1ª Vara Cível",
          cliente_cpfcnpj: "123.456.789-00",
        },
        {
          cnj: "2345678-90.2024.8.26.0002",
          numero: "2345678-90.2024.8.26.0002",
          tribunal: "TJRJ",
          valor_causa: 25000.0,
          situacao: "Ativo",
          instancia: "1º Grau",
          data_distribuicao: "2024-02-01",
          area: "Trabalhista",
          classe: "Reclamatória Trabalhista",
          assunto: "Verbas Rescisórias",
          orgao_julgador: "2ª Vara do Trabalho",
          cliente_cpfcnpj: "987.654.321-00",
        },
      ];

      await supabase.from("legalflow.processos").insert(processosData);
      setSeedProgress(50);

      // 3. Create journey instances
      const journeyData = {
        journey_id: "123e4567-e89b-12d3-a456-426614174000", // Use existing journey
        cliente_cpfcnpj: "123.456.789-00",
        processo_cnj: "1234567-89.2024.8.26.0001",
        status: "active",
        current_stage: 1,
        total_stages: 4,
        progress_percentage: 25,
        metadata: {
          created_reason: "Seeding for QA",
          auto_generated: true,
        },
      };

      await supabase.from("legalflow.journey_instances").insert(journeyData);
      setSeedProgress(65);

      // 4. Create payment plans
      const planosData = [
        {
          cliente_cpfcnpj: "123.456.789-00",
          nome: "Plano Honorários - João Silva",
          valor_total: 5000.0,
          num_parcelas: 5,
          status: "active",
        },
        {
          cliente_cpfcnpj: "987.654.321-00",
          nome: "Plano Consultoria - Maria Santos",
          valor_total: 3000.0,
          num_parcelas: 3,
          status: "active",
        },
      ];

      const { data: planos } = await supabase
        .from("legalflow.planos_pagamento")
        .insert(planosData)
        .select();
      setSeedProgress(75);

      // 5. Create tickets
      const ticketsData = [
        {
          title: "Dúvida sobre processo",
          description: "Cliente tem dúvidas sobre andamento do processo",
          status: "open",
          priority: "medium",
          cliente_cpfcnpj: "123.456.789-00",
          assigned_to: null,
        },
        {
          title: "Solicitação de documento",
          description: "Cliente solicita cópia de petição",
          status: "in_progress",
          priority: "low",
          cliente_cpfcnpj: "987.654.321-00",
          assigned_to: null,
        },
      ];

      await supabase.from("legalflow.tickets").insert(ticketsData);
      setSeedProgress(85);

      // 6. Create activities
      const activitiesData = [
        {
          title: "Reunião com cliente",
          description: "Reunião para discutir estratégia processual",
          status: "pending",
          due_date: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          assigned_to: null,
          cliente_cpfcnpj: "123.456.789-00",
        },
        {
          title: "Protocolar petição",
          description: "Protocolar contestação no processo",
          status: "in_progress",
          due_date: new Date(
            Date.now() + 3 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          assigned_to: null,
          cliente_cpfcnpj: "123.456.789-00",
        },
      ];

      await supabase.from("legalflow.activities").insert(activitiesData);
      setSeedProgress(95);

      // 7. Create deals
      const dealsData = [
        {
          title: "Novo Cliente - Empresa XYZ",
          description: "Empresa interessada em consultoria jurídica",
          value: 10000.0,
          stage: "proposal",
          probability: 70,
          expected_close_date: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          assigned_to: null,
        },
        {
          title: "Processo Trabalhista - ABC Ltda",
          description: "Defesa em processo trabalhista",
          value: 15000.0,
          stage: "negotiation",
          probability: 50,
          expected_close_date: new Date(
            Date.now() + 15 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          assigned_to: null,
        },
      ];

      await supabase.from("legalflow.deals").insert(dealsData);
      setSeedProgress(100);

      // Log seeding event
      await supabase.from("legalflow.app_events").insert({
        event: "development_seed_completed",
        payload: {
          ...seedConfig,
          timestamp: new Date().toISOString(),
          environment: "development",
        },
      });

      toast({
        title: "Seed Concluído",
        description: "Dados de teste criados com sucesso",
      });
    } catch (error) {
      console.error("Error seeding data:", error);
      toast({
        title: "Erro no Seed",
        description: "Falha ao criar dados de teste",
        variant: "destructive",
      });
    } finally {
      setIsSeeding(false);
      setSeedProgress(0);
    }
  };

  const exportProcesso = async () => {
    if (!selectedProcesso) {
      toast({
        title: "Erro",
        description: "Selecione um processo para exportar",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Export complete process data
      const { data: processo } = await supabase
        .from("legalflow.processos")
        .select("*")
        .eq("cnj", selectedProcesso)
        .single();

      const { data: cliente } = await supabase
        .from("legalflow.clientes")
        .select("*")
        .eq("cpfcnpj", processo.cliente_cpfcnpj)
        .single();

      const { data: timeline } = await supabase
        .from("legalflow.timeline")
        .select("*")
        .eq("processo_cnj", selectedProcesso);

      const { data: jornadas } = await supabase
        .from("legalflow.journey_instances")
        .select("*")
        .eq("processo_cnj", selectedProcesso);

      const { data: documentos } = await supabase
        .from("legalflow.documentos")
        .select("*")
        .eq("processo_cnj", selectedProcesso);

      const { data: agenda } = await supabase
        .from("legalflow.agenda")
        .select("*")
        .eq("processo_cnj", selectedProcesso);

      const { data: financeiro } = await supabase
        .from("legalflow.planos_pagamento")
        .select("*")
        .eq("cliente_cpfcnpj", processo.cliente_cpfcnpj);

      const { data: tickets } = await supabase
        .from("legalflow.tickets")
        .select("*")
        .eq("cliente_cpfcnpj", processo.cliente_cpfcnpj);

      const { data: activities } = await supabase
        .from("legalflow.activities")
        .select("*")
        .eq("cliente_cpfcnpj", processo.cliente_cpfcnpj);

      const exportData = {
        metadata: {
          exported_at: new Date().toISOString(),
          processo_cnj: selectedProcesso,
          version: "1.0",
        },
        cliente,
        processo,
        timeline: timeline || [],
        jornadas: jornadas || [],
        documentos: documentos || [],
        agenda: agenda || [],
        financeiro: financeiro || [],
        tickets: tickets || [],
        activities: activities || [],
      };

      setExportResult(exportData);

      // Download as JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `processo_${selectedProcesso}_export.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Concluído",
        description: "Arquivo baixado com sucesso",
      });
    } catch (error) {
      console.error("Error exporting:", error);
      toast({
        title: "Erro no Export",
        description: "Falha ao exportar dados",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const importData_func = async () => {
    if (!importData.trim()) {
      toast({
        title: "Erro",
        description: "Cole os dados JSON para importar",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    try {
      const data = JSON.parse(importData);

      // Validate structure
      if (!data.metadata || !data.processo || !data.cliente) {
        throw new Error("Estrutura de dados inválida");
      }

      // Import in order: cliente -> processo -> related data
      if (data.cliente) {
        await supabase.from("legalflow.clientes").upsert(data.cliente);
      }

      if (data.processo) {
        await supabase.from("legalflow.processos").upsert(data.processo);
      }

      if (data.timeline?.length > 0) {
        await supabase.from("legalflow.timeline").upsert(data.timeline);
      }

      if (data.jornadas?.length > 0) {
        await supabase
          .from("legalflow.journey_instances")
          .upsert(data.jornadas);
      }

      if (data.documentos?.length > 0) {
        await supabase.from("legalflow.documentos").upsert(data.documentos);
      }

      if (data.agenda?.length > 0) {
        await supabase.from("legalflow.agenda").upsert(data.agenda);
      }

      if (data.financeiro?.length > 0) {
        await supabase
          .from("legalflow.planos_pagamento")
          .upsert(data.financeiro);
      }

      if (data.tickets?.length > 0) {
        await supabase.from("legalflow.tickets").upsert(data.tickets);
      }

      if (data.activities?.length > 0) {
        await supabase.from("legalflow.activities").upsert(data.activities);
      }

      // Log import event
      await supabase.from("legalflow.app_events").insert({
        event: "development_import_completed",
        payload: {
          processo_cnj: data.processo.cnj,
          imported_at: new Date().toISOString(),
          records_count: {
            timeline: data.timeline?.length || 0,
            documentos: data.documentos?.length || 0,
            agenda: data.agenda?.length || 0,
            financeiro: data.financeiro?.length || 0,
            tickets: data.tickets?.length || 0,
            activities: data.activities?.length || 0,
          },
        },
      });

      toast({
        title: "Import Concluído",
        description: "Dados importados com sucesso",
      });

      setImportData("");
    } catch (error) {
      console.error("Error importing:", error);
      toast({
        title: "Erro no Import",
        description:
          error instanceof Error ? error.message : "Falha ao importar dados",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm("ATENÇÃO: Isso apagará TODOS os dados de teste. Confirma?")) {
      return;
    }

    try {
      // Delete in reverse order due to foreign keys
      await supabase
        .from("legalflow.activities")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase
        .from("legalflow.tickets")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase
        .from("legalflow.deals")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase
        .from("legalflow.planos_pagamento")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase
        .from("legalflow.journey_instances")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase
        .from("legalflow.timeline")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("legalflow.processos").delete().neq("cnj", "dummy");
      await supabase
        .from("legalflow.clientes")
        .delete()
        .neq("cpfcnpj", "dummy");

      toast({
        title: "Dados Limpos",
        description: "Todos os dados de teste foram removidos",
      });
    } catch (error) {
      console.error("Error clearing data:", error);
      toast({
        title: "Erro",
        description: "Falha ao limpar dados",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Ferramentas de Desenvolvimento
        </h1>
        <p className="text-gray-600">Seeds, Import/Export para QA replicável</p>
      </div>

      <Alert className="mb-6 border-yellow-200 bg-yellow-50">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          <strong>Ambiente de Desenvolvimento:</strong> Use apenas em staging.
          Nunca execute em produção.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="seed" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="seed">Seed Database</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>

        {/* Seed Tab */}
        <TabsContent value="seed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>Seed Database</span>
              </CardTitle>
              <CardDescription>
                Cria dados de teste padronizados para QA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span>{seedConfig.clientes} Clientes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    <span>{seedConfig.processos} Processos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <span>{seedConfig.jornadas} Jornada</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span>{seedConfig.planos} Planos</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-orange-600" />
                    <span>{seedConfig.tickets} Tickets</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-cyan-600" />
                    <span>{seedConfig.activities} Activities</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4 text-indigo-600" />
                    <span>{seedConfig.deals} Deals</span>
                  </div>
                </div>

                {isSeeding && (
                  <div className="space-y-2">
                    <Progress value={seedProgress} />
                    <div className="text-sm text-gray-600 text-center">
                      Criando dados de teste... {seedProgress}%
                    </div>
                  </div>
                )}

                <div className="flex space-x-3">
                  <Button
                    onClick={runSeed}
                    disabled={isSeeding}
                    className="flex items-center space-x-2"
                  >
                    {isSeeding ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span>Executar Seed</span>
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={clearAllData}
                    disabled={isSeeding}
                    className="flex items-center space-x-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Limpar Dados</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Export Processo</span>
              </CardTitle>
              <CardDescription>
                Exporta processo completo com dados relacionados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="processo-cnj">CNJ do Processo</Label>
                  <Input
                    id="processo-cnj"
                    placeholder="Ex: 1234567-89.2024.8.26.0001"
                    value={selectedProcesso}
                    onChange={(e) => setSelectedProcesso(e.target.value)}
                  />
                </div>

                <Button
                  onClick={exportProcesso}
                  disabled={isExporting || !selectedProcesso}
                  className="flex items-center space-x-2"
                >
                  {isExporting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>Exportar JSON</span>
                </Button>

                {exportResult && (
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Export concluído! Arquivo baixado automaticamente.
                      <br />
                      <small>
                        Inclui: cliente, processo, timeline, jornadas,
                        documentos, agenda, financeiro, tickets, activities
                      </small>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Import Processo</span>
              </CardTitle>
              <CardDescription>
                Importa dados JSON de processo (staging only)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="import-json">Dados JSON</Label>
                  <Textarea
                    id="import-json"
                    placeholder="Cole aqui o JSON exportado..."
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>

                <Button
                  onClick={importData_func}
                  disabled={isImporting || !importData.trim()}
                  className="flex items-center space-x-2"
                >
                  {isImporting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>Importar Dados</span>
                </Button>

                <Alert className="border-blue-200 bg-blue-50">
                  <AlertTriangle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Atenção:</strong> Import usa UPSERT - dados
                    existentes serão atualizados. Use apenas em ambiente de
                    staging.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DevTools;
