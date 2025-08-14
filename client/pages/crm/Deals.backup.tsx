import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Textarea } from '../../components/ui/textarea';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { locale } from '../../lib/locale';
import { 
  Plus,
  DollarSign,
  TrendingUp,
  User,
  Calendar,
  Phone,
  Mail,
  MessageCircle,
  Target,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2
} from 'lucide-react';

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  expected_close_date?: string;
  contact_id?: string;
  contact_name?: string;
  contact_email?: string;
  contact_whatsapp?: string;
  pipeline_id?: number;
  stage_id?: number;
  stage_name?: string;
  stage_order: number;
  is_won: boolean;
  is_lost: boolean;
  created_at: string;
  updated_at: string;
}

interface PipelineStage {
  id: number;
  code: string;
  name: string;
  order_index: number;
  is_won: boolean;
  is_lost: boolean;
}

interface Contact {
  id: string;
  name: string;
  email?: string;
  whatsapp?: string;
}

interface DealFormData {
  title: string;
  value: string;
  currency: string;
  contact_id: string;
  probability: string;
  expected_close_date: string;
  description: string;
}

const CRMDeals: React.FC = () => {
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [formData, setFormData] = useState<DealFormData>({
    title: '',
    value: '',
    currency: 'BRL',
    contact_id: '',
    probability: '50',
    expected_close_date: '',
    description: ''
  });
  const { toast } = useToast();

  // Fetch pipeline stages
  const { data: stages } = useSupabaseQuery<PipelineStage[]>(
    'pipeline-stages-sales',
    `
    select ps.id, ps.code, ps.name, ps.order_index, ps.is_won, ps.is_lost
    from legalflow.pipeline_stages ps
    join legalflow.pipeline_defs pd on pd.id = ps.pipeline_id
    where pd.code = 'sales'
    order by ps.order_index
    `
  );

  // Fetch deals with contact info
  const { data: deals, isLoading, error, refetch } = useSupabaseQuery<Deal[]>(
    'deals-with-contacts',
    `
    select 
      d.id, d.title, d.value, d.currency, d.stage, d.probability,
      d.expected_close_date, d.contact_id, d.pipeline_id, d.stage_id,
      d.created_at, d.updated_at,
      c.name as contact_name, c.email as contact_email, c.whatsapp as contact_whatsapp,
      ps.name as stage_name, ps.order_index as stage_order, ps.is_won, ps.is_lost
    from legalflow.deals d
    left join legalflow.contacts c on c.id = d.contact_id
    left join legalflow.pipeline_stages ps on ps.id = d.stage_id
    left join legalflow.pipeline_defs pd on pd.id = d.pipeline_id
    where pd.code = 'sales' or d.pipeline_id is null
    order by d.updated_at desc
    `
  );

  // Fetch contacts for autocomplete
  const { data: contacts } = useSupabaseQuery<Contact[]>(
    'contacts-for-deals',
    `
    select id, name, email, whatsapp
    from legalflow.contacts
    order by name
    limit 100
    `
  );

  // Get deal stats
  const { data: dealStats } = useSupabaseQuery(
    'deal-stats',
    `
    select 
      count(*) as total_deals,
      sum(value) as total_value,
      count(*) filter (where ps.is_won = true) as won_deals,
      sum(value) filter (where ps.is_won = true) as won_value,
      avg(probability) as avg_probability
    from legalflow.deals d
    left join legalflow.pipeline_stages ps on ps.id = d.stage_id
    left join legalflow.pipeline_defs pd on pd.id = d.pipeline_id
    where pd.code = 'sales' or d.pipeline_id is null
    `
  );

  const resetForm = () => {
    setFormData({
      title: '',
      value: '',
      currency: 'BRL',
      contact_id: '',
      probability: '50',
      expected_close_date: '',
      description: ''
    });
    setEditingDeal(null);
  };

  const handleCreateDeal = async () => {
    try {
      const salesPipelineId = stages?.find(s => s.code === 'novo')?.id;
      const novoStageId = stages?.find(s => s.code === 'novo')?.id;

      const { error } = await supabase
        .from('legalflow.deals')
        .insert({
          title: formData.title,
          value: parseFloat(formData.value) || 0,
          currency: formData.currency,
          stage: 'novo',
          probability: parseInt(formData.probability) || 50,
          expected_close_date: formData.expected_close_date || null,
          contact_id: formData.contact_id || null,
          pipeline_id: salesPipelineId,
          stage_id: novoStageId,
          description: formData.description || null
        });

      if (error) throw error;

      toast({
        title: 'Deal criado',
        description: 'Nova oportunidade adicionada ao pipeline'
      });

      setIsNewDealOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error creating deal:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar deal',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateDeal = async () => {
    if (!editingDeal) return;

    try {
      const { error } = await supabase
        .from('legalflow.deals')
        .update({
          title: formData.title,
          value: parseFloat(formData.value) || 0,
          currency: formData.currency,
          probability: parseInt(formData.probability) || 50,
          expected_close_date: formData.expected_close_date || null,
          contact_id: formData.contact_id || null,
          description: formData.description || null
        })
        .eq('id', editingDeal.id);

      if (error) throw error;

      toast({
        title: 'Deal atualizado',
        description: 'Informações salvas com sucesso'
      });

      setEditingDeal(null);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error updating deal:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar deal',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDeal = async (dealId: string) => {
    if (!confirm('Tem certeza que deseja excluir este deal?')) return;

    try {
      const { error } = await supabase
        .from('legalflow.deals')
        .delete()
        .eq('id', dealId);

      if (error) throw error;

      toast({
        title: 'Deal excluído',
        description: 'Oportunidade removida do pipeline'
      });

      refetch();
    } catch (error) {
      console.error('Error deleting deal:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir deal',
        variant: 'destructive'
      });
    }
  };

  const handleStageChange = async (dealId: string, newStage: PipelineStage) => {
    try {
      const { error } = await supabase
        .from('legalflow.deals')
        .update({
          stage: newStage.code,
          stage_id: newStage.id,
          probability: newStage.is_won ? 100 : newStage.is_lost ? 0 : undefined
        })
        .eq('id', dealId);

      if (error) throw error;

      toast({
        title: 'Deal movido',
        description: `Movido para ${newStage.name}`
      });

      refetch();
    } catch (error) {
      console.error('Error moving deal:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao mover deal',
        variant: 'destructive'
      });
    }
  };

  const startEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      value: deal.value.toString(),
      currency: deal.currency,
      contact_id: deal.contact_id || '',
      probability: deal.probability.toString(),
      expected_close_date: deal.expected_close_date || '',
      description: ''
    });
  };

  const getStageColor = (stage: PipelineStage) => {
    if (stage.is_won) return 'bg-green-100 border-green-300 text-green-800';
    if (stage.is_lost) return 'bg-red-100 border-red-300 text-red-800';
    if (stage.code === 'novo') return 'bg-blue-100 border-blue-300 text-blue-800';
    if (stage.code === 'qualificado') return 'bg-yellow-100 border-yellow-300 text-yellow-800';
    if (stage.code === 'proposta') return 'bg-purple-100 border-purple-300 text-purple-800';
    return 'bg-gray-100 border-gray-300 text-gray-800';
  };

  const getDealsForStage = (stage: PipelineStage) => {
    return deals?.filter(deal => 
      deal.stage_id === stage.id || 
      (stage.code === 'novo' && !deal.stage_id)
    ) || [];
  };

  if (isLoading) return <LoadingState type="list" title="Carregando pipeline..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pipeline de Vendas</h1>
            <p className="text-gray-600">
              Acompanhe oportunidades até o fechamento
            </p>
          </div>
          
          <Dialog open={isNewDealOpen} onOpenChange={setIsNewDealOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Deal
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo Deal</DialogTitle>
                <DialogDescription>
                  Adicione uma nova oportunidade ao pipeline
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Nome da oportunidade"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="value">Valor</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="0,00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="currency">Moeda</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BRL">BRL (R$)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="contact">Contato</Label>
                  <Select value={formData.contact_id} onValueChange={(value) => setFormData(prev => ({ ...prev, contact_id: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar contato..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem contato vinculado</SelectItem>
                      {contacts?.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.name} {contact.email && `(${contact.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="probability">Probabilidade (%)</Label>
                    <Input
                      id="probability"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={(e) => setFormData(prev => ({ ...prev, probability: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expected_close_date">Previsão de Fechamento</Label>
                    <Input
                      id="expected_close_date"
                      type="date"
                      value={formData.expected_close_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, expected_close_date: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detalhes da oportunidade..."
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsNewDealOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateDeal} disabled={!formData.title.trim()}>
                  Criar Deal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{dealStats?.total_deals || 0}</div>
                <div className="text-xs text-gray-600">Total Deals</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {locale.formatCurrency(dealStats?.total_value || 0)}
                </div>
                <div className="text-xs text-gray-600">Valor Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{dealStats?.won_deals || 0}</div>
                <div className="text-xs text-gray-600">Fechados</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">
                  {Math.round(dealStats?.avg_probability || 0)}%
                </div>
                <div className="text-xs text-gray-600">Prob. Média</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Pipeline */}
      <div className="flex gap-6 overflow-x-auto pb-4">
        {stages?.map((stage) => {
          const stageDeals = getDealsForStage(stage);
          const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0);
          
          return (
            <Card key={stage.id} className={`min-w-80 ${getStageColor(stage)}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    {stage.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {stageDeals.length}
                  </Badge>
                </div>
                <div className="text-xs opacity-75">
                  {locale.formatCurrency(stageValue)}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stageDeals.length === 0 ? (
                    <div className="text-center py-8 text-sm text-gray-500">
                      Nenhum deal neste estágio
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <Card 
                        key={deal.id} 
                        className="bg-white border cursor-pointer hover:shadow-md transition-shadow"
                        draggable
                        onDragStart={() => setDraggedDeal(deal)}
                        onDragEnd={() => setDraggedDeal(null)}
                      >
                        <CardContent className="p-3">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between">
                              <h4 className="font-medium text-sm line-clamp-2">
                                {deal.title}
                              </h4>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => startEdit(deal)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteDeal(deal.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            
                            <div className="text-lg font-semibold text-green-600">
                              {locale.formatCurrency(deal.value)}
                            </div>
                            
                            {deal.contact_name && (
                              <div className="flex items-center gap-1 text-xs text-gray-600">
                                <User className="h-3 w-3" />
                                <span className="truncate">{deal.contact_name}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <Target className="h-3 w-3" />
                                <span>{deal.probability}%</span>
                              </div>
                              <div className="flex items-center gap-1 text-gray-500">
                                <Calendar className="h-3 w-3" />
                                <span>{locale.formatRelativeTime(deal.updated_at)}</span>
                              </div>
                            </div>
                            
                            {deal.expected_close_date && (
                              <div className="text-xs text-orange-600">
                                Previsão: {locale.formatDate(deal.expected_close_date)}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
                
                {/* Stage navigation */}
                <div className="mt-3 pt-3 border-t">
                  <div className="flex justify-between items-center">
                    {stage.order_index > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const prevStage = stages.find(s => s.order_index === stage.order_index - 1);
                          if (prevStage && draggedDeal) {
                            handleStageChange(draggedDeal.id, prevStage);
                          }
                        }}
                        disabled={!draggedDeal}
                      >
                        ← Anterior
                      </Button>
                    )}
                    
                    {stage.order_index < Math.max(...stages.map(s => s.order_index)) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs ml-auto"
                        onClick={() => {
                          const nextStage = stages.find(s => s.order_index === stage.order_index + 1);
                          if (nextStage && draggedDeal) {
                            handleStageChange(draggedDeal.id, nextStage);
                          }
                        }}
                        disabled={!draggedDeal}
                      >
                        Próximo →
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Deal Dialog */}
      <Dialog open={!!editingDeal} onOpenChange={(open) => !open && setEditingDeal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Deal</DialogTitle>
            <DialogDescription>
              Atualizar informações da oportunidade
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-value">Valor</Label>
                <Input
                  id="edit-value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-currency">Moeda</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL (R$)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-contact">Contato</Label>
              <Select value={formData.contact_id} onValueChange={(value) => setFormData(prev => ({ ...prev, contact_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar contato..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sem contato vinculado</SelectItem>
                  {contacts?.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} {contact.email && `(${contact.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-probability">Probabilidade (%)</Label>
                <Input
                  id="edit-probability"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.probability}
                  onChange={(e) => setFormData(prev => ({ ...prev, probability: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-expected-close-date">Previsão de Fechamento</Label>
                <Input
                  id="edit-expected-close-date"
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_close_date: e.target.value }))}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setEditingDeal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateDeal} disabled={!formData.title.trim()}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMDeals;
