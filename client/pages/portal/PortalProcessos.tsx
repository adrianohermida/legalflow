import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  FileText,
  Eye,
  Calendar,
  Building,
  MessageSquare,
  Clock,
  Search,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { Link } from "react-router-dom";

interface ProcessoPortal {
  numero_cnj: string;
  tribunal_sigla: string | null;
  titulo_polo_ativo: string | null;
  titulo_polo_passivo: string | null;
  created_at: string;
  ultimo_evento?: {
    data: string;
    tipo: string;
    conteudo: string;
  };
}

export function PortalProcessos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProcesso, setSelectedProcesso] = useState<ProcessoPortal | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const itemsPerPage = 10;

  // P2.10 - Buscar processos do cliente logado
  const {
    data: processosData = { data: [], total: 0, totalPages: 0 },
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["portal-processos", searchTerm, currentPage],
    queryFn: async () => {
      // TODO: Filtrar por identidade do portal (cliente logado)
      // Por enquanto, buscar todos os processos como demo
      let query = supabase
        .from("processos")
        .select(`
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
          )
        `, { count: "exact" })
        .order("created_at", { ascending: false });

      // Aplicar filtro de busca
      if (searchTerm) {
        query = query.or(`numero_cnj.ilike.%${searchTerm}%,titulo_polo_ativo.ilike.%${searchTerm}%`);
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const { data, error, count } = await query
        .range(startIndex, startIndex + itemsPerPage - 1);

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

          return {
            ...processo,
            ultimo_evento: timelineData?.[0] || null,
          };
        })
      );

      return {
        data: processosComEventos,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Buscar documentos básicos do processo selecionado
  const {
    data: documentos = [],
    isLoading: documentosLoading,
  } = useQuery({
    queryKey: ["processo-documentos", selectedProcesso?.numero_cnj],
    queryFn: async () => {
      if (!selectedProcesso?.numero_cnj) return [];

      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .eq("numero_cnj", selectedProcesso.numero_cnj)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: peticoes } = await supabase
        .from("peticoes")
        .select("*")
        .eq("numero_cnj", selectedProcesso.numero_cnj)
        .order("created_at", { ascending: false })
        .limit(5);

      return [...(docs || []), ...(peticoes || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 5);
    },
    enabled: !!selectedProcesso?.numero_cnj,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatCNJ = (cnj: string) => {
    const clean = cnj.replace(/\D/g, "");
    if (clean.length === 20) {
      return clean.replace(/(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/, "$1-$2.$3.$4.$5.$6");
    }
    return cnj;
  };

  const getResumo = (processo: ProcessoPortal) => {
    if (processo.titulo_polo_ativo && processo.titulo_polo_passivo) {
      return `${processo.titulo_polo_ativo} x ${processo.titulo_polo_passivo}`;
    }
    return "Processo jurídico";
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold">Meus Processos</h1>
            <p className="text-neutral-600 mt-1">Visualize seus processos ativos</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Erro ao carregar processos</h3>
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
          <h1 className="text-2xl font-heading font-semibold">Meus Processos</h1>
          <p className="text-neutral-600 mt-1">Visualize seus processos ativos</p>
        </div>
      </div>

      {/* Busca */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Buscar por CNJ ou partes do processo..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* P2.10 - Lista CNJ, Resumo, Último evento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Meus Processos ({processosData.total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-700)' }} />
              <span className="ml-2 text-neutral-600">Carregando processos...</span>
            </div>
          ) : processosData.data.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-neutral-900 mb-2">
                Nenhum processo encontrado
              </h3>
              <p className="text-neutral-600">
                {searchTerm 
                  ? "Ajuste os termos de busca ou entre em contato com seu advogado"
                  : "Você ainda não possui processos cadastrados"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {processosData.data.map((processo) => (
                <div
                  key={processo.numero_cnj}
                  className="border rounded-lg p-4 hover:bg-neutral-50 cursor-pointer"
                  onClick={() => {
                    setSelectedProcesso(processo);
                    setIsDetailDialogOpen(true);
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium mb-1">
                        {formatCNJ(processo.numero_cnj)}
                      </h3>
                      <p className="text-neutral-600 text-sm">
                        {getResumo(processo)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {processo.tribunal_sigla && (
                        <Badge variant="outline" className="text-xs">
                          <Building className="w-3 h-3 mr-1" />
                          {processo.tribunal_sigla}
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>

                  {/* Último evento */}
                  {processo.ultimo_evento && (
                    <div className="bg-neutral-50 rounded p-3 mt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-neutral-400" />
                        <span className="text-sm font-medium text-neutral-700">
                          Última movimentação
                        </span>
                        <span className="text-xs text-neutral-500">
                          {formatDate(processo.ultimo_evento.data)}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-600">
                        <strong>{processo.ultimo_evento.tipo}:</strong>{" "}
                        {processo.ultimo_evento.conteudo.substring(0, 150)}
                        {processo.ultimo_evento.conteudo.length > 150 && "..."}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {processosData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, processosData.total)} de {processosData.total} processos
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

      {/* P2.10 - Dialog de detalhes (Chat e docs básicos) */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedProcesso && formatCNJ(selectedProcesso.numero_cnj)}
            </DialogTitle>
            <DialogDescription>
              {selectedProcesso && getResumo(selectedProcesso)}
            </DialogDescription>
          </DialogHeader>
          
          {selectedProcesso && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Informações do Processo */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-neutral-600">CNJ</label>
                      <p className="text-sm font-mono">{formatCNJ(selectedProcesso.numero_cnj)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-600">Tribunal</label>
                      <p className="text-sm">{selectedProcesso.tribunal_sigla || "Não informado"}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-neutral-600">Cadastrado em</label>
                      <p className="text-sm">{formatDate(selectedProcesso.created_at)}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Último Evento */}
                {selectedProcesso.ultimo_evento && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Última Movimentação</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{selectedProcesso.ultimo_evento.tipo}</span>
                          <span className="text-xs text-neutral-500">
                            {formatDate(selectedProcesso.ultimo_evento.data)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                          {selectedProcesso.ultimo_evento.conteudo}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Chat e Documentos */}
              <div className="space-y-4">
                {/* Chat Simplificado */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Chat com Advogado
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-6">
                      <MessageSquare className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                      <p className="text-sm text-neutral-600 mb-3">
                        Converse diretamente com seu advogado sobre este processo
                      </p>
                      <Link 
                        to="/portal/chat"
                        onClick={() => setIsDetailDialogOpen(false)}
                      >
                        <Button style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}>
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Abrir Chat
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                {/* Documentos Básicos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Documentos Recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {documentosLoading ? (
                      <div className="text-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                      </div>
                    ) : documentos.length === 0 ? (
                      <div className="text-center py-6">
                        <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                        <p className="text-sm text-neutral-600">
                          Nenhum documento disponível
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {documentos.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-2 rounded hover:bg-neutral-50">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-neutral-400" />
                              <div>
                                <p className="text-sm font-medium truncate">
                                  {doc.file_name || doc.tipo || "Documento"}
                                </p>
                                <p className="text-xs text-neutral-500">
                                  {formatDate(doc.created_at)}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
