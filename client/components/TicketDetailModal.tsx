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
  Mail,
  Phone,
  MessageCircle,
  Users,
  FileText,
  Send,
  Paperclip,
  MoreHorizontal,
  Tag,
  UserPlus,
  Settings,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatDate } from "../lib/utils";

interface Ticket {
  id: string;
  subject: string;
  status: "aberto" | "em_andamento" | "resolvido" | "fechado";
  priority: "baixa" | "media" | "alta" | "urgente";
  channel: "email" | "whatsapp" | "telefone" | "presencial" | "sistema";
  assigned_oab?: number;
  cliente_cpfcnpj?: string;
  numero_cnj?: string;
  frt_due_at?: string;
  ttr_due_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  cliente_nome?: string;
  advogado_nome?: string;
}

interface Message {
  id: string;
  sender_type: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

interface TicketDetailModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITY_COLORS = {
  baixa: "bg-gray-100 text-gray-800",
  media: "bg-yellow-100 text-yellow-800",
  alta: "bg-orange-100 text-orange-800",
  urgente: "bg-red-100 text-red-800",
};

const STATUS_COLORS = {
  aberto: "bg-blue-100 text-blue-800",
  em_andamento: "bg-purple-100 text-purple-800",
  resolvido: "bg-green-100 text-green-800",
  fechado: "bg-gray-100 text-gray-800",
};

const CHANNEL_ICONS = {
  email: <Mail className="h-4 w-4" />,
  whatsapp: <MessageCircle className="h-4 w-4" />,
  telefone: <Phone className="h-4 w-4" />,
  presencial: <Users className="h-4 w-4" />,
  sistema: <User className="h-4 w-4" />,
};

export function TicketDetailModal({ ticket, isOpen, onClose }: TicketDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const [selectedTab, setSelectedTab] = useState("conversas");

  // Queries
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["ticket-messages", ticket.id],
    queryFn: async () => {
      // Get thread link for this ticket
      const { data: ticketThreads, error: threadError } = await lf
        .from("ticket_threads")
        .select(`
          thread_link_id,
          thread_links!inner(
            id,
            ai_messages(*)
          )
        `)
        .eq("ticket_id", ticket.id);

      if (threadError) throw threadError;

      if (!ticketThreads || ticketThreads.length === 0) return [];

      const threadLink = ticketThreads[0];
      return threadLink.thread_links.ai_messages || [];
    },
    enabled: isOpen,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["ticket-activities", ticket.id],
    queryFn: async () => {
      const { data, error } = await lf
        .from("activities")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // Mutations
  const updateTicketMutation = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      const { error } = await lf
        .from("tickets")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", ticket.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      toast({
        title: "Ticket atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      // Get thread link for this ticket
      const { data: ticketThreads } = await lf
        .from("ticket_threads")
        .select("thread_link_id")
        .eq("ticket_id", ticket.id)
        .single();

      if (!ticketThreads) throw new Error("Thread not found");

      const { error } = await lf
        .from("ai_messages")
        .insert({
          thread_link_id: ticketThreads.thread_link_id,
          sender_type: "user",
          content,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticket.id] });
      setNewMessage("");
      toast({
        title: "Mensagem enviada",
        description: "Sua resposta foi adicionada ao ticket.",
      });
    },
  });

  // Handlers
  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage);
  };

  const getTimeToSLA = (dueDate?: string) => {
    if (!dueDate) return null;
    
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 0) {
      return { text: `${Math.abs(hours)}h em atraso`, color: "text-red-600", urgent: true };
    } else if (hours < 2) {
      return { text: `${hours}h restantes`, color: "text-orange-600", urgent: true };
    } else if (hours < 24) {
      return { text: `${hours}h restantes`, color: "text-yellow-600", urgent: false };
    } else {
      const days = Math.floor(hours / 24);
      return { text: `${days}d restantes`, color: "text-green-600", urgent: false };
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "urgente":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "alta":
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case "media":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolvido":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "fechado":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case "em_andamento":
        return <Clock className="h-4 w-4 text-purple-600" />;
      default:
        return <Clock className="h-4 w-4 text-blue-600" />;
    }
  };

  const frtSLA = getTimeToSLA(ticket.frt_due_at);
  const ttrSLA = getTimeToSLA(ticket.ttr_due_at);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">{ticket.subject}</DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                {getStatusIcon(ticket.status)}
                <Badge className={STATUS_COLORS[ticket.status]}>
                  {ticket.status.replace("_", " ")}
                </Badge>
                <Badge className={PRIORITY_COLORS[ticket.priority]}>
                  {getPriorityIcon(ticket.priority)}
                  <span className="ml-1 capitalize">{ticket.priority}</span>
                </Badge>
                <div className="flex items-center gap-1 text-sm text-gray-600">
                  {CHANNEL_ICONS[ticket.channel]}
                  <span className="capitalize">{ticket.channel}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Select
                value={ticket.status}
                onValueChange={(value) =>
                  updateTicketMutation.mutate({ field: "status", value })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SLA Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            {frtSLA && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">First Response Time (FRT):</span>
                <span className={`text-sm font-medium ${frtSLA.color}`}>
                  {frtSLA.text}
                </span>
              </div>
            )}
            {ttrSLA && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Time To Resolution (TTR):</span>
                <span className={`text-sm font-medium ${ttrSLA.color}`}>
                  {ttrSLA.text}
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="h-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="conversas">
                <MessageSquare className="mr-2 h-4 w-4" />
                Conversas ({messages.length})
              </TabsTrigger>
              <TabsTrigger value="propriedades">
                <Settings className="mr-2 h-4 w-4" />
                Propriedades
              </TabsTrigger>
              <TabsTrigger value="historico">
                <FileText className="mr-2 h-4 w-4" />
                Histórico ({activities.length})
              </TabsTrigger>
            </TabsList>

            {/* Conversas Tab */}
            <TabsContent value="conversas" className="h-full space-y-4">
              <div className="flex-1 overflow-y-auto max-h-96 space-y-4">
                {loadingMessages ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2">Carregando mensagens...</p>
                  </div>
                ) : messages.length > 0 ? (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_type === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-md p-3 rounded-lg ${
                          message.sender_type === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.sender_type === "user"
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {formatDate(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhuma mensagem ainda</p>
                    <p className="text-gray-500 text-sm">
                      Inicie a conversa com o cliente
                    </p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="border-t pt-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Digite sua resposta..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                    className="flex-1"
                  />
                  <div className="flex flex-col gap-2">
                    <Button size="sm" variant="outline">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Propriedades Tab */}
            <TabsContent value="propriedades" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Informações do Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500">Nome:</label>
                      <p className="text-sm font-medium">
                        {ticket.cliente_nome || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">CPF/CNPJ:</label>
                      <p className="text-sm font-medium">
                        {ticket.cliente_cpfcnpj || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Processo CNJ:</label>
                      <p className="text-sm font-medium">
                        {ticket.numero_cnj || "Não vinculado"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Atribuição</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500">Responsável:</label>
                      <p className="text-sm font-medium">
                        {ticket.advogado_nome || "Não atribuído"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">OAB:</label>
                      <p className="text-sm font-medium">
                        {ticket.assigned_oab || "Não informado"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Criado por:</label>
                      <p className="text-sm font-medium">{ticket.created_by}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">SLA & Prazos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500">Primeira Resposta:</label>
                      <p className="text-sm font-medium">
                        {ticket.frt_due_at ? formatDate(ticket.frt_due_at) : "Não definido"}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Resolução:</label>
                      <p className="text-sm font-medium">
                        {ticket.ttr_due_at ? formatDate(ticket.ttr_due_at) : "Não definido"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Configurações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        Prioridade:
                      </label>
                      <Select
                        value={ticket.priority}
                        onValueChange={(value) =>
                          updateTicketMutation.mutate({ field: "priority", value })
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
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Histórico Tab */}
            <TabsContent value="historico" className="space-y-4">
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className="border-l-2 border-gray-200 pl-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{activity.title}</h4>
                          <p className="text-xs text-gray-500">
                            {formatDate(activity.created_at)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhuma atividade registrada</p>
                    <p className="text-gray-500 text-sm">
                      Atividades aparecem aqui conforme o ticket é processado
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
