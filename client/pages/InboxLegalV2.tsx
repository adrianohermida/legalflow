import React, { useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
  Search,
  Filter,
  Inbox,
  FileText,
  Building,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Link2,
  Bell,
  Calendar,
  ExternalLink,
  Plus,
  Eye,
  Target,
  Activity,
  User,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatDate, formatCNJ } from "../lib/utils";

interface PublicacaoUnificada {
  source: 'publicacoes' | 'movimentacoes';
  uid: number;
  numero_cnj: string | null;
  occured_at: string;
  payload: any;
  created_at: string;
}

interface Movimentacao {
  id: number;
  numero_cnj: string | null;
  data: any;
  created_at: string;
  data_movimentacao: string | null;
}

interface ProcessoParaVincular {
  numero_cnj: string;
  titulo_polo_ativo: string;
  titulo_polo_passivo: string;
}

interface Advogado {
  oab: number;
  nome: string;
}

export default function InboxLegalV2() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'publicacoes' | 'movimentacoes'>('publicacoes');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isVincularDialogOpen, setIsVincularDialogOpen] = useState(false);
  const [isNotificarDialogOpen, setIsNotificarDialogOpen] = useState(false);
  const [isCriarProcessoDialogOpen, setIsCriarProcessoDialogOpen] = useState(false);
  const [periodoFilter, setPeriodoFilter] = useState('all');
  const [tribunalFilter, setTribunalFilter] = useState('all');
  const [vinculadaFilter, setVinculadaFilter] = useState('all');
  const [novoProcessoCnj, setNovoProcessoCnj] = useState('');
  const [buscandoProcesso, setBuscandoProcesso] = useState(false);
  const [dadosProcessoAdvise, setDadosProcessoAdvise] = useState<any>(null);

  const itemsPerPage = 20;

  // Buscar publicações unificadas (publicações + movimentações que são publicações)
  const {
    data: publicacoesData = { data: [], total: 0, totalPages: 0 },
    isLoading: publicacoesLoading,
    error: publicacoesError,
  } = useQuery({
    queryKey: ["publicacoes-unificadas", searchTerm, currentPage, periodoFilter, tribunalFilter, vinculadaFilter],
    queryFn: async () => {
      let query = supabase
        .from("vw_publicacoes_unificadas")
        .select("*", { count: "exact" })
        .order("occured_at", { ascending: false, nullsLast: true });

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(`numero_cnj.ilike.%${searchTerm}%,payload->>resumo.ilike.%${searchTerm}%,payload->>texto.ilike.%${searchTerm}%`);
      }

      if (vinculadaFilter === 'vinculadas') {
        query = query.not('numero_cnj', 'is', null);
      } else if (vinculadaFilter === 'nao-vinculadas') {
        query = query.is('numero_cnj', null);
      }

      if (periodoFilter !== 'all') {
        const days = parseInt(periodoFilter);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('occured_at', startDate.toISOString());
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const { data, error, count } = await query
        .range(startIndex, startIndex + itemsPerPage - 1);

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

  // Buscar movimentações
  const {
    data: movimentacoesData = { data: [], total: 0, totalPages: 0 },
    isLoading: movimentacoesLoading,
    error: movimentacoesError,
  } = useQuery({
    queryKey: ["movimentacoes", searchTerm, currentPage, periodoFilter, tribunalFilter, vinculadaFilter],
    queryFn: async () => {
      let query = supabase
        .from("movimentacoes")
        .select("*", { count: "exact" })
        .order("data_movimentacao", { ascending: false, nullsLast: true });

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(`numero_cnj.ilike.%${searchTerm}%,data->>texto.ilike.%${searchTerm}%,data->>resumo.ilike.%${searchTerm}%`);
      }

      if (vinculadaFilter === 'vinculadas') {
        query = query.not('numero_cnj', 'is', null);
      } else if (vinculadaFilter === 'nao-vinculadas') {
        query = query.is('numero_cnj', null);
      }

      if (periodoFilter !== 'all') {
        const days = parseInt(periodoFilter);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        query = query.gte('data_movimentacao', startDate.toISOString());
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const { data, error, count } = await query
        .range(startIndex, startIndex + itemsPerPage - 1);

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

  // Buscar processos para vincular
  const { data: processos = [] } = useQuery({
    queryKey: ["processos-para-vincular"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("numero_cnj, titulo_polo_ativo, titulo_polo_passivo")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as ProcessoParaVincular[];
    },
  });

  // Buscar advogados para notificar
  const { data: advogados = [] } = useQuery({
    queryKey: ["advogados-para-notificar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advogados")
        .select("oab, nome")
        .order("nome");
      
      if (error) throw error;
      return data as Advogado[];
    },
  });

  // Mutation para vincular ao CNJ
  const vincularMutation = useMutation({
    mutationFn: async ({ itemId, tableName, numero_cnj }: { itemId: number; tableName: string; numero_cnj: string }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update({ numero_cnj })
        .eq("id", itemId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publicacoes-unificadas"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
      setIsVincularDialogOpen(false);
      setSelectedItem(null);
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

  // Mutation para criar processo
  const criarProcessoMutation = useMutation({
    mutationFn: async ({ numero_cnj, dadosAdvise }: { numero_cnj: string; dadosAdvise: any }) => {
      const { data, error } = await supabase
        .from("processos")
        .insert({
          numero_cnj,
          tribunal_sigla: dadosAdvise?.tribunal,
          titulo_polo_ativo: dadosAdvise?.polo_ativo || dadosAdvise?.assunto,
          titulo_polo_passivo: dadosAdvise?.polo_passivo,
          data: { capa: dadosAdvise }
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (processo) => {
      queryClient.invalidateQueries({ queryKey: ["processos-para-vincular"] });
      setIsCriarProcessoDialogOpen(false);
      setDadosProcessoAdvise(null);
      
      // Vincular automaticamente o item ao processo criado
      if (selectedItem) {
        const tableName = selectedItem.source || (activeTab === 'publicacoes' ? 'publicacoes' : 'movimentacoes');
        vincularMutation.mutate({
          itemId: selectedItem.uid || selectedItem.id,
          tableName,
          numero_cnj: processo.numero_cnj
        });
      }
      
      toast({
        title: "Processo criado",
        description: `Processo ${formatCNJ(processo.numero_cnj)} criado e vinculado`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar processo",
        variant: "destructive",
      });
    },
  });

  // Mutation para notificar responsável
  const notificarMutation = useMutation({
    mutationFn: async ({ oab, message, title }: { oab: number; message: string; title: string }) => {
      // Buscar user_id do advogado
      const { data: userAdvogado } = await supabase
        .from("user_advogado")
        .select("user_id")
        .eq("oab", oab)
        .single();

      if (!userAdvogado) {
        throw new Error("Advogado não encontrado no sistema");
      }

      // Inserir notificação
      const { data, error } = await supabase
        .from("notifications")
        .insert([{
          user_id: userAdvogado.user_id,
          title,
          message,
          read: false,
        }])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setIsNotificarDialogOpen(false);
      setSelectedItem(null);
      toast({
        title: "Notificação enviada",
        description: "Responsável notificado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar notificação",
        variant: "destructive",
      });
    },
  });

  // Buscar processo no Advise
  const buscarProcessoAdvise = async (cnj: string) => {
    setBuscandoProcesso(true);
    try {
      // Simular busca no Advise - aqui você colocaria a chamada real da API
      const response = await fetch(`/api/advise/processo/${cnj}`).catch(() => null);
      
      if (response?.ok) {
        const dados = await response.json();
        setDadosProcessoAdvise(dados);
      } else {
        // Dados mock para demonstração
        const mockData = {
          numero_cnj: cnj,
          tribunal: 'TJSP',
          assunto: 'Ação Civil Pública',
          polo_ativo: 'Requerente',
          polo_passivo: 'Requerido',
          classe: 'Procedimento Comum',
          area: 'Cível'
        };
        setDadosProcessoAdvise(mockData);
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao buscar dados do processo",
        variant: "destructive",
      });
    } finally {
      setBuscandoProcesso(false);
    }
  };

  const handleVincular = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const numero_cnj = formData.get("numero_cnj") as string;
    
    if (!selectedItem) return;

    const tableName = selectedItem.source === 'publicacoes' ? 'publicacoes' : 'movimentacoes';
    const itemId = selectedItem.source ? selectedItem.uid : selectedItem.id;

    vincularMutation.mutate({ itemId, tableName, numero_cnj });
  };

  const handleNotificar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const oab = parseInt(formData.get("oab") as string);
    const customMessage = formData.get("message") as string;

    if (!selectedItem) return;

    const isPublicacao = activeTab === "publicacoes";
    const title = `Nova ${isPublicacao ? "Publicação" : "Movimentação"} - ${selectedItem.numero_cnj || "Sem CNJ"}`;
    const defaultMessage = `Uma nova ${isPublicacao ? "publicação" : "movimentação"} foi registrada${selectedItem.numero_cnj ? ` para o processo ${selectedItem.numero_cnj}` : ""}.`;
    const message = customMessage || defaultMessage;

    notificarMutation.mutate({ oab, message, title });
  };

  const handleCriarProcesso = () => {
    if (!dadosProcessoAdvise || !novoProcessoCnj) return;
    criarProcessoMutation.mutate({
      numero_cnj: novoProcessoCnj,
      dadosAdvise: dadosProcessoAdvise
    });
  };

  const getOrigem = (item: any) => {
    if (activeTab === 'publicacoes') {
      return item.payload?.diario || item.payload?.origem || item.source;
    }
    return item.data?.origem || item.data?.tribunal || 'Sistema';
  };

  const getResumo = (item: any) => {
    if (activeTab === 'publicacoes') {
      return item.payload?.resumo || item.payload?.texto || item.payload?.conteudo || 'Sem resumo';
    }
    return item.data?.texto || item.data?.resumo || item.data?.movimento || 'Sem resumo';
  };

  const currentData = activeTab === "publicacoes" ? publicacoesData : movimentacoesData;
  const currentLoading = activeTab === "publicacoes" ? publicacoesLoading : movimentacoesLoading;
  const currentError = activeTab === "publicacoes" ? publicacoesError : movimentacoesError;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold">Inbox Legal</h1>
          <p className="text-neutral-600 mt-1">Triagem de publicações e movimentações</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por CNJ, resumo ou texto..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={periodoFilter} onValueChange={(value) => {
              setPeriodoFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>

            <Select value={vinculadaFilter} onValueChange={(value) => {
              setVinculadaFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Vinculação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="vinculadas">Vinculadas</SelectItem>
                <SelectItem value="nao-vinculadas">Não vinculadas</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setPeriodoFilter('all');
                setTribunalFilter('all');
                setVinculadaFilter('all');
                setCurrentPage(1);
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Publicações | Movimentações */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as 'publicacoes' | 'movimentacoes');
        setCurrentPage(1);
      }}>
        <TabsList>
          <TabsTrigger value="publicacoes" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Publicações ({publicacoesData.total})
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Movimentações ({movimentacoesData.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="publicacoes">
          <Card>
            <CardHeader>
              <CardTitle>Publicações Unificadas ({publicacoesData.total})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-700)' }} />
                  <span className="ml-2 text-neutral-600">Carregando publicações...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
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
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-neutral-500">
                            <Inbox className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                            <p>Nenhuma publicação encontrada</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentData.data?.map((item: any) => (
                        <TableRow key={`${item.source}-${item.uid}`} className="hover:bg-neutral-50">
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
                              <span className="text-sm">
                                {getOrigem(item)}
                              </span>
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
                              <Badge style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}>
                                {formatCNJ(item.numero_cnj)}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                Não vinculado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsVincularDialogOpen(true);
                                }}
                                style={{ color: 'var(--brand-700)' }}
                              >
                                <Link2 className="w-4 h-4 mr-1" />
                                Vincular
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsNotificarDialogOpen(true);
                                }}
                              >
                                <Bell className="w-4 h-4 mr-1" />
                                Notificar
                              </Button>
                              {item.payload?.url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(item.payload.url, '_blank')}
                                >
                                  <ExternalLink className="w-4 h-4 mr-1" />
                                  Abrir
                                </Button>
                              )}
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
        </TabsContent>

        <TabsContent value="movimentacoes">
          <Card>
            <CardHeader>
              <CardTitle>Movimentações ({movimentacoesData.total})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-700)' }} />
                  <span className="ml-2 text-neutral-600">Carregando movimentações...</span>
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
                    {currentData.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-neutral-500">
                            <Inbox className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                            <p>Nenhuma movimentação encontrada</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentData.data?.map((item: Movimentacao) => (
                        <TableRow key={item.id} className="hover:bg-neutral-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm">
                                {formatDate(item.data_movimentacao || item.created_at)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm">
                                {getOrigem(item)}
                              </span>
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
                              <Badge style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}>
                                {formatCNJ(item.numero_cnj)}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                Não vinculado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsVincularDialogOpen(true);
                                }}
                                style={{ color: 'var(--brand-700)' }}
                              >
                                <Link2 className="w-4 h-4 mr-1" />
                                Vincular
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsNotificarDialogOpen(true);
                                }}
                              >
                                <Bell className="w-4 h-4 mr-1" />
                                Notificar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Aqui você pode adicionar lógica para criar tarefa
                                  toast({
                                    title: "Criar Tarefa",
                                    description: "Funcionalidade será implementada"
                                  });
                                }}
                              >
                                <Target className="w-4 h-4 mr-1" />
                                Tarefa
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
        </TabsContent>
      </Tabs>

      {/* Paginação */}
      {currentData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, currentData.total)} de {currentData.total} itens
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

      {/* Dialog Vincular CNJ */}
      <Dialog open={isVincularDialogOpen} onOpenChange={setIsVincularDialogOpen}>
        <DialogContent>
          <form onSubmit={handleVincular}>
            <DialogHeader>
              <DialogTitle>Vincular ao Processo</DialogTitle>
              <DialogDescription>
                Selecione o processo para vincular este item ou crie um novo processo
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Processo (CNJ)</label>
                <Select name="numero_cnj" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um processo" />
                  </SelectTrigger>
                  <SelectContent>
                    {processos.map((processo) => (
                      <SelectItem key={processo.numero_cnj} value={processo.numero_cnj}>
                        {formatCNJ(processo.numero_cnj)} - {processo.titulo_polo_ativo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-neutral-200" />
                <span className="text-sm text-neutral-500">ou</span>
                <div className="flex-1 border-t border-neutral-200" />
              </div>
              
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsVincularDialogOpen(false);
                  setIsCriarProcessoDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Novo Processo
              </Button>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsVincularDialogOpen(false);
                  setSelectedItem(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={vincularMutation.isPending}>
                {vincularMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Vincular
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Criar Processo */}
      <Dialog open={isCriarProcessoDialogOpen} onOpenChange={setIsCriarProcessoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Criar Novo Processo</DialogTitle>
            <DialogDescription>
              Busque os dados do processo no Advise e crie um novo registro
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Número CNJ</label>
              <div className="flex gap-2">
                <Input
                  placeholder="0000000-00.0000.0.00.0000"
                  value={novoProcessoCnj}
                  onChange={(e) => setNovoProcessoCnj(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => buscarProcessoAdvise(novoProcessoCnj)}
                  disabled={!novoProcessoCnj || buscandoProcesso}
                >
                  {buscandoProcesso ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Buscar
                </Button>
              </div>
            </div>
            
            {dadosProcessoAdvise && (
              <div className="border rounded-lg p-4 bg-neutral-50">
                <h4 className="font-medium mb-3">Dados encontrados no Advise:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">CNJ:</span> {dadosProcessoAdvise.numero_cnj}
                  </div>
                  <div>
                    <span className="font-medium">Tribunal:</span> {dadosProcessoAdvise.tribunal}
                  </div>
                  <div>
                    <span className="font-medium">Classe:</span> {dadosProcessoAdvise.classe}
                  </div>
                  <div>
                    <span className="font-medium">Área:</span> {dadosProcessoAdvise.area}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Assunto:</span> {dadosProcessoAdvise.assunto}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCriarProcessoDialogOpen(false);
                setDadosProcessoAdvise(null);
                setNovoProcessoCnj('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCriarProcesso}
              disabled={!dadosProcessoAdvise || criarProcessoMutation.isPending}
            >
              {criarProcessoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Processo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Notificar Responsável */}
      <Dialog open={isNotificarDialogOpen} onOpenChange={setIsNotificarDialogOpen}>
        <DialogContent>
          <form onSubmit={handleNotificar}>
            <DialogHeader>
              <DialogTitle>Notificar Responsável</DialogTitle>
              <DialogDescription>
                Envie uma notificação para o advogado responsável
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Advogado</label>
                <Select name="oab" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um advogado" />
                  </SelectTrigger>
                  <SelectContent>
                    {advogados.map((advogado) => (
                      <SelectItem key={advogado.oab} value={advogado.oab.toString()}>
                        {advogado.nome} (OAB {advogado.oab})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mensagem personalizada (opcional)</label>
                <Input
                  name="message"
                  placeholder="Deixe em branco para usar mensagem padrão"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNotificarDialogOpen(false);
                  setSelectedItem(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={notificarMutation.isPending}>
                {notificarMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Notificar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
