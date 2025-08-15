/**
 * Flow C5: Agenda
 * Behavior Goal: compromissos claros; TZ correta
 * 
 * Features:
 * - Weekly/Monthly calendar views
 * - Event creation with: Título, Início/Fim, Local/Link, CNJ, CPF/CNPJ
 * - São Paulo timezone handling
 * - Clear appointment display
 */

import React, { useState, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Calendar as CalendarIcon,
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
  Copy,
  Bell,
  Calendar as CalendarViewIcon,
  Grid3X3,
  Gavel,
  User,
  Building,
  Link2,
  Save,
  X,
  Eye,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { themeUtils, colors } from "../lib/theme-colors";
import { formatCNJ } from "../lib/utils";

interface EventoAgenda {
  id: string;
  title: string;
  description?: string;
  event_type: "reuniao" | "audiencia" | "prazo" | "entrega" | "compromisso" | "videoconferencia" | "outros";
  priority: "baixa" | "normal" | "alta" | "urgente";
  status: "agendado" | "confirmado" | "em_andamento" | "realizado" | "cancelado" | "reagendado";
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  video_link: string | null;
  numero_cnj: string | null;
  cliente_cpfcnpj: string | null;
  stage_instance_id: string | null;
  created_at: string;
  updated_at: string;
}

interface EventoFormData {
  title: string;
  description: string;
  event_type: string;
  priority: string;
  starts_at: string;
  ends_at: string;
  location: string;
  video_link: string;
  numero_cnj: string;
  cliente_cpfcnpj: string;
}

export default function AgendaC5() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<EventoAgenda | null>(null);
  const [selectedEvento, setSelectedEvento] = useState<EventoAgenda | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // São Paulo timezone configuration
  const SP_TIMEZONE = "America/Sao_Paulo";

  const formatToSaoPauloTime = (date: Date): string => {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: SP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date).replace(" ", "T");
  };

  const formatDisplayDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: SP_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  const formatDisplayTime = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: SP_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === "week") {
      // Semana atual (domingo a sábado)
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      end.setDate(start.getDate() + 6);
    } else {
      // Mês atual
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  };

  // Fetch events for current period
  const {
    data: eventos = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agenda-c5", currentDate.toISOString(), viewMode],
    queryFn: async () => {
      const { start, end } = getDateRange();

      const { data, error } = await lf
        .from("eventos_agenda")
        .select("*")
        .gte("starts_at", start)
        .lte("starts_at", end)
        .order("starts_at", { ascending: true });

      if (error) throw error;
      return data as EventoAgenda[];
    },
  });

  // Create event mutation
  const createEventoMutation = useMutation({
    mutationFn: async (eventoData: EventoFormData) => {
      const { data, error } = await lf
        .from("eventos_agenda")
        .insert([{
          title: eventoData.title,
          description: eventoData.description || null,
          event_type: eventoData.event_type as any,
          priority: eventoData.priority as any,
          status: "agendado",
          starts_at: eventoData.starts_at,
          ends_at: eventoData.ends_at || null,
          location: eventoData.location || null,
          video_link: eventoData.video_link || null,
          numero_cnj: eventoData.numero_cnj || null,
          cliente_cpfcnpj: eventoData.cliente_cpfcnpj || null,
        }])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-c5"] });
      setIsCreateDialogOpen(false);
      setEditingEvento(null);
      toast({
        title: "Evento criado",
        description: "Novo compromisso adicionado à agenda",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar evento",
        description: error.message || "Erro ao salvar evento",
        variant: "destructive",
      });
    },
  });

  // Update event mutation
  const updateEventoMutation = useMutation({
    mutationFn: async ({ id, ...eventoData }: EventoFormData & { id: string }) => {
      const { data, error } = await lf
        .from("eventos_agenda")
        .update({
          title: eventoData.title,
          description: eventoData.description || null,
          event_type: eventoData.event_type as any,
          priority: eventoData.priority as any,
          starts_at: eventoData.starts_at,
          ends_at: eventoData.ends_at || null,
          location: eventoData.location || null,
          video_link: eventoData.video_link || null,
          numero_cnj: eventoData.numero_cnj || null,
          cliente_cpfcnpj: eventoData.cliente_cpfcnpj || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-c5"] });
      setIsCreateDialogOpen(false);
      setEditingEvento(null);
      toast({
        title: "Evento atualizado",
        description: "Compromisso atualizado com sucesso",
      });
    },
  });

  // Delete event mutation
  const deleteEventoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await lf
        .from("eventos_agenda")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-c5"] });
      setIsViewDialogOpen(false);
      setSelectedEvento(null);
      toast({
        title: "Evento removido",
        description: "Compromisso removido da agenda",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const eventoData: EventoFormData = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      event_type: formData.get("event_type") as string,
      priority: formData.get("priority") as string,
      starts_at: formData.get("starts_at") as string,
      ends_at: formData.get("ends_at") as string,
      location: formData.get("location") as string,
      video_link: formData.get("video_link") as string,
      numero_cnj: formData.get("numero_cnj") as string,
      cliente_cpfcnpj: formData.get("cliente_cpfcnpj") as string,
    };

    if (editingEvento) {
      updateEventoMutation.mutate({ ...eventoData, id: editingEvento.id });
    } else {
      createEventoMutation.mutate(eventoData);
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

  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case "audiencia":
        return "bg-red-100 text-red-800 border-red-200";
      case "reuniao":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "prazo":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "entrega":
        return "bg-green-100 text-green-800 border-green-200";
      case "videoconferencia":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "urgente":
        return "bg-red-500";
      case "alta":
        return "bg-orange-500";
      case "normal":
        return "bg-blue-500";
      case "baixa":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getCurrentPeriodText = (): string => {
    if (viewMode === "week") {
      const { start, end } = getDateRange();
      return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
    } else {
      return new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(currentDate);
    }
  };

  const renderWeekView = () => {
    const { start } = getDateRange();
    const weekStart = new Date(start);
    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Headers */}
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dayName, index) => (
          <div key={dayName} className="p-2 text-center font-medium text-sm" style={{ color: colors.neutral[600] }}>
            {dayName}
          </div>
        ))}
        
        {/* Day cells */}
        {days.map((day, index) => {
          const dayEvents = eventos.filter(evento => {
            const eventoDate = new Date(evento.starts_at);
            return eventoDate.toDateString() === day.toDateString();
          });

          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div
              key={index}
              className={`min-h-[120px] p-2 border rounded-lg ${
                isToday ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
              }`}
            >
              <div className={`text-sm font-medium mb-2 ${
                isToday ? "text-blue-700" : "text-gray-700"
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.map((evento) => (
                  <div
                    key={evento.id}
                    onClick={() => {
                      setSelectedEvento(evento);
                      setIsViewDialogOpen(true);
                    }}
                    className={`p-1 rounded text-xs cursor-pointer hover:opacity-80 border ${getEventTypeColor(evento.event_type)}`}
                  >
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(evento.priority)}`} />
                      <span className="font-medium truncate">{formatDisplayTime(evento.starts_at)}</span>
                    </div>
                    <div className="truncate">{evento.title}</div>
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
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Headers */}
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((dayName) => (
          <div key={dayName} className="p-2 text-center font-medium text-sm" style={{ color: colors.neutral[600] }}>
            {dayName}
          </div>
        ))}
        
        {/* Day cells */}
        {days.map((day, index) => {
          const dayEvents = eventos.filter(evento => {
            const eventoDate = new Date(evento.starts_at);
            return eventoDate.toDateString() === day.toDateString();
          });

          const isCurrentMonth = day.getMonth() === month;
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div
              key={index}
              className={`min-h-[80px] p-1 border rounded ${
                isCurrentMonth 
                  ? isToday 
                    ? "bg-blue-50 border-blue-200" 
                    : "bg-white border-gray-200"
                  : "bg-gray-50 border-gray-100"
              }`}
            >
              <div className={`text-xs font-medium mb-1 ${
                isCurrentMonth 
                  ? isToday 
                    ? "text-blue-700" 
                    : "text-gray-700"
                  : "text-gray-400"
              }`}>
                {day.getDate()}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((evento) => (
                  <div
                    key={evento.id}
                    onClick={() => {
                      setSelectedEvento(evento);
                      setIsViewDialogOpen(true);
                    }}
                    className={`p-1 rounded text-xs cursor-pointer hover:opacity-80 border truncate ${getEventTypeColor(evento.event_type)}`}
                  >
                    {evento.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-xs text-gray-500">+{dayEvents.length - 2} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.semantic.error }} />
            <h3 className="text-lg font-medium mb-2">Erro ao carregar agenda</h3>
            <p className="text-neutral-600 mb-4">{error.message}</p>
            <Button onClick={() => window.location.reload()}>Tentar novamente</Button>
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
          <h1 className="text-2xl font-heading font-semibold" style={{ color: colors.neutral[900] }}>
            Agenda
          </h1>
          <p className="text-neutral-600 mt-1">
            Compromissos claros com timezone São Paulo
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingEvento(null);
            setIsCreateDialogOpen(true);
          }}
          style={themeUtils.primaryButton}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {/* Controls */}
      <Card style={themeUtils.cardShadow}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate("prev")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="font-medium min-w-[200px] text-center">
                  {getCurrentPeriodText()}
                </span>
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
              <Button
                variant={viewMode === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("week")}
                style={viewMode === "week" ? themeUtils.primaryButton : {}}
              >
                <CalendarViewIcon className="w-4 h-4 mr-2" />
                Semana
              </Button>
              <Button
                variant={viewMode === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("month")}
                style={viewMode === "month" ? themeUtils.primaryButton : {}}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Mês
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <Card style={themeUtils.elevatedCardShadow}>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.primary }} />
              <span className="ml-2">Carregando agenda...</span>
            </div>
          ) : (
            <>
              {viewMode === "week" ? renderWeekView() : renderMonthView()}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Event Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingEvento ? "Editar Evento" : "Novo Evento"}
              </DialogTitle>
              <DialogDescription>
                Preencha os dados do compromisso (timezone: São Paulo)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Título *
                  </label>
                  <Input
                    name="title"
                    defaultValue={editingEvento?.title}
                    placeholder="Título do evento"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    Descrição
                  </label>
                  <Textarea
                    name="description"
                    defaultValue={editingEvento?.description}
                    placeholder="Descrição opcional do evento"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Tipo *
                  </label>
                  <Select name="event_type" defaultValue={editingEvento?.event_type || "compromisso"} required>
                    <SelectTrigger>
                      <SelectValue />
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
                    Prioridade *
                  </label>
                  <Select name="priority" defaultValue={editingEvento?.priority || "normal"} required>
                    <SelectTrigger>
                      <SelectValue />
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

              {/* Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Data/Hora Início *
                  </label>
                  <Input
                    name="starts_at"
                    type="datetime-local"
                    defaultValue={editingEvento?.starts_at ? editingEvento.starts_at.slice(0, 16) : ""}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Data/Hora Fim
                  </label>
                  <Input
                    name="ends_at"
                    type="datetime-local"
                    defaultValue={editingEvento?.ends_at ? editingEvento.ends_at.slice(0, 16) : ""}
                  />
                </div>
              </div>

              {/* Location and Link */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Local
                  </label>
                  <Input
                    name="location"
                    defaultValue={editingEvento?.location || ""}
                    placeholder="Local do evento"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Link (Videoconferência)
                  </label>
                  <Input
                    name="video_link"
                    type="url"
                    defaultValue={editingEvento?.video_link || ""}
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              </div>

              {/* Legal References */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    CNJ
                  </label>
                  <Input
                    name="numero_cnj"
                    defaultValue={editingEvento?.numero_cnj || ""}
                    placeholder="0000000-00.0000.0.00.0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    CPF/CNPJ
                  </label>
                  <Input
                    name="cliente_cpfcnpj"
                    defaultValue={editingEvento?.cliente_cpfcnpj || ""}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingEvento(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createEventoMutation.isPending || updateEventoMutation.isPending}
                style={themeUtils.primaryButton}
              >
                {(createEventoMutation.isPending || updateEventoMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                <Save className="w-4 h-4 mr-2" />
                {editingEvento ? "Atualizar" : "Criar"} Evento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Event Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          {selectedEvento && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getPriorityColor(selectedEvento.priority)}`} />
                  {selectedEvento.title}
                </DialogTitle>
                <DialogDescription>
                  Detalhes do compromisso
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Tipo</label>
                    <div className={`mt-1 inline-block px-2 py-1 rounded-md text-xs border ${getEventTypeColor(selectedEvento.event_type)}`}>
                      {selectedEvento.event_type}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Prioridade</label>
                    <p className="text-sm capitalize">{selectedEvento.priority}</p>
                  </div>
                </div>

                {selectedEvento.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Descrição</label>
                    <p className="text-sm mt-1">{selectedEvento.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Início</label>
                    <p className="text-sm">
                      {formatDisplayDate(selectedEvento.starts_at)} às {formatDisplayTime(selectedEvento.starts_at)}
                    </p>
                  </div>
                  {selectedEvento.ends_at && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Fim</label>
                      <p className="text-sm">
                        {formatDisplayDate(selectedEvento.ends_at)} às {formatDisplayTime(selectedEvento.ends_at)}
                      </p>
                    </div>
                  )}
                </div>

                {selectedEvento.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Local</label>
                    <p className="text-sm flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      {selectedEvento.location}
                    </p>
                  </div>
                )}

                {selectedEvento.video_link && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Link da Videoconferência</label>
                    <p className="text-sm">
                      <a
                        href={selectedEvento.video_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        Abrir videoconferência
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                )}

                {selectedEvento.numero_cnj && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Processo</label>
                    <p className="text-sm flex items-center gap-2">
                      <Gavel className="w-4 h-4" />
                      {formatCNJ(selectedEvento.numero_cnj)}
                    </p>
                  </div>
                )}

                {selectedEvento.cliente_cpfcnpj && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Cliente</label>
                    <p className="text-sm flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {selectedEvento.cliente_cpfcnpj}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => deleteEventoMutation.mutate(selectedEvento.id)}
                  disabled={deleteEventoMutation.isPending}
                  className="text-red-600 hover:text-red-700"
                >
                  {deleteEventoMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingEvento(selectedEvento);
                    setIsViewDialogOpen(false);
                    setIsCreateDialogOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                <Button onClick={() => setIsViewDialogOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
