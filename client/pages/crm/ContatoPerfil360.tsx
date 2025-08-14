import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { 
  User, 
  Building, 
  Mail, 
  Phone, 
  MessageCircle, 
  ExternalLink,
  Plus,
  Calendar,
  FileText,
  Ticket,
  Target,
  CreditCard,
  Activity,
  Edit,
  Link2,
  DollarSign,
  Clock
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase, lf } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';

interface Contact {
  id: string;
  kind: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  cpfcnpj?: string;
  public_cliente_cpfcnpj?: string;
  stripe_customer_id?: string;
  properties: any;
  created_at: string;
  updated_at: string;
}

interface Activity {
  id: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
  numero_cnj?: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  created_at: string;
}

const ContatoPerfil360 = () => {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  
  const [isNewActivityOpen, setIsNewActivityOpen] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [newActivity, setNewActivity] = useState({
    title: '',
    description: '',
    priority: 'medium'
  });

  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium'
  });

  const [newDeal, setNewDeal] = useState({
    title: '',
    value: '',
    probability: '50'
  });

  // Query para dados do contato
  const { data: contact, isLoading: contactLoading } = useSupabaseQuery(
    ['contact-profile', id],
    `
      SELECT * FROM legalflow.contacts
      WHERE id = $1
    `,
    [id],
    { enabled: !!id }
  );

  // Query para cliente público vinculado
  const { data: publicCliente } = useSupabaseQuery(
    ['public-cliente', contact?.public_cliente_cpfcnpj],
    `
      SELECT * FROM public.clientes
      WHERE cpfcnpj = $1
    `,
    [contact?.public_cliente_cpfcnpj],
    { enabled: !!contact?.public_cliente_cpfcnpj }
  );

  // Query para deals do contato
  const { data: deals = [] } = useSupabaseQuery(
    ['contact-deals', id],
    `
      SELECT id, title, value, currency, stage, probability, created_at
      FROM legalflow.deals
      WHERE contact_id = $1
      ORDER BY created_at DESC
    `,
    [id],
    { enabled: !!id }
  );

  // Query para activities do contato
  const { data: activities = [] } = useSupabaseQuery(
    ['contact-activities', id],
    `
      SELECT id, title, status, priority, created_at, numero_cnj
      FROM legalflow.activities
      WHERE properties->>'contact_id' = $1
      ORDER BY created_at DESC
      LIMIT 10
    `,
    [id],
    { enabled: !!id }
  );

  // Query para tickets do contato
  const { data: tickets = [] } = useSupabaseQuery(
    ['contact-tickets', contact?.cpfcnpj],
    `
      SELECT id, subject, status, priority, created_at
      FROM legalflow.tickets
      WHERE cliente_cpfcnpj = $1 OR properties->>'contact_id' = $2
      ORDER BY created_at DESC
      LIMIT 10
    `,
    [contact?.cpfcnpj, id],
    { enabled: !!contact }
  );

  // Query para conversas de chat
  const { data: chatThreads = [] } = useSupabaseQuery(
    ['contact-chats', id],
    `
      SELECT 
        tl.id, tl.thread_id, tl.summary, tl.created_at,
        COUNT(msg.id) as message_count
      FROM public.thread_links tl
      LEFT JOIN public.ai_messages msg ON msg.thread_id = tl.thread_id
      WHERE tl.properties->>'contact_id' = $1
      GROUP BY tl.id, tl.thread_id, tl.summary, tl.created_at
      ORDER BY tl.created_at DESC
      LIMIT 5
    `,
    [id],
    { enabled: !!id }
  );

  // Criar nova activity
  const handleCreateActivity = async () => {
    try {
      const { error } = await lf
        .from('activities')
        .insert({
          title: newActivity.title,
          description: newActivity.description,
          priority: newActivity.priority,
          status: 'todo',
          properties: { contact_id: id }
        });

      if (error) throw error;

      toast({
        title: 'Activity criada',
        description: 'Nova atividade foi adicionada.'
      });

      setIsNewActivityOpen(false);
      setNewActivity({ title: '', description: '', priority: 'medium' });
      
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar a activity.',
        variant: 'destructive'
      });
    }
  };

  // Criar novo ticket
  const handleCreateTicket = async () => {
    try {
      const { error } = await lf
        .from('tickets')
        .insert({
          subject: newTicket.subject,
          description: newTicket.description,
          priority: newTicket.priority,
          status: 'aberto',
          cliente_cpfcnpj: contact?.cpfcnpj,
          properties: { contact_id: id }
        });

      if (error) throw error;

      toast({
        title: 'Ticket criado',
        description: 'Novo ticket foi aberto.'
      });

      setIsNewTicketOpen(false);
      setNewTicket({ subject: '', description: '', priority: 'medium' });
      
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o ticket.',
        variant: 'destructive'
      });
    }
  };

  // Criar novo deal
  const handleCreateDeal = async () => {
    try {
      const salesPipeline = await lf
        .from('pipeline_defs')
        .select('id')
        .eq('code', 'sales')
        .single();

      const firstStage = await lf
        .from('pipeline_stages')
        .select('id, code')
        .eq('pipeline_id', salesPipeline.data?.id)
        .eq('order_index', 1)
        .single();

      const { error } = await lf
        .from('deals')
        .insert({
          title: newDeal.title,
          value: parseFloat(newDeal.value) || 0,
          currency: 'BRL',
          contact_id: id,
          probability: parseInt(newDeal.probability),
          pipeline_id: salesPipeline.data?.id,
          stage_id: firstStage.data?.id,
          stage: firstStage.data?.code
        });

      if (error) throw error;

      toast({
        title: 'Deal criado',
        description: 'Nova oportunidade foi adicionada.'
      });

      setIsNewDealOpen(false);
      setNewDeal({ title: '', value: '', probability: '50' });
      
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o deal.',
        variant: 'destructive'
      });
    }
  };

  // Criar checkout Stripe
  const handleCreateCheckout = async () => {
    try {
      if (!contact?.stripe_customer_id) {
        toast({
          title: 'Cliente Stripe não vinculado',
          description: 'Este contato não possui um cliente Stripe vinculado.',
          variant: 'destructive'
        });
        return;
      }

      // Chamar função Edge para criar checkout
      const response = await fetch('/.netlify/functions/stripe-utils', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_checkout',
          customer_id: contact.stripe_customer_id,
          amount: 10000, // R$ 100,00 como exemplo
          currency: 'brl',
          success_url: window.location.origin + '/success',
          cancel_url: window.location.href
        })
      });

      const data = await response.json();

      if (data.url) {
        window.open(data.url, '_blank');
        toast({
          title: 'Checkout criado',
          description: 'Link de pagamento foi aberto em nova aba.'
        });
      } else {
        throw new Error('URL de checkout não retornada');
      }

    } catch (error) {
      toast({
        title: 'Erro no checkout',
        description: 'Não foi possível criar o checkout.',
        variant: 'destructive'
      });
    }
  };

  const getKindIcon = (kind: string) => {
    return kind === 'org' ? <Building className="h-5 w-5" /> : <User className="h-5 w-5" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'todo':
      case 'aberto':
        return <Badge variant="destructive">Pendente</Badge>;
      case 'in_progress':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Em Andamento</Badge>;
      case 'done':
      case 'fechado':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Concluído</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">Alta</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Média</Badge>;
      case 'low':
        return <Badge variant="outline">Baixa</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const formatCurrency = (value: number, currency: string = 'BRL') => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(value);
  };

  if (contactLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="lg:col-span-2 h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Contato não encontrado</h1>
          <p className="text-gray-600 mt-2">O contato solicitado não existe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          {getKindIcon(contact.kind)}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{contact.name}</h1>
            <p className="text-gray-600">
              {contact.kind === 'org' ? 'Empresa' : 'Pessoa Física'}
            </p>
          </div>
        </div>
        
        <Button onClick={() => window.history.back()}>
          Voltar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna A: Resumo */}
        <div className="space-y-6">
          {/* Dados do Contato */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{contact.email}</span>
                </div>
              )}
              
              {contact.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{contact.phone}</span>
                </div>
              )}
              
              {contact.whatsapp && (
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">{contact.whatsapp}</span>
                </div>
              )}
              
              {contact.cpfcnpj && (
                <div>
                  <p className="text-xs text-gray-500">CPF/CNPJ</p>
                  <p className="font-mono text-sm">{contact.cpfcnpj}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vínculos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Vínculos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {contact.public_cliente_cpfcnpj && publicCliente && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Cliente Público</span>
                  </div>
                  <p className="text-sm text-blue-700">{publicCliente.nome}</p>
                  <p className="text-xs text-blue-600">{publicCliente.cpfcnpj}</p>
                </div>
              )}
              
              {contact.stripe_customer_id && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CreditCard className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Cliente Stripe</span>
                  </div>
                  <p className="text-xs text-green-600 font-mono">
                    {contact.stripe_customer_id}
                  </p>
                </div>
              )}
              
              {!contact.public_cliente_cpfcnpj && !contact.stripe_customer_id && (
                <p className="text-sm text-gray-500 italic">
                  Nenhum vínculo configurado
                </p>
              )}
            </CardContent>
          </Card>

          {/* Stats Rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Deals</span>
                <Badge variant="outline">{deals.length}</Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Activities</span>
                <Badge variant="outline">{activities.length}</Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tickets</span>
                <Badge variant="outline">{tickets.length}</Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Conversas</span>
                <Badge variant="outline">{chatThreads.length}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna B: Timeline e Dados */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="timeline" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="deals">Deals</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>

            {/* Timeline Unificada */}
            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Timeline de Interações</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Combinar todas as atividades em timeline */}
                    {[
                      ...deals.map(d => ({ ...d, type: 'deal', icon: Target })),
                      ...activities.map(a => ({ ...a, type: 'activity', icon: Activity })),
                      ...tickets.map(t => ({ ...t, type: 'ticket', icon: Ticket })),
                      ...chatThreads.map(c => ({ ...c, type: 'chat', icon: MessageCircle }))
                    ]
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 10)
                      .map((item, index) => {
                        const Icon = item.icon;
                        return (
                          <div key={`${item.type}-${item.id}-${index}`} className="flex items-start gap-3 p-3 border rounded-lg">
                            <Icon className="h-5 w-5 text-gray-500 mt-0.5" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium">
                                  {item.type === 'deal' ? item.title :
                                   item.type === 'activity' ? item.title :
                                   item.type === 'ticket' ? item.subject :
                                   item.summary || 'Conversa'}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {item.type}
                                </Badge>
                              </div>
                              
                              {item.type === 'deal' && (
                                <p className="text-sm text-gray-600">
                                  {formatCurrency(item.value, item.currency)} • {item.probability}%
                                </p>
                              )}
                              
                              <p className="text-xs text-gray-500">
                                {new Date(item.created_at).toLocaleDateString('pt-BR')} às{' '}
                                {new Date(item.created_at).toLocaleTimeString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    
                    {deals.length === 0 && activities.length === 0 && tickets.length === 0 && chatThreads.length === 0 && (
                      <p className="text-center text-gray-500 py-8">
                        Nenhuma interação registrada ainda
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Outras tabs com dados específicos */}
            <TabsContent value="deals">
              <Card>
                <CardHeader>
                  <CardTitle>Deals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {deals.map(deal => (
                      <div key={deal.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{deal.title}</span>
                          <Badge variant="outline">{deal.stage}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>{formatCurrency(deal.value, deal.currency)}</span>
                          <span>{deal.probability}%</span>
                        </div>
                      </div>
                    ))}
                    
                    {deals.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        Nenhum deal encontrado
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities">
              <Card>
                <CardHeader>
                  <CardTitle>Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {activities.map(activity => (
                      <div key={activity.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{activity.title}</span>
                          <div className="flex gap-2">
                            {getStatusBadge(activity.status)}
                            {getPriorityBadge(activity.priority)}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {activity.numero_cnj && (
                            <span>Processo: {activity.numero_cnj}</span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {activities.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        Nenhuma activity encontrada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tickets">
              <Card>
                <CardHeader>
                  <CardTitle>Tickets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{ticket.subject}</span>
                          <div className="flex gap-2">
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {tickets.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        Nenhum ticket encontrado
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chat">
              <Card>
                <CardHeader>
                  <CardTitle>Conversas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {chatThreads.map(chat => (
                      <div key={chat.id} className="p-3 border rounded-lg">
                        <div className="font-medium mb-1">
                          {chat.summary || 'Conversa sem título'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {chat.message_count} mensagens
                        </div>
                      </div>
                    ))}
                    
                    {chatThreads.length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        Nenhuma conversa encontrada
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Coluna C: Ações Rápidas (Fixed Sidebar) */}
      <div className="fixed right-6 top-1/2 transform -translate-y-1/2 space-y-3">
        <Card className="w-64">
          <CardHeader>
            <CardTitle className="text-sm">Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              onClick={() => setIsNewActivityOpen(true)}
              className="w-full justify-start"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Activity
            </Button>
            
            <Button 
              onClick={() => setIsNewTicketOpen(true)}
              className="w-full justify-start"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Ticket
            </Button>
            
            <Button 
              onClick={() => setIsNewDealOpen(true)}
              className="w-full justify-start"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Deal
            </Button>
            
            {contact.stripe_customer_id && (
              <Button 
                onClick={handleCreateCheckout}
                className="w-full justify-start"
                variant="outline"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Criar Checkout
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs para Ações */}
      
      {/* Dialog: Nova Activity */}
      <Dialog open={isNewActivityOpen} onOpenChange={setIsNewActivityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Activity</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="activity-title">Título *</Label>
              <Input
                id="activity-title"
                value={newActivity.title}
                onChange={(e) => setNewActivity(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título da atividade"
              />
            </div>
            
            <div>
              <Label htmlFor="activity-description">Descrição</Label>
              <Textarea
                id="activity-description"
                value={newActivity.description}
                onChange={(e) => setNewActivity(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Detalhes da atividade"
              />
            </div>
            
            <div>
              <Label htmlFor="activity-priority">Prioridade</Label>
              <Select 
                value={newActivity.priority} 
                onValueChange={(value) => setNewActivity(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsNewActivityOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateActivity} disabled={!newActivity.title}>
              Criar Activity
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo Ticket */}
      <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Ticket</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="ticket-subject">Assunto *</Label>
              <Input
                id="ticket-subject"
                value={newTicket.subject}
                onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Assunto do ticket"
              />
            </div>
            
            <div>
              <Label htmlFor="ticket-description">Descrição</Label>
              <Textarea
                id="ticket-description"
                value={newTicket.description}
                onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descrição do problema"
              />
            </div>
            
            <div>
              <Label htmlFor="ticket-priority">Prioridade</Label>
              <Select 
                value={newTicket.priority} 
                onValueChange={(value) => setNewTicket(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsNewTicketOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTicket} disabled={!newTicket.subject}>
              Criar Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Novo Deal */}
      <Dialog open={isNewDealOpen} onOpenChange={setIsNewDealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Deal</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="deal-title">Título *</Label>
              <Input
                id="deal-title"
                value={newDeal.title}
                onChange={(e) => setNewDeal(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Nome da oportunidade"
              />
            </div>
            
            <div>
              <Label htmlFor="deal-value">Valor</Label>
              <Input
                id="deal-value"
                type="number"
                step="0.01"
                value={newDeal.value}
                onChange={(e) => setNewDeal(prev => ({ ...prev, value: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div>
              <Label htmlFor="deal-probability">Probabilidade (%)</Label>
              <Input
                id="deal-probability"
                type="number"
                min="0"
                max="100"
                value={newDeal.probability}
                onChange={(e) => setNewDeal(prev => ({ ...prev, probability: e.target.value }))}
                placeholder="50"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsNewDealOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateDeal} disabled={!newDeal.title}>
              Criar Deal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContatoPerfil360;
