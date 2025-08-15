/**
 * Journey Card - Flow D4
 * Behavior Goal: from insight to action
 * Card with progress bar, Next Action (contextual CTA) and stages accordion (status, deadlines)
 * Action: "Complete stage" → update status='done' (trigger recalculates %/CTA)
 * For tasks, mirror in legalflow.activities (if not exists)
 */

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Play, CheckCircle, Clock, AlertTriangle, Calendar, User, FileText, Upload, Users, Target, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "./ui/dropdown-menu";
import { useToast } from "../hooks/use-toast";
import {
  JourneyInstance,
  StageInstance,
  getJourneyStatusColor,
  getStageStatusColor,
  getStageTypeIcon,
  formatRelativeTime,
  isStageOverdue,
  getDaysUntilDue,
  calculateProgress,
  calculateNextAction
} from "../lib/journey-utils";

interface JourneyCardD4Props {
  journey: JourneyInstance;
  stages: StageInstance[];
  onStageComplete?: (stageId: string) => void;
  onStageEdit?: (stage: StageInstance) => void;
  onJourneyEdit?: (journey: JourneyInstance) => void;
  className?: string;
}

export default function JourneyCardD4({
  journey,
  stages,
  onStageComplete,
  onStageEdit,
  onJourneyEdit,
  className = ""
}: JourneyCardD4Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate current progress and next action
  const currentProgress = calculateProgress(stages);
  const nextAction = calculateNextAction(journey, stages);
  const nextStage = stages.find(s => s.id === nextAction.stage_id);

  // Complete stage mutation
  const completeStage = useMutation({
    mutationFn: async (stageId: string) => {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update stage status to completed
      const stage = stages.find(s => s.id === stageId);
      if (stage?.stage_type === 'task') {
        // Mirror in legalflow.activities if it's a task and doesn't exist
        console.log('Creating mirror activity for task:', stage.title);
      }
      
      return { stageId, completed_at: new Date().toISOString() };
    },
    onSuccess: (data) => {
      toast({
        title: "Etapa concluída",
        description: "Etapa foi marcada como concluída com sucesso"
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["journey-instances"] });
      queryClient.invalidateQueries({ queryKey: ["stage-instances"] });
      
      if (onStageComplete) {
        onStageComplete(data.stageId);
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao concluir etapa",
        variant: "destructive"
      });
    }
  });

  const handleCompleteStage = (stageId: string) => {
    completeStage.mutate(stageId);
  };

  const handleStageAction = (stage: StageInstance) => {
    if (stage.status === 'pending' || stage.status === 'in_progress') {
      handleCompleteStage(stage.id);
    }
  };

  const getStageActionText = (stage: StageInstance) => {
    switch (stage.stage_type) {
      case 'form':
        return stage.status === 'completed' ? 'Formulário Preenchido' : 'Preencher Formulário';
      case 'upload':
        return stage.status === 'completed' ? 'Documentos Enviados' : 'Enviar Documentos';
      case 'meeting':
        return stage.status === 'completed' ? 'Reunião Realizada' : 'Agendar Reunião';
      case 'task':
        return stage.status === 'completed' ? 'Tarefa Concluída' : 'Executar Tarefa';
      case 'gate':
        return stage.status === 'completed' ? 'Aprovado' : 'Aguardando Aprovação';
      case 'lesson':
        return stage.status === 'completed' ? 'Lição Concluída' : 'Ver Lição';
      default:
        return stage.status === 'completed' ? 'Concluído' : 'Executar';
    }
  };

  const getStageStatusIcon = (stage: StageInstance) => {
    if (stage.status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (isStageOverdue(stage)) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    if (stage.status === 'in_progress') {
      return <Clock className="h-4 w-4 text-blue-600" />;
    }
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const getDueDateInfo = (stage: StageInstance) => {
    if (stage.status === 'completed') {
      return stage.completed_at ? `Concluído ${formatRelativeTime(stage.completed_at)}` : 'Concluído';
    }
    
    const daysUntilDue = getDaysUntilDue(stage);
    const isOverdue = isStageOverdue(stage);
    
    if (isOverdue) {
      return `Atrasado ${Math.abs(daysUntilDue)} dia(s)`;
    }
    
    if (daysUntilDue === 0) {
      return 'Vence hoje';
    }
    
    if (daysUntilDue === 1) {
      return 'Vence amanhã';
    }
    
    return `Vence em ${daysUntilDue} dia(s)`;
  };

  return (
    <Card className={`${className} border-l-4 ${
      journey.status === 'completed' ? 'border-l-green-500' :
      journey.status === 'active' ? 'border-l-blue-500' :
      journey.status === 'on_hold' ? 'border-l-yellow-500' : 'border-l-gray-500'
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{journey.template_name}</CardTitle>
              <Badge className={getJourneyStatusColor(journey.status)}>
                {journey.status === 'active' ? 'Ativo' : 
                 journey.status === 'completed' ? 'Concluído' :
                 journey.status === 'on_hold' ? 'Pausado' : 'Cancelado'}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mb-2">{journey.client_name}</p>
            {journey.numero_cnj && (
              <p className="text-xs text-gray-500">Processo: {journey.numero_cnj}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onJourneyEdit && onJourneyEdit(journey)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar Jornada
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsExpanded(!isExpanded)}>
                <FileText className="mr-2 h-4 w-4" />
                {isExpanded ? 'Ocultar' : 'Ver'} Etapas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Cancelar Jornada
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Progresso</span>
            <span>{currentProgress}%</span>
          </div>
          <Progress value={currentProgress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{stages.filter(s => s.status === 'completed').length} de {stages.length} etapas</span>
            <span>Responsável: {journey.responsible_name}</span>
          </div>
        </div>

        {/* Next Action */}
        {nextAction.stage_id && nextStage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">Próxima Ação</h4>
                <p className="text-sm text-blue-700 mb-2">{nextAction.action}</p>
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Calendar className="h-3 w-3" />
                  <span>{getDueDateInfo(nextStage)}</span>
                  {nextStage.assigned_to && (
                    <>
                      <User className="h-3 w-3 ml-2" />
                      <span>{nextStage.assigned_to}</span>
                    </>
                  )}
                </div>
              </div>
              <Button 
                size="sm"
                onClick={() => handleStageAction(nextStage)}
                disabled={completeStage.isPending}
                className={`${
                  isStageOverdue(nextStage) 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {completeStage.isPending ? (
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {getStageActionText(nextStage)}
              </Button>
            </div>
          </div>
        )}

        {/* Stages Accordion */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto">
              <span className="font-medium">Etapas da Jornada</span>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-3">
            {stages
              .sort((a, b) => {
                // Sort by stage order or creation date
                const aOrder = a.created_at;
                const bOrder = b.created_at;
                return new Date(aOrder).getTime() - new Date(bOrder).getTime();
              })
              .map((stage, index) => {
                const isOverdue = isStageOverdue(stage);
                const isNext = stage.id === nextAction.stage_id;
                
                return (
                  <div 
                    key={stage.id}
                    className={`border rounded-lg p-3 ${
                      isNext ? 'border-blue-300 bg-blue-50' :
                      stage.status === 'completed' ? 'border-green-300 bg-green-50' :
                      isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getStageTypeIcon(stage.stage_type)}</span>
                          {getStageStatusIcon(stage)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium text-sm">{stage.title}</h5>
                            {stage.is_mandatory && (
                              <Badge variant="destructive" className="text-xs">
                                Obrigatório
                              </Badge>
                            )}
                            {isNext && (
                              <Badge variant="default" className="text-xs bg-blue-600">
                                Próxima
                              </Badge>
                            )}
                          </div>
                          {stage.description && (
                            <p className="text-xs text-gray-600 mt-1">{stage.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-xs">
                            <span className={`font-medium ${
                              isOverdue ? 'text-red-600' : 
                              stage.status === 'completed' ? 'text-green-600' : 'text-gray-600'
                            }`}>
                              {getDueDateInfo(stage)}
                            </span>
                            {stage.assigned_to && (
                              <span className="text-gray-500">
                                Responsável: {stage.assigned_to}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Badge className={getStageStatusColor(stage.status)}>
                          {stage.status === 'completed' ? 'Concluído' :
                           stage.status === 'in_progress' ? 'Em Andamento' :
                           stage.status === 'pending' ? 'Pendente' :
                           stage.status === 'overdue' ? 'Atrasado' : 'Pulado'}
                        </Badge>
                        
                        {stage.status !== 'completed' && (
                          <Button 
                            size="sm" 
                            variant={isNext ? "default" : "outline"}
                            onClick={() => handleStageAction(stage)}
                            disabled={completeStage.isPending}
                          >
                            {getStageActionText(stage)}
                          </Button>
                        )}
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onStageEdit && onStageEdit(stage)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar Etapa
                            </DropdownMenuItem>
                            {stage.stage_type === 'upload' && (
                              <DropdownMenuItem>
                                <Upload className="mr-2 h-4 w-4" />
                                Ver Documentos
                              </DropdownMenuItem>
                            )}
                            {stage.stage_type === 'form' && (
                              <DropdownMenuItem>
                                <FileText className="mr-2 h-4 w-4" />
                                Ver Respostas
                              </DropdownMenuItem>
                            )}
                            {stage.stage_type === 'meeting' && (
                              <DropdownMenuItem>
                                <Calendar className="mr-2 h-4 w-4" />
                                Agendar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Stage notes */}
                    {stage.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <strong>Observações:</strong> {stage.notes}
                      </div>
                    )}

                    {/* Form responses preview */}
                    {stage.form_responses && Object.keys(stage.form_responses).length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                        <strong>Respostas:</strong> {Object.keys(stage.form_responses).length} campo(s) preenchido(s)
                      </div>
                    )}
                  </div>
                );
              })}
          </CollapsibleContent>
        </Collapsible>

        {/* Journey Stats */}
        <div className="border-t pt-3 mt-3">
          <div className="grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <div className="font-medium text-gray-900">{stages.filter(s => s.status === 'completed').length}</div>
              <div className="text-gray-500">Concluídas</div>
            </div>
            <div>
              <div className="font-medium text-gray-900">{stages.filter(s => isStageOverdue(s)).length}</div>
              <div className="text-gray-500">Atrasadas</div>
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {Math.ceil((new Date().getTime() - new Date(journey.started_at).getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-gray-500">Dias corridos</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
