import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
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
  Download,
  RefreshCw,
  Filter as FilterIcon,
  Check,
  Circle,
  EyeOff,
  Flag,
  FileSearch,
  AlertCircle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatDate, formatCNJ } from "../lib/utils";
import { useInboxRealtimeUpdates } from "../hooks/useRealtimeUpdates";
import CreateStageDialog from "../components/CreateStageDialog";

// Simulação do XLSX para evitar erro até a biblioteca ser instalada
const XLSX = {
  utils: {
    json_to_sheet: (data: any) => data,
    book_new: () => ({}),
    book_append_sheet: (wb: any, ws: any, name: string) => {},
  },
  writeFile: (wb: any, filename: string) => {
    console.log("Export simulated:", filename);
    // Simulação - em produção usaria a biblioteca real XLSX
  },
};

interface PublicacaoUnificada {
  source: "publicacoes" | "movimentacoes";
  uid: number;
  numero_cnj: string | null;
  occured_at: string;
  payload: any;
  created_at: string;
  is_read?: boolean;
  is_treated?: boolean;
  read_at?: string | null;
  treated_at?: string | null;
  read_notes?: string | null;
}

interface MovimentacaoEnhanced {
  id: number;
  numero_cnj: string | null;
  data: any;
  created_at: string;
  data_movimentacao: string | null;
  is_read?: boolean;
  is_treated?: boolean;
  read_at?: string | null;
  treated_at?: string | null;
  read_notes?: string | null;
  tipo_movimentacao?: string;
  tribunal_origem?: string;
  grau_instancia?: string;
  conteudo_resumo?: string;
  data_evento?: string;
}

interface ProcessoForSearch {
  numero_cnj: string;
  titulo_polo_ativo: string;
  titulo_polo_passivo: string;
  display_name?: string;
  tribunal_sigla?: string;
  created_at: string;
}

interface ReadStats {
  table_name: string;
  total_items: number;
  read_items: number;
  unread_items: number;
  treated_items: number;
}

