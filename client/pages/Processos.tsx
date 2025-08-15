import React, { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
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
  UserPlus,
  Calendar,
  Building,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import { themeUtils, colors } from "../lib/theme-colors";

interface Processo {
  numero_cnj: string;
  tribunal_sigla: string | null;
  titulo_polo_ativo: string | null;
  titulo_polo_passivo: string | null;
  created_at: string;
  cliente_nome?: string;
  cliente_cpfcnpj?: string;
  responsavel_oab?: number;
  responsavel_nome?: string;
  ultimo_evento?: {
    data: string;
    tipo: string;
    conteudo: string;
  };
}

interface AtribuirOabData {
  numero_cnj: string;
  oab: number;
}

export function Processos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOab, setFilterOab] = useState("todos");
  const [filterTribunal, setFilterTribunal] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAtribuirDialogOpen, setIsAtribuirDialogOpen] = useState(false);
  const [selectedProcesso, setSelectedProcesso] = useState<string | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const itemsPerPage = 20;

  // Enhanced query with operational sorting by recency/risk
  const {
    data: processosData = { data: [], total: 0, totalPages: 0 },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "processos",
      searchTerm,
      filterOab,
      filterTribunal,
      filterStatus,
      currentPage,
    ],
    queryFn: async () => {
      // Flow C2 - Query unificada conforme especificação
      let query = supabase
        .from("processos")
        .select(
          `
          numero_cnj,
          tribunal_sigla,
          titulo_polo_ativo,
          titulo_polo_passivo,
          created_at,
          clientes_processos!inner (
            clientes (
              nome,
              cpfcnpj
            )
          ),
          advogados_processos (
            advogados (
              oab,
              nome
            )
          )
        `,
        )
        .order("created_at", { ascending: false });

      // Apply search filters
      if (searchTerm) {
        query = query.or(
          `numero_cnj.ilike.%${searchTerm}%,titulo_polo_ativo.ilike.%${searchTerm}%,titulo_polo_passivo.ilike.%${searchTerm}%`,
        );
      }

      if (filterTribunal !== "todos") {
        query = query.eq("tribunal_sigla", filterTribunal);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch last event for each process from vw_timeline_processo
      const processosComEventos = await Promise.all(
        data.map(async (processo: any) => {
          const { data: timelineData } = await supabase
            .from("vw_timeline_processo")
            .select("data, tipo, conteudo")
            .eq("numero_cnj", processo.numero_cnj)
            .order("data", { ascending: false })
            .limit(1);

          return {
            ...processo,
            cliente_nome: processo.clientes_processos[0]?.clientes?.nome,
            cliente_cpfcnpj: processo.clientes_processos[0]?.clientes?.cpfcnpj,
            responsavel_oab: processo.advogados_processos[0]?.advogados?.oab,
            responsavel_nome: processo.advogados_processos[0]?.advogados?.nome,
            ultimo_evento: timelineData?.[0] || null,
          };
        }),
      );

      // Filter by OAB if specified
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

      // Apply pagination (20/page as specified)
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

  // Fetch lawyers for assignment
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

  // Fetch unique tribunals for filter
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

  // Flow C2 - Mutation to assign/change OAB
  const atribuirOabMutation = useMutation({
    mutationFn: async ({ numero_cnj, oab }: AtribuirOabData) => {
      // Upsert in advogados_processos
      const { data, error } = await supabase
        .from("advogados_processos")
        .upsert([{ numero_cnj, oab }], {
          onConflict: "numero_cnj,oab",
          ignoreDuplicates: false,
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processos"] });
      setIsAtribuirDialogOpen(false);
      setSelectedProcesso(null);
      toast({
        title: "OAB atribuída",
        description: "Responsável atribuído ao processo com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atribuir OAB",
        variant: "destructive",
      });
    },
  });

  const handleAtribuirOab = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProcesso) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const oab = parseInt(formData.get("oab") as string);

    atribuirOabMutation.mutate({ numero_cnj: selectedProcesso, oab });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatCNJ = (cnj: string) => {
    // Format CNJ: 0000000-00.0000.0.00.0000
    const clean = cnj.replace(/\D/g, "");
    if (clean.length === 20) {
      return clean.replace(
        /(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/,
        "$1-$2.$3.$4.$5.$6",
      );
    }
    return cnj;
  };

  const getStatusColor = (temResponsavel: boolean) => {
    return temResponsavel ? "default" : "destructive";
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold" style={{ color: colors.neutral[900] }}>
              Processos
            </h1>
            <p className="text-neutral-600 mt-1">
              Lista operacional - priorização por recência/risco
            </p>
          </div>
        </div>
        <Card style={themeUtils.cardShadow}>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.semantic.error }} />
              <h3 className="text-lg font-medium mb-2">
                Erro ao carregar processos
              </h3>
              <p className="text-neutral-600 mb-4">{error.message}</p>
              <Button onClick={() => refetch()} style={themeUtils.primaryButton}>
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
          <h1 className="text-2xl font-heading font-semibold" style={{ color: colors.neutral[900] }}>
            Processos
          </h1>
          <p className="text-neutral-600 mt-1">
            Lista operacional - priorização por recência/risco
          </p>
        </div>
        <Button
          onClick={() => navigate("/processos/novo")}
          style={themeUtils.primaryButton}
          className="hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Processo
        </Button>
      </div>

      {/* Enhanced filters for OAB/Tribunal/Status */}
      <Card style={themeUtils.cardShadow}>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <Input
                  placeholder="Buscar por CNJ, cliente ou polo..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Select
                value={filterOab}
                onValueChange={(value) => {
                  setFilterOab(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por OAB" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os responsáveis</SelectItem>
                  <SelectItem value="sem-oab">Sem responsável</SelectItem>
                  {advogados.map((advogado) => (
                    <SelectItem
                      key={advogado.oab}
                      value={advogado.oab.toString()}
                    >
                      {advogado.nome} (OAB {advogado.oab})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterTribunal}
                onValueChange={(value) => {
                  setFilterTribunal(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por Tribunal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os tribunais</SelectItem>
                  {tribunais.map((tribunal) => (
                    <SelectItem key={tribunal} value={tribunal}>
                      {tribunal}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced operational table */}
      <Card style={themeUtils.elevatedCardShadow}>
        <CardHeader>
          <CardTitle className="text-lg" style={{ color: colors.neutral[900] }}>
            Processos ({processosData.total})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: colors.brand.primary }} />
              <span className="ml-2 text-neutral-600">
                Carregando processos...
              </span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CNJ</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tribunal</TableHead>
                  <TableHead>Responsável (OAB)</TableHead>
                  <TableHead>Último evento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processosData.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
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
                          to={`/processos-overview/${processo.numero_cnj}`}
                          className="hover:underline"
                          style={{ color: colors.brand.primary }}
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
                            {processo.titulo_polo_ativo} x{" "}
                            {processo.titulo_polo_passivo}
                          </div>
                        )}
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
                            style={themeUtils.brandBadge}
                          >
                            {processo.responsavel_nome ||
                              `OAB ${processo.responsavel_oab}`}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" style={themeUtils.errorBadge}>
                            Sem responsável
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {processo.ultimo_evento ? (
                          <div className="text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <Calendar className="w-3 h-3 text-neutral-400" />
                              <span className="text-neutral-600">
                                {formatDate(processo.ultimo_evento.data)}
                              </span>
                            </div>
                            <div className="text-xs text-neutral-500 truncate max-w-32">
                              {processo.ultimo_evento.tipo}:{" "}
                              {processo.ultimo_evento.conteudo}
                            </div>
                          </div>
                        ) : (
                          <span className="text-neutral-400 text-sm">
                            Sem eventos
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              navigate(`/processos/${processo.numero_cnj}`)
                            }
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Ver
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProcesso(processo.numero_cnj);
                              setIsAtribuirDialogOpen(true);
                            }}
                            style={{ color: colors.brand.primary }}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Atribuir OAB
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination (20/page) */}
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

      {/* Dialog to assign OAB */}
      <Dialog
        open={isAtribuirDialogOpen}
        onOpenChange={setIsAtribuirDialogOpen}
      >
        <DialogContent>
          <form onSubmit={handleAtribuirOab}>
            <DialogHeader>
              <DialogTitle>Atribuir Responsável</DialogTitle>
              <DialogDescription>
                Selecione o advogado responsável pelo processo{" "}
                {selectedProcesso && formatCNJ(selectedProcesso)}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="block text-sm font-medium mb-2">Advogado</label>
              <Select name="oab" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um advogado" />
                </SelectTrigger>
                <SelectContent>
                  {advogados.map((advogado) => (
                    <SelectItem
                      key={advogado.oab}
                      value={advogado.oab.toString()}
                    >
                      {advogado.nome} (OAB {advogado.oab})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAtribuirDialogOpen(false);
                  setSelectedProcesso(null);
                }}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={atribuirOabMutation.isPending}
                style={themeUtils.primaryButton}
              >
                {atribuirOabMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Atribuir
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
