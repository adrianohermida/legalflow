/**
 * Journey Designer - Flow D2
 * Behavior Goal: orchestrate stages, SLAs and rules
 * Canvas with lesson|form|upload|meeting|gate|task blocks, stage configuration and rules
 */

import React, { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, Save, Settings, Trash2, Copy, Play, ArrowRight, Bell, Activity, Calendar, Webhook, FileText, Upload, Users, CheckCircle, Clock, X } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";
import {
  JourneyTemplate,
  JourneyTemplateStage,
  StageRule,
  StageType,
  DEFAULT_STAGE_TYPES,
  generateDefaultRules
} from "../lib/journey-utils";

interface JourneyDesignerD2Props {
  templateId?: string;
  onSave?: (template: JourneyTemplate) => void;
  onCancel?: () => void;
}

interface CanvasStage extends JourneyTemplateStage {
  position: { x: number; y: number };
}

export default function JourneyDesignerD2({ templateId, onSave, onCancel }: JourneyDesignerD2Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef<HTMLDivElement>(null);

  // Template data
  const [template, setTemplate] = useState<Partial<JourneyTemplate>>({
    name: "",
    description: "",
    area: "",
    category: "",
    tags: [],
    is_active: true
  });

  // Canvas stages
  const [canvasStages, setCanvasStages] = useState<CanvasStage[]>([]);
  const [selectedStage, setSelectedStage] = useState<CanvasStage | null>(null);
  const [stageRules, setStageRules] = useState<Record<string, StageRule[]>>({});
  
  // UI state
  const [showStageConfig, setShowStageConfig] = useState(false);
  const [showRulesConfig, setShowRulesConfig] = useState(false);
  const [draggedStageType, setDraggedStageType] = useState<StageType | null>(null);
  const [isCanvasMode, setIsCanvasMode] = useState(true);

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async (data: { template: Partial<JourneyTemplate>; stages: CanvasStage[]; rules: Record<string, StageRule[]> }) => {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Template salvo",
        description: "Template de jornada foi salvo com sucesso"
      });
      if (onSave) {
        onSave(template as JourneyTemplate);
      }
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar template",
        variant: "destructive"
      });
    }
  });

  // Handle canvas drop
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedStageType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newStage: CanvasStage = {
      id: `stage-${Date.now()}`,
      template_id: templateId || "",
      stage_type_id: draggedStageType.id,
      title: `Nova ${draggedStageType.name}`,
      description: draggedStageType.description,
      order_index: canvasStages.length + 1,
      is_mandatory: true,
      sla_days: 3,
      config: {},
      position: { x, y },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setCanvasStages(prev => [...prev, newStage]);
    
    // Generate default rules for this stage type
    const defaultRules = generateDefaultRules(draggedStageType.type);
    setStageRules(prev => ({
      ...prev,
      [newStage.id]: defaultRules.map(rule => ({
        ...rule,
        id: `rule-${Date.now()}-${Math.random()}`,
        stage_id: newStage.id,
        created_at: new Date().toISOString()
      } as StageRule))
    }));

    setDraggedStageType(null);
  };

  // Handle stage click
  const handleStageClick = (stage: CanvasStage) => {
    setSelectedStage(stage);
    setShowStageConfig(true);
  };

  // Handle stage update
  const handleStageUpdate = (updatedStage: Partial<CanvasStage>) => {
    if (!selectedStage) return;

    setCanvasStages(prev => 
      prev.map(stage => 
        stage.id === selectedStage.id 
          ? { ...stage, ...updatedStage, updated_at: new Date().toISOString() }
          : stage
      )
    );

    setSelectedStage(prev => prev ? { ...prev, ...updatedStage } : null);
  };

  // Handle stage delete
  const handleStageDelete = (stageId: string) => {
    setCanvasStages(prev => prev.filter(stage => stage.id !== stageId));
    setStageRules(prev => {
      const { [stageId]: deleted, ...rest } = prev;
      return rest;
    });
    if (selectedStage?.id === stageId) {
      setSelectedStage(null);
      setShowStageConfig(false);
    }
  };

  // Handle rule update
  const handleRuleUpdate = (stageId: string, rules: StageRule[]) => {
    setStageRules(prev => ({
      ...prev,
      [stageId]: rules
    }));
  };

  // Handle save
  const handleSave = () => {
    if (!template.name?.trim()) {
      toast({
        title: "Erro de validação",
        description: "Nome do template é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (canvasStages.length === 0) {
      toast({
        title: "Erro de validação",
        description: "Adicione pelo menos uma etapa",
        variant: "destructive"
      });
      return;
    }

    const templateWithStats = {
      ...template,
      stage_count: canvasStages.length,
      estimated_duration_days: canvasStages.reduce((total, stage) => total + stage.sla_days, 0)
    };

    saveTemplateMutation.mutate({
      template: templateWithStats,
      stages: canvasStages,
      rules: stageRules
    });
  };

  // Render stage block on canvas
  const renderStageBlock = (stage: CanvasStage) => {
    const stageType = DEFAULT_STAGE_TYPES.find(t => t.id === stage.stage_type_id);
    
    return (
      <div
        key={stage.id}
        className="absolute bg-white border-2 border-gray-300 rounded-lg p-3 cursor-pointer hover:border-blue-500 shadow-sm min-w-[120px]"
        style={{
          left: stage.position.x,
          top: stage.position.y,
          borderColor: selectedStage?.id === stage.id ? '#3B82F6' : '#D1D5DB'
        }}
        onClick={() => handleStageClick(stage)}
      >
        <div className="text-center">
          <div className="text-2xl mb-1">{stageType?.icon || '📋'}</div>
          <div className="text-xs font-medium">{stage.title}</div>
          <div className="text-xs text-gray-500 mt-1">
            {stage.sla_days}d
          </div>
          {stage.is_mandatory && (
            <Badge variant="destructive" className="text-xs mt-1">
              Obrigatório
            </Badge>
          )}
        </div>
      </div>
    );
  };

  // Render stage configuration modal
  const renderStageConfig = () => {
    if (!selectedStage) return null;

    const stageType = DEFAULT_STAGE_TYPES.find(t => t.id === selectedStage.stage_type_id);

    return (
      <Dialog open={showStageConfig} onOpenChange={setShowStageConfig}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Configurar Etapa: {stageType?.name} {stageType?.icon}
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="config">Configuração</TabsTrigger>
              <TabsTrigger value="rules">Regras</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stage-title">Título</Label>
                  <Input
                    id="stage-title"
                    value={selectedStage.title}
                    onChange={(e) => handleStageUpdate({ title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stage-sla">SLA (dias)</Label>
                  <Input
                    id="stage-sla"
                    type="number"
                    value={selectedStage.sla_days}
                    onChange={(e) => handleStageUpdate({ sla_days: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stage-description">Descrição</Label>
                <Textarea
                  id="stage-description"
                  value={selectedStage.description || ''}
                  onChange={(e) => handleStageUpdate({ description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="stage-mandatory"
                  checked={selectedStage.is_mandatory}
                  onCheckedChange={(checked) => handleStageUpdate({ is_mandatory: checked })}
                />
                <Label htmlFor="stage-mandatory">Etapa obrigatória</Label>
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Configuração Específica: {stageType?.name}</h4>
                <p className="text-sm text-gray-600 mb-4">{stageType?.description}</p>
                
                {/* Dynamic config based on stage type */}
                {selectedStage.stage_type_id === 'form' && (
                  <div className="space-y-3">
                    <Label>Campos do Formulário</Label>
                    <Textarea
                      placeholder='Ex: ["nome", "email", "telefone"]'
                      value={JSON.stringify(selectedStage.config.fields || [], null, 2)}
                      onChange={(e) => {
                        try {
                          const fields = JSON.parse(e.target.value);
                          handleStageUpdate({ config: { ...selectedStage.config, fields } });
                        } catch (error) {
                          // Handle JSON parse error
                        }
                      }}
                      rows={3}
                    />
                  </div>
                )}

                {selectedStage.stage_type_id === 'upload' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Tipos Permitidos</Label>
                        <Input
                          placeholder="pdf,jpg,png"
                          value={(selectedStage.config.allowed_types || []).join(',')}
                          onChange={(e) => {
                            const allowed_types = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                            handleStageUpdate({ config: { ...selectedStage.config, allowed_types } });
                          }}
                        />
                      </div>
                      <div>
                        <Label>Máx. Arquivos</Label>
                        <Input
                          type="number"
                          value={selectedStage.config.max_files || 5}
                          onChange={(e) => handleStageUpdate({ 
                            config: { ...selectedStage.config, max_files: Number(e.target.value) }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedStage.stage_type_id === 'meeting' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Duração (min)</Label>
                        <Input
                          type="number"
                          value={selectedStage.config.duration_minutes || 60}
                          onChange={(e) => handleStageUpdate({ 
                            config: { ...selectedStage.config, duration_minutes: Number(e.target.value) }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Tipo</Label>
                        <Select 
                          value={selectedStage.config.meeting_type || 'online'}
                          onValueChange={(value) => handleStageUpdate({ 
                            config: { ...selectedStage.config, meeting_type: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="online">Online</SelectItem>
                            <SelectItem value="presencial">Presencial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {selectedStage.stage_type_id === 'task' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Responsável</Label>
                        <Input
                          placeholder="OAB ou nome"
                          value={selectedStage.config.assignee || ''}
                          onChange={(e) => handleStageUpdate({ 
                            config: { ...selectedStage.config, assignee: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label>Prioridade</Label>
                        <Select 
                          value={selectedStage.config.priority || 'medium'}
                          onValueChange={(value) => handleStageUpdate({ 
                            config: { ...selectedStage.config, priority: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="medium">Média</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="rules" className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Regras de Automação</h4>
                  <Button 
                    size="sm" 
                    onClick={() => setShowRulesConfig(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Regra
                  </Button>
                </div>

                <div className="space-y-3">
                  {(stageRules[selectedStage.id] || []).map((rule, index) => (
                    <Card key={rule.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">
                                {rule.trigger_event === 'on_enter' ? 'Ao Entrar' :
                                 rule.trigger_event === 'on_done' ? 'Ao Concluir' : 'Atrasado'}
                              </Badge>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                              <Badge variant="secondary">
                                {rule.action_type === 'notify' ? '🔔 Notificar' :
                                 rule.action_type === 'create_activity' ? '📋 Criar Atividade' :
                                 rule.action_type === 'create_ticket' ? '🎫 Criar Ticket' :
                                 rule.action_type === 'schedule' ? '📅 Agendar' : '🔗 Webhook'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {JSON.stringify(rule.action_config)}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              const newRules = stageRules[selectedStage.id].filter(r => r.id !== rule.id);
                              handleRuleUpdate(selectedStage.id, newRules);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between">
            <Button 
              variant="destructive" 
              onClick={() => handleStageDelete(selectedStage.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Etapa
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => setShowStageConfig(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Nome do template..."
              value={template.name || ''}
              onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
              className="text-lg font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saveTemplateMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveTemplateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4">
          <Input
            placeholder="Área (ex: Trabalhista)"
            value={template.area || ''}
            onChange={(e) => setTemplate(prev => ({ ...prev, area: e.target.value }))}
          />
          <Input
            placeholder="Categoria"
            value={template.category || ''}
            onChange={(e) => setTemplate(prev => ({ ...prev, category: e.target.value }))}
          />
          <Input
            placeholder="Tags (separadas por vírgula)"
            value={(template.tags || []).join(', ')}
            onChange={(e) => {
              const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
              setTemplate(prev => ({ ...prev, tags }));
            }}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Stage Types Panel */}
        <div className="w-64 bg-gray-50 border-r p-4">
          <h3 className="font-medium mb-4">Tipos de Etapa</h3>
          <div className="space-y-2">
            {DEFAULT_STAGE_TYPES.map((stageType) => (
              <div
                key={stageType.id}
                className="bg-white border rounded-lg p-3 cursor-move hover:shadow-sm"
                draggable
                onDragStart={() => setDraggedStageType(stageType)}
                onDragEnd={() => setDraggedStageType(null)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{stageType.icon}</span>
                  <span className="font-medium text-sm">{stageType.name}</span>
                </div>
                <p className="text-xs text-gray-600">{stageType.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div 
          ref={canvasRef}
          className="flex-1 relative bg-gray-100 overflow-auto"
          onDrop={handleCanvasDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="absolute inset-0 p-8">
            {canvasStages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <div className="text-4xl mb-4">🎨</div>
                  <h3 className="text-lg font-medium mb-2">Arraste etapas para o canvas</h3>
                  <p className="text-sm">Clique em uma etapa para configurá-la</p>
                </div>
              </div>
            )}

            {canvasStages.map(renderStageBlock)}

            {/* Connection lines (simplified) */}
            {canvasStages.length > 1 && (
              <svg className="absolute inset-0 pointer-events-none">
                {canvasStages
                  .sort((a, b) => a.order_index - b.order_index)
                  .slice(0, -1)
                  .map((stage, index) => {
                    const nextStage = canvasStages.find(s => s.order_index === stage.order_index + 1);
                    if (!nextStage) return null;

                    return (
                      <line
                        key={`line-${stage.id}-${nextStage.id}`}
                        x1={stage.position.x + 60}
                        y1={stage.position.y + 30}
                        x2={nextStage.position.x + 60}
                        y2={nextStage.position.y + 30}
                        stroke="#CBD5E1"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                      />
                    );
                  })}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Stage Configuration Modal */}
      {renderStageConfig()}
    </div>
  );
}
