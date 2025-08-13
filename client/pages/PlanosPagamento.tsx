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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Search, 
  Plus, 
  Filter, 
  DollarSign, 
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye
} from 'lucide-react';
import { planosPagamentoApi, crossSchemaApi, type PlanoPagamento } from '../lib/api';
import { useQuery } from '@tanstack/react-query';

const statusConfig = {
  active: { label: 'Ativo', variant: 'default' as const, icon: CheckCircle },
  completed: { label: 'Concluído', variant: 'secondary' as const, icon: CheckCircle },
  cancelled: { label: 'Cancelado', variant: 'destructive' as const, icon: AlertTriangle },
  suspended: { label: 'Suspenso', variant: 'outline' as const, icon: Clock },
};

export function PlanosPagamento() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 20;

  // Fetch planos from LegalFlow schema with client data
  const { 
    data: planosData = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['planos-pagamento'],
    queryFn: crossSchemaApi.getPlanosPagamentoWithClientes,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter data based on search and status
  const filteredPlanos = planosData.filter(plano => {
    const matchesSearch = 
      plano.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plano.cliente_cpfcnpj.includes(searchTerm) ||
      plano.id.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'todos' || plano.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const totalItems = filteredPlanos.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Paginate filtered results
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPlanos = filteredPlanos.slice(startIndex, endIndex);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatCpfCnpj = (cpfcnpj: string) => {
    const clean = cpfcnpj.replace(/\D/g, '');
    
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (clean.length === 14) {
      return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return cpfcnpj;
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate stats from real data
  const stats = {
    total: planosData.length,
    ativos: planosData.filter(p => p.status === 'active').length,
    valorTotal: planosData.reduce((sum, p) => sum + p.amount_total, 0),
    valorPago: planosData.reduce((sum, p) => sum + p.paid_amount, 0),
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold text-neutral-900">
              Planos de Pagamento
            </h1>
            <p className="text-neutral-600 mt-1">
              Gestão de planos de pagamento
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Erro ao carregar planos de pagamento
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
            Planos de Pagamento
          </h1>
          <p className="text-neutral-600 mt-1">
            Gestão de planos de pagamento
          </p>
        </div>
        <Button className="btn-brand">
          <Plus className="w-4 h-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-brand-700" />
              <div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-neutral-600">Total de Planos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-success" />
              <div>
                <p className="text-2xl font-semibold text-success">
                  {stats.ativos}
                </p>
                <p className="text-xs text-neutral-600">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-brand-700" />
              <div>
                <p className="text-lg font-semibold text-brand-700">
                  {formatCurrency(stats.valorTotal)}
                </p>
                <p className="text-xs text-neutral-600">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-warning" />
              <div>
                <p className="text-lg font-semibold text-warning">
                  {formatCurrency(stats.valorPago)}
                </p>
                <p className="text-xs text-neutral-600">Valor Pago</p>
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
                placeholder="Buscar por cliente, CPF/CNPJ ou ID do plano..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Planos de Pagamento ({totalItems})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              <span className="ml-2 text-neutral-600">Carregando planos...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Valor Pago</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPlanos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="text-neutral-500">
                        <DollarSign className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                        <p>Nenhum plano de pagamento encontrado</p>
                        <p className="text-sm">Ajuste os filtros ou crie um novo plano</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPlanos.map((plano: any) => {
                    const StatusIcon = statusConfig[plano.status as keyof typeof statusConfig]?.icon || CheckCircle;
                    const progressPct = (plano.paid_amount / plano.amount_total) * 100;
                    
                    return (
                      <TableRow key={plano.id} className="hover:bg-neutral-50 cursor-pointer">
                        <TableCell className="font-mono text-xs">
                          {plano.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {plano.cliente?.nome || 'Nome não informado'}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatCpfCnpj(plano.cliente_cpfcnpj)}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(plano.amount_total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {plano.installments}x
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {formatCurrency(plano.paid_amount)}
                            </div>
                            <div className="w-full bg-neutral-200 rounded-full h-1.5">
                              <div 
                                className="bg-success h-1.5 rounded-full transition-all"
                                style={{ width: `${Math.min(progressPct, 100)}%` }}
                              />
                            </div>
                            <div className="text-xs text-neutral-600">
                              {progressPct.toFixed(1)}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={statusConfig[plano.status as keyof typeof statusConfig]?.variant}
                            className="flex items-center gap-1 w-fit"
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConfig[plano.status as keyof typeof statusConfig]?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-neutral-600">
                          {formatDate(plano.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Ver detalhes
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
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
            Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de {totalItems} planos
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
