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
  CheckCircle,
  ArrowRight,
  Zap,
  Hash,
  MessageCircle,
  Activity,
  Link2,
  AlertTriangle,
  Upload,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { supabase, lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatDate } from "../lib/utils";
import { advogaAIToolsClient, ToolRequest } from "../lib/advogaai-tools";

interface ThreadLink {
  id: string;
  numero_cnj: string;
  context_type: string;
  properties: any;
  created_at: string;
  updated_at?: string;
}

interface AiMessage {
  id: string;
  thread_link_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: any;
  created_at: string;
  attachments?: any[];
}

interface ProcessoChatMultiThreadProps {
  numero_cnj: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: string;
  description: string;
  template: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'criar_tarefa',
    label: 'Criar Tarefa',
    icon: <Target className="w-4 h-4" />,
    action: 'CREATE_TASK',
    description: 'Criar nova tarefa relacionada ao processo',
    template: 'Criar uma nova tarefa para: [DESCRIÇÃO]. Prazo: [DATA]. Responsável: [PESSOA].'
  },
  {
    id: 'vincular_ticket',
    label: 'Vincular Ticket',
    icon: <Link2 className="w-4 h-4" />,
    action: 'LINK_TICKET',
    description: 'Vincular ticket existente ou criar novo',
    template: 'Vincular ticket #[NÚMERO] ou criar novo ticket sobre: [ASSUNTO].'
  },
  {
    id: 'solicitar_documento',
    label: 'Solicitar Documento',
    icon: <FileText className="w-4 h-4" />,
    action: 'REQUEST_DOCUMENT',
    description: 'Solicitar documento específico',
    template: 'Solicitar documento: [TIPO]. Justificativa: [MOTIVO]. Prazo: [DATA].'
  },
  {
    id: 'concluir_etapa',
    label: 'Concluir Etapa',
    icon: <CheckCircle className="w-4 h-4" />,
    action: 'COMPLETE_STEP',
    description: 'Marcar etapa processual como concluída',
    template: 'Concluir etapa: [NOME DA ETAPA]. Observações: [DETALHES].'
  }
];

