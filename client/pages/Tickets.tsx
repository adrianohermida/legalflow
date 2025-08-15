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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
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
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Eye,
  Link2,
  Calendar,
  Users,
  ArrowLeft,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf, supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { Link, useParams, useNavigate } from "react-router-dom";

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  group_key: string | null;
  channel: string;
  assigned_oab: number | null;
  cliente_cpfcnpj: string | null;
  numero_cnj: string | null;
  frt_due_at: string | null;
  ttr_due_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  cliente_nome?: string;
  responsavel_nome?: string;
}

interface TicketFormData {
  subject: string;
  cliente_cpfcnpj: string;
  numero_cnj: string;
  priority: string;
  channel: string;
  assigned_oab: string;
}

export function Tickets() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [filterPriority, setFilterPriority] = useState("todos");
  const [filterChannel, setFilterChannel] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isActivityDialogOpen, setIsActivityDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const itemsPerPage = 25; // P2.7 - Padrão 25/pg conforme spec

  // P2.7 - Buscar tickets
  const {
    data: ticketsData = { data: [], total: 0, totalPages: 0 },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "tickets",
      searchTerm,
      filterStatus,
      filterPriority,
      filterChannel,
      currentPage,
    ],
    queryFn: async () => {
      let query = lf
        .from("tickets")
        .select(
          `
          *,
          clientes:public.clientes!tickets_cliente_cpfcnpj_fkey (
            nome
          ),
          advogados:public.advogados!tickets_assigned_oab_fkey (
            nome
          )
        `,
          { count: "exact" },
        )
        .order("created_at", { ascending: false });

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(
          `subject.ilike.%${searchTerm}%,cliente_cpfcnpj.ilike.%${searchTerm}%,numero_cnj.ilike.%${searchTerm}%`,
        );
      }

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }

      if (filterPriority !== "todos") {
        query = query.eq("priority", filterPriority);
      }

      if (filterChannel !== "todos") {
        query = query.eq("channel", filterChannel);
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const { data, error, count } = await query.range(
        startIndex,
        startIndex + itemsPerPage - 1,
      );

      if (error) throw error;

      // Processar dados relacionados
      const processedData =
        data?.map((ticket: any) => ({
          ...ticket,
          cliente_nome: ticket.clientes?.nome,
          responsavel_nome: ticket.advogados?.nome,
        })) || [];

      return {
        data: processedData,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Buscar clientes para o formulário
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-tickets"],
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
    queryKey: ["advogados-tickets"],
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
    queryKey: ["processos-tickets"],
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

  // Buscar stage instances para vincular activity
  const { data: stageInstances = [] } = useQuery({
    queryKey: ["stage-instances-tickets"],
    queryFn: async () => {
      const { data, error } = await lf
        .from("stage_instances")
        .select(
          `
          id,
          order_index,
          status,
          stage_types!inner(
            code,
            name
          ),
          journey_instances!inner(
            id,
            journey_types!inner(
              name
            )
          )
        `,
        )
        .eq("stage_types.code", "task")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });

  // SF-6: Mutation para criar activity a partir de ticket
  const createActivityMutation = useMutation({
    mutationFn: async ({
      ticketId,
      stageInstanceId,
    }: {
      ticketId: string;
      stageInstanceId?: string;
    }) => {
      const ticket = ticketsData.data?.find((t) => t.id === ticketId);
      if (!ticket) throw new Error("Ticket não encontrado");

      const activityData = {
        title: `[Ticket] ${ticket.subject}`,
        status: "todo",
        priority: ticket.priority,
        assigned_oab: ticket.assigned_oab,
        cliente_cpfcnpj: ticket.cliente_cpfcnpj,
        numero_cnj: ticket.numero_cnj,
        ticket_id: ticketId,
        stage_instance_id: stageInstanceId || null,
        created_by: "current_user",
        // Definir prazo baseado na TTR do ticket
        due_at: ticket.ttr_due_at,
      };

      const { data: activity, error } = await lf
        .from("activities")
        .insert([activityData])
        .select()
        .single();

      if (error) throw error;
      return { ticket, activity };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setIsActivityDialogOpen(false);
      toast({
        title: "Activity criada",
        description: `Activity espelho criada para "${result.ticket.subject}"`,
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

  // P2.7 - Mutation para criar ticket
  const ticketMutation = useMutation({
    mutationFn: async (ticketData: TicketFormData) => {
      const dataToSave = {
        subject: ticketData.subject,
        status: "aberto",
        priority: ticketData.priority,
        channel: ticketData.channel,
        assigned_oab: ticketData.assigned_oab
          ? parseInt(ticketData.assigned_oab)
          : null,
        cliente_cpfcnpj: ticketData.cliente_cpfcnpj || null,
        numero_cnj: ticketData.numero_cnj || null,
        created_by: "current_user", // TODO: Get from auth context
        // P2.7 - FRT/TTR calculados baseados na prioridade
        frt_due_at: getFRTDueDate(ticketData.priority),
        ttr_due_at: getTTRDueDate(ticketData.priority),
      };

      const { data, error } = await lf
        .from("tickets")
        .insert([dataToSave])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      setIsDialogOpen(false);
      toast({
        title: "Ticket criado",
        description: "Novo ticket de atendimento criado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar ticket",
        variant: "destructive",
      });
    },
  });

  // P2.7 - SLA simples baseado na prioridade
  const getFRTDueDate = (priority: string) => {
    const now = new Date();
    const hours =
      priority === "urgente"
        ? 1
        : priority === "alta"
          ? 4
          : priority === "media"
            ? 8
            : 24;
    now.setHours(now.getHours() + hours);
    return now.toISOString();
  };

  const getTTRDueDate = (priority: string) => {
    const now = new Date();
    const hours =
      priority === "urgente"
        ? 4
        : priority === "alta"
          ? 8
          : priority === "media"
            ? 24
            : 72;
    now.setHours(now.getHours() + hours);
    return now.toISOString();
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const ticketData: TicketFormData = {
      subject: formData.get("subject") as string,
      cliente_cpfcnpj: formData.get("cliente_cpfcnpj") as string,
      numero_cnj: formData.get("numero_cnj") as string,
      priority: formData.get("priority") as string,
      channel: formData.get("channel") as string,
      assigned_oab: formData.get("assigned_oab") as string,
    };

    ticketMutation.mutate(ticketData);
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
      return clean.replace(
        /(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/,
        "$1-$2.$3.$4.$5.$6",
      );
    }
    return cnj;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "aberto":
        return "destructive";
      case "em_andamento":
        return "default";
      case "resolvido":
        return "secondary";
      case "fechado":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgente":
        return "destructive";
      case "alta":
        return "default";
      case "media":
        return "secondary";
      case "baixa":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return "✉️";
      case "whatsapp":
        return "💬";
      case "telefone":
        return "📞";
      case "presencial":
        return "🏢";
      case "sistema":
        return "🖥️";
      default:
        return "📋";
    }
  };

  const getSLAStatus = (dueAt: string | null) => {
    if (!dueAt) return null;
    const now = new Date();
    const due = new Date(dueAt);
    const diff = due.getTime() - now.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 0) return "vencido";
    if (hours < 2) return "urgente";
    if (hours < 8) return "atencao";
    return "ok";
  };

  const getSLAColor = (status: string | null) => {
    switch (status) {
      case "vencido":
        return "bg-red-100 text-red-700";
      case "urgente":
        return "bg-orange-100 text-orange-700";
      case "atencao":
        return "bg-yellow-100 text-yellow-700";
      case "ok":
        return "bg-green-100 text-green-700";
      default:
        return "";
    }
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold">Tickets</h1>
            <p className="text-neutral-600 mt-1">
              Entrada única de atendimentos com SLA simples
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Erro ao carregar tickets
              </h3>
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
          <h1 className="text-2xl font-heading font-semibold">Tickets</h1>
          <p className="text-neutral-600 mt-1">
            Entrada única de atendimentos com SLA simples
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gray-800 text-white hover:bg-gray-900">
              <Plus className="w-4 h-4 mr-2" />
              Novo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmitTicket}>
              <DialogHeader>
                <DialogTitle>Novo Ticket</DialogTitle>
                <DialogDescription>
                  Crie um novo ticket de atendimento
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Assunto *
                  </label>
                  <Input
                    name="subject"
                    placeholder="Descreva brevemente o assunto"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Prioridade *
                    </label>
                    <Select name="priority" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prioridade" />
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
                    <label className="block text-sm font-medium mb-2">
                      Canal *
                    </label>
                    <Select name="channel" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o canal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="telefone">Telefone</SelectItem>
                        <SelectItem value="presencial">Presencial</SelectItem>
                        <SelectItem value="sistema">Sistema</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cliente
                  </label>
                  <Select name="cliente_cpfcnpj">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum cliente</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem
                          key={cliente.cpfcnpj}
                          value={cliente.cpfcnpj}
                        >
                          {cliente.nome} ({cliente.cpfcnpj})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Processo (CNJ)
                  </label>
                  <Select name="numero_cnj">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um processo (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum processo</SelectItem>
                      {processos.map((processo) => (
                        <SelectItem
                          key={processo.numero_cnj}
                          value={processo.numero_cnj}
                        >
                          {formatCNJ(processo.numero_cnj)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Responsável (OAB)
                  </label>
                  <Select name="assigned_oab">
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um responsável (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Não atribuído</SelectItem>
                      {advogados.map((advogado) => (
                        <SelectItem
                          key={advogado.oab}
                          value={advogado.oab.toString()}
                        >
                          {advogado.nome} (OAB {advogado.oab})
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
                <Button type="submit" disabled={ticketMutation.isPending}>
                  {ticketMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Criar Ticket
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
                  placeholder="Buscar por assunto, cliente ou CNJ..."
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
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="resolvido">Resolvido</SelectItem>
                  <SelectItem value="fechado">Fechado</SelectItem>
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
                  <SelectItem value="urgente">Urgente</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterChannel}
                onValueChange={(value) => {
                  setFilterChannel(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os canais</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="presencial">Presencial</SelectItem>
                  <SelectItem value="sistema">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* P2.7 - Tabela conforme especificação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Tickets ({ticketsData.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                className="w-8 h-8 animate-spin"
                className="text-gray-800"
              />
              <span className="ml-2 text-neutral-600">
                Carregando tickets...
              </span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Responsável (OAB)</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>FRT/TTR</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketsData.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-neutral-500">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                        <p>Nenhum ticket encontrado</p>
                        <p className="text-sm">
                          Crie o primeiro ticket de atendimento
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  ticketsData.data?.map((ticket) => (
                    <TableRow key={ticket.id} className="hover:bg-neutral-50">
                      <TableCell>
                        <div className="font-medium max-w-64 truncate">
                          {ticket.subject}
                        </div>
                        {ticket.numero_cnj && (
                          <div className="text-xs text-neutral-500 mt-1">
                            CNJ: {formatCNJ(ticket.numero_cnj)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(ticket.status)}>
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ticket.cliente_nome ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {ticket.cliente_nome}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {ticket.cliente_cpfcnpj}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-sm">
                            Não informado
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {ticket.responsavel_nome ? (
                          <div className="text-sm">
                            <div className="font-medium">
                              {ticket.responsavel_nome}
                            </div>
                            <div className="text-xs text-neutral-500">
                              OAB {ticket.assigned_oab}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline">Não atribuído</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <span>{getChannelIcon(ticket.channel)}</span>
                          <span>{ticket.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {ticket.frt_due_at && (
                            <div
                              className={`text-xs px-2 py-1 rounded ${getSLAColor(getSLAStatus(ticket.frt_due_at))}`}
                            >
                              FRT: {formatDateTime(ticket.frt_due_at)}
                            </div>
                          )}
                          {ticket.ttr_due_at && (
                            <div
                              className={`text-xs px-2 py-1 rounded ${getSLAColor(getSLAStatus(ticket.ttr_due_at))}`}
                            >
                              TTR: {formatDateTime(ticket.ttr_due_at)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          {/* SF-6: Botão "Criar Activity espelho" */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setIsActivityDialogOpen(true);
                            }}
                            style={{ color: "var(--brand-700)" }}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Activity espelho
                          </Button>
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

      {/* Paginação 25/pg */}
      {ticketsData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
            {Math.min(currentPage * itemsPerPage, ticketsData.total)} de{" "}
            {ticketsData.total} tickets
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
              Página {currentPage} de {ticketsData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === ticketsData.totalPages}
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* SF-6: Dialog para criação de activity espelho */}
      <Dialog
        open={isActivityDialogOpen}
        onOpenChange={setIsActivityDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Activity Espelho</DialogTitle>
            <DialogDescription>
              Criar uma activity baseada neste ticket (opcional: vincular a
              etapa da jornada)
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4">
              <div className="p-4 bg-neutral-50 rounded-lg">
                <h4 className="font-medium mb-2">Ticket selecionado:</h4>
                <p className="text-sm font-medium">{selectedTicket.subject}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-neutral-600">
                  <span>Prioridade: {selectedTicket.priority}</span>
                  {selectedTicket.cliente_nome && (
                    <span>Cliente: {selectedTicket.cliente_nome}</span>
                  )}
                  {selectedTicket.responsavel_nome && (
                    <span>Responsável: {selectedTicket.responsavel_nome}</span>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Vincular à etapa da jornada (opcional)
                </label>
                <Select
                  onValueChange={(value) => {
                    // Store selected stage instance
                    setSelectedTicket((prev) =>
                      prev ? { ...prev, selectedStageInstanceId: value } : null,
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma etapa de tipo 'task' (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não vincular a etapa</SelectItem>
                    {stageInstances.map((instance: any) => (
                      <SelectItem key={instance.id} value={instance.id}>
                        {instance.journey_instances.journey_types.name} -
                        {instance.stage_types.name} (#{instance.order_index})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">Activity que será criada:</h4>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Título:</strong> [Ticket] {selectedTicket.subject}
                  </p>
                  <p>
                    <strong>Prioridade:</strong> {selectedTicket.priority}
                  </p>
                  <p>
                    <strong>Status:</strong> A Fazer
                  </p>
                  {selectedTicket.ttr_due_at && (
                    <p>
                      <strong>Vence em:</strong>{" "}
                      {formatDateTime(selectedTicket.ttr_due_at)}
                    </p>
                  )}
                  {selectedTicket.cliente_nome && (
                    <p>
                      <strong>Cliente:</strong> {selectedTicket.cliente_nome}
                    </p>
                  )}
                  {selectedTicket.responsavel_nome && (
                    <p>
                      <strong>Responsável:</strong>{" "}
                      {selectedTicket.responsavel_nome}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsActivityDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedTicket) {
                  createActivityMutation.mutate({
                    ticketId: selectedTicket.id,
                    stageInstanceId:
                      (selectedTicket as any).selectedStageInstanceId ||
                      undefined,
                  });
                }
              }}
              disabled={createActivityMutation.isPending}
              style={{ backgroundColor: "var(--brand-700)", color: "white" }}
            >
              {createActivityMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Criar Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