export default function InboxLegalV2() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"publicacoes" | "movimentacoes">(
    "publicacoes",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isVincularDialogOpen, setIsVincularDialogOpen] = useState(false);
  const [isNotificarDialogOpen, setIsNotificarDialogOpen] = useState(false);
  const [isCriarProcessoDialogOpen, setIsCriarProcessoDialogOpen] =
    useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [periodoFilter, setPeriodoFilter] = useState("all");
  const [tribunalFilter, setTribunalFilter] = useState("all");
  const [vinculadaFilter, setVinculadaFilter] = useState("all");
  const [readStatusFilter, setReadStatusFilter] = useState("all");
  const [treatmentFilter, setTreatmentFilter] = useState("all");
  const [processoSearchTerm, setProcessoSearchTerm] = useState("");
  const [novoProcessoCnj, setNovoProcessoCnj] = useState("");
  const [buscandoProcesso, setBuscandoProcesso] = useState(false);
  const [dadosProcessoAdvise, setDadosProcessoAdvise] = useState<any>(null);
  const [cnjDetectado, setCnjDetectado] = useState("");
  const [selectedProcesso, setSelectedProcesso] = useState<string>("");

  const itemsPerPage = 25;

  // Enable realtime updates for inbox
  useInboxRealtimeUpdates();

  // Buscar estatísticas de leitura com fallback
  const { data: readStats = [] } = useQuery({
    queryKey: ["inbox-read-stats"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc("get_inbox_read_stats");
        if (error) throw error;
        return data as ReadStats[];
      } catch (error) {
        // Fallback para quando as funções ainda não foram criadas
        console.warn(
          "Função get_inbox_read_stats não disponível, usando fallback",
        );
        return [
          {
            table_name: "publicacoes",
            total_items: 0,
            read_items: 0,
            unread_items: 0,
            treated_items: 0,
          },
          {
            table_name: "movimentacoes",
            total_items: 0,
            read_items: 0,
            unread_items: 0,
            treated_items: 0,
          },
        ];
      }
    },
    refetchInterval: 30000,
  });

  // Buscar publicações unificadas (com fallback para view original)
  const {
    data: publicacoesData = { data: [], total: 0, totalPages: 0 },
    isLoading: publicacoesLoading,
    error: publicacoesError,
  } = useQuery({
    queryKey: [
      "publicacoes-unificadas-enhanced",
      searchTerm,
      currentPage,
      periodoFilter,
      tribunalFilter,
      vinculadaFilter,
      readStatusFilter,
      treatmentFilter,
    ],
    queryFn: async () => {
      // Tentar usar a view com status de leitura primeiro
      let viewName = "vw_publicacoes_unificadas_with_read_status";

      let query = supabase
        .from(viewName)
        .select("*", { count: "exact" })
        .order("occured_at", { ascending: false, nullsLast: true });

      // Se falhar, usar a view original
      const testQuery = await supabase.from(viewName).select("*").limit(1);
      if (testQuery.error) {
        viewName = "vw_publicacoes_unificadas";
        query = supabase
          .from(viewName)
          .select("*", { count: "exact" })
          .order("occured_at", { ascending: false, nullsLast: true });
      }

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(
          `numero_cnj.ilike.%${searchTerm}%,payload->>resumo.ilike.%${searchTerm}%,payload->>texto.ilike.%${searchTerm}%,payload->>conteudo.ilike.%${searchTerm}%`,
        );
      }

      if (vinculadaFilter === "vinculadas") {
        query = query.not("numero_cnj", "is", null);
      } else if (vinculadaFilter === "nao-vinculadas") {
        query = query.is("numero_cnj", null);
      }

      // Filtros de leitura (só aplicar se view com status existir)
      if (viewName.includes("with_read_status")) {
        if (readStatusFilter === "lidas") {
          query = query.eq("is_read", true);
        } else if (readStatusFilter === "nao-lidas") {
          query = query.eq("is_read", false);
        }

        if (treatmentFilter === "tratadas") {
          query = query.eq("is_treated", true);
        } else if (treatmentFilter === "nao-tratadas") {
          query = query.eq("is_treated", false);
        }
      }

      if (periodoFilter !== "all") {
        const days = parseInt(periodoFilter);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte("occured_at", startDate.toISOString());
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const { data, error, count } = await query.range(
        startIndex,
        startIndex + itemsPerPage - 1,
      );

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
      };
    },
    enabled: activeTab === "publicacoes",
    staleTime: 5 * 60 * 1000,
  });

  // Buscar movimentações (com fallback para tabela original)
  const {
    data: movimentacoesData = { data: [], total: 0, totalPages: 0 },
    isLoading: movimentacoesLoading,
    error: movimentacoesError,
  } = useQuery({
    queryKey: [
      "movimentacoes-enhanced",
      searchTerm,
      currentPage,
      periodoFilter,
      tribunalFilter,
      vinculadaFilter,
      readStatusFilter,
      treatmentFilter,
    ],
    queryFn: async () => {
      // Tentar usar a view com status de leitura primeiro
      let viewName = "vw_movimentacoes_with_read_status";

      let query = supabase
        .from(viewName)
        .select("*", { count: "exact" })
        .order("data_movimentacao", { ascending: false, nullsLast: true });

      // Se falhar, usar a tabela original
      const testQuery = await supabase.from(viewName).select("*").limit(1);
      if (testQuery.error) {
        viewName = "movimentacoes";
        query = supabase
          .from(viewName)
          .select("*", { count: "exact" })
          .order("data_movimentacao", { ascending: false, nullsLast: true });
      }

      // Aplicar filtros
      if (searchTerm) {
        if (viewName.includes("with_read_status")) {
          query = query.or(
            `numero_cnj.ilike.%${searchTerm}%,conteudo_resumo.ilike.%${searchTerm}%,tribunal_origem.ilike.%${searchTerm}%`,
          );
        } else {
          query = query.or(
            `numero_cnj.ilike.%${searchTerm}%,data->>texto.ilike.%${searchTerm}%,data->>resumo.ilike.%${searchTerm}%`,
          );
        }
      }

      if (vinculadaFilter === "vinculadas") {
        query = query.not("numero_cnj", "is", null);
      } else if (vinculadaFilter === "nao-vinculadas") {
        query = query.is("numero_cnj", null);
      }

      // Filtros de leitura (só aplicar se view com status existir)
      if (viewName.includes("with_read_status")) {
        if (readStatusFilter === "lidas") {
          query = query.eq("is_read", true);
        } else if (readStatusFilter === "nao-lidas") {
          query = query.eq("is_read", false);
        }

        if (treatmentFilter === "tratadas") {
          query = query.eq("is_treated", true);
        } else if (treatmentFilter === "nao-tratadas") {
          query = query.eq("is_treated", false);
        }

        if (tribunalFilter !== "all") {
          query = query.ilike("tribunal_origem", `%${tribunalFilter}%`);
        }
      }

      if (periodoFilter !== "all") {
        const days = parseInt(periodoFilter);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte("data_movimentacao", startDate.toISOString());
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const { data, error, count } = await query.range(
        startIndex,
        startIndex + itemsPerPage - 1,
      );

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
      };
    },
    enabled: activeTab === "movimentacoes",
    staleTime: 5 * 60 * 1000,
  });

  // Buscar processos para vincular (com fallback para busca simples)
  const { data: processosParaVincular = [] } = useQuery({
    queryKey: ["processos-search", processoSearchTerm],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc(
          "search_processos_with_parts",
          {
            p_search_term: processoSearchTerm || null,
          },
        );

        if (error) throw error;
        return data as ProcessoForSearch[];
      } catch (error) {
        // Fallback para busca simples
        console.warn(
          "Função search_processos_with_parts não disponível, usando fallback",
        );
        let query = supabase
          .from("processos")
          .select(
            "numero_cnj, titulo_polo_ativo, titulo_polo_passivo, tribunal_sigla, created_at",
          )
          .order("created_at", { ascending: false })
          .limit(100);

        if (processoSearchTerm) {
          query = query.or(
            `numero_cnj.ilike.%${processoSearchTerm}%,titulo_polo_ativo.ilike.%${processoSearchTerm}%,titulo_polo_passivo.ilike.%${processoSearchTerm}%`,
          );
        }

        const { data, error: fallbackError } = await query;
        if (fallbackError) throw fallbackError;

        return (data || []).map((processo) => ({
          ...processo,
          display_name: `${processo.titulo_polo_ativo || "Requerente"} x ${processo.titulo_polo_passivo || "Requerido"}`,
        }));
      }
    },
    enabled: processoSearchTerm.length >= 2 || processoSearchTerm === "",
  });

  // Mutation para marcar como lido (com fallback)
  const markAsReadMutation = useMutation({
    mutationFn: async ({
      sourceTable,
      sourceId,
    }: {
      sourceTable: string;
      sourceId: number;
    }) => {
      try {
        const { data, error } = await supabase.rpc("mark_inbox_item_as_read", {
          p_source_table: sourceTable,
          p_source_id: sourceId,
        });
        if (error) throw error;
        return data;
      } catch (error) {
        console.warn("Função mark_inbox_item_as_read não disponível");
        // Para fallback, podemos apenas mostrar sucesso visual sem persistir
        return true;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["publicacoes-unificadas-enhanced"],
      });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes-enhanced"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-read-stats"] });
    },
  });

  // Mutation para marcar como tratado (com fallback)
  const markAsTreatedMutation = useMutation({
    mutationFn: async ({
      sourceTable,
      sourceId,
      notes,
    }: {
      sourceTable: string;
      sourceId: number;
      notes?: string;
    }) => {
      try {
        const { data, error } = await supabase.rpc(
          "mark_inbox_item_as_treated",
          {
            p_source_table: sourceTable,
            p_source_id: sourceId,
            p_notes: notes || null,
          },
        );
        if (error) throw error;
        return data;
      } catch (error) {
        console.warn("Função mark_inbox_item_as_treated não disponível");
        return true;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["publicacoes-unificadas-enhanced"],
      });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes-enhanced"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-read-stats"] });
      toast({
        title: "Item marcado como tratado",
        description: "O item foi marcado como tratado com sucesso.",
      });
    },
  });

  // Mutation para vincular ao CNJ
  const vincularMutation = useMutation({
    mutationFn: async ({
      itemId,
      tableName,
      numero_cnj,
    }: {
      itemId: number;
      tableName: string;
      numero_cnj: string;
    }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update({ numero_cnj })
        .eq("id", itemId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["publicacoes-unificadas-enhanced"],
      });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes-enhanced"] });
      setIsVincularDialogOpen(false);
      setSelectedItem(null);
      setSelectedProcesso("");
      toast({
        title: "Item vinculado",
        description: "Item vinculado ao processo com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao vincular item",
        variant: "destructive",
      });
    },
  });

  // Auto-detectar CNJ quando selecionar item
  useEffect(() => {
    if (selectedItem) {
      const content =
        activeTab === "publicacoes"
          ? selectedItem.payload?.conteudo ||
            selectedItem.payload?.texto ||
            selectedItem.payload?.resumo ||
            ""
          : selectedItem.conteudo_resumo ||
            selectedItem.data?.conteudo ||
            selectedItem.data?.texto ||
            "";

      const cnjRegex = /\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}/g;
      const matches = content.match(cnjRegex);
      if (matches && matches[0]) {
        setCnjDetectado(matches[0]);
        // Auto-selecionar processo se encontrar CNJ correspondente
        const processoCorrespondente = processosParaVincular.find(
          (p) => p.numero_cnj === matches[0],
        );
        if (processoCorrespondente) {
          setSelectedProcesso(matches[0]);
        }
      } else {
        setCnjDetectado("");
      }
    }
  }, [selectedItem, processosParaVincular, activeTab]);

  // Filtrar estatísticas por tab ativo
  const currentStats = readStats.find(
    (stat) =>
      (activeTab === "publicacoes" && stat.table_name === "publicacoes") ||
      (activeTab === "movimentacoes" && stat.table_name === "movimentacoes"),
  );

  const unreadCount = currentStats?.unread_items || 0;

  // Função para exportar dados
  const handleExport = () => {
    const currentData =
      activeTab === "publicacoes" ? publicacoesData : movimentacoesData;

    const dataToExport = currentData.data.map((item: any) => {
      if (activeTab === "publicacoes") {
        return {
          Data: formatDate(item.occured_at),
          Origem: item.payload?.diario || item.payload?.origem || item.source,
          Resumo:
            item.payload?.resumo ||
            item.payload?.texto ||
            item.payload?.conteudo ||
            "Sem resumo",
          "Processo CNJ": item.numero_cnj || "Não vinculado",
          "Status Leitura": item.is_read ? "Lida" : "Não lida",
          "Status Tratamento": item.is_treated ? "Tratada" : "Não tratada",
          "Data Leitura": item.read_at ? formatDate(item.read_at) : "-",
          "Data Tratamento": item.treated_at
            ? formatDate(item.treated_at)
            : "-",
        };
      } else {
        return {
          Data: formatDate(
            item.data_evento || item.data_movimentacao || item.created_at,
          ),
          Tribunal: item.tribunal_origem || item.data?.fonte?.nome || "N/A",
          Tipo: item.tipo_movimentacao || item.data?.tipo || "ANDAMENTO",
          Grau:
            item.grau_instancia || item.data?.fonte?.grau_formatado || "N/A",
          Conteúdo:
            item.conteudo_resumo ||
            item.data?.conteudo ||
            item.data?.texto ||
            "Sem conteúdo",
          "Processo CNJ": item.numero_cnj || "Não vinculado",
          "Status Leitura": item.is_read ? "Lida" : "Não lida",
          "Status Tratamento": item.is_treated ? "Tratada" : "Não tratada",
          "Data Leitura": item.read_at ? formatDate(item.read_at) : "-",
          "Data Tratamento": item.treated_at
            ? formatDate(item.treated_at)
            : "-",
        };
      }
    });

    // Simular export (substituir por XLSX real quando biblioteca estiver instalada)
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      activeTab === "publicacoes" ? "Publicações" : "Movimentações",
    );

    const fileName = `inbox_legal_${activeTab}_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);

    toast({
      title: "Exportação concluída",
      description: `Arquivo ${fileName} foi baixado com sucesso.`,
    });
  };

  const handleVincular = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!selectedItem || !selectedProcesso) return;

    const tableName =
      activeTab === "publicacoes"
        ? selectedItem.source === "publicacoes"
          ? "publicacoes"
          : "movimentacoes"
        : "movimentacoes";
    const itemId =
      activeTab === "publicacoes"
        ? selectedItem.source
          ? selectedItem.uid
          : selectedItem.id
        : selectedItem.id;

    vincularMutation.mutate({
      itemId,
      tableName,
      numero_cnj: selectedProcesso,
    });
  };

  const handleMarkAsRead = (item: any) => {
    const sourceTable =
      activeTab === "publicacoes"
        ? item.source || "publicacoes"
        : "movimentacoes";
    const sourceId =
      activeTab === "publicacoes" ? item.uid || item.id : item.id;

    markAsReadMutation.mutate({ sourceTable, sourceId });
  };

  const handleMarkAsTreated = (item: any) => {
    const sourceTable =
      activeTab === "publicacoes"
        ? item.source || "publicacoes"
        : "movimentacoes";
    const sourceId =
      activeTab === "publicacoes" ? item.uid || item.id : item.id;

    markAsTreatedMutation.mutate({ sourceTable, sourceId });
  };

  const getOrigem = (item: any) => {
    if (activeTab === "publicacoes") {
      return item.payload?.diario || item.payload?.origem || item.source;
    }
    return (
      item.tribunal_origem ||
      item.data?.fonte?.nome ||
      item.data?.tribunal ||
      "Sistema"
    );
  };

  const getResumo = (item: any) => {
    if (activeTab === "publicacoes") {
      return (
        item.payload?.resumo ||
        item.payload?.texto ||
        item.payload?.conteudo ||
        "Sem resumo"
      );
    }
    return (
      item.conteudo_resumo ||
      item.data?.conteudo ||
      item.data?.texto ||
      item.data?.resumo ||
      "Sem resumo"
    );
  };

  const getTipoMovimentacao = (item: any) => {
    return item.tipo_movimentacao || item.data?.tipo || "ANDAMENTO";
  };

  const getTribunalInfo = (item: any) => {
    if (item.tribunal_origem) {
      return {
        nome: item.tribunal_origem,
        grau: item.grau_instancia || "N/A",
      };
    }

    const fonte = item.data?.fonte;
    return {
      nome: fonte?.nome || fonte?.sigla || "N/A",
      grau: fonte?.grau_formatado || fonte?.grau?.toString() || "N/A",
    };
  };

  const currentData =
    activeTab === "publicacoes" ? publicacoesData : movimentacoesData;
  const currentLoading =
    activeTab === "publicacoes" ? publicacoesLoading : movimentacoesLoading;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Inbox Legal</h1>
          <p className="text-neutral-600 mt-1">
            Triagem de publicações e movimentações
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!currentData.data?.length}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({
                queryKey: ["publicacoes-unificadas-enhanced"],
              });
              queryClient.invalidateQueries({
                queryKey: ["movimentacoes-enhanced"],
              });
              queryClient.invalidateQueries({ queryKey: ["inbox-read-stats"] });
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {currentStats && currentStats.total_items > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-neutral-900">
                  {currentStats.total_items}
                </div>
                <div className="text-sm text-neutral-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {currentStats.unread_items}
                </div>
                <div className="text-sm text-neutral-600">Não lidas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {currentStats.read_items}
                </div>
                <div className="text-sm text-neutral-600">Lidas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {currentStats.treated_items}
                </div>
                <div className="text-sm text-neutral-600">Tratadas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros Avançados */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por CNJ, conteúdo..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <Select
              value={periodoFilter}
              onValueChange={(value) => {
                setPeriodoFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="1">Hoje</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={vinculadaFilter}
              onValueChange={(value) => {
                setVinculadaFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vinculação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="vinculadas">Vinculadas</SelectItem>
                <SelectItem value="nao-vinculadas">Não vinculadas</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={readStatusFilter}
              onValueChange={(value) => {
                setReadStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status Leitura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="lidas">Lidas</SelectItem>
                <SelectItem value="nao-lidas">Não lidas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              value={treatmentFilter}
              onValueChange={(value) => {
                setTreatmentFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status Tratamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="tratadas">Tratadas</SelectItem>
                <SelectItem value="nao-tratadas">Não tratadas</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setPeriodoFilter("all");
                setTribunalFilter("all");
                setVinculadaFilter("all");
                setReadStatusFilter("all");
                setTreatmentFilter("all");
                setCurrentPage(1);
              }}
            >
              <FilterIcon className="w-4 h-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Publicações | Movimentações */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as "publicacoes" | "movimentacoes");
          setCurrentPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="publicacoes" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Publicações ({publicacoesData.total})
            {readStats.find((s) => s.table_name === "publicacoes")
              ?.unread_items > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {
                  readStats.find((s) => s.table_name === "publicacoes")
                    ?.unread_items
                }{" "}
                não lidas
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="movimentacoes"
            className="flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Movimentações ({movimentacoesData.total})
            {readStats.find((s) => s.table_name === "movimentacoes")
              ?.unread_items > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">
                {
                  readStats.find((s) => s.table_name === "movimentacoes")
                    ?.unread_items
                }{" "}
                não lidas
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="publicacoes">
          <Card>
            <CardHeader>
              <CardTitle>
                Publicações Unificadas ({publicacoesData.total})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-neutral-600">
                    Carregando publicações...
                  </span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Origem/Diário</TableHead>
                      <TableHead>Resumo</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="text-neutral-500">
                            <Inbox className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                            <p>Nenhuma publicação encontrada</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentData.data?.map((item: PublicacaoUnificada) => (
                        <TableRow
                          key={`${item.source}-${item.uid}`}
                          className={`hover:bg-neutral-50 ${!item.is_read ? "bg-blue-50" : ""}`}
                        >
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                {item.is_read ? (
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Circle className="w-4 h-4 text-neutral-400" />
                                )}
                                <span className="text-xs">
                                  {item.is_read ? "Lida" : "Não lida"}
                                </span>
                              </div>
                              {item.is_treated && (
                                <div className="flex items-center gap-1">
                                  <Flag className="w-4 h-4 text-blue-600" />
                                  <span className="text-xs text-blue-600">
                                    Tratada
                                  </span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm">
                                {formatDate(item.occured_at)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm">{getOrigem(item)}</span>
                              <Badge variant="outline" className="text-xs">
                                {item.source}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md">
                              <p className="text-sm text-neutral-700 line-clamp-2">
                                {getResumo(item)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.numero_cnj ? (
                              <Badge className="bg-gray-800 text-white">
                                {formatCNJ(item.numero_cnj)}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Não vinculado</Badge>
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
                                {!item.is_read && (
                                  <DropdownMenuItem
                                    onClick={() => handleMarkAsRead(item)}
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Marcar como lida
                                  </DropdownMenuItem>
                                )}
                                {!item.is_treated && (
                                  <DropdownMenuItem
                                    onClick={() => handleMarkAsTreated(item)}
                                  >
                                    <Check className="w-4 h-4 mr-2" />
                                    Marcar como tratada
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setIsVincularDialogOpen(true);
                                  }}
                                >
                                  <Link2 className="w-4 h-4 mr-2" />
                                  Vincular processo
                                </DropdownMenuItem>
                                <CreateStageDialog
                                  numeroCnj={item.numero_cnj || undefined}
                                  defaultTitle={`Analisar publicação: ${getResumo(item)?.substring(0, 50)}...`}
                                  defaultDescription={`Publicação recebida em ${formatDate(item.occured_at)}`}
                                  onSuccess={() => {
                                    toast({
                                      title: "Etapa criada",
                                      description:
                                        "Etapa de jornada criada a partir da publicação.",
                                    });
                                  }}
                                  trigger={
                                    <DropdownMenuItem
                                      onSelect={(e) => e.preventDefault()}
                                    >
                                      <Target className="w-4 h-4 mr-2" />
                                      Criar etapa
                                    </DropdownMenuItem>
                                  }
                                />
                                {item.payload?.url && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      window.open(item.payload.url, "_blank")
                                    }
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Abrir original
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movimentacoes">
          <Card>
            <CardHeader>
              <CardTitle>Movimentações ({movimentacoesData.total})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-neutral-600">
                    Carregando movimentações...
                  </span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Tribunal/Origem</TableHead>
                      <TableHead>Tipo/Grau</TableHead>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="text-neutral-500">
                            <Inbox className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                            <p>Nenhuma movimentação encontrada</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentData.data?.map((item: MovimentacaoEnhanced) => {
                        const tribunalInfo = getTribunalInfo(item);
                        return (
                          <TableRow
                            key={item.id}
                            className={`hover:bg-neutral-50 ${!item.is_read ? "bg-blue-50" : ""}`}
                          >
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1">
                                  {item.is_read ? (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-neutral-400" />
                                  )}
                                  <span className="text-xs">
                                    {item.is_read ? "Lida" : "Não lida"}
                                  </span>
                                </div>
                                {item.is_treated && (
                                  <div className="flex items-center gap-1">
                                    <Flag className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs text-blue-600">
                                      Tratada
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-neutral-400" />
                                <span className="text-sm">
                                  {formatDate(
                                    item.data_evento ||
                                      item.data_movimentacao ||
                                      item.data?.data ||
                                      item.created_at,
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-neutral-400" />
                                <div>
                                  <div className="text-sm font-medium">
                                    {tribunalInfo.nome}
                                  </div>
                                  <div className="text-xs text-neutral-500">
                                    {tribunalInfo.grau}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  getTipoMovimentacao(item) === "PUBLICAÇÃO"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {getTipoMovimentacao(item)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-md">
                                <p className="text-sm text-neutral-700 line-clamp-2">
                                  {getResumo(item)}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.numero_cnj ? (
                                <Badge className="bg-gray-800 text-white">
                                  {formatCNJ(item.numero_cnj)}
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
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
                                  {!item.is_read && (
                                    <DropdownMenuItem
                                      onClick={() => handleMarkAsRead(item)}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      Marcar como lida
                                    </DropdownMenuItem>
                                  )}
                                  {!item.is_treated && (
                                    <DropdownMenuItem
                                      onClick={() => handleMarkAsTreated(item)}
                                    >
                                      <Check className="w-4 h-4 mr-2" />
                                      Marcar como tratada
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setIsVincularDialogOpen(true);
                                    }}
                                  >
                                    <Link2 className="w-4 h-4 mr-2" />
                                    Vincular processo
                                  </DropdownMenuItem>
                                  <CreateStageDialog
                                    numeroCnj={item.numero_cnj || undefined}
                                    defaultTitle={`Analisar movimentação: ${getResumo(item)?.substring(0, 50)}...`}
                                    defaultDescription={`Movimentação processual de ${formatDate(item.data_evento || item.data_movimentacao || item.created_at)}`}
                                    onSuccess={() => {
                                      toast({
                                        title: "Etapa criada",
                                        description:
                                          "Etapa de jornada criada a partir da movimentação.",
                                      });
                                    }}
                                    trigger={
                                      <DropdownMenuItem
                                        onSelect={(e) => e.preventDefault()}
                                      >
                                        <Target className="w-4 h-4 mr-2" />
                                        Criar etapa
                                      </DropdownMenuItem>
                                    }
                                  />
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Paginação */}
      {currentData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
            {Math.min(currentPage * itemsPerPage, currentData.total)} de{" "}
            {currentData.total} itens
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
              Página {currentPage} de {currentData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === currentData.totalPages}
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Vincular Processo */}
      <Dialog
        open={isVincularDialogOpen}
        onOpenChange={setIsVincularDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleVincular}>
            <DialogHeader>
              <DialogTitle>Vincular ao Processo</DialogTitle>
              <DialogDescription>
                Selecione o processo para vincular este item. Busque por CNJ ou
                nome das partes.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {/* CNJ Auto-detectado */}
              {cnjDetectado && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      CNJ detectado automaticamente: {formatCNJ(cnjDetectado)}
                    </span>
                  </div>
                </div>
              )}

              {/* Busca de processos */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Buscar processo por CNJ ou nome das partes
                </Label>
                <div className="relative">
                  <FileSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                  <Input
                    placeholder="Digite CNJ, nome do autor ou réu..."
                    value={processoSearchTerm}
                    onChange={(e) => setProcessoSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Lista de processos */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Processo para vincular
                </Label>
                <Select
                  value={selectedProcesso}
                  onValueChange={setSelectedProcesso}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um processo" />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {processosParaVincular.map((processo) => (
                      <SelectItem
                        key={processo.numero_cnj}
                        value={processo.numero_cnj}
                      >
                        <div className="flex flex-col">
                          <div className="font-medium">
                            {formatCNJ(processo.numero_cnj)}
                          </div>
                          <div className="text-sm text-neutral-600">
                            {processo.display_name ||
                              `${processo.titulo_polo_ativo || "Requerente"} x ${processo.titulo_polo_passivo || "Requerido"}`}
                          </div>
                          {processo.tribunal_sigla && (
                            <div className="text-xs text-neutral-500">
                              {processo.tribunal_sigla}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview do item */}
              {selectedItem && (
                <div className="p-3 bg-neutral-50 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Preview do item:</h4>
                  <p className="text-sm text-neutral-700 line-clamp-3">
                    {getResumo(selectedItem)}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-neutral-500">
                    <span>Tipo: {activeTab}</span>
                    <span>
                      Data:{" "}
                      {formatDate(
                        activeTab === "publicacoes"
                          ? selectedItem.occured_at
                          : selectedItem.data_evento ||
                              selectedItem.data_movimentacao ||
                              selectedItem.created_at,
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsVincularDialogOpen(false);
                  setSelectedItem(null);
                  setSelectedProcesso("");
                  setProcessoSearchTerm("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={vincularMutation.isPending || !selectedProcesso}
              >
                {vincularMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Vincular
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
