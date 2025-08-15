import React, { useState } from "react";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  User,
  Users,
  Clock,
  AlertTriangle,
  Target,
  MessageSquare,
  Edit,
  Trash2,
  MoreHorizontal,
  ArrowRight,
  CheckCircle,
  XCircle,
  Pause,
  Play,
  FileText,
  Building,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatDate } from "../lib/utils";
import { ActivityDetailModal } from "../components/ActivityDetailModal";

interface Activity {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done" | "blocked";
  priority: "baixa" | "media" | "alta" | "urgente";
  due_at?: string;
  assigned_oab?: number;
  cliente_cpfcnpj?: string;
  numero_cnj?: string;
  ticket_id?: string;
  deal_id?: string;
  stage_instance_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;

  // Joined data
  cliente_nome?: string;
  advogado_nome?: string;
  comment_count?: number;
}

interface ActivityForm {
  title: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  due_at?: string;
  assigned_oab?: string;
  cliente_cpfcnpj?: string;
  numero_cnj?: string;
  description: string;
}

const STATUS_CONFIG = {
  todo: {
    label: "A Fazer",
    color: "bg-gray-100 text-gray-800",
    icon: <Clock className="h-4 w-4" />,
  },
  in_progress: {
    label: "Em Andamento",
    color: "bg-blue-100 text-blue-800",
    icon: <Play className="h-4 w-4" />,
  },
  done: {
    label: "Concluído",
    color: "bg-green-100 text-green-800",
    icon: <CheckCircle className="h-4 w-4" />,
  },
  blocked: {
    label: "Bloqueado",
    color: "bg-red-100 text-red-800",
    icon: <XCircle className="h-4 w-4" />,
  },
};

