import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  MoreHorizontal
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '../components/ui/dialog';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '../components/ui/dropdown-menu';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { supabase, lf } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { processAPIService } from '../lib/process-api-service';
import { formatCNJ, formatCPFCNPJ, formatDate, formatDateTime } from '../lib/utils';

interface ProcessoData {
  numero_cnj: string;
  tribunal_sigla: string | null;
  titulo_polo_ativo: string | null;
  titulo_polo_passivo: string | null;
  data: any;
  created_at: string;
  crm_id: string | null;
  decisoes: string | null;
}

interface ProcessoCapa {
  area: string;
  classe: string;
  assunto: string;
  valor_causa: number | null;
  orgao_julgador: string;
  data_distribuicao: string;
  data_arquivamento: string | null;
  fontes: Array<{
    sigla: string;
    sistema: string;
    grau: number;
    tribunal: string;
  }>;
  audiencias?: Array<{
    data: string;
    tipo: string;
    situacao: string;
    participantes: string[];
  }>;
}

interface ParteProcesso {
  id: string;
  numero_cnj: string;
  polo: 'ativo' | 'passivo' | 'outros';
  papel: string;
  nome: string;
  tipo_pessoa: 'fisica' | 'juridica';
  cpfcnpj: string | null;
  is_cliente: boolean;
  advogado_oabs: number[];
  created_at: string;
}

interface Movimentacao {
  id: number;
  numero_cnj: string;
  data: string;
  orgao: string;
  texto: string;
  anexos: string[] | null;
  created_at: string;
}

interface Publicacao {
  id: number;
  numero_cnj: string;
  diario: string;
  data_publicacao: string;
  resumo: string;
  palavra_chave: string;
  lido: boolean;
  created_at: string;
}

interface MonitoringSettings {
  numero_cnj: string;
  fonte: 'advise' | 'escavador';
  premium_on: boolean;
  updated_at: string;
}

