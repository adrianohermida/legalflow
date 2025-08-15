import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Play,
  Database,
  TestTube,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { createEventFromStage, useSF7StageIntegration } from "../lib/sf7-stage-integration";
import { GenericSQLDownloader } from "./GenericSQLDownloader";

export function SF7AgendaSetup() {
  const [isTestingSchema, setIsTestingSchema] = useState(false);
  const [isTestingIntegration, setIsTestingIntegration] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sf7Integration = useSF7StageIntegration();

  // Verificar instalação SF-7
  const {
    data: verificationResult,
    isLoading: isVerifying,
    error: verifyError,
    refetch: reverifyInstallation,
  } = useQuery({
    queryKey: ["sf7-verify-installation"],
    queryFn: async () => {
      const { data, error } = await lf.rpc("sf7_verify_installation");
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000, // 30 segundos
  });

  // Testar schema
  const testSchemaMutation = useMutation({
    mutationFn: async () => {
      setIsTestingSchema(true);
      
      // Testar criação de evento rápido
      const testEvent = {
        title: "Teste SF-7: Reunião de Alinhamento",
        starts_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 horas no futuro
        cnj_or_cpf: "12345678901", // CPF de teste
        video_link: "https://meet.google.com/test-sf7",
        description: "Evento de teste criado pelo sistema SF-7",
        location: "Sala Virtual",
      };

      const { data: eventoId, error } = await lf.rpc("sf7_create_evento_rapido", {
        p_title: testEvent.title,
        p_starts_at: testEvent.starts_at,
        p_event_type: "videoconferencia",
        p_cnj_or_cpf: testEvent.cnj_or_cpf,
        p_video_link: testEvent.video_link,
        p_description: testEvent.description,
        p_location: testEvent.location,
      });

      if (error) throw error;

      // Testar listagem de eventos próximos
      const { data: proximosEventos, error: proximosError } = await lf.rpc("sf7_eventos_proximos", {
        p_limite: 3,
      });

      if (proximosError) throw proximosError;

      // Testar atualização
      const { data: updateResult, error: updateError } = await lf.rpc("sf7_update_evento", {
        p_evento_id: eventoId,
        p_status: "confirmado",
        p_metadata: { test_completed: true, test_timestamp: new Date().toISOString() },
      });

      if (updateError) throw updateError;

      return {
        evento_criado: eventoId,
        proximos_eventos: proximosEventos?.length || 0,
        update_success: updateResult,
      };
    },
    onSuccess: (result) => {
      setIsTestingSchema(false);
      queryClient.invalidateQueries({ queryKey: ["sf7-verify-installation"] });
      toast({
        title: "Teste do Schema SF-7 Concluído",
        description: `✅ Evento criado: ${result.evento_criado}. Próximos eventos: ${result.proximos_eventos}`,
      });
    },
    onError: (error: any) => {
      setIsTestingSchema(false);
      toast({
        title: "Erro no Teste do Schema",
        description: error.message || "Falha ao testar o schema SF-7",
        variant: "destructive",
      });
    },
  });

  // Testar integração com etapas
  const testStageIntegrationMutation = useMutation({
    mutationFn: async () => {
      setIsTestingIntegration(true);

      // Simular criação de evento a partir de etapa
      const stageEventData = {
        stage_instance_id: crypto.randomUUID(),
        numero_cnj: "1234567-89.2024.8.26.0100",
        cliente_cpfcnpj: "12345678901",
        title: "Audiência de Conciliação - Teste SF-7",
        description: "Evento de teste criado automaticamente a partir de uma etapa do processo",
        event_type: "audiencia" as const,
        starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 dia no futuro
        ends_at: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // +2 horas
        location: "Fórum Central - Sala 15",
        priority: "alta" as const,
      };

      const createResult = await createEventFromStage(stageEventData);
      if (!createResult.success) throw new Error(createResult.error);

      // Testar busca de eventos da etapa
      const eventsResult = await sf7Integration.getEventsFromStage(stageEventData.stage_instance_id);
      if (!eventsResult.success) throw new Error(eventsResult.error);

      // Testar atualização de status
      const statusResult = await sf7Integration.updateEventStatusFromStage(
        stageEventData.stage_instance_id,
        "confirmado"
      );
      if (!statusResult.success) throw new Error(statusResult.error);

      return {
        evento_criado: createResult.evento_id,
        eventos_encontrados: eventsResult.events.length,
        status_atualizado: statusResult.updated_events.length,
        stage_instance_id: stageEventData.stage_instance_id,
      };
    },
    onSuccess: (result) => {
      setIsTestingIntegration(false);
      queryClient.invalidateQueries({ queryKey: ["sf7-verify-installation"] });
      toast({
        title: "Teste de Integração SF-7 Concluído",
        description: `✅ Automação funcionando. Stage ID: ${result.stage_instance_id}`,
      });
    },
    onError: (error: any) => {
      setIsTestingIntegration(false);
      toast({
        title: "Erro no Teste de Integração",
        description: error.message || "Falha na integração com etapas",
        variant: "destructive",
      });
    },
  });

  const installationComplete = verificationResult?.installation_complete;
  const hasFeatures = verificationResult?.features;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-semibold mb-2">
          SF-7: Agenda (TZ America/Sao_Paulo)
        </h2>
        <p className="text-neutral-600">
          Sistema de agenda com timezone São Paulo, criação rápida com CNJ/CPF e automação de etapas.
        </p>
      </div>

      {/* Status da Instalação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Status da Instalação SF-7
            {isVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {verifyError ? (
            <div className="text-center py-4">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Erro de Verificação</h3>
              <p className="text-neutral-600 mb-4">{verifyError.message}</p>
              <Button onClick={() => reverifyInstallation()}>
                Tentar Novamente
              </Button>
            </div>
          ) : verificationResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Status da Instalação:</span>
                <Badge
                  className={
                    installationComplete
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }
                >
                  {installationComplete ? "✅ Completa" : "⚠️ Incompleta"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-neutral-600">Versão:</span>
                  <div className="font-medium">{verificationResult.schema_version}</div>
                </div>
                <div>
                  <span className="text-neutral-600">Timezone:</span>
                  <div className="font-medium">{verificationResult.timezone}</div>
                </div>
                <div>
                  <span className="text-neutral-600">Tabelas:</span>
                  <div className="font-medium">{verificationResult.tables_created}/3</div>
                </div>
                <div>
                  <span className="text-neutral-600">Funções:</span>
                  <div className="font-medium">{verificationResult.functions_created}</div>
                </div>
              </div>

              {hasFeatures && (
                <div>
                  <h4 className="font-medium mb-2">Recursos Disponíveis:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(hasFeatures).map(([feature, available]) => (
                      <div key={feature} className="flex items-center gap-2">
                        {available ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-orange-500" />
                        )}
                        <span className={available ? "text-green-700" : "text-orange-700"}>
                          {feature.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {verificationResult.test_events > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-700">
                    📅 {verificationResult.test_events} evento(s) de teste encontrado(s) na agenda
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Verificando instalação SF-7...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testes do Sistema */}
      {installationComplete && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Teste do Schema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="w-5 h-5" />
                Teste do Schema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">
                Testa criação rápida, listagem e atualização de eventos com timezone SP.
              </p>
              <Button
                onClick={() => testSchemaMutation.mutate()}
                disabled={isTestingSchema}
                className="w-full"
              >
                {isTestingSchema ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Testar Schema
              </Button>
            </CardContent>
          </Card>

          {/* Teste de Integração com Etapas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Teste de Integração
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-neutral-600 mb-4">
                Testa automação de eventos a partir de etapas com stage_instance_id.
              </p>
              <Button
                onClick={() => testStageIntegrationMutation.mutate()}
                disabled={isTestingIntegration}
                className="w-full"
              >
                {isTestingIntegration ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4 mr-2" />
                )}
                Testar Automação
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Instruções de Instalação */}
      {!installationComplete && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" />
              Instalação Necessária
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="text-orange-700">
                Para usar o sistema SF-7, execute o script SQL no Supabase:
              </p>
              <div className="bg-white p-3 rounded border border-orange-200 font-mono text-xs">
                1. Acesse o Supabase SQL Editor<br />
                2. Execute: SF7_AGENDA_SCHEMA_COMPLETE.sql<br />
                3. Verifique se todas as funções foram criadas
              </div>
              <Button
                onClick={() => reverifyInstallation()}
                variant="outline"
                size="sm"
                className="border-orange-300 text-orange-700 hover:bg-orange-100"
              >
                Verificar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
