import React, { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Calendar,
  Clock,
  Plus,
  MapPin,
  Users,
  Video,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Edit,
  Trash2,
  ExternalLink,
  FileText,
  Search,
  Filter,
  Bell,
  Copy,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

// ============================================================================
// INTERFACES E TIPOS
// ============================================================================

interface SF7Evento {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  priority: string;
  status: string;
  starts_at_sp: string;
  ends_at_sp: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  video_link: string | null;
  meeting_platform: string | null;
  cliente_cpfcnpj: string | null;
  numero_cnj: string | null;
  external_ref: string | null;
  stage_instance_id: string | null;
  metadata: any;
  tags: string[];
}

interface SF7EventoForm {
  title: string;
  description: string;
  event_type: string;
  priority: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  location: string;
  video_link: string;
  cnj_or_cpf: string;
}

interface Cliente {
  cpfcnpj: string;
  nome: string;
}

interface EventoProximo {
  id: string;
  title: string;
  starts_at_sp: string;
  starts_at_formatted: string;
  event_type: string;
  status: string;
  location: string | null;
  video_link: string | null;
  cliente_nome: string | null;
  numero_cnj: string | null;
  urgencia: string;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function SF7AgendaEnhanced() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<SF7Evento | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showQuickCreate, setShowQuickCreate] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const quickCreateRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // UTILITY FUNCTIONS - TIMEZONE AMERICA/SAO_PAULO
  // ============================================================================

  const getSaoPauloTime = (date: Date = new Date()) => {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(date);
  };

  const formatDateTimeSP = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
  };

  const formatDateSP = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const formatTimeSP = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === "week") {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      end.setDate(start.getDate() + 6);
    } else {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    // Converter para SP timezone
    const startSP = new Date(start.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const endSP = new Date(end.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

    return {
      from: startSP.toISOString(),
      to: endSP.toISOString(),
    };
  };

  // ============================================================================
  // QUERIES E MUTATIONS
  // ============================================================================

  // Buscar eventos por período usando RPC SF-7
  const {
    data: eventos = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["sf7-eventos", currentDate, viewMode, searchTerm, filterStatus, filterType],
    queryFn: async () => {
      const { from, to } = getDateRange();

      const { data, error } = await lf.rpc("sf7_list_eventos_periodo", {
        data_inicio: from,
        data_fim: to,
      });

      if (error) throw error;
      
      let filteredData = data || [];

      // Aplicar filtros
      if (searchTerm) {
        filteredData = filteredData.filter((evento: SF7Evento) =>
          evento.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          evento.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          evento.numero_cnj?.includes(searchTerm)
        );
      }

      if (filterStatus !== "all") {
        filteredData = filteredData.filter((evento: SF7Evento) => evento.status === filterStatus);
      }

      if (filterType !== "all") {
        filteredData = filteredData.filter((evento: SF7Evento) => evento.event_type === filterType);
      }

      return filteredData;
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  });

  // Buscar eventos próximos
  const { data: eventosProximos = [] } = useQuery({
    queryKey: ["sf7-eventos-proximos"],
    queryFn: async () => {
      const { data, error } = await lf.rpc("sf7_eventos_proximos", { p_limite: 5 });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5 * 60 * 1000, // Atualizar a cada 5 minutos
  });

  // Buscar clientes
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-sf7"],
    queryFn: async () => {
      const { data, error } = await lf
        .schema("public")
        .from("clientes")
        .select("cpfcnpj, nome")
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  // Mutation para criação rápida
  const quickCreateMutation = useMutation({
    mutationFn: async (formData: { title: string; starts_at: string; cnj_or_cpf: string; video_link?: string }) => {
      const { data, error } = await lf.rpc("sf7_create_evento_rapido", {
        p_title: formData.title,
        p_starts_at: formData.starts_at,
        p_event_type: formData.video_link ? "videoconferencia" : "reuniao",
        p_cnj_or_cpf: formData.cnj_or_cpf || null,
        p_video_link: formData.video_link || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sf7-eventos"] });
      queryClient.invalidateQueries({ queryKey: ["sf7-eventos-proximos"] });
      setShowQuickCreate(false);
      toast({
        title: "Evento criado",
        description: "Evento adicionado à agenda com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar evento",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar evento
  const updateEventoMutation = useMutation({
    mutationFn: async (eventoData: Partial<SF7Evento> & { id: string }) => {
      const { data, error } = await lf.rpc("sf7_update_evento", {
        p_evento_id: eventoData.id,
        p_title: eventoData.title,
        p_description: eventoData.description,
        p_starts_at: eventoData.starts_at,
        p_ends_at: eventoData.ends_at,
        p_location: eventoData.location,
        p_video_link: eventoData.video_link,
        p_status: eventoData.status,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sf7-eventos"] });
      queryClient.invalidateQueries({ queryKey: ["sf7-eventos-proximos"] });
      setIsDialogOpen(false);
      setEditingEvento(null);
      toast({
        title: "Evento atualizado",
        description: "Evento atualizado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar evento",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar evento
  const deleteEventoMutation = useMutation({
    mutationFn: async (eventoId: string) => {
      const { error } = await lf
        .from("eventos_agenda")
        .delete()
        .eq("id", eventoId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sf7-eventos"] });
      queryClient.invalidateQueries({ queryKey: ["sf7-eventos-proximos"] });
      toast({
        title: "Evento excluído",
        description: "Evento removido da agenda",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir evento",
        variant: "destructive",
      });
    },
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleQuickCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const quickData = {
      title: formData.get("quick_title") as string,
      starts_at: formData.get("quick_starts_at") as string,
      cnj_or_cpf: formData.get("quick_cnj_cpf") as string,
      video_link: formData.get("quick_video_link") as string,
    };

    quickCreateMutation.mutate(quickData);
  };

  const handleSubmitEvento = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const eventoData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      event_type: formData.get("event_type") as string,
      priority: formData.get("priority") as string,
      starts_at: formData.get("starts_at") as string,
      ends_at: formData.get("ends_at") as string,
      all_day: formData.get("all_day") === "on",
      location: formData.get("location") as string,
      video_link: formData.get("video_link") as string,
      status: formData.get("status") as string,
    };

    if (editingEvento) {
      updateEventoMutation.mutate({ id: editingEvento.id, ...eventoData });
    } else {
      // Para novos eventos, usar a criação rápida
      quickCreateMutation.mutate({
        title: eventoData.title,
        starts_at: eventoData.starts_at,
        cnj_or_cpf: "",
        video_link: eventoData.video_link,
      });
    }
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgente": return "bg-red-100 text-red-700 border-red-200";
      case "alta": return "bg-orange-100 text-orange-700 border-orange-200";
      case "normal": return "bg-blue-100 text-blue-700 border-blue-200";
      case "baixa": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "agendado": return "bg-blue-100 text-blue-700";
      case "confirmado": return "bg-green-100 text-green-700";
      case "em_andamento": return "bg-yellow-100 text-yellow-700";
      case "realizado": return "bg-emerald-100 text-emerald-700";
      case "cancelado": return "bg-red-100 text-red-700";
      case "reagendado": return "bg-purple-100 text-purple-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia) {
      case "urgente": return "border-l-4 border-red-500 bg-red-50";
      case "hoje": return "border-l-4 border-orange-500 bg-orange-50";
      case "proximo": return "border-l-4 border-blue-500 bg-blue-50";
      default: return "border-l-4 border-gray-300 bg-white";
    }
  };

  const copyVideoLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copiado",
      description: "Link da videoconferência copiado para a área de transferência",
    });
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getEventosByDay = (day: Date) => {
    const dayStr = day.toISOString().split("T")[0];
    return eventos.filter((evento) => evento.starts_at.startsWith(dayStr));
  };

  const renderWeekView = () => {
    const weekDays = [];
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      weekDays.push(day);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => {
          const dayEventos = getEventosByDay(day);
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div
              key={index}
              className={`min-h-32 p-2 border rounded-lg ${
                isToday 
                  ? "bg-blue-50 border-blue-200 shadow-sm" 
                  : "bg-white border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              <div className="text-center mb-2">
                <div className="text-xs text-neutral-500 uppercase">
                  {day.toLocaleDateString("pt-BR", { weekday: "short", timeZone: "America/Sao_Paulo" })}
                </div>
                <div
                  className={`text-sm font-medium ${
                    isToday ? "text-blue-600 font-bold" : "text-neutral-900"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
              <div className="space-y-1">
                {dayEventos.map((evento) => (
                  <div
                    key={evento.id}
                    className={`text-xs p-2 rounded cursor-pointer hover:shadow-sm transition-all ${
                      getPriorityColor(evento.priority)
                    }`}
                    onClick={() => {
                      setEditingEvento(evento);
                      setIsDialogOpen(true);
                    }}
                  >
                    <div className="font-medium truncate">{evento.title}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs opacity-75">
                        {formatTimeSP(evento.starts_at)}
                      </span>
                      {evento.video_link && (
                        <Video className="w-3 h-3 opacity-60" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(monthStart);
    startDate.setDate(startDate.getDate() - monthStart.getDay());

    const days = [];
    const currentDay = new Date(startDate);

    while (currentDay <= monthEnd || days.length < 42) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
      if (days.length >= 42) break;
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => (
          <div
            key={day}
            className="p-3 text-center text-sm font-medium text-neutral-600 border-b bg-neutral-50"
          >
            {day}
          </div>
        ))}
        {days.map((day, index) => {
          const dayEventos = getEventosByDay(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div
              key={index}
              className={`min-h-24 p-1 border ${
                isCurrentMonth
                  ? isToday
                    ? "bg-blue-50 border-blue-200"
                    : "bg-white border-neutral-200 hover:bg-neutral-50"
                  : "bg-neutral-50 border-neutral-100"
              }`}
            >
              <div className="text-right mb-1">
                <span
                  className={`text-sm ${
                    isCurrentMonth
                      ? isToday
                        ? "text-blue-600 font-bold"
                        : "text-neutral-900"
                      : "text-neutral-400"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              <div className="space-y-1">
                {dayEventos.slice(0, 2).map((evento) => (
                  <div
                    key={evento.id}
                    className={`text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-all truncate ${
                      getPriorityColor(evento.priority)
                    }`}
                    onClick={() => {
                      setEditingEvento(evento);
                      setIsDialogOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {evento.video_link && <Video className="w-3 h-3" />}
                      <span className="truncate">{evento.title}</span>
                    </div>
                  </div>
                ))}
                {dayEventos.length > 2 && (
                  <div className="text-xs text-neutral-500 text-center">
                    +{dayEventos.length - 2} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================================================
  // ERROR STATE
  // ============================================================================

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold">SF-7: Agenda</h1>
            <p className="text-neutral-600 mt-1">
              Compromissos, prazos e eventos (TZ: America/Sao_Paulo)
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Erro ao carregar agenda SF-7
              </h3>
              <p className="text-neutral-600 mb-4">{error.message}</p>
              <Button onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="space-y-6 p-6">
      {/* Header com Criação Rápida */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold">SF-7: Agenda</h1>
          <p className="text-neutral-600 mt-1">
            Compromissos, prazos e eventos • TZ: America/São_Paulo
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowQuickCreate(!showQuickCreate)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Criação Rápida
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                style={{ backgroundColor: "var(--brand-700)", color: "white" }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmitEvento}>
                <DialogHeader>
                  <DialogTitle>
                    {editingEvento ? "Editar Evento" : "Novo Evento"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingEvento
                      ? "Atualize as informações do evento"
                      : "Preencha os dados para criar um novo evento"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-2">
                        Título *
                      </label>
                      <Input
                        name="title"
                        placeholder="Título do evento"
                        defaultValue={editingEvento?.title}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Tipo *
                      </label>
                      <Select
                        name="event_type"
                        defaultValue={editingEvento?.event_type || "reuniao"}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reuniao">Reunião</SelectItem>
                          <SelectItem value="audiencia">Audiência</SelectItem>
                          <SelectItem value="prazo">Prazo</SelectItem>
                          <SelectItem value="entrega">Entrega</SelectItem>
                          <SelectItem value="compromisso">Compromisso</SelectItem>
                          <SelectItem value="videoconferencia">Videoconferência</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Prioridade
                      </label>
                      <Select
                        name="priority"
                        defaultValue={editingEvento?.priority || "normal"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Prioridade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="baixa">Baixa</SelectItem>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="alta">Alta</SelectItem>
                          <SelectItem value="urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-2">
                      Descrição
                    </label>
                    <Textarea
                      name="description"
                      placeholder="Descrição do evento"
                      defaultValue={editingEvento?.description || ""}
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Início * (SP)
                      </label>
                      <Input
                        name="starts_at"
                        type="datetime-local"
                        defaultValue={
                          editingEvento?.starts_at
                            ? editingEvento.starts_at.slice(0, 16)
                            : ""
                        }
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Fim (SP)
                      </label>
                      <Input
                        name="ends_at"
                        type="datetime-local"
                        defaultValue={
                          editingEvento?.ends_at
                            ? editingEvento.ends_at.slice(0, 16)
                            : ""
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Local/Endereço
                      </label>
                      <Input
                        name="location"
                        placeholder="Local físico ou descrição"
                        defaultValue={editingEvento?.location || ""}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Link de Vídeo
                      </label>
                      <Input
                        name="video_link"
                        placeholder="https://meet.google.com/xxx"
                        defaultValue={editingEvento?.video_link || ""}
                      />
                    </div>
                  </div>
                  {editingEvento && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Status
                      </label>
                      <Select
                        name="status"
                        defaultValue={editingEvento?.status || "agendado"}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agendado">Agendado</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="em_andamento">Em Andamento</SelectItem>
                          <SelectItem value="realizado">Realizado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                          <SelectItem value="reagendado">Reagendado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter className="flex justify-between">
                  <div>
                    {editingEvento && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir este evento?")) {
                            deleteEventoMutation.mutate(editingEvento.id);
                            setIsDialogOpen(false);
                            setEditingEvento(null);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Excluir
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false);
                        setEditingEvento(null);
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={updateEventoMutation.isPending || quickCreateMutation.isPending}>
                      {(updateEventoMutation.isPending || quickCreateMutation.isPending) && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {editingEvento ? "Atualizar" : "Criar"}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Criação Rápida */}
      {showQuickCreate && (
        <Card className="border-2 border-dashed border-brand-300 bg-brand-50">
          <CardContent className="p-4">
            <form onSubmit={handleQuickCreate} className="space-y-4">
              <h3 className="font-medium text-brand-700 mb-3">
                Criação Rápida com CNJ/CPF
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <Input
                  ref={quickCreateRef}
                  name="quick_title"
                  placeholder="Título do evento *"
                  required
                />
                <Input
                  name="quick_starts_at"
                  type="datetime-local"
                  required
                />
                <Input
                  name="quick_cnj_cpf"
                  placeholder="CNJ ou CPF (opcional)"
                />
                <Input
                  name="quick_video_link"
                  placeholder="Link de vídeo (opcional)"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={quickCreateMutation.isPending}
                >
                  {quickCreateMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Criar Rápido
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowQuickCreate(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtros e Controles */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate("prev")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-lg font-medium min-w-48 text-center">
                  {currentDate.toLocaleDateString("pt-BR", {
                    month: "long",
                    year: "numeric",
                    timeZone: "America/Sao_Paulo",
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate("next")}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Hoje
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Buscar eventos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={viewMode}
                onValueChange={(value: "week" | "month") => setViewMode(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Eventos Próximos (Urgentes) */}
      {eventosProximos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              Próximos Eventos (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {eventosProximos.map((evento: EventoProximo) => (
                <div
                  key={evento.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${getUrgenciaColor(evento.urgencia)}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{evento.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {evento.event_type}
                      </Badge>
                      <Badge className={`text-xs ${getStatusColor(evento.status)}`}>
                        {evento.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-neutral-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {evento.starts_at_formatted}
                      </div>
                      {evento.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {evento.location}
                        </div>
                      )}
                      {evento.cliente_nome && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {evento.cliente_nome}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {evento.video_link && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyVideoLink(evento.video_link!)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Buscar evento completo para edição
                        const eventoCompleto = eventos.find(e => e.id === evento.id);
                        if (eventoCompleto) {
                          setEditingEvento(eventoCompleto);
                          setIsDialogOpen(true);
                        }
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Calendário {viewMode === "week" ? "Semanal" : "Mensal"} (
            {eventos.length} evento{eventos.length !== 1 ? "s" : ""})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: "var(--brand-700)" }}
              />
              <span className="ml-2 text-neutral-600">
                Carregando agenda...
              </span>
            </div>
          ) : (
            <>{viewMode === "week" ? renderWeekView() : renderMonthView()}</>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
