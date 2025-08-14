import React, { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult 
} from "@hello-pangea/dnd";
import { 
  Plus, 
  Save, 
  BookOpen, 
  FileText, 
  Upload, 
  Calendar, 
  GitBranch, 
  CheckCircle,
  Settings,
  Trash2,
  GripVertical,
  Clock,
  Star,
  AlertCircle
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Switch } from "./ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { toast } from "../hooks/use-toast";
import { lf } from "../lib/supabase";

interface StageType {
  id: string;
  code: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface JourneyStage {
  id: string;
  template_id?: string;
  position: number;
  title: string;
  description?: string;
  type_id: string;
  mandatory: boolean;
  sla_hours: number;
  config?: any;
}

interface StageRule {
  id: string;
  stage_id: string;
  rule_type: 'on_enter' | 'on_done';
  conditions?: any;
  actions: {
    type: 'notify' | 'schedule' | 'create_task' | 'webhook';
    config: any;
  }[];
}

interface JourneyTemplate {
  id?: string;
  name: string;
  niche: string;
  steps_count: number;
  eta_days: number;
  tags: string[];
}

const STAGE_TYPES: StageType[] = [
  { id: 'lesson', code: 'lesson', label: 'Aula', icon: <BookOpen className="w-4 h-4" />, color: 'bg-blue-500' },
  { id: 'form', code: 'form', label: 'Formulário', icon: <FileText className="w-4 h-4" />, color: 'bg-green-500' },
  { id: 'upload', code: 'upload', label: 'Upload', icon: <Upload className="w-4 h-4" />, color: 'bg-orange-500' },
  { id: 'meeting', code: 'meeting', label: 'Reunião', icon: <Calendar className="w-4 h-4" />, color: 'bg-purple-500' },
  { id: 'gate', code: 'gate', label: 'Aprovação', icon: <GitBranch className="w-4 h-4" />, color: 'bg-red-500' },
  { id: 'task', code: 'task', label: 'Tarefa', icon: <CheckCircle className="w-4 h-4" />, color: 'bg-neutral-500' }
];

const StageBlock: React.FC<{
  stage: JourneyStage;
  index: number;
  onEdit: (stage: JourneyStage) => void;
  onDelete: (stageId: string) => void;
}> = ({ stage, index, onEdit, onDelete }) => {
  const stageType = STAGE_TYPES.find(t => t.id === stage.type_id);
  
  return (
    <Draggable draggableId={stage.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`
            group relative bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow
            ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : ''}
          `}
        >
          <div className="flex items-start gap-3">
            <div 
              {...provided.dragHandleProps}
              className="flex-shrink-0 mt-1 opacity-50 group-hover:opacity-100 transition-opacity"
            >
              <GripVertical className="w-4 h-4 text-neutral-400" />
            </div>
            
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${stageType?.color} flex items-center justify-center text-white`}>
              {stageType?.icon}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-neutral-900 truncate">{stage.title}</h4>
                {stage.mandatory && <Star className="w-3 h-3 text-amber-500" />}
              </div>
              
              {stage.description && (
                <p className="text-sm text-neutral-600 mb-2 line-clamp-2">{stage.description}</p>
              )}
              
              <div className="flex items-center gap-3 text-xs text-neutral-500">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {stage.sla_hours}h
                </div>
                <Badge variant="outline" className="text-xs">
                  {stageType?.label}
                </Badge>
              </div>
            </div>

            <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => onEdit(stage)}>
                  <Settings className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(stage.id)}>
                  <Trash2 className="w-3 h-3 text-red-500" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

const StageConfigDialog: React.FC<{
  stage: JourneyStage | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (stage: JourneyStage) => void;
}> = ({ stage, open, onOpenChange, onSave }) => {
  const [formData, setFormData] = useState<JourneyStage>(
    stage || {
      id: crypto.randomUUID(),
      position: 0,
      title: "",
      description: "",
      type_id: "task",
      mandatory: false,
      sla_hours: 24,
      config: {}
    }
  );

  React.useEffect(() => {
    if (stage) {
      setFormData(stage);
    }
  }, [stage]);

  const selectedStageType = STAGE_TYPES.find(t => t.id === formData.type_id);

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da etapa é obrigatório.",
        variant: "destructive",
      });
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{stage ? 'Editar Etapa' : 'Nova Etapa'}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Configuração Básica</TabsTrigger>
            <TabsTrigger value="rules">Regras e Automação</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Ex: Enviar documentos iniciais"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipo da Etapa</Label>
                <Select value={formData.type_id} onValueChange={(value) => setFormData({...formData, type_id: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          {type.icon}
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Descreva o que o cliente deve fazer nesta etapa..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sla">SLA (horas)</Label>
                <Input
                  id="sla"
                  type="number"
                  min="1"
                  value={formData.sla_hours}
                  onChange={(e) => setFormData({...formData, sla_hours: parseInt(e.target.value) || 24})}
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="mandatory"
                  checked={formData.mandatory}
                  onCheckedChange={(checked) => setFormData({...formData, mandatory: checked})}
                />
                <Label htmlFor="mandatory">Etapa obrigatória</Label>
              </div>
            </div>

            {selectedStageType && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    {selectedStageType.icon}
                    Configurações de {selectedStageType.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.type_id === 'lesson' && (
                    <div className="space-y-2">
                      <Label>URL do Vídeo</Label>
                      <Input 
                        placeholder="https://..." 
                        value={formData.config?.video_url || ""}
                        onChange={(e) => setFormData({
                          ...formData, 
                          config: {...formData.config, video_url: e.target.value}
                        })}
                      />
                    </div>
                  )}

                  {formData.type_id === 'form' && (
                    <div className="space-y-2">
                      <Label>Campos do Formulário (JSON)</Label>
                      <Textarea 
                        placeholder='[{"name": "campo1", "type": "text", "required": true}]'
                        value={JSON.stringify(formData.config?.fields || [], null, 2)}
                        onChange={(e) => {
                          try {
                            const fields = JSON.parse(e.target.value);
                            setFormData({
                              ...formData, 
                              config: {...formData.config, fields}
                            });
                          } catch {}
                        }}
                        rows={4}
                      />
                    </div>
                  )}

                  {formData.type_id === 'upload' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipos de arquivo aceitos</Label>
                        <Input 
                          placeholder="pdf,doc,docx"
                          value={formData.config?.accepted_types?.join(',') || ""}
                          onChange={(e) => setFormData({
                            ...formData, 
                            config: {
                              ...formData.config, 
                              accepted_types: e.target.value.split(',').map(t => t.trim())
                            }
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tamanho máximo (MB)</Label>
                        <Input 
                          type="number"
                          value={formData.config?.max_size_mb || 10}
                          onChange={(e) => setFormData({
                            ...formData, 
                            config: {
                              ...formData.config, 
                              max_size_mb: parseInt(e.target.value) || 10
                            }
                          })}
                        />
                      </div>
                    </div>
                  )}

                  {formData.type_id === 'meeting' && (
                    <div className="space-y-2">
                      <Label>Duração padrão (minutos)</Label>
                      <Input 
                        type="number"
                        value={formData.config?.duration_minutes || 60}
                        onChange={(e) => setFormData({
                          ...formData, 
                          config: {
                            ...formData.config, 
                            duration_minutes: parseInt(e.target.value) || 60
                          }
                        })}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="font-medium text-neutral-900 mb-2">Regras e Automação</h3>
              <p className="text-sm text-neutral-600 mb-4">
                Configure ações que devem ser executadas automaticamente quando esta etapa for iniciada ou concluída.
              </p>
              <Button variant="outline" disabled>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Regra
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleSave} className="flex-1">
            {stage ? 'Salvar Alterações' : 'Adicionar Etapa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const JourneyDesigner: React.FC<{
  templateId?: string;
  onSave?: () => void;
}> = ({ templateId, onSave }) => {
  const queryClient = useQueryClient();
  const [template, setTemplate] = useState<JourneyTemplate>({
    name: "",
    niche: "",
    steps_count: 0,
    eta_days: 0,
    tags: []
  });
  const [stages, setStages] = useState<JourneyStage[]>([]);
  const [editingStage, setEditingStage] = useState<JourneyStage | null>(null);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);

  // Load existing template if editing
  useQuery({
    queryKey: ["journey-template", templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      const { data, error } = await lf
        .from("journey_templates")
        .select("*")
        .eq("id", templateId)
        .single();
      
      if (error) throw error;
      setTemplate(data);
      return data;
    },
    enabled: !!templateId,
  });

  // Load template stages
  useQuery({
    queryKey: ["journey-template-stages", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      
      const { data, error } = await lf
        .from("journey_template_stages")
        .select("*")
        .eq("template_id", templateId)
        .order("position");
      
      if (error) throw error;
      setStages(data);
      return data;
    },
    enabled: !!templateId,
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      let savedTemplate;
      
      if (templateId) {
        // Update existing template
        const { data, error } = await lf
          .from("journey_templates")
          .update({
            name: template.name,
            niche: template.niche,
            steps_count: stages.length,
            eta_days: template.eta_days,
            tags: template.tags
          })
          .eq("id", templateId)
          .select()
          .single();
        
        if (error) throw error;
        savedTemplate = data;
      } else {
        // Create new template
        const { data, error } = await lf
          .from("journey_templates")
          .insert({
            name: template.name,
            niche: template.niche,
            steps_count: stages.length,
            eta_days: template.eta_days,
            tags: template.tags
          })
          .select()
          .single();
        
        if (error) throw error;
        savedTemplate = data;
      }

      // Save stages
      if (stages.length > 0) {
        // Delete existing stages if updating
        if (templateId) {
          await lf.from("journey_template_stages").delete().eq("template_id", templateId);
        }

        // Insert new stages
        const { error: stagesError } = await lf.from("journey_template_stages").insert(
          stages.map((stage, index) => ({
            template_id: savedTemplate.id,
            position: index,
            title: stage.title,
            description: stage.description,
            type_id: stage.type_id,
            mandatory: stage.mandatory,
            sla_hours: stage.sla_hours,
            config: stage.config
          }))
        );

        if (stagesError) throw stagesError;
      }

      return savedTemplate;
    },
    onSuccess: () => {
      toast({
        title: "Template salvo",
        description: "O template foi salvo com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["journey-templates"] });
      onSave?.();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao salvar template: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const newStages = Array.from(stages);
    const [reorderedStage] = newStages.splice(result.source.index, 1);
    newStages.splice(result.destination.index, 0, reorderedStage);

    setStages(newStages);
  };

  const handleStageAdd = () => {
    setEditingStage(null);
    setStageDialogOpen(true);
  };

  const handleStageEdit = (stage: JourneyStage) => {
    setEditingStage(stage);
    setStageDialogOpen(true);
  };

  const handleStageSave = (stage: JourneyStage) => {
    if (editingStage) {
      setStages(prev => prev.map(s => s.id === stage.id ? stage : s));
    } else {
      setStages(prev => [...prev, { ...stage, position: prev.length }]);
    }
  };

  const handleStageDelete = (stageId: string) => {
    setStages(prev => prev.filter(s => s.id !== stageId));
  };

  const addStageType = (typeId: string) => {
    const stageType = STAGE_TYPES.find(t => t.id === typeId);
    if (!stageType) return;

    const newStage: JourneyStage = {
      id: crypto.randomUUID(),
      position: stages.length,
      title: `Nova ${stageType.label}`,
      type_id: typeId,
      mandatory: false,
      sla_hours: 24,
      config: {}
    };

    setStages(prev => [...prev, newStage]);
  };

  const canSave = template.name.trim() && template.niche.trim() && stages.length > 0;

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            {templateId ? 'Editar Template' : 'Novo Template'}
          </h1>
          <p className="text-neutral-600">Configure etapas e automações da jornada</p>
        </div>
        <Button 
          onClick={() => saveTemplateMutation.mutate()}
          disabled={!canSave || saveTemplateMutation.isPending}
          className="gap-2"
        >
          <Save className="w-4 h-4" />
          {saveTemplateMutation.isPending ? 'Salvando...' : 'Salvar Template'}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Template Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuração do Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Nome do Template</Label>
              <Input
                id="template-name"
                value={template.name}
                onChange={(e) => setTemplate({...template, name: e.target.value})}
                placeholder="Ex: Consultoria Trabalhista"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-niche">Área de Atuação</Label>
              <Select value={template.niche} onValueChange={(value) => setTemplate({...template, niche: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trabalhista">Trabalhista</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="criminal">Criminal</SelectItem>
                  <SelectItem value="empresarial">Empresarial</SelectItem>
                  <SelectItem value="tributario">Tributário</SelectItem>
                  <SelectItem value="previdenciario">Previdenciário</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-eta">ETA (dias)</Label>
              <Input
                id="template-eta"
                type="number"
                min="1"
                value={template.eta_days}
                onChange={(e) => setTemplate({...template, eta_days: parseInt(e.target.value) || 0})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-tags">Tags (separadas por vírgula)</Label>
              <Input
                id="template-tags"
                value={template.tags.join(', ')}
                onChange={(e) => setTemplate({
                  ...template, 
                  tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                })}
                placeholder="urgente, premium, complexo"
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Tipos de Etapa</Label>
              <div className="grid grid-cols-2 gap-2">
                {STAGE_TYPES.map((type) => (
                  <Button
                    key={type.id}
                    variant="outline"
                    size="sm"
                    onClick={() => addStageType(type.id)}
                    className="justify-start gap-2"
                  >
                    {type.icon}
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Canvas Area */}
        <Card className="col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Fluxo da Jornada</CardTitle>
              <Button variant="outline" size="sm" onClick={handleStageAdd}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Etapa
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stages.length === 0 ? (
              <div className="text-center py-12">
                <GitBranch className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">Canvas vazio</h3>
                <p className="text-neutral-600 mb-4">
                  Adicione etapas ao seu template para começar a desenhar a jornada.
                </p>
                <Button onClick={handleStageAdd}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeira Etapa
                </Button>
              </div>
            ) : (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="stages">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {stages.map((stage, index) => (
                        <StageBlock
                          key={stage.id}
                          stage={stage}
                          index={index}
                          onEdit={handleStageEdit}
                          onDelete={handleStageDelete}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            )}
          </CardContent>
        </Card>
      </div>

      <StageConfigDialog
        stage={editingStage}
        open={stageDialogOpen}
        onOpenChange={setStageDialogOpen}
        onSave={handleStageSave}
      />
    </div>
  );
};

export default JourneyDesigner;
