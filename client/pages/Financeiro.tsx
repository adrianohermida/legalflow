import React, { useState } from "react";
import {
  DollarSign,
  TrendingUp,
  Plus,
  Calendar,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Receipt,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Loader2,
  Clock,
  Users,
  FileText,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Label } from "../components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf, supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { cn } from "../lib/utils";

interface PlanoPagamento {
  id: string;
  cliente_cpfcnpj: string;
  processo_numero_cnj: string | null;
  amount_total: number;
  installments: number;
  paid_amount: number;
  status: string;
  created_at: string;
  cliente_nome?: string;
  parcelas?: ParcelaPagamento[];
}

interface ParcelaPagamento {
  id: string;
  plano_id: string;
  n_parcela: number;
  due_date: string;
  amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface PlanoFormData {
  cliente_cpfcnpj: string;
  processo_numero_cnj: string;
  amount_total: number;
  installments: number;
}

export function Financeiro() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlano, setEditingPlano] = useState<PlanoPagamento | null>(null);
  const [selectedPlano, setSelectedPlano] = useState<PlanoPagamento | null>(
    null,
  );
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const itemsPerPage = 20;

  // P2.x - Buscar planos de pagamento
  const {
    data: planosData = { data: [], total: 0, totalPages: 0 },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["planos-pagamento", searchTerm, filterStatus, currentPage],
    queryFn: async () => {
      let query = lf
        .from("planos_pagamento")
        .select(
          `
          *,
          clientes:public.clientes!planos_pagamento_cliente_cpfcnpj_fkey (
            nome
          )
        `,
          { count: "exact" },
        )
        .order("created_at", { ascending: false });

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(
          `cliente_cpfcnpj.ilike.%${searchTerm}%,processo_numero_cnj.ilike.%${searchTerm}%`,
        );
      }

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }

      // Paginação
      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      const totalPages = Math.ceil((count || 0) / itemsPerPage);

      return {
        data:
          data?.map((plano) => ({
            ...plano,
            cliente_nome: plano.clientes?.[0]?.nome,
          })) || [],
        total: count || 0,
        totalPages,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Buscar clientes para o formulário
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("cpfcnpj, nome")
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  // Buscar processos para o formulário
  const { data: processos = [] } = useQuery({
    queryKey: ["processos-financeiro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("numero_cnj, titulo_polo_ativo")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Buscar parcelas do plano selecionado
  const { data: parcelas = [] } = useQuery({
    queryKey: ["parcelas-pagamento", selectedPlano?.id],
    queryFn: async () => {
      if (!selectedPlano?.id) return [];

      const { data, error } = await lf
        .from("parcelas_pagamento")
        .select("*")
        .eq("plano_id", selectedPlano.id)
        .order("n_parcela", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedPlano?.id,
  });

  // P2.x - Mutation para criar/editar plano
  const planoMutation = useMutation({
    mutationFn: async (planoData: PlanoFormData) => {
      const dataToSave = {
        cliente_cpfcnpj: planoData.cliente_cpfcnpj,
        processo_numero_cnj: planoData.processo_numero_cnj || null,
        amount_total: planoData.amount_total,
        installments: planoData.installments,
        paid_amount: 0,
        status: "pendente",
      };

      const { data, error } = editingPlano
        ? await lf
            .from("planos_pagamento")
            .update(dataToSave)
            .eq("id", editingPlano.id)
            .select()
        : await lf.from("planos_pagamento").insert([dataToSave]).select();

      if (error) throw error;

      // Se for novo plano, criar parcelas
      if (!editingPlano && data?.[0]) {
        const planoId = data[0].id;
        const amountPerInstallment =
          planoData.amount_total / planoData.installments;

        const parcelas = Array.from(
          { length: planoData.installments },
          (_, index) => {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + index + 1);

            return {
              plano_id: planoId,
              n_parcela: index + 1,
              due_date: dueDate.toISOString().split("T")[0],
              amount: amountPerInstallment,
              status: "pendente",
            };
          },
        );

        const { error: parcelasError } = await lf
          .from("parcelas_pagamento")
          .insert(parcelas);

        if (parcelasError) throw parcelasError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planos-pagamento"] });
      setIsDialogOpen(false);
      setEditingPlano(null);
      toast({
        title: editingPlano ? "Plano atualizado" : "Plano criado",
        description: editingPlano
          ? "Plano de pagamento atualizado com sucesso"
          : "Novo plano de pagamento criado",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar plano",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar status de parcela
  const parcelaMutation = useMutation({
    mutationFn: async ({
      parcelaId,
      status,
    }: {
      parcelaId: string;
      status: string;
    }) => {
      const updateData: any = { status };
      if (status === "pago") {
        updateData.paid_at = new Date().toISOString();
      }

      const { data, error } = await lf
        .from("parcelas_pagamento")
        .update(updateData)
        .eq("id", parcelaId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parcelas-pagamento"] });
      queryClient.invalidateQueries({ queryKey: ["planos-pagamento"] });
      toast({
        title: "Parcela atualizada",
        description: "Status da parcela atualizado com sucesso",
      });
    },
  });

  const handleSubmitPlano = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const planoData: PlanoFormData = {
      cliente_cpfcnpj: formData.get("cliente_cpfcnpj") as string,
      processo_numero_cnj: formData.get("processo_numero_cnj") as string,
      amount_total: parseFloat(formData.get("amount_total") as string),
      installments: parseInt(formData.get("installments") as string),
    };

    planoMutation.mutate(planoData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "bg-yellow-100 text-yellow-800";
      case "pago":
        return "bg-green-100 text-green-800";
      case "vencido":
        return "bg-red-100 text-red-800";
      case "cancelado":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pendente":
        return <Clock className="w-4 h-4" />;
      case "pago":
        return <CheckCircle className="w-4 h-4" />;
      case "vencido":
        return <AlertCircle className="w-4 h-4" />;
      case "cancelado":
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const calculateOverallStats = () => {
    const total = planosData.data.reduce((sum, p) => sum + p.amount_total, 0);
    const pago = planosData.data.reduce((sum, p) => sum + p.paid_amount, 0);
    const pendente = total - pago;

    return { total, pago, pendente };
  };

  const stats = calculateOverallStats();

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold">Financeiro</h1>
            <p className="text-neutral-600 mt-1">
              Gestão financeira e faturamento
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Erro ao carregar dados financeiros
              </h3>
              <p className="text-neutral-600 mb-4">{error.message}</p>
              <Button onClick={() => refetch()}>Tentar novamente</Button>
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
          <h1 className="text-2xl font-heading font-semibold">Financeiro</h1>
          <p className="text-neutral-600 mt-1">
            Gestão financeira e faturamento
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              style={{ backgroundColor: "var(--brand-700)", color: "white" }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Plano de Pagamento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmitPlano}>
              <DialogHeader>
                <DialogTitle>
                  {editingPlano ? "Editar Plano" : "Novo Plano de Pagamento"}
                </DialogTitle>
                <DialogDescription>
                  {editingPlano
                    ? "Atualize as informações do plano de pagamento"
                    : "Crie um novo plano de pagamento para o cliente"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Cliente *</Label>
                  <Select
                    name="cliente_cpfcnpj"
                    defaultValue={editingPlano?.cliente_cpfcnpj}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((cliente) => (
                        <SelectItem
                          key={cliente.cpfcnpj}
                          value={cliente.cpfcnpj}
                        >
                          {cliente.nome} ({cliente.cpfcnpj})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Processo (opcional)</Label>
                  <Select
                    name="processo_numero_cnj"
                    defaultValue={editingPlano?.processo_numero_cnj || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o processo (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Nenhum processo</SelectItem>
                      {processos.map((processo) => (
                        <SelectItem
                          key={processo.numero_cnj}
                          value={processo.numero_cnj}
                        >
                          {processo.numero_cnj} - {processo.titulo_polo_ativo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valor Total *</Label>
                  <Input
                    name="amount_total"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    defaultValue={editingPlano?.amount_total}
                    required
                  />
                </div>
                <div>
                  <Label>Número de Parcelas *</Label>
                  <Select
                    name="installments"
                    defaultValue={editingPlano?.installments?.toString()}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(
                        (num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}x
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={planoMutation.isPending}
                  style={{
                    backgroundColor: "var(--brand-700)",
                    color: "white",
                  }}
                >
                  {planoMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : editingPlano ? (
                    "Atualizar"
                  ) : (
                    "Criar Plano"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total a Receber
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total de todos os planos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recebido</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.pago)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0
                ? `${((stats.pago / stats.total) * 100).toFixed(1)}%`
                : "0%"}{" "}
              do total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendente</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency(stats.pendente)}
            </div>
            <p className="text-xs text-muted-foreground">
              Aguardando pagamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <Input
                  placeholder="Buscar por cliente ou processo..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filterStatus}
              onValueChange={(value) => {
                setFilterStatus(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="pago">Pago</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Planos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Planos de Pagamento</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Carregando planos...</p>
            </div>
          ) : planosData.data.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-600 mb-2">
                Nenhum plano encontrado
              </h3>
              <p className="text-neutral-500">
                {searchTerm || filterStatus !== "todos"
                  ? "Tente ajustar os filtros de busca"
                  : "Crie o primeiro plano de pagamento"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Processo</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Parcelas</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {planosData.data.map((plano) => (
                  <TableRow key={plano.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plano.cliente_nome}</div>
                        <div className="text-sm text-neutral-500">
                          {plano.cliente_cpfcnpj}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {plano.processo_numero_cnj || (
                        <span className="text-neutral-400">Sem processo</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(plano.amount_total)}
                    </TableCell>
                    <TableCell>{plano.installments}x</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {formatCurrency(plano.paid_amount)}
                        </div>
                        <div className="text-sm text-neutral-500">
                          {(
                            (plano.paid_amount / plano.amount_total) *
                            100
                          ).toFixed(1)}
                          %
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn("text-xs", getStatusColor(plano.status))}
                      >
                        <div className="flex items-center gap-1">
                          {getStatusIcon(plano.status)}
                          {plano.status}
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(plano.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPlano(plano);
                            setIsDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingPlano(plano);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {planosData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
            {Math.min(currentPage * itemsPerPage, planosData.total)} de{" "}
            {planosData.total} resultados
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Anterior
            </Button>
            <span className="text-sm px-3 py-1 bg-neutral-100 rounded">
              {currentPage} de {planosData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === planosData.totalPages}
            >
              Próximo
            </Button>
          </div>
        </div>
      )}

      {/* Plano Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Detalhes do Plano de Pagamento
            </DialogTitle>
          </DialogHeader>

          {selectedPlano && (
            <div className="space-y-6">
              {/* Plano Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-lg">
                <div>
                  <span className="text-sm text-neutral-600">Cliente:</span>
                  <p className="font-medium">{selectedPlano.cliente_nome}</p>
                </div>
                <div>
                  <span className="text-sm text-neutral-600">CPF/CNPJ:</span>
                  <p className="font-medium">{selectedPlano.cliente_cpfcnpj}</p>
                </div>
                <div>
                  <span className="text-sm text-neutral-600">Valor Total:</span>
                  <p className="font-medium text-lg">
                    {formatCurrency(selectedPlano.amount_total)}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-neutral-600">Status:</span>
                  <Badge
                    className={cn(
                      "text-xs",
                      getStatusColor(selectedPlano.status),
                    )}
                  >
                    {selectedPlano.status}
                  </Badge>
                </div>
              </div>

              {/* Parcelas */}
              <div>
                <h4 className="text-lg font-medium mb-4">
                  Parcelas ({parcelas.length})
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parcela</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Pago em</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parcelas.map((parcela) => (
                      <TableRow key={parcela.id}>
                        <TableCell>
                          {parcela.n_parcela}/{selectedPlano.installments}
                        </TableCell>
                        <TableCell>{formatDate(parcela.due_date)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(parcela.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-xs",
                              getStatusColor(parcela.status),
                            )}
                          >
                            {parcela.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {parcela.paid_at ? formatDate(parcela.paid_at) : "-"}
                        </TableCell>
                        <TableCell>
                          {parcela.status === "pendente" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                parcelaMutation.mutate({
                                  parcelaId: parcela.id,
                                  status: "pago",
                                })
                              }
                              disabled={parcelaMutation.isPending}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Marcar como Pago
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
