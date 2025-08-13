import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Search,
  Plus,
  Filter,
  Clock,
  User,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Eye,
  Calendar,
  Users,
  FileText,
  Building,
  PlayCircle,
  CheckCircle2,
  Send,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf, supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";

interface Activity {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_at: string | null;
  assigned_oab: number | null;
  cliente_cpfcnpj: string | null;
  numero_cnj: string | null;
  ticket_id: string | null;
  deal_id: string | null;
  stage_instance_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  cliente_nome?: string;
  responsavel_nome?: string;
  comments_count?: number;
}

interface ActivityComment {
  id: string;
  activity_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

interface ActivityFormData {
  title: string;
  due_at: string;
  assigned_oab: string;
  cliente_cpfcnpj: string;
  numero_cnj: string;
  priority: string;
}

export function Activities() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterPriority, setFilterPriority] = useState("todos");
  const [filterAssigned, setFilterAssigned] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const itemsPerPage = 25; // P2.8 - Padrão 25/pg conforme spec

  // P2.8 - Buscar activities
  const {
    data: activitiesData = { data: [], total: 0, totalPages: 0 },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["activities", searchTerm, filterStatus, filterPriority, filterAssigned, currentPage],
    queryFn: async () => {
      let query = lf
        .from("activities")
        .select(`
          *,
          clientes:public.clientes!activities_cliente_cpfcnpj_fkey (
            nome
          ),
          advogados:public.advogados!activities_assigned_oab_fkey (
            nome
          )
        `, { count: "exact" })
        .order("created_at", { ascending: false });

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,cliente_cpfcnpj.ilike.%${searchTerm}%,numero_cnj.ilike.%${searchTerm}%`);
      }

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }

      if (filterPriority !== "todos") {
        query = query.eq("priority", filterPriority);
      }

      if (filterAssigned !== "todos") {
        if (filterAssigned === "nao-atribuido") {
          query = query.is("assigned_oab", null);
        } else {
          query = query.eq("assigned_oab", parseInt(filterAssigned));
        }
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const { data, error, count } = await query
        .range(startIndex, startIndex + itemsPerPage - 1);

      if (error) throw error;

      // Buscar contagem de comentários para cada activity
      const activitiesWithComments = await Promise.all(
        (data || []).map(async (activity: any) => {
          const { count: commentsCount } = await lf
            .from("activity_comments")
            .select("*", { count: "exact", head: true })
            .eq("activity_id", activity.id);

          return {
            ...activity,
            cliente_nome: activity.clientes?.nome,
            responsavel_nome: activity.advogados?.nome,
            comments_count: commentsCount || 0,
          };
        })
      );

      return {
        data: activitiesWithComments,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Buscar clientes para o formulário
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("cpfcnpj, nome")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar advogados para atribuição
  const { data: advogados = [] } = useQuery({
    queryKey: ["advogados-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advogados")
        .select("oab, nome")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar processos para vincular
  const { data: processos = [] } = useQuery({
    queryKey: ["processos-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("numero_cnj")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar comentários da activity selecionada
  const {
    data: comments = [],
    isLoading: commentsLoading,
  } = useQuery({
    queryKey: ["activity-comments", selectedActivity?.id],
    queryFn: async () => {
      if (!selectedActivity?.id) return [];

      const { data, error } = await lf
        .from("activity_comments")
        .select("*")
        .eq("activity_id", selectedActivity.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedActivity?.id,
  });

  // P2.8 - Mutation para criar activity
  const activityMutation = useMutation({
    mutationFn: async (activityData: ActivityFormData) => {
      const dataToSave = {
        title: activityData.title,
        status: "todo",
        priority: activityData.priority,
        due_at: activityData.due_at ? new Date(activityData.due_at).toISOString() : null,
        assigned_oab: activityData.assigned_oab ? parseInt(activityData.assigned_oab) : null,
        cliente_cpfcnpj: activityData.cliente_cpfcnpj || null,
        numero_cnj: activityData.numero_cnj || null,
        created_by: "current_user", // TODO: Get from auth context
      };

      const { data, error } = await lf
        .from("activities")
        .insert([dataToSave])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsDialogOpen(false);
      toast({
        title: "Activity criada",
        description: "Nova tarefa criada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar activity",
        variant: "destructive",
      });
    },
  });

  // P2.8 - Mutation para mover para done
  const moveToDoneMutation = useMutation({
    mutationFn: async (activityId: string) => {
      const { data, error } = await lf
        .from("activities")
        .update({ status: "done", updated_at: new Date().toISOString() })
        .eq("id", activityId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast({
        title: "Activity concluída",
        description: "Tarefa marcada como concluída",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao concluir activity",
        variant: "destructive",
      });
    },
  });

  // P2.8 - Mutation para adicionar comentário
  const commentMutation = useMutation({
    mutationFn: async ({ activityId, body }: { activityId: string; body: string }) => {
      const { data, error } = await lf
        .from("activity_comments")
        .insert([{
          activity_id: activityId,
          author_id: "current_user", // TODO: Get from auth context
          body,
        }])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-comments"] });
      setNewComment("");
      toast({
        title: "Comentário adicionado",
        description: "Comentário adicionado à activity",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar comentário",
        variant: "destructive",
      });
    },
  });

  const handleSubmitActivity = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const activityData: ActivityFormData = {
      title: formData.get("title") as string,
      due_at: formData.get("due_at") as string,
      assigned_oab: formData.get("assigned_oab") as string,
      cliente_cpfcnpj: formData.get("cliente_cpfcnpj") as string,
      numero_cnj: formData.get("numero_cnj") as string,
      priority: formData.get("priority") as string,
    };

    activityMutation.mutate(activityData);
  };

  const handleAddComment = () => {
    if (!selectedActivity || !newComment.trim()) return;
    commentMutation.mutate({
      activityId: selectedActivity.id,
      body: newComment,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR");
  };

  const formatCNJ = (cnj: string | null) => {
    if (!cnj) return null;
    const clean = cnj.replace(/\D/g, "");
    if (clean.length === 20) {
      return clean.replace(/(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/, "$1-$2.$3.$4.$5.$6");
    }
    return cnj;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "todo": return "destructive";
      case "in_progress": return "default";
      case "done": return "secondary";
      case "blocked": return "outline";
      default: return "secondary";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "todo": return <AlertCircle className="w-4 h-4" />;
      case "in_progress": return <PlayCircle className="w-4 h-4" />;
      case "done": return <CheckCircle2 className="w-4 h-4" />;
      case "blocked": return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgente": return "destructive";
      case "alta": return "default";
      case "media": return "secondary";
      case "baixa": return "outline";
      default: return "secondary";
    }
  };

  const isOverdue = (dueAt: string | null) => {
    if (!dueAt) return false;
    return new Date(dueAt) < new Date();
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold">Activities</h1>
            <p className="text-neutral-600 mt-1">Tarefas com prazo/responsável vinculadas ao caso</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Erro ao carregar activities</h3>
              <p className="text-neutral-600 mb-4">{error.message}</p>
              <Button onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Activities</h1>
          <p className="text-neutral-600 mt-1">Tarefas com prazo/responsável vinculadas ao caso</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Activity
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmitActivity}>
              <DialogHeader>
                <DialogTitle>Nova Activity</DialogTitle>
                <DialogDescription>
                  Crie uma nova tarefa para acompanhamento
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Título *</label>
                  <Input
                    name="title"
                    placeholder="Descreva a tarefa"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Vence em</label>
                    <Input
                      name="due_at"
                      type="datetime-local"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Prioridade</label>
                    <Select name="priority" defaultValue="media">
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
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Responsável (OAB)</label>
                  <Select name="assigned_oab">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Não atribuído</SelectItem>
                      {advogados.map((advogado) => (
                        <SelectItem key={advogado.oab} value={advogado.oab.toString()}>
                          {advogado.nome} (OAB {advogado.oab})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Cliente</label>
                  <Select name="cliente_cpfcnpj">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum cliente</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={cliente.cpfcnpj} value={cliente.cpfcnpj}>
                          {cliente.nome} ({cliente.cpfcnpj})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Processo (CNJ)</label>
                  <Select name="numero_cnj">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um processo (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum processo</SelectItem>
                      {processos.map((processo) => (
                        <SelectItem key={processo.numero_cnj} value={processo.numero_cnj}>
                          {formatCNJ(processo.numero_cnj)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={activityMutation.isPending}>
                  {activityMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar Activity
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Buscar por título, cliente ou CNJ..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select
                value={filterStatus}
                onValueChange={(value) => {
                  setFilterStatus(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os status</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="done">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterPriority}
                onValueChange={(value) => {
                  setFilterPriority(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as prioridades</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterAssigned}
                onValueChange={(value) => {
                  setFilterAssigned(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os responsáveis</SelectItem>
                  <SelectItem value="nao-atribuido">Não atribuído</SelectItem>
                  {advogados.map((advogado) => (
                    <SelectItem key={advogado.oab} value={advogado.oab.toString()}>
                      {advogado.nome} (OAB {advogado.oab})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* P2.8 - Lista conforme especificação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Activities ({activitiesData.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-700)' }} />
              <span className="ml-2 text-neutral-600">Carregando activities...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Vence em</TableHead>
                  <TableHead>Responsável (OAB)</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CNJ</TableHead>
                  <TableHead>A��ões</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activitiesData.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-neutral-500">
                        <CheckCircle className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                        <p>Nenhuma activity encontrada</p>
                        <p className="text-sm">
                          Crie a primeira tarefa para organizar o trabalho
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  activitiesData.data?.map((activity) => (
                    <TableRow key={activity.id} className="hover:bg-neutral-50">
                      <TableCell>
                        <div className="font-medium max-w-64">
                          {activity.title}
                        </div>
                        {activity.comments_count > 0 && (
                          <div className="flex items-center gap-1 text-xs text-neutral-500 mt-1">
                            <MessageSquare className="w-3 h-3" />
                            {activity.comments_count} comentário{activity.comments_count !== 1 ? 's' : ''}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(activity.status)}
                          <Badge variant={getStatusColor(activity.status)}>
                            {activity.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(activity.priority)}>
                          {activity.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {activity.due_at ? (
                          <div className={`text-sm ${isOverdue(activity.due_at) ? 'text-red-600 font-medium' : 'text-neutral-600'}`}>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDateTime(activity.due_at)}
                            </div>
                            {isOverdue(activity.due_at) && (
                              <div className="text-xs text-red-500">Atrasado</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-sm">Sem prazo</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {activity.responsavel_nome ? (
                          <div className="text-sm">
                            <div className="font-medium">{activity.responsavel_nome}</div>
                            <div className="text-xs text-neutral-500">OAB {activity.assigned_oab}</div>
                          </div>
                        ) : (
                          <Badge variant="outline">Não atribuído</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {activity.cliente_nome ? (
                          <div className="text-sm">
                            <div className="font-medium truncate max-w-32">{activity.cliente_nome}</div>
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {activity.numero_cnj ? (
                          <Badge style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}>
                            {formatCNJ(activity.numero_cnj)}
                          </Badge>
                        ) : (
                          <span className="text-neutral-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedActivity(activity);
                              setIsDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          {activity.status !== "done" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => moveToDoneMutation.mutate(activity.id)}
                              style={{ color: 'var(--success)' }}
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Concluir
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {activitiesData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, activitiesData.total)} de {activitiesData.total} activities
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <span className="text-sm text-neutral-600">
              Página {currentPage} de {activitiesData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === activitiesData.totalPages}
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* P2.8 - Dialog de detalhes com comentários */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Activity</DialogTitle>
            <DialogDescription>
              {selectedActivity?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedActivity && (
            <Tabs defaultValue="comments">
              <TabsList>
                <TabsTrigger value="comments">Comentários ({comments.length})</TabsTrigger>
                <TabsTrigger value="properties">Propriedades</TabsTrigger>
              </TabsList>
              
              <TabsContent value="comments" className="space-y-4">
                {/* Lista de comentários */}
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {commentsLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-4 text-neutral-500">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                      <p>Nenhum comentário ainda</p>
                    </div>
                  ) : (
                    comments.map((comment: ActivityComment) => (
                      <div key={comment.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">Usuário</span>
                          <span className="text-xs text-neutral-500">
                            {formatDateTime(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-700">{comment.body}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Adicionar comentário */}
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicione um comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || commentMutation.isPending}
                    style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}
                  >
                    {commentMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="properties" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Status</label>
                    <div className="mt-1">
                      <Badge variant={getStatusColor(selectedActivity.status)}>
                        {selectedActivity.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Prioridade</label>
                    <div className="mt-1">
                      <Badge variant={getPriorityColor(selectedActivity.priority)}>
                        {selectedActivity.priority}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Criado em</label>
                    <div className="text-sm mt-1">{formatDateTime(selectedActivity.created_at)}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-600">Atualizado em</label>
                    <div className="text-sm mt-1">{formatDateTime(selectedActivity.updated_at)}</div>
                  </div>
                </div>
                {selectedActivity.status !== "done" && (
                  <div className="pt-4">
                    <Button
                      onClick={() => {
                        moveToDoneMutation.mutate(selectedActivity.id);
                        setIsDetailDialogOpen(false);
                      }}
                      style={{ backgroundColor: 'var(--success)', color: 'white' }}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Mover para Done
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
