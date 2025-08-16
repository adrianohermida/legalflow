import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Target,
  CheckCircle,
  Clock,
  PlayCircle,
  FileText,
  Upload,
  Calendar,
  BookOpen,
  AlertCircle,
  Star,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { toast } from "../../hooks/use-toast";
import { lf } from "../../lib/supabase";

interface JourneyInstance {
  id: string;
  template_name: string;
  template_niche: string;
  progress_pct: number;
  status: string;
  next_action: any;
  start_date: string;
  owner_nome: string;
}

interface StageInstance {
  id: string;
  template_stage_id: string;
  status: "pending" | "in_progress" | "completed";
  mandatory: boolean;
  sla_at: string;
  completed_at?: string;
  title?: string;
  description?: string;
  stage_type?: string;
}

const getStageIcon = (stageType: string) => {
  switch (stageType) {
    case "lesson":
      return <BookOpen className="w-5 h-5" />;
    case "form":
      return <FileText className="w-5 h-5" />;
    case "upload":
      return <Upload className="w-5 h-5" />;
    case "meeting":
      return <Calendar className="w-5 h-5" />;
    case "gate":
      return <CheckCircle className="w-5 h-5" />;
    default:
      return <Target className="w-5 h-5" />;
  }
};

const getStageStatusColor = (status: string, overdue: boolean) => {
  if (status === "completed") return "bg-green-500 text-white";
  if (status === "in_progress") return "bg-blue-500 text-white";
  if (overdue) return "bg-red-500 text-white";
  return "bg-neutral-200 text-neutral-600";
};

