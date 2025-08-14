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
  Trash2,
  CreditCard,
  ShoppingCart,
  ExternalLink,
  Loader2,
  CheckCircle
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
  properties?: any;
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
  stripe_customer_id?: string;
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

interface StripePrice {
  id: string;
  product_id: string;
  product_name: string;
  unit_amount: number;
  currency: string;
  recurring_interval?: string;
  interval_count?: number;
  active: boolean;
}

interface CheckoutData {
  deal_id: string;
  price_id: string;
  quantity: number;
  mode: 'payment' | 'subscription';
  metadata: Record<string, string>;
}

const CRMDealsWithStripe: React.FC = () => {
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutDeal, setCheckoutDeal] = useState<Deal | null>(null);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    deal_id: '',
    price_id: '',
    quantity: 1,
    mode: 'payment',
    metadata: {}
  });
  const [creatingCheckout, setCreatingCheckout] = useState(false);
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
      d.expected_close_date, d.contact_id, d.pipeline_id, d.stage_id, d.properties,
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
    select id, name, email, whatsapp, stripe_customer_id
    from legalflow.contacts
    order by name
    limit 100
    `
  );

  // Fetch Stripe prices for checkout
  const { data: stripePrices } = useSupabaseQuery<StripePrice[]>(
    'stripe-prices-active',
    `
    select 
      sp.id, sp.product_id, sp.unit_amount, sp.currency, 
      sp.recurring_interval, sp.interval_count, sp.active,
      spr.name as product_name
    from legalflow.stripe_prices sp
    left join legalflow.stripe_products spr on spr.id = sp.product_id
    where sp.active = true
    order by spr.name, sp.unit_amount
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
      const { error } = await supabase
        .from('legalflow.deals')
        .insert({
          title: formData.title,
          value: parseFloat(formData.value),
          currency: formData.currency,
          contact_id: formData.contact_id || null,
          probability: parseInt(formData.probability),
          expected_close_date: formData.expected_close_date || null,
          description: formData.description || null,
          stage: 'novo',
          pipeline_id: stages?.find(s => s.code === 'novo')?.id,
          stage_id: stages?.find(s => s.code === 'novo')?.id,
          properties: {}
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
          value: parseFloat(formData.value),
          currency: formData.currency,
          contact_id: formData.contact_id || null,
          probability: parseInt(formData.probability),
          expected_close_date: formData.expected_close_date || null,
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
        description: 'Oportunidade removida com sucesso'
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

  const handleStageChange = async (dealId: string, newStageId: number) => {
    try {
      const { error } = await supabase
        .from('legalflow.deals')
        .update({ stage_id: newStageId })
        .eq('id', dealId);

      if (error) throw error;

      refetch();
    } catch (error) {
      console.error('Error updating deal stage:', error);
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
      description: deal.properties?.description || ''
    });
  };

  const openCheckout = (deal: Deal) => {
    setCheckoutDeal(deal);
    setCheckoutData({
      deal_id: deal.id,
      price_id: '',
      quantity: 1,
      mode: 'payment',
      metadata: {
        deal_id: deal.id,
        deal_title: deal.title,
        contact_email: deal.contact_email || ''
      }
    });
    setIsCheckoutOpen(true);
  };

  const handleCreateCheckout = async () => {
    if (!checkoutDeal || !checkoutData.price_id) return;

    setCreatingCheckout(true);
    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_id: checkoutDeal.contact_id,
          price_id: checkoutData.price_id,
          quantity: checkoutData.quantity,
          mode: checkoutData.mode,
          metadata: checkoutData.metadata,
          success_url: `${window.location.origin}/deals?session_id={CHECKOUT_SESSION_ID}&deal_id=${checkoutDeal.id}`,
          cancel_url: `${window.location.origin}/deals?canceled=true&deal_id=${checkoutDeal.id}`
        })
      });

      const result = await response.json();
      if (result.success) {
        // Update deal with checkout session info
        await supabase
          .from('legalflow.deals')
          .update({
            properties: {
              ...checkoutDeal.properties,
              stripe_checkout_session_id: result.session_id,
              checkout_created_at: new Date().toISOString()
            }
          })
          .eq('id', checkoutDeal.id);

        // Open checkout URL
        window.open(result.url, '_blank');
        
        toast({
          title: 'Checkout criado',
          description: 'Link de pagamento gerado com sucesso'
        });

        setIsCheckoutOpen(false);
        refetch();
      } else {
        toast({
          title: 'Erro',
          description: result.error || 'Falha ao criar checkout',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao conectar com Stripe',
        variant: 'destructive'
      });
    } finally {
      setCreatingCheckout(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStageColor = (stage: PipelineStage) => {
    if (stage.is_won) return 'bg-green-100 text-green-800 border-green-200';
    if (stage.is_lost) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getDealsByStage = (stageId: number) => {
    return deals?.filter(deal => deal.stage_id === stageId) || [];
  };

  if (isLoading) return <LoadingState type="kanban" title="Carregando pipeline..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Pipeline de Vendas</h1>
            <p className="text-gray-600">
              Gerencie oportunidades com checkout Stripe integrado
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
                  Criar nova oportunidade no pipeline de vendas
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
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="value">Valor *</Label>
                    <Input
                      id="value"
                      type="number"
                      step="0.01"
                      value={formData.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="0.00"
                      required
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
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact">Contato</Label>
                    <Select value={formData.contact_id} onValueChange={(value) => setFormData(prev => ({ ...prev, contact_id: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar contato..." />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts?.map((contact) => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.name} {contact.email && `(${contact.email})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="expected_close">Data prevista de fechamento</Label>
                    <Input
                      id="expected_close"
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
                <Button onClick={handleCreateDeal} disabled={!formData.title.trim() || !formData.value}>
                  Criar Deal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      {dealStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total de Deals</p>
                  <p className="text-2xl font-bold text-gray-900">{dealStats.total_deals}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Valor Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(dealStats.total_value || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Deals Ganhos</p>
                  <p className="text-2xl font-bold text-gray-900">{dealStats.won_deals}</p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(dealStats.won_value || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <User className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Prob. Média</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Math.round(dealStats.avg_probability || 0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {stages?.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          return (
            <Card key={stage.id} className={`${getStageColor(stage)} border-2`}>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-medium">
                  {stage.name}
                  <Badge variant="secondary" className="ml-2">
                    {stageDeals.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stageDeals.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum deal</p>
                  </div>
                ) : (
                  stageDeals.map((deal) => (
                    <Card key={deal.id} className="cursor-move border shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm leading-tight">{deal.title}</h4>
                          <div className="flex items-center space-x-1">
                            {deal.properties?.stripe_checkout_session_id && (
                              <Badge variant="outline" className="text-xs">
                                <CreditCard className="h-3 w-3 mr-1" />
                                Checkout
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                const dropdown = document.createElement('div');
                                // Simple dropdown menu would go here
                              }}
                            >
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-green-600">
                              {formatCurrency(deal.value, deal.currency)}
                            </span>
                            <span className="text-xs text-gray-500">
                              {deal.probability}%
                            </span>
                          </div>
                          
                          {deal.contact_name && (
                            <div className="flex items-center text-xs text-gray-600">
                              <User className="h-3 w-3 mr-1" />
                              {deal.contact_name}
                            </div>
                          )}
                          
                          {deal.expected_close_date && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(deal.expected_close_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center mt-3 pt-2 border-t">
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => startEdit(deal)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => handleDeleteDeal(deal.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {deal.contact_id && stripePrices && stripePrices.length > 0 && !stage.is_won && !stage.is_lost && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => openCheckout(deal)}
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Checkout
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stripe Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerar Checkout Stripe</DialogTitle>
            <DialogDescription>
              Criar link de pagamento para: {checkoutDeal?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="price">Produto/Preço</Label>
              <Select value={checkoutData.price_id} onValueChange={(value) => setCheckoutData(prev => ({ ...prev, price_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar produto..." />
                </SelectTrigger>
                <SelectContent>
                  {stripePrices?.map((price) => (
                    <SelectItem key={price.id} value={price.id}>
                      {price.product_name} - {formatCurrency(price.unit_amount / 100, price.currency)}
                      {price.recurring_interval && ` / ${price.recurring_interval}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={checkoutData.quantity}
                  onChange={(e) => setCheckoutData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label htmlFor="mode">Modo</Label>
                <Select value={checkoutData.mode} onValueChange={(value: 'payment' | 'subscription') => setCheckoutData(prev => ({ ...prev, mode: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">Pagamento único</SelectItem>
                    <SelectItem value="subscription">Assinatura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Informações do Cliente</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>Nome:</strong> {checkoutDeal?.contact_name}</p>
                <p><strong>Email:</strong> {checkoutDeal?.contact_email}</p>
                <p><strong>Deal:</strong> {checkoutDeal?.title} ({formatCurrency(checkoutDeal?.value || 0)})</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateCheckout} 
              disabled={!checkoutData.price_id || creatingCheckout}
            >
              {creatingCheckout ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Gerar Checkout
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-value">Valor *</Label>
                <Input
                  id="edit-value"
                  type="number"
                  step="0.01"
                  value={formData.value}
                  onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                  required
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
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-contact">Contato</Label>
                <Select value={formData.contact_id} onValueChange={(value) => setFormData(prev => ({ ...prev, contact_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar contato..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Remover contato</SelectItem>
                    {contacts?.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.name} {contact.email && `(${contact.email})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-expected-close">Data prevista de fechamento</Label>
                <Input
                  id="edit-expected-close"
                  type="date"
                  value={formData.expected_close_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, expected_close_date: e.target.value }))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setEditingDeal(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateDeal} disabled={!formData.title.trim() || !formData.value}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMDealsWithStripe;
