/**
 * Deals Management - Flow C9
 * Freshsales-like deal management with Kanban and grid views
 * Behavior Goal: opportunities until "won"
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Search,
  Plus,
  Filter,
  Grid3X3,
  Kanban,
  MoreHorizontal,
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  ChevronDown,
  SortAsc,
  SortDesc,
  Eye,
  Edit,
  Trash2,
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
  Deal,
  Pipeline,
  PipelineStage,
  DealFilters,
  DealStats,
  calculateDealStats,
  sortDeals,
  filterDeals,
  groupDealsByStage,
  formatCurrency,
  formatProbability,
  getDealStatusColor,
  getStageColor,
  formatRelativeTime,
  isDealOverdue,
  getDaysUntilClose,
  calculateWeightedValue,
} from "../lib/deals-utils";

interface DealsC9Props {
  userType?: "advogado" | "cliente";
}

export default function DealsC9({ userType = "advogado" }: DealsC9Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
  const [selectedPipeline, setSelectedPipeline] = useState<string>("");
  const [filters, setFilters] = useState<DealFilters>({});
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);

  // Fetch pipelines
  const { data: pipelines = [], isLoading: pipelinesLoading } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      const mockPipelines: Pipeline[] = [
        {
          id: "1",
          name: "Vendas Principal",
          description: "Pipeline principal de vendas",
          is_default: true,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          name: "Consultoria",
          description: "Pipeline de serviços de consultoria",
          is_default: false,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];
      return mockPipelines;
    },
  });

  // Fetch pipeline stages
  const { data: stages = [], isLoading: stagesLoading } = useQuery({
    queryKey: ["pipeline-stages", selectedPipeline],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      const mockStages: PipelineStage[] = [
        {
          id: "1",
          name: "Lead Qualificado",
          position: 1,
          probability: 10,
          pipeline_id: selectedPipeline || "1",
          color: "#3B82F6",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          name: "Proposta Enviada",
          position: 2,
          probability: 25,
          pipeline_id: selectedPipeline || "1",
          color: "#8B5CF6",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "3",
          name: "Negociação",
          position: 3,
          probability: 50,
          pipeline_id: selectedPipeline || "1",
          color: "#F59E0B",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "4",
          name: "Fechamento",
          position: 4,
          probability: 75,
          pipeline_id: selectedPipeline || "1",
          color: "#10B981",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "5",
          name: "Ganho",
          position: 5,
          probability: 100,
          pipeline_id: selectedPipeline || "1",
          color: "#059669",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];
      return mockStages;
    },
    enabled: !!selectedPipeline,
  });

  // Fetch deals
  const { data: allDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ["deals", selectedPipeline],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      const mockDeals: Deal[] = [
        {
          id: "1",
          title: "Consultoria Trabalhista - Empresa XYZ",
          value: 15000,
          currency: "BRL",
          probability: 25,
          expected_close_date: "2024-02-15",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-10T00:00:00Z",
          stage_id: "2",
          pipeline_id: selectedPipeline || "1",
          contact_id: "contact-1",
          company_id: "company-1",
          owner_id: "user-1",
          tags: ["trabalhista", "consultoria"],
          notes:
            "Cliente interessado em consultoria trabalhista para implementação de novo RH",
          status: "open",
          custom_fields: {},
          activities_count: 5,
          last_activity_at: "2024-01-08T00:00:00Z",
        },
        {
          id: "2",
          title: "Processo Cível - João Silva",
          value: 8000,
          currency: "BRL",
          probability: 75,
          expected_close_date: "2024-01-25",
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-12T00:00:00Z",
          stage_id: "4",
          pipeline_id: selectedPipeline || "1",
          contact_id: "contact-2",
          owner_id: "user-1",
          tags: ["civel", "processo"],
          notes: "Processo de indenização por danos morais",
          status: "open",
          custom_fields: {},
          activities_count: 8,
          last_activity_at: "2024-01-12T00:00:00Z",
        },
        {
          id: "3",
          title: "Abertura de Empresa - StartupTech",
          value: 5000,
          currency: "BRL",
          probability: 100,
          expected_close_date: "2024-01-20",
          created_at: "2023-12-15T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
          stage_id: "5",
          pipeline_id: selectedPipeline || "1",
          contact_id: "contact-3",
          company_id: "company-2",
          owner_id: "user-2",
          tags: ["empresarial", "startup"],
          notes: "Abertura de empresa de tecnologia",
          status: "won",
          won_at: "2024-01-15T00:00:00Z",
          custom_fields: {},
          activities_count: 12,
          last_activity_at: "2024-01-15T00:00:00Z",
        },
      ];
      return mockDeals;
    },
    enabled: !!selectedPipeline,
  });

  // Initialize with first pipeline
  useEffect(() => {
    if (pipelines.length > 0 && !selectedPipeline) {
      const defaultPipeline =
        pipelines.find((p) => p.is_default) || pipelines[0];
      setSelectedPipeline(defaultPipeline.id);
    }
  }, [pipelines, selectedPipeline]);

  // Process deals with filters and sorting
  const filteredDeals = filterDeals(allDeals, filters);
  const sortedDeals = sortDeals(filteredDeals, sortBy, sortOrder);
  const dealStats = calculateDealStats(sortedDeals);
  const dealsByStage = groupDealsByStage(sortedDeals, stages);

  // Drag and drop handler for Kanban
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    // Move deal to new stage
    const dealId = draggableId;
    const newStageId = destination.droppableId;

    // Update deal stage (mock - replace with actual API call)
    toast({
      title: "Deal atualizado",
      description: "Deal movido para novo estágio com sucesso",
    });
  };

  // Deal actions
  const handleViewDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setShowDetailModal(true);
  };

  const handleEditDeal = (deal: Deal) => {
    setSelectedDeal(deal);
    setShowDetailModal(true);
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (confirm("Tem certeza que deseja excluir este deal?")) {
      // Mock delete - replace with actual API call
      toast({
        title: "Deal excluído",
        description: "Deal foi excluído com sucesso",
      });
    }
  };

  const renderKanbanView = () => (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-6 overflow-x-auto pb-4">
        {stages
          .sort((a, b) => a.position - b.position)
          .map((stage) => (
            <div key={stage.id} className="flex-shrink-0 w-80">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getStageColor(stage) }}
                    />
                    <h3 className="font-medium text-gray-900">{stage.name}</h3>
                    <Badge variant="secondary">
                      {dealsByStage[stage.id]?.length || 0}
                    </Badge>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatProbability(stage.probability)}
                  </span>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-3 min-h-[200px] ${
                        snapshot.isDraggingOver ? "bg-blue-50" : ""
                      }`}
                    >
                      {dealsByStage[stage.id]?.map((deal, index) => (
                        <Draggable
                          key={deal.id}
                          draggableId={deal.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`cursor-pointer hover:shadow-md transition-shadow ${
                                snapshot.isDragging ? "shadow-lg" : ""
                              }`}
                              onClick={() => handleViewDeal(deal)}
                            >
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between">
                                    <h4 className="font-medium text-sm line-clamp-2">
                                      {deal.title}
                                    </h4>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 w-8 p-0"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => handleViewDeal(deal)}
                                        >
                                          <Eye className="mr-2 h-4 w-4" />
                                          Visualizar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => handleEditDeal(deal)}
                                        >
                                          <Edit className="mr-2 h-4 w-4" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleDeleteDeal(deal.id)
                                          }
                                          className="text-red-600"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-green-600">
                                      {formatCurrency(deal.value)}
                                    </span>
                                    <Badge
                                      variant={
                                        isDealOverdue(deal)
                                          ? "destructive"
                                          : "outline"
                                      }
                                    >
                                      {formatProbability(deal.probability)}
                                    </Badge>
                                  </div>

                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>
                                      {formatRelativeTime(deal.updated_at)}
                                    </span>
                                    <span>
                                      {getDaysUntilClose(deal) > 0
                                        ? `${getDaysUntilClose(deal)} dias`
                                        : isDealOverdue(deal)
                                          ? "Atrasado"
                                          : "Hoje"}
                                    </span>
                                  </div>

                                  {deal.tags.length > 0 && (
                                    <div className="flex gap-1 flex-wrap">
                                      {deal.tags.slice(0, 2).map((tag) => (
                                        <Badge
                                          key={tag}
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {tag}
                                        </Badge>
                                      ))}
                                      {deal.tags.length > 2 && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          +{deal.tags.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
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
              </div>
            </div>
          ))}
      </div>
    </DragDropContext>
  );

  const renderGridView = () => (
    <div className="space-y-4">
      {sortedDeals.map((deal) => (
        <Card
          key={deal.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-lg">{deal.title}</h3>
                  <div className="flex items-center gap-2">
                    <Badge className={getDealStatusColor(deal.status)}>
                      {deal.status === "won"
                        ? "Ganho"
                        : deal.status === "lost"
                          ? "Perdido"
                          : "Aberto"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDeal(deal)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditDeal(deal)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteDeal(deal.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Valor:</span>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(deal.value)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Probabilidade:</span>
                    <div className="font-medium">
                      {formatProbability(deal.probability)}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Fechamento:</span>
                    <div
                      className={`font-medium ${isDealOverdue(deal) ? "text-red-600" : ""}`}
                    >
                      {new Date(deal.expected_close_date).toLocaleDateString(
                        "pt-BR",
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500">Estágio:</span>
                    <div className="font-medium">
                      {stages.find((s) => s.id === deal.stage_id)?.name ||
                        "N/A"}
                    </div>
                  </div>
                </div>

                {deal.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {deal.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (pipelinesLoading || stagesLoading || dealsLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-gray-600">Gerencie suas oportunidades de vendas</p>
        </div>
        <Button onClick={() => setShowDetailModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Deal
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dealStats.total_value)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dealStats.total_deals} deals em andamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Ganho</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(dealStats.won_value)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dealStats.won_deals} deals fechados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Conversão
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatProbability(dealStats.conversion_rate)}
            </div>
            <p className="text-xs text-muted-foreground">Média de fechamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dealStats.avg_deal_value)}
            </div>
            <p className="text-xs text-muted-foreground">Por deal fechado</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar deals..."
              value={filters.search || ""}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="pl-10"
            />
          </div>

          <Select value={selectedPipeline} onValueChange={setSelectedPipeline}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Selecionar pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem>Status: Todos</DropdownMenuItem>
              <DropdownMenuItem>Status: Aberto</DropdownMenuItem>
              <DropdownMenuItem>Status: Ganho</DropdownMenuItem>
              <DropdownMenuItem>Status: Perdido</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {sortOrder === "asc" ? (
                  <SortAsc className="mr-2 h-4 w-4" />
                ) : (
                  <SortDesc className="mr-2 h-4 w-4" />
                )}
                Ordenar
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("created_at")}>
                Data de Criação
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("value")}>
                Valor
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("probability")}>
                Probabilidade
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("expected_close_date")}
              >
                Data de Fechamento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("kanban")}
              className="rounded-r-none"
            >
              <Kanban className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="rounded-l-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Views */}
      {viewMode === "kanban" ? renderKanbanView() : renderGridView()}
    </div>
  );
}
