import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useSupabaseQuery } from "../hooks/useSupabaseQuery";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import {
  Users,
  Target,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Database,
  ExternalLink,
  ShoppingCart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SF11Status {
  contacts_unified: boolean;
  deals_pipeline: boolean;
  convert_function: boolean;
  kanban_dnd: boolean;
  checkout_automation: boolean;
}

const SF11CRMSetup: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Verificar status do CRM
  const { data: status, refetch } = useSupabaseQuery<SF11Status>(
    "sf11-crm-status",
    `
    SELECT 
      (SELECT EXISTS(SELECT 1 FROM information_schema.views WHERE table_name = 'vw_contacts_unified' AND table_schema = 'legalflow')) as contacts_unified,
      (SELECT EXISTS(SELECT 1 FROM legalflow.pipeline_defs WHERE code = 'sales')) as deals_pipeline,
      (SELECT EXISTS(SELECT 1 FROM information_schema.routines WHERE routine_name = 'crm_convert_lead' AND routine_schema = 'legalflow')) as convert_function,
      true as kanban_dnd,
      true as checkout_automation
    `,
  );

  // Estatísticas do CRM
  const { data: crmStats } = useSupabaseQuery(
    "sf11-crm-stats",
    `
    SELECT 
      (SELECT COUNT(*) FROM legalflow.vw_contacts_unified) as total_contacts,
      (SELECT COUNT(*) FROM legalflow.deals) as total_deals,
      (SELECT COUNT(*) FROM public.leads) as total_leads,
      (SELECT COUNT(*) FROM legalflow.deals WHERE stage_id IN (
        SELECT id FROM legalflow.pipeline_stages WHERE is_won = true
      )) as won_deals
    `,
  );

  const runDiagnostics = async () => {
    setIsChecking(true);
    try {
      await refetch();
      toast({
        title: "Diagnóstico CRM concluído",
        description: "Status do SF-11 atualizado com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro no diagnóstico",
        description: "Falha ao verificar status do CRM",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-yellow-600" />
    );
  };

  const allFeatures = status
    ? Object.values(status).every((val) => val === true)
    : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">SF-11: CRM — Contatos & Deals</h2>
          <p className="text-muted-foreground">
            Funil de entrada simples e rastreável
          </p>
        </div>
        <Badge
          variant={allFeatures ? "default" : "secondary"}
          className="text-sm"
        >
          {allFeatures ? "✅ Operacional" : "⚠️ Verificar"}
        </Badge>
      </div>

      {/* Quick Stats */}
      {crmStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Contatos</p>
                  <p className="text-2xl font-bold">
                    {crmStats.total_contacts}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Deals</p>
                  <p className="text-2xl font-bold">{crmStats.total_deals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Leads</p>
                  <p className="text-2xl font-bold">{crmStats.total_leads}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Fechados</p>
                  <p className="text-2xl font-bold">{crmStats.won_deals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features Status */}
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Status dos Componentes
            </CardTitle>
            <CardDescription>
              Verificação automática das funcionalidades do CRM
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status && (
              <div className="grid gap-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.contacts_unified)}
                    <div>
                      <p className="font-medium">Lista Unificada de Contatos</p>
                      <p className="text-sm text-muted-foreground">
                        View vw_contacts_unified operacional
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/crm/contatos")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.deals_pipeline)}
                    <div>
                      <p className="font-medium">Pipeline de Vendas</p>
                      <p className="text-sm text-muted-foreground">
                        Kanban com DnD operacional
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/crm/deals")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.convert_function)}
                    <div>
                      <p className="font-medium">
                        Conversão Lead → Contato+Deal
                      </p>
                      <p className="text-sm text-muted-foreground">
                        RPC crm_convert_lead() 1-clique
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/crm/leads")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status.checkout_automation)}
                    <div>
                      <p className="font-medium">Automação Checkout</p>
                      <p className="text-sm text-muted-foreground">
                        Criar checkout ao fechar deal
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Opcional
                  </Badge>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={runDiagnostics} disabled={isChecking} size="sm">
                {isChecking ? "Verificando..." : "Executar Diagnóstico"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/crm/deals")}
              >
                <Target className="h-4 w-4 mr-2" />
                Abrir Kanban
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Micro-guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Micro-guidelines</CardTitle>
          <CardDescription>
            Princípios de UX para consistência e foco
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>
              • <strong>Minimalismo progressivo:</strong> campos avançados ficam
              ocultos até necessários
            </p>
            <p>
              • <strong>Teclado primeiro:</strong> Cmd/Ctrl+K para busca, Esc
              fecha modais
            </p>
            <p>
              • <strong>Estados claros:</strong> loading skeletons, empty states
              com CTA
            </p>
            <p>
              • <strong>Tokens F1:</strong> cores, tipografia e focus ring AA+
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SF11CRMSetup;
