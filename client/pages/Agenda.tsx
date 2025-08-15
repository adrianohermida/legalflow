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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
  Copy,
  Bell,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface EventoAgenda {
  id: string;
  stage_instance_id: string | null;
  event_type: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  external_ref: string | null;
  cliente_cpfcnpj: string | null;
  created_at: string;
}

interface EventoFormData {
  event_type: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string;
  external_ref: string;
  cliente_cpfcnpj: string;
}

export function Agenda() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<EventoAgenda | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // TZ: America/Sao_Paulo no client
  const getSaoPauloTime = (date: Date) => {
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

  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === "week") {
      // Semana atual
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      end.setDate(start.getDate() + 6);
    } else {
      // Mês atual
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    return {
      from: start.toISOString().split("T")[0] + "T00:00:00",
      to: end.toISOString().split("T")[0] + "T23:59:59",
    };
  };

  // Buscar eventos por janela de tempo + paginação
  const {
    data: eventos = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["eventos-agenda", currentDate, viewMode],
    queryFn: async () => {
      const { from, to } = getDateRange();

      const { data, error } = await lf
        .from("eventos_agenda")
        .select("*")
        .gte("starts_at", from)
        .lte("starts_at", to)
        .order("starts_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Buscar clientes para associar aos eventos
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-agenda"],
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

  // Mutation para criar/editar evento
  const eventoMutation = useMutation({
    mutationFn: async (eventoData: EventoFormData) => {
      const dataToSave = {
        ...eventoData,
        cliente_cpfcnpj: eventoData.cliente_cpfcnpj || null,
        location: eventoData.location || null,
        external_ref: eventoData.external_ref || null,
        ends_at: eventoData.ends_at || null,
      };

      const { data, error } = editingEvento
        ? await lf
            .from("eventos_agenda")
            .update(dataToSave)
            .eq("id", editingEvento.id)
            .select()
        : await lf.from("eventos_agenda").insert([dataToSave]).select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["eventos-agenda"] });
      setIsDialogOpen(false);
      setEditingEvento(null);
      toast({
        title: editingEvento ? "Evento atualizado" : "Evento criado",
        description: editingEvento
          ? "Evento atualizado com sucesso"
          : "Novo evento adicionado à agenda",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar evento",
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
      queryClient.invalidateQueries({ queryKey: ["eventos-agenda"] });
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

  const handleSubmitEvento = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const eventoData: EventoFormData = {
      event_type: formData.get("event_type") as string,
      title: formData.get("title") as string,
      starts_at: formData.get("starts_at") as string,
      ends_at: formData.get("ends_at") as string,
      location: formData.get("location") as string,
      external_ref: formData.get("external_ref") as string,
      cliente_cpfcnpj: formData.get("cliente_cpfcnpj") as string,
    };

    eventoMutation.mutate(eventoData);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
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

  const getEventosByDay = (day: Date) => {
    const dayStr = day.toISOString().split("T")[0];
    return eventos.filter((evento) => evento.starts_at.startsWith(dayStr));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado",
      description: "Informação copiada para a área de transferência",
    });
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "audiencia": return "bg-red-100 text-red-700 border-red-200";
      case "reuniao": return "bg-blue-100 text-blue-700 border-blue-200";
      case "prazo": return "bg-orange-100 text-orange-700 border-orange-200";
      case "entrega": return "bg-green-100 text-green-700 border-green-200";
      case "compromisso": return "bg-purple-100 text-purple-700 border-purple-200";
      case "videoconferencia": return "bg-indigo-100 text-indigo-700 border-indigo-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
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
                      getEventTypeColor(evento.event_type)
                    }`}
                    onClick={() => {
                      setEditingEvento(evento);
                      setIsDialogOpen(true);
                    }}
                  >
                    <div className="font-medium truncate">{evento.title}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs opacity-75">
                        {formatTime(evento.starts_at)}
                      </span>
                      {evento.location?.includes("http") && (
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
                      getEventTypeColor(evento.event_type)
                    }`}
                    onClick={() => {
                      setEditingEvento(evento);
                      setIsDialogOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {evento.location?.includes("http") && <Video className="w-3 h-3" />}
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

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold">Agenda</h1>
            <p className="text-neutral-600 mt-1">
              Compromissos, prazos e eventos (TZ: America/São_Paulo)
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Erro ao carregar agenda
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
          <h1 className="text-2xl font-heading font-semibold">Agenda</h1>
          <p className="text-neutral-600 mt-1">
            Compromissos, prazos e eventos • TZ: America/São_Paulo
          </p>
        </div>
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
                      placeholder="Local físico ou link de vídeo"
                      defaultValue={editingEvento?.location || ""}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Referência (CNJ/CPF)
                    </label>
                    <Input
                      name="external_ref"
                      placeholder="Número do processo, CPF do cliente, etc."
                      defaultValue={editingEvento?.external_ref || ""}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cliente
                  </label>
                  <Select
                    name="cliente_cpfcnpj"
                    defaultValue={editingEvento?.cliente_cpfcnpj || ""}
                  >
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
              </div>
              <DialogFooter className="flex justify-between">
                <div>
                  {editingEvento && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm("Tem certeza que deseja excluir este evento?")
                        ) {
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
                  <Button type="submit" disabled={eventoMutation.isPending}>
                    {eventoMutation.isPending && (
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

      {/* Controls */}
      <Card>
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

      {/* Eventos Próximos */}
      {eventos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              Próximos Eventos ({eventos.filter(e => new Date(e.starts_at) >= new Date()).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {eventos
                .filter(evento => new Date(evento.starts_at) >= new Date())
                .slice(0, 5)
                .map((evento) => (
                  <div
                    key={evento.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-neutral-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">{evento.title}</h4>
                        <Badge className={`text-xs ${getEventTypeColor(evento.event_type)}`}>
                          {evento.event_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-neutral-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(evento.starts_at)}
                        </div>
                        {evento.location && (
                          <div className="flex items-center gap-1">
                            {evento.location.includes("http") ? (
                              <Video className="w-3 h-3" />
                            ) : (
                              <MapPin className="w-3 h-3" />
                            )}
                            {evento.location.length > 30 
                              ? evento.location.substring(0, 30) + "..." 
                              : evento.location}
                          </div>
                        )}
                        {evento.external_ref && (
                          <div className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {evento.external_ref}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {evento.location?.includes("http") && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => copyToClipboard(evento.location!)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingEvento(evento);
                          setIsDialogOpen(true);
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
