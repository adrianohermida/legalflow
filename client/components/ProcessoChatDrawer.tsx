import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Send,
  Paperclip,
  X,
  Plus,
  Loader2,
  Target,
  Calendar,
  FileText,
  Settings,
  User,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatDate } from "../lib/utils";

interface ThreadLink {
  id: string;
  numero_cnj: string;
  context_type: string;
  properties: any;
  created_at: string;
}

interface AiMessage {
  id: string;
  thread_link_id: string;
  role: "user" | "assistant";
  content: string;
  metadata: any;
  created_at: string;
}

interface ProcessoChatDrawerProps {
  numero_cnj: string;
  isOpen: boolean;
  onClose: () => void;
  onNovaConversa?: () => void;
}

export default function ProcessoChatDrawer({
  numero_cnj,
  isOpen,
  onClose,
  onNovaConversa,
}: ProcessoChatDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isNovaConversaOpen, setIsNovaConversaOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Query threads do processo
  const { data: threads = [], refetch: refetchThreads } = useQuery({
    queryKey: ["thread-links", numero_cnj],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thread_links")
        .select("*")
        .eq("properties->>numero_cnj", numero_cnj)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ThreadLink[];
    },
    enabled: isOpen,
  });

  // Query mensagens do thread ativo
  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useQuery({
    queryKey: ["ai-messages", activeThreadId],
    queryFn: async () => {
      if (!activeThreadId) return [];

      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("thread_link_id", activeThreadId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as AiMessage[];
    },
    enabled: !!activeThreadId,
  });

  // Query contexto do processo para IA
  const { data: contextoProcesso } = useQuery({
    queryKey: ["contexto-processo", numero_cnj],
    queryFn: async () => {
      // Buscar dados básicos do processo
      const { data: processo } = await supabase
        .from("processos")
        .select("*")
        .eq("numero_cnj", numero_cnj)
        .single();

      // Buscar últimas movimentações
      const { data: ultimasMovimentacoes } = await supabase
        .from("movimentacoes")
        .select("*")
        .eq("numero_cnj", numero_cnj)
        .order("data_movimentacao", { ascending: false })
        .limit(10);

      // Buscar últimas publicações
      const { data: ultimasPublicacoes } = await supabase
        .from("vw_publicacoes_unificadas")
        .select("*")
        .eq("numero_cnj", numero_cnj)
        .order("occured_at", { ascending: false })
        .limit(10);

      // Buscar tarefas abertas
      const { data: tarefasAbertas } = await supabase
        .from("activities")
        .select("*")
        .eq("numero_cnj", numero_cnj)
        .in("status", ["pending", "in_progress"])
        .order("due_at", { ascending: true });

      // Buscar eventos próximos
      const { data: eventosProximos } = await supabase
        .from("eventos_agenda")
        .select("*")
        .eq("numero_cnj", numero_cnj)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(5);

      return {
        processo,
        ultimasMovimentacoes: ultimasMovimentacoes || [],
        ultimasPublicacoes: ultimasPublicacoes || [],
        tarefasAbertas: tarefasAbertas || [],
        eventosProximos: eventosProximos || [],
      };
    },
    enabled: isOpen,
  });

  // Mutation para criar nova conversa
  const criarConversaMutation = useMutation({
    mutationFn: async ({ titulo, tipo }: { titulo: string; tipo: string }) => {
      const { data, error } = await supabase
        .from("thread_links")
        .insert({
          numero_cnj,
          context_type: tipo,
          properties: {
            numero_cnj,
            titulo,
            contexto: contextoProcesso,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (novoThread) => {
      refetchThreads();
      setActiveThreadId(novoThread.id);
      setIsNovaConversaOpen(false);
      toast({
        title: "Nova conversa criada",
        description: "Conversa criada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar conversa",
        variant: "destructive",
      });
    },
  });

  // Mutation para enviar mensagem
  const enviarMensagemMutation = useMutation({
    mutationFn: async ({
      content,
      thread_id,
    }: {
      content: string;
      thread_id: string;
    }) => {
      // Inserir mensagem do usuário
      const { data: userMessage, error: userError } = await supabase
        .from("ai_messages")
        .insert({
          thread_link_id: thread_id,
          role: "user",
          content,
          metadata: {
            contexto_processo: contextoProcesso,
            timestamp: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (userError) throw userError;

      // Simular resposta da IA
      // Em produção, aqui seria feita a chamada para a API do agente
      const respostaIA = `Entendi sua mensagem sobre o processo ${numero_cnj}. Com base no contexto atual, posso ajudar com análise das movimentações, criação de tarefas, agendamento de eventos e solicitação de documentos. Como posso auxiliar especificamente?`;

      const { data: aiMessage, error: aiError } = await supabase
        .from("ai_messages")
        .insert({
          thread_link_id: thread_id,
          role: "assistant",
          content: respostaIA,
          metadata: {
            model: "advoga-ai-v1",
            tokens_used: 150,
            timestamp: new Date().toISOString(),
          },
        })
        .select()
        .single();

      if (aiError) throw aiError;

      return { userMessage, aiMessage };
    },
    onSuccess: () => {
      refetchMessages();
      setNewMessage("");
      setIsSending(false);
    },
    onError: (error: any) => {
      setIsSending(false);
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar mensagem",
        variant: "destructive",
      });
    },
  });

  // Mutation para criar tarefa via IA
  const criarTarefaViaMutation = useMutation({
    mutationFn: async ({
      titulo,
      descricao,
      due_date,
    }: {
      titulo: string;
      descricao: string;
      due_date: string;
    }) => {
      const { data, error } = await supabase.from("activities").insert({
        numero_cnj,
        title: titulo,
        description: descricao,
        due_at: due_date,
        status: "pending",
        metadata: {
          created_via: "chat",
          thread_id: activeThreadId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Tarefa criada",
        description: "Nova tarefa criada via chat",
      });
    },
  });

  // Auto scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Selecionar primeiro thread automaticamente
  useEffect(() => {
    if (threads.length > 0 && !activeThreadId) {
      setActiveThreadId(threads[0].id);
    }
  }, [threads, activeThreadId]);

  const handleEnviarMensagem = () => {
    if (!newMessage.trim() || !activeThreadId || isSending) return;

    setIsSending(true);
    enviarMensagemMutation.mutate({
      content: newMessage.trim(),
      thread_id: activeThreadId,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviarMensagem();
    }
  };

  const getThreadTitle = (thread: ThreadLink) => {
    return (
      thread.properties?.titulo || `Conversa ${formatDate(thread.created_at)}`
    );
  };

  const renderMessage = (message: AiMessage) => {
    const isUser = message.role === "user";

    return (
      <div
        key={message.id}
        className={`flex gap-3 mb-4 ${isUser ? "justify-end" : "justify-start"}`}
      >
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-white" />
          </div>
        )}

        <div className={`max-w-[70%] ${isUser ? "order-first" : ""}`}>
          <div
            className={`rounded-lg px-4 py-3 ${
              isUser
                ? "bg-blue-600 text-white"
                : "bg-white border border-neutral-200"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {formatDate(message.created_at)}
          </p>
        </div>

        {isUser && (
          <div className="w-8 h-8 rounded-full bg-neutral-600 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-neutral-200 shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200">
        <div>
          <h3 className="font-semibold">Chats do Processo</h3>
          <p className="text-sm text-neutral-600">{numero_cnj}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Thread Tabs */}
      {threads.length > 0 ? (
        <div className="border-b border-neutral-200">
          <div className="flex items-center gap-2 p-4 overflow-x-auto">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                className={`flex-shrink-0 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  activeThreadId === thread.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {getThreadTitle(thread)}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNovaConversaOpen(true)}
              className="flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-neutral-200">
          <Button
            onClick={() => setIsNovaConversaOpen(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Conversa
          </Button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-neutral-50">
        {activeThreadId ? (
          messagesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
            </div>
          ) : messages.length > 0 ? (
            <div>
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
              <p className="text-neutral-500 mb-4">Nenhuma mensagem ainda</p>
              <p className="text-sm text-neutral-400">
                Digite uma mensagem para começar a conversa
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
            <p className="text-neutral-500 mb-4">Selecione uma conversa</p>
            <Button onClick={() => setIsNovaConversaOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conversa
            </Button>
          </div>
        )}
      </div>

      {/* Composer */}
      {activeThreadId && (
        <div className="p-4 border-t border-neutral-200 bg-white">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="min-h-[60px] resize-none"
                disabled={isSending}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleEnviarMensagem}
                disabled={!newMessage.trim() || isSending}
                size="sm"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setNewMessage(
                        "Crie uma nova tarefa para revisar as últimas movimentações deste processo.",
                      );
                    }}
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Criar Tarefa
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setNewMessage(
                        "Agende um compromisso relacionado a este processo.",
                      );
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Agendar Evento
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setNewMessage(
                        "Solicite um documento específico para este processo.",
                      );
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Solicitar Documento
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              {contextoProcesso
                ? "Contexto carregado"
                : "Carregando contexto..."}
            </Badge>
            <Badge variant="outline" className="text-xs">
              IA: AdvogaAI v1
            </Badge>
          </div>
        </div>
      )}

      {/* Dialog Nova Conversa */}
      <Dialog open={isNovaConversaOpen} onOpenChange={setIsNovaConversaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
            <DialogDescription>
              Crie uma nova conversa para este processo
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              criarConversaMutation.mutate({
                titulo: formData.get("titulo") as string,
                tipo: formData.get("tipo") as string,
              });
            }}
          >
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="titulo">Título da Conversa</Label>
                <Input
                  name="titulo"
                  placeholder="Ex: Análise de recursos, Preparação para audiência..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="tipo">Tipo de Conversa</Label>
                <select
                  name="tipo"
                  className="w-full p-2 border border-neutral-200 rounded-md"
                  required
                >
                  <option value="analise">Análise Jurídica</option>
                  <option value="estrategia">Estratégia Processual</option>
                  <option value="documentos">Documentos e Petições</option>
                  <option value="prazos">Prazos e Agendamentos</option>
                  <option value="geral">Conversa Geral</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNovaConversaOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={criarConversaMutation.isPending}>
                {criarConversaMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Criar Conversa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