export function ProcessoDetail() {
  const { numero_cnj } = useParams<{ numero_cnj: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('capa');
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedParte, setSelectedParte] = useState<ParteProcesso | null>(null);
  const [isClienteDialogOpen, setIsClienteDialogOpen] = useState(false);

  if (!numero_cnj) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">CNJ não informado</h2>
          <p className="text-neutral-600 mb-4">O número CNJ é obrigatório para visualizar o processo.</p>
          <Button onClick={() => navigate('/processos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Processos
          </Button>
        </div>
      </div>
    );
  }

  // Query processo principal
  const {
    data: processo,
    isLoading: processoLoading,
    error: processoError,
    refetch: refetchProcesso
  } = useQuery({
    queryKey: ['processo', numero_cnj],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processos')
        .select('*')
        .eq('numero_cnj', numero_cnj)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
  });

  // Query monitoring settings
  const {
    data: monitoringSettings,
    refetch: refetchSettings
  } = useQuery({
    queryKey: ['monitoring-settings', numero_cnj],
    queryFn: async () => {
      const { data, error } = await lf
        .from('monitoring_settings')
        .select('*')
        .eq('numero_cnj', numero_cnj)
        .single();
      
      if (error && error.code !== 'PGRST116') return null;
      return data;
    },
  });

  // Query partes do processo
  const {
    data: partes = [],
    isLoading: partesLoading,
    refetch: refetchPartes
  } = useQuery({
    queryKey: ['partes-processo', numero_cnj],
    queryFn: async () => {
      const { data, error } = await lf
        .from('partes_processo')
        .select('*')
        .eq('numero_cnj', numero_cnj)
        .order('polo', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Query movimentações
  const {
    data: movimentacoes = [],
    isLoading: movimentacoesLoading,
    refetch: refetchMovimentacoes
  } = useQuery({
    queryKey: ['movimentacoes', numero_cnj],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentacoes')
        .select('*')
        .eq('numero_cnj', numero_cnj)
        .order('data', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Query publicações
  const {
    data: publicacoes = [],
    isLoading: publicacoesLoading,
    refetch: refetchPublicacoes
  } = useQuery({
    queryKey: ['publicacoes', numero_cnj],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publicacoes')
        .select('*')
        .eq('numero_cnj', numero_cnj)
        .order('data_publicacao', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Query documentos
  const {
    data: documentos = [],
    isLoading: documentosLoading,
    refetch: refetchDocumentos
  } = useQuery({
    queryKey: ['documentos', numero_cnj],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('numero_cnj', numero_cnj)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Initialize premium state
  useEffect(() => {
    if (monitoringSettings) {
      setPremiumEnabled(monitoringSettings.premium_on);
    }
  }, [monitoringSettings]);

  // Mutation para configurar monitoramento
  const updateMonitoringMutation = useMutation({
    mutationFn: async ({ premium }: { premium: boolean }) => {
      const provider = premium ? 'escavador' : 'advise';

      const { error } = await lf.rpc('lf_set_monitoring', {
        p_numero_cnj: numero_cnj,
        p_provider: provider,
        p_active: true,
        p_premium: premium
      });

      if (error) throw error;
      setPremiumEnabled(premium);
    },
    onSuccess: () => {
      refetchMonitoring();
      toast({
        title: "Monitoramento atualizado",
        description: "Configurações de monitoramento salvas com sucesso"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar monitoramento",
        variant: "destructive"
      });
    }
  });

  // Mutation para executar sync
  const runSyncMutation = useMutation({
    mutationFn: async () => {
      setIsUpdating(true);

      const { data: jobId, error } = await lf.rpc('lf_run_sync', {
        p_numero_cnj: numero_cnj
      });

      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => {
      setIsUpdating(false);
      toast({
        title: "Sync enfileirado",
        description: `Sync iniciado (#${jobId}). Aguarde a conclusão...`,
      });

      // Invalidar queries após sync
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['processo', numero_cnj] });
        queryClient.invalidateQueries({ queryKey: ['partes-processo', numero_cnj] });
        queryClient.invalidateQueries({ queryKey: ['monitoring-settings', numero_cnj] });
        refetchMovimentacoes();
        refetchPublicacoes();
      }, 2000);
    },
    onError: (error: any) => {
      setIsUpdating(false);
      toast({
        title: "Erro no sync",
        description: error.message || "Erro ao executar sincronização",
        variant: "destructive",
      });
    },
  });

  // Mutation para marcar publicação como lida
  const markPublicacaoMutation = useMutation({
    mutationFn: async ({ publicacaoId, lido }: { publicacaoId: number; lido: boolean }) => {
      // Implement Advise API call to mark as read
      const result = await processAPIService.markPublicacaoLida(publicacaoId, lido);
      return result;
    },
    onSuccess: () => {
      refetchPublicacoes();
      toast({
        title: "Status atualizado",
        description: "Publicação marcada com sucesso",
      });
    },
  });

  // Copy CNJ to clipboard
  const copyCNJ = () => {
    navigator.clipboard.writeText(numero_cnj);
    toast({
      title: "CNJ copiado",
      description: "Número CNJ copiado para a área de transferência",
    });
  };

  // Create quick actions
  const createTicket = () => {
    navigate(`/tickets/new?numero_cnj=${numero_cnj}`);
  };

  const createActivity = () => {
    navigate(`/activities/new?numero_cnj=${numero_cnj}`);
  };

  const openChat = () => {
    // Open chat thread for this process
    window.dispatchEvent(new CustomEvent('open-chat', { 
      detail: { numero_cnj, context: 'processo' } 
    }));
  };

  const startJourney = () => {
    navigate(`/jornadas/new?numero_cnj=${numero_cnj}`);
  };

  // Add parte as cliente
  const addParteAsCliente = async (parte: ParteProcesso) => {
    if (!parte.cpfcnpj) {
      toast({
        title: "CPF/CNPJ necessário",
        description: "Esta parte não possui CPF/CNPJ cadastrado",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('clientes')
        .upsert({
          cpfcnpj: parte.cpfcnpj,
          nome: parte.nome,
        });

      if (error) throw error;

      // Update parte to mark as cliente
      const { error: parteError } = await lf
        .from('partes_processo')
        .update({ is_cliente: true })
        .eq('id', parte.id);

      if (parteError) throw parteError;

      refetchPartes();
      setIsClienteDialogOpen(false);

      toast({
        title: "Cliente criado",
        description: `${parte.nome} foi adicionado como cliente`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar cliente",
        variant: "destructive",
      });
    }
  };

  // Get processo capa data
  const capa: ProcessoCapa | null = processo?.data?.capa || null;
  const lastUpdate = processo?.created_at ? new Date(processo.created_at) : null;

  // Filter data based on search
  const filteredMovimentacoes = movimentacoes.filter(mov =>
    mov.texto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    mov.orgao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPublicacoes = publicacoes.filter(pub =>
    pub.resumo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pub.palavra_chave.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDocumentos = documentos.filter(doc =>
    doc.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (processoError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Erro ao carregar processo</h2>
          <p className="text-neutral-600 mb-4">{processoError.message}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => refetchProcesso()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Tentar Novamente
            </Button>
            <Button variant="outline" onClick={() => navigate('/processos')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageErrorBoundary pageName="ProcessoDetail">
      <div className="min-h-screen bg-neutral-50">
        {/* V2 Banner */}
        <div className="bg-blue-600 text-white p-3">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <span className="font-medium">🚀 Nova versão disponível!</span>
              <span className="text-blue-100">Experimente o ProcessoDetail v2 com chat IA, monitoramento avançado e muito mais</span>
            </div>
            <Link
              to={`/processos-v2/${numero_cnj}`}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Testar V2
            </Link>
          </div>
        </div>
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-white border-b border-neutral-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/processos')}
                className="text-neutral-600 hover:text-neutral-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Processos
              </Button>
              
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-semibold">
                      {formatCNJ(numero_cnj)}
                    </h1>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyCNJ}
                      className="text-neutral-500 hover:text-neutral-700"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-600">
                    {capa?.fontes?.[0]?.tribunal && (
                      <span>{capa.fontes[0].tribunal}</span>
                    )}
                    {capa && (
                      <>
                        <span>•</span>
                        <Badge variant="outline" className="text-xs">
                          {capa.classe}
                        </Badge>
                      </>
                    )}
                    {lastUpdate && (
                      <>
                        <span>•</span>
                        <span>Atualizado {formatDateTime(lastUpdate.toISOString())}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={() => updateProcessoMutation.mutate()}
                disabled={isUpdating}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
                Atualizar Agora
              </Button>

              {/* Quick Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Ações Rápidas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={createTicket}>
                    <FileText className="w-4 h-4 mr-2" />
                    Criar Ticket
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={createActivity}>
                    <Activity className="w-4 h-4 mr-2" />
                    Criar Atividade
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={openChat}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Abrir Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={startJourney}>
                    <Users className="w-4 h-4 mr-2" />
                    Iniciar Jornada
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Column A: Context & Timeline (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="capa">Capa</TabsTrigger>
                <TabsTrigger value="audiencias">Audiências</TabsTrigger>
                <TabsTrigger value="partes">Partes</TabsTrigger>
                <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
                <TabsTrigger value="publicacoes">Publicações</TabsTrigger>
                <TabsTrigger value="documentos">Documentos</TabsTrigger>
              </TabsList>

              {/* Capa Tab */}
              <TabsContent value="capa">
                <Card>
                  <CardHeader>
                    <CardTitle>Dados da Capa</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {processoLoading ? (
                      <div className="space-y-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="h-4 bg-neutral-200 rounded animate-pulse" />
                        ))}
                      </div>
                    ) : capa ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-neutral-600">��rea</Label>
                            <p className="text-sm mt-1">{capa.area}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-neutral-600">Classe</Label>
                            <p className="text-sm mt-1">{capa.classe}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-neutral-600">Assunto</Label>
                            <p className="text-sm mt-1">{capa.assunto}</p>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <Label className="text-sm font-medium text-neutral-600">Valor da Causa</Label>
                            <p className="text-sm mt-1">
                              {capa.valor_causa 
                                ? new Intl.NumberFormat('pt-BR', { 
                                    style: 'currency', 
                                    currency: 'BRL' 
                                  }).format(capa.valor_causa)
                                : 'Não informado'
                              }
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-neutral-600">Órgão Julgador</Label>
                            <p className="text-sm mt-1">{capa.orgao_julgador}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-neutral-600">Data de Distribuição</Label>
                            <p className="text-sm mt-1">{formatDate(capa.data_distribuicao)}</p>
                          </div>
                          {capa.data_arquivamento && (
                            <div>
                              <Label className="text-sm font-medium text-neutral-600">Data de Arquivamento</Label>
                              <p className="text-sm mt-1">{formatDate(capa.data_arquivamento)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-neutral-600 mb-2">
                          Dados da capa não disponíveis
                        </h3>
                        <p className="text-neutral-500 mb-4">
                          Clique em "Atualizar Agora" para buscar os dados da fonte ativa.
                        </p>
                        <Button
                          onClick={() => updateProcessoMutation.mutate()}
                          disabled={isUpdating}
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
                          Buscar Dados
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Audiências Tab */}
              <TabsContent value="audiencias">
                <Card>
                  <CardHeader>
                    <CardTitle>Audiências</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {capa?.audiencias && capa.audiencias.length > 0 ? (
                      <div className="space-y-4">
                        {capa.audiencias.map((audiencia, index) => (
                          <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Calendar className="w-4 h-4 text-neutral-500" />
                                <span className="font-medium">{formatDateTime(audiencia.data)}</span>
                                <Badge variant="outline">{audiencia.tipo}</Badge>
                                <Badge 
                                  variant={audiencia.situacao === 'Realizada' ? 'default' : 'secondary'}
                                >
                                  {audiencia.situacao}
                                </Badge>
                              </div>
                              <p className="text-sm text-neutral-600">
                                Participantes: {audiencia.participantes.join(', ')}
                              </p>
                            </div>
                            <Button variant="outline" size="sm">
                              <Calendar className="w-4 h-4 mr-2" />
                              Adicionar ao Calendário
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-500">Nenhuma audiência encontrada</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Partes Tab */}
              <TabsContent value="partes">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Partes & Representantes</CardTitle>
                      {partesLoading && (
                        <RefreshCw className="w-4 h-4 animate-spin text-neutral-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {partes.length > 0 ? (
                      <div className="space-y-6">
                        {['ativo', 'passivo', 'outros'].map((polo) => {
                          const partesGrupo = partes.filter(p => p.polo === polo);
                          if (partesGrupo.length === 0) return null;

                          return (
                            <div key={polo}>
                              <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-neutral-600">
                                Polo {polo.charAt(0).toUpperCase() + polo.slice(1)}
                              </h4>
                              <div className="space-y-3">
                                {partesGrupo.map((parte) => (
                                  <div key={parte.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium">{parte.nome}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {parte.papel}
                                        </Badge>
                                        {parte.is_cliente && (
                                          <Badge className="text-xs bg-green-100 text-green-800">
                                            Cliente
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-4 text-sm text-neutral-600">
                                        <span>
                                          {parte.tipo_pessoa === 'fisica' ? '👤' : '🏢'} 
                                          {parte.tipo_pessoa === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                                        </span>
                                        {parte.cpfcnpj && (
                                          <span>{formatCPFCNPJ(parte.cpfcnpj)}</span>
                                        )}
                                        {parte.advogado_oabs.length > 0 && (
                                          <span>OABs: {parte.advogado_oabs.join(', ')}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {!parte.is_cliente && parte.cpfcnpj && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setSelectedParte(parte);
                                            setIsClienteDialogOpen(true);
                                          }}
                                        >
                                          <User className="w-4 h-4 mr-1" />
                                          Criar Cliente
                                        </Button>
                                      )}
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm">
                                            <MoreHorizontal className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                          <DropdownMenuItem onClick={createTicket}>
                                            Criar Ticket
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={createActivity}>
                                            Criar Atividade
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-500">Nenhuma parte encontrada</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Movimentações Tab */}
              <TabsContent value="movimentacoes">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Movimentações ({filteredMovimentacoes.length})</CardTitle>
                      {movimentacoesLoading && (
                        <RefreshCw className="w-4 h-4 animate-spin text-neutral-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredMovimentacoes.length > 0 ? (
                      <div className="space-y-4">
                        {filteredMovimentacoes.map((mov) => (
                          <div key={mov.id} className="flex gap-4 p-4 border rounded-lg">
                            <div className="flex-shrink-0">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Building className="w-4 h-4 text-blue-600" />
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium">{formatDateTime(mov.data)}</span>
                                <Badge variant="outline" className="text-xs">
                                  {mov.orgao}
                                </Badge>
                              </div>
                              <p className="text-sm text-neutral-700">{mov.texto}</p>
                              {mov.anexos && mov.anexos.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-neutral-500 mb-1">Anexos:</p>
                                  <div className="flex gap-2">
                                    {mov.anexos.map((anexo, idx) => (
                                      <Button key={idx} variant="outline" size="sm">
                                        <Download className="w-3 h-3 mr-1" />
                                        {anexo}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={createTicket}>
                                  Criar Ticket
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={createActivity}>
                                  Criar Atividade
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={openChat}>
                                  Enviar ao Chat
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Activity className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-500">
                          {searchTerm ? 'Nenhuma movimentação encontrada para o filtro' : 'Nenhuma movimentação encontrada'}
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
                    <div className="flex items-center justify-between">
                      <CardTitle>Publicações ({filteredPublicacoes.length})</CardTitle>
                      {publicacoesLoading && (
                        <RefreshCw className="w-4 h-4 animate-spin text-neutral-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredPublicacoes.length > 0 ? (
                      <div className="space-y-4">
                        {filteredPublicacoes.map((pub) => (
                          <div key={pub.id} className="flex gap-4 p-4 border rounded-lg">
                            <div className="flex-shrink-0">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                pub.lido ? 'bg-green-100' : 'bg-yellow-100'
                              }`}>
                                {pub.lido ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                  <Bell className="w-4 h-4 text-yellow-600" />
                                )}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium">{formatDate(pub.data_publicacao)}</span>
                                <Badge variant="outline" className="text-xs">
                                  {pub.diario}
                                </Badge>
                                {!pub.lido && (
                                  <Badge className="text-xs bg-blue-100 text-blue-800">
                                    Não lido
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-neutral-700 mb-1">{pub.resumo}</p>
                              <p className="text-xs text-neutral-500">Palavra-chave: {pub.palavra_chave}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => markPublicacaoMutation.mutate({
                                  publicacaoId: pub.id,
                                  lido: !pub.lido
                                })}
                              >
                                {pub.lido ? (
                                  <>
                                    <Eye className="w-4 h-4 mr-1" />
                                    Marcar como Não Lido
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Marcar como Lido
                                  </>
                                )}
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem onClick={createTicket}>
                                    Criar Ticket
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={createActivity}>
                                    Criar Atividade
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-500">
                          {searchTerm ? 'Nenhuma publicação encontrada para o filtro' : 'Nenhuma publicação encontrada'}
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
                    <div className="flex items-center justify-between">
                      <CardTitle>Documentos ({filteredDocumentos.length})</CardTitle>
                      {documentosLoading && (
                        <RefreshCw className="w-4 h-4 animate-spin text-neutral-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {filteredDocumentos.length > 0 ? (
                      <div className="space-y-4">
                        {filteredDocumentos.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="w-8 h-8 text-neutral-400" />
                              <div>
                                <p className="font-medium">{doc.file_name}</p>
                                <p className="text-sm text-neutral-500">
                                  {(doc.file_size / 1024 / 1024).toFixed(2)} MB • {formatDateTime(doc.created_at)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="w-4 h-4 mr-1" />
                                Visualizar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
                        <p className="text-neutral-500">
                          {searchTerm ? 'Nenhum documento encontrado para o filtro' : 'Nenhum documento encontrado'}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Column B: Settings & Premium Panel (1/3) */}
          <div className="space-y-6">
            {/* Premium Toggle Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configurações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="premium-toggle" className="text-sm font-medium">
                      Monitoramento Premium
                    </Label>
                    <p className="text-xs text-neutral-500 mt-1">
                      {premiumEnabled ? 'Escavador ativo' : 'Usando Advise (padrão)'}
                    </p>
                  </div>
                  <Switch
                    id="premium-toggle"
                    checked={premiumEnabled}
                    onCheckedChange={(checked) => {
                      updateMonitoringMutation.mutate({ premium: checked });
                    }}
                    disabled={updateMonitoringMutation.isPending}
                  />
                </div>
                
                <Separator />
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Fonte ativa:</span>
                    <Badge variant={premiumEnabled ? 'default' : 'secondary'}>
                      {premiumEnabled ? 'Escavador' : 'Advise'}
                    </Badge>
                  </div>
                  {monitoringSettings && (
                    <div className="flex justify-between">
                      <span>Última atualização:</span>
                      <span className="text-neutral-500">
                        {formatDateTime(monitoringSettings.updated_at)}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => runSyncMutation.mutate()}
                  disabled={isUpdating || runSyncMutation.isPending}
                  className="w-full"
                  size="sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isUpdating || runSyncMutation.isPending ? 'animate-spin' : ''}`} />
                  Aplicar e Atualizar
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Partes</span>
                  <Badge variant="outline">{partes.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Movimentações</span>
                  <Badge variant="outline">{movimentacoes.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Publicações</span>
                  <Badge variant="outline">{publicacoes.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Documentos</span>
                  <Badge variant="outline">{documentos.length}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-neutral-600">Não lidas</span>
                  <Badge variant="destructive">
                    {publicacoes.filter(p => !p.lido).length}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Premium Features Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recursos Premium</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Capa completa (Escavador)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Partes e representantes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Movimentações detalhadas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Atualizações em tempo real</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-500" />
                    <span>Rate limit: 500 req/min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Create Cliente Dialog */}
        <Dialog open={isClienteDialogOpen} onOpenChange={setIsClienteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Cliente</DialogTitle>
              <DialogDescription>
                Promover parte do processo para cliente do escritório
              </DialogDescription>
            </DialogHeader>
            {selectedParte && (
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={selectedParte.nome} readOnly />
                </div>
                <div>
                  <Label>CPF/CNPJ</Label>
                  <Input value={selectedParte.cpfcnpj || ''} readOnly />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Input 
                    value={selectedParte.tipo_pessoa === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'} 
                    readOnly 
                  />
                </div>
                <div>
                  <Label>Papel no Processo</Label>
                  <Input value={selectedParte.papel} readOnly />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsClienteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => selectedParte && addParteAsCliente(selectedParte)}>
                Criar Cliente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageErrorBoundary>
  );
}
