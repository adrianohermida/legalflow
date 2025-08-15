import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  MessageSquare,
  Paperclip,
  Users,
  Clock,
  Target,
  Flag,
  CheckCircle,
  Circle,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  FileText,
  Zap,
  GitBranch,
  Settings,
  Eye,
  Calendar,
  User,
  Tag,
  TrendingUp,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';

interface BacklogItem {
  id: string;
  title: string;
  description: string;
  type: 'bug_fix' | 'feature' | 'improvement' | 'refactor' | 'research';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  tags: string[];
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'testing' | 'done' | 'blocked';
  pipeline_stage: 'ideation' | 'analysis' | 'design' | 'development' | 'testing' | 'deployment';
  story_points?: number;
  complexity: 'low' | 'medium' | 'high' | 'unknown';
  estimated_hours?: number;
  builder_prompt?: string;
  can_execute_in_builder: boolean;
  acceptance_criteria: string[];
  business_value?: string;
  technical_notes?: string;
  created_by?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  due_date?: string;
  
  // From view
  created_by_email?: string;
  assigned_to_email?: string;
  comment_count: number;
  attachment_count: number;
  approval_status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
}

interface BacklogMetrics {
  total_items: number;
  backlog_count: number;
  ready_count: number;
  in_progress_count: number;
  review_count: number;
  testing_count: number;
  done_count: number;
  blocked_count: number;
  urgent_count: number;
  high_priority_count: number;
  builder_executable_count: number;
  avg_story_points: number;
  active_story_points: number;
}

