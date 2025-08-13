import React, { useState } from "react";
import { Link } from "react-router-dom";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Search,
  Plus,
  Filter,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Eye,
  Calendar,
  Building,
  MoreHorizontal,
  RefreshCw,
  DollarSign,
  Download,
  Share,
  MessageSquare,
  Target,
  FileUp,
  Sparkles,
  Bot,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatCNJ, formatDate } from "../lib/utils";

interface Processo {
  numero_cnj: string;
  tribunal_sigla: string;
  titulo_polo_ativo: string;
  titulo_polo_passivo: string;
  data: any;
  created_at: string;
  crm_id: string;
  decisoes: string;
  resumo?: string; // Campo adicional para resumo
  cliente_nome?: string;
  cliente_cpfcnpj?: string;
  responsavel_oab?: number;
  responsavel_nome?: string;
  ultimo_evento?: any;
}

export default function ProcessosV2() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOab, setFilterOab] = useState("todos");
  const [filterTribunal, setFilterTribunal] = useState("todos");
  const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(
    null,
  );
  const [isResumoDialogOpen, setIsResumoDialogOpen] = useState(false);
  const [isFinanceiroDialogOpen, setIsFinanceiroDialogOpen] = useState(false);
  const [isRelatorioDialogOpen, setIsRelatorioDialogOpen] = useState(false);
  const [novoResumo, setNovoResumo] = useState("");

  const itemsPerPage = 20;

  // Query processos com dados relacionados
  const {
    data: processosData = { data: [], total: 0, totalPages: 0 },
    isLoading: processosLoading,
    error: processosError,
    refetch: refetchProcessos,
  } = useQuery({
    queryKey: [
      "processos-v2",
      searchTerm,
      currentPage,
      filterOab,
      filterTribunal,
    ],
    queryFn: async () => {
      let query = supabase
        .from("processos")
        .select(
          `
          numero_cnj,
          tribunal_sigla,
          titulo_polo_ativo,
          titulo_polo_passivo,
          data,
          created_at,
          crm_id,
          decisoes,
          clientes_processos(
            clientes(nome, cpfcnpj)
          ),
          advogados_processos(
            advogados(oab, nome)
          )
        `,
          { count: "exact" },
        )
        .order("created_at", { ascending: false });

      // Aplicar filtro de busca
      if (searchTerm) {
        query = query.or(
          `numero_cnj.ilike.%${searchTerm}%,titulo_polo_ativo.ilike.%${searchTerm}%,titulo_polo_passivo.ilike.%${searchTerm}%`,
        );
      }

      // Aplicar filtro de tribunal
      if (filterTribunal !== "todos") {
        query = query.eq("tribunal_sigla", filterTribunal);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Buscar último evento para cada processo
      const processosComEventos = await Promise.all(
        (data || []).map(async (processo: any) => {
          const { data: timelineData } = await supabase
            .from("vw_timeline_processo")
            .select("data, tipo, conteudo")
            .eq("numero_cnj", processo.numero_cnj)
            .order("data", { ascending: false })
            .limit(1);

          // Extrair dados completos da capa e resumo
          const capa = processo.data?.capa || {};
          const resumo = processo.data?.resumo || capa?.assunto || '';
          const valorCausa = capa?.valor_formatado ||
                           (capa?.valor_causa ? `R$ ${Number(capa.valor_causa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : null);

          return {
            ...processo,
            resumo,
            capa,
            valor_causa: valorCausa,
            situacao: capa?.situacao || capa?.status,
            instancia: capa?.instancia,
            cliente_nome: processo.clientes_processos[0]?.clientes?.nome,
            cliente_cpfcnpj: processo.clientes_processos[0]?.clientes?.cpfcnpj,
            responsavel_oab: processo.advogados_processos[0]?.advogados?.oab,
            responsavel_nome: processo.advogados_processos[0]?.advogados?.nome,
            ultimo_evento: timelineData?.[0] || null,
          };
        }),
      );

      // Filtrar por OAB se especificado
      let filteredData = processosComEventos;
      if (filterOab !== "todos") {
        if (filterOab === "sem-oab") {
          filteredData = processosComEventos.filter((p) => !p.responsavel_oab);
        } else {
          filteredData = processosComEventos.filter(
            (p) => p.responsavel_oab?.toString() === filterOab,
          );
        }
      }

      // Aplicar paginação
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;

      return {
        data: filteredData.slice(startIndex, endIndex),
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / itemsPerPage),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Query advogados para filtro
  const { data: advogados = [] } = useQuery({
    queryKey: ["advogados"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advogados")
        .select("oab, nome")
        .order("nome");

      if (error) throw error;
      return data;
    },
  });

  // Query tribunais únicos para filtro
  const { data: tribunais = [] } = useQuery({
    queryKey: ["tribunais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("tribunal_sigla")
        .not("tribunal_sigla", "is", null);

      if (error) throw error;

      const uniqueTribunais = [...new Set(data.map((p) => p.tribunal_sigla))];
      return uniqueTribunais.filter(Boolean);
    },
  });

  // Mutation para atualizar resumo
  const updateResumoMutation = useMutation({
    mutationFn: async ({
      numero_cnj,
      resumo,
    }: {
      numero_cnj: string;
      resumo: string;
    }) => {
      // Buscar dados atuais
      const { data: processoAtual } = await supabase
        .from("processos")
        .select("data")
        .eq("numero_cnj", numero_cnj)
        .single();

      // Atualizar com resumo
      const novoData = {
        ...(processoAtual?.data || {}),
        resumo,
      };

      const { data, error } = await supabase
        .from("processos")
        .update({ data: novoData })
        .eq("numero_cnj", numero_cnj)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchProcessos();
      setIsResumoDialogOpen(false);
      setNovoResumo("");
      toast({
        title: "Resumo atualizado",
        description: "Resumo do processo foi salvo com sucesso",
      });
    },
  });

  // Mutation para gerar resumo com IA
  const generateAIResumoMutation = useMutation({
    mutationFn: async ({ numero_cnj }: { numero_cnj: string }) => {
      // Buscar dados do processo
      const { data: processo } = await supabase
        .from("processos")
        .select("*")
        .eq("numero_cnj", numero_cnj)
        .single();

      // Simular IA gerando resumo baseado nos dados
      const capa = processo?.data?.capa || {};
      const resumoIA = `${capa.classe || "Processo"} na área ${capa.area || "Jurídica"} sobre ${capa.assunto || "assunto não especificado"}. Valor da causa: ${capa.valor_causa?.valor_formatado || "não informado"}. Distribuído em ${capa.data_distribuicao ? formatDate(capa.data_distribuicao) : "data não informada"}.`;

      return resumoIA;
    },
    onSuccess: (resumoIA) => {
      setNovoResumo(resumoIA);
      toast({
        title: "Resumo gerado",
        description:
          "IA gerou um resumo automático. Revise e ajuste se necessário.",
      });
    },
  });

  // Mutation para atualização de processo
  const syncProcessoMutation = useMutation({
    mutationFn: async ({ numero_cnj }: { numero_cnj: string }) => {
      const { data: jobId, error } = await lf.rpc("lf_run_sync", {
        p_numero_cnj: numero_cnj,
      });

      if (error) throw error;
      return jobId;
    },
    onSuccess: (jobId) => {
      toast({
        title: "Atualização iniciada",
        description: `Sync #${jobId} enfileirado. Dados serão atualizados em breve.`,
      });
    },
  });

  const handleUpdateResumo = () => {
    if (!selectedProcesso || !novoResumo.trim()) return;

    updateResumoMutation.mutate({
      numero_cnj: selectedProcesso.numero_cnj,
      resumo: novoResumo.trim(),
    });
  };

  if (processosError) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Erro ao carregar processos
              </h3>
              <p className="text-neutral-600 mb-4">{processosError.message}</p>
              <Button onClick={() => refetchProcessos()}>
                Tentar Novamente
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
          <h1 className="text-2xl font-heading font-semibold">Processos v2</h1>
          <p className="text-neutral-600 mt-1">
            Gestão completa de processos com resumo e funcionalidades avançadas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetchProcessos()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button asChild>
            <Link to="/processos/novo">
              <Plus className="w-4 h-4 mr-2" />
              Novo Processo
            </Link>
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por CNJ, partes ou assunto..."
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
              value={filterTribunal}
              onValueChange={(value) => {
                setFilterTribunal(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tribunal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos tribunais</SelectItem>
                {tribunais.map((tribunal) => (
                  <SelectItem key={tribunal} value={tribunal}>
                    {tribunal}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filterOab}
              onValueChange={(value) => {
                setFilterOab(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="sem-oab">Sem responsável</SelectItem>
                {advogados.map((advogado) => (
                  <SelectItem
                    key={advogado.oab}
                    value={advogado.oab.toString()}
                  >
                    {advogado.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setFilterTribunal("todos");
                setFilterOab("todos");
                setCurrentPage(1);
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Processos */}
      <Card>
        <CardHeader>
          <CardTitle>Processos ({processosData.total})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {processosLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: "var(--brand-700)" }}
              />
              <span className="ml-2 text-neutral-600">
                Carregando processos...
              </span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CNJ</TableHead>
                  <TableHead>Cliente / Partes</TableHead>
                  <TableHead>Resumo</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Último Evento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processosData.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
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
                  processosData.data?.map((processo) => (
                    <TableRow
                      key={processo.numero_cnj}
                      className="hover:bg-neutral-50"
                    >
                      <TableCell className="font-mono text-sm">
                        <Link
                          to={`/processos-v2/${processo.numero_cnj}`}
                          className="hover:underline"
                          style={{ color: "var(--brand-700)" }}
                        >
                          {formatCNJ(processo.numero_cnj)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {processo.cliente_nome || "Cliente não informado"}
                        </div>
                        {processo.titulo_polo_ativo && (
                          <div className="text-xs text-neutral-500 mt-1">
                            {processo.titulo_polo_ativo} ×{" "}
                            {processo.titulo_polo_passivo}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="text-sm">
                          {processo.resumo ? (
                            <p className="line-clamp-2">{processo.resumo}</p>
                          ) : (
                            <span className="text-neutral-400 italic">
                              Sem resumo
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-neutral-400" />
                          <span className="text-sm">
                            {processo.tribunal_sigla || "Não informado"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {processo.responsavel_oab ? (
                          <Badge
                            variant="default"
                            style={{
                              backgroundColor: "var(--brand-700)",
                              color: "white",
                            }}
                          >
                            {processo.responsavel_nome ||
                              `OAB ${processo.responsavel_oab}`}
                          </Badge>
                        ) : (
                          <Badge variant="destructive">Sem responsável</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {processo.ultimo_evento ? (
                          <div className="text-sm">
                            <p className="font-medium">
                              {processo.ultimo_evento.tipo}
                            </p>
                            <p className="text-neutral-500 text-xs">
                              {formatDate(processo.ultimo_evento.data)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-sm">
                            Sem eventos
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />

                            <DropdownMenuItem asChild>
                              <Link to={`/processos-v2/${processo.numero_cnj}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver Detalhes
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProcesso(processo);
                                setNovoResumo(processo.resumo || "");
                                setIsResumoDialogOpen(true);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Editar Resumo
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                syncProcessoMutation.mutate({
                                  numero_cnj: processo.numero_cnj,
                                })
                              }
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Atualizar Dados
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProcesso(processo);
                                setIsFinanceiroDialogOpen(true);
                              }}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Financeiro
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedProcesso(processo);
                                setIsRelatorioDialogOpen(true);
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Gerar Relatório
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {processosData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
            {Math.min(currentPage * itemsPerPage, processosData.total)} de{" "}
            {processosData.total} processos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Anterior
            </Button>
            <span className="text-sm text-neutral-600">
              Página {currentPage} de {processosData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === processosData.totalPages}
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Editar Resumo */}
      <Dialog open={isResumoDialogOpen} onOpenChange={setIsResumoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Resumo do Processo</DialogTitle>
            <DialogDescription>
              {selectedProcesso && formatCNJ(selectedProcesso.numero_cnj)} -{" "}
              {selectedProcesso?.titulo_polo_ativo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="resumo">Resumo do Processo</Label>
              <Textarea
                id="resumo"
                placeholder="Digite um resumo detalhado do processo..."
                value={novoResumo}
                onChange={(e) => setNovoResumo(e.target.value)}
                className="min-h-32"
              />
            </div>
            <div>
              <Button
                variant="outline"
                onClick={() =>
                  selectedProcesso &&
                  generateAIResumoMutation.mutate({
                    numero_cnj: selectedProcesso.numero_cnj,
                  })
                }
                disabled={generateAIResumoMutation.isPending}
              >
                {generateAIResumoMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Gerar com IA
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsResumoDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateResumo}
              disabled={updateResumoMutation.isPending || !novoResumo.trim()}
            >
              {updateResumoMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Salvar Resumo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Financeiro */}
      <Dialog
        open={isFinanceiroDialogOpen}
        onOpenChange={setIsFinanceiroDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestão Financeira</DialogTitle>
            <DialogDescription>
              {selectedProcesso && formatCNJ(selectedProcesso.numero_cnj)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-neutral-600">
              Funcionalidade de gestão financeira será implementada aqui:
              honorários, despesas, custas, etc.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFinanceiroDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Relatório */}
      <Dialog
        open={isRelatorioDialogOpen}
        onOpenChange={setIsRelatorioDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Relatório Personalizado</DialogTitle>
            <DialogDescription>
              {selectedProcesso && formatCNJ(selectedProcesso.numero_cnj)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-neutral-600">
              Funcionalidade de geração de relatório será implementada aqui:
              exportação PDF, compartilhamento por WhatsApp, etc.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRelatorioDialogOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
