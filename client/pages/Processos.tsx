import React, { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
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
  ChevronRight,
  Loader2,
} from "lucide-react";
import { processosApi, type Processo } from "../lib/api";
import { useQuery } from "@tanstack/react-query";

const statusConfig = {
  ativo: { label: "Ativo", variant: "default" as const, icon: CheckCircle },
  suspenso: { label: "Suspenso", variant: "secondary" as const, icon: Clock },
  arquivado: {
    label: "Arquivado",
    variant: "outline" as const,
    icon: FileText,
  },
};

const riscoConfig = {
  alto: { label: "Alto", variant: "destructive" as const },
  medio: { label: "Médio", variant: "default" as const },
  baixo: { label: "Baixo", variant: "secondary" as const },
};

export function Processos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 20;

  // Fetch processos from Supabase
  const {
    data: processosData = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["processos"],
    queryFn: processosApi.getAll,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter data based on search
  const filteredProcessos = processosData.filter(
    (processo) =>
      processo.numero_cnj.toLowerCase().includes(searchTerm.toLowerCase()) ||
      processo.titulo_polo_ativo
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      processo.titulo_polo_passivo
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const totalItems = filteredProcessos.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Paginate filtered results
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProcessos = filteredProcessos.slice(startIndex, endIndex);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Extract data from processo.data JSON field
  const getProcessoData = (processo: Processo) => {
    const data = processo.data || {};
    return {
      status: data.status || "ativo",
      fase: data.fase || "Em andamento",
      risco: data.risco || "medio",
      proxima_acao: data.proxima_acao || "",
      prazo: data.prazo || null,
    };
  };

  // Get client name from related data
  const getClienteName = (processo: any) => {
    return (
      processo.clientes_processos?.[0]?.clientes?.nome ||
      "Cliente não identificado"
    );
  };

  // Get lawyer name from related data
  const getLawyerName = (processo: any) => {
    return (
      processo.advogados_processos?.[0]?.advogados?.nome ||
      "Advogado não atribuído"
    );
  };

  const isPrazoVencendo = (prazo?: string) => {
    if (!prazo) return false;
    const prazoDate = new Date(prazo);
    const hoje = new Date();
    const diasRestantes = Math.ceil(
      (prazoDate.getTime() - hoje.getTime()) / (1000 * 3600 * 24),
    );
    return diasRestantes <= 3 && diasRestantes >= 0;
  };

  // Calculate stats from real data
  const stats = {
    total: processosData.length,
    ativos: processosData.filter((p) => getProcessoData(p).status === "ativo")
      .length,
    prazosVencendo: processosData.filter((p) =>
      isPrazoVencendo(getProcessoData(p).prazo),
    ).length,
    altoRisco: processosData.filter((p) => getProcessoData(p).risco === "alto")
      .length,
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold text-neutral-900">
              Processos
            </h1>
            <p className="text-neutral-600 mt-1">
              Gestão completa de processos jurídicos
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Erro ao carregar processos
              </h3>
              <p className="text-neutral-600 mb-4">
                {error.message || "Erro desconhecido"}
              </p>
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
              <FileText className="w-4 h-4 text-brand-600" />
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
              <Calendar className="w-4 h-4 text-warning" />
              <div>
                <p className="text-2xl font-semibold text-warning">
                  {stats.prazosVencendo}
                </p>
                <p className="text-xs text-neutral-600">Prazos esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-danger" />
              <div>
                <p className="text-2xl font-semibold text-danger">
                  {stats.altoRisco}
                </p>
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
          <CardTitle className="text-lg">Processos ({totalItems})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              <span className="ml-2 text-neutral-600">
                Carregando processos...
              </span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número CNJ</TableHead>
                  <TableHead>Partes</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Advogado</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Fase</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Próxima Ação</TableHead>
                  <TableHead>Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProcessos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="text-neutral-500">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                        <p>Nenhum processo encontrado</p>
                        <p className="text-sm">
                          Ajuste os filtros ou adicione um novo processo
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedProcessos.map((processo) => {
                    const processoData = getProcessoData(processo);
                    const StatusIcon =
                      statusConfig[
                        processoData.status as keyof typeof statusConfig
                      ]?.icon || FileText;

                    return (
                      <TableRow
                        key={processo.numero_cnj}
                        className="hover:bg-neutral-50 cursor-pointer"
                      >
                        <TableCell className="font-mono text-sm">
                          {processo.numero_cnj}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">
                              {processo.titulo_polo_ativo || "Não informado"}
                            </div>
                            <div className="text-xs text-neutral-600">
                              vs{" "}
                              {processo.titulo_polo_passivo || "Não informado"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {getClienteName(processo)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {getLawyerName(processo)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              statusConfig[
                                processoData.status as keyof typeof statusConfig
                              ]?.variant
                            }
                            className="flex items-center gap-1 w-fit"
                          >
                            <StatusIcon className="w-3 h-3" />
                            {
                              statusConfig[
                                processoData.status as keyof typeof statusConfig
                              ]?.label
                            }
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {processoData.fase}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              riscoConfig[
                                processoData.risco as keyof typeof riscoConfig
                              ]?.variant
                            }
                          >
                            {
                              riscoConfig[
                                processoData.risco as keyof typeof riscoConfig
                              ]?.label
                            }
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {processoData.proxima_acao && (
                            <div className="flex items-center gap-2">
                              <span>{processoData.proxima_acao}</span>
                              {processoData.prazo && (
                                <div
                                  className={`flex items-center gap-1 text-xs ${
                                    isPrazoVencendo(processoData.prazo)
                                      ? "text-danger"
                                      : "text-neutral-500"
                                  }`}
                                >
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(processoData.prazo)}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-neutral-600">
                          {formatDate(processo.created_at)}
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
            Mostrando {startIndex + 1} a {Math.min(endIndex, totalItems)} de{" "}
            {totalItems} processos
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
