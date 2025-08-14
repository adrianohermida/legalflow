import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Target, Plus, Calendar, Clock } from "lucide-react";
import { Button } from "./ui/button";
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
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { toast } from "../hooks/use-toast";
import { lf } from "../lib/supabase";

interface CreateStageDialogProps {
  numeroCnj?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}

interface JourneyInstance {
  id: string;
  template_name: string;
  cliente_nome: string;
  progress_pct: number;
  status: string;
}

interface StageType {
  id: string;
  code: string;
  label: string;
}

export const CreateStageDialog: React.FC<CreateStageDialogProps> = ({
  numeroCnj,
  defaultTitle = "",
  defaultDescription = "",
  onSuccess,
  trigger,
}) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    journeyInstanceId: "",
    stageTypeId: "",
    title: defaultTitle,
    description: defaultDescription,
    slaHours: 24,
    mandatory: false,
  });

  // Load journey instances for the process
  const { data: journeyInstances } = useQuery({
    queryKey: ["journey-instances-by-process", numeroCnj],
    queryFn: async () => {
      if (!numeroCnj) return [];

      const { data, error } = await lf
        .from("vw_process_journey")
        .select("*")
        .eq("numero_cnj", numeroCnj)
        .eq("status", "active");

      if (error) throw error;
      return data as JourneyInstance[];
    },
    enabled: !!numeroCnj && open,
  });

  // Load stage types
  const { data: stageTypes } = useQuery({
    queryKey: ["stage-types"],
    queryFn: async () => {
      const { data, error } = await lf
        .from("stage_types")
        .select("*")
        .order("label");

      if (error) throw error;
      return data as StageType[];
    },
    enabled: open,
  });

  const createStageMutation = useMutation({
    mutationFn: async () => {
      if (!formData.journeyInstanceId || !formData.stageTypeId) {
        throw new Error(
          "Instância da jornada e tipo de etapa são obrigatórios",
        );
      }

      // First, create a template stage (simplified for this case)
      const { data: templateStage, error: templateError } = await lf
        .from("journey_template_stages")
        .insert({
          template_id: null, // This will be a custom stage not tied to a template
          position: 999, // Put at the end
          title: formData.title,
          description: formData.description,
          type_id: formData.stageTypeId,
          mandatory: formData.mandatory,
          sla_hours: formData.slaHours,
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Then create the stage instance
      const { data, error } = await lf
        .from("stage_instances")
        .insert({
          instance_id: formData.journeyInstanceId,
          template_stage_id: templateStage.id,
          status: "pending",
          mandatory: formData.mandatory,
          sla_at: new Date(
            Date.now() + formData.slaHours * 60 * 60 * 1000,
          ).toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Etapa criada",
        description: "Nova etapa adicionada à jornada do cliente.",
      });
      setOpen(false);
      setFormData({
        journeyInstanceId: "",
        stageTypeId: "",
        title: defaultTitle,
        description: defaultDescription,
        slaHours: 24,
        mandatory: false,
      });
      onSuccess?.();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar etapa: " + error.message,
        variant: "destructive",
      });
    },
  });

  const selectedJourney = journeyInstances?.find(
    (j) => j.id === formData.journeyInstanceId,
  );
  const selectedStageType = stageTypes?.find(
    (st) => st.id === formData.stageTypeId,
  );

  const canSubmit =
    formData.journeyInstanceId && formData.stageTypeId && formData.title.trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Plus className="w-4 h-4 mr-1" />
            Criar Etapa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Criar Etapa de Jornada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {numeroCnj && (
            <div className="p-3 bg-neutral-50 rounded-lg">
              <div className="text-sm font-medium text-neutral-900">
                Processo
              </div>
              <div className="text-sm text-neutral-600">{numeroCnj}</div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Instância da Jornada</Label>
            {journeyInstances && journeyInstances.length > 0 ? (
              <Select
                value={formData.journeyInstanceId}
                onValueChange={(value) =>
                  setFormData({ ...formData, journeyInstanceId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a jornada ativa" />
                </SelectTrigger>
                <SelectContent>
                  {journeyInstances.map((journey) => (
                    <SelectItem key={journey.id} value={journey.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{journey.template_name}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {journey.progress_pct}%
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-3 border rounded-lg text-center">
                <Target className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-600">
                  Nenhuma jornada ativa encontrada para este processo.
                </p>
                {numeroCnj && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Inicie uma jornada primeiro na página do processo.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Tipo de Etapa</Label>
            <Select
              value={formData.stageTypeId}
              onValueChange={(value) =>
                setFormData({ ...formData, stageTypeId: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {stageTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Título da Etapa</Label>
            <Input
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ex: Analisar publicação do dia X"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Descreva o que deve ser feito nesta etapa..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Prazo (horas)</Label>
              <Input
                type="number"
                min="1"
                max="720"
                value={formData.slaHours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slaHours: parseInt(e.target.value) || 24,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select
                value={formData.mandatory ? "high" : "normal"}
                onValueChange={(value) =>
                  setFormData({ ...formData, mandatory: value === "high" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta (obrigatória)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedJourney && selectedStageType && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-900 mb-1">
                Resumo da Etapa
              </div>
              <div className="text-sm text-blue-700">
                <div>
                  📋 <strong>{formData.title || "Nova etapa"}</strong>
                </div>
                <div>🎯 Jornada: {selectedJourney.template_name}</div>
                <div>⚡ Tipo: {selectedStageType.label}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3" />
                  Prazo: {formData.slaHours}h (
                  {new Date(
                    Date.now() + formData.slaHours * 60 * 60 * 1000,
                  ).toLocaleDateString("pt-BR")}
                  )
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => createStageMutation.mutate()}
            disabled={!canSubmit || createStageMutation.isPending}
            className="flex-1"
          >
            {createStageMutation.isPending ? "Criando..." : "Criar Etapa"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStageDialog;
