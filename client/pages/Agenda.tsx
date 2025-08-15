import React from "react";
import { SF7AgendaEnhanced } from "../components/SF7AgendaEnhanced";

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

  // P2.5 - TZ: America/Manaus no client
  const getBrasiliaTime = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Manaus",
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

  // P2.5 - Buscar eventos por janela de tempo + paginação
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

  // P2.5 - Mutation para criar/editar evento
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
      timeZone: "America/Manaus",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      timeZone: "America/Manaus",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      timeZone: "America/Manaus",
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
              className={`min-h-32 p-2 border rounded ${isToday ? "bg-blue-50 border-blue-200" : "bg-white border-neutral-200"}`}
            >
              <div className="text-center mb-2">
                <div className="text-xs text-neutral-500">
                  {day.toLocaleDateString("pt-BR", { weekday: "short" })}
                </div>
                <div
                  className={`text-sm font-medium ${isToday ? "text-blue-600" : "text-neutral-900"}`}
                >
                  {day.getDate()}
                </div>
              </div>
              <div className="space-y-1">
                {dayEventos.map((evento) => (
                  <div
                    key={evento.id}
                    className="text-xs p-1 rounded cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: "var(--brand-100)",
                      color: "var(--brand-700)",
                    }}
                    onClick={() => {
                      setEditingEvento(evento);
                      setIsDialogOpen(true);
                    }}
                  >
                    <div className="font-medium truncate">{evento.title}</div>
                    <div className="text-xs opacity-75">
                      {formatTime(evento.starts_at)}
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
    const monthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const monthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );
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
            className="p-2 text-center text-sm font-medium text-neutral-600 border-b"
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
                    : "bg-white border-neutral-200"
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
                    className="text-xs p-1 rounded cursor-pointer hover:opacity-80 truncate"
                    style={{
                      backgroundColor: "var(--brand-100)",
                      color: "var(--brand-700)",
                    }}
                    onClick={() => {
                      setEditingEvento(evento);
                      setIsDialogOpen(true);
                    }}
                  >
                    {evento.title}
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
              Compromissos, prazos e eventos
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
            Compromissos, prazos e eventos
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
          <DialogContent className="max-w-md">
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
                <div>
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
                    defaultValue={editingEvento?.event_type}
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
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Início *
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
                      Fim
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
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Local/Link
                  </label>
                  <Input
                    name="location"
                    placeholder="Local físico ou link da reunião"
                    defaultValue={editingEvento?.location || ""}
                  />
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
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Referência Externa
                  </label>
                  <Input
                    name="external_ref"
                    placeholder="CNJ, número do processo, etc."
                    defaultValue={editingEvento?.external_ref || ""}
                  />
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
                    timeZone: "America/Manaus",
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

      {/* Calendar */}
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

      {/* Lista de Eventos */}
      {eventos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Próximos Eventos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {eventos.slice(0, 5).map((evento) => (
                <div
                  key={evento.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-neutral-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{evento.title}</h4>
                      <Badge variant="outline" className="text-xs">
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
                          <MapPin className="w-3 h-3" />
                          {evento.location}
                        </div>
                      )}
                      {evento.cliente_cpfcnpj && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {clientes.find(
                            (c) => c.cpfcnpj === evento.cliente_cpfcnpj,
                          )?.nome || evento.cliente_cpfcnpj}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {evento.external_ref && (
                      <Button variant="ghost" size="sm">
                        <ExternalLink className="w-4 h-4" />
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
    </div>
  );
}
