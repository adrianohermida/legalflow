import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  Plus,
  FileText,
  Upload,
  Target,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
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
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { toast } from "../hooks/use-toast";

interface AdvogaAIJourneyButtonsProps {
  numeroCnj?: string;
  journeyInstanceId?: string;
  context?: "chat" | "inbox" | "process";
  className?: string;
}

interface QuickActionDialogProps {
  title: string;
  description: string;
  onConfirm: () => void;
  isLoading: boolean;
  children?: React.ReactNode;
}

const QuickActionDialog: React.FC<
  QuickActionDialogProps & { trigger: React.ReactNode }
> = ({ title, description, onConfirm, isLoading, children, trigger }) => {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-neutral-600 mb-4">{description}</p>
          {children}
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
            onClick={handleConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Confirmar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const AdvogaAIJourneyButtons: React.FC<AdvogaAIJourneyButtonsProps> = ({
  numeroCnj,
  journeyInstanceId,
  context = "chat",
  className = "",
}) => {
  const queryClient = useQueryClient();
  const [createStageData, setCreateStageData] = useState({
    title: "",
    description: "",
    type_id: "task",
    sla_hours: 24,
  });

  // Mutation for completing stage
  const completeStageMatation = useMutation({
    mutationFn: async (stageInstanceId: string) => {
      const response = await fetch(
        "/.netlify/functions/api-agent-tools/v1/agent/tools/stage.complete",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage_instance_id: stageInstanceId }),
        },
      );

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Etapa concluída",
        description: "A etapa foi marcada como concluída pelo assistente.",
      });
      queryClient.invalidateQueries({ queryKey: ["journey-stages"] });
      queryClient.invalidateQueries({ queryKey: ["process-journey"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for creating stage
  const createStageMutation = useMutation({
    mutationFn: async () => {
      if (!journeyInstanceId)
        throw new Error("ID da instância da jornada é necessário");

      const response = await fetch(
        "/.netlify/functions/api-agent-tools/v1/agent/tools/stage.create",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instance_id: journeyInstanceId,
            title: createStageData.title,
            description: createStageData.description,
            type_id: createStageData.type_id,
            sla_hours: createStageData.sla_hours,
          }),
        },
      );

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Etapa criada",
        description: "Nova etapa adicionada pelo assistente.",
      });
      setCreateStageData({
        title: "",
        description: "",
        type_id: "task",
        sla_hours: 24,
      });
      queryClient.invalidateQueries({ queryKey: ["journey-stages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for submitting form
  const submitFormMutation = useMutation({
    mutationFn: async ({
      stageInstanceId,
      formData,
    }: {
      stageInstanceId: string;
      formData: any;
    }) => {
      const response = await fetch(
        "/.netlify/functions/api-agent-tools/v1/agent/tools/form.submit",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stage_instance_id: stageInstanceId,
            form_key: `form_${Date.now()}`,
            answers_json: formData,
          }),
        },
      );

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Formulário enviado",
        description: "Dados do formulário processados pelo assistente.",
      });
      queryClient.invalidateQueries({ queryKey: ["journey-stages"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation for requesting document
  const requestDocumentMutation = useMutation({
    mutationFn: async ({
      templateStageId,
      docName,
    }: {
      templateStageId: string;
      docName: string;
    }) => {
      const response = await fetch(
        "/.netlify/functions/api-agent-tools/v1/agent/tools/document.request",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            template_stage_id: templateStageId,
            name: docName,
            required: true,
          }),
        },
      );

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Documento solicitado",
        description: "Requisito de documento criado pelo assistente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const buttonSize = context === "chat" ? "sm" : "default";
  const isCompact = context === "chat";

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {/* Complete Stage Button */}
      <QuickActionDialog
        title="Concluir Etapa"
        description="Esta ação irá marcar uma etapa da jornada como concluída. Use quando o assistente determinar que uma tarefa foi finalizada."
        onConfirm={() => {
          // In a real scenario, this would get the stage ID from context
          // For demo purposes, we'll show that the action is available
          toast({
            title: "Funcionalidade disponível",
            description:
              "O assistente pode concluir etapas quando integrado ao chat.",
          });
        }}
        isLoading={completeStageMatation.isPending}
        trigger={
          <Button
            variant="outline"
            size={buttonSize}
            className={isCompact ? "text-xs" : ""}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            {isCompact ? "Concluir" : "Concluir Etapa"}
          </Button>
        }
      />

      {/* Create Stage Button */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size={buttonSize}
            className={isCompact ? "text-xs" : ""}
          >
            <Plus className="w-4 h-4 mr-1" />
            {isCompact ? "Criar" : "Criar Etapa"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Etapa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título da Etapa</Label>
              <Input
                value={createStageData.title}
                onChange={(e) =>
                  setCreateStageData({
                    ...createStageData,
                    title: e.target.value,
                  })
                }
                placeholder="Ex: Analisar documentos recebidos"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={createStageData.description}
                onChange={(e) =>
                  setCreateStageData({
                    ...createStageData,
                    description: e.target.value,
                  })
                }
                placeholder="Descreva o que deve ser feito..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={createStageData.type_id}
                  onValueChange={(value) =>
                    setCreateStageData({ ...createStageData, type_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="task">Tarefa</SelectItem>
                    <SelectItem value="form">Formulário</SelectItem>
                    <SelectItem value="upload">Upload</SelectItem>
                    <SelectItem value="meeting">Reunião</SelectItem>
                    <SelectItem value="gate">Aprovação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Prazo (horas)</Label>
                <Input
                  type="number"
                  min="1"
                  value={createStageData.sla_hours}
                  onChange={(e) =>
                    setCreateStageData({
                      ...createStageData,
                      sla_hours: parseInt(e.target.value) || 24,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={() => createStageMutation.mutate()}
              disabled={
                !createStageData.title.trim() ||
                createStageMutation.isPending ||
                !journeyInstanceId
              }
              className="flex-1"
            >
              {createStageMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Form Button */}
      <QuickActionDialog
        title="Enviar Formulário"
        description="Esta ação permite que o assistente processe e envie dados de formulários automaticamente."
        onConfirm={() => {
          toast({
            title: "Funcionalidade disponível",
            description:
              "O assistente pode processar formulários quando integrado.",
          });
        }}
        isLoading={submitFormMutation.isPending}
        trigger={
          <Button
            variant="outline"
            size={buttonSize}
            className={isCompact ? "text-xs" : ""}
          >
            <FileText className="w-4 h-4 mr-1" />
            {isCompact ? "Formulário" : "Enviar Formulário"}
          </Button>
        }
      />

      {/* Request Document Button */}
      <QuickActionDialog
        title="Solicitar Documento"
        description="Esta ação permite que o assistente solicite documentos específicos do cliente."
        onConfirm={() => {
          toast({
            title: "Funcionalidade disponível",
            description:
              "O assistente pode solicitar documentos quando necessário.",
          });
        }}
        isLoading={requestDocumentMutation.isPending}
        trigger={
          <Button
            variant="outline"
            size={buttonSize}
            className={isCompact ? "text-xs" : ""}
          >
            <Upload className="w-4 h-4 mr-1" />
            {isCompact ? "Documento" : "Solicitar Documento"}
          </Button>
        }
      />

      {/* Status indicator */}
      {context !== "chat" && (
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="outline" className="text-xs">
            <Target className="w-3 h-3 mr-1" />
            AdvogaAI v2
          </Badge>
          {numeroCnj && (
            <Badge variant="secondary" className="text-xs">
              {numeroCnj}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Compact version for chat integration
 */
export const AdvogaAIChatTools: React.FC<{
  numeroCnj?: string;
  journeyInstanceId?: string;
}> = ({ numeroCnj, journeyInstanceId }) => {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="w-4 h-4" />
          Ferramentas AdvogaAI para Jornadas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <AdvogaAIJourneyButtons
          numeroCnj={numeroCnj}
          journeyInstanceId={journeyInstanceId}
          context="chat"
          className="justify-start"
        />
        <p className="text-xs text-blue-700 mt-2">
          O assistente pode usar essas ferramentas para gerenciar jornadas
          automaticamente.
        </p>
      </CardContent>
    </Card>
  );
};

export default AdvogaAIJourneyButtons;
