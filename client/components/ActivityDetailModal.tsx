import React, { useState } from "react";
import {
  Clock,
  User,
  MessageSquare,
  Edit,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  Target,
  FileText,
  Send,
  Paperclip,
  MoreHorizontal,
  Users,
  Building,
  Trash2,
  Play,
  Pause,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatDate } from "../lib/utils";

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
  cliente_nome?: string;
  advogado_nome?: string;
}

interface Comment {
  id: string;
  activity_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

interface ActivityDetailModalProps {
  activity: Activity;
  isOpen: boolean;
  onClose: () => void;
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

export function ActivityDetailModal({
  activity,
  isOpen,
  onClose,
}: ActivityDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [selectedTab, setSelectedTab] = useState("comments");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: activity.title,
    priority: activity.priority,
    due_at: activity.due_at || "",
    assigned_oab: activity.assigned_oab?.toString() || "",
  });

  // Queries
  const { data: comments = [], isLoading: loadingComments } = useQuery({
    queryKey: ["activity-comments", activity.id],
    queryFn: async () => {
      const { data, error } = await lf
        .from("activity_comments")
        .select("*")
        .eq("activity_id", activity.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  const { data: advogados = [] } = useQuery({
    queryKey: ["advogados-for-modal"],
    queryFn: async () => {
      const { data, error } = await lf
        .from("advogados")
        .select("oab, nome")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // Mutations
  const updateActivityMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await lf
        .from("activities")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", activity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast({
        title: "Atividade atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    },
  });

  const updateMultipleFieldsMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await lf
        .from("activities")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", activity.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsEditing(false);
      toast({
        title: "Atividade atualizada",
        description: "As alterações foram salvas com sucesso.",
      });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await lf.from("activity_comments").insert({
        activity_id: activity.id,
        author_id: "current-user", // TODO: Get from auth context
        body,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["activity-comments", activity.id],
      });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setNewComment("");
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi salvo.",
      });
    },
  });

  // Handlers
  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  const handleSaveEdit = () => {
    const updates: any = {
      title: editForm.title,
      priority: editForm.priority,
      due_at: editForm.due_at || null,
      assigned_oab: editForm.assigned_oab
        ? parseInt(editForm.assigned_oab)
        : null,
    };

    updateMultipleFieldsMutation.mutate(updates);
  };

