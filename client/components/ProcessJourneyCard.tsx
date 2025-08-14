import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlayCircle,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Star,
  Plus,
  Target,
  AlertCircle,
  FileText,
  Upload,
  Users,
  BookOpen,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Label } from "./ui/label";
import { toast } from "../hooks/use-toast";
import { lf } from "../lib/supabase";

interface JourneyInstance {
  id: string;
  template_id: string;
  template_name: string;
  template_niche: string;
  progress_pct: number;
  status: string;
  next_action: any;
  start_date: string;
  owner_oab: number;
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
  stage_type?: string;
}

const getStageIcon = (stageType: string) => {
  switch (stageType) {
    case "lesson":
      return <BookOpen className="w-4 h-4" />;
    case "form":
      return <FileText className="w-4 h-4" />;
    case "upload":
      return <Upload className="w-4 h-4" />;
    case "meeting":
      return <Calendar className="w-4 h-4" />;
    case "gate":
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Target className="w-4 h-4" />;
  }
};

const getStageStatusColor = (status: string, overdue: boolean) => {
  if (status === "completed") return "text-green-600 bg-green-50";
  if (status === "in_progress") return "text-blue-600 bg-blue-50";
  if (overdue) return "text-red-600 bg-red-50";
  return "text-neutral-600 bg-neutral-50";
};

