import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  FileText,
  Clock,
  Building,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Link2,
  Plus,
  Bell,
  ExternalLink,
  Download,
  Command,
  CheckCircle2,
  AlertTriangle,
  User,
  Users,
  Eye,
  Trash2,
  Settings
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Skeleton } from '../components/ui/skeleton';
import { Checkbox } from '../components/ui/checkbox';
import { supabase, lf } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';
import { sf4Telemetry, sf4SavedViews, sf4Utils, SF4SavedView } from '../lib/sf4-telemetry';
import { useSF4KeyboardShortcuts, sf4A11yUtils } from '../hooks/useSF4KeyboardShortcuts';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MovimentacaoItem {
  id: number;
  numero_cnj: string | null;
  data: any;
  data_movimentacao: string | null;
  created_at: string;
  tribunal_sigla?: string;
  idx_dt?: string;
}

interface Processo {
  numero_cnj: string;
  tribunal_sigla: string;
  titulo_polo_ativo: string;
  titulo_polo_passivo: string;
  data: any;
}

interface JourneyInstance {
  id: string;
  numero_cnj: string;
  template_journey_id: string;
  status: string;
  title: string;
}

interface TemplateStage {
  id: string;
  name: string;
  description: string;
}

interface Filters {
  dateFrom: string;
  dateTo: string;
  tribunal: string;
  searchText: string;
  tab: 'publicacoes' | 'movimentacoes';
  page: number;
}

interface SF4InboxProps {}

