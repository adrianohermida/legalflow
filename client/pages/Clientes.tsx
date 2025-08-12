import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import { Plus, Search, User, Building, Phone, FileText } from 'lucide-react';

interface Cliente {
  id: string;
  cpfcnpj: string;
  nome: string;
  whatsapp: string;
  tipo: 'PF' | 'PJ';
  processos: number;
}

const mockClientes: Cliente[] = [
  {
    id: '1',
    cpfcnpj: '123.456.789-00',
    nome: 'João Silva',
    whatsapp: '(11) 99999-9999',
    tipo: 'PF',
    processos: 2
  },
  {
    id: '2',
    cpfcnpj: '12.345.678/0001-90',
    nome: 'Empresa ABC Ltda',
    whatsapp: '(11) 88888-8888',
    tipo: 'PJ',
    processos: 1
  },
  {
    id: '3',
    cpfcnpj: '987.654.321-00',
    nome: 'Maria Oliveira',
    whatsapp: '(11) 77777-7777',
    tipo: 'PF',
    processos: 1
  }
];

export function Clientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo: 'PF' as 'PF' | 'PJ',
    nome: '',
    cpfcnpj: '',
    whatsapp: ''
  });

  const filteredClientes = mockClientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cpfcnpj.includes(searchTerm)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In real app, would save to Supabase
    console.log('Novo cliente:', formData);
    setIsDialogOpen(false);
    setFormData({ tipo: 'PF', nome: '', cpfcnpj: '', whatsapp: '' });
  };

  const formatDocument = (doc: string, tipo: 'PF' | 'PJ') => {
    if (tipo === 'PF') {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gerencie informações dos seus clientes</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Novo Cliente</DialogTitle>
              <DialogDescription>
                Adicione um novo cliente ao sistema
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo</Label>
                <Select 
                  value={formData.tipo} 
                  onValueChange={(value: 'PF' | 'PJ') => setFormData(prev => ({ ...prev, tipo: value }))}
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
                  placeholder={formData.tipo === 'PF' ? '000.000.000-00' : '00.000.000/0000-00'}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                  placeholder="(11) 99999-9999"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Salvar Cliente
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
            <div className="text-2xl font-bold">{mockClientes.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pessoa Física</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mockClientes.filter(c => c.tipo === 'PF').length}
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
              {mockClientes.filter(c => c.tipo === 'PJ').length}
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
              {filteredClientes.map((cliente) => (
                <TableRow key={cliente.id} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {cliente.tipo === 'PF' ? (
                        <User className="h-4 w-4 text-gray-400" />
                      ) : (
                        <Building className="h-4 w-4 text-gray-400" />
                      )}
                      <div>
                        <div className="font-medium">{cliente.nome}</div>
                        <div className="text-sm text-gray-500">
                          {cliente.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatDocument(cliente.cpfcnpj, cliente.tipo)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      {cliente.whatsapp}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      {cliente.processos} processo{cliente.processos !== 1 ? 's' : ''}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/processos/novo?cliente=${cliente.id}`}>
                          Criar Processo
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredClientes.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum cliente encontrado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
