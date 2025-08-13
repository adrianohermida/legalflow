import React, { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Switch } from "./ui/switch";
import {
  Plus,
  BookOpen,
  FileText,
  Upload,
  Calendar,
  CheckCircle,
  Clipboard,
  Edit,
  Trash2,
  GripVertical,
  Save,
} from "lucide-react";
import { StageType, JourneyTemplateStage } from "../types/journey";

interface StageTypeConfig {
  type: StageType;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}

const stageTypes: StageTypeConfig[] = [
  {
    type: "lesson",
    icon: <BookOpen className="h-4 w-4" />,
    label: "Aula/Conteúdo",
    description: "Conteúdo educacional (vídeo, texto, quiz)",
    color: "bg-brand-100 text-brand-700 border-brand-200",
  },
  {
    type: "form",
    icon: <FileText className="h-4 w-4" />,
    label: "Formulário",
    description: "Formulário para preenchimento",
    color: "bg-success-100 text-success-700 border-success",
  },
  {
    type: "upload",
    icon: <Upload className="h-4 w-4" />,
    label: "Upload",
    description: "Upload de documentos/arquivos",
    color: "bg-brand-100 text-brand-700 border-brand-200",
  },
  {
    type: "meeting",
    icon: <Calendar className="h-4 w-4" />,
    label: "Reunião",
    description: "Agendamento de reunião/audiência",
    color: "bg-warning-100 text-warning-700 border-warning",
  },
  {
    type: "gate",
    icon: <CheckCircle className="h-4 w-4" />,
    label: "Portão",
    description: "Validação/aprovação obrigatória",
    color: "bg-danger-100 text-danger-700 border-danger",
  },
  {
    type: "task",
    icon: <Clipboard className="h-4 w-4" />,
    label: "Tarefa",
    description: "Tarefa geral/checklist",
    color: "bg-neutral-100 text-neutral-800 border-neutral-200",
  },
];

interface JourneyDesignerProps {
  template?: {
    id?: string;
    name: string;
    description: string;
    nicho: string;
    estimated_days: number;
    stages: JourneyTemplateStage[];
  };
  onSave: (template: any) => void;
}