const CompleteStageDialog: React.FC<{
  stage: StageInstance;
  onComplete: () => void;
}> = ({ stage, onComplete }) => {
  const [open, setOpen] = useState(false);

  const completeStageMatation = useMutation({
    mutationFn: async () => {
      const { error } = await lf
        .from("stage_instances")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", stage.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Etapa concluída",
        description: "A etapa foi marcada como concluída.",
      });
      setOpen(false);
      onComplete();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao concluir etapa: " + error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CheckCircle className="w-4 h-4 mr-2" />
          Concluir
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Concluir Etapa</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-neutral-600">
            Tem certeza que deseja marcar esta etapa como concluída?
          </p>
          <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
            <div className="font-medium">{stage.title}</div>
            <div className="text-sm text-neutral-600 mt-1">
              Esta ação irá atualizar o progresso da jornada e calcular a
              próxima ação.
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => completeStageMatation.mutate()}
            disabled={completeStageMatation.isPending}
            className="flex-1"
          >
            {completeStageMatation.isPending ? "Concluindo..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StartJourneyDialog: React.FC<{
  numeroCnj: string;
  onStart: () => void;
}> = ({ numeroCnj, onStart }) => {
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { data: templates } = useQuery({
    queryKey: ["journey-templates-simple"],
    queryFn: async () => {
      const { data, error } = await lf
        .from("journey_templates")
        .select("id, name, niche, eta_days")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: processo } = useQuery({
    queryKey: ["processo", numeroCnj],
    queryFn: async () => {
      const { data, error } = await lf
        .from("processos")
        .select("cliente_cpfcnpj")
        .eq("numero_cnj", numeroCnj)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const startJourneyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await lf.rpc("start_journey_instance", {
        p_template_id: selectedTemplateId,
        p_cpfcnpj: processo?.cliente_cpfcnpj,
        p_numero_cnj: numeroCnj,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Jornada iniciada",
        description: "A jornada foi iniciada com sucesso.",
      });
      setOpen(false);
      onStart();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao iniciar jornada: " + error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          Iniciar Jornada
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Iniciar Nova Jornada</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Template da Jornada</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name} ({template.niche} - {template.eta_days}{" "}
                    dias)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => startJourneyMutation.mutate()}
            disabled={!selectedTemplateId || startJourneyMutation.isPending}
            className="flex-1"
          >
            {startJourneyMutation.isPending ? "Iniciando..." : "Iniciar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const ProcessJourneyCard: React.FC<{ numeroCnj: string }> = ({
  numeroCnj,
}) => {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const {
    data: journey,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["process-journey", numeroCnj],
    queryFn: async () => {
      const { data, error } = await lf
        .from("vw_process_journey")
        .select("*")
        .eq("numero_cnj", numeroCnj)
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    },
  });

  const { data: stages } = useQuery({
    queryKey: ["journey-stages", journey?.id],
    queryFn: async () => {
      if (!journey?.id) return [];

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
            stage_types (
              code,
              label
            )
          )
        `,
        )
        .eq("instance_id", journey.id)
        .order("sla_at");

      if (error) throw error;
      return data.map((stage) => ({
        ...stage,
        title: stage.journey_template_stages?.title || "Etapa",
        stage_type: stage.journey_template_stages?.stage_types?.code || "task",
      }));
    },
    enabled: !!journey?.id,
  });

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({
      queryKey: ["journey-stages", journey?.id],
    });
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-neutral-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-neutral-200 rounded"></div>
            <div className="h-2 bg-neutral-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!journey) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Jornada do Cliente
            </CardTitle>
            <StartJourneyDialog numeroCnj={numeroCnj} onStart={handleRefresh} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="font-medium text-neutral-900 mb-2">
              Nenhuma jornada ativa
            </h3>
            <p className="text-neutral-600 text-sm">
              Inicie uma jornada para acompanhar o progresso do cliente.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextAction = journey.next_action;
  const progressColor =
    journey.progress_pct >= 100
      ? "bg-green-500"
      : journey.progress_pct >= 50
        ? "bg-blue-500"
        : "bg-neutral-400";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="w-5 h-5" />
            Jornada: {journey.template_name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {journey.template_niche}
            </Badge>
            <Badge
              variant={journey.status === "active" ? "default" : "secondary"}
            >
              {journey.status === "active"
                ? "Ativa"
                : journey.status === "completed"
                  ? "Concluída"
                  : "Pausada"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Progresso</span>
            <span className="font-medium">{journey.progress_pct}%</span>
          </div>
          <Progress value={journey.progress_pct} className="h-2" />
        </div>

        {/* Next Action */}
        {nextAction && nextAction.type !== "completed" && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                <PlayCircle className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900">
                  {nextAction.title}
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  {nextAction.description}
                </p>
                {nextAction.due_at && (
                  <div className="flex items-center gap-1 text-xs text-blue-600 mt-2">
                    <Clock className="w-3 h-3" />
                    Prazo:{" "}
                    {new Date(nextAction.due_at).toLocaleDateString("pt-BR")}
                  </div>
                )}
                <Button size="sm" className="mt-3">
                  {nextAction.cta}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Stages List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-neutral-900">Etapas da Jornada</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-neutral-600"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Menos
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Ver Todas ({stages?.length || 0})
                </>
              )}
            </Button>
          </div>

          {expanded && stages && stages.length > 0 && (
            <Accordion type="single" collapsible className="w-full">
              {stages.map((stage, index) => {
                const isOverdue =
                  stage.status !== "completed" &&
                  new Date(stage.sla_at) < new Date();
                const statusColor = getStageStatusColor(
                  stage.status,
                  isOverdue,
                );

                return (
                  <AccordionItem key={stage.id} value={stage.id}>
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 w-full">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${statusColor}`}
                        >
                          {stage.status === "completed" ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            getStageIcon(stage.stage_type)
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{stage.title}</span>
                            {stage.mandatory && (
                              <Star className="w-3 h-3 text-amber-500" />
                            )}
                            {isOverdue && (
                              <AlertCircle className="w-3 h-3 text-red-500" />
                            )}
                          </div>
                          <div className="text-xs text-neutral-500 mt-1">
                            {stage.status === "completed"
                              ? `Concluída em ${new Date(stage.completed_at!).toLocaleDateString("pt-BR")}`
                              : `Prazo: ${new Date(stage.sla_at).toLocaleDateString("pt-BR")}`}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {stage.status === "completed"
                            ? "Concluída"
                            : stage.status === "in_progress"
                              ? "Em Andamento"
                              : "Pendente"}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="ml-11 space-y-3">
                        <div className="text-sm text-neutral-600">
                          Tipo:{" "}
                          {stage.stage_type === "lesson"
                            ? "Aula"
                            : stage.stage_type === "form"
                              ? "Formulário"
                              : stage.stage_type === "upload"
                                ? "Upload"
                                : stage.stage_type === "meeting"
                                  ? "Reunião"
                                  : stage.stage_type === "gate"
                                    ? "Aprovação"
                                    : "Tarefa"}
                        </div>
                        {stage.status !== "completed" && (
                          <CompleteStageDialog
                            stage={stage}
                            onComplete={handleRefresh}
                          />
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </div>

        {/* Summary Stats */}
        {!expanded && stages && (
          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div className="text-center">
              <div className="font-medium text-neutral-900">
                {stages.filter((s) => s.status === "completed").length}
              </div>
              <div className="text-xs text-neutral-600">Concluídas</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-neutral-900">
                {stages.filter((s) => s.status === "in_progress").length}
              </div>
              <div className="text-xs text-neutral-600">Em Andamento</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-neutral-900">
                {stages.filter((s) => s.status === "pending").length}
              </div>
              <div className="text-xs text-neutral-600">Pendentes</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProcessJourneyCard;
