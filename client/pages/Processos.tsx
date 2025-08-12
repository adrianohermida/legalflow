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
  FileText, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Mock data for demonstration
const mockProcessos = [
  {
    id: '1',
    numero_cnj: '1000123-45.2024.8.26.0001',
    titulo_polo_ativo: 'João Silva',
    titulo_polo_passivo: 'Empresa XYZ Ltda',
    status: 'ativo',
    fase: 'Petição inicial',
    risco: 'alto',
    proxima_acao: 'Contestação',
    prazo: '2024-02-15',
    tribunal: 'TJSP',
    updated_at: '2024-01-20T10:30:00Z'
  },
  {
    id: '2',
    numero_cnj: '2000456-78.2024.8.26.0002',
    titulo_polo_ativo: 'Empresa ABC Ltda',
    titulo_polo_passivo: 'Fornecedor DEF',
    status: 'ativo',
    fase: 'Instrução',
    risco: 'medio',
    proxima_acao: 'Audiência',
    prazo: '2024-02-20',
    tribunal: 'TJSP',
    updated_at: '2024-01-19T14:45:00Z'
  },
];

const statusConfig = {
  ativo: { label: 'Ativo', variant: 'default' as const, icon: CheckCircle },
  suspenso: { label: 'Suspenso', variant: 'secondary' as const, icon: Clock },
  arquivado: { label: 'Arquivado', variant: 'outline' as const, icon: FileText },
};

const riscoConfig = {
  alto: { label: 'Alto', variant: 'destructive' as const },
  medio: { label: 'Médio', variant: 'default' as const },
  baixo: { label: 'Baixo', variant: 'secondary' as const },
};

export function Processos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const itemsPerPage = 20;
  const totalItems = mockProcessos.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Filter data based on search
  const filteredProcessos = mockProcessos.filter(processo =>
    processo.numero_cnj.toLowerCase().includes(searchTerm.toLowerCase()) ||
    processo.titulo_polo_ativo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    processo.titulo_polo_passivo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // In real implementation, this would trigger API call
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-neutral-900">
            Processos
          </h1>
          <p className="text-neutral-600 mt-1">
            Gestão completa de processos jurídicos
          </p>
        </div>
        <Button className="btn-brand">
          <Plus className="w-4 h-4 mr-2" />
          Novo Processo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-2xl font-semibold">142</p>
                <p className="text-xs text-neutral-600">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-2xl font-semibold">128</p>
                <p className="text-xs text-neutral-600">Ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-2xl font-semibold">23</p>
                <p className="text-xs text-neutral-600">Prazos esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-2xl font-semibold">8</p>
                <p className="text-xs text-neutral-600">Alto risco</p>
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
                placeholder="Buscar por CNJ, parte ativa ou passiva..."
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

      {/* Processes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Processos ({filteredProcessos.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número CNJ</TableHead>
                <TableHead>Partes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Próxima Ação</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProcessos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-neutral-500">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                      <p>Nenhum processo encontrado</p>
                      <p className="text-sm">Ajuste os filtros ou adicione um novo processo</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProcessos.map((processo) => {
                  const StatusIcon = statusConfig[processo.status as keyof typeof statusConfig]?.icon || FileText;
                  return (
                    <TableRow key={processo.id} className="hover:bg-neutral-50 cursor-pointer">
                      <TableCell className="font-mono text-sm">
                        {processo.numero_cnj}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">
                            {processo.titulo_polo_ativo}
                          </div>
                          <div className="text-xs text-neutral-600">
                            vs {processo.titulo_polo_passivo}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusConfig[processo.status as keyof typeof statusConfig]?.variant}
                          className="flex items-center gap-1 w-fit"
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig[processo.status as keyof typeof statusConfig]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{processo.fase}</TableCell>
                      <TableCell>
                        <Badge variant={riscoConfig[processo.risco as keyof typeof riscoConfig]?.variant}>
                          {riscoConfig[processo.risco as keyof typeof riscoConfig]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{processo.proxima_acao}</TableCell>
                      <TableCell className="text-sm">{formatDate(processo.prazo)}</TableCell>
                      <TableCell className="text-sm text-neutral-600">
                        {formatDate(processo.updated_at)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} de {totalItems} processos
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