const PRIORITY_CONFIG = {
  baixa: {
    label: "Baixa",
    color: "bg-gray-100 text-gray-800",
    icon: <Target className="h-3 w-3" />,
  },
  media: {
    label: "Média",
    color: "bg-yellow-100 text-yellow-800",
    icon: <Target className="h-3 w-3" />,
  },
  alta: {
    label: "Alta",
    color: "bg-orange-100 text-orange-800",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  urgente: {
    label: "Urgente",
    color: "bg-red-100 text-red-800",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

export default function ActivitiesC8() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"list" | "kanban">("list");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [activityForm, setActivityForm] = useState<ActivityForm>({
    title: "",
    priority: "media",
    due_at: "",
    assigned_oab: "",
    cliente_cpfcnpj: "",
    numero_cnj: "",
    description: "",
  });

  // Queries
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["activities", searchTerm, statusFilter, priorityFilter, assigneeFilter],
    queryFn: async () => {
      let query = lf
        .from("activities")
        .select(`
          *,
          clientes:cliente_cpfcnpj(nome),
          advogados:assigned_oab(nome)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,cliente_cpfcnpj.ilike.%${searchTerm}%,numero_cnj.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (priorityFilter !== "all") {
        query = query.eq("priority", priorityFilter);
      }

      if (assigneeFilter !== "all") {
        query = query.eq("assigned_oab", assigneeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get comment counts
      const activitiesWithCounts = await Promise.all(
        (data || []).map(async (activity) => {
          const { count } = await lf
            .from("activity_comments")
            .select("*", { count: "exact" })
            .eq("activity_id", activity.id);

          return {
            ...activity,
            cliente_nome: activity.clientes?.nome,
            advogado_nome: activity.advogados?.nome,
            comment_count: count || 0,
          };
        })
      );

      return activitiesWithCounts;
    },
  });

  const { data: advogados = [] } = useQuery({
    queryKey: ["advogados-for-activities"],
    queryFn: async () => {
      const { data, error } = await lf
        .from("advogados")
        .select("oab, nome")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  // Mutations
  const createActivityMutation = useMutation({
    mutationFn: async (form: ActivityForm) => {
      const { data, error } = await lf
        .from("activities")
        .insert({
          title: form.title,
          priority: form.priority,
          due_at: form.due_at || null,
          assigned_oab: form.assigned_oab ? parseInt(form.assigned_oab) : null,
          cliente_cpfcnpj: form.cliente_cpfcnpj || null,
          numero_cnj: form.numero_cnj || null,
          created_by: "current-user", // TODO: Get from auth context
        })
        .select()
        .single();

      if (error) throw error;

      // Add initial comment if description provided
      if (form.description) {
        await lf.from("activity_comments").insert({
          activity_id: data.id,
          author_id: "current-user",
          body: form.description,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsCreateOpen(false);
      setActivityForm({
        title: "",
        priority: "media",
        due_at: "",
        assigned_oab: "",
        cliente_cpfcnpj: "",
        numero_cnj: "",
        description: "",
      });
      toast({
        title: "Atividade criada com sucesso!",
        description: "A tarefa foi adicionada à lista.",
      });
    },
    onError: (error) => {
      console.error("Create activity error:", error);
      toast({
        title: "Erro ao criar atividade",
        description: "Não foi possível criar a tarefa.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await lf
        .from("activities")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
    },
  });

  const deleteActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await lf
        .from("activities")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast({
        title: "Atividade excluída",
        description: "A tarefa foi removida da lista.",
      });
    },
  });

  // Handlers
  const handleCreateActivity = () => {
    if (!activityForm.title) {
      toast({
        title: "Título obrigatório",
        description: "Digite um título para a atividade.",
        variant: "destructive",
      });
      return;
    }

    createActivityMutation.mutate(activityForm);
  };

  const handleViewActivity = (activity: Activity) => {
    setSelectedActivity(activity);
    setIsDetailOpen(true);
  };

  const getStatusColor = (status: string) => {
    return STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || "bg-gray-100 text-gray-800";
  };

  const getPriorityColor = (priority: string) => {
    return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]?.color || "bg-gray-100 text-gray-800";
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const getDueStatus = (dueDate?: string, status?: string) => {
    if (!dueDate || status === "done") return null;
    
    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) {
      return { text: "Atrasado", color: "text-red-600", urgent: true };
    } else if (diffHours < 24) {
      return { text: "Vence hoje", color: "text-orange-600", urgent: true };
    } else if (diffHours < 72) {
      return { text: "Vence em breve", color: "text-yellow-600", urgent: false };
    }
    
    return null;
  };

  // Group activities by status for kanban view
  const groupedActivities = activities.reduce((acc, activity) => {
    if (!acc[activity.status]) {
      acc[activity.status] = [];
    }
    acc[activity.status].push(activity);
    return acc;
  }, {} as Record<string, Activity[]>);

  const filteredActivities = activities.filter(activity => {
    if (statusFilter !== "all" && activity.status !== statusFilter) return false;
    if (priorityFilter !== "all" && activity.priority !== priorityFilter) return false;
    if (assigneeFilter !== "all" && activity.assigned_oab?.toString() !== assigneeFilter) return false;
    return true;
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            ✓ Atividades & Tarefas
          </h1>
          <p className="text-gray-600 mt-1">
            Gestão de tarefas com prazo e responsável - ClickUp-like
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === "list" ? "kanban" : "list")}
          >
            {viewMode === "list" ? "📋 Lista" : "📊 Kanban"}
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Atividade
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar atividades (título, cliente, CNJ)..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="todo">A Fazer</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="done">Concluído</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {advogados.map((adv) => (
                  <SelectItem key={adv.oab} value={adv.oab.toString()}>
                    {adv.nome} (OAB {adv.oab})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === "list" ? (
        /* List View */
        <Card>
          <CardHeader>
            <CardTitle>Atividades ({filteredActivities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg"
                  >
                    <div className="h-12 w-12 bg-gray-200 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredActivities.length > 0 ? (
              <div className="space-y-4">
                {filteredActivities.map((activity) => {
                  const dueStatus = getDueStatus(activity.due_at, activity.status);
                  const statusConfig = STATUS_CONFIG[activity.status];
                  const priorityConfig = PRIORITY_CONFIG[activity.priority];

                  return (
                    <div
                      key={activity.id}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewActivity(activity)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {statusConfig.icon}
                            <h3 className="font-medium">{activity.title}</h3>
                            <Badge className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                            <Badge className={priorityConfig.color}>
                              {priorityConfig.icon}
                              <span className="ml-1">{priorityConfig.label}</span>
                            </Badge>
                            {dueStatus && (
                              <Badge variant="destructive">
                                {dueStatus.text}
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            {activity.due_at && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(activity.due_at)}</span>
                              </div>
                            )}
                            {activity.advogado_nome && (
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>{activity.advogado_nome}</span>
                              </div>
                            )}
                            {activity.cliente_nome && (
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{activity.cliente_nome}</span>
                              </div>
                            )}
                            {activity.numero_cnj && (
                              <div className="flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                <span>{activity.numero_cnj}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-4 w-4" />
                              <span>{activity.comment_count} comentários</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Criado em {formatDate(activity.created_at)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {activity.status !== "done" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({
                                  id: activity.id,
                                  status: "done"
                                });
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({
                                    id: activity.id,
                                    status: "in_progress"
                                  });
                                }}
                              >
                                <Play className="mr-2 h-4 w-4" />
                                Iniciar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatusMutation.mutate({
                                    id: activity.id,
                                    status: "blocked"
                                  });
                                }}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                Bloquear
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteActivityMutation.mutate(activity.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button variant="ghost" size="sm">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">
                  Nenhuma atividade encontrada
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                    ? "Tente ajustar os filtros de busca"
                    : "Crie a primeira atividade"}
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Atividade
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Kanban View */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => (
            <Card key={status}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {config.icon}
                  {config.label}
                  <Badge variant="outline">
                    {groupedActivities[status]?.length || 0}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(groupedActivities[status] || []).map((activity) => {
                  const dueStatus = getDueStatus(activity.due_at, activity.status);
                  const priorityConfig = PRIORITY_CONFIG[activity.priority];

                  return (
                    <div
                      key={activity.id}
                      className="p-3 border rounded-lg bg-white hover:shadow-sm cursor-pointer"
                      onClick={() => handleViewActivity(activity)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm line-clamp-2">
                          {activity.title}
                        </h4>
                        <Badge className={priorityConfig.color} variant="outline">
                          {priorityConfig.icon}
                        </Badge>
                      </div>
                      
                      {activity.due_at && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(activity.due_at)}</span>
                          {dueStatus && (
                            <Badge variant="destructive" className="text-xs">
                              {dueStatus.text}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span>{activity.comment_count}</span>
                        </div>
                        {activity.advogado_nome && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{activity.advogado_nome.split(' ')[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Activity Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Atividade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={activityForm.title}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, title: e.target.value })
                }
                placeholder="Título da atividade"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={activityForm.priority}
                  onValueChange={(value) =>
                    setActivityForm({ ...activityForm, priority: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="due_at">Vence em</Label>
                <Input
                  id="due_at"
                  type="datetime-local"
                  value={activityForm.due_at}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, due_at: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assigned_oab">Responsável (OAB)</Label>
                <Select
                  value={activityForm.assigned_oab}
                  onValueChange={(value) =>
                    setActivityForm({ ...activityForm, assigned_oab: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {advogados.map((adv) => (
                      <SelectItem key={adv.oab} value={adv.oab.toString()}>
                        {adv.nome} (OAB {adv.oab})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cliente_cpfcnpj">Cliente (CPF/CNPJ)</Label>
                <Input
                  id="cliente_cpfcnpj"
                  value={activityForm.cliente_cpfcnpj}
                  onChange={(e) =>
                    setActivityForm({ ...activityForm, cliente_cpfcnpj: e.target.value })
                  }
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="numero_cnj">Processo (CNJ)</Label>
              <Input
                id="numero_cnj"
                value={activityForm.numero_cnj}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, numero_cnj: e.target.value })
                }
                placeholder="0000000-00.0000.0.00.0000"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={activityForm.description}
                onChange={(e) =>
                  setActivityForm({ ...activityForm, description: e.target.value })
                }
                placeholder="Descreva a atividade..."
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateActivity}
                disabled={createActivityMutation.isPending}
              >
                {createActivityMutation.isPending ? "Criando..." : "Criar Atividade"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedActivity(null);
          }}
        />
      )}
    </div>
  );
}
