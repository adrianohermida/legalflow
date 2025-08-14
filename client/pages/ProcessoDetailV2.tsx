import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  RefreshCw,
  Plus,
  MessageSquare,
  Calendar,
  FileText,
  Users,
  Activity,
  Settings,
  Download,
  ExternalLink,
  Bell,
  Clock,
  Building,
  Gavel,
  User,
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  ArrowLeft,
  Eye,
  MoreHorizontal,
  PlayCircle,
  Upload,
  Folder,
  Link2,
  Target,
  UserPlus,
  CalendarPlus,
  FileUp,
  Radio,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { supabase, lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatCNJ, formatDate } from "../lib/utils";
import ProcessoChatDrawer from "../components/ProcessoChatDrawer";
import { useProcessoRealtimeUpdates } from "../hooks/useRealtimeUpdates";

interface Processo {
  numero_cnj: string;
  tribunal_sigla: string;
  titulo_polo_ativo: string;
  titulo_polo_passivo: string;
  data: any;
  created_at: string;
}

interface MonitoringSettings {
  numero_cnj: string;
  provider: "advise" | "escavador";
  premium_on: boolean;
  active: boolean;
  last_sync: string;
}

interface Parte {
  id: number;
  nome: string;
  cpfcnpj: string;
  polo: string;
  tipo: string;
  papel: string;
  raw: any;
}

