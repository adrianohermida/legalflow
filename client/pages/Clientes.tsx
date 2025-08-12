import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Plus, Search, User, Building, Phone, FileText, Loader2, Trash2, Edit } from 'lucide-react';
import { clientesApi } from '../lib/api';
import { useSupabaseQuery, useSupabaseMutation } from '../hooks/useSupabaseQuery';
import type { Database } from '../lib/supabase';

type Cliente = Database['public']['Tables']['clientes']['Row'];

export function Clientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState({
    tipo: 'PF' as 'PF' | 'PJ',
    nome: '',
    cpfcnpj: '',
    whatsapp: ''
  });
  const [error, setError] = useState('');

  // Fetch clientes from Supabase
  const { data: clientes = [], isLoading, error: fetchError } = useSupabaseQuery(
    ['clientes'],
    clientesApi.getAll
  );

  // Create mutation
  const createMutation = useSupabaseMutation(
    clientesApi.create,
    {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({ tipo: 'PF', nome: '', cpfcnpj: '', whatsapp: '' });
        setError('');
      },
      onError: (error) => {
        setError(error.message);
      },
      invalidateQueries: [['clientes']]
    }
  );

  // Update mutation
  const updateMutation = useSupabaseMutation(
    ({ cpfcnpj, updates }: { cpfcnpj: string; updates: any }) => 
      clientesApi.update(cpfcnpj, updates),
    {
      onSuccess: () => {
        setEditingCliente(null);
        setIsDialogOpen(false);
        setFormData({ tipo: 'PF', nome: '', cpfcnpj: '', whatsapp: '' });
        setError('');
      },
      onError: (error) => {
        setError(error.message);
      },
      invalidateQueries: [['clientes']]
    }
  );

  // Delete mutation
  const deleteMutation = useSupabaseMutation(
    clientesApi.delete,
    {
      onSuccess: () => {
        setError('');
      },
      onError: (error) => {
        setError(error.message);
      },
      invalidateQueries: [['clientes']]
    }
  );

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cpfcnpj.includes(searchTerm)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const clienteData = {
      cpfcnpj: formData.cpfcnpj,
      nome: formData.nome,
      whatsapp: formData.whatsapp
    };

    if (editingCliente) {
      updateMutation.mutate({
        cpfcnpj: editingCliente.cpfcnpj,
        updates: {
          nome: formData.nome,
          whatsapp: formData.whatsapp
        }
      });
    } else {
      createMutation.mutate(clienteData);
    }
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setFormData({
      tipo: cliente.cpfcnpj.includes('/') ? 'PJ' : 'PF',
      nome: cliente.nome || '',
      cpfcnpj: cliente.cpfcnpj,
      whatsapp: cliente.whatsapp || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (cpfcnpj: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
      deleteMutation.mutate(cpfcnpj);
    }
  };

  const resetForm = () => {
    setFormData({ tipo: 'PF', nome: '', cpfcnpj: '', whatsapp: '' });
    setEditingCliente(null);
    setError('');
  };

  const getClienteType = (cpfcnpj: string) => {
    return cpfcnpj.includes('/') ? 'PJ' : 'PF';
  };

  const formatDocument = (doc: string) => {
    const tipo = getClienteType(doc);
    if (tipo === 'PF') {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar clientes: {fetchError.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gerencie informações dos seus clientes</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingCliente ? 'Edite as informações do cliente' : 'Adicione um novo cliente ao sistema'}
              </DialogDescription>
            </DialogHeader>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value: 'PF' | 'PJ') => setFormData(prev => ({ ...prev, tipo: value }))}
                  disabled={!!editingCliente}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PF">Pessoa Física</SelectItem>
                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">
                  {formData.tipo === 'PF' ? 'Nome' : 'Razão Social'}
                </Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder={formData.tipo === 'PF' ? 'João Silva' : 'Empresa ABC Ltda'}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpfcnpj">
                  {formData.tipo === 'PF' ? 'CPF' : 'CNPJ'}
                </Label>
                <Input
                  id="cpfcnpj"
                  value={formData.cpfcnpj}
                  onChange={(e) => setFormData(prev => ({ ...prev, cpfcnpj: e.target.value }))}
                  placeholder={formData.tipo === 'PF' ? '00000000000' : '00000000000000'}
                  disabled={!!editingCliente}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="5511999999999"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {editingCliente ? 'Atualizar' : 'Salvar'} Cliente
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pessoa Física</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clientes.filter(c => getClienteType(c.cpfcnpj) === 'PF').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pessoa Jurídica</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {clientes.filter(c => getClienteType(c.cpfcnpj) === 'PJ').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome/Razão Social</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Processos</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map((cliente) => {
                const tipo = getClienteType(cliente.cpfcnpj);
                return (
                  <TableRow key={cliente.cpfcnpj} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tipo === 'PF' ? (
                          <User className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Building className="h-4 w-4 text-gray-400" />
                        )}
                        <div>
                          <div className="font-medium">{cliente.nome}</div>
                          <div className="text-sm text-gray-500">
                            {tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatDocument(cliente.cpfcnpj)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {cliente.whatsapp || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        0 processos
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(cliente)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(cliente.cpfcnpj)}
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <Trash2 className="h-3 w-3 mr-1" />
                          )}
                          Excluir
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/processos/novo?cliente=${cliente.cpfcnpj}`}>
                            Criar Processo
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          
          {filteredClientes.length === 0 && !isLoading && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Nenhum cliente encontrado com este filtro.' : 'Nenhum cliente cadastrado ainda.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
