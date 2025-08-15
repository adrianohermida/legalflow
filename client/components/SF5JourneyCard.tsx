import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PlayCircle,
  Clock,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Target,
  AlertCircle,
  FileText,
  Upload,
  Users,
  BookOpen,
  ArrowRight,
  Zap,
  Timer,
  Flag,
  Circle,
  CheckCircle2,
  XCircle,
  RefreshCw,
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
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { useToast } from "../hooks/use-toast";
import { lf, supabase } from "../lib/supabase";
import { formatDate } from "../lib/utils";

interface JourneyInstance {
  id: string;
  template_id: string;
  template_name: string;
  numero_cnj: string;
  cliente_cpfcnpj: string;
  status: "created" | "in_progress" | "completed" | "cancelled";
  started_at: string;
  ended_at?: string;
  progress_pct: number;
  next_action: {
    type: string;
    title: string;
    description?: string;
    stage_id?: string;
    due_at?: string;
    priority?: "low" | "medium" | "high";
  } | null;
}

interface StageInstance {
  id: string;
  template_stage_id: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "skipped";
  order_index: number;
  sla_days?: number;
  due_at?: string;
  started_at?: string;
  completed_at?: string;
  assigned_oab?: string;
  notes?: string;
  stage_type_code: string;
}

interface SF5JourneyCardProps {
  numeroCnj: string;
  size?: "compact" | "full";
  showAccordion?: boolean;
  autoRefresh?: boolean;
}