export function JourneyDesigner({ template, onSave }: JourneyDesignerProps) {
  const [templateData, setTemplateData] = useState({
    name: template?.name || "",
    description: template?.description || "",
    nicho: template?.nicho || "",
    estimated_days: template?.estimated_days || 30,
    stages: template?.stages || [],
  });

  const [selectedStage, setSelectedStage] =
    useState<JourneyTemplateStage | null>(null);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const dragItemIndex = useRef<number | null>(null);

  const getStageTypeConfig = (type: StageType) => {
    return stageTypes.find((st) => st.type === type) || stageTypes[0];
  };

  const addStage = (type: StageType) => {
    const newStage: JourneyTemplateStage = {
      id: `stage-${Date.now()}`,
      template_id: template?.id || "new",
      name: `Nova ${getStageTypeConfig(type).label}`,
      description: "",
      stage_type: type,
      sequence_order: templateData.stages.length + 1,
      is_required: true,
      sla_hours: 24,
      estimated_days: 1,
      rules: [],
    };

    setTemplateData((prev) => ({
      ...prev,
      stages: [...prev.stages, newStage],
    }));
  };

  const updateStage = (
    stageId: string,
    updates: Partial<JourneyTemplateStage>,
  ) => {
    setTemplateData((prev) => ({
      ...prev,
      stages: prev.stages.map((stage) =>
        stage.id === stageId ? { ...stage, ...updates } : stage,
      ),
    }));
  };

  const removeStage = (stageId: string) => {
    setTemplateData((prev) => ({
      ...prev,
      stages: prev.stages
        .filter((stage) => stage.id !== stageId)
        .map((stage, index) => ({ ...stage, sequence_order: index + 1 })),
    }));
  };

  const handleDragStart = (index: number) => {
    dragItemIndex.current = index;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (dragItemIndex.current === null) return;

    const dragIndex = dragItemIndex.current;
    const newStages = [...templateData.stages];
    const draggedStage = newStages[dragIndex];

    // Remove from old position
    newStages.splice(dragIndex, 1);
    // Insert at new position
    newStages.splice(dropIndex, 0, draggedStage);

    // Update sequence orders
    const updatedStages = newStages.map((stage, index) => ({
      ...stage,
      sequence_order: index + 1,
    }));

    setTemplateData((prev) => ({
      ...prev,
      stages: updatedStages,
    }));

    dragItemIndex.current = null;
  };

  const handleSave = () => {
    if (!templateData.name || !templateData.nicho) {
      alert("Preencha nome e nicho do template");
      return;
    }

    onSave(templateData);
  };

  return (
    <div className="space-y-6">
      {/* Template Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações do Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Template</Label>
              <Input
                id="name"
                value={templateData.name}
                onChange={(e) =>
                  setTemplateData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ex: Onboarding Trabalhista"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nicho">Nicho Jurídico</Label>
              <Select
                value={templateData.nicho}
                onValueChange={(value) =>
                  setTemplateData((prev) => ({ ...prev, nicho: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nicho" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Trabalhista">Trabalhista</SelectItem>
                  <SelectItem value="Família">Família</SelectItem>
                  <SelectItem value="Empresarial">Empresarial</SelectItem>
                  <SelectItem value="Criminal">Criminal</SelectItem>
                  <SelectItem value="Cível">Cível</SelectItem>
                  <SelectItem value="Tributário">Tributário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={templateData.description}
              onChange={(e) =>
                setTemplateData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Descreva o objetivo e escopo desta jornada..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated_days">Duração Estimada (dias)</Label>
            <Input
              id="estimated_days"
              type="number"
              value={templateData.estimated_days}
              onChange={(e) =>
                setTemplateData((prev) => ({
                  ...prev,
                  estimated_days: parseInt(e.target.value) || 30,
                }))
              }
              min="1"
              max="365"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stage Types Palette */}
      <Card>
        <CardHeader>
          <CardTitle>Tipos de Etapas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stageTypes.map((stageType) => (
              <Button
                key={stageType.type}
                variant="outline"
                className="h-auto p-3 flex flex-col items-center gap-2"
                onClick={() => addStage(stageType.type)}
              >
                {stageType.icon}
                <span className="text-xs text-center">{stageType.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Journey Canvas */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              Fluxo da Jornada ({templateData.stages.length} etapas)
            </CardTitle>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templateData.stages.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <Clipboard className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
              <p>Adicione etapas ao template usando os botões acima.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {templateData.stages
                .sort((a, b) => a.sequence_order - b.sequence_order)
                .map((stage, index) => {
                  const config = getStageTypeConfig(stage.stage_type);
                  return (
                    <div
                      key={stage.id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, index)}
                      className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow cursor-move"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <GripVertical className="h-4 w-4 text-neutral-400" />
                          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                            {stage.sequence_order}
                          </div>
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={config.color}>
                              {config.icon}
                              <span className="ml-1">{config.label}</span>
                            </Badge>
                            {stage.is_required && (
                              <Badge variant="destructive" className="text-xs">
                                Obrigatório
                              </Badge>
                            )}
                          </div>

                          <h4 className="font-medium">{stage.name}</h4>
                          {stage.description && (
                            <p className="text-sm text-neutral-600 mt-1">
                              {stage.description}
                            </p>
                          )}

                          <div className="flex gap-4 mt-2 text-xs text-neutral-500">
                            <span>SLA: {stage.sla_hours}h</span>
                            <span>Duração: {stage.estimated_days} dias</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedStage(stage);
                              setIsStageDialogOpen(true);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeStage(stage.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stage Edit Dialog */}
      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Etapa</DialogTitle>
            <DialogDescription>
              Configure os detalhes e regras desta etapa
            </DialogDescription>
          </DialogHeader>

          {selectedStage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stage-name">Nome da Etapa</Label>
                  <Input
                    id="stage-name"
                    value={selectedStage.name}
                    onChange={(e) => {
                      const updated = {
                        ...selectedStage,
                        name: e.target.value,
                      };
                      setSelectedStage(updated);
                      updateStage(selectedStage.id, { name: e.target.value });
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stage-type">Tipo</Label>
                  <Select
                    value={selectedStage.stage_type}
                    onValueChange={(value: StageType) => {
                      const updated = { ...selectedStage, stage_type: value };
                      setSelectedStage(updated);
                      updateStage(selectedStage.id, { stage_type: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stageTypes.map((type) => (
                        <SelectItem key={type.type} value={type.type}>
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
                <Label htmlFor="stage-description">Descrição</Label>
                <Textarea
                  id="stage-description"
                  value={selectedStage.description}
                  onChange={(e) => {
                    const updated = {
                      ...selectedStage,
                      description: e.target.value,
                    };
                    setSelectedStage(updated);
                    updateStage(selectedStage.id, {
                      description: e.target.value,
                    });
                  }}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sla-hours">SLA (horas)</Label>
                  <Input
                    id="sla-hours"
                    type="number"
                    value={selectedStage.sla_hours}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 24;
                      const updated = { ...selectedStage, sla_hours: value };
                      setSelectedStage(updated);
                      updateStage(selectedStage.id, { sla_hours: value });
                    }}
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated-days">Duração (dias)</Label>
                  <Input
                    id="estimated-days"
                    type="number"
                    value={selectedStage.estimated_days}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      const updated = {
                        ...selectedStage,
                        estimated_days: value,
                      };
                      setSelectedStage(updated);
                      updateStage(selectedStage.id, { estimated_days: value });
                    }}
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Switch
                      checked={selectedStage.is_required}
                      onCheckedChange={(checked) => {
                        const updated = {
                          ...selectedStage,
                          is_required: checked,
                        };
                        setSelectedStage(updated);
                        updateStage(selectedStage.id, { is_required: checked });
                      }}
                    />
                    Obrigatória
                  </Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsStageDialogOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