export default function ProcessoChatMultiThread({
  numero_cnj,
  isOpen,
  onClose,
  className,
}: ProcessoChatMultiThreadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [isNovaConversaOpen, setIsNovaConversaOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isExecutingQuickAction, setIsExecutingQuickAction] = useState(false);

  // State for new thread creation
  const [newThreadData, setNewThreadData] = useState({
    titulo: '',
    canal: 'analise',
    tipo: 'geral'
  });

  // Query threads do processo
  const { data: threads = [], refetch: refetchThreads } = useQuery({
    queryKey: ["thread-links", numero_cnj],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thread_links")
        .select("*")
        .eq("properties->>numero_cnj", numero_cnj)
        .order("updated_at", { ascending: false });

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

  // Query contexto do processo
  const { data: contextoProcesso } = useQuery({
    queryKey: ["contexto-processo", numero_cnj],
    queryFn: async () => {
      const [processo, movimentacoes, publicacoes, tarefas, eventos] = await Promise.all([
        supabase.from("processos").select("*").eq("numero_cnj", numero_cnj).single(),
        supabase.from("movimentacoes").select("*").eq("numero_cnj", numero_cnj).order("data_movimentacao", { ascending: false }).limit(5),
        supabase.from("vw_publicacoes_unificadas").select("*").eq("numero_cnj", numero_cnj).order("occured_at", { ascending: false }).limit(5),
        lf.from("activities").select("*").eq("numero_cnj", numero_cnj).in("status", ["pending", "in_progress"]).limit(10),
        lf.from("eventos_agenda").select("*").eq("numero_cnj", numero_cnj).gte("scheduled_at", new Date().toISOString()).limit(5)
      ]);

      return {
        processo: processo.data,
        ultimasMovimentacoes: movimentacoes.data || [],
        ultimasPublicacoes: publicacoes.data || [],
        tarefasAbertas: tarefas.data || [],
        eventosProximos: eventos.data || [],
      };
    },
    enabled: isOpen,
  });

  // Mutation para criar nova thread
  const criarThreadMutation = useMutation({
    mutationFn: async ({ titulo, canal, tipo }: { titulo: string; canal: string; tipo: string }) => {
      const { data, error } = await supabase
        .from("thread_links")
        .insert({
          numero_cnj,
          context_type: tipo,
          properties: {
            numero_cnj,
            titulo,
            canal,
            tipo,
            contexto: contextoProcesso,
            criado_em: new Date().toISOString(),
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
      setNewThreadData({ titulo: '', canal: 'analise', tipo: 'geral' });
      toast({
        title: "Nova conversa criada",
        description: `Thread "${novoThread.properties.titulo}" criada com sucesso`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar thread",
        variant: "destructive",
      });
    },
  });

  // Mutation para enviar mensagem
  const enviarMensagemMutation = useMutation({
    mutationFn: async ({
      content,
      thread_id,
      attachments = [],
    }: {
      content: string;
      thread_id: string;
      attachments?: any[];
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
            attachments,
          },
          attachments,
        })
        .select()
        .single();

      if (userError) throw userError;

      // Atualizar timestamp da thread
      await supabase
        .from("thread_links")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", thread_id);

      // Simular resposta da IA baseada no contexto
      let respostaIA = "Entendi sua mensagem. Como posso ajudar com este processo?";
      
      // Análise básica do conteúdo para gerar resposta mais inteligente
      const contentLower = content.toLowerCase();
      if (contentLower.includes('tarefa') || contentLower.includes('criar')) {
        respostaIA = `Vou ajudar você a criar uma tarefa para o processo ${numero_cnj}. Posso executar esta ação através dos AdvogaAI Tools. Confirma a criação da tarefa?`;
      } else if (contentLower.includes('documento') || contentLower.includes('solicitar')) {
        respostaIA = `Entendo que você precisa solicitar um documento. Posso ajudar a formalizar esta solicitação e criar os registros necessários no sistema.`;
      } else if (contentLower.includes('prazo') || contentLower.includes('data')) {
        respostaIA = `Vou verificar os prazos relacionados a este processo. Com base nas últimas movimentações, posso calcular os próximos vencimentos importantes.`;
      } else if (contentLower.includes('análise') || contentLower.includes('analisar')) {
        respostaIA = `Posso realizar uma análise detalhada do processo usando os AdvogaAI Tools. Que tipo de análise você gostaria: timeline, riscos, estratégia ou precedentes?`;
      }

      const { data: aiMessage, error: aiError } = await supabase
        .from("ai_messages")
        .insert({
          thread_link_id: thread_id,
          role: "assistant",
          content: respostaIA,
          metadata: {
            model: "advoga-ai-v2",
            tokens_used: 180,
            timestamp: new Date().toISOString(),
            context_used: true,
          },
        })
        .select()
        .single();

      if (aiError) throw aiError;

      return { userMessage, aiMessage };
    },
    onSuccess: () => {
      refetchMessages();
      refetchThreads(); // Para atualizar o timestamp
      setNewMessage("");
      setSelectedFiles([]);
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

  // Mutation para executar quick actions
  const executeQuickActionMutation = useMutation({
    mutationFn: async ({ action, content, thread_id }: { action: string; content: string; thread_id: string }) => {
      setIsExecutingQuickAction(true);
      
      let result = null;
      
      switch (action) {
        case 'CREATE_TASK':
          result = await lf.from("activities").insert({
            numero_cnj,
            title: `Tarefa criada via chat`,
            description: content,
            status: "pending",
            due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
            metadata: {
              created_via: "chat",
              thread_id,
              quick_action: true,
            },
          }).select().single();
          break;
          
        case 'LINK_TICKET':
          // Simulação de criação/vinculação de ticket
          result = await lf.from("ticket_threads").insert({
            thread_link_id: thread_id,
            created_at: new Date().toISOString(),
          });
          break;
          
        case 'REQUEST_DOCUMENT':
          result = await lf.from("activities").insert({
            numero_cnj,
            title: `Solicitação de documento`,
            description: content,
            status: "pending",
            activity_type: "document_request",
            metadata: {
              created_via: "chat",
              thread_id,
              quick_action: true,
              document_request: true,
            },
          }).select().single();
          break;
          
        case 'COMPLETE_STEP':
          result = await lf.from("activities").insert({
            numero_cnj,
            title: `Etapa concluída`,
            description: content,
            status: "completed",
            completed_at: new Date().toISOString(),
            metadata: {
              created_via: "chat",
              thread_id,
              quick_action: true,
              step_completion: true,
            },
          }).select().single();
          break;
      }
      
      // Registrar a ação executada como mensagem do sistema
      await supabase.from("ai_messages").insert({
        thread_link_id: thread_id,
        role: "system",
        content: `Ação executada: ${action}. ${content}`,
        metadata: {
          action_type: action,
          result,
          timestamp: new Date().toISOString(),
        },
      });
      
      return result;
    },
    onSuccess: (result, variables) => {
      setIsExecutingQuickAction(false);
      refetchMessages();
      
      const actionLabels = {
        'CREATE_TASK': 'Tarefa criada',
        'LINK_TICKET': 'Ticket vinculado',
        'REQUEST_DOCUMENT': 'Documento solicitado',
        'COMPLETE_STEP': 'Etapa concluída',
      };
      
      toast({
        title: actionLabels[variables.action as keyof typeof actionLabels] || "Ação executada",
        description: "Quick action executada com sucesso via AdvogaAI Tools",
      });
    },
    onError: (error: any) => {
      setIsExecutingQuickAction(false);
      toast({
        title: "Erro na execução",
        description: error.message || "Erro ao executar quick action",
        variant: "destructive",
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
      attachments: selectedFiles.map(file => ({
        name: file.name,
        size: file.size,
        type: file.type,
      })),
    });
  };

  const handleQuickAction = (action: QuickAction) => {
    if (!activeThreadId) return;
    setNewMessage(action.template);
  };

  const handleExecuteQuickAction = (actionId: string) => {
    if (!activeThreadId || !newMessage.trim()) return;
    
    executeQuickActionMutation.mutate({
      action: actionId,
      content: newMessage.trim(),
      thread_id: activeThreadId,
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviarMensagem();
    }
  };

  const getThreadTitle = (thread: ThreadLink) => {
    return thread.properties?.titulo || `Conversa ${formatDate(thread.created_at)}`;
  };

  const getThreadChannel = (thread: ThreadLink) => {
    return thread.properties?.canal || thread.context_type || 'geral';
  };

  const getLastMessage = (thread: ThreadLink) => {
    // Implementar busca da última mensagem por thread
    return "Última mensagem...";
  };

  const renderMessage = (message: AiMessage) => {
    const isUser = message.role === "user";
    const isSystem = message.role === "system";

    if (isSystem) {
      return (
        <div key={message.id} className="mb-4">
          <div className="flex items-center justify-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-sm text-yellow-800">
              <Activity className="w-4 h-4 inline mr-2" />
              {message.content}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={message.id}
        className={`flex gap-3 mb-4 ${isUser ? "justify-end" : "justify-start"}`}
      >
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
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
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 pt-2 border-t border-opacity-20 border-white">
                {message.attachments.map((attachment, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs opacity-80">
                    <Paperclip className="w-3 h-3" />
                    {attachment.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            {formatDate(message.created_at)}
            {message.metadata?.model && (
              <span className="ml-2">• {message.metadata.model}</span>
            )}
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
    <div className={`fixed inset-y-0 right-0 w-[500px] bg-white border-l border-neutral-200 shadow-xl z-50 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 bg-neutral-50">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            Chat Multi-thread
          </h3>
          <p className="text-sm text-neutral-600">
            {numero_cnj} • {threads.length} thread{threads.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Thread Tabs */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="flex items-center gap-2 p-3 overflow-x-auto scrollbar-thin">
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => setActiveThreadId(thread.id)}
              className={`flex-shrink-0 min-w-[180px] p-3 text-left rounded-lg border transition-all ${
                activeThreadId === thread.id
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              <div className="font-medium text-sm truncate">
                {getThreadTitle(thread)}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-xs ${activeThreadId === thread.id ? 'border-white/30 text-white/80' : ''}`}>
                  <Hash className="w-3 h-3 mr-1" />
                  {getThreadChannel(thread)}
                </Badge>
              </div>
              <div className="text-xs opacity-70 mt-1 truncate">
                {formatDate(thread.updated_at || thread.created_at)}
              </div>
            </button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsNovaConversaOpen(true)}
            className="flex-shrink-0 h-[80px] w-[60px] flex flex-col items-center justify-center"
          >
            <Plus className="w-4 h-4 mb-1" />
            <span className="text-xs">Nova</span>
          </Button>
        </div>
      </div>

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
              <p className="text-neutral-500 mb-4">Thread vazio</p>
              <p className="text-sm text-neutral-400">
                Digite uma mensagem para começar a conversa neste thread
              </p>
            </div>
          )
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto text-neutral-300 mb-4" />
            <p className="text-neutral-500 mb-4">Selecione um thread</p>
            <Button onClick={() => setIsNovaConversaOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Thread
            </Button>
          </div>
        )}
      </div>

      {/* Quick Actions Bar */}
      {activeThreadId && (
        <div className="px-4 py-2 border-t border-neutral-200 bg-neutral-50">
          <div className="flex gap-1 overflow-x-auto">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                size="sm"
                onClick={() => handleQuickAction(action)}
                className="flex-shrink-0 text-xs"
                title={action.description}
              >
                {action.icon}
                <span className="ml-1">{action.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* File Attachments */}
      {selectedFiles.length > 0 && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-1 bg-white rounded px-2 py-1 text-sm">
                <Paperclip className="w-3 h-3" />
                <span className="truncate max-w-[100px]">{file.name}</span>
                <button onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      {activeThreadId && (
        <div className="p-4 border-t border-neutral-200 bg-white">
          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para quebrar linha)"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="min-h-[80px] resize-none"
                disabled={isSending || isExecutingQuickAction}
              />
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSending}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              
              <Button
                onClick={handleEnviarMensagem}
                disabled={!newMessage.trim() || isSending || isExecutingQuickAction}
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!newMessage.trim() || isExecutingQuickAction}
                  >
                    {isExecutingQuickAction ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Executar Ação</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {QUICK_ACTIONS.map((action) => (
                    <DropdownMenuItem
                      key={action.id}
                      onClick={() => handleExecuteQuickAction(action.action)}
                    >
                      {action.icon}
                      <span className="ml-2">{action.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {contextoProcesso ? "Contexto OK" : "Carregando..."}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                AdvogaAI v2
              </Badge>
            </div>
            {activeThreadId && (
              <div className="text-xs text-neutral-500">
                Thread ID: {activeThreadId.slice(-8)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dialog Nova Conversa */}
      <Dialog open={isNovaConversaOpen} onOpenChange={setIsNovaConversaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Thread de Conversa</DialogTitle>
            <DialogDescription>
              Criar nova thread para organizar conversas por contexto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="titulo">Título do Thread</Label>
              <Input
                value={newThreadData.titulo}
                onChange={(e) => setNewThreadData(prev => ({ ...prev, titulo: e.target.value }))}
                placeholder="Ex: Análise de recursos, Preparação audiência..."
                required
              />
            </div>
            <div>
              <Label htmlFor="canal">Canal</Label>
              <Select 
                value={newThreadData.canal} 
                onValueChange={(value) => setNewThreadData(prev => ({ ...prev, canal: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analise">📊 Análise</SelectItem>
                  <SelectItem value="estrategia">🎯 Estratégia</SelectItem>
                  <SelectItem value="documentos">📄 Documentos</SelectItem>
                  <SelectItem value="prazos">⏰ Prazos</SelectItem>
                  <SelectItem value="colaboracao">👥 Colaboração</SelectItem>
                  <SelectItem value="geral">💬 Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="tipo">Tipo de Contexto</Label>
              <Select 
                value={newThreadData.tipo} 
                onValueChange={(value) => setNewThreadData(prev => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="analise_juridica">Análise Jurídica</SelectItem>
                  <SelectItem value="estrategia_processual">Estratégia Processual</SelectItem>
                  <SelectItem value="documentos_peticoes">Documentos e Petições</SelectItem>
                  <SelectItem value="prazos_agendamentos">Prazos e Agendamentos</SelectItem>
                  <SelectItem value="colaboracao_equipe">Colaboração de Equipe</SelectItem>
                  <SelectItem value="geral">Conversa Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNovaConversaOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              onClick={() => criarThreadMutation.mutate(newThreadData)}
              disabled={criarThreadMutation.isPending || !newThreadData.titulo.trim()}
            >
              {criarThreadMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Criar Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