export default function InboxLegalSF4({}: SF4InboxProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // State management from URL params
  const [filters, setFilters] = useState<Filters>({
    dateFrom: searchParams.get('from') || format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    dateTo: searchParams.get('to') || format(new Date(), 'yyyy-MM-dd'),
    tribunal: searchParams.get('tribunal') || 'all',
    searchText: searchParams.get('q') || '',
    tab: (searchParams.get('tab') as 'publicacoes' | 'movimentacoes') || 'publicacoes',
    page: parseInt(searchParams.get('page') || '1'),
  });

  // Dialog states
  const [selectedItem, setSelectedItem] = useState<MovimentacaoItem | null>(null);
  const [showVincularDialog, setShowVincularDialog] = useState(false);
  const [showCriarEtapaDialog, setShowCriarEtapaDialog] = useState(false);
  const [showNotificarDialog, setShowNotificarDialog] = useState(false);
  const [showBuscarCadastrarDialog, setShowBuscarCadastrarDialog] = useState(false);

  // Form states
  const [vincularCnj, setVincularCnj] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [selectedJourneyInstance, setSelectedJourneyInstance] = useState('');
  const [selectedTemplateStage, setSelectedTemplateStage] = useState('');
  const [createActivity, setCreateActivity] = useState(false);
  const [selectedSource, setSelectedSource] = useState<'advise' | 'escavador'>('advise');

  // Saved views and accessibility
  const [savedViews, setSavedViews] = useState<SF4SavedView[]>([]);
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
  const [saveViewName, setSaveViewName] = useState('');
  const anyDialogOpen = showVincularDialog || showCriarEtapaDialog || showNotificarDialog || showBuscarCadastrarDialog || showSaveViewDialog;

  const pageSize = 25;

  // Keyboard shortcuts and accessibility
  const { showKeyboardShortcutsHelp } = useSF4KeyboardShortcuts({
    onCommandK: () => sf4A11yUtils.focusSearch(),
    onEscape: () => {
      setShowVincularDialog(false);
      setShowCriarEtapaDialog(false);
      setShowNotificarDialog(false);
      setShowBuscarCadastrarDialog(false);
      setShowSaveViewDialog(false);
    },
    onEnter: () => {
      // Handle enter key in dialogs - could be enhanced per dialog
    },
    onTabSwitch: (tab) => {
      updateFilters({ tab });
    },
    onClearFilters: clearAllFilters,
    onRefresh: () => {
      queryClient.invalidateQueries({ queryKey: ['sf4-publicacoes'] });
      queryClient.invalidateQueries({ queryKey: ['sf4-movimentacoes'] });
      sf4A11yUtils.announce('Dados atualizados');
    },
    currentTab: filters.tab,
    isDialogOpen: anyDialogOpen,
  });

  // Update URL params when filters change and track telemetry
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.tab !== 'publicacoes') params.set('tab', filters.tab);
    if (filters.dateFrom !== format(subDays(new Date(), 30), 'yyyy-MM-dd')) params.set('from', filters.dateFrom);
    if (filters.dateTo !== format(new Date(), 'yyyy-MM-dd')) params.set('to', filters.dateTo);
    if (filters.tribunal !== 'all') params.set('tribunal', filters.tribunal);
    if (filters.searchText) params.set('q', filters.searchText);
    if (filters.page !== 1) params.set('page', filters.page.toString());

    setSearchParams(params);

    // Update page title for accessibility
    sf4A11yUtils.setPageTitle(`${filters.tab === 'publicacoes' ? 'Publicações' : 'Movimentações'} - Página ${filters.page}`);
  }, [filters, setSearchParams]);

  // Load saved views on component mount
  useEffect(() => {
    const loadSavedViews = async () => {
      const views = await sf4SavedViews.loadViews(
        filters.tab === 'publicacoes' ? 'inbox_publicacoes' : 'inbox_movimentacoes'
      );
      setSavedViews(views);

      // Load default view if available and no URL params
      const hasUrlParams = searchParams.toString().length > 0;
      if (!hasUrlParams) {
        const defaultView = await sf4SavedViews.getDefaultView(
          filters.tab === 'publicacoes' ? 'inbox_publicacoes' : 'inbox_movimentacoes'
        );
        if (defaultView) {
          setFilters(prev => ({
            ...prev,
            ...defaultView.filters,
          }));
        }
      }
    };

    loadSavedViews();
  }, [filters.tab]); // Reload when tab changes

  // Publicações query - using only public.movimentacoes with tipo filter
  const {
    data: publicacoesData,
    isLoading: isLoadingPublicacoes,
    error: publicacoesError
  } = useQuery({
    queryKey: ['sf4-publicacoes', filters],
    queryFn: async () => {
      const startIndex = (filters.page - 1) * pageSize;
      
      let query = supabase
        .from('movimentacoes')
        .select(`
          *,
          processos!movimentacoes_numero_cnj_fkey (
            numero_cnj,
            tribunal_sigla,
            titulo_polo_ativo,
            titulo_polo_passivo
          )
        `, { count: 'exact' })
        .eq('data->>tipo', 'publicacao')
        .order('data_movimentacao', { ascending: false, nullsLast: true })
        .order('id', { ascending: false })
        .range(startIndex, startIndex + pageSize - 1);

      // Date filtering
      if (filters.dateFrom && filters.dateTo) {
        query = query.gte('data_movimentacao', filters.dateFrom)
                   .lte('data_movimentacao', filters.dateTo);
      }

      // Text search - search in JSONB data
      if (filters.searchText) {
        query = query.or(`data::text.ilike.%${filters.searchText}%,numero_cnj.ilike.%${filters.searchText}%`);
      }

      // Tribunal filter via join
      if (filters.tribunal !== 'all') {
        query = query.eq('processos.tribunal_sigla', filters.tribunal);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    enabled: filters.tab === 'publicacoes',
    keepPreviousData: true
  });

  // Movimentações query - using public.movimentacoes excluding publicações
  const {
    data: movimentacoesData,
    isLoading: isLoadingMovimentacoes,
    error: movimentacoesError
  } = useQuery({
    queryKey: ['sf4-movimentacoes', filters],
    queryFn: async () => {
      const startIndex = (filters.page - 1) * pageSize;
      
      let query = supabase
        .from('movimentacoes')
        .select(`
          *,
          processos!movimentacoes_numero_cnj_fkey (
            numero_cnj,
            tribunal_sigla,
            titulo_polo_ativo,
            titulo_polo_passivo
          )
        `, { count: 'exact' })
        .or('data->>tipo.is.null,data->>tipo.neq.publicacao')
        .order('data_movimentacao', { ascending: false, nullsLast: true })
        .order('id', { ascending: false })
        .range(startIndex, startIndex + pageSize - 1);

      // Date filtering
      if (filters.dateFrom && filters.dateTo) {
        query = query.gte('data_movimentacao', filters.dateFrom)
                   .lte('data_movimentacao', filters.dateTo);
      }

      // Text search
      if (filters.searchText) {
        query = query.or(`data::text.ilike.%${filters.searchText}%,numero_cnj.ilike.%${filters.searchText}%`);
      }

      // Tribunal filter
      if (filters.tribunal !== 'all') {
        query = query.eq('processos.tribunal_sigla', filters.tribunal);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      };
    },
    enabled: filters.tab === 'movimentacoes',
    keepPreviousData: true
  });

  // Tribunais query for filter dropdown
  const { data: tribunais = [] } = useQuery({
    queryKey: ['tribunais-sf4'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processos')
        .select('tribunal_sigla')
        .not('tribunal_sigla', 'is', null)
        .order('tribunal_sigla');
      
      if (error) throw error;
      
      const unique = [...new Set(data.map(p => p.tribunal_sigla))];
      return unique.filter(Boolean);
    }
  });

  // Processos query for CNJ autocomplete
  const { data: processos = [] } = useQuery({
    queryKey: ['processos-autocomplete', vincularCnj],
    queryFn: async () => {
      if (!vincularCnj || vincularCnj.length < 3) return [];
      
      const { data, error } = await supabase
        .from('processos')
        .select('numero_cnj, tribunal_sigla, titulo_polo_ativo, titulo_polo_passivo')
        .ilike('numero_cnj', `%${vincularCnj}%`)
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: showVincularDialog && vincularCnj.length >= 3
  });

  // Journey instances for criar etapa
  const { data: journeyInstances = [] } = useQuery({
    queryKey: ['journey-instances', selectedItem?.numero_cnj],
    queryFn: async () => {
      if (!selectedItem?.numero_cnj) return [];
      
      const { data, error } = await lf
        .from('journey_instances')
        .select('*')
        .eq('numero_cnj', selectedItem.numero_cnj)
        .eq('status', 'active');
      
      if (error) throw error;
      return data || [];
    },
    enabled: showCriarEtapaDialog && !!selectedItem?.numero_cnj
  });

  // Template stages for criar etapa
  const { data: templateStages = [] } = useQuery({
    queryKey: ['template-stages'],
    queryFn: async () => {
      const { data, error } = await lf
        .from('template_stages')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: showCriarEtapaDialog
  });

  // Get current data based on active tab
  const currentData = filters.tab === 'publicacoes' ? publicacoesData : movimentacoesData;
  const isLoading = filters.tab === 'publicacoes' ? isLoadingPublicacoes : isLoadingMovimentacoes;

  // Mutations for actions
  const vincularMutation = useMutation({
    mutationFn: async ({ itemId, cnj }: { itemId: number; cnj: string }) => {
      const { error } = await supabase
        .from('movimentacoes')
        .update({ numero_cnj: cnj })
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Track telemetry
      await supabase.from('telemetry_events').insert({
        event_name: 'sf4_vincular_cnj',
        properties: { item_id: itemId, cnj, tab: filters.tab }
      });
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Item vinculado ao processo com sucesso!" });
      queryClient.invalidateQueries({ queryKey: ['sf4-publicacoes'] });
      queryClient.invalidateQueries({ queryKey: ['sf4-movimentacoes'] });
      setShowVincularDialog(false);
      setVincularCnj('');
      setSelectedItem(null);
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao vincular item", variant: "destructive" });
    }
  });

  const criarEtapaMutation = useMutation({
    mutationFn: async ({ 
      journeyInstanceId, 
      templateStageId, 
      createActivityFlag 
    }: { 
      journeyInstanceId: string; 
      templateStageId: string; 
      createActivityFlag: boolean;
    }) => {
      // Insert stage instance
      const { data: stageData, error: stageError } = await lf
        .from('stage_instances')
        .insert({
          journey_instance_id: journeyInstanceId,
          template_stage_id: templateStageId,
          due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        })
        .select()
        .single();
      
      if (stageError) throw stageError;
      
      // Optionally create activity
      if (createActivityFlag && selectedItem?.numero_cnj) {
        const { error: activityError } = await lf
          .from('activities')
          .insert({
            numero_cnj: selectedItem.numero_cnj,
            title: `Etapa criada a partir de ${filters.tab}`,
            description: `Criado automaticamente a partir do item ${selectedItem.id}`,
            due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            assigned_oab: null, // Could be set based on process assignment
          });
        
        if (activityError) throw activityError;
      }
      
      // Track telemetry
      await supabase.from('telemetry_events').insert({
        event_name: 'sf4_criar_etapa',
        properties: { 
          item_id: selectedItem?.id, 
          journey_instance_id: journeyInstanceId,
          template_stage_id: templateStageId,
          created_activity: createActivityFlag,
          tab: filters.tab 
        }
      });
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Etapa criada com sucesso!" });
      setShowCriarEtapaDialog(false);
      setSelectedJourneyInstance('');
      setSelectedTemplateStage('');
      setCreateActivity(false);
      setSelectedItem(null);
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao criar etapa", variant: "destructive" });
    }
  });

  const notificarMutation = useMutation({
    mutationFn: async ({ itemId, message }: { itemId: number; message: string }) => {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: 'current_user', // Should be replaced with actual user ID
          title: `Nova ${filters.tab.slice(0, -1)} requer atenção`,
          body: message || `Item ${itemId} na inbox precisa de análise`,
          type: 'inbox_action',
          meta: {
            numero_cnj: selectedItem?.numero_cnj,
            mov_id: itemId,
            tab: filters.tab
          }
        });
      
      if (error) throw error;
      
      // Track telemetry
      await supabase.from('telemetry_events').insert({
        event_name: 'sf4_notificar',
        properties: { item_id: itemId, tab: filters.tab }
      });
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Notificação enviada!" });
      setShowNotificarDialog(false);
      setNotificationMessage('');
      setSelectedItem(null);
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao enviar notificação", variant: "destructive" });
    }
  });

  const buscarCadastrarMutation = useMutation({
    mutationFn: async ({ source, itemId }: { source: 'advise' | 'escavador'; itemId: number }) => {
      const payload = selectedItem?.data;
      
      if (source === 'advise') {
        // Call Advise API endpoint
        const response = await fetch('/api/ingest/advise/publicacoes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [payload] })
        });
        
        if (!response.ok) throw new Error('Advise API failed');
      } else if (source === 'escavador' && selectedItem?.numero_cnj) {
        // Call Escavador API endpoints
        const [capaResponse, movimentosResponse] = await Promise.all([
          fetch(`/api/ingest/escavador/capa?cnj=${selectedItem.numero_cnj}`, { method: 'POST' }),
          fetch(`/api/ingest/escavador/movimentos?cnj=${selectedItem.numero_cnj}`, { method: 'POST' })
        ]);
        
        if (!capaResponse.ok || !movimentosResponse.ok) {
          throw new Error('Escavador API failed');
        }
      }
      
      // Track telemetry
      await supabase.from('telemetry_events').insert({
        event_name: 'sf4_buscar_cadastrar',
        properties: { item_id: itemId, source, tab: filters.tab }
      });
    },
    onSuccess: () => {
      toast({ title: "Sucesso", description: "Busca e cadastro iniciados!" });
      queryClient.invalidateQueries({ queryKey: ['sf4-publicacoes'] });
      queryClient.invalidateQueries({ queryKey: ['sf4-movimentacoes'] });
      setShowBuscarCadastrarDialog(false);
      setSelectedItem(null);
    },
    onError: () => {
      toast({ title: "Erro", description: "Erro ao buscar e cadastrar", variant: "destructive" });
    }
  });

  // Helper functions
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getResumo = (item: MovimentacaoItem) => {
    const data = item.data || {};
    return data.resumo || data.conteudo || data.texto || 'Sem resumo disponível';
  };

  const getTipoOrigem = (item: MovimentacaoItem) => {
    const data = item.data || {};
    return data.tipo || data.fonte || 'Movimento';
  };

  const updateFilters = (updates: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...updates, page: 1 }));
  };

  const clearAllFilters = () => {
    setFilters({
      dateFrom: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      dateTo: format(new Date(), 'yyyy-MM-dd'),
      tribunal: 'all',
      searchText: '',
      tab: filters.tab,
      page: 1,
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Inbox Legal</h1>
              <p className="text-sm text-neutral-600">
                Triagem assistida de publicações e movimentações
                <Badge className="ml-2 bg-green-100 text-green-800 text-xs">SF-4</Badge>
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearAllFilters}>
                <X className="w-4 h-4 mr-2" />
                Limpar filtros
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 bg-white border-b border-neutral-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <Label htmlFor="date-from" className="text-xs text-neutral-600">Data inicial</Label>
            <Input
              id="date-from"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilters({ dateFrom: e.target.value })}
              className="h-9"
            />
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="date-to" className="text-xs text-neutral-600">Data final</Label>
            <Input
              id="date-to"
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilters({ dateTo: e.target.value })}
              className="h-9"
            />
          </div>
          
          <div className="space-y-1">
            <Label className="text-xs text-neutral-600">Tribunal</Label>
            <Select value={filters.tribunal} onValueChange={(value) => updateFilters({ tribunal: value })}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tribunais</SelectItem>
                {tribunais.map((tribunal) => (
                  <SelectItem key={tribunal} value={tribunal}>
                    {tribunal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-1">
            <Label htmlFor="search" className="text-xs text-neutral-600">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
              <Input
                id="search"
                placeholder="CNJ, resumo, texto..."
                value={filters.searchText}
                onChange={(e) => updateFilters({ searchText: e.target.value })}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <Tabs 
          value={filters.tab} 
          onValueChange={(value) => updateFilters({ tab: value as 'publicacoes' | 'movimentacoes' })}
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="publicacoes" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Publicações ({publicacoesData?.total || 0})
            </TabsTrigger>
            <TabsTrigger value="movimentacoes" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Movimentações ({movimentacoesData?.total || 0})
            </TabsTrigger>
          </TabsList>

          {/* Publicações Tab */}
          <TabsContent value="publicacoes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Publicações
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-3 p-6">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    ))}
                  </div>
                ) : publicacoesData && publicacoesData.data.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo/Origem</TableHead>
                          <TableHead>Resumo</TableHead>
                          <TableHead>Processo (CNJ)</TableHead>
                          <TableHead>Tribunal</TableHead>
                          <TableHead className="w-20">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {publicacoesData.data.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">
                              {formatDate(item.data_movimentacao)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                {getTipoOrigem(item)}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <p className="text-sm truncate">
                                {getResumo(item)}
                              </p>
                            </TableCell>
                            <TableCell>
                              {item.numero_cnj ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-sm">{item.numero_cnj}</span>
                                </div>
                              ) : (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                  Não vinculado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.processos?.tribunal_sigla || '-'}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {!item.numero_cnj && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedItem(item);
                                        setShowVincularDialog(true);
                                      }}
                                    >
                                      <Link2 className="w-4 h-4 mr-2" />
                                      Vincular ao CNJ
                                    </DropdownMenuItem>
                                  )}
                                  {item.numero_cnj && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedItem(item);
                                        setShowCriarEtapaDialog(true);
                                      }}
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Criar etapa
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setShowNotificarDialog(true);
                                    }}
                                  >
                                    <Bell className="w-4 h-4 mr-2" />
                                    Notificar responsável
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setShowBuscarCadastrarDialog(true);
                                    }}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Buscar & Cadastrar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                      <p className="text-sm text-neutral-600">
                        Exibindo {((filters.page - 1) * pageSize) + 1} a {Math.min(filters.page * pageSize, publicacoesData.total)} de {publicacoesData.total} publicações
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateFilters({ page: filters.page - 1 })}
                          disabled={filters.page === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Anterior
                        </Button>
                        <span className="text-sm">
                          Página {filters.page} de {publicacoesData.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateFilters({ page: filters.page + 1 })}
                          disabled={filters.page >= publicacoesData.totalPages}
                        >
                          Próxima
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">
                      Nenhuma publicação no período
                    </h3>
                    <p className="text-neutral-600">
                      Ajuste os filtros para ver mais resultados
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Movimentações Tab */}
          <TabsContent value="movimentacoes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Movimentações
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-3 p-6">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center space-x-4">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 flex-1" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    ))}
                  </div>
                ) : movimentacoesData && movimentacoesData.data.length > 0 ? (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo/Origem</TableHead>
                          <TableHead>Resumo</TableHead>
                          <TableHead>Processo (CNJ)</TableHead>
                          <TableHead>Tribunal</TableHead>
                          <TableHead className="w-20">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimentacoesData.data.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-sm">
                              {formatDate(item.data_movimentacao)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                {getTipoOrigem(item)}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md">
                              <p className="text-sm truncate">
                                {getResumo(item)}
                              </p>
                            </TableCell>
                            <TableCell>
                              {item.numero_cnj ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-sm">{item.numero_cnj}</span>
                                </div>
                              ) : (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                  Não vinculado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.processos?.tribunal_sigla || '-'}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {!item.numero_cnj && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedItem(item);
                                        setShowVincularDialog(true);
                                      }}
                                    >
                                      <Link2 className="w-4 h-4 mr-2" />
                                      Vincular ao CNJ
                                    </DropdownMenuItem>
                                  )}
                                  {item.numero_cnj && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setSelectedItem(item);
                                        setShowCriarEtapaDialog(true);
                                      }}
                                    >
                                      <Plus className="w-4 h-4 mr-2" />
                                      Criar etapa
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setShowNotificarDialog(true);
                                    }}
                                  >
                                    <Bell className="w-4 h-4 mr-2" />
                                    Notificar responsável
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedItem(item);
                                      setShowBuscarCadastrarDialog(true);
                                    }}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Buscar & Cadastrar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    <div className="flex items-center justify-between px-6 py-4 border-t">
                      <p className="text-sm text-neutral-600">
                        Exibindo {((filters.page - 1) * pageSize) + 1} a {Math.min(filters.page * pageSize, movimentacoesData.total)} de {movimentacoesData.total} movimentações
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateFilters({ page: filters.page - 1 })}
                          disabled={filters.page === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                          Anterior
                        </Button>
                        <span className="text-sm">
                          Página {filters.page} de {movimentacoesData.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateFilters({ page: filters.page + 1 })}
                          disabled={filters.page >= movimentacoesData.totalPages}
                        >
                          Próxima
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                    <h3 className="text-lg font-medium text-neutral-900 mb-2">
                      Nenhuma movimentação no período
                    </h3>
                    <p className="text-neutral-600">
                      Ajuste os filtros para ver mais resultados
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Vincular CNJ Dialog */}
      <Dialog open={showVincularDialog} onOpenChange={setShowVincularDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular ao CNJ</DialogTitle>
            <DialogDescription>
              Digite o número CNJ do processo para vincular este item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cnj-input">Número CNJ</Label>
              <Input
                id="cnj-input"
                value={vincularCnj}
                onChange={(e) => setVincularCnj(e.target.value)}
                placeholder="0000000-00.0000.0.00.0000"
                className="font-mono"
              />
            </div>
            
            {processos.length > 0 && (
              <div className="space-y-2">
                <Label>Processos encontrados:</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {processos.map((processo) => (
                    <Card 
                      key={processo.numero_cnj} 
                      className="p-3 cursor-pointer hover:bg-neutral-50"
                      onClick={() => setVincularCnj(processo.numero_cnj)}
                    >
                      <div className="text-sm">
                        <div className="font-mono font-medium">{processo.numero_cnj}</div>
                        <div className="text-neutral-600">
                          {processo.titulo_polo_ativo} x {processo.titulo_polo_passivo}
                        </div>
                        <div className="text-xs text-neutral-500">{processo.tribunal_sigla}</div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVincularDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedItem && vincularCnj) {
                  vincularMutation.mutate({ itemId: selectedItem.id, cnj: vincularCnj });
                }
              }}
              disabled={!vincularCnj || vincularMutation.isPending}
            >
              {vincularMutation.isPending ? 'Vinculando...' : 'Vincular'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Criar Etapa Dialog */}
      <Dialog open={showCriarEtapaDialog} onOpenChange={setShowCriarEtapaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Etapa</DialogTitle>
            <DialogDescription>
              Criar uma nova etapa na jornada do processo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Instância de Jornada</Label>
              <Select value={selectedJourneyInstance} onValueChange={setSelectedJourneyInstance}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma jornada" />
                </SelectTrigger>
                <SelectContent>
                  {journeyInstances.map((instance) => (
                    <SelectItem key={instance.id} value={instance.id}>
                      {instance.title || `Jornada ${instance.id.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Tipo de Etapa</Label>
              <Select value={selectedTemplateStage} onValueChange={setSelectedTemplateStage}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de etapa" />
                </SelectTrigger>
                <SelectContent>
                  {templateStages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="create-activity"
                checked={createActivity}
                onCheckedChange={setCreateActivity}
              />
              <Label htmlFor="create-activity">Criar Activity espelho</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCriarEtapaDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedJourneyInstance && selectedTemplateStage) {
                  criarEtapaMutation.mutate({
                    journeyInstanceId: selectedJourneyInstance,
                    templateStageId: selectedTemplateStage,
                    createActivityFlag: createActivity,
                  });
                }
              }}
              disabled={!selectedJourneyInstance || !selectedTemplateStage || criarEtapaMutation.isPending}
            >
              {criarEtapaMutation.isPending ? 'Criando...' : 'Criar Etapa'}
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
              Enviar notificação sobre este item
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notification-message">Mensagem (opcional)</Label>
              <Textarea
                id="notification-message"
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                placeholder="Adicione uma mensagem personalizada..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotificarDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedItem) {
                  notificarMutation.mutate({ 
                    itemId: selectedItem.id, 
                    message: notificationMessage 
                  });
                }
              }}
              disabled={notificarMutation.isPending}
            >
              {notificarMutation.isPending ? 'Enviando...' : 'Enviar Notificação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buscar & Cadastrar Dialog */}
      <Dialog open={showBuscarCadastrarDialog} onOpenChange={setShowBuscarCadastrarDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buscar & Cadastrar</DialogTitle>
            <DialogDescription>
              Buscar informações adicionais e cadastrar processo
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fonte de dados</Label>
              <Select value={selectedSource} onValueChange={(value: 'advise' | 'escavador') => setSelectedSource(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="advise">Advise (sempre disponível)</SelectItem>
                  <SelectItem value="escavador">Escavador (premium)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {selectedSource === 'escavador' && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Escavador Premium:</strong> Busca capa e movimentos completos
                </p>
              </div>
            )}
            
            {selectedSource === 'advise' && (
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Advise:</strong> Reprocessa item e demais do período
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBuscarCadastrarDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedItem) {
                  buscarCadastrarMutation.mutate({ 
                    source: selectedSource, 
                    itemId: selectedItem.id 
                  });
                }
              }}
              disabled={buscarCadastrarMutation.isPending}
            >
              {buscarCadastrarMutation.isPending ? 'Processando...' : 'Buscar & Cadastrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