const NextActionCard: React.FC<{
  nextAction: any;
  onExecute: (action: any) => void;
}> = ({ nextAction, onExecute }) => {
  if (!nextAction || nextAction.type === "completed") {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            Jornada Concluída! 🎉
          </h3>
          <p className="text-green-700">
            Parabéns! Você completou todas as etapas da sua jornada.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case "lesson":
        return <BookOpen className="w-6 h-6" />;
      case "form":
        return <FileText className="w-6 h-6" />;
      case "upload":
        return <Upload className="w-6 h-6" />;
      case "meeting":
        return <Calendar className="w-6 h-6" />;
      case "gate":
        return <CheckCircle className="w-6 h-6" />;
      default:
        return <PlayCircle className="w-6 h-6" />;
    }
  };

  const getActionColor = (type: string) => {
    switch (type) {
      case "lesson":
        return "from-blue-500 to-blue-600";
      case "form":
        return "from-green-500 to-green-600";
      case "upload":
        return "from-orange-500 to-orange-600";
      case "meeting":
        return "from-purple-500 to-purple-600";
      case "gate":
        return "from-red-500 to-red-600";
      default:
        return "from-neutral-500 to-neutral-600";
    }
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-r ${getActionColor(nextAction.type)} flex items-center justify-center text-white shadow-lg`}
          >
            {getActionIcon(nextAction.type)}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">
              Próxima Ação
            </h3>
            <h4 className="text-xl font-bold text-blue-900 mb-2">
              {nextAction.title}
            </h4>
            <p className="text-neutral-700 mb-4">{nextAction.description}</p>
            {nextAction.due_at && (
              <div className="flex items-center gap-2 text-sm text-neutral-600 mb-4">
                <Clock className="w-4 h-4" />
                <span>
                  Prazo:{" "}
                  {new Date(nextAction.due_at).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
            <Button
              onClick={() => onExecute(nextAction)}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {nextAction.cta}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ExecuteActionDialog: React.FC<{
  action: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}> = ({ action, open, onOpenChange, onComplete }) => {
  const executeMutation = useMutation({
    mutationFn: async () => {
      // Mark stage as completed
      const { error } = await lf
        .from("stage_instances")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", action.stage_id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Ação executada",
        description: "Etapa marcada como concluída!",
      });
      onOpenChange(false);
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao executar ação: " + error.message,
        variant: "destructive",
      });
    },
  });

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action.title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-neutral-600 mb-4">{action.description}</p>

          {action.type === "lesson" && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                📚 Esta é uma etapa de aprendizado. Certifique-se de ter
                assistido todo o conteúdo antes de marcar como concluída.
              </p>
            </div>
          )}

          {action.type === "form" && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                📝 Preencha o formulário necessário antes de marcar esta etapa
                como concluída.
              </p>
            </div>
          )}

          {action.type === "upload" && (
            <div className="p-4 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-800">
                📎 Envie todos os documentos necessários antes de marcar como
                concluída.
              </p>
            </div>
          )}

          {action.type === "meeting" && (
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-800">
                📅 Agende sua reunião antes de prosseguir para a próxima etapa.
              </p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Voltar
          </Button>
          <Button
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending}
            className="flex-1"
          >
            {executeMutation.isPending
              ? "Processando..."
              : "Marcar como Concluída"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export function PortalJornada() {
  const { instanceId } = useParams<{ instanceId?: string }>();
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<any>(null);

  // Mock cliente CPF/CNPJ - in real app, get from auth context
  const clienteCpfCnpj = "12345678901";

  const {
    data: journeyInstance,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["portal-journey-instance", instanceId || clienteCpfCnpj],
    queryFn: async () => {
      let query;
      if (instanceId) {
        query = lf.from("vw_process_journey").select("*").eq("id", instanceId);
      } else {
        // Get the first active journey for the client
        query = lf
          .from("vw_process_journey")
          .select("*")
          .eq("cliente_cpfcnpj", clienteCpfCnpj)
          .eq("status", "active")
          .limit(1);
      }

      const { data, error } = await query;
      if (error) throw error;
      return instanceId ? data?.[0] : data?.[0] || null;
    },
  });

  const { data: stageInstances } = useQuery({
    queryKey: ["portal-journey-stages", journeyInstance?.id],
    queryFn: async () => {
      if (!journeyInstance?.id) return [];

      const { data, error } = await lf
        .from("stage_instances")
        .select(
          `
          id,
          template_stage_id,
          status,
          mandatory,
          sla_at,
          completed_at,
          journey_template_stages (
            title,
            description,
            stage_types (
              code,
              label
            )
          )
        `,
        )
        .eq("instance_id", journeyInstance.id)
        .order("sla_at");

      if (error) throw error;
      return data.map((stage) => ({
        ...stage,
        title: stage.journey_template_stages?.title || "Etapa",
        description: stage.journey_template_stages?.description,
        stage_type: stage.journey_template_stages?.stage_types?.code || "task",
      })) as StageInstance[];
    },
    enabled: !!journeyInstance?.id,
  });

  const handleExecuteAction = (action: any) => {
    setSelectedAction(action);
    setActionDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-neutral-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-20 bg-neutral-200 rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!journeyInstance) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-neutral-900">
            Jornada
          </h1>
          <p className="text-neutral-600 mt-1">
            Acompanhe o progresso do seu caso
          </p>
        </div>

        <Card>
          <CardContent className="p-12 text-center">
            <Target className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Nenhuma jornada ativa
            </h3>
            <p className="text-neutral-600 max-w-md mx-auto">
              Você não possui jornadas ativas no momento. Entre em contato com
              seu advogado para iniciar uma nova jornada.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedStages =
    stageInstances?.filter((s) => s.status === "completed").length || 0;
  const totalStages = stageInstances?.length || 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-neutral-900">
          {journeyInstance.template_name}
        </h1>
        <p className="text-neutral-600 mt-1 flex items-center gap-2">
          <Badge variant="secondary">{journeyInstance.template_niche}</Badge>
          <span>•</span>
          <span>
            Iniciada em{" "}
            {new Date(journeyInstance.start_date).toLocaleDateString("pt-BR")}
          </span>
          <span>•</span>
          <span>Advogado: {journeyInstance.owner_nome}</span>
        </p>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Progresso Geral
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-neutral-600">
                Etapas concluídas
              </span>
              <span className="text-lg font-bold">
                {completedStages} de {totalStages}
              </span>
            </div>
            <Progress value={journeyInstance.progress_pct} className="h-3" />
            <div className="text-center">
              <span className="text-2xl font-bold text-blue-600">
                {journeyInstance.progress_pct}%
              </span>
              <span className="text-neutral-600 ml-1">completo</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Action */}
      <NextActionCard
        nextAction={journeyInstance.next_action}
        onExecute={handleExecuteAction}
      />

      {/* Stages Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Cronograma da Jornada</CardTitle>
        </CardHeader>
        <CardContent>
          {stageInstances && stageInstances.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {stageInstances.map((stage, index) => {
                const isOverdue =
                  stage.status !== "completed" &&
                  new Date(stage.sla_at) < new Date();
                const statusColor = getStageStatusColor(
                  stage.status,
                  isOverdue,
                );

                return (
                  <AccordionItem key={stage.id} value={stage.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-4 w-full">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${statusColor}`}
                        >
                          {stage.status === "completed" ? (
                            <CheckCircle className="w-5 h-5" />
                          ) : (
                            getStageIcon(stage.stage_type)
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{stage.title}</span>
                            {stage.mandatory && (
                              <Star className="w-4 h-4 text-amber-500" />
                            )}
                            {isOverdue && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <div className="text-sm text-neutral-500 mt-1">
                            {stage.status === "completed"
                              ? `Concluída em ${new Date(stage.completed_at!).toLocaleDateString("pt-BR")}`
                              : `Prazo: ${new Date(stage.sla_at).toLocaleDateString("pt-BR")}`}
                          </div>
                        </div>
                        <Badge
                          variant={
                            stage.status === "completed" ? "default" : "outline"
                          }
                        >
                          {stage.status === "completed"
                            ? "Concluída"
                            : stage.status === "in_progress"
                              ? "Em Andamento"
                              : "Pendente"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="ml-14 pt-2">
                        {stage.description && (
                          <p className="text-sm text-neutral-600 mb-3">
                            {stage.description}
                          </p>
                        )}
                        <div className="text-xs text-neutral-500">
                          Tipo:{" "}
                          {stage.stage_type === "lesson"
                            ? "Aula"
                            : stage.stage_type === "form"
                              ? "Formulário"
                              : stage.stage_type === "upload"
                                ? "Upload de Documentos"
                                : stage.stage_type === "meeting"
                                  ? "Reunião"
                                  : stage.stage_type === "gate"
                                    ? "Aprovação"
                                    : "Tarefa"}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <p className="text-neutral-600">
                Nenhuma etapa definida para esta jornada.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <ExecuteActionDialog
        action={selectedAction}
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        onComplete={() => refetch()}
      />
    </div>
  );
}
