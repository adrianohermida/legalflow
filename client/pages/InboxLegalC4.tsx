/**
 * Flow C4: Inbox Legal (Publicações & Movimentações)
 * Behavior Goal: triagem → vínculo → notificação
 * 
 * Features:
 * - Tabs: Publicações | Movimentações
 * - Columns: Data, Origem/Tribunal, Resumo, Processo (badge "não vinculado"), Ações
 * - Actions: Vincular ao CNJ, Criar etapa, Notificar responsável
 * - Extra: "Buscar no Escavador/Advise e Cadastrar"
 */

import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
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
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { Textarea } from "../components/ui/textarea";
import {
  Search,
  Filter,
  Inbox,
  FileText,
  Building,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Link2,
  Bell,
  Calendar,
  ExternalLink,
  Plus,
  Eye,
  Target,
  Activity,
  Clock,
  MoreHorizontal,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Flag,
  FileSearch,
  AlertCircle,
  Download,
  Unlink,
  User,
  Send,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatDate, formatCNJ } from "../lib/utils";
import { themeUtils, colors } from "../lib/theme-colors";
import CreateStageDialog from "../components/CreateStageDialog";
import {
  extractResumo,
  extractTribunalOrigem,
  detectCNJInContent,
  validateCNJ,
  calculatePriority,
  getPriorityColor,
  checkProcessExists,
  getProcessResponsible,
  autoSuggestCNJ,
  generateWorkflowSummary,
  getWorkflowProgress,
  type TriagemItem,
} from "../lib/inbox-c4-utils";

interface PublicacaoItem {
  id: number;
  numero_cnj: string | null;
  data: any;
  data_publicacao: string;
  created_at: string;
  resumo_extraido?: string;
  tribunal_origem?: string;
  vinculada: boolean;
}

interface MovimentacaoItem {
  id: number;
  numero_cnj: string | null;
  data: any;
  data_movimentacao: string;
  created_at: string;
  resumo_extraido?: string;
  tribunal_origem?: string;
  vinculada: boolean;
}

interface NotificationData {
  tipo: "publicacao" | "movimentacao";
  item_id: number;
  numero_cnj: string | null;
  responsavel_oab?: number;
  mensagem: string;
}

