/**
 * Journey Library - Flow D1
 * Behavior Goal: standardize flows by niche
 * Templates (cards: name, area, stage count, ETA) and Instances with CRUD and drag&drop ordering
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Plus,
  Search,
  Filter,
  Grid3X3,
  List,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Play,
  Eye,
  ChevronDown,
  Calendar,
  Users,
  Clock,
  Target,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useToast } from "../hooks/use-toast";
import {
  JourneyTemplate,
  JourneyInstance,
  JourneyTemplateStage,
  JourneyFilters,
  JourneyStats,
  calculateJourneyStats,
  sortJourneys,
  filterJourneys,
  getJourneyStatusColor,
  formatRelativeTime,
  calculateProgress,
  calculateNextAction,
  DEFAULT_STAGE_TYPES,
} from "../lib/journey-utils";

interface JourneysD1Props {
  userType?: "advogado" | "cliente";
}

export default function JourneysD1({ userType = "advogado" }: JourneysD1Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States
  const [activeTab, setActiveTab] = useState<"templates" | "instances">(
    "templates",
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filters, setFilters] = useState<JourneyFilters>({});
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedTemplate, setSelectedTemplate] =
    useState<JourneyTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInstanceModal, setShowInstanceModal] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<JourneyTemplate | null>(null);

  // Fetch templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["journey-templates"],
    queryFn: async () => {
      // Mock data - replace with actual API call
      const mockTemplates: JourneyTemplate[] = [
        {
          id: "1",
          name: "Abertura de Empresa",
          description: "Processo completo para abertura de empresa",
          area: "Empresarial",
          category: "Constituição",
          stage_count: 8,
          estimated_duration_days: 45,
          is_active: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-10T00:00:00Z",
          created_by: "user-1",
          tags: ["empresarial", "abertura", "cnpj"],
        },
        {
          id: "2",
          name: "Processo Trabalhista",
          description: "Fluxo padrão para processos trabalhistas",
          area: "Trabalhista",
          category: "Contencioso",
          stage_count: 12,
          estimated_duration_days: 90,
          is_active: true,
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
          created_by: "user-1",
          tags: ["trabalhista", "processo", "tst"],
        },
        {
          id: "3",
          name: "Divórcio Consensual",
          description: "Procedimento para divórcio consensual",
          area: "Família",
          category: "Divórcio",
          stage_count: 6,
          estimated_duration_days: 30,
          is_active: true,
          created_at: "2024-01-03T00:00:00Z",
          updated_at: "2024-01-20T00:00:00Z",
          created_by: "user-2",
          tags: ["familia", "divorcio", "consensual"],
        },
      ];
      return mockTemplates;
    },
  });

  // Fetch template stages for ordering
  const { data: templateStages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ["template-stages", selectedTemplate?.id],
    queryFn: async () => {
      if (!selectedTemplate) return [];
      // Mock data - replace with actual API call
      const mockStages: JourneyTemplateStage[] = [
        {
          id: "1",
          template_id: selectedTemplate.id,
          stage_type_id: "form",
          title: "Coleta de Dados Iniciais",
          description: "Formulário com dados básicos da empresa",
          order_index: 1,
          is_mandatory: true,
          sla_days: 3,
          config: { fields: ["nome", "cnae", "endereco"] },
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          template_id: selectedTemplate.id,
          stage_type_id: "upload",
          title: "Documentos dos Sócios",
          description: "Upload de RG, CPF e comprovante de residência",
          order_index: 2,
          is_mandatory: true,
          sla_days: 5,
          config: { allowed_types: ["pdf", "jpg"], max_files: 10 },
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "3",
          template_id: selectedTemplate.id,
          stage_type_id: "task",
          title: "Elaboração do Contrato Social",
          description: "Redação e revisão do contrato social",
          order_index: 3,
          is_mandatory: true,
          sla_days: 7,
          config: { assignee: "advogado", priority: "high" },
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];
      return mockStages;
    },
    enabled: !!selectedTemplate,
  });

  // Fetch instances
  const { data: instances = [], isLoading: instancesLoading } = useQuery({
    queryKey: ["journey-instances"],
    queryFn: async () => {
      // Mock data - replace with actual API call
      const mockInstances: JourneyInstance[] = [
        {
          id: "1",
          template_id: "1",
          template_name: "Abertura de Empresa",
          client_cpf_cnpj: "12.345.678/0001-90",
          client_name: "Tech Solutions Ltda",
          numero_cnj: "5001234-56.2024.8.01.0001",
          responsible_oab: "SP123456",
          responsible_name: "Dr. João Silva",
          status: "active",
          progress_pct: 65,
          next_action: "📤 Documentos dos Sócios",
          next_action_stage_id: "2",
          started_at: "2024-01-15T00:00:00Z",
          created_at: "2024-01-15T00:00:00Z",
          updated_at: "2024-01-20T00:00:00Z",
        },
        {
          id: "2",
          template_id: "2",
          template_name: "Processo Trabalhista",
          client_cpf_cnpj: "987.654.321-00",
          client_name: "Maria Santos",
          numero_cnj: "5007890-12.2024.5.02.0001",
          responsible_oab: "SP789012",
          responsible_name: "Dra. Ana Costa",
          status: "active",
          progress_pct: 30,
          next_action: "📝 Coleta de Provas",
          next_action_stage_id: "4",
          started_at: "2024-01-10T00:00:00Z",
          created_at: "2024-01-10T00:00:00Z",
          updated_at: "2024-01-18T00:00:00Z",
        },
      ];
      return mockInstances;
    },
  });

  // Calculate stats
  const journeyStats = calculateJourneyStats(instances, []);

  // Filter and sort
  const filteredInstances = filterJourneys(instances, filters);
  const sortedInstances = sortJourneys(filteredInstances, sortBy, sortOrder);

  // Drag and drop for template stages
  const handleDragEnd = (result: any) => {
    if (!result.destination || !selectedTemplate) return;

    const newStages = Array.from(templateStages);
    const [reorderedStage] = newStages.splice(result.source.index, 1);
    newStages.splice(result.destination.index, 0, reorderedStage);

    // Update order_index for all stages
    const updatedStages = newStages.map((stage, index) => ({
      ...stage,
      order_index: index + 1,
    }));

    // Mock update - replace with actual API call
    toast({
      title: "Ordem atualizada",
      description: "Ordem das etapas foi atualizada com sucesso",
    });
  };

  // Template actions
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template: JourneyTemplate) => {
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (confirm("Tem certeza que deseja excluir este template?")) {
      // Mock delete - replace with actual API call
      toast({
        title: "Template excluído",
        description: "Template foi excluído com sucesso",
      });
    }
  };

  const handleDuplicateTemplate = async (template: JourneyTemplate) => {
    // Mock duplicate - replace with actual API call
    toast({
      title: "Template duplicado",
      description: `Template "${template.name}" foi duplicado com sucesso`,
    });
  };

  const handleStartJourney = (template: JourneyTemplate) => {
    setSelectedTemplate(template);
    setShowInstanceModal(true);
  };

  // Render template card
  const renderTemplateCard = (template: JourneyTemplate) => (
    <Card key={template.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{template.name}</CardTitle>
            <p className="text-sm text-gray-600 mb-2">{template.description}</p>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{template.area}</Badge>
              <Badge variant="secondary">{template.category}</Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedTemplate(template)}>
                <Eye className="mr-2 h-4 w-4" />
                Visualizar Etapas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStartJourney(template)}>
                <Play className="mr-2 h-4 w-4" />
                Iniciar Jornada
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDuplicateTemplate(template)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => handleDeleteTemplate(template.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-blue-600">
              {template.stage_count}
            </div>
            <div className="text-gray-500">Etapas</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-green-600">
              {template.estimated_duration_days}
            </div>
            <div className="text-gray-500">Dias</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-purple-600">
              {template.tags.length}
            </div>
            <div className="text-gray-500">Tags</div>
          </div>
        </div>

        {template.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap mt-3">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
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
      </CardContent>
    </Card>
  );

  // Render instance card
  const renderInstanceCard = (instance: JourneyInstance) => (
    <Card key={instance.id} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">
              {instance.client_name}
            </CardTitle>
            <p className="text-sm text-gray-600 mb-2">
              {instance.template_name}
            </p>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getJourneyStatusColor(instance.status)}>
                {instance.status === "active"
                  ? "Ativo"
                  : instance.status === "completed"
                    ? "Concluído"
                    : instance.status === "on_hold"
                      ? "Pausado"
                      : "Cancelado"}
              </Badge>
              <span className="text-xs text-gray-500">
                {formatRelativeTime(instance.updated_at)}
              </span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Progresso</span>
              <span>{instance.progress_pct}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${instance.progress_pct}%` }}
              />
            </div>
          </div>

          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-xs text-blue-600 font-medium mb-1">
              Próxima Ação
            </div>
            <div className="text-sm font-medium">{instance.next_action}</div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
            <div>
              <span className="font-medium">Responsável:</span>
              <br />
              {instance.responsible_name}
            </div>
            <div>
              <span className="font-medium">Iniciado:</span>
              <br />
              {new Date(instance.started_at).toLocaleDateString("pt-BR")}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (templatesLoading || instancesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Biblioteca de Jornadas
          </h1>
          <p className="text-gray-600">
            Gerencie templates e instâncias de jornadas
          </p>
        </div>
        <Button onClick={handleCreateTemplate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Templates Ativos
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {templates.filter((t) => t.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">
              {templates.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Instâncias Ativas
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {journeyStats.active_instances}
            </div>
            <p className="text-xs text-muted-foreground">
              {journeyStats.total_instances} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Conclusão
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(journeyStats.completion_rate)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {journeyStats.completed_instances} concluídas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(journeyStats.avg_completion_days)}
            </div>
            <p className="text-xs text-muted-foreground">dias para conclusão</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Controls */}
      <Tabs
        value={activeTab}
        onValueChange={(value: any) => setActiveTab(value)}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="instances">Instâncias</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={filters.search || ""}
                onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                }
                className="pl-10 w-64"
              />
            </div>

            {/* View toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <TabsContent value="templates" className="mt-6">
          <div
            className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}
          >
            {templates.map(renderTemplateCard)}
          </div>
        </TabsContent>

        <TabsContent value="instances" className="mt-6">
          <div
            className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}
          >
            {sortedInstances.map(renderInstanceCard)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Stages Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                Etapas: {selectedTemplate.name}
              </h2>
              <Button variant="ghost" onClick={() => setSelectedTemplate(null)}>
                ✕
              </Button>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="stages">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="space-y-3"
                  >
                    {templateStages
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((stage, index) => (
                        <Draggable
                          key={stage.id}
                          draggableId={stage.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`${snapshot.isDragging ? "shadow-lg" : ""}`}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="text-lg">
                                    {DEFAULT_STAGE_TYPES.find(
                                      (t) => t.id === stage.stage_type_id,
                                    )?.icon || "📋"}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-medium">
                                      {stage.title}
                                    </h4>
                                    <p className="text-sm text-gray-600">
                                      {stage.description}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge
                                        variant={
                                          stage.is_mandatory
                                            ? "default"
                                            : "secondary"
                                        }
                                        className="text-xs"
                                      >
                                        {stage.is_mandatory
                                          ? "Obrigatório"
                                          : "Opcional"}
                                      </Badge>
                                      <span className="text-xs text-gray-500">
                                        SLA: {stage.sla_days} dias
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-400">
                                    #{stage.order_index}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      )}
    </div>
  );
}
