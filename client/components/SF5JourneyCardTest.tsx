import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useToast } from "../hooks/use-toast";
import { lf } from "../lib/supabase";
import SF5JourneyCard from "./SF5JourneyCard";
import { PlayCircle, TestTube, CheckCircle, RefreshCw } from "lucide-react";

export default function SF5JourneyCardTest() {
  const [testCNJ, setTestCNJ] = useState("");
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [testResults, setTestResults] = useState<any[]>([]);
  const { toast } = useToast();

  const createTestJourney = async () => {
    setIsCreatingTest(true);
    try {
      // Gerar CNJ único para teste
      const testCnjNumber = `5000001-12.2024.8.26.0100-test-${Date.now()}`;

      // Criar jornada de teste
      const { data: journeyId, error } = await lf.rpc(
        "create_journey_with_stages",
        {
          p_template_id: 1, // Assumindo que existe um template com ID 1
          p_numero_cnj: testCnjNumber,
          p_cliente_cpfcnpj: "12345678901",
        },
      );

      if (error) throw error;

      setTestCNJ(testCnjNumber);

      toast({
        title: "Jornada de teste criada!",
        description: `CNJ: ${testCnjNumber}`,
      });

      // Executar teste de progresso automático
      await testProgressUpdates(journeyId);
    } catch (error) {
      console.error("Erro ao criar jornada de teste:", error);
      toast({
        title: "Erro",
        description:
          error instanceof Error
            ? error.message
            : "Erro ao criar jornada de teste",
        variant: "destructive",
      });
    } finally {
      setIsCreatingTest(false);
    }
  };

  const testProgressUpdates = async (journeyId: string) => {
    const results = [];

    try {
      // Teste 1: Verificar estado inicial
      let { data: journey } = await lf
        .from("journey_instances")
        .select("progress_pct, next_action")
        .eq("id", journeyId)
        .single();

      results.push({
        test: "Estado inicial",
        success: journey?.progress_pct === 0 && journey?.next_action,
        details: `Progress: ${journey?.progress_pct}%, Next Action: ${journey?.next_action?.title || "null"}`,
      });

      // Teste 2: Iniciar primeira etapa
      const { data: stages } = await lf
        .from("stage_instances")
        .select("id, status")
        .eq("journey_instance_id", journeyId)
        .order("created_at")
        .limit(1);

      if (stages && stages.length > 0) {
        await lf
          .from("stage_instances")
          .update({
            status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .eq("id", stages[0].id);

        // Verificar se o trigger atualizou a jornada
        await new Promise((resolve) => setTimeout(resolve, 500)); // Aguardar trigger

        const { data: updatedJourney } = await lf
          .from("journey_instances")
          .select("progress_pct, next_action")
          .eq("id", journeyId)
          .single();

        results.push({
          test: "Iniciar primeira etapa",
          success: updatedJourney?.next_action?.type === "complete_stage",
          details: `Next Action Type: ${updatedJourney?.next_action?.type}`,
        });

        // Teste 3: Concluir primeira etapa
        await lf
          .from("stage_instances")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", stages[0].id);

        // Verificar se progresso foi atualizado
        await new Promise((resolve) => setTimeout(resolve, 500)); // Aguardar trigger

        const { data: finalJourney } = await lf
          .from("journey_instances")
          .select("progress_pct, next_action")
          .eq("id", journeyId)
          .single();

        results.push({
          test: "Concluir primeira etapa",
          success: finalJourney && finalJourney.progress_pct > 0,
          details: `Progress: ${finalJourney?.progress_pct}%`,
        });
      }

      setTestResults(results);

      const allPassed = results.every((r) => r.success);
      toast({
        title: allPassed
          ? "Todos os testes passaram!"
          : "Alguns testes falharam",
        description: `${results.filter((r) => r.success).length}/${results.length} testes passaram`,
        variant: allPassed ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Erro nos testes:", error);
      toast({
        title: "Erro nos testes",
        description:
          error instanceof Error
            ? error.message
            : "Erro durante a execução dos testes",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5" />
            SF-5 Journey Card - Teste de Integração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Este teste verifica se:
            <br />• Compute_next_action funciona corretamente
            <br />• Trigger t_stage_refresh atualiza automaticamente
            <br />• Progresso e CTA são atualizados na hora
            <br />• Não há erros durante a operação
          </p>

          <div className="flex gap-2">
            <Button
              onClick={createTestJourney}
              disabled={isCreatingTest}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isCreatingTest ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PlayCircle className="w-4 h-4 mr-2" />
              )}
              {isCreatingTest ? "Criando teste..." : "Criar Jornada de Teste"}
            </Button>

            {testCNJ && (
              <Button variant="outline" onClick={() => setTestCNJ("")}>
                Limpar Teste
              </Button>
            )}
          </div>

          {/* Resultados dos testes */}
          {testResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Resultados dos Testes:</h4>
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {result.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-red-600" />
                    )}
                    <span className="font-medium text-sm">{result.test}</span>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "PASSOU" : "FALHOU"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{result.details}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renderizar o Journey Card de teste */}
      {testCNJ && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Journey Card de Teste:</h3>
          <SF5JourneyCard
            numeroCnj={testCNJ}
            size="full"
            showAccordion={true}
            autoRefresh={true}
          />
        </div>
      )}
    </div>
  );
}