export default function ProcessoDetailV2() {
  const { numero_cnj } = useParams<{ numero_cnj: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("capa");
  const [searchTerm, setSearchTerm] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  const [showChatDrawer, setShowChatDrawer] = useState(false);

  // Dialogs state
  const [isMonitoringDialogOpen, setIsMonitoringDialogOpen] = useState(false);
  const [isNovaConversaOpen, setIsNovaConversaOpen] = useState(false);
  const [isNovaTarefaOpen, setIsNovaTarefaOpen] = useState(false);
  const [isNovoEventoOpen, setIsNovoEventoOpen] = useState(false);
  const [isAnexarDocOpen, setIsAnexarDocOpen] = useState(false);
  const [isVincularClienteOpen, setIsVincularClienteOpen] = useState(false);
  const [selectedParte, setSelectedParte] = useState<Parte | null>(null);

  // Pagination
  const [movimentacoesPage, setMovimentacoesPage] = useState(1);
  const [publicacoesPage, setPublicacoesPage] = useState(1);
  const itemsPerPage = 20;

  if (!numero_cnj) {
    return <div>CNJ não fornecido</div>;
  }

  // Enable realtime updates for this processo
  useProcessoRealtimeUpdates(numero_cnj);

  // Query processo
  const {
    data: processo,
    isLoading: processoLoading,
    refetch: refetchProcesso,
  } = useQuery({
    queryKey: ["processo", numero_cnj],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("*")
        .eq("numero_cnj", numero_cnj)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as Processo;
    },
  });

  // Query monitoring settings
  const { data: monitoringSettings, refetch: refetchMonitoring } = useQuery({
    queryKey: ["monitoring-settings", numero_cnj],
    queryFn: async () => {
      const { data, error } = await lf
        .from("monitoring_settings")
        .select("*")
        .eq("numero_cnj", numero_cnj)
        .single();

      if (error && error.code !== "PGRST116") return null;
      return data as MonitoringSettings;
    },
  });

  // Query partes
  const { data: partes = [], refetch: refetchPartes } = useQuery({
    queryKey: ["partes", numero_cnj],
    queryFn: async () => {
      const { data, error } = await lf
        .from("partes_processo")
        .select("*")
        .eq("numero_cnj", numero_cnj);

      if (error) throw error;
      return data as Parte[];
    },
  });

  // Query movimentações
  const {
    data: movimentacoes = [],
    isLoading: movimentacoesLoading,
    refetch: refetchMovimentacoes,
  } = useQuery({
    queryKey: ["movimentacoes", numero_cnj, movimentacoesPage],
    queryFn: async () => {
      const offset = (movimentacoesPage - 1) * itemsPerPage;
      const { data, error } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("numero_cnj", numero_cnj)
        .order("data_movimentacao", { ascending: false, nullsLast: true })
        .range(offset, offset + itemsPerPage - 1);

      if (error) throw error;
      return data;
    },
  });

  // Query publicações unificadas
  const {
    data: publicacoes = [],
    isLoading: publicacoesLoading,
    refetch: refetchPublicacoes,
  } = useQuery({
    queryKey: ["publicacoes-unificadas", numero_cnj, publicacoesPage],
    queryFn: async () => {
      const offset = (publicacoesPage - 1) * itemsPerPage;
      const { data, error } = await supabase
        .from("vw_publicacoes_unificadas")
        .select("*")
        .eq("numero_cnj", numero_cnj)
        .order("occured_at", { ascending: false, nullsLast: true })
        .range(offset, offset + itemsPerPage - 1);

      if (error) throw error;
      return data;
    },
  });

  // Query documentos
  const { data: documentos = [] } = useQuery({
    queryKey: ["documentos", numero_cnj],
    queryFn: async () => {
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .eq("metadata->>numero_cnj", numero_cnj);

      const { data: peticoes, error: peticoesError } = await supabase
        .from("peticoes")
        .select("*")
        .eq("numero_cnj", numero_cnj);

      return [
        ...(docs || []).map((d) => ({ ...d, tipo: "documento" })),
        ...(peticoes || []).map((p) => ({ ...p, tipo: "peticao" })),
      ];
    },
  });

  // Query clientes para vincular
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-para-vincular"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("cpfcnpj, nome")
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  // Initialize premium state
  useEffect(() => {
    if (monitoringSettings) {
      setPremiumEnabled(monitoringSettings.premium_on);
    }
  }, [monitoringSettings]);

  // Mutation para sync partes
  const syncPartesMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await lf.rpc("lf_sync_partes", {
        p_cnj: numero_cnj,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (count) => {
      refetchPartes();
      toast({
        title: "Partes sincronizadas",
        description: `${count} partes foram processadas`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar monitoramento
  const updateMonitoringMutation = useMutation({
    mutationFn: async ({
      premium,
      active,
    }: {
      premium: boolean;
      active: boolean;
    }) => {
      const { data, error } = await lf.from("monitoring_settings").upsert({
        numero_cnj,
        provider: premium ? "escavador" : "advise",
        premium_on: premium,
        active,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchMonitoring();
      toast({
        title: "Monitoramento atualizado",
        description: "Configurações salvas com sucesso",
      });
    },
  });

  // Mutation para criar tarefa
  const createTarefaMutation = useMutation({
    mutationFn: async ({
      titulo,
      descricao,
      due_date,
    }: {
      titulo: string;
      descricao: string;
      due_date: string;
    }) => {
      const { data, error } = await lf.from("activities").insert({
        numero_cnj,
        title: titulo,
        description: descricao,
        due_at: due_date,
        status: "pending",
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setIsNovaTarefaOpen(false);
      toast({
        title: "Tarefa criada",
        description: "Nova tarefa adicionada ao processo",
      });
    },
  });

  // Mutation para criar evento
  const createEventoMutation = useMutation({
    mutationFn: async ({
      titulo,
      data,
      hora,
    }: {
      titulo: string;
      data: string;
      hora: string;
    }) => {
      const { data: evento, error } = await lf.from("eventos_agenda").insert({
        numero_cnj,
        title: titulo,
        scheduled_at: `${data}T${hora}:00`,
        duration_minutes: 60,
        timezone: "America/Manaus",
      });

      if (error) throw error;
      return evento;
    },
    onSuccess: () => {
      setIsNovoEventoOpen(false);
      toast({
        title: "Evento criado",
        description: "Novo evento adicionado à agenda",
      });
    },
  });

  // Mutation para vincular cliente
  const vincularClienteMutation = useMutation({
    mutationFn: async ({ cpfcnpj }: { cpfcnpj: string }) => {
      const { data, error } = await supabase
        .from("clientes_processos")
        .upsert({ cpfcnpj, numero_cnj });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setIsVincularClienteOpen(false);
      setSelectedParte(null);
      toast({
        title: "Cliente vinculado",
        description: "Parte vinculada como cliente",
      });
    },
  });

  const handleCopyCNJ = () => {
    navigator.clipboard.writeText(numero_cnj);
    toast({
      title: "CNJ copiado",
      description: "Número CNJ copiado para área de transferência",
    });
  };

  const handleAtualizar = async () => {
    setIsUpdating(true);
    try {
      await refetchProcesso();
      await refetchMovimentacoes();
      await refetchPublicacoes();
      await refetchPartes();
      toast({
        title: "Dados atualizados",
        description: "Informações do processo foram atualizadas",
      });
    } catch (error) {
      toast({
        title: "Erro na atualização",
        description: "Erro ao atualizar dados do processo",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getCapa = () => {
    if (!processo?.data) return null;
    return processo.data.capa || processo.data.fontes?.[0]?.capa || null;
  };

  const getAudiencias = () => {
    if (!processo?.data) return [];
    return (
      processo.data.audiencias || processo.data.fontes?.[0]?.audiencias || []
    );
  };

  const getResumoMovimentacao = (mov: any) => {
    return (
      mov.data?.texto ||
      mov.data?.resumo ||
      mov.data?.movimento ||
      "Movimentação"
    );
  };

  const getResumoPublicacao = (pub: any) => {
    return (
      pub.payload?.resumo ||
      pub.payload?.texto ||
      pub.payload?.conteudo ||
      "Publicação"
    );
  };

  const filteredMovimentacoes = movimentacoes.filter((mov) =>
    getResumoMovimentacao(mov).toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredPublicacoes = publicacoes.filter((pub) =>
    getResumoPublicacao(pub).toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const capa = getCapa();
  const audiencias = getAudiencias();
  const partesAtivo = partes.filter((p) => p.polo === "ATIVO");
  const partesPassivo = partes.filter((p) => p.polo === "PASSIVO");
  const advogados = partes.filter((p) => p.polo === "ADVOGADO");

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-neutral-200 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/processos")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Processos
              </Button>

              <div className="border-l border-neutral-200 pl-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyCNJ}
                    className="text-lg font-mono font-semibold"
                  >
                    {formatCNJ(numero_cnj)}
                    <Copy className="w-4 h-4 ml-2" />
                  </Button>

                  {processo && (
                    <div className="text-neutral-600">
                      <span className="font-medium">
                        {processo.titulo_polo_ativo}
                      </span>
                      {processo.titulo_polo_passivo && (
                        <span> × {processo.titulo_polo_passivo}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Status do monitoramento */}
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <Radio
                      className={`w-3 h-3 ${monitoringSettings?.active ? "text-green-500" : "text-gray-400"}`}
                    />
                    <span className="text-sm text-neutral-600">
                      Fonte:{" "}
                      {monitoringSettings?.premium_on
                        ? "Escavador Premium"
                        : "Advise"}
                    </span>
                  </div>

                  {monitoringSettings?.last_sync && (
                    <div className="text-sm text-neutral-500">
                      ��ltima sync: {formatDate(monitoringSettings.last_sync)}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAtualizar}
                disabled={isUpdating}
              >
                <RefreshCw
                  className={`w-4 h-4 mr-2 ${isUpdating ? "animate-spin" : ""}`}
                />
                Atualizar
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMonitoringDialogOpen(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNovaConversaOpen(true)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Nova Conversa
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsNovaTarefaOpen(true)}>
                    <Target className="w-4 h-4 mr-2" />
                    Nova Tarefa
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsNovoEventoOpen(true)}>
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    Novo Evento
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsAnexarDocOpen(true)}>
                    <FileUp className="w-4 h-4 mr-2" />
                    Anexar Documento
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChatDrawer(true)}
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Filtrar itens nas abas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-6">
            <TabsTrigger value="capa">Capa</TabsTrigger>
            <TabsTrigger value="audiencias">
              Audiências ({audiencias.length})
            </TabsTrigger>
            <TabsTrigger value="partes">Partes ({partes.length})</TabsTrigger>
            <TabsTrigger value="movimentacoes">
              Movimentações ({filteredMovimentacoes.length})
            </TabsTrigger>
            <TabsTrigger value="publicacoes">
              Publicações ({filteredPublicacoes.length})
            </TabsTrigger>
            <TabsTrigger value="documentos">
              Documentos ({documentos.length})
            </TabsTrigger>
          </TabsList>

          {/* Capa Tab */}
          <TabsContent value="capa">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Dados da Capa</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncPartesMutation.mutate()}
                    disabled={syncPartesMutation.isPending}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Sincronizar Partes
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {processoLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-4 bg-neutral-200 rounded animate-pulse"
                      />
                    ))}
                  </div>
                ) : capa ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-neutral-600">
                          Tribunal
                        </Label>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {processo?.tribunal_sigla ||
                              capa.tribunal_sigla ||
                              "-"}
                          </p>
                          <p className="text-xs text-neutral-500">
                            {capa.tribunal_nome || "-"}
                          </p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-neutral-600">
                          Área
                        </Label>
                        <p className="text-sm">{capa.area || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-neutral-600">
                          Classe
                        </Label>
                        <p className="text-sm">{capa.classe || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-neutral-600">
                          Assunto
                        </Label>
                        <p className="text-sm">{capa.assunto || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-neutral-600">
                          Instância/Grau
                        </Label>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {capa.instancia || "1ª Instância"}
                          </Badge>
                          {capa.grau && (
                            <Badge variant="outline">Grau {capa.grau}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-neutral-600">
                          Valor da Causa
                        </Label>
                        <p className="text-sm font-medium">
                          {capa.valor_formatado ||
                            (capa.valor_causa
                              ? `R$ ${Number(capa.valor_causa).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                              : "-")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-neutral-600">
                          Situação/Status
                        </Label>
                        <div className="flex gap-2">
                          {capa.situacao && (
                            <Badge variant="secondary">{capa.situacao}</Badge>
                          )}
                          {capa.status && (
                            <Badge variant="outline">{capa.status}</Badge>
                          )}
                          {!capa.situacao && !capa.status && (
                            <span className="text-sm">-</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-neutral-600">
                          Órgão Julgador
                        </Label>
                        <p className="text-sm">{capa.orgao_julgador || "-"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-neutral-600">
                          Data de Distribuição
                        </Label>
                        <p className="text-sm">
                          {capa.data_distribuicao
                            ? formatDate(capa.data_distribuicao)
                            : "-"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-neutral-600">
                          Data de Ajuizamento
                        </Label>
                        <p className="text-sm">
                          {capa.data_ajuizamento
                            ? formatDate(capa.data_ajuizamento)
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <p className="text-neutral-500 mb-4">
                      Dados da capa não disponíveis
                    </p>
                    <Button onClick={handleAtualizar}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Buscar Dados
                    </Button>
                  </div>
                )}

                {/* Audiências Futuras */}
                {audiencias.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-3">Audiências Futuras</h3>
                    <div className="space-y-2">
                      {audiencias.slice(0, 3).map((aud: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg"
                        >
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium">{aud.tipo}</p>
                            <p className="text-xs text-neutral-600">
                              {formatDate(aud.data)} - {aud.situacao}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audiências Tab */}
          <TabsContent value="audiencias">
            <Card>
              <CardHeader>
                <CardTitle>Audiências ({audiencias.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {audiencias.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Situação</TableHead>
                        <TableHead>Participantes</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {audiencias.map((aud: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell>{formatDate(aud.data)}</TableCell>
                          <TableCell>{aud.tipo}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                aud.situacao === "Realizada"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {aud.situacao}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {aud.participantes?.join(", ") || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsNovoEventoOpen(true)}
                            >
                              <CalendarPlus className="w-4 h-4 mr-1" />
                              Agendar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <p className="text-neutral-500">
                      Nenhuma audiência encontrada
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Partes Tab */}
          <TabsContent value="partes">
            <div className="space-y-6">
              {/* Polo Ativo */}
              {partesAtivo.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-700">
                      Polo Ativo ({partesAtivo.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {partesAtivo.map((parte) => (
                        <div
                          key={parte.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-neutral-500" />
                            <div>
                              <p className="font-medium">{parte.nome}</p>
                              <p className="text-sm text-neutral-600">
                                {parte.cpfcnpj} | {parte.papel || parte.tipo}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedParte(parte);
                              setIsVincularClienteOpen(true);
                            }}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Vincular Cliente
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Polo Passivo */}
              {partesPassivo.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-700">
                      Polo Passivo ({partesPassivo.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {partesPassivo.map((parte) => (
                        <div
                          key={parte.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Building className="w-4 h-4 text-neutral-500" />
                            <div>
                              <p className="font-medium">{parte.nome}</p>
                              <p className="text-sm text-neutral-600">
                                {parte.cpfcnpj} | {parte.papel || parte.tipo}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedParte(parte);
                              setIsVincularClienteOpen(true);
                            }}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Vincular Cliente
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Advogados */}
              {advogados.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-blue-700">
                      Advogados ({advogados.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {advogados.map((parte) => (
                        <div
                          key={parte.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <Gavel className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="font-medium">{parte.nome}</p>
                            <p className="text-sm text-neutral-600">
                              OAB: {parte.cpfcnpj}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {partes.length === 0 && (
                <Card>
                  <CardContent className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <p className="text-neutral-500 mb-4">
                      Nenhuma parte encontrada
                    </p>
                    <Button onClick={() => syncPartesMutation.mutate()}>
                      <Users className="w-4 h-4 mr-2" />
                      Sincronizar Partes
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Movimentações Tab */}
          <TabsContent value="movimentacoes">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>
                    Movimentações ({filteredMovimentacoes.length})
                  </CardTitle>
                  {movimentacoesLoading && (
                    <RefreshCw className="w-4 h-4 animate-spin text-neutral-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredMovimentacoes.length > 0 ? (
                  <div className="space-y-4">
                    {filteredMovimentacoes.map((mov) => (
                      <div
                        key={mov.id}
                        className="flex gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          <Activity className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">
                              {formatDate(
                                mov.data_movimentacao || mov.created_at,
                              )}
                            </p>
                            <Badge variant="outline">
                              {mov.data?.origem || "Sistema"}
                            </Badge>
                          </div>
                          <p className="text-sm text-neutral-700 mb-2">
                            {getResumoMovimentacao(mov)}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsNovaTarefaOpen(true)}
                            >
                              <Target className="w-4 h-4 mr-1" />
                              Criar Tarefa
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination */}
                    <div className="flex items-center justify-between pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setMovimentacoesPage((p) => Math.max(1, p - 1))
                        }
                        disabled={movimentacoesPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-neutral-600">
                        Página {movimentacoesPage}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMovimentacoesPage((p) => p + 1)}
                        disabled={filteredMovimentacoes.length < itemsPerPage}
                      >
                        Próximo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <p className="text-neutral-500">
                      Nenhuma movimentação encontrada
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Publicações Tab */}
          <TabsContent value="publicacoes">
            <Card>
              <CardHeader>
                <CardTitle>
                  Publicações ({filteredPublicacoes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredPublicacoes.length > 0 ? (
                  <div className="space-y-4">
                    {filteredPublicacoes.map((pub) => (
                      <div
                        key={`${pub.source}-${pub.uid}`}
                        className="flex gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex-shrink-0">
                          <FileText className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">
                              {formatDate(pub.occured_at)}
                            </p>
                            <div className="flex gap-2">
                              <Badge variant="outline">{pub.source}</Badge>
                              {pub.payload?.diario && (
                                <Badge>{pub.payload.diario}</Badge>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-neutral-700 mb-2">
                            {getResumoPublicacao(pub)}
                          </p>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsNovaTarefaOpen(true)}
                            >
                              <Target className="w-4 h-4 mr-1" />
                              Criar Tarefa
                            </Button>
                            {pub.payload?.url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  window.open(pub.payload.url, "_blank")
                                }
                              >
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Abrir
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Pagination */}
                    <div className="flex items-center justify-between pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPublicacoesPage((p) => Math.max(1, p - 1))
                        }
                        disabled={publicacoesPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-neutral-600">
                        Página {publicacoesPage}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPublicacoesPage((p) => p + 1)}
                        disabled={filteredPublicacoes.length < itemsPerPage}
                      >
                        Próximo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <p className="text-neutral-500">
                      Nenhuma publicação encontrada
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documentos Tab */}
          <TabsContent value="documentos">
            <Card>
              <CardHeader>
                <CardTitle>Documentos ({documentos.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {documentos.length > 0 ? (
                  <div className="space-y-4">
                    {documentos.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Folder className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="font-medium">
                              {doc.tipo === "documento"
                                ? doc.metadata?.name || doc.name
                                : doc.tipo}
                            </p>
                            <p className="text-sm text-neutral-600">
                              {doc.tipo === "documento"
                                ? "Documento"
                                : "Petição"}{" "}
                              •{formatDate(doc.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Visualizar
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Folder className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
                    <p className="text-neutral-500 mb-4">
                      Nenhum documento encontrado
                    </p>
                    <Button onClick={() => setIsAnexarDocOpen(true)}>
                      <FileUp className="w-4 h-4 mr-2" />
                      Anexar Documento
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Configurações */}
      <Dialog
        open={isMonitoringDialogOpen}
        onOpenChange={setIsMonitoringDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Configurações de Monitoramento</DialogTitle>
            <DialogDescription>
              Configure o provedor e atualize os dados do processo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Status atual */}
            <div className="p-3 bg-neutral-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Fonte Ativa:</span>
                <Badge variant="outline">
                  {monitoringSettings?.provider === 'escavador' ? 'Escavador Premium' : 'Advise'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">Status:</span>
                <div className="flex items-center gap-2">
                  <Radio className={`w-3 h-3 ${monitoringSettings?.active ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="text-xs">
                    {monitoringSettings?.active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
              </div>
            </div>

            {/* Toggle Premium */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="premium" className="font-medium">Monitoramento Premium</Label>
                  <p className="text-xs text-neutral-600">Usar Escavador para dados mais completos</p>
                </div>
                <Switch
                  id="premium"
                  checked={premiumEnabled}
                  onCheckedChange={async (checked) => {
                    setPremiumEnabled(checked);
                    // Chamar RPC imediatamente
                    try {
                      await lf.rpc('lf_set_monitoring', {
                        p_numero_cnj: numero_cnj,
                        p_provider: checked ? 'escavador' : 'advise',
                        p_active: true,
                        p_premium: checked
                      });

                      // Atualizar estado local
                      queryClient.invalidateQueries({
                        queryKey: ['monitoring-settings', numero_cnj]
                      });

                      toast({
                        title: "Configuração atualizada",
                        description: `Fonte alterada para ${checked ? 'Escavador Premium' : 'Advise'}`
                      });
                    } catch (error) {
                      console.error('Erro ao atualizar monitoramento:', error);
                      toast({
                        title: "Erro",
                        description: "Falha ao atualizar configuração",
                        variant: "destructive"
                      });
                    }
                  }}
                />
              </div>
              <p className="text-sm text-neutral-600">
                {premiumEnabled
                  ? "✅ Escavador Premium - dados completos e atualizações em tempo real"
                  : "📋 Advise - dados básicos com atualizações manuais"}
              </p>
            </div>

            {/* Botão Aplicar e Atualizar */}
            <div className="pt-2 border-t">
              <Button
                onClick={async () => {
                  try {
                    const { data: jobId } = await lf.rpc('lf_run_sync', {
                      p_numero_cnj: numero_cnj
                    });

                    toast({
                      title: "Sync enfileirado",
                      description: `Job #${jobId} iniciado. Dados serão atualizados em breve.`
                    });

                    // Fechar dialog
                    setIsMonitoringDialogOpen(false);

                    // Invalidar queries para refresh
                    queryClient.invalidateQueries({
                      queryKey: ['processo', numero_cnj]
                    });

                  } catch (error) {
                    console.error('Erro ao executar sync:', error);
                    toast({
                      title: "Erro",
                      description: "Falha ao iniciar sincronização",
                      variant: "destructive"
                    });
                  }
                }}
                className="w-full"
                disabled={syncProcessoMutation.isPending}
              >
                {syncProcessoMutation.isPending ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Aplicar e Atualizar
              </Button>
            </div>
          </div>
          <DialogFooter className="pt-0">
            <Button
              variant="outline"
              onClick={() => setIsMonitoringDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Nova Tarefa */}
      <Dialog open={isNovaTarefaOpen} onOpenChange={setIsNovaTarefaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createTarefaMutation.mutate({
                titulo: formData.get("titulo") as string,
                descricao: formData.get("descricao") as string,
                due_date: formData.get("due_date") as string,
              });
            }}
          >
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="titulo">Título</Label>
                <Input name="titulo" required />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea name="descricao" />
              </div>
              <div>
                <Label htmlFor="due_date">Data de Vencimento</Label>
                <Input name="due_date" type="datetime-local" required />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNovaTarefaOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createTarefaMutation.isPending}>
                Criar Tarefa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Novo Evento */}
      <Dialog open={isNovoEventoOpen} onOpenChange={setIsNovoEventoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createEventoMutation.mutate({
                titulo: formData.get("titulo") as string,
                data: formData.get("data") as string,
                hora: formData.get("hora") as string,
              });
            }}
          >
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="titulo">Título</Label>
                <Input name="titulo" required />
              </div>
              <div>
                <Label htmlFor="data">Data</Label>
                <Input name="data" type="date" required />
              </div>
              <div>
                <Label htmlFor="hora">Hora</Label>
                <Input name="hora" type="time" required />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNovoEventoOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createEventoMutation.isPending}>
                Criar Evento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Vincular Cliente */}
      <Dialog
        open={isVincularClienteOpen}
        onOpenChange={setIsVincularClienteOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Cliente</DialogTitle>
            <DialogDescription>
              Vincular {selectedParte?.nome} como cliente
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              vincularClienteMutation.mutate({
                cpfcnpj: formData.get("cpfcnpj") as string,
              });
            }}
          >
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="cpfcnpj">Cliente</Label>
                <Select name="cpfcnpj" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.cpfcnpj} value={cliente.cpfcnpj}>
                        {cliente.nome} ({cliente.cpfcnpj})
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
                onClick={() => setIsVincularClienteOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={vincularClienteMutation.isPending}
              >
                Vincular
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Chat Drawer */}
      <ProcessoChatDrawer
        numero_cnj={numero_cnj}
        isOpen={showChatDrawer}
        onClose={() => setShowChatDrawer(false)}
        onNovaConversa={() => setIsNovaConversaOpen(true)}
      />
    </div>
  );
}
