import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Copy,
  Play,
  MoreHorizontal,
  Calendar,
  Users,
  Target,
  Tag,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import { toast } from "../hooks/use-toast";
import { lf } from "../lib/supabase";

interface JourneyTemplate {
  id: string;
  name: string;
  niche: string;
  steps_count: number;
  eta_days: number;
  tags: string[];
  created_at: string;
}

interface JourneyInstance {
  id: string;
  template_id: string;
  template_name: string;
  cliente_cpfcnpj: string;
  cliente_nome: string;
  processo_numero_cnj?: string;
  progress_pct: number;
  status: string;
  next_action: any;
  start_date: string;
  owner_oab: number;
  owner_nome: string;
}

interface StartJourneyFormData {
  templateId: string;
  cpfcnpj: string;
  numeroCnj?: string;
  ownerOab?: number;
}

const StartJourneyDialog: React.FC<{
  template: JourneyTemplate;
  onSuccess: () => void;
}> = ({ template, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<StartJourneyFormData>({
    templateId: template.id,
    cpfcnpj: "",
    numeroCnj: "",
    ownerOab: undefined,
  });

  const { data: clientes } = useQuery({
    queryKey: ["clientes"],
    queryFn: async () => {
      const { data, error } = await lf
        .from("clientes")
        .select("cpfcnpj, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: processos } = useQuery({
    queryKey: ["processos", formData.cpfcnpj],
    queryFn: async () => {
      if (!formData.cpfcnpj) return [];
      const { data, error } = await lf
        .from("processos")
        .select("numero_cnj, numero")
        .eq("cliente_cpfcnpj", formData.cpfcnpj);
      if (error) throw error;
      return data;
    },
    enabled: !!formData.cpfcnpj,
  });

  const startJourneyMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await lf.rpc("start_journey_instance", {
        p_template_id: formData.templateId,
        p_cpfcnpj: formData.cpfcnpj,
        p_numero_cnj: formData.numeroCnj || null,
        p_owner_oab: formData.ownerOab || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Jornada iniciada",
        description: "A jornada foi criada com sucesso.",
      });
      setOpen(false);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao iniciar jornada: " + error.message,
        variant: "destructive",
      });
    },
  });

  const selectedCliente = clientes?.find((c) => c.cpfcnpj === formData.cpfcnpj);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Play className="w-4 h-4" />
          Iniciar Jornada
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Jornada: {template.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cliente">Cliente</Label>
            <Select
              value={formData.cpfcnpj}
              onValueChange={(value) =>
                setFormData({ ...formData, cpfcnpj: value, numeroCnj: "" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes?.map((cliente) => (
                  <SelectItem key={cliente.cpfcnpj} value={cliente.cpfcnpj}>
                    {cliente.nome} ({cliente.cpfcnpj})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.cpfcnpj && processos && processos.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="processo">Processo (opcional)</Label>
              <Select
                value={formData.numeroCnj}
                onValueChange={(value) =>
                  setFormData({ ...formData, numeroCnj: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o processo" />
                </SelectTrigger>
                <SelectContent>
                  {processos.map((processo) => (
                    <SelectItem
                      key={processo.numero_cnj}
                      value={processo.numero_cnj}
                    >
                      {processo.numero} ({processo.numero_cnj})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => startJourneyMutation.mutate()}
              disabled={!formData.cpfcnpj || startJourneyMutation.isPending}
              className="flex-1"
            >
              {startJourneyMutation.isPending ? "Iniciando..." : "Iniciar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TemplateCard: React.FC<{
  template: JourneyTemplate;
  onRefresh: () => void;
}> = ({ template, onRefresh }) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const duplicateTemplateMutation = useMutation({
    mutationFn: async () => {
      // First duplicate the template
      const { data: newTemplate, error } = await lf
        .from("journey_templates")
        .insert({
          name: `${template.name} (Cópia)`,
          niche: template.niche,
          steps_count: template.steps_count,
          eta_days: template.eta_days,
          tags: template.tags,
        })
        .select()
        .single();

      if (error) throw error;

      // Then duplicate the stages
      const { data: stages, error: stagesError } = await lf
        .from("journey_template_stages")
        .select("*")
        .eq("template_id", template.id);

      if (stagesError) throw stagesError;

      if (stages && stages.length > 0) {
        const { error: insertError } = await lf
          .from("journey_template_stages")
          .insert(
            stages.map((stage) => ({
              template_id: newTemplate.id,
              position: stage.position,
              title: stage.title,
              description: stage.description,
              type_id: stage.type_id,
              mandatory: stage.mandatory,
              sla_hours: stage.sla_hours,
              config: stage.config,
            })),
          );

        if (insertError) throw insertError;
      }

      return newTemplate;
    },
    onSuccess: () => {
      toast({
        title: "Template duplicado",
        description: "O template foi duplicado com sucesso.",
      });
      onRefresh();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao duplicar template: " + error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-medium">
              {template.name}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-neutral-600">
              <Badge variant="secondary" className="text-xs">
                {template.niche}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => navigate(`/jornadas/designer/${template.id}`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => duplicateTemplateMutation.mutate()}
              >
                <Copy className="w-4 h-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-neutral-900">
              {template.steps_count}
            </div>
            <div className="text-neutral-600">Etapas</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-neutral-900">
              {template.eta_days}
            </div>
            <div className="text-neutral-600">Dias</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-neutral-900">
              {template.tags?.length || 0}
            </div>
            <div className="text-neutral-600">Tags</div>
          </div>
        </div>

        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/jornadas/designer/${template.id}`)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <StartJourneyDialog template={template} onSuccess={onRefresh} />
        </div>
      </CardContent>
    </Card>
  );
};

const InstanceCard: React.FC<{ instance: JourneyInstance }> = ({
  instance,
}) => {
  const progressColor =
    instance.progress_pct >= 100
      ? "bg-green-500"
      : instance.progress_pct >= 50
        ? "bg-blue-500"
        : "bg-neutral-400";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-medium">
              {instance.template_name}
            </CardTitle>
            <div className="text-sm text-neutral-600">
              {instance.cliente_nome} •{" "}
              {instance.processo_numero_cnj &&
                `Processo ${instance.processo_numero_cnj}`}
            </div>
          </div>
          <Badge
            variant={instance.status === "active" ? "default" : "secondary"}
            className="text-xs"
          >
            {instance.status === "active"
              ? "Ativa"
              : instance.status === "completed"
                ? "Concluída"
                : "Pausada"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span className="font-medium">{instance.progress_pct}%</span>
          </div>
          <div className="w-full bg-neutral-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${progressColor}`}
              style={{ width: `${instance.progress_pct}%` }}
            />
          </div>
        </div>

        {instance.next_action && (
          <div className="p-3 bg-neutral-50 rounded-lg">
            <div className="text-sm font-medium text-neutral-900">
              {instance.next_action.title}
            </div>
            <div className="text-xs text-neutral-600 mt-1">
              {instance.next_action.description}
            </div>
            <Button size="sm" className="mt-2 w-full">
              {instance.next_action.cta}
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-neutral-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {new Date(instance.start_date).toLocaleDateString("pt-BR")}
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="w-5 h-5">
              <AvatarFallback className="text-xs">
                {instance.owner_nome?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span>{instance.owner_nome}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function Jornadas() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNiche, setSelectedNiche] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("modelos");

  const {
    data: templates,
    isLoading: templatesLoading,
    refetch: refetchTemplates,
  } = useQuery({
    queryKey: ["journey-templates", searchTerm, selectedNiche],
    queryFn: async () => {
      let query = lf
        .from("journey_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }

      if (selectedNiche !== "all") {
        query = query.eq("niche", selectedNiche);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as JourneyTemplate[];
    },
  });

  const { data: instances, isLoading: instancesLoading } = useQuery({
    queryKey: ["journey-instances"],
    queryFn: async () => {
      const { data, error } = await lf
        .from("vw_process_journey")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as JourneyInstance[];
    },
  });

  const { data: niches } = useQuery({
    queryKey: ["journey-niches"],
    queryFn: async () => {
      const { data, error } = await lf
        .from("journey_templates")
        .select("niche")
        .not("niche", "is", null);
      if (error) throw error;
      return [...new Set(data.map((item) => item.niche))];
    },
  });

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Jornadas</h1>
          <p className="text-neutral-600">
            Gerencie templates e instâncias de jornada
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => navigate("/jornadas/designer")}
        >
          <Plus className="w-4 h-4" />
          Novo Template
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
          <Input
            placeholder="Buscar jornadas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedNiche} onValueChange={setSelectedNiche}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por área" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as áreas</SelectItem>
            {niches?.map((niche) => (
              <SelectItem key={niche} value={niche}>
                {niche}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="modelos">Modelos</TabsTrigger>
          <TabsTrigger value="instancias">Instâncias</TabsTrigger>
        </TabsList>

        <TabsContent value="modelos" className="space-y-6">
          {templatesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-neutral-200 rounded w-3/4"></div>
                    <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-neutral-200 rounded"></div>
                      <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onRefresh={() => refetchTemplates()}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Nenhum template encontrado
              </h3>
              <p className="text-neutral-600 mb-4">
                {searchTerm || selectedNiche !== "all"
                  ? "Tente ajustar os filtros de busca."
                  : "Comece criando seu primeiro template de jornada."}
              </p>
              <Button onClick={() => navigate("/jornadas/designer")}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Template
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="instancias" className="space-y-6">
          {instancesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-neutral-200 rounded w-3/4"></div>
                    <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-neutral-200 rounded"></div>
                      <div className="h-4 bg-neutral-200 rounded w-5/6"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : instances && instances.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {instances.map((instance) => (
                <InstanceCard key={instance.id} instance={instance} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Nenhuma instância ativa
              </h3>
              <p className="text-neutral-600 mb-4">
                Inicie uma jornada a partir de um template para começar.
              </p>
              <Button onClick={() => setActiveTab("modelos")}>
                <Target className="w-4 h-4 mr-2" />
                Ver Templates
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