export default function InboxLegalC4() {
  const [activeTab, setActiveTab] = useState<"publicacoes" | "movimentacoes">("publicacoes");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTribunal, setSelectedTribunal] = useState<string>("todos");
  const [selectedStatus, setSelectedStatus] = useState<string>("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Dialog states
  const [showVincularDialog, setShowVincularDialog] = useState(false);
  const [showNotificarDialog, setShowNotificarDialog] = useState(false);
  const [showCreateStageDialog, setShowCreateStageDialog] = useState(false);
  const [showBuscarCadastrarDialog, setShowBuscarCadastrarDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PublicacaoItem | MovimentacaoItem | null>(null);

  // Form states
  const [vinculoCnj, setVinculoCnj] = useState("");
  const [notificacaoMensagem, setNotificacaoMensagem] = useState("");
  const [buscarTermo, setBuscarTermo] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch publicações
  const {
    data: publicacoesData = { data: [], total: 0 },
    isLoading: isPublicacoesLoading,
    error: publicacoesError,
  } = useQuery({
    queryKey: ["inbox-publicacoes-c4", searchTerm, selectedTribunal, selectedStatus, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("publicacoes")
        .select("*", { count: "exact" })
        .order("data_publicacao", { ascending: false });

      // Apply filters
      if (searchTerm) {
        query = query.or(
          `numero_cnj.ilike.%${searchTerm}%,data->>resumo.ilike.%${searchTerm}%,data->>conteudo.ilike.%${searchTerm}%`
        );
      }

      if (selectedStatus !== "todos") {
        if (selectedStatus === "vinculadas") {
          query = query.not("numero_cnj", "is", null);
        } else if (selectedStatus === "nao-vinculadas") {
          query = query.is("numero_cnj", null);
        }
      }

      if (selectedTribunal !== "todos") {
        query = query.ilike("data->>tribunal", `%${selectedTribunal}%`);
      }

      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize - 1;
      query = query.range(startIndex, endIndex);

      const { data, error, count } = await query;
      if (error) throw error;

      // Process data to extract resumo and tribunal using utilities
      const processedData = data.map((item: any) => {
        const triaged: TriagemItem = {
          ...item,
          resumo_extraido: extractResumo(item.data, "publicacao"),
          tribunal_origem: extractTribunalOrigem(item.data),
          vinculada: !!item.numero_cnj,
          prioridade: calculatePriority({
            ...item,
            resumo_extraido: extractResumo(item.data, "publicacao"),
          } as TriagemItem),
        };
        return triaged;
      });

      return {
        data: processedData,
        total: count || 0,
      };
    },
    enabled: activeTab === "publicacoes",
  });

  // Fetch movimentações
  const {
    data: movimentacoesData = { data: [], total: 0 },
    isLoading: isMovimentacoesLoading,
    error: movimentacoesError,
  } = useQuery({
    queryKey: ["inbox-movimentacoes-c4", searchTerm, selectedTribunal, selectedStatus, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("movimentacoes")
        .select("*", { count: "exact" })
        .order("data_movimentacao", { ascending: false });

      // Apply filters
      if (searchTerm) {
        query = query.or(
          `numero_cnj.ilike.%${searchTerm}%,data->>texto.ilike.%${searchTerm}%,data->>conteudo.ilike.%${searchTerm}%`
        );
      }

      if (selectedStatus !== "todos") {
        if (selectedStatus === "vinculadas") {
          query = query.not("numero_cnj", "is", null);
        } else if (selectedStatus === "nao-vinculadas") {
          query = query.is("numero_cnj", null);
        }
      }

      if (selectedTribunal !== "todos") {
        query = query.ilike("data->>tribunal", `%${selectedTribunal}%`);
      }

      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize - 1;
      query = query.range(startIndex, endIndex);

      const { data, error, count } = await query;
      if (error) throw error;

      // Process data to extract resumo and tribunal using utilities
      const processedData = data.map((item: any) => {
        const triaged: TriagemItem = {
          ...item,
          resumo_extraido: extractResumo(item.data, "movimentacao"),
          tribunal_origem: extractTribunalOrigem(item.data),
          vinculada: !!item.numero_cnj,
          prioridade: calculatePriority({
            ...item,
            resumo_extraido: extractResumo(item.data, "movimentacao"),
          } as TriagemItem),
        };
        return triaged;
      });

      return {
        data: processedData,
        total: count || 0,
      };
    },
    enabled: activeTab === "movimentacoes",
  });

  // Fetch available tribunais for filter
  const { data: tribunais = [] } = useQuery({
    queryKey: ["tribunais-inbox-c4"],
    queryFn: async () => {
      const { data: publicacoesTribunais } = await supabase
        .from("publicacoes")
        .select("data")
        .not("data", "is", null);

      const { data: movimentacoesTribunais } = await supabase
        .from("movimentacoes")
        .select("data")
        .not("data", "is", null);

      const allTribunais = new Set<string>();
      
      publicacoesTribunais?.forEach((item) => {
        const tribunal = item.data?.tribunal || item.data?.orgao;
        if (tribunal) allTribunais.add(tribunal);
      });

      movimentacoesTribunais?.forEach((item) => {
        const tribunal = item.data?.tribunal || item.data?.orgao;
        if (tribunal) allTribunais.add(tribunal);
      });

      return Array.from(allTribunais).sort();
    },
  });

  // Mutation to link CNJ
  const vincularCnjMutation = useMutation({
    mutationFn: async ({ itemId, cnj, tipo }: { itemId: number; cnj: string; tipo: "publicacao" | "movimentacao" }) => {
      const table = tipo === "publicacao" ? "publicacoes" : "movimentacoes";
      
      const { data, error } = await supabase
        .from(table)
        .update({ numero_cnj: cnj })
        .eq("id", itemId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`inbox-${activeTab}-c4`] });
      setShowVincularDialog(false);
      setSelectedItem(null);
      setVinculoCnj("");
      toast({
        title: "CNJ vinculado",
        description: "Item vinculado ao processo com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao vincular",
        description: error.message || "Erro ao vincular CNJ",
        variant: "destructive",
      });
    },
  });

  // Mutation to send notification
  const notificarMutation = useMutation({
    mutationFn: async (notificationData: NotificationData) => {
      // First, get the responsible attorney for the process
      let responsavel_oab = notificationData.responsavel_oab;
      
      if (notificationData.numero_cnj && !responsavel_oab) {
        const { data: processoData } = await supabase
          .from("processos")
          .select(`
            advogados_processos (
              advogados (
                oab,
                nome
              )
            )
          `)
          .eq("numero_cnj", notificationData.numero_cnj)
          .single();

        responsavel_oab = processoData?.advogados_processos?.[0]?.advogados?.oab;
      }

      // Create notification
      const { data, error } = await supabase
        .from("notifications")
        .insert([{
          user_id: responsavel_oab?.toString() || "admin", // fallback to admin if no responsible
          title: `Nova ${notificationData.tipo} - ${notificationData.numero_cnj || "Sem CNJ"}`,
          message: notificationData.mensagem,
          read: false,
        }])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setShowNotificarDialog(false);
      setSelectedItem(null);
      setNotificacaoMensagem("");
      toast({
        title: "Notificação enviada",
        description: "Responsável notificado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao notificar",
        description: error.message || "Erro ao enviar notificação",
        variant: "destructive",
      });
    },
  });

  // Mutation to search and register from external APIs
  const buscarCadastrarMutation = useMutation({
    mutationFn: async (termo: string) => {
      // Call the ETL ingest API to search and register new processes
      const response = await fetch("/api/ingest/advise/publicacoes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search_term: termo,
          auto_register: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Erro na busca externa");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setShowBuscarCadastrarDialog(false);
      setBuscarTermo("");
      queryClient.invalidateQueries({ queryKey: [`inbox-${activeTab}-c4`] });
      toast({
        title: "Busca concluída",
        description: `${data.imported || 0} novos itens importados`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro na busca",
        description: error.message || "Erro ao buscar dados externos",
        variant: "destructive",
      });
    },
  });

  const handleVincular = (item: PublicacaoItem | MovimentacaoItem) => {
    setSelectedItem(item);
    setVinculoCnj(item.numero_cnj || "");
    setShowVincularDialog(true);
  };

  const handleNotificar = (item: PublicacaoItem | MovimentacaoItem) => {
    setSelectedItem(item);
    setNotificacaoMensagem(`Nova ${activeTab.slice(0, -1)} disponível: ${item.resumo_extraido?.substring(0, 100)}...`);
    setShowNotificarDialog(true);
  };

  const handleCriarEtapa = (item: PublicacaoItem | MovimentacaoItem) => {
    setSelectedItem(item);
    setShowCreateStageDialog(true);
  };

  const submitVinculo = () => {
    if (!selectedItem || !vinculoCnj.trim()) return;

    const cleanCnj = vinculoCnj.replace(/\D/g, "");
    if (cleanCnj.length !== 20) {
      toast({
        title: "CNJ inválido",
        description: "CNJ deve ter 20 dígitos",
        variant: "destructive",
      });
      return;
    }

    vincularCnjMutation.mutate({
      itemId: selectedItem.id,
      cnj: vinculoCnj,
      tipo: activeTab.slice(0, -1) as "publicacao" | "movimentacao",
    });
  };

  const submitNotificacao = () => {
    if (!selectedItem || !notificacaoMensagem.trim()) return;

    notificarMutation.mutate({
      tipo: activeTab.slice(0, -1) as "publicacao" | "movimentacao",
      item_id: selectedItem.id,
      numero_cnj: selectedItem.numero_cnj,
      mensagem: notificacaoMensagem,
    });
  };

  const submitBuscarCadastrar = () => {
    if (!buscarTermo.trim()) return;
    buscarCadastrarMutation.mutate(buscarTermo);
  };

  const currentData = activeTab === "publicacoes" ? publicacoesData : movimentacoesData;
  const isLoading = activeTab === "publicacoes" ? isPublicacoesLoading : isMovimentacoesLoading;
  const totalPages = Math.ceil(currentData.total / pageSize);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold" style={{ color: colors.neutral[900] }}>
            Inbox Legal
          </h1>
          <p className="text-neutral-600 mt-1">
            Triagem → Vínculo → Notificação
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBuscarCadastrarDialog(true)}
            className="flex items-center gap-2"
          >
            <FileSearch className="w-4 h-4" />
            Buscar no Escavador/Advise e Cadastrar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: [`inbox-${activeTab}-c4`] });
              toast({ title: "Dados atualizados" });
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card style={themeUtils.cardShadow}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Buscar por CNJ ou conteúdo..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedTribunal}
              onValueChange={(value) => {
                setSelectedTribunal(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tribunal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tribunais</SelectItem>
                {tribunais.map((tribunal) => (
                  <SelectItem key={tribunal} value={tribunal}>
                    {tribunal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedStatus}
              onValueChange={(value) => {
                setSelectedStatus(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="vinculadas">Vinculadas</SelectItem>
                <SelectItem value="nao-vinculadas">Não vinculadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Main Content with Tabs */}
      <Card style={themeUtils.elevatedCardShadow}>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as "publicacoes" | "movimentacoes");
            setCurrentPage(1);
          }}>
            <div className="p-6 border-b" style={{ borderColor: colors.neutral[200] }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="publicacoes" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Publicações
                </TabsTrigger>
                <TabsTrigger value="movimentacoes" className="flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Movimentações
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="publicacoes" className="m-0">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    Publicações ({currentData.total})
                  </h3>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.primary }} />
                    <span className="ml-2">Carregando publicações...</span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Origem/Tribunal</TableHead>
                        <TableHead>Resumo</TableHead>
                        <TableHead>Processo</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentData.data.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Inbox className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                            <p style={{ color: colors.neutral[500] }}>
                              Nenhuma publicação encontrada
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentData.data.map((item) => (
                          <TableRow key={item.id} className="hover:bg-neutral-50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm">
                                  {formatDate(item.data_publicacao || item.data_movimentacao)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm">{item.tribunal_origem}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-md">
                                <p className="text-sm text-neutral-700 line-clamp-2">
                                  {item.resumo_extraido}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.vinculada && item.numero_cnj ? (
                                <Badge style={themeUtils.brandBadge}>
                                  {formatCNJ(item.numero_cnj)}
                                </Badge>
                              ) : (
                                <Badge 
                                  variant="outline" 
                                  className="border-orange-300 text-orange-700 bg-orange-50"
                                >
                                  <Unlink className="w-3 h-3 mr-1" />
                                  Não vinculado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleVincular(item)}>
                                    <Link2 className="w-4 h-4 mr-2" />
                                    Vincular ao CNJ
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCriarEtapa(item)}>
                                    <Target className="w-4 h-4 mr-2" />
                                    Criar etapa
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleNotificar(item)}>
                                    <Bell className="w-4 h-4 mr-2" />
                                    Notificar responsável
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>

            <TabsContent value="movimentacoes" className="m-0">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">
                    Movimentações ({currentData.total})
                  </h3>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.primary }} />
                    <span className="ml-2">Carregando movimentações...</span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Origem/Tribunal</TableHead>
                        <TableHead>Resumo</TableHead>
                        <TableHead>Processo</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {currentData.data.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <Activity className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                            <p style={{ color: colors.neutral[500] }}>
                              Nenhuma movimentação encontrada
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        currentData.data.map((item) => (
                          <TableRow key={item.id} className="hover:bg-neutral-50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm">
                                  {formatDate(item.data_movimentacao || item.data_publicacao)}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm">{item.tribunal_origem}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-md">
                                <p className="text-sm text-neutral-700 line-clamp-2">
                                  {item.resumo_extraido}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.vinculada && item.numero_cnj ? (
                                <Badge style={themeUtils.brandBadge}>
                                  {formatCNJ(item.numero_cnj)}
                                </Badge>
                              ) : (
                                <Badge 
                                  variant="outline" 
                                  className="border-orange-300 text-orange-700 bg-orange-50"
                                >
                                  <Unlink className="w-3 h-3 mr-1" />
                                  Não vinculado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleVincular(item)}>
                                    <Link2 className="w-4 h-4 mr-2" />
                                    Vincular ao CNJ
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleCriarEtapa(item)}>
                                    <Target className="w-4 h-4 mr-2" />
                                    Criar etapa
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleNotificar(item)}>
                                    <Bell className="w-4 h-4 mr-2" />
                                    Notificar responsável
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {(currentPage - 1) * pageSize + 1} a{" "}
            {Math.min(currentPage * pageSize, currentData.total)} de{" "}
            {currentData.total} registros
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
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Vincular CNJ Dialog */}
      <Dialog open={showVincularDialog} onOpenChange={setShowVincularDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular ao CNJ</DialogTitle>
            <DialogDescription>
              Informe o número CNJ para vincular este item ao processo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Número CNJ
              </label>
              <Input
                value={vinculoCnj}
                onChange={(e) => setVinculoCnj(e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                maxLength={25}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowVincularDialog(false);
                setSelectedItem(null);
                setVinculoCnj("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitVinculo}
              disabled={vincularCnjMutation.isPending}
              style={themeUtils.primaryButton}
            >
              {vincularCnjMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notificar Dialog */}
      <Dialog open={showNotificarDialog} onOpenChange={setShowNotificarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notificar Responsável</DialogTitle>
            <DialogDescription>
              Envie uma notificação para o responsável pelo processo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Mensagem
              </label>
              <Textarea
                value={notificacaoMensagem}
                onChange={(e) => setNotificacaoMensagem(e.target.value)}
                placeholder="Digite a mensagem da notificação..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowNotificarDialog(false);
                setSelectedItem(null);
                setNotificacaoMensagem("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitNotificacao}
              disabled={notificarMutation.isPending}
              style={themeUtils.primaryButton}
            >
              {notificarMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              <Send className="w-4 h-4 mr-2" />
              Enviar Notificação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buscar e Cadastrar Dialog */}
      <Dialog open={showBuscarCadastrarDialog} onOpenChange={setShowBuscarCadastrarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buscar no Escavador/Advise e Cadastrar</DialogTitle>
            <DialogDescription>
              Busque novos dados nos sistemas externos e importe automaticamente
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Termo de busca
              </label>
              <Input
                value={buscarTermo}
                onChange={(e) => setBuscarTermo(e.target.value)}
                placeholder="Ex: CNJ, nome da parte, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowBuscarCadastrarDialog(false);
                setBuscarTermo("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={submitBuscarCadastrar}
              disabled={buscarCadastrarMutation.isPending}
              style={themeUtils.primaryButton}
            >
              {buscarCadastrarMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              <FileSearch className="w-4 h-4 mr-2" />
              Buscar e Cadastrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Stage Dialog */}
      {showCreateStageDialog && selectedItem && (
        <CreateStageDialog
          isOpen={showCreateStageDialog}
          onClose={() => {
            setShowCreateStageDialog(false);
            setSelectedItem(null);
          }}
          processoCnj={selectedItem.numero_cnj}
          clienteData={null}
          contextData={{
            source: activeTab.slice(0, -1),
            item_id: selectedItem.id,
            content: selectedItem.resumo_extraido,
          }}
        />
      )}
    </div>
  );
}