const statusConfig = {
  backlog: { label: 'Backlog', color: 'bg-gray-100 text-gray-800', icon: Circle },
  ready: { label: 'Pronto', color: 'bg-blue-100 text-blue-800', icon: Target },
  in_progress: { label: 'Em Progresso', color: 'bg-yellow-100 text-yellow-800', icon: RefreshCw },
  review: { label: 'Revisão', color: 'bg-purple-100 text-purple-800', icon: Eye },
  testing: { label: 'Testando', color: 'bg-orange-100 text-orange-800', icon: Settings },
  done: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  blocked: { label: 'Bloqueado', color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

const priorityConfig = {
  low: { label: 'Baixa', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Média', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-700' },
};

const typeConfig = {
  bug_fix: { label: 'Bug Fix', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  feature: { label: 'Feature', color: 'bg-green-100 text-green-800', icon: Plus },
  improvement: { label: 'Melhoria', color: 'bg-blue-100 text-blue-800', icon: TrendingUp },
  refactor: { label: 'Refactor', color: 'bg-purple-100 text-purple-800', icon: GitBranch },
  research: { label: 'Pesquisa', color: 'bg-yellow-100 text-yellow-800', icon: FileText },
};

export default function AutofixBacklog() {
  const [view, setView] = useState<'kanban' | 'list' | 'metrics'>('kanban');
  const [filter, setFilter] = useState({
    status: '',
    priority: '',
    type: '',
    assignee: '',
    search: '',
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BacklogItem | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para items do backlog
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['autofix-backlog-items', filter],
    queryFn: async () => {
      let query = supabase.from('vw_autofix_kanban').select('*');
      
      if (filter.status) query = query.eq('status', filter.status);
      if (filter.priority) query = query.eq('priority', filter.priority);
      if (filter.type) query = query.eq('type', filter.type);
      if (filter.assignee) query = query.eq('assigned_to', filter.assignee);
      if (filter.search) {
        query = query.or(`title.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as BacklogItem[];
    },
  });

  // Query para métricas
  const { data: metrics } = useQuery({
    queryKey: ['autofix-backlog-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_autofix_metrics')
        .select('*')
        .single();
      if (error) throw error;
      return data as BacklogMetrics;
    },
  });

  // Mutation para criar item
  const createItemMutation = useMutation({
    mutationFn: async (itemData: any) => {
      const { data, error } = await supabase.rpc('create_backlog_item', itemData);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autofix-backlog-items'] });
      queryClient.invalidateQueries({ queryKey: ['autofix-backlog-metrics'] });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Item criado',
        description: 'Item adicionado ao backlog com sucesso.',
      });
    },
  });

  // Mutation para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ itemId, newStatus, reason }: { itemId: string; newStatus: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('update_backlog_item_status', {
        p_item_id: itemId,
        p_new_status: newStatus,
        p_reason: reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['autofix-backlog-items'] });
      queryClient.invalidateQueries({ queryKey: ['autofix-backlog-metrics'] });
      toast({
        title: 'Status atualizado',
        description: 'Status do item foi atualizado com sucesso.',
      });
    },
  });

  // Mutation para executar prompt no Builder.io
  const executeBuilderMutation = useMutation({
    mutationFn: async ({ itemId, prompt }: { itemId: string; prompt?: string }) => {
      const { data, error } = await supabase.rpc('execute_builder_prompt', {
        p_item_id: itemId,
        p_prompt: prompt,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Prompt executado',
        description: 'Prompt foi enviado para execução no Builder.io.',
      });
    },
  });

  const handleStatusChange = (item: BacklogItem, newStatus: string) => {
    updateStatusMutation.mutate({
      itemId: item.id,
      newStatus,
      reason: `Status alterado de ${item.status} para ${newStatus}`,
    });
  };

  const handleBuilderExecution = (item: BacklogItem) => {
    if (!item.can_execute_in_builder || !item.builder_prompt) {
      toast({
        title: 'Erro',
        description: 'Este item não possui prompt executável no Builder.io.',
        variant: 'destructive',
      });
      return;
    }
    
    executeBuilderMutation.mutate({ itemId: item.id });
  };

  const ItemCard = ({ item }: { item: BacklogItem }) => {
    const StatusIcon = statusConfig[item.status].icon;
    const TypeIcon = typeConfig[item.type].icon;
    
    return (
      <Card 
        className="mb-3 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => {
          setSelectedItem(item);
          setIsDetailsDialogOpen(true);
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <TypeIcon className="w-4 h-4 text-gray-600" />
              <h4 className="font-medium text-sm text-gray-900 truncate">{item.title}</h4>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {
                  setSelectedItem(item);
                  setIsDetailsDialogOpen(true);
                }}>
                  <Eye className="w-4 h-4 mr-2" />
                  Ver detalhes
                </DropdownMenuItem>
                {item.can_execute_in_builder && (
                  <DropdownMenuItem onClick={() => handleBuilderExecution(item)}>
                    <Play className="w-4 h-4 mr-2" />
                    Executar no Builder.io
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{item.description}</p>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Badge 
                variant="outline" 
                className={`text-xs ${priorityConfig[item.priority].color}`}
              >
                {priorityConfig[item.priority].label}
              </Badge>
              
              {item.story_points && (
                <Badge variant="outline" className="text-xs">
                  {item.story_points}pts
                </Badge>
              )}
              
              {item.can_execute_in_builder && (
                <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700">
                  <Zap className="w-3 h-3 mr-1" />
                  Builder.io
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {item.comment_count > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {item.comment_count}
                </div>
              )}
              {item.attachment_count > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  {item.attachment_count}
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StatusIcon className="w-3 h-3" />
              <span className="text-xs text-gray-600">{statusConfig[item.status].label}</span>
            </div>
            
            {item.assigned_to_email && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500 truncate max-w-20">
                  {item.assigned_to_email}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const KanbanBoard = () => {
    const statusColumns = Object.keys(statusConfig) as Array<keyof typeof statusConfig>;
    
    return (
      <div className="grid grid-cols-7 gap-4 h-full">
        {statusColumns.map((status) => {
          const columnItems = items.filter(item => item.status === status);
          const StatusIcon = statusConfig[status].icon;
          
          return (
            <div key={status} className="flex flex-col">
              <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                <StatusIcon className="w-4 h-4 text-gray-600" />
                <h3 className="font-medium text-sm text-gray-900">
                  {statusConfig[status].label}
                </h3>
                <Badge variant="outline" className="ml-auto">
                  {columnItems.length}
                </Badge>
              </div>
              
              <ScrollArea className="flex-1">
                <div className="space-y-3">
                  {columnItems.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
    );
  };

  const MetricsDashboard = () => {
    if (!metrics) return <div>Carregando métricas...</div>;
    
    const completionRate = metrics.total_items > 0 
      ? Math.round((metrics.done_count / metrics.total_items) * 100) 
      : 0;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total de Itens</p>
                  <p className="text-2xl font-bold">{metrics.total_items}</p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Em Progresso</p>
                  <p className="text-2xl font-bold">{metrics.in_progress_count}</p>
                </div>
                <RefreshCw className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Concluídos</p>
                  <p className="text-2xl font-bold">{metrics.done_count}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Taxa de Conclusão</p>
                  <p className="text-2xl font-bold">{completionRate}%</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(statusConfig).map(([status, config]) => {
                  const count = metrics[`${status}_count` as keyof BacklogMetrics] as number || 0;
                  const percentage = metrics.total_items > 0 ? (count / metrics.total_items) * 100 : 0;
                  
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{config.label}</span>
                        <span>{count}</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações do Sprint</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Story Points Ativos</span>
                  <span className="font-medium">{Math.round(metrics.active_story_points || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Média de Story Points</span>
                  <span className="font-medium">{metrics.avg_story_points?.toFixed(1) || '0.0'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Itens Executáveis</span>
                  <span className="font-medium">{metrics.builder_executable_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Alta Prioridade</span>
                  <span className="font-medium">{metrics.urgent_count + metrics.high_priority_count}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Autofix Backlog</h1>
          <p className="text-gray-600">Pipeline de melhorias e desenvolvimento</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Item
          </Button>
        </div>
      </div>

      {/* Filters and View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar itens..."
              value={filter.search}
              onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10 w-64"
            />
          </div>
          
          <Select 
            value={filter.status} 
            onValueChange={(value) => setFilter(prev => ({ ...prev, status: value }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {Object.entries(statusConfig).map(([status, config]) => (
                <SelectItem key={status} value={status}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select 
            value={filter.priority} 
            onValueChange={(value) => setFilter(prev => ({ ...prev, priority: value }))}
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              {Object.entries(priorityConfig).map(([priority, config]) => (
                <SelectItem key={priority} value={priority}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Tabs value={view} onValueChange={(value) => setView(value as any)}>
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
            <TabsTrigger value="metrics">Métricas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {view === 'kanban' && <KanbanBoard />}
        {view === 'list' && (
          <div className="space-y-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
        {view === 'metrics' && <MetricsDashboard />}
      </div>

      {/* Create Item Dialog */}
      <CreateItemDialog 
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={createItemMutation.mutate}
        isLoading={createItemMutation.isPending}
      />

      {/* Item Details Dialog */}
      <ItemDetailsDialog
        item={selectedItem}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onStatusChange={handleStatusChange}
        onBuilderExecute={handleBuilderExecution}
      />
    </div>
  );
}

// Componente para criar novo item
const CreateItemDialog = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  isLoading 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'improvement',
    priority: 'medium',
    category: 'general',
    tags: '',
    builder_prompt: '',
    can_execute_in_builder: false,
    acceptance_criteria: '',
    business_value: '',
    technical_notes: '',
    story_points: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      p_title: formData.title,
      p_description: formData.description,
      p_type: formData.type,
      p_priority: formData.priority,
      p_category: formData.category,
      p_tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      p_builder_prompt: formData.builder_prompt || null,
      p_can_execute_in_builder: formData.can_execute_in_builder,
      p_acceptance_criteria: formData.acceptance_criteria ? formData.acceptance_criteria.split('\n').filter(c => c.trim()) : [],
      p_business_value: formData.business_value || null,
      p_technical_notes: formData.technical_notes || null,
      p_story_points: formData.story_points ? parseInt(formData.story_points) : null,
    };
    
    onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Item no Backlog</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(typeConfig).map(([type, config]) => (
                    <SelectItem key={type} value={type}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([priority, config]) => (
                    <SelectItem key={priority} value={priority}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Geral</SelectItem>
                  <SelectItem value="ui">Interface</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="database">Banco de Dados</SelectItem>
                  <SelectItem value="security">Segurança</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="documentation">Documentação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="story_points">Story Points</Label>
              <Select value={formData.story_points} onValueChange={(value) => setFormData(prev => ({ ...prev, story_points: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Não definido</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="13">13</SelectItem>
                  <SelectItem value="21">21</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="performance, ui, optimization"
              />
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="can_execute_in_builder"
                checked={formData.can_execute_in_builder}
                onChange={(e) => setFormData(prev => ({ ...prev, can_execute_in_builder: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="can_execute_in_builder">Pode ser executado no Builder.io</Label>
            </div>
            
            {formData.can_execute_in_builder && (
              <div>
                <Label htmlFor="builder_prompt">Prompt para Builder.io</Label>
                <Textarea
                  id="builder_prompt"
                  value={formData.builder_prompt}
                  onChange={(e) => setFormData(prev => ({ ...prev, builder_prompt: e.target.value }))}
                  rows={3}
                  placeholder="Descreva o que deve ser feito quando executado no Builder.io..."
                />
              </div>
            )}
            
            <div>
              <Label htmlFor="acceptance_criteria">Critérios de Aceitação (um por linha)</Label>
              <Textarea
                id="acceptance_criteria"
                value={formData.acceptance_criteria}
                onChange={(e) => setFormData(prev => ({ ...prev, acceptance_criteria: e.target.value }))}
                rows={3}
                placeholder="O sistema deve fazer X&#10;O usuário deve conseguir Y&#10;A performance deve ser Z"
              />
            </div>
            
            <div>
              <Label htmlFor="business_value">Valor de Negócio</Label>
              <Textarea
                id="business_value"
                value={formData.business_value}
                onChange={(e) => setFormData(prev => ({ ...prev, business_value: e.target.value }))}
                rows={2}
                placeholder="Qual o valor que esta melhoria traz para o negócio?"
              />
            </div>
            
            <div>
              <Label htmlFor="technical_notes">Notas Técnicas</Label>
              <Textarea
                id="technical_notes"
                value={formData.technical_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, technical_notes: e.target.value }))}
                rows={2}
                placeholder="Detalhes técnicos, considerações de implementação, etc."
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Componente para detalhes do item
const ItemDetailsDialog = ({
  item,
  open,
  onOpenChange,
  onStatusChange,
  onBuilderExecute,
}: {
  item: BacklogItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (item: BacklogItem, newStatus: string) => void;
  onBuilderExecute: (item: BacklogItem) => void;
}) => {
  if (!item) return null;

  const StatusIcon = statusConfig[item.status].icon;
  const TypeIcon = typeConfig[item.type].icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TypeIcon className="w-5 h-5 text-gray-600" />
                <DialogTitle className="text-xl">{item.title}</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={typeConfig[item.type].color}>
                  {typeConfig[item.type].label}
                </Badge>
                <Badge className={priorityConfig[item.priority].color}>
                  {priorityConfig[item.priority].label}
                </Badge>
                <Badge variant="outline" className={statusConfig[item.status].color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {statusConfig[item.status].label}
                </Badge>
                {item.story_points && (
                  <Badge variant="outline">{item.story_points} pontos</Badge>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {item.can_execute_in_builder && (
                <Button
                  size="sm"
                  onClick={() => onBuilderExecute(item)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Executar no Builder.io
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Alterar Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {Object.entries(statusConfig).map(([status, config]) => (
                    <DropdownMenuItem 
                      key={status}
                      onClick={() => onStatusChange(item, status)}
                    >
                      <config.icon className="w-4 h-4 mr-2" />
                      {config.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-medium mb-2">Descrição</h3>
            <p className="text-gray-600">{item.description}</p>
          </div>
          
          {item.acceptance_criteria.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Critérios de Aceitação</h3>
              <ul className="space-y-1">
                {item.acceptance_criteria.map((criteria, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    {criteria}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {item.business_value && (
            <div>
              <h3 className="font-medium mb-2">Valor de Negócio</h3>
              <p className="text-gray-600">{item.business_value}</p>
            </div>
          )}
          
          {item.technical_notes && (
            <div>
              <h3 className="font-medium mb-2">Notas Técnicas</h3>
              <p className="text-gray-600">{item.technical_notes}</p>
            </div>
          )}
          
          {item.builder_prompt && (
            <div>
              <h3 className="font-medium mb-2">Prompt Builder.io</h3>
              <div className="bg-gray-50 p-3 rounded-lg">
                <pre className="text-sm text-gray-700 whitespace-pre-wrap">{item.builder_prompt}</pre>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Categoria:</span> {item.category}
            </div>
            <div>
              <span className="font-medium">Complexidade:</span> {item.complexity}
            </div>
            <div>
              <span className="font-medium">Criado por:</span> {item.created_by_email}
            </div>
            <div>
              <span className="font-medium">Atribuído a:</span> {item.assigned_to_email || 'Não atribuído'}
            </div>
            <div>
              <span className="font-medium">Criado em:</span> {formatDate(item.created_at)}
            </div>
            <div>
              <span className="font-medium">Atualizado em:</span> {formatDate(item.updated_at)}
            </div>
          </div>
          
          {item.tags.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1">
                {item.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
