import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Search, 
  Plus, 
  Filter, 
  Users, 
  Phone,
  Mail,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { clientesApi, type Cliente } from '../lib/api';
import { useQuery } from '@tanstack/react-query';

export function Clientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 20;

  // Fetch clientes from Supabase
  const { 
    data: clientesData = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['clientes'],
    queryFn: clientesApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter data based on search
  const filteredClientes = clientesData.filter(cliente =>
    cliente.cpfcnpj.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.whatsapp?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalItems = filteredClientes.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Paginate filtered results
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedClientes = filteredClientes.slice(startIndex, endIndex);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const formatCpfCnpj = (cpfcnpj: string) => {
    // Remove any existing formatting
    const clean = cpfcnpj.replace(/\D/g, '');
    
    if (clean.length === 11) {
      // CPF format: 000.000.000-00
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (clean.length === 14) {
      // CNPJ format: 00.000.000/0000-00
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return cpfcnpj; // Return original if doesn't match expected lengths
  };

  const formatWhatsApp = (whatsapp?: string) => {
    if (!whatsapp) return '-';
    
    // Remove any existing formatting
    const clean = whatsapp.replace(/\D/g, '');
    
    if (clean.length === 11) {
      // Mobile format: (00) 00000-0000
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (clean.length === 10) {
      // Landline format: (00) 0000-0000
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    return whatsapp; // Return original if doesn't match expected lengths
  };

  const getClienteType = (cpfcnpj: string) => {
    const clean = cpfcnpj.replace(/\D/g, '');
    return clean.length === 11 ? 'Pessoa Física' : 'Pessoa Jurídica';
  };

  // Calculate stats from real data
  const stats = {
    total: clientesData.length,
    pessoaFisica: clientesData.filter(c => c.cpfcnpj.replace(/\D/g, '').length === 11).length,
    pessoaJuridica: clientesData.filter(c => c.cpfcnpj.replace(/\D/g, '').length === 14).length,
    comWhatsApp: clientesData.filter(c => c.whatsapp).length,
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold text-neutral-900">
              Clientes
            </h1>
            <p className="text-neutral-600 mt-1">
              Base de clientes e relacionamento
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Erro ao carregar clientes
              </h3>
              <p className="text-neutral-600 mb-4">
                {error.message || 'Erro desconhecido'}
              </p>
              <Button onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-neutral-900">
            Clientes
          </h1>
          <p className="text-neutral-600 mt-1">
            Base de clientes e relacionamento
          </p>
        </div>
        <Button className="btn-brand">
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-neutral-600">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-2xl font-semibold text-green-600">
                  {stats.pessoaFisica}
                </p>
                <p className="text-xs text-neutral-600">Pessoa Física</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-purple-500" />
              <div>
                <p className="text-2xl font-semibold text-purple-600">
                  {stats.pessoaJuridica}
                </p>
                <p className="text-xs text-neutral-600">Pessoa Jurídica</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-2xl font-semibold text-orange-600">
                  {stats.comWhatsApp}
                </p>
                <p className="text-xs text-neutral-600">Com WhatsApp</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Buscar por CPF/CNPJ, nome ou WhatsApp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Clientes ({totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              <span className="ml-2 text-neutral-600">Carregando clientes...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>CRM ID</TableHead>
                  <TableHead>Cadastrado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-neutral-500">
                        <Users className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                        <p>Nenhum cliente encontrado</p>
                        <p className="text-sm">Ajuste os filtros ou adicione um novo cliente</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedClientes.map((cliente) => (
                    <TableRow key={cliente.cpfcnpj} className="hover:bg-neutral-50 cursor-pointer">
                      <TableCell className="font-mono text-sm">
                        {formatCpfCnpj(cliente.cpfcnpj)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {cliente.nome || 'Nome não informado'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getClienteType(cliente.cpfcnpj) === 'Pessoa Física' ? 'default' : 'secondary'}
                        >
                          {getClienteType(cliente.cpfcnpj)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {cliente.whatsapp ? (
                            <>
                              <Phone className="w-4 h-4 text-green-500" />
                              <span className="text-sm">{formatWhatsApp(cliente.whatsapp)}</span>
                            </>
                          ) : (
                            <span className="text-neutral-400 text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {cliente.crm_id ? (
                          <span className="font-mono text-xs bg-neutral-100 px-2 py-1 rounded">
                            {cliente.crm_id}
                          </span>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-neutral-600">
                        {formatDate(cliente.created_at)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Ver detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} clientes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <span className="text-sm text-neutral-600">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
