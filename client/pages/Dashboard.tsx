import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Plus, Search, Filter, FileText, Clock, AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { FinancialWidget } from '../components/FinancialWidget';
import { processosApi } from '../lib/api';
import { useSupabaseQuery } from '../hooks/useSupabaseQuery';

interface ProcessoView {
  numero_cnj: string;
  cliente?: string;
  tribunal: string;
  fase: string;
  responsavel?: string;
  proximaAcao?: string;
  prazo?: string;
  status: 'ativo' | 'suspenso' | 'finalizado';
  risco: 'baixo' | 'medio' | 'alto';
}

export function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [riscoFilter, setRiscoFilter] = useState<string>('todos');

  // Fetch processos from Supabase
  const { data: processosData = [], isLoading, error } = useSupabaseQuery(
    ['processos'],
    processosApi.getAll
  );

  // Transform Supabase data to our view format
  const processos: ProcessoView[] = processosData.map(processo => {
    const cliente = processo.clientes_processos?.[0]?.clientes?.nome || 'Cliente não definido';
    const responsavel = processo.advogados_processos?.[0]?.advogados?.nome || 'Não definido';

    // Extract status and fase from data JSON field or set defaults
    const statusFromData = processo.data?.status || 'ativo';
    const faseFromData = processo.data?.fase || 'Em andamento';
    const riscoFromData = processo.data?.risco || 'medio';

    return {
      numero_cnj: processo.numero_cnj,
      cliente,
      tribunal: processo.tribunal_sigla || 'N/A',
      fase: faseFromData,
      responsavel,
      status: statusFromData as 'ativo' | 'suspenso' | 'finalizado',
      risco: riscoFromData as 'baixo' | 'medio' | 'alto',
      proximaAcao: processo.data?.proxima_acao,
      prazo: processo.data?.prazo
    };
  });

  const filteredProcessos = processos.filter(processo => {
    const matchesSearch = processo.numero_cnj.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         processo.cliente?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || processo.status === statusFilter;
    const matchesRisco = riscoFilter === 'todos' || processo.risco === riscoFilter;

    return matchesSearch && matchesStatus && matchesRisco;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'suspenso': return 'bg-yellow-100 text-yellow-800';
      case 'finalizado': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiscoColor = (risco: string) => {
    switch (risco) {
      case 'alto': return 'bg-red-100 text-red-800';
      case 'medio': return 'bg-yellow-100 text-yellow-800';
      case 'baixo': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isPrazoVencendo = (prazo?: string) => {
    if (!prazo) return false;
    const prazoDate = new Date(prazo);
    const hoje = new Date();
    const diasRestantes = Math.ceil((prazoDate.getTime() - hoje.getTime()) / (1000 * 3600 * 24));
    return diasRestantes <= 3 && diasRestantes >= 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar processos: {error.message}
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
          <h1 className="text-3xl font-bold text-gray-900">Processos</h1>
          <p className="text-gray-600 mt-1">Gerencie e acompanhe todos os processos</p>
        </div>
        <Button asChild>
          <Link to="/processos/novo">
            <Plus className="h-4 w-4 mr-2" />
            Novo Processo
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Processos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processos.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {processos.filter(p => p.status === 'ativo').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prazos Vencendo</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mockProcessos.filter(p => isPrazoVencendo(p.prazo)).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alto Risco</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {mockProcessos.filter(p => p.risco === 'alto').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content with Financial Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          {/* Filters */}
          <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por CNJ ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={riscoFilter} onValueChange={setRiscoFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Risco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Riscos</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                  <SelectItem value="medio">Médio</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº CNJ</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tribunal</TableHead>
                <TableHead>Fase</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Próxima Ação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProcessos.map((processo) => (
                <TableRow key={processo.numero_cnj} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <Link 
                      to={`/processos/${processo.numero_cnj}`}
                      className="text-primary hover:underline"
                    >
                      {processo.numero_cnj}
                    </Link>
                  </TableCell>
                  <TableCell>{processo.cliente}</TableCell>
                  <TableCell>{processo.tribunal}</TableCell>
                  <TableCell>{processo.fase}</TableCell>
                  <TableCell>{processo.responsavel}</TableCell>
                  <TableCell>
                    {processo.proximaAcao && (
                      <div className="flex items-center gap-2">
                        <span>{processo.proximaAcao}</span>
                        {processo.prazo && (
                          <div className={`flex items-center gap-1 text-xs ${
                            isPrazoVencendo(processo.prazo) ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {new Date(processo.prazo).toLocaleDateString('pt-BR')}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(processo.status)}>
                      {processo.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRiscoColor(processo.risco)}>
                      {processo.risco}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/processos/${processo.numero_cnj}`}>
                        Ver detalhes
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredProcessos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum processo encontrado com os filtros aplicados.
            </div>
          )}
        </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <FinancialWidget />
        </div>
      </div>
    </div>
  );
}
