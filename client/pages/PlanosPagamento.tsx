import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Progress } from '../components/ui/progress';
import { 
  Search, 
  Plus, 
  DollarSign, 
  Calendar, 
  CreditCard,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  FileText,
  Settings
} from 'lucide-react';
import { PlanoPagamento, ParcelaPagamento } from '../types/financial';

// Mock data for payment plans
const mockPlanos: PlanoPagamento[] = [
  {
    id: '1',
    cliente_cpfcnpj: '123.456.789-00',
    cliente_nome: 'João Silva',
    processo_numero_cnj: '1000123-45.2024.8.26.0001',
    processo_titulo: 'Ação Trabalhista',
    journey_instance_id: '1',
    journey_template_name: 'Onboarding Trabalhista',
    amount_total: 15000,
    installments: 5,
    status: 'ativo',
    created_at: '2024-01-15',
    created_by_oab: '123456/SP',
    parcelas: [
      { id: '1', plano_id: '1', sequence_number: 1, due_date: '2024-02-15', amount: 3000, status: 'paga', paid_at: '2024-02-14', payment_method: 'PIX' },
      { id: '2', plano_id: '1', sequence_number: 2, due_date: '2024-03-15', amount: 3000, status: 'paga', paid_at: '2024-03-10', payment_method: 'TED' },
      { id: '3', plano_id: '1', sequence_number: 3, due_date: '2024-04-15', amount: 3000, status: 'pendente', triggered_by_stage_id: 'stage-2' },
      { id: '4', plano_id: '1', sequence_number: 4, due_date: '2024-05-15', amount: 3000, status: 'pendente' },
      { id: '5', plano_id: '1', sequence_number: 5, due_date: '2024-06-15', amount: 3000, status: 'pendente' }
    ],
    payment_links: [
      { id: '1', plano_id: '1', stage_template_id: 'stage-2', stage_name: 'Análise Concluída', rule: 'activate_installment', days_after_completion: 7 },
      { id: '2', plano_id: '1', stage_template_id: 'stage-4', stage_name: 'Petição Protocolada', rule: 'create_installment', installment_amount: 2000 }
    ]
  },
  {
    id: '2',
    cliente_cpfcnpj: '987.654.321-00',
    cliente_nome: 'Maria Oliveira',
    processo_numero_cnj: '3000789-01.2024.8.26.0003',
    processo_titulo: 'Divórcio Consensual',
    journey_instance_id: '2',
    journey_template_name: 'Divórcio Consensual',
    amount_total: 8000,
    installments: 3,
    status: 'inadimplente',
    created_at: '2024-01-20',
    created_by_oab: '123456/SP',
    parcelas: [
      { id: '6', plano_id: '2', sequence_number: 1, due_date: '2024-02-20', amount: 3000, status: 'paga', paid_at: '2024-02-18', payment_method: 'PIX' },
      { id: '7', plano_id: '2', sequence_number: 2, due_date: '2024-03-20', amount: 2500, status: 'vencida' },
      { id: '8', plano_id: '2', sequence_number: 3, due_date: '2024-04-20', amount: 2500, status: 'pendente' }
    ],
    payment_links: []
  },
  {
    id: '3',
    cliente_cpfcnpj: '12.345.678/0001-90',
    cliente_nome: 'Empresa ABC Ltda',
    amount_total: 25000,
    installments: 10,
    status: 'ativo',
    created_at: '2024-02-01',
    created_by_oab: '789012/SP',
    parcelas: [
      { id: '9', plano_id: '3', sequence_number: 1, due_date: '2024-03-01', amount: 5000, status: 'paga', paid_at: '2024-02-28', payment_method: 'Boleto' },
      { id: '10', plano_id: '3', sequence_number: 2, due_date: '2024-04-01', amount: 2500, status: 'pendente' }
    ],
    payment_links: []
  }
];