  const getDueStatus = (dueDate?: string, status?: string) => {
    if (!dueDate || status === "done") return null;

    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60),
    );

    if (diffHours < 0) {
      return { text: "Atrasado", color: "text-red-600", urgent: true };
    } else if (diffHours < 24) {
      return { text: "Vence hoje", color: "text-orange-600", urgent: true };
    } else if (diffHours < 72) {
      return {
        text: "Vence em breve",
        color: "text-yellow-600",
        urgent: false,
      };
    }

    return null;
  };

  const statusConfig = STATUS_CONFIG[activity.status];
  const priorityConfig = PRIORITY_CONFIG[activity.priority];
  const dueStatus = getDueStatus(activity.due_at, activity.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {isEditing ? (
                <Input
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="text-xl font-semibold"
                  placeholder="Título da atividade"
                />
              ) : (
                <DialogTitle className="text-xl">{activity.title}</DialogTitle>
              )}
              <div className="flex items-center gap-2 mt-2">
                {statusConfig.icon}
                <Badge className={statusConfig.color}>
                  {statusConfig.label}
                </Badge>
                <Badge className={priorityConfig.color}>
                  {priorityConfig.icon}
                  <span className="ml-1">{priorityConfig.label}</span>
                </Badge>
                {dueStatus && (
                  <Badge variant="destructive">{dueStatus.text}</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={updateMultipleFieldsMutation.isPending}
                  >
                    Salvar
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(true)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Select
                    value={activity.status}
                    onValueChange={(value) =>
                      updateActivityMutation.mutate({ field: "status", value })
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">A Fazer</SelectItem>
                      <SelectItem value="in_progress">Em Andamento</SelectItem>
                      <SelectItem value="done">Concluído</SelectItem>
                      <SelectItem value="blocked">Bloqueado</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs
            value={selectedTab}
            onValueChange={setSelectedTab}
            className="h-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="comments">
                <MessageSquare className="mr-2 h-4 w-4" />
                Comentários ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="details">
                <FileText className="mr-2 h-4 w-4" />
                Detalhes
              </TabsTrigger>
            </TabsList>

            {/* Comments Tab */}
            <TabsContent value="comments" className="h-full space-y-4">
              <div className="flex-1 overflow-y-auto max-h-96 space-y-4">
                {loadingComments ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">
                      Carregando comentários...
                    </p>
                  </div>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border-l-2 border-gray-200 pl-4 pb-4"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="font-medium">
                              {comment.author_id}
                            </span>
                            <span className="text-gray-500">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <p className="mt-1 text-gray-700">{comment.body}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhum comentário ainda</p>
                    <p className="text-gray-500 text-sm">
                      Adicione o primeiro comentário sobre esta atividade
                    </p>
                  </div>
                )}
              </div>

              {/* Comment Input */}
              <div className="border-t pt-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Adicionar comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="flex-1"
                  />
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddComment}
                      disabled={
                        !newComment.trim() || addCommentMutation.isPending
                      }
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Informações Básicas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isEditing ? (
                      <>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">
                            Prioridade:
                          </label>
                          <Select
                            value={editForm.priority}
                            onValueChange={(value) =>
                              setEditForm({
                                ...editForm,
                                priority: value as any,
                              })
                            }
                          >
                            <SelectTrigger className="w-full">
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
                          <label className="text-xs text-gray-500 block mb-1">
                            Vence em:
                          </label>
                          <Input
                            type="datetime-local"
                            value={editForm.due_at}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                due_at: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">
                            Responsável:
                          </label>
                          <Select
                            value={editForm.assigned_oab}
                            onValueChange={(value) =>
                              setEditForm({ ...editForm, assigned_oab: value })
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Não atribuído</SelectItem>
                              {advogados.map((adv) => (
                                <SelectItem
                                  key={adv.oab}
                                  value={adv.oab.toString()}
                                >
                                  {adv.nome} (OAB {adv.oab})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="text-xs text-gray-500">
                            Status:
                          </label>
                          <p className="text-sm font-medium">
                            {statusConfig.label}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">
                            Prioridade:
                          </label>
                          <p className="text-sm font-medium">
                            {priorityConfig.label}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">
                            Vence em:
                          </label>
                          <p className="text-sm font-medium">
                            {activity.due_at
                              ? formatDate(activity.due_at)
                              : "Não definido"}
                          </p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">
                            Responsável:
                          </label>
                          <p className="text-sm font-medium">
                            {activity.advogado_nome
                              ? `${activity.advogado_nome} (OAB ${activity.assigned_oab})`
                              : "Não atribuído"}
                          </p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Vinculações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500">Cliente:</label>
                      <p className="text-sm font-medium">
                        {activity.cliente_nome || "Não vinculado"}
                      </p>
                      {activity.cliente_cpfcnpj && (
                        <p className="text-xs text-gray-500">
                          {activity.cliente_cpfcnpj}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Processo CNJ:
                      </label>
                      <p className="text-sm font-medium">
                        {activity.numero_cnj || "Não vinculado"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Ticket:</label>
                      <p className="text-sm font-medium">
                        {activity.ticket_id || "Não vinculado"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Auditoria</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500">
                        Criado por:
                      </label>
                      <p className="text-sm font-medium">
                        {activity.created_by}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Criado em:
                      </label>
                      <p className="text-sm font-medium">
                        {formatDate(activity.created_at)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">
                        Atualizado em:
                      </label>
                      <p className="text-sm font-medium">
                        {formatDate(activity.updated_at)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
