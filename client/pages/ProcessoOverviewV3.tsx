/**
 * Flow C3: Processo > Detalhes (Overview)
 * Behavior Goal: do contexto à ação em 1 clique
 * 
 * Components:
 * - Resumo (Capa): public.processos + data (Advise/Escavador)
 * - Timeline (Recentes 30d): legalflow.vw_timeline_processo
 * - Chat (dock): process threads
 * - Shortcuts: + Andamento, + Publicação, + Petição
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MessageSquare,
  Calendar,
  FileText,
  Users,
  Activity,
  Settings,
  ExternalLink,
  Bell,
  Clock,
  Building,
  Gavel,
  User,
  MapPin,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  MoreHorizontal,
  PlayCircle,
  Upload,
  Folder,
  Link2,
  Target,
  UserPlus,
  CalendarPlus,
  FileUp,
  Plus,
  History,
  ChevronRight,
  X,
  ChevronDown,
  ChevronUp,
  Send,
  Paperclip,
  Loader2,
  DollarSign,
  Scale,
  Briefcase,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
import { Textarea } from "../components/ui/textarea";
import { supabase, lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatCNJ, formatDate } from "../lib/utils";
import { themeUtils, colors } from "../lib/theme-colors";
import ProcessoChatMultiThread from "../components/ProcessoChatMultiThread";
import {
  fetchProcessoCompleto,
  fetchTimelineRecente,
  fetchTimelineCompleto,
  fetchProcessThreads,
  createAndamento,
  createPublicacao,
  createPeticao,
  extractAdviseData,
  formatCNJDisplay,
  formatCurrency,
  formatDateDisplay,
  getEventIconType,
  getProcessActionContext,
  type ProcessoCompleto,
} from "../lib/processo-overview-utils";

// Using ProcessoCompleto from utils

interface TimelineEvent {
  numero_cnj: string;
  data: string;
  tipo: string;
  conteudo: string;
  created_at: string;
}

interface ProcessThread {
  id: string;
  context_type: string;
  properties: any;
  created_at: string;
}

export default function ProcessoOverviewV3() {
  const { numero_cnj } = useParams<{ numero_cnj: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showChatDock, setShowChatDock] = useState(false);
  const [showHistoricoCompleto, setShowHistoricoCompleto] = useState(false);
  const [showAddAndamentoDialog, setShowAddAndamentoDialog] = useState(false);
  const [showAddPublicacaoDialog, setShowAddPublicacaoDialog] = useState(false);
  const [showAddPeticaoDialog, setShowAddPeticaoDialog] = useState(false);
  const [historicoPage, setHistoricoPage] = useState(1);

  // Fetch process data with related information
  const {
    data: processoData,
    isLoading: isProcessoLoading,
    error: processoError,
  } = useQuery({
    queryKey: ["processo-overview", numero_cnj],
    queryFn: async () => {
      if (!numero_cnj) throw new Error("CNJ não fornecido");
      return fetchProcessoCompleto(numero_cnj);
    },
    enabled: !!numero_cnj,
  });

  // Fetch recent timeline (30 days)
  const {
    data: timelineRecente,
    isLoading: isTimelineLoading,
  } = useQuery({
    queryKey: ["timeline-recente", numero_cnj],
    queryFn: async () => {
      if (!numero_cnj) return [];
      return fetchTimelineRecente(numero_cnj, 10);
    },
    enabled: !!numero_cnj,
  });

  // Fetch complete history for modal (paginated)
  const {
    data: historicoCompleto,
    isLoading: isHistoricoLoading,
  } = useQuery({
    queryKey: ["historico-completo", numero_cnj, historicoPage],
    queryFn: async () => {
      if (!numero_cnj) return { data: [], total: 0 };

      const pageSize = 20;
      const startIndex = (historicoPage - 1) * pageSize;
      const endIndex = startIndex + pageSize - 1;

      const { data, error, count } = await supabase
        .from("vw_timeline_processo")
        .select("*", { count: "exact" })
        .eq("numero_cnj", numero_cnj)
        .order("data", { ascending: false })
        .range(startIndex, endIndex);

      if (error) throw error;
      return { data: data as TimelineEvent[], total: count || 0 };
    },
    enabled: !!numero_cnj && showHistoricoCompleto,
  });

  // Fetch process threads for chat dock
  const {
    data: processThreads,
  } = useQuery({
    queryKey: ["process-threads", numero_cnj],
    queryFn: async () => {
      if (!numero_cnj) return [];

      const { data, error } = await supabase
        .from("thread_links")
        .select("*")
        .eq("context_type", "processo")
        .contains("properties", { numero_cnj })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ProcessThread[];
    },
    enabled: !!numero_cnj,
  });

  // Mutations for quick actions
  const addAndamentoMutation = useMutation({
    mutationFn: async (conteudo: string) => {
      const { data, error } = await supabase
        .from("movimentacoes")
        .insert([{
          numero_cnj,
          data: { texto: conteudo, tipo: "andamento_manual" },
          data_movimentacao: new Date().toISOString(),
        }]);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline-recente", numero_cnj] });
      setShowAddAndamentoDialog(false);
      toast({
        title: "Andamento adicionado",
        description: "Novo andamento registrado com sucesso",
      });
    },
  });

  const addPublicacaoMutation = useMutation({
    mutationFn: async (conteudo: string) => {
      const { data, error } = await supabase
        .from("publicacoes")
        .insert([{
          numero_cnj,
          data: { resumo: conteudo, tipo: "publicacao_manual" },
          data_publicacao: new Date().toISOString(),
        }]);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline-recente", numero_cnj] });
      setShowAddPublicacaoDialog(false);
      toast({
        title: "Publicação adicionada",
        description: "Nova publicação registrada com sucesso",
      });
    },
  });

  const addPeticaoMutation = useMutation({
    mutationFn: async ({ tipo, conteudo }: { tipo: string; conteudo: string }) => {
      const { data, error } = await supabase
        .from("peticoes")
        .insert([{
          numero_cnj,
          tipo,
          conteudo,
        }]);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setShowAddPeticaoDialog(false);
      toast({
        title: "Petição criada",
        description: "Nova petição salva com sucesso",
      });
    },
  });

  const extractAdviseData = (data: any) => {
    if (!data) return {};
    
    return {
      area: data.area || data.classe?.area || "Não informado",
      classe: data.classe?.nome || data.classeProcessual || "Não informado",
      assunto: data.assunto?.[0]?.nome || data.assuntoPrincipal || "Não informado",
      orgao: data.orgaoJulgador?.nome || data.tribunal || processoData?.tribunal_sigla || "Não informado",
      valor: data.valorCausa || data.valor || null,
      audiencias: data.audiencias || [],
    };
  };

  const adviseData = processoData ? extractAdviseData(processoData.data) : {};

  if (processoError) {
    return (
      <div className="min-h-screen bg-neutral-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: colors.semantic.error }} />
              <h3 className="text-lg font-medium mb-2">Erro ao carregar processo</h3>
              <p className="text-neutral-600 mb-4">{processoError.message}</p>
              <Button onClick={() => navigate("/processos")} style={themeUtils.primaryButton}>
                Voltar para Processos
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b" style={{ borderColor: colors.neutral[200] }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/processos")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: colors.neutral[900] }}>
                  {numero_cnj ? formatCNJ(numero_cnj) : "Carregando..."}
                </h1>
                <p className="text-sm" style={{ color: colors.neutral[600] }}>
                  {processoData?.titulo_polo_ativo} × {processoData?.titulo_polo_passivo}
                </p>
              </div>
            </div>

            {/* Action Shortcuts - Primary Goal: Context to Action in 1 Click */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => setShowAddAndamentoDialog(true)}
                style={themeUtils.primaryButton}
                className="hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Andamento
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddPublicacaoDialog(true)}
              >
                <FileText className="w-4 h-4 mr-2" />
                Publicação
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddPeticaoDialog(true)}
              >
                <Upload className="w-4 h-4 mr-2" />
                Petição
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowChatDock(true)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Chat
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Resumo (Capa) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Process Summary Card */}
            <Card style={themeUtils.cardShadow}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5" style={{ color: colors.brand.primary }} />
                  Resumo do Processo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isProcessoLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.brand.primary }} />
                    <span className="ml-2">Carregando dados...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium" style={{ color: colors.neutral[700] }}>
                          Área
                        </label>
                        <p className="text-sm" style={{ color: colors.neutral[600] }}>
                          {adviseData.area}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium" style={{ color: colors.neutral[700] }}>
                          Classe
                        </label>
                        <p className="text-sm" style={{ color: colors.neutral[600] }}>
                          {adviseData.classe}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium" style={{ color: colors.neutral[700] }}>
                          Assunto
                        </label>
                        <p className="text-sm" style={{ color: colors.neutral[600] }}>
                          {adviseData.assunto}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium" style={{ color: colors.neutral[700] }}>
                          Órgão Julgador
                        </label>
                        <p className="text-sm flex items-center gap-2" style={{ color: colors.neutral[600] }}>
                          <Building className="w-4 h-4" />
                          {adviseData.orgao}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium" style={{ color: colors.neutral[700] }}>
                          Cliente
                        </label>
                        <p className="text-sm flex items-center gap-2" style={{ color: colors.neutral[600] }}>
                          <User className="w-4 h-4" />
                          {processoData?.cliente?.nome || "Não informado"}
                        </p>
                      </div>
                      {adviseData.valor && (
                        <div>
                          <label className="text-sm font-medium" style={{ color: colors.neutral[700] }}>
                            Valor da Causa
                          </label>
                          <p className="text-sm flex items-center gap-2" style={{ color: colors.neutral[600] }}>
                            <DollarSign className="w-4 h-4" />
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(parseFloat(adviseData.valor))}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline Recent (30 days) */}
            <Card style={themeUtils.cardShadow}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" style={{ color: colors.brand.primary }} />
                    Movimentações Recentes (30 dias)
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistoricoCompleto(true)}
                  >
                    <History className="w-4 h-4 mr-2" />
                    Histórico Completo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isTimelineLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: colors.brand.primary }} />
                    <span className="ml-2">Carregando timeline...</span>
                  </div>
                ) : timelineRecente && timelineRecente.length > 0 ? (
                  <div className="space-y-4">
                    {timelineRecente.map((evento, index) => (
                      <div key={index} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                        <div className="flex-shrink-0">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: colors.brand.primaryLight }}
                          >
                            {evento.tipo === 'movimentacao' ? (
                              <Activity className="w-4 h-4" style={{ color: colors.brand.primary }} />
                            ) : (
                              <FileText className="w-4 h-4" style={{ color: colors.brand.primary }} />
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                              style={{ borderColor: colors.brand.primary, color: colors.brand.primary }}
                            >
                              {evento.tipo}
                            </Badge>
                            <span className="text-xs" style={{ color: colors.neutral[500] }}>
                              {formatDate(evento.data)}
                            </span>
                          </div>
                          <p className="text-sm" style={{ color: colors.neutral[700] }}>
                            {evento.conteudo}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Activity className="w-12 h-12 mx-auto mb-4" style={{ color: colors.neutral[300] }} />
                    <p style={{ color: colors.neutral[500] }}>
                      Nenhuma movimentação nos últimos 30 dias
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Info & Actions */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card style={themeUtils.cardShadow}>
              <CardHeader>
                <CardTitle className="text-base">Status do Processo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: colors.neutral[600] }}>
                    Responsável
                  </span>
                  {processoData?.responsavel ? (
                    <Badge style={themeUtils.brandBadge}>
                      {processoData.responsavel.nome}
                    </Badge>
                  ) : (
                    <Badge variant="outline" style={{ color: colors.semantic.warning }}>
                      Não atribuído
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: colors.neutral[600] }}>
                    Tribunal
                  </span>
                  <span className="text-sm font-medium" style={{ color: colors.neutral[700] }}>
                    {processoData?.tribunal_sigla || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: colors.neutral[600] }}>
                    Criado em
                  </span>
                  <span className="text-sm" style={{ color: colors.neutral[600] }}>
                    {processoData ? formatDate(processoData.created_at) : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card style={themeUtils.cardShadow}>
              <CardHeader>
                <CardTitle className="text-base">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => navigate(`/processos-v2/${numero_cnj}`)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Ver Detalhes Completos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setShowChatDock(true)}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Abrir Chat ({processThreads?.length || 0})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Agenda de Audiências
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Gerenciar Partes
                </Button>
              </CardContent>
            </Card>

            {/* Próximas Audiências (if available) */}
            {adviseData.audiencias && adviseData.audiencias.length > 0 && (
              <Card style={themeUtils.cardShadow}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Próximas Audiências
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {adviseData.audiencias.slice(0, 3).map((audiencia: any, index: number) => (
                      <div key={index} className="p-3 rounded-lg" style={{ backgroundColor: colors.neutral[50] }}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {audiencia.tipo || "Audiência"}
                          </span>
                          <span className="text-xs" style={{ color: colors.neutral[500] }}>
                            {audiencia.data ? formatDate(audiencia.data) : "Data não informada"}
                          </span>
                        </div>
                        {audiencia.local && (
                          <p className="text-xs mt-1" style={{ color: colors.neutral[600] }}>
                            {audiencia.local}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Chat Dock */}
      {showChatDock && (
        <div className="fixed bottom-0 right-0 w-96 h-96 bg-white border border-l border-t rounded-tl-lg shadow-lg z-50">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-medium">Chat do Processo</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowChatDock(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="h-full">
            {numero_cnj && (
              <ProcessoChatMultiThread
                numero_cnj={numero_cnj}
                compact={true}
              />
            )}
          </div>
        </div>
      )}

      {/* Histórico Completo Modal */}
      <Dialog open={showHistoricoCompleto} onOpenChange={setShowHistoricoCompleto}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Histórico Completo - {numero_cnj ? formatCNJ(numero_cnj) : ""}</DialogTitle>
            <DialogDescription>
              Todas as movimentações e publicações do processo
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh]">
            {isHistoricoLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Carregando histórico...</span>
              </div>
            ) : historicoCompleto && historicoCompleto.data.length > 0 ? (
              <div className="space-y-4">
                {historicoCompleto.data.map((evento, index) => (
                  <div key={index} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                    <div className="flex-shrink-0">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: colors.brand.primaryLight }}
                      >
                        {evento.tipo === 'movimentacao' ? (
                          <Activity className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        ) : (
                          <FileText className="w-4 h-4" style={{ color: colors.brand.primary }} />
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {evento.tipo}
                        </Badge>
                        <span className="text-xs" style={{ color: colors.neutral[500] }}>
                          {formatDate(evento.data)}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: colors.neutral[700] }}>
                        {evento.conteudo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p style={{ color: colors.neutral[500] }}>
                  Nenhuma movimentação encontrada
                </p>
              </div>
            )}
          </div>
          {historicoCompleto && historicoCompleto.total > 20 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm" style={{ color: colors.neutral[600] }}>
                Mostrando {(historicoPage - 1) * 20 + 1} a {Math.min(historicoPage * 20, historicoCompleto.total)} de {historicoCompleto.total} registros
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoricoPage(Math.max(1, historicoPage - 1))}
                  disabled={historicoPage === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoricoPage(historicoPage + 1)}
                  disabled={historicoPage * 20 >= historicoCompleto.total}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Andamento Dialog */}
      <Dialog open={showAddAndamentoDialog} onOpenChange={setShowAddAndamentoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Andamento</DialogTitle>
            <DialogDescription>
              Registre uma nova movimentação para o processo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const conteudo = formData.get("conteudo") as string;
            addAndamentoMutation.mutate(conteudo);
          }}>
            <div className="space-y-4 py-4">
              <Textarea
                name="conteudo"
                placeholder="Descreva o andamento do processo..."
                required
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddAndamentoDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={addAndamentoMutation.isPending}
                style={themeUtils.primaryButton}
              >
                {addAndamentoMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Publicação Dialog */}
      <Dialog open={showAddPublicacaoDialog} onOpenChange={setShowAddPublicacaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Publicação</DialogTitle>
            <DialogDescription>
              Registre uma nova publicação para o processo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const conteudo = formData.get("conteudo") as string;
            addPublicacaoMutation.mutate(conteudo);
          }}>
            <div className="space-y-4 py-4">
              <Textarea
                name="conteudo"
                placeholder="Conteúdo da publicação..."
                required
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddPublicacaoDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={addPublicacaoMutation.isPending}
                style={themeUtils.primaryButton}
              >
                {addPublicacaoMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Petição Dialog */}
      <Dialog open={showAddPeticaoDialog} onOpenChange={setShowAddPeticaoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Petição</DialogTitle>
            <DialogDescription>
              Crie uma nova petição para o processo
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            const tipo = formData.get("tipo") as string;
            const conteudo = formData.get("conteudo") as string;
            addPeticaoMutation.mutate({ tipo, conteudo });
          }}>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tipo da Petição
                </label>
                <Input
                  name="tipo"
                  placeholder="Ex: Contestação, Recurso, Petição Inicial..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Conteúdo
                </label>
                <Textarea
                  name="conteudo"
                  placeholder="Conteúdo da petição..."
                  required
                  rows={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddPeticaoDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={addPeticaoMutation.isPending}
                style={themeUtils.primaryButton}
              >
                {addPeticaoMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Criar Petição
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