export function PlanosPagamento() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [selectedPlano, setSelectedPlano] = useState<PlanoPagamento | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const filteredPlanos = mockPlanos.filter(plano => {
    const matchesSearch = plano.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plano.cliente_cpfcnpj.includes(searchTerm) ||
                         (plano.processo_numero_cnj && plano.processo_numero_cnj.includes(searchTerm));
    const matchesStatus = statusFilter === 'todos' || plano.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ativo': return 'bg-green-100 text-green-800';
      case 'concluido': return 'bg-blue-100 text-blue-800';
      case 'inadimplente': return 'bg-red-100 text-red-800';
      case 'pausado': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getParcelaStatusColor = (status: string) => {
    switch (status) {
      case 'paga': return 'bg-green-100 text-green-800';
      case 'pendente': return 'bg-yellow-100 text-yellow-800';
      case 'vencida': return 'bg-red-100 text-red-800';
      case 'cancelada': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getParcelaStatusIcon = (status: string) => {
    switch (status) {
      case 'paga': return <CheckCircle className="h-3 w-3" />;
      case 'pendente': return <Clock className="h-3 w-3" />;
      case 'vencida': return <AlertTriangle className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const calculateProgress = (plano: PlanoPagamento) => {
    const pagas = plano.parcelas.filter(p => p.status === 'paga').length;
    return (pagas / plano.installments) * 100;
  };

  const calculateTotalPaid = (plano: PlanoPagamento) => {
    return plano.parcelas
      .filter(p => p.status === 'paga')
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const handleViewDetails = (plano: PlanoPagamento) => {
    setSelectedPlano(plano);
    setIsDetailModalOpen(true);
  };

  // Calculate totals for stats
  const totalPlanos = mockPlanos.length;
  const planosAtivos = mockPlanos.filter(p => p.status === 'ativo').length;
  const totalReceita = mockPlanos.reduce((sum, p) => sum + calculateTotalPaid(p), 0);
  const valorVencido = mockPlanos.reduce((sum, p) => {
    const vencidas = p.parcelas.filter(parcela => parcela.status === 'vencida');
    return sum + vencidas.reduce((subSum, v) => subSum + v.amount, 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Planos de Pagamento</h1>
          <p className="text-gray-600 mt-1">
            Gerencie planos vinculados às jornadas e marcos dos processos
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Planos</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlanos}</div>
            <p className="text-xs text-muted-foreground">
              {planosAtivos} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Recebida</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalReceita)}
            </div>
            <p className="text-xs text-muted-foreground">
              Parcelas pagas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valores Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(valorVencido)}
            </div>
            <p className="text-xs text-muted-foreground">
              Parcelas em atraso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Cobrança</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {Math.round((totalReceita / (totalReceita + valorVencido)) * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Eficiência de cobrança
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por cliente, CPF/CNPJ ou CNJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inadimplente">Inadimplente</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="pausado">Pausado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Planos de Pagamento</CardTitle>
          <CardDescription>
            Lista de todos os planos com suas parcelas e vinculações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Processo/Jornada</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Progresso</TableHead>
                <TableHead>Próximo Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlanos.map((plano) => {
                const progress = calculateProgress(plano);
                const totalPaid = calculateTotalPaid(plano);
                const nextParcela = plano.parcelas.find(p => p.status === 'pendente' || p.status === 'vencida');

                return (
                  <TableRow key={plano.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{plano.cliente_nome}</div>
                        <div className="text-sm text-gray-500">{plano.cliente_cpfcnpj}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        {plano.processo_numero_cnj && (
                          <div className="font-mono text-sm">{plano.processo_numero_cnj}</div>
                        )}
                        {plano.journey_template_name && (
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {plano.journey_template_name}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{formatCurrency(plano.amount_total)}</div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(totalPaid)} pago
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="w-24">
                        <Progress value={progress} className="h-2" />
                        <div className="text-xs text-gray-500 mt-1">
                          {Math.round(progress)}% ({plano.parcelas.filter(p => p.status === 'paga').length}/{plano.installments})
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {nextParcela ? (
                        <div>
                          <div className="text-sm">{new Date(nextParcela.due_date).toLocaleDateString('pt-BR')}</div>
                          <div className="text-sm font-medium">{formatCurrency(nextParcela.amount)}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(plano.status)}>
                        {plano.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleViewDetails(plano)}
                        >
                          Ver Detalhes
                        </Button>
                        <Button size="sm" variant="outline">
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredPlanos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum plano de pagamento encontrado.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Plano de Pagamento</DialogTitle>
            <DialogDescription>
              {selectedPlano?.cliente_nome} - {formatCurrency(selectedPlano?.amount_total || 0)}
            </DialogDescription>
          </DialogHeader>

          {selectedPlano && (
            <div className="space-y-6">
              {/* Plan Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-600">Status</h4>
                  <Badge className={getStatusColor(selectedPlano.status)}>
                    {selectedPlano.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600">Progresso</h4>
                  <p className="font-medium">{Math.round(calculateProgress(selectedPlano))}% pago</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600">Total Recebido</h4>
                  <p className="font-medium text-green-600">{formatCurrency(calculateTotalPaid(selectedPlano))}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-600">Saldo Restante</h4>
                  <p className="font-medium">{formatCurrency(selectedPlano.amount_total - calculateTotalPaid(selectedPlano))}</p>
                </div>
              </div>

              {/* Parcelas */}
              <div>
                <h3 className="text-lg font-medium mb-4">Parcelas</h3>
                <div className="space-y-2">
                  {selectedPlano.parcelas.map((parcela) => (
                    <div key={parcela.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium">
                          {parcela.sequence_number}
                        </div>
                        <div>
                          <div className="font-medium">{formatCurrency(parcela.amount)}</div>
                          <div className="text-sm text-gray-500">
                            Vencimento: {new Date(parcela.due_date).toLocaleDateString('pt-BR')}
                          </div>
                          {parcela.paid_at && (
                            <div className="text-sm text-green-600">
                              Pago em: {new Date(parcela.paid_at).toLocaleDateString('pt-BR')} via {parcela.payment_method}
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge className={getParcelaStatusColor(parcela.status)}>
                        {getParcelaStatusIcon(parcela.status)}
                        <span className="ml-1 capitalize">{parcela.status}</span>
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Links (Milestones) */}
              {selectedPlano.payment_links.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-4">Marcos de Pagamento</h3>
                  <div className="space-y-2">
                    {selectedPlano.payment_links.map((link) => (
                      <div key={link.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                        <Target className="h-4 w-4 text-blue-600" />
                        <div className="flex-1">
                          <div className="font-medium">{link.stage_name}</div>
                          <div className="text-sm text-gray-600">
                            {link.rule === 'create_installment' && `Cria parcela de ${formatCurrency(link.installment_amount || 0)}`}
                            {link.rule === 'activate_installment' && `Ativa próxima parcela após ${link.days_after_completion} dias`}
                            {link.rule === 'send_notification' && 'Envia notificação de cobrança'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
