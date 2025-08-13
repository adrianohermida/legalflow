import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
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
  FileText,
  MessageSquare,
  Calendar,
  Building,
  Users,
  Send,
  Plus,
  Clock,
  Scale,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileTextIcon,
  Upload,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface ProcessoDetalhes {
  numero_cnj: string;
  tribunal_sigla: string | null;
  titulo_polo_ativo: string | null;
  titulo_polo_passivo: string | null;
  created_at: string;
  cliente?: {
    nome: string;
    cpfcnpj: string;
    whatsapp?: string;
  };
  responsavel?: {
    nome: string;
    oab: number;
  };
}

interface TimelineItem {
  id: string;
  data: string;
  tipo: string;
  conteudo: string;
  created_at: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
}

export function ProcessoOverview() {
  const { cnj } = useParams<{ cnj: string }>();
  const [chatMessage, setChatMessage] = useState("");
  const [timelinePage, setTimelinePage] = useState(1);
  const [isAndamentoDialogOpen, setIsAndamentoDialogOpen] = useState(false);
  const [isPublicacaoDialogOpen, setIsPublicacaoDialogOpen] = useState(false);
  const [isPeticaoDialogOpen, setIsPeticaoDialogOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const timelineItemsPerPage = 10;

  // P2.3 - Buscar detalhes do processo
  const {
    data: processo,
    isLoading: processoLoading,
    error: processoError,
  } = useQuery({
    queryKey: ["processo", cnj],
    queryFn: async () => {
      if (!cnj) throw new Error("CNJ não fornecido");

      const { data, error } = await supabase
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
              cpfcnpj,
              whatsapp
            )
          ),
          advogados_processos (
            advogados (
              nome,
              oab
            )
          )
        `)
        .eq("numero_cnj", cnj)
        .single();

      if (error) throw error;

      return {
        ...data,
        cliente: data.clientes_processos[0]?.clientes,
        responsavel: data.advogados_processos[0]?.advogados,
      } as ProcessoDetalhes;
    },
    enabled: !!cnj,
  });

  // P2.3 - Timeline com paginação
  const {
    data: timelineData = { data: [], total: 0, totalPages: 0 },
    isLoading: timelineLoading,
  } = useQuery({
    queryKey: ["timeline", cnj, timelinePage],
    queryFn: async () => {
      if (!cnj) throw new Error("CNJ não fornecido");

      const startIndex = (timelinePage - 1) * timelineItemsPerPage;
      
      const { data, error, count } = await supabase
        .from("vw_timeline_processo")
        .select("*", { count: "exact" })
        .eq("numero_cnj", cnj)
        .order("data", { ascending: false })
        .range(startIndex, startIndex + timelineItemsPerPage - 1);

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / timelineItemsPerPage),
      };
    },
    enabled: !!cnj,
  });

  // P2.3 - Chat do processo (thread_links → ai_messages)
  const {
    data: chatMessages = [],
    isLoading: chatLoading,
  } = useQuery({
    queryKey: ["chat", cnj],
    queryFn: async () => {
      if (!cnj) return [];

      // Buscar thread_link do processo
      const { data: threadLink } = await supabase
        .from("thread_links")
        .select("id")
        .eq("numero_cnj", cnj)
        .eq("context_type", "processo")
        .single();

      if (!threadLink) return [];

      // Buscar mensagens da thread
      const { data: messages, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("thread_link_id", threadLink.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return messages || [];
    },
    enabled: !!cnj,
  });

  // P2.3 - Documentos/Peças recentes
  const {
    data: documentosRecentes = [],
  } = useQuery({
    queryKey: ["documentos-recentes", cnj],
    queryFn: async () => {
      if (!cnj) return [];

      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .eq("numero_cnj", cnj)
        .order("created_at", { ascending: false })
        .limit(5);

      const { data: peticoes } = await supabase
        .from("peticoes")
        .select("*")
        .eq("numero_cnj", cnj)
        .order("created_at", { ascending: false })
        .limit(5);

      return [...(docs || []), ...(peticoes || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 5);
    },
    enabled: !!cnj,
  });

  // P2.3 - Enviar mensagem no chat
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!cnj || !message.trim()) return;

      // Buscar ou criar thread_link
      let { data: threadLink } = await supabase
        .from("thread_links")
        .select("id")
        .eq("numero_cnj", cnj)
        .eq("context_type", "processo")
        .single();

      if (!threadLink) {
        const { data: newThreadLink, error } = await supabase
          .from("thread_links")
          .insert([{
            numero_cnj: cnj,
            context_type: "processo",
            cliente_cpfcnpj: processo?.cliente?.cpfcnpj,
          }])
          .select()
          .single();

        if (error) throw error;
        threadLink = newThreadLink;
      }

      // Inserir mensagem
      const { data, error } = await supabase
        .from("ai_messages")
        .insert([{
          thread_link_id: threadLink.id,
          content: message,
          sender_type: "user",
        }])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", cnj] });
      setChatMessage("");
      toast({
        title: "Mensagem enviada",
        description: "Sua mensagem foi enviada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar mensagem",
        variant: "destructive",
      });
    },
  });

  // P2.3 - Atalhos (+ Andamento, + Publicação, + Petição)
  const adicionarAndamentoMutation = useMutation({
    mutationFn: async (data: { tipo: string; conteudo: string; data: string }) => {
      const { error } = await supabase
        .from("timeline")
        .insert([{
          numero_cnj: cnj,
          tipo: data.tipo,
          conteudo: data.conteudo,
          data: data.data,
        }]);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timeline", cnj] });
      setIsAndamentoDialogOpen(false);
      toast({
        title: "Andamento adicionado",
        description: "Novo andamento registrado no processo",
      });
    },
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

  if (processoError) {
    return (
      <div className="space-y-6 p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Erro ao carregar processo</h3>
              <p className="text-neutral-600 mb-4">{processoError.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (processoLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-700)' }} />
        <span className="ml-2 text-neutral-600">Carregando processo...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold">
            {processo ? formatCNJ(processo.numero_cnj) : "Processo"}
          </h1>
          <p className="text-neutral-600 mt-1">
            {processo?.titulo_polo_ativo} x {processo?.titulo_polo_passivo}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* P2.3 - Atalhos */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAndamentoDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Andamento
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPublicacaoDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Publicação
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPeticaoDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Petição
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* P2.3 - Coluna A (principal): Timeline + Chat */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Timeline ({timelineData.total} eventos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2 text-neutral-600">Carregando timeline...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {timelineData.data.map((item, index) => (
                    <div key={item.id || index} className="flex gap-4 pb-4 border-b border-neutral-100 last:border-0">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full mt-2"
                           style={{ backgroundColor: 'var(--brand-700)' }} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">{item.tipo}</span>
                          <span className="text-xs text-neutral-500">
                            {formatDate(item.data)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-700 leading-relaxed">
                          {item.conteudo}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Paginação do Timeline */}
                  {timelineData.totalPages > 1 && (
                    <div className="flex items-center justify-between pt-4">
                      <p className="text-sm text-neutral-600">
                        Página {timelinePage} de {timelineData.totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTimelinePage(timelinePage - 1)}
                          disabled={timelinePage === 1}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTimelinePage(timelinePage + 1)}
                          disabled={timelinePage === timelineData.totalPages}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Chat */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Chat do Processo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mensagens */}
                <div className="max-h-64 overflow-y-auto space-y-3">
                  {chatLoading ? (
                    <div className="text-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    </div>
                  ) : chatMessages.length === 0 ? (
                    <div className="text-center py-4 text-neutral-500">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                      <p>Nenhuma mensagem ainda</p>
                      <p className="text-sm">Inicie uma conversa sobre este processo</p>
                    </div>
                  ) : (
                    chatMessages.map((message) => (
                      <div key={message.id} className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs px-3 py-2 rounded-lg ${
                          message.sender_type === 'user' 
                            ? 'text-white' 
                            : 'bg-neutral-100 text-neutral-900'
                        }`}
                        style={message.sender_type === 'user' ? { backgroundColor: 'var(--brand-700)' } : {}}>
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-75 mt-1">
                            {formatDate(message.created_at)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Input de mensagem */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Digite sua mensagem..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        chatMutation.mutate(chatMessage);
                      }
                    }}
                  />
                  <Button
                    onClick={() => chatMutation.mutate(chatMessage)}
                    disabled={!chatMessage.trim() || chatMutation.isPending}
                    style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}
                  >
                    {chatMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* P2.3 - Coluna B: Resumo, Documentos, Atalhos */}
        <div className="space-y-6">
          {/* Resumo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-neutral-600">Cliente</label>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm">{processo?.cliente?.nome || "Não informado"}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600">Tribunal</label>
                <div className="flex items-center gap-2 mt-1">
                  <Building className="w-4 h-4 text-neutral-400" />
                  <span className="text-sm">{processo?.tribunal_sigla || "Não informado"}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600">Responsável</label>
                <div className="mt-1">
                  {processo?.responsavel ? (
                    <Badge style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}>
                      {processo.responsavel.nome} (OAB {processo.responsavel.oab})
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Sem responsável</Badge>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-neutral-600">Partes</label>
                <div className="text-sm mt-1">
                  <div><strong>Polo Ativo:</strong> {processo?.titulo_polo_ativo || "Não informado"}</div>
                  <div><strong>Polo Passivo:</strong> {processo?.titulo_polo_passivo || "Não informado"}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentos/Peças Recentes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documentos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {documentosRecentes.length === 0 ? (
                <div className="text-center py-4 text-neutral-500">
                  <FileTextIcon className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                  <p className="text-sm">Nenhum documento</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documentosRecentes.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 p-2 rounded hover:bg-neutral-50">
                      <FileTextIcon className="w-4 h-4 text-neutral-400" />
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">
                          {doc.file_name || doc.tipo || "Documento"}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatDate(doc.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs dos Atalhos */}
      <Dialog open={isAndamentoDialogOpen} onOpenChange={setIsAndamentoDialogOpen}>
        <DialogContent>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target as HTMLFormElement);
            adicionarAndamentoMutation.mutate({
              tipo: "Andamento Manual",
              conteudo: formData.get("conteudo") as string,
              data: formData.get("data") as string,
            });
          }}>
            <DialogHeader>
              <DialogTitle>Adicionar Andamento</DialogTitle>
              <DialogDescription>
                Registre um novo andamento para este processo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Data</label>
                <Input name="data" type="date" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Descrição</label>
                <Textarea name="conteudo" placeholder="Descreva o andamento..." required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAndamentoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={adicionarAndamentoMutation.isPending}>
                {adicionarAndamentoMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
