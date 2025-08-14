import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Building, 
  User, 
  Mail, 
  Phone, 
  MessageCircle,
  ExternalLink,
  Edit,
  Link2,
  CreditCard,
  Filter
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { useSupabaseQuery } from '../../hooks/useSupabaseQuery';
import { supabase, lf } from '../../lib/supabase';
import { useToast } from '../../hooks/use-toast';

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

interface NewContactData {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  cpfcnpj: string;
  kind: 'person' | 'org';
  public_cliente_cpfcnpj: string;
  stripe_customer_id: string;
  properties: string;
}

const ContatosUnificados = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [isVinculoStripeOpen, setIsVinculoStripeOpen] = useState(false);
  const [isVinculoClienteOpen, setIsVinculoClienteOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [newContactData, setNewContactData] = useState<NewContactData>({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    cpfcnpj: '',
    kind: 'person',
    public_cliente_cpfcnpj: '',
    stripe_customer_id: '',
    properties: '{}'
  });

  // Query para lista unificada de contatos
  const { data: contacts = [], isLoading, refetch } = useSupabaseQuery(
    ['contacts-unified', searchTerm, filterSource, page],
    `
      SELECT * FROM legalflow.vw_contacts_unified
      WHERE 
        ($1 = '' OR 
         name ILIKE '%' || $1 || '%' OR 
         email ILIKE '%' || $1 || '%' OR 
         whatsapp ILIKE '%' || $1 || '%' OR 
         cpfcnpj ILIKE '%' || $1 || '%')
        AND ($2 = 'all' OR source = $2)
      ORDER BY updated_at DESC
      LIMIT $3 OFFSET $4
    `,
    [searchTerm, filterSource, pageSize, (page - 1) * pageSize]
  );

  // Query para clientes públicos (para vinculação)
  const { data: publicClientes = [] } = useSupabaseQuery(
    ['public-clientes'],
    () => clientesApi.getAll()
  );

  // Query para estatísticas
  const { data: stats } = useSupabaseQuery(
    'contacts-stats',
    `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE source = 'legalflow.contacts') as legalflow_count,
        COUNT(*) FILTER (WHERE source = 'public.clientes') as public_count,
        COUNT(*) FILTER (WHERE stripe_customer_id IS NOT NULL) as stripe_count
      FROM legalflow.vw_contacts_unified
    `,
    []
  );

  // Criar novo contato
  const handleCreateContact = async () => {
    try {
      let properties = {};
      try {
        properties = JSON.parse(newContactData.properties);
      } catch (e) {
        properties = {};
      }

      const { data, error } = await lf
        .from('contacts')
        .insert({
          name: newContactData.name,
          email: newContactData.email || null,
          phone: newContactData.phone || null,
          whatsapp: newContactData.whatsapp || null,
          cpfcnpj: newContactData.cpfcnpj || null,
          kind: newContactData.kind,
          public_cliente_cpfcnpj: newContactData.public_cliente_cpfcnpj || null,
          stripe_customer_id: newContactData.stripe_customer_id || null,
          properties: properties
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Contato criado com sucesso',
        description: `${newContactData.name} foi adicionado aos contatos.`
      });

      setIsNewContactOpen(false);
      setNewContactData({
        name: '',
        email: '',
        phone: '',
        whatsapp: '',
        cpfcnpj: '',
        kind: 'person',
        public_cliente_cpfcnpj: '',
        stripe_customer_id: '',
        properties: '{}'
      });
      refetch();

    } catch (error) {
      console.error('Erro ao criar contato:', error);
      toast({
        title: 'Erro ao criar contato',
        description: 'Não foi possível criar o contato.',
        variant: 'destructive'
      });
    }
  };

  // Vincular a cliente público
  const handleVincularCliente = async (cpfcnpj: string) => {
    if (!selectedContact || selectedContact.source === 'public.clientes') return;

    try {
      const { error } = await lf
        .from('contacts')
        .update({ public_cliente_cpfcnpj: cpfcnpj })
        .eq('id', selectedContact.id);

      if (error) throw error;

      toast({
        title: 'Contato vinculado',
        description: 'Contato vinculado ao cliente público com sucesso.'
      });

      setIsVinculoClienteOpen(false);
      setSelectedContact(null);
      refetch();

    } catch (error) {
      toast({
        title: 'Erro na vinculação',
        description: 'Não foi possível vincular o contato.',
        variant: 'destructive'
      });
    }
  };

  // Vincular a cliente Stripe
  const handleVincularStripe = async (stripeCustomerId: string) => {
    if (!selectedContact || selectedContact.source === 'public.clientes') return;

    try {
      const { error } = await lf
        .from('contacts')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', selectedContact.id);

      if (error) throw error;

      toast({
        title: 'Contato vinculado ao Stripe',
        description: 'Cliente Stripe vinculado com sucesso.'
      });

      setIsVinculoStripeOpen(false);
      setSelectedContact(null);
      refetch();

    } catch (error) {
      toast({
        title: 'Erro na vinculação Stripe',
        description: 'Não foi possível vincular ao Stripe.',
        variant: 'destructive'
      });
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'legalflow.contacts':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">CRM</Badge>;
      case 'public.clientes':
        return <Badge variant="outline">Cliente</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  const getKindIcon = (kind: string) => {
    return kind === 'org' ? <Building className="h-4 w-4" /> : <User className="h-4 w-4" />;
  };

  const formatContactInfo = (contact: Contact) => {
    const info = [];
    if (contact.email) info.push(contact.email);
    if (contact.phone) info.push(contact.phone);
    if (contact.whatsapp) info.push(`WhatsApp: ${contact.whatsapp}`);
    if (contact.cpfcnpj) info.push(`CPF/CNPJ: ${contact.cpfcnpj}`);
    return info.join(' • ');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8" />
            Contatos Unificados
          </h1>
          <p className="text-gray-600 mt-1">
            Centralize pessoas e empresas - clientes ou prospects
          </p>
        </div>
        
        <Button onClick={() => setIsNewContactOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Contato
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total</p>
                  <p className="text-2xl font-bold">{stats.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Building className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">CRM</p>
                  <p className="text-2xl font-bold">{stats.legalflow_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <User className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Clientes</p>
                  <p className="text-2xl font-bold">{stats.public_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Stripe</p>
                  <p className="text-2xl font-bold">{stats.stripe_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar por nome, email, telefone ou CPF/CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger className="w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Fontes</SelectItem>
                <SelectItem value="legalflow.contacts">CRM</SelectItem>
                <SelectItem value="public.clientes">Clientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Contatos */}
      <Card>
        <CardHeader>
          <CardTitle>Contatos ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : contacts.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Fonte</TableHead>
                    <TableHead>Vínculos</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow key={`${contact.source}-${contact.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getKindIcon(contact.kind)}
                          <span className="font-medium">{contact.name}</span>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {formatContactInfo(contact)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <span className="font-mono text-sm">
                          {contact.cpfcnpj || '-'}
                        </span>
                      </TableCell>
                      
                      <TableCell>
                        {getSourceBadge(contact.source)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-1">
                          {contact.public_cliente_cpfcnpj && (
                            <Badge variant="outline" className="text-xs">
                              <User className="h-3 w-3 mr-1" />
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
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex gap-2">
                          {contact.source === 'legalflow.contacts' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedContact(contact);
                                  setIsVinculoClienteOpen(true);
                                }}
                              >
                                <Link2 className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedContact(contact);
                                  setIsVinculoStripeOpen(true);
                                }}
                              >
                                <CreditCard className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // Navegar para perfil do contato
                              window.location.href = `/crm/contatos/${contact.id}`;
                            }}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginação */}
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                
                <span className="text-sm text-gray-600">
                  Página {page} • {pageSize} por página
                </span>
                
                <Button
                  variant="outline"
                  onClick={() => setPage(p => p + 1)}
                  disabled={contacts.length < pageSize}
                >
                  Próxima
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                Nenhum contato encontrado
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm ? 'Tente ajustar os filtros de busca' : 'Adicione o primeiro contato'}
              </p>
              <Button onClick={() => setIsNewContactOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Novo Contato
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Novo Contato */}
      <Dialog open={isNewContactOpen} onOpenChange={setIsNewContactOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={newContactData.name}
                onChange={(e) => setNewContactData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            
            <div>
              <Label htmlFor="kind">Tipo</Label>
              <Select 
                value={newContactData.kind} 
                onValueChange={(value: 'person' | 'org') => setNewContactData(prev => ({ ...prev, kind: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="person">Pessoa Física</SelectItem>
                  <SelectItem value="org">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newContactData.email}
                onChange={(e) => setNewContactData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={newContactData.phone}
                onChange={(e) => setNewContactData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
            
            <div>
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={newContactData.whatsapp}
                onChange={(e) => setNewContactData(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
            
            <div>
              <Label htmlFor="cpfcnpj">CPF/CNPJ</Label>
              <Input
                id="cpfcnpj"
                value={newContactData.cpfcnpj}
                onChange={(e) => setNewContactData(prev => ({ ...prev, cpfcnpj: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </div>
            
            <div>
              <Label htmlFor="stripe_customer_id">ID Cliente Stripe</Label>
              <Input
                id="stripe_customer_id"
                value={newContactData.stripe_customer_id}
                onChange={(e) => setNewContactData(prev => ({ ...prev, stripe_customer_id: e.target.value }))}
                placeholder="cus_..."
              />
            </div>
            
            <div>
              <Label htmlFor="public_cliente_cpfcnpj">Vincular a Cliente</Label>
              <Select 
                value={newContactData.public_cliente_cpfcnpj}
                onValueChange={(value) => setNewContactData(prev => ({ ...prev, public_cliente_cpfcnpj: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum cliente</SelectItem>
                  {publicClientes.map((cliente) => (
                    <SelectItem key={cliente.cpfcnpj} value={cliente.cpfcnpj}>
                      {cliente.nome} ({cliente.cpfcnpj})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsNewContactOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateContact} disabled={!newContactData.name}>
              Criar Contato
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Vincular Cliente */}
      <Dialog open={isVinculoClienteOpen} onOpenChange={setIsVinculoClienteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular a Cliente Público</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Selecione um cliente público para vincular ao contato "{selectedContact?.name}":
            </p>
            
            <div className="max-h-64 overflow-y-auto space-y-2">
              {publicClientes.map((cliente) => (
                <div
                  key={cliente.cpfcnpj}
                  className="p-3 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => handleVincularCliente(cliente.cpfcnpj)}
                >
                  <div className="font-medium">{cliente.nome}</div>
                  <div className="text-sm text-gray-500">{cliente.cpfcnpj}</div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Vincular Stripe */}
      <Dialog open={isVinculoStripeOpen} onOpenChange={setIsVinculoStripeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Cliente Stripe</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Digite o ID do cliente no Stripe para vincular ao contato "{selectedContact?.name}":
            </p>
            
            <Input
              placeholder="cus_..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const value = (e.target as HTMLInputElement).value;
                  if (value.startsWith('cus_')) {
                    handleVincularStripe(value);
                  }
                }
              }}
            />
            
            <p className="text-xs text-gray-500">
              O ID deve começar com "cus_" (ex: cus_1234567890)
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContatosUnificados;
