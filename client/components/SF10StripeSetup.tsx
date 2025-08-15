import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../lib/supabase";
import { implAutofix } from "../lib/audit-rpcs";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  RefreshCw,
  Zap,
  Download,
  Eye,
  Settings,
  CreditCard,
  Users,
  Receipt,
  Webhook,
  TestTube,
} from "lucide-react";

interface SetupCheck {
  id: string;
  name: string;
  description: string;
  status: "success" | "error" | "warning" | "pending";
  details?: string;
  action?: string;
}

export const SF10StripeSetup: React.FC = () => {
  const [checks, setChecks] = useState<SetupCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    runDiagnostics();
  }, []);

  const runDiagnostics = async () => {
    setLoading(true);
    const diagnostics: SetupCheck[] = [
      {
        id: "schema",
        name: "Schema Stripe",
        description: "Verifica se as tabelas do Stripe existem",
        status: "pending",
      },
      {
        id: "customers",
        name: "Tabela Customers",
        description: "Verifica se stripe_customers existe",
        status: "pending",
      },
      {
        id: "products",
        name: "Produtos e Preços",
        description: "Verifica se existem produtos configurados",
        status: "pending",
      },
      {
        id: "subscriptions",
        name: "Sistema de Assinaturas",
        description: "Verifica tabela de subscriptions",
        status: "pending",
      },
      {
        id: "invoices",
        name: "Sistema de Faturas",
        description: "Verifica tabela de invoices",
        status: "pending",
      },
      {
        id: "checkout",
        name: "Checkout Sessions",
        description: "Verifica sistema de checkout",
        status: "pending",
      },
      {
        id: "webhooks",
        name: "Sistema de Webhooks",
        description: "Verifica tabela de webhook events",
        status: "pending",
      },
      {
        id: "functions",
        name: "Funções RPC",
        description: "Verifica se as funções RPC estão disponíveis",
        status: "pending",
      },
    ];

    setChecks(diagnostics);

    // Check schema tables
    try {
      const { data: tables, error: tableError } = await supabase
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "legalflow")
        .in("table_name", [
          "stripe_customers", 
          "stripe_products", 
          "stripe_prices",
          "stripe_subscriptions",
          "stripe_invoices",
          "stripe_payment_intents",
          "stripe_checkout_sessions",
          "stripe_webhook_events"
        ]);

      const expectedTables = [
        "stripe_customers", 
        "stripe_products", 
        "stripe_prices",
        "stripe_subscriptions",
        "stripe_invoices", 
        "stripe_payment_intents",
        "stripe_checkout_sessions",
        "stripe_webhook_events"
      ];
      const foundTables = tables?.map(t => t.table_name) || [];
      const missingTables = expectedTables.filter(t => !foundTables.includes(t));

      diagnostics[0].status = missingTables.length === 0 ? "success" : "error";
      diagnostics[0].details = missingTables.length === 0 
        ? "Todas as tabelas Stripe encontradas" 
        : `Tabelas faltando: ${missingTables.join(", ")}`;
      diagnostics[0].action = missingTables.length > 0 ? "install_schema" : undefined;
    } catch (error) {
      diagnostics[0].status = "error";
      diagnostics[0].details = `Erro ao verificar schema: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
    }

    // Check customers table
    try {
      const { data: customers, error: customersError } = await supabase
        .from("legalflow.stripe_customers")
        .select("id")
        .limit(1);

      diagnostics[1].status = customersError ? "error" : "success";
      diagnostics[1].details = customersError 
        ? `Erro: ${customersError.message}`
        : "Tabela stripe_customers funcionando";
    } catch (error) {
      diagnostics[1].status = "error";
      diagnostics[1].details = `Erro ao verificar customers: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
    }

    // Check products and prices
    try {
      const { data: products, error: productsError } = await supabase
        .from("legalflow.stripe_products")
        .select("id")
        .limit(1);

      const { data: prices, error: pricesError } = await supabase
        .from("legalflow.stripe_prices")
        .select("id")
        .limit(1);

      const hasProducts = products && products.length > 0;
      const hasPrices = prices && prices.length > 0;

      if (productsError || pricesError) {
        diagnostics[2].status = "error";
        diagnostics[2].details = `Erro: ${(productsError || pricesError)?.message}`;
      } else if (hasProducts && hasPrices) {
        diagnostics[2].status = "success";
        diagnostics[2].details = `${products.length} produtos, ${prices.length} preços encontrados`;
      } else {
        diagnostics[2].status = "warning";
        diagnostics[2].details = "Tabelas existem mas não há produtos configurados";
        diagnostics[2].action = "seed_data";
      }
    } catch (error) {
      diagnostics[2].status = "error";
      diagnostics[2].details = `Erro ao verificar produtos: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
    }

    // Check subscriptions
    try {
      const { data: subscriptions, error: subsError } = await supabase
        .from("legalflow.stripe_subscriptions")
        .select("id")
        .limit(1);

      diagnostics[3].status = subsError ? "error" : "success";
      diagnostics[3].details = subsError 
        ? `Erro: ${subsError.message}`
        : "Tabela stripe_subscriptions funcionando";
    } catch (error) {
      diagnostics[3].status = "error";
      diagnostics[3].details = `Erro ao verificar subscriptions: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
    }

    // Check invoices
    try {
      const { data: invoices, error: invoicesError } = await supabase
        .from("legalflow.stripe_invoices")
        .select("id")
        .limit(1);

      diagnostics[4].status = invoicesError ? "error" : "success";
      diagnostics[4].details = invoicesError 
        ? `Erro: ${invoicesError.message}`
        : "Tabela stripe_invoices funcionando";
    } catch (error) {
      diagnostics[4].status = "error";
      diagnostics[4].details = `Erro ao verificar invoices: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
    }

    // Check checkout sessions
    try {
      const { data: checkout, error: checkoutError } = await supabase
        .from("legalflow.stripe_checkout_sessions")
        .select("id")
        .limit(1);

      diagnostics[5].status = checkoutError ? "error" : "success";
      diagnostics[5].details = checkoutError 
        ? `Erro: ${checkoutError.message}`
        : "Tabela stripe_checkout_sessions funcionando";
    } catch (error) {
      diagnostics[5].status = "error";
      diagnostics[5].details = `Erro ao verificar checkout: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
    }

    // Check webhooks
    try {
      const { data: webhooks, error: webhooksError } = await supabase
        .from("legalflow.stripe_webhook_events")
        .select("id")
        .limit(1);

      diagnostics[6].status = webhooksError ? "error" : "success";
      diagnostics[6].details = webhooksError 
        ? `Erro: ${webhooksError.message}`
        : "Tabela stripe_webhook_events funcionando";
    } catch (error) {
      diagnostics[6].status = "error";
      diagnostics[6].details = `Erro ao verificar webhooks: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
    }

    // Check RPC functions
    try {
      const { data: testCheckout, error: checkoutRPCError } = await supabase.rpc(
        "legalflow.create_checkout_session",
        {
          p_customer_email: "test@example.com",
          p_price_ids: [],
          p_quantities: [],
          p_success_url: "https://example.com/success",
          p_cancel_url: "https://example.com/cancel",
        }
      );

      diagnostics[7].status = checkoutRPCError ? "error" : "success";
      diagnostics[7].details = checkoutRPCError 
        ? `Erro nas funções RPC: ${checkoutRPCError.message}`
        : "Funções RPC funcionando corretamente";
    } catch (error) {
      diagnostics[7].status = "error";
      diagnostics[7].details = `Erro ao testar funções RPC: ${error instanceof Error ? error.message : "Erro desconhecido"}`;
    }

    setChecks(diagnostics);
    setLoading(false);
  };

  const runSeed = async () => {
    try {
      setSeeding(true);
      
      const result = await implAutofix("STRIPE_SEED");
      
      if (result.success) {
        toast({
          title: "Seed executado com sucesso",
          description: result.message,
        });
        
        // Re-run diagnostics
        await runDiagnostics();
      } else {
        toast({
          title: "Erro no seed",
          description: result.message || "Falha ao executar seed",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error seeding:", error);
      toast({
        title: "Erro no seed",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSeeding(false);
    }
  };

  const runTest = async () => {
    try {
      setTesting(true);
      
      // Test creating a checkout session
      const { data, error } = await supabase.rpc("legalflow.create_checkout_session", {
        p_customer_email: "test@legalflow.com",
        p_price_ids: ["price_consultoria_mensal"],
        p_quantities: [1],
        p_success_url: `${window.location.origin}/success`,
        p_cancel_url: `${window.location.origin}/cancel`,
        p_mode: "payment",
        p_metadata: { test: true, source: "SF10_setup" },
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast({
          title: "Teste bem-sucedido",
          description: `Checkout criado: ${data.checkout_url}`,
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error testing:", error);
      toast({
        title: "Erro no teste",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const downloadSchema = () => {
    const schemaContent = `-- SF-10 Stripe Schema
-- Execute este script no seu banco Supabase para instalar o sistema de pagamentos

-- Ver arquivo SF10_STRIPE_SCHEMA.sql para o schema completo
-- Localização: ./SF10_STRIPE_SCHEMA.sql
`;

    const blob = new Blob([schemaContent], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sf10-stripe-install-guide.sql";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Arquivo baixado",
      description: "Guia de instalação baixado. Execute SF10_STRIPE_SCHEMA.sql no Supabase.",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  const overallStatus = checks.every(c => c.status === "success") 
    ? "success" 
    : checks.some(c => c.status === "error") 
      ? "error" 
      : "warning";

  const successCount = checks.filter(c => c.status === "success").length;
  const totalCount = checks.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-heading font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-600" />
            SF-10: Stripe Wizard (Financeiro)
          </h2>
          <p className="text-neutral-600 text-sm mt-1">
            Sistema para cobrar com clareza e zero retrabalho
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={overallStatus === "success" ? "default" : 
                    overallStatus === "error" ? "destructive" : "secondary"}
          >
            {successCount}/{totalCount} Verificações
          </Badge>
        </div>
      </div>

      {/* Status Summary */}
      <Alert className={
        overallStatus === "success" ? "border-green-200 bg-green-50" :
        overallStatus === "error" ? "border-red-200 bg-red-50" :
        "border-yellow-200 bg-yellow-50"
      }>
        <AlertDescription>
          <div className="flex items-center gap-2">
            {getStatusIcon(overallStatus)}
            <span className="font-medium">
              {overallStatus === "success" 
                ? "✅ Stripe Wizard está configurado e funcionando"
                : overallStatus === "error"
                  ? "❌ Problemas críticos encontrados - instalação necessária"
                  : "⚠️ Configuração parcial - seed de dados recomendado"
              }
            </span>
          </div>
        </AlertDescription>
      </Alert>

      {/* Action Buttons */}
      <div className="grid grid-cols-4 gap-3">
        <Button
          variant="outline"
          onClick={runDiagnostics}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? "Verificando..." : "Verificar"}
        </Button>
        
        <Button
          variant="outline"
          onClick={runSeed}
          disabled={seeding}
        >
          <Zap className={`w-4 h-4 mr-2 ${seeding ? 'animate-spin' : ''}`} />
          {seeding ? "Seeding..." : "Seed/Autofix"}
        </Button>
        
        <Button
          variant="outline"
          onClick={runTest}
          disabled={testing || overallStatus === "error"}
        >
          <TestTube className={`w-4 h-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
          {testing ? "Testando..." : "Testar"}
        </Button>
        
        <Button
          variant="outline"
          onClick={downloadSchema}
        >
          <Download className="w-4 h-4 mr-2" />
          Download Schema
        </Button>
      </div>

      {/* Detailed Checks */}
      <div className="grid gap-3">
        {checks.map((check) => (
          <Card key={check.id} className="transition-all hover:shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(check.status)}
                  <div>
                    <div className="font-medium text-sm">{check.name}</div>
                    <div className="text-xs text-neutral-600">{check.description}</div>
                    {check.details && (
                      <div className="text-xs text-neutral-500 mt-1">{check.details}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={
                      check.status === "success" ? "default" :
                      check.status === "error" ? "destructive" : 
                      "secondary"
                    }
                  >
                    {check.status === "success" ? "OK" :
                     check.status === "error" ? "Erro" :
                     check.status === "warning" ? "Aviso" : "Verificando"}
                  </Badge>
                  {check.action === "seed_data" && (
                    <Button size="sm" variant="outline" onClick={runSeed} disabled={seeding}>
                      <Zap className="w-3 h-3 mr-1" />
                      Seed
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acesso Rápido</CardTitle>
          <CardDescription>
            Links para funcionalidades principais do SF-10
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium text-sm">Wizard Stripe</div>
              <div className="text-xs text-neutral-600">
                Interface principal para gestão de clientes, assinaturas e faturas
              </div>
            </div>
            <Button size="sm" variant="outline">
              <Eye className="w-3 h-3 mr-1" />
              Abrir Wizard
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium text-sm">Checkout Creator</div>
              <div className="text-xs text-neutral-600">
                Ferramenta para criar checkouts: contato → preço → quantidade → sessão
              </div>
            </div>
            <Button size="sm" variant="outline">
              <CreditCard className="w-3 h-3 mr-1" />
              Criar Checkout
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium text-sm">Past Due Monitor</div>
              <div className="text-xs text-neutral-600">
                Monitor de faturas vencidas com badges automáticos
              </div>
            </div>
            <Button size="sm" variant="outline">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Ver Past Due
            </Button>
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <div className="font-medium text-sm">Webhook Events</div>
              <div className="text-xs text-neutral-600">
                Log de eventos recebidos via webhooks do Stripe
              </div>
            </div>
            <Button size="sm" variant="outline">
              <Webhook className="w-3 h-3 mr-1" />
              Ver Webhooks
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Installation Guide */}
      {overallStatus === "error" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-red-700">Guia de Instalação</CardTitle>
            <CardDescription>
              Passos para configurar o SF-10 Stripe Wizard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">1</div>
                <div>
                  <div className="font-medium">Baixar Schema SQL</div>
                  <div className="text-neutral-600">Clique em "Download Schema" para obter o arquivo SF10_STRIPE_SCHEMA.sql</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">2</div>
                <div>
                  <div className="font-medium">Executar no Supabase</div>
                  <div className="text-neutral-600">Execute o script no SQL Editor do Supabase para criar tabelas e funções</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">3</div>
                <div>
                  <div className="font-medium">Executar Seed</div>
                  <div className="text-neutral-600">Clique em "Seed/Autofix" para popular com produtos e preços de exemplo</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">4</div>
                <div>
                  <div className="font-medium">Testar Funcionamento</div>
                  <div className="text-neutral-600">Use o botão "Testar" para criar um checkout de exemplo</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">5</div>
                <div>
                  <div className="font-medium">Configurar Webhook</div>
                  <div className="text-neutral-600">Configure webhooks no Stripe para sincronização automática</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SF10StripeSetup;
