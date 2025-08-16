import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';
import { EmptyState, ErrorState, LoadingState } from '../../components/states';
import { locale } from '../../lib/locale';
import { 
  Search,
  Plus,
  User,
  Building,
  Mail,
  Phone,
  MessageCircle,
  CreditCard,
  Link,
  Edit,
  Trash2,
  Users,
  Filter
} from 'lucide-react';

interface Contact {
  id: string;
  source: string;
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

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  cpfcnpj: string;
  public_cliente_cpfcnpj: string;
  stripe_customer_id: string;
  kind: string;
}

const CRMContatos: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    cpfcnpj: '',
    public_cliente_cpfcnpj: '',
    stripe_customer_id: '',
    kind: 'person'
  });
  const { toast } = useToast();

  // Fetch unified contacts
  const { data: contacts, isLoading, error, refetch } = useSupabaseQuery<Contact[]>(
    'crm-contacts-unified',
    `
    select 
      source, id, kind, name, email, phone, whatsapp, cpfcnpj,
      public_cliente_cpfcnpj, stripe_customer_id, properties, 
      created_at, updated_at
    from legalflow.vw_contacts_unified
    where 
      (name ilike $1 or email ilike $1 or whatsapp ilike $1 or cpfcnpj ilike $1)
      and ($2 = 'all' or source = $2)
      and ($3 = 'all' or kind = $3)
    order by updated_at desc
    limit 25
    `,
    [`%${searchTerm}%`, sourceFilter === 'all' ? 'all' : sourceFilter, kindFilter === 'all' ? 'all' : kindFilter]
  );

  // Fetch public clients for linking
  const { data: publicClients } = useSupabaseQuery(
    'public-clients-list',
    `
    select cpfcnpj, nome 
    from public.clientes 
    order by nome
    limit 100
    `
  );

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      whatsapp: '',
      cpfcnpj: '',
      public_cliente_cpfcnpj: '',
      stripe_customer_id: '',
      kind: 'person'
    });
    setEditingContact(null);
  };

  const handleCreateContact = async () => {
    try {
      const { error } = await supabase
        .from('legalflow.contacts')
        .insert({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          whatsapp: formData.whatsapp || null,
          cpfcnpj: formData.cpfcnpj || null,
          public_cliente_cpfcnpj: formData.public_cliente_cpfcnpj || null,
          stripe_customer_id: formData.stripe_customer_id || null,
          kind: formData.kind,
          properties: {}
        });

      if (error) throw error;

      toast({
        title: 'Contato criado',
        description: 'Novo contato adicionado com sucesso'
      });

      setIsNewContactOpen(false);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error creating contact:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao criar contato',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;

    try {
      const { error } = await supabase
        .from('legalflow.contacts')
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          whatsapp: formData.whatsapp || null,
          cpfcnpj: formData.cpfcnpj || null,
          public_cliente_cpfcnpj: formData.public_cliente_cpfcnpj || null,
          stripe_customer_id: formData.stripe_customer_id || null,
          kind: formData.kind,
        })
        .eq('id', editingContact.id);

      if (error) throw error;

      toast({
        title: 'Contato atualizado',
        description: 'Informações salvas com sucesso'
      });

      setEditingContact(null);
      resetForm();
      refetch();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar contato',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Tem certeza que deseja excluir este contato?')) return;

    try {
      const { error } = await supabase
        .from('legalflow.contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      toast({
        title: 'Contato excluído',
        description: 'Contato removido com sucesso'
      });

      refetch();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao excluir contato',
        variant: 'destructive'
      });
    }
  };

  const startEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email || '',
      phone: contact.phone || '',
      whatsapp: contact.whatsapp || '',
      cpfcnpj: contact.cpfcnpj || '',
      public_cliente_cpfcnpj: contact.public_cliente_cpfcnpj || '',
      stripe_customer_id: contact.stripe_customer_id || '',
      kind: contact.kind
    });
  };

  const getSourceBadge = (source: string) => {
    if (source === 'public.clientes') {
      return <Badge variant="secondary">Cliente</Badge>;
    }
    return <Badge variant="outline">CRM</Badge>;
  };

  const getKindIcon = (kind: string) => {
    return kind === 'org' ? (
      <Building className="h-4 w-4 text-blue-600" />
    ) : (
      <User className="h-4 w-4 text-green-600" />
    );
  };

  if (isLoading) return <LoadingState type="list" title="Carregando contatos..." />;
  if (error) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contatos</h1>
        <p className="text-gray-600">
          Centralize pessoas e empresas (clientes ou leads) em um só lugar
        </p>
      </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email, WhatsApp ou CPF/CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Fonte" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as fontes</SelectItem>
                  <SelectItem value="public.clientes">Clientes</SelectItem>
                  <SelectItem value="legalflow.contacts">CRM</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={kindFilter} onValueChange={setKindFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="person">Pessoa</SelectItem>
                  <SelectItem value="org">Empresa</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={isNewContactOpen} onOpenChange={setIsNewContactOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Contato
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Novo Contato</DialogTitle>
                    <DialogDescription>
                      Adicione um novo contato ao CRM
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
                      <TabsTrigger value="links">Vinculações</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="kind">Tipo</Label>
                          <Select value={formData.kind} onValueChange={(value) => setFormData(prev => ({ ...prev, kind: value }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="person">Pessoa</SelectItem>
                              <SelectItem value="org">Empresa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="name">Nome *</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Nome completo ou razão social"
                            required
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            placeholder="email@exemplo.com"
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="whatsapp">WhatsApp</Label>
                          <Input
                            id="whatsapp"
                            value={formData.whatsapp}
                            onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                            placeholder="5511999999999"
                          />
                        </div>
                        <div>
                          <Label htmlFor="cpfcnpj">CPF/CNPJ</Label>
                          <Input
                            id="cpfcnpj"
                            value={formData.cpfcnpj}
                            onChange={(e) => setFormData(prev => ({ ...prev, cpfcnpj: e.target.value }))}
                            placeholder="000.000.000-00"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="links" className="space-y-4">
                      <div>
                        <Label htmlFor="public_cliente">Vincular a Cliente (public)</Label>
                        <Select 
                          value={formData.public_cliente_cpfcnpj} 
                          onValueChange={(value) => setFormData(prev => ({ ...prev, public_cliente_cpfcnpj: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar cliente..." />
                          </SelectTrigger>
                          <SelectContent>
                            {publicClients?.map((client: any) => (
                              <SelectItem key={client.cpfcnpj} value={client.cpfcnpj}>
                                {client.nome} ({client.cpfcnpj})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="stripe_customer">Stripe Customer ID</Label>
                        <Input
                          id="stripe_customer"
                          value={formData.stripe_customer_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, stripe_customer_id: e.target.value }))}
                          placeholder="cus_..."
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button variant="outline" onClick={() => setIsNewContactOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleCreateContact} disabled={!formData.name.trim()}>
                      Criar Contato
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contacts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Contatos ({contacts?.length || 0})
          </CardTitle>
          <CardDescription>
            Lista unificada de contatos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!contacts?.length ? (
            <EmptyState
              type="clientes"
              title="Nenhum contato encontrado"
              description="Comece adicionando contatos ao seu CRM"
              actionLabel="Novo Contato"
              onAction={() => setIsNewContactOpen(true)}
            />
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getKindIcon(contact.kind)}
                      {getSourceBadge(contact.source)}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-sm text-gray-600 space-x-4">
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </span>
                        )}
                        {contact.whatsapp && (
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" />
                            {contact.whatsapp}
                          </span>
                        )}
                        {contact.cpfcnpj && (
                          <span>{locale.formatCpfCnpj(contact.cpfcnpj)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {contact.public_cliente_cpfcnpj && (
                        <Badge variant="secondary" className="text-xs">
                          <Link className="h-3 w-3 mr-1" />
                          Cliente
                        </Badge>
                      )}
                      {contact.stripe_customer_id && (
                        <Badge variant="outline" className="text-xs">
                          <CreditCard className="h-3 w-3 mr-1" />
                          Stripe
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-500">
                      {locale.formatRelativeTime(contact.updated_at)}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {contact.source === 'legalflow.contacts' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(contact)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteContact(contact.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContact} onOpenChange={(open) => !open && setEditingContact(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Contato</DialogTitle>
            <DialogDescription>
              Atualizar informações do contato
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
              <TabsTrigger value="links">Vinculações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-kind">Tipo</Label>
                  <Select value={formData.kind} onValueChange={(value) => setFormData(prev => ({ ...prev, kind: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="person">Pessoa</SelectItem>
                      <SelectItem value="org">Empresa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-name">Nome *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Telefone</Label>
                  <Input
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-whatsapp">WhatsApp</Label>
                  <Input
                    id="edit-whatsapp"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-cpfcnpj">CPF/CNPJ</Label>
                  <Input
                    id="edit-cpfcnpj"
                    value={formData.cpfcnpj}
                    onChange={(e) => setFormData(prev => ({ ...prev, cpfcnpj: e.target.value }))}
                  />
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="links" className="space-y-4">
              <div>
                <Label htmlFor="edit-public-cliente">Vincular a Cliente (public)</Label>
                <Select 
                  value={formData.public_cliente_cpfcnpj} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, public_cliente_cpfcnpj: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Remover vinculação</SelectItem>
                    {publicClients?.map((client: any) => (
                      <SelectItem key={client.cpfcnpj} value={client.cpfcnpj}>
                        {client.nome} ({client.cpfcnpj})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="edit-stripe-customer">Stripe Customer ID</Label>
                <Input
                  id="edit-stripe-customer"
                  value={formData.stripe_customer_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, stripe_customer_id: e.target.value }))}
                  placeholder="cus_..."
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setEditingContact(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateContact} disabled={!formData.name.trim()}>
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CRMContatos;
