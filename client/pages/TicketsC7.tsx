import React, { useState } from "react";
import {
  Ticket,
  Plus,
  Search,
  Filter,
  Eye,
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Phone,
  Mail,
  MessageCircle,
  Users,
  Calendar,
  ArrowRight,
  MoreHorizontal,
  Edit,
  Trash2,
  Archive,
  UserPlus,
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
  DialogTrigger,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatDate } from "../lib/utils";
import { TicketDetailModal } from "../components/TicketDetailModal";

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
  
  // Joined data
  cliente_nome?: string;
  advogado_nome?: string;
  thread_count?: number;
}

interface TicketForm {
  subject: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  channel: "email" | "whatsapp" | "telefone" | "presencial" | "sistema";
  cliente_cpfcnpj?: string;
  numero_cnj?: string;
  description: string;
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

export default function TicketsC7() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [ticketForm, setTicketForm] = useState<TicketForm>({
    subject: "",
    priority: "media",
    channel: "email",
    cliente_cpfcnpj: "",
    numero_cnj: "",
    description: "",
  });

  // Queries
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", searchTerm, statusFilter, priorityFilter, channelFilter],
    queryFn: async () => {
      let query = lf
        .from("tickets")
        .select(`
          *,
          clientes:cliente_cpfcnpj(nome),
          advogados:assigned_oab(nome)
        `)
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`subject.ilike.%${searchTerm}%,cliente_cpfcnpj.ilike.%${searchTerm}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (priorityFilter !== "all") {
        query = query.eq("priority", priorityFilter);
      }

      if (channelFilter !== "all") {
        query = query.eq("channel", channelFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get thread counts
      const ticketsWithCounts = await Promise.all(
        (data || []).map(async (ticket) => {
          const { count } = await lf
            .from("ticket_threads")
            .select("*", { count: "exact" })
            .eq("ticket_id", ticket.id);

          return {
            ...ticket,
            cliente_nome: ticket.clientes?.nome,
            advogado_nome: ticket.advogados?.nome,
            thread_count: count || 0,
          };
        })
      );

      return ticketsWithCounts;
    },
  });

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: async (form: TicketForm) => {
      // Calculate SLA times (simplified logic)
      const now = new Date();
      const frtDue = new Date(now.getTime() + (form.priority === "urgente" ? 2 : 24) * 60 * 60 * 1000);
      const ttrDue = new Date(now.getTime() + (form.priority === "urgente" ? 8 : 72) * 60 * 60 * 1000);

      const { data, error } = await lf
        .from("tickets")
        .insert({
          subject: form.subject,
          priority: form.priority,
          channel: form.channel,
          cliente_cpfcnpj: form.cliente_cpfcnpj || null,
          numero_cnj: form.numero_cnj || null,
          frt_due_at: frtDue.toISOString(),
          ttr_due_at: ttrDue.toISOString(),
          created_by: "current-user", // TODO: Get from auth context
        })
        .select()
        .single();

      if (error) throw error;

      // Create initial thread link and message
      const { data: threadLink, error: threadError } = await lf
        .from("thread_links")
        .insert({
          numero_cnj: form.numero_cnj || null,
          cliente_cpfcnpj: form.cliente_cpfcnpj || null,
          context_type: "ticket",
        })
        .select()
        .single();

      if (threadError) throw threadError;

      // Link ticket to thread
      await lf.from("ticket_threads").insert({
        ticket_id: data.id,
        thread_link_id: threadLink.id,
      });

      // Create initial message
      await lf.from("ai_messages").insert({
        thread_link_id: threadLink.id,
        sender_type: "user",
        content: form.description,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setIsCreateOpen(false);
      setTicketForm({
        subject: "",
        priority: "media",
        channel: "email",
        cliente_cpfcnpj: "",
        numero_cnj: "",
        description: "",
      });
      toast({
        title: "Ticket criado com sucesso!",
        description: "O ticket foi adicionado à fila de atendimento.",
      });
    },
    onError: (error) => {
      console.error("Create ticket error:", error);
      toast({
        title: "Erro ao criar ticket",
        description: "Não foi possível criar o ticket.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await lf
        .from("tickets")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
  });

  // Handlers
  const handleCreateTicket = () => {
    if (!ticketForm.subject || !ticketForm.description) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o assunto e descrição do ticket.",
        variant: "destructive",
      });
      return;
    }

    createTicketMutation.mutate(ticketForm);
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailOpen(true);
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            🎫 Central de Tickets
          </h1>
          <p className="text-gray-600 mt-1">
            Atendimento com SLA simples - Freshdesk-like
          </p>
        </div>

        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Ticket
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar tickets (assunto, cliente)..."
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
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="fechado">Fechado</SelectItem>
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

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Canais</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="telefone">Telefone</SelectItem>
                <SelectItem value="presencial">Presencial</SelectItem>
                <SelectItem value="sistema">Sistema</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets ({tickets.length})</CardTitle>
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
          ) : tickets.length > 0 ? (
            <div className="space-y-4">
              {tickets.map((ticket) => {
                const frtSLA = getTimeToSLA(ticket.frt_due_at);
                const ttrSLA = getTimeToSLA(ticket.ttr_due_at);

                return (
                  <div
                    key={ticket.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleViewTicket(ticket)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getStatusIcon(ticket.status)}
                          <h3 className="font-medium">{ticket.subject}</h3>
                          <Badge className={STATUS_COLORS[ticket.status]}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                          <Badge className={PRIORITY_COLORS[ticket.priority]}>
                            {getPriorityIcon(ticket.priority)}
                            <span className="ml-1 capitalize">{ticket.priority}</span>
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            {CHANNEL_ICONS[ticket.channel]}
                            <span className="capitalize">{ticket.channel}</span>
                          </div>
                          {ticket.cliente_nome && (
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{ticket.cliente_nome}</span>
                            </div>
                          )}
                          {ticket.advogado_nome && (
                            <div className="flex items-center gap-1">
                              <UserPlus className="h-4 w-4" />
                              <span>{ticket.advogado_nome}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            <span>{ticket.thread_count} mensagens</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-gray-500">
                            Criado em {formatDate(ticket.created_at)}
                          </span>
                          {frtSLA && (
                            <span className={`font-medium ${frtSLA.color}`}>
                              FRT: {frtSLA.text}
                            </span>
                          )}
                          {ttrSLA && (
                            <span className={`font-medium ${ttrSLA.color}`}>
                              TTR: {ttrSLA.text}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
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
                                  id: ticket.id,
                                  status: "em_andamento"
                                });
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Assumir
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({
                                  id: ticket.id,
                                  status: "resolvido"
                                });
                              }}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Resolver
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({
                                  id: ticket.id,
                                  status: "fechado"
                                });
                              }}
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Fechar
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
              <Ticket className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Nenhum ticket encontrado
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Crie o primeiro ticket de atendimento"}
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Ticket
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Ticket de Atendimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="subject">Assunto *</Label>
              <Input
                id="subject"
                value={ticketForm.subject}
                onChange={(e) =>
                  setTicketForm({ ...ticketForm, subject: e.target.value })
                }
                placeholder="Assunto do ticket"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Prioridade</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(value) =>
                    setTicketForm({ ...ticketForm, priority: value as any })
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
                <Label htmlFor="channel">Canal</Label>
                <Select
                  value={ticketForm.channel}
                  onValueChange={(value) =>
                    setTicketForm({ ...ticketForm, channel: value as any })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="presencial">Presencial</SelectItem>
                    <SelectItem value="sistema">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cliente_cpfcnpj">Cliente (CPF/CNPJ)</Label>
                <Input
                  id="cliente_cpfcnpj"
                  value={ticketForm.cliente_cpfcnpj}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, cliente_cpfcnpj: e.target.value })
                  }
                  placeholder="000.000.000-00"
                />
              </div>

              <div>
                <Label htmlFor="numero_cnj">Processo (CNJ)</Label>
                <Input
                  id="numero_cnj"
                  value={ticketForm.numero_cnj}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, numero_cnj: e.target.value })
                  }
                  placeholder="0000000-00.0000.0.00.0000"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={ticketForm.description}
                onChange={(e) =>
                  setTicketForm({ ...ticketForm, description: e.target.value })
                }
                placeholder="Descreva o problema ou solicitação..."
                rows={4}
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
                onClick={handleCreateTicket}
                disabled={createTicketMutation.isPending}
              >
                {createTicketMutation.isPending ? "Criando..." : "Criar Ticket"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <TicketDetailModal
          ticket={selectedTicket}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedTicket(null);
          }}
        />
      )}
    </div>
  );
}
