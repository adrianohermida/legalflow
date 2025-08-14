import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  CheckCircle,
  Filter,
  Download,
  Search,
  Calendar
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { lf } from '../lib/supabase';

interface TicketMetric {
  ticket_id: string;
  title: string;
  status: string;
  priority: string;
  group_key: string;
  cliente_cpfcnpj: string;
  created_at: string;
  frt_minutes: number;
  ttr_minutes: number;
  frt_violated: boolean;
  ttr_violated: boolean;
  frt_due_at: string;
  ttr_due_at: string;
  assigned_to: string;
}

const SLATicketsReport: React.FC = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    group_key: 'all',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['sla-tickets-report', filters, currentPage],
    queryFn: async (): Promise<{ data: TicketMetric[]; total: number }> => {
      let query = lf
        .from('vw_ticket_metrics')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters.priority !== 'all') {
        query = query.eq('priority', filters.priority);
      }
      if (filters.group_key !== 'all') {
        query = query.eq('group_key', filters.group_key);
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,cliente_cpfcnpj.ilike.%${filters.search}%`);
      }

      // Pagination
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;

      return {
        data: data || [],
        total: count || 0
      };
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgente': return 'bg-red-100 text-red-800 border-red-300';
      case 'alta': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'baixa': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800 border-green-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'open': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'closed': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-neutral-100 text-neutral-800 border-neutral-300';
    }
  };

  const formatMinutes = (minutes: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPages = Math.ceil((tickets?.total || 0) / itemsPerPage);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/relatorios')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar aos Relatórios
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">SLA Tickets</h1>
            <p className="text-neutral-600">Análise detalhada de FRT/TTR por ticket</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  placeholder="Título ou cliente..."
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <Select value={filters.priority} onValueChange={(value) => setFilters({...filters, priority: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Área</label>
              <Select value={filters.group_key} onValueChange={(value) => setFilters({...filters, group_key: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Trabalhista">Trabalhista</SelectItem>
                  <SelectItem value="Civil">Civil</SelectItem>
                  <SelectItem value="Criminal">Criminal</SelectItem>
                  <SelectItem value="Empresarial">Empresarial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Tickets ({tickets?.total || 0} encontrados)
            </CardTitle>
            <div className="text-sm text-neutral-600">
              Página {currentPage} de {totalPages}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-neutral-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>FRT</TableHead>
                    <TableHead>TTR</TableHead>
                    <TableHead>Violações</TableHead>
                    <TableHead>Criado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets?.data.map((ticket) => (
                    <TableRow key={ticket.ticket_id} className="hover:bg-neutral-50">
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-neutral-900 text-sm">
                            {ticket.title || `Ticket ${ticket.ticket_id.slice(0, 8)}`}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {ticket.cliente_cpfcnpj}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(ticket.status)}>
                          {ticket.status === 'open' ? 'Aberto' :
                           ticket.status === 'in_progress' ? 'Em Andamento' :
                           ticket.status === 'resolved' ? 'Resolvido' :
                           ticket.status === 'closed' ? 'Fechado' : ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority === 'baixa' ? 'Baixa' :
                           ticket.priority === 'normal' ? 'Normal' :
                           ticket.priority === 'alta' ? 'Alta' :
                           ticket.priority === 'urgente' ? 'Urgente' : ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-neutral-600">
                          {ticket.group_key || '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">
                            {formatMinutes(ticket.frt_minutes)}
                          </span>
                          {ticket.frt_violated && (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono">
                            {formatMinutes(ticket.ttr_minutes)}
                          </span>
                          {ticket.ttr_violated && (
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {ticket.frt_violated && (
                            <Badge variant="destructive" className="text-xs">FRT</Badge>
                          )}
                          {ticket.ttr_violated && (
                            <Badge variant="destructive" className="text-xs">TTR</Badge>
                          )}
                          {!ticket.frt_violated && !ticket.ttr_violated && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-neutral-600">
                          {formatDateTime(ticket.created_at)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-neutral-600">
                    Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, tickets?.total || 0)} de {tickets?.total || 0} tickets
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center px-3 text-sm">
                      {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      Próximo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SLATicketsReport;