export default function SF5JourneyCard({ 
  numeroCnj, 
  size = "full", 
  showAccordion = true,
  autoRefresh = false 
}: SF5JourneyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionNotes, setActionNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para jornada
  const { data: journey, isLoading } = useQuery({
    queryKey: ["sf5-journey", numeroCnj],
    queryFn: async () => {
      const { data, error } = await lf
        .from("journey_instances")
        .select(`
          *,
          journey_templates(name)
        `)
        .eq("numero_cnj", numeroCnj)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (!data) return null;

      return {
        ...data,
        template_name: data.journey_templates?.name || "Jornada",
      } as JourneyInstance;
    },
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Query para etapas da jornada
  const { data: stages = [] } = useQuery({
    queryKey: ["sf5-journey-stages", journey?.id],
    queryFn: async () => {
      if (!journey?.id) return [];

      const { data, error } = await lf
        .from("stage_instances")
        .select(`
          *,
          journey_template_stages(
            title,
            order_index,
            sla_days,
            stage_types(code)
          )
        `)
        .eq("journey_instance_id", journey.id)
        .order("journey_template_stages(order_index)", { ascending: true });

      if (error) throw error;

      return data.map(stage => ({
        ...stage,
        title: stage.journey_template_stages?.title || "Etapa",
        order_index: stage.journey_template_stages?.order_index || 0,
        sla_days: stage.journey_template_stages?.sla_days,
        stage_type_code: stage.journey_template_stages?.stage_types?.code || "default",
      })) as StageInstance[];
    },
    enabled: !!journey?.id,
  });

  // Mutation para executar próxima ação
  const executeActionMutation = useMutation({
    mutationFn: async ({ stageId, notes }: { stageId: string; notes?: string }) => {
      // Marcar etapa como concluída
      const { error: updateError } = await lf
        .from("stage_instances")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          notes: notes || null,
        })
        .eq("id", stageId);

      if (updateError) throw updateError;

      // Trigger para recalcular progresso e próxima ação
      const { error: rpcError } = await lf.rpc("compute_next_action", {
        journey_id: journey?.id,
      });

      if (rpcError) throw rpcError;

      return true;
    },
    onSuccess: () => {
      toast({
        title: "Etapa concluída!",
        description: "A próxima ação foi atualizada automaticamente.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["sf5-journey", numeroCnj] });
      queryClient.invalidateQueries({ queryKey: ["sf5-journey-stages", journey?.id] });
      setIsActionDialogOpen(false);
      setActionNotes("");
    },
    onError: (error) => {
      toast({
        title: "Erro ao executar ação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    },
  });

  // Mutation para iniciar próxima etapa
  const startStageMutation = useMutation({
    mutationFn: async (stageId: string) => {
      const { error } = await lf
        .from("stage_instances")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", stageId);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast({
        title: "Etapa iniciada!",
        description: "A etapa foi marcada como em progresso.",
      });
      
      queryClient.invalidateQueries({ queryKey: ["sf5-journey-stages", journey?.id] });
    },
  });

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-4">
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!journey) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">Nenhuma jornada ativa para este processo</p>
          <Button variant="outline" size="sm" className="mt-2">
            <Plus className="w-4 h-4 mr-2" />
            Iniciar Jornada
          </Button>
        </CardContent>
      </Card>
    );
  }

  const nextStage = stages.find(s => s.status === "pending");
  const currentStage = stages.find(s => s.status === "in_progress");
  const completedStages = stages.filter(s => s.status === "completed").length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "in_progress":
        return "text-blue-600 bg-blue-100";
      case "pending":
        return "text-gray-600 bg-gray-100";
      case "skipped":
        return "text-yellow-600 bg-yellow-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "in_progress":
        return <RefreshCw className="w-4 h-4 animate-spin" />;
      case "pending":
        return <Circle className="w-4 h-4" />;
      case "skipped":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-red-200 bg-red-50";
      case "medium":
        return "border-yellow-200 bg-yellow-50";
      case "low":
        return "border-green-200 bg-green-50";
      default:
        return "";
    }
  };

  const handleExecuteAction = () => {
    if (journey.next_action?.stage_id) {
      executeActionMutation.mutate({
        stageId: journey.next_action.stage_id,
        notes: actionNotes,
      });
    }
  };

  const handleStartStage = (stageId: string) => {
    startStageMutation.mutate(stageId);
  };

  return (
    <Card className={`transition-all duration-200 ${journey.next_action?.priority === "high" ? getPriorityColor("high") : ""}`}>
      <CardHeader className={size === "compact" ? "p-4 pb-2" : "p-6 pb-2"}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg font-semibold">{journey.template_name}</CardTitle>
              <p className="text-sm text-gray-600">
                {completedStages} de {stages.length} etapas concluídas
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getStatusColor(journey.status)}>
              {journey.status === "in_progress" ? "Em andamento" : "Concluída"}
            </Badge>
            {showAccordion && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={size === "compact" ? "p-4 pt-2" : "p-6 pt-2"}>
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Progresso</span>
            <span className="text-sm text-gray-600">{Math.round(journey.progress_pct)}%</span>
          </div>
          <Progress value={journey.progress_pct} className="h-2" />
        </div>

        {/* Next Action CTA */}
        {journey.next_action && (
          <div className="mb-4 p-4 rounded-lg border bg-gradient-to-r from-blue-50 to-blue-100">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Próxima Ação</h4>
                  {journey.next_action.priority && (
                    <Badge 
                      size="sm" 
                      variant={journey.next_action.priority === "high" ? "destructive" : "outline"}
                    >
                      {journey.next_action.priority === "high" ? "Urgente" : 
                       journey.next_action.priority === "medium" ? "Média" : "Baixa"}
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  {journey.next_action.title}
                </p>
                {journey.next_action.description && (
                  <p className="text-xs text-blue-700 mb-2">
                    {journey.next_action.description}
                  </p>
                )}
                {journey.next_action.due_at && (
                  <div className="flex items-center gap-1 text-xs text-blue-700">
                    <Timer className="w-3 h-3" />
                    Prazo: {formatDate(journey.next_action.due_at)}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {currentStage && currentStage.status === "in_progress" && (
                  <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Concluir
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Concluir Etapa</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="notes">Observações (opcional)</Label>
                          <Textarea
                            id="notes"
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                            placeholder="Adicione observações sobre a conclusão desta etapa..."
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsActionDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleExecuteAction}
                          disabled={executeActionMutation.isPending}
                        >
                          {executeActionMutation.isPending ? "Concluindo..." : "Concluir Etapa"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
                
                {nextStage && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleStartStage(nextStage.id)}
                    disabled={startStageMutation.isPending}
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Iniciar
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Etapas (Accordion) */}
        {showAccordion && isExpanded && stages.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="stages">
              <AccordionTrigger className="text-sm font-medium">
                Etapas da Jornada ({completedStages}/{stages.length})
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {stages.map((stage, index) => (
                    <div 
                      key={stage.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        stage.status === "in_progress" ? "border-blue-200 bg-blue-50" : 
                        stage.status === "completed" ? "border-green-200 bg-green-50" : 
                        "border-gray-200"
                      }`}
                    >
                      <div className="flex-shrink-0">
                        {getStatusIcon(stage.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{stage.title}</span>
                          <Badge size="sm" variant="outline" className={getStatusColor(stage.status)}>
                            {stage.status === "pending" ? "Pendente" :
                             stage.status === "in_progress" ? "Em andamento" :
                             stage.status === "completed" ? "Concluída" : "Pulada"}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          {stage.sla_days && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              SLA: {stage.sla_days} dias
                            </div>
                          )}
                          
                          {stage.due_at && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Prazo: {formatDate(stage.due_at)}
                            </div>
                          )}
                          
                          {stage.completed_at && (
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Concluída: {formatDate(stage.completed_at)}
                            </div>
                          )}
                        </div>
                        
                        {stage.notes && (
                          <p className="text-xs text-gray-600 mt-1 italic">{stage.notes}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {stage.status === "pending" && !currentStage && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleStartStage(stage.id)}
                            disabled={startStageMutation.isPending}
                          >
                            <PlayCircle className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
