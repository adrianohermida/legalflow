import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  MessageSquare,
  Plus,
  Send,
  Paperclip,
  MoreHorizontal,
  Loader2,
  CheckCircle,
  AlertTriangle,
  X,
  Minimize2,
  Maximize2,
  Hash,
  Clock,
  User,
  Bot,
  Link2,
  FileText,
  Calendar,
  ChevronDown,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface ProcessChatProps {
  numeroCnj: string;
  className?: string;
}

interface Thread {
  thread_id: string;
  title: string;
  channel: string;
  status: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_at?: string;
  message_count: number;
  quick_actions: QuickAction[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments: any[];
  metadata: Record<string, any>;
  created_at: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: string;
}

export function ProcessChatMultithread({ numeroCnj, className = "" }: ProcessChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isNewThreadDialogOpen, setIsNewThreadDialogOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [isQuickActionDialogOpen, setIsQuickActionDialogOpen] = useState(false);
  const [selectedQuickAction, setSelectedQuickAction] = useState<QuickAction | null>(null);
  const [quickActionData, setQuickActionData] = useState<Record<string, string>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar threads do processo
  const {
    data: threadsData,
    isLoading: threadsLoading,
    refetch: refetchThreads
  } = useQuery({
    queryKey: ["process-threads", numeroCnj],
    queryFn: async () => {
      const { data, error } = await lf.rpc('sf2_get_process_threads', {
        p_numero_cnj: numeroCnj
      });
      if (error) throw error;
      return data;
    },
    enabled: !!numeroCnj,
  });

  const threads: Thread[] = threadsData?.threads || [];

  // Buscar mensagens da thread ativa
  const {
    data: messagesData,
    isLoading: messagesLoading,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ["thread-messages", activeThreadId],
    queryFn: async () => {
      if (!activeThreadId) return null;
      const { data, error } = await lf.rpc('sf2_get_thread_messages', {
        p_thread_id: activeThreadId,
        p_limit: 100
      });
      if (error) throw error;
      return data;
    },
    enabled: !!activeThreadId,
  });

  const messages: Message[] = messagesData?.messages || [];

  // Auto-scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Selecionar primeira thread automaticamente
  useEffect(() => {
    if (threads.length > 0 && !activeThreadId) {
      setActiveThreadId(threads[0].thread_id);
    }
  }, [threads, activeThreadId]);

  // Mutation para criar nova thread
  const createThreadMutation = useMutation({
    mutationFn: async (title: string) => {
      const { data, error } = await lf.rpc('sf2_create_process_chat_thread', {
        p_numero_cnj: numeroCnj,
        p_title: title,
        p_channel: 'chat'
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      refetchThreads();
      setActiveThreadId(data.thread_id);
      setIsNewThreadDialogOpen(false);
      setNewThreadTitle("");
      toast({
        title: "Thread criada",
        description: `Nova conversa "${data.title}" criada com sucesso`,
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
  const sendMessageMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      const { data, error } = await lf.rpc('sf2_add_thread_message', {
        p_thread_id: threadId,
        p_role: 'user',
        p_content: content,
        p_attachments: [],
        p_metadata: {}
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchMessages();
      setNewMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar mensagem",
        variant: "destructive",
      });
    },
  });

  // Mutation para quick actions
  const quickActionMutation = useMutation({
    mutationFn: async (actionData: any) => {
      switch (actionData.action) {
        case 'create_task':
          const { data: taskData, error: taskError } = await lf.rpc('sf2_quick_action_create_task', {
            p_thread_id: activeThreadId,
            p_task_title: actionData.title,
            p_task_description: actionData.description,
            p_due_date: actionData.due_date
          });
          if (taskError) throw taskError;
          return taskData;
          
        case 'link_ticket':
          const { data: ticketData, error: ticketError } = await lf.rpc('sf2_quick_action_link_ticket', {
            p_thread_id: activeThreadId,
            p_ticket_subject: actionData.subject,
            p_priority: actionData.priority
          });
          if (ticketError) throw ticketError;
          return ticketData;

        case 'request_document':
          const { data: docData, error: docError } = await lf.rpc('sf2_quick_action_request_document', {
            p_thread_id: activeThreadId,
            p_document_name: actionData.document_name,
            p_document_description: actionData.description,
            p_required: actionData.required || true
          });
          if (docError) throw docError;
          return docData;

        case 'complete_stage':
          const { data: stageData, error: stageError } = await lf.rpc('sf2_quick_action_complete_stage', {
            p_thread_id: activeThreadId,
            p_stage_instance_id: actionData.stage_instance_id,
            p_notes: actionData.notes
          });
          if (stageError) throw stageError;
          return stageData;

        case 'advogaai_analysis':
          const { data: analysisData, error: analysisError } = await lf.rpc('sf2_quick_action_advogaai_analysis', {
            p_thread_id: activeThreadId,
            p_analysis_type: actionData.analysis_type || 'general',
            p_context: actionData.context
          });
          if (analysisError) throw analysisError;
          return analysisData;

        case 'start_journey':
          const { data: journeyData, error: journeyError } = await lf.rpc('sf2_quick_action_start_journey', {
            p_thread_id: activeThreadId,
            p_journey_type_id: actionData.journey_type_id,
            p_title: actionData.title
          });
          if (journeyError) throw journeyError;
          return journeyData;

        default:
          throw new Error('Ação não implementada');
      }
    },
    onSuccess: (data) => {
      refetchMessages();
      setIsQuickActionDialogOpen(false);
      setQuickActionData({});
      toast({
        title: "Ação executada",
        description: `${data.action_type} executada com sucesso`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao executar ação",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeThreadId) return;
    sendMessageMutation.mutate({
      threadId: activeThreadId,
      content: newMessage
    });
  };

  const handleQuickAction = (action: QuickAction) => {
    setSelectedQuickAction(action);
    setIsQuickActionDialogOpen(true);
  };

  const executeQuickAction = () => {
    if (!selectedQuickAction || !activeThreadId) return;
    
    const actionData = {
      action: selectedQuickAction.id,
      ...quickActionData
    };
    
    quickActionMutation.mutate(actionData);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'user':
        return <User className="w-3 h-3" />;
      case 'assistant':
        return <Bot className="w-3 h-3" />;
      case 'system':
        return <Hash className="w-3 h-3" />;
      default:
        return <MessageSquare className="w-3 h-3" />;
    }
  };

  if (!isExpanded) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <Button
          onClick={() => setIsExpanded(true)}
          size="lg"
          className="h-12 w-12 rounded-full shadow-lg"
          style={{ backgroundColor: "var(--brand-700)", color: "white" }}
        >
          <MessageSquare className="w-6 h-6" />
        </Button>
        {threads.length > 0 && (
          <Badge 
            className="absolute -top-2 -right-2 bg-red-500 text-white"
          >
            {threads.length}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="w-96 h-[600px] shadow-2xl border-0">
        <CardHeader className="px-4 py-3 bg-brand-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat do Processo
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                onClick={() => setIsExpanded(false)}
              >
                <Minimize2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <p className="text-xs opacity-90">CNJ: {numeroCnj}</p>
        </CardHeader>

        <CardContent className="p-0 h-[calc(100%-80px)] flex flex-col">
          {threadsLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <MessageSquare className="w-12 h-12 text-neutral-300 mb-3" />
              <p className="text-sm text-neutral-600 mb-3">
                Nenhuma conversa iniciada
              </p>
              <Button
                onClick={() => setIsNewThreadDialogOpen(true)}
                size="sm"
                style={{ backgroundColor: "var(--brand-700)", color: "white" }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Iniciar Chat
              </Button>
            </div>
          ) : (
            <Tabs 
              value={activeThreadId || ""} 
              onValueChange={setActiveThreadId}
              className="flex flex-col h-full"
            >
              {/* Thread Tabs */}
              <div className="border-b bg-neutral-50 px-2 py-1">
                <div className="flex items-center gap-1 overflow-x-auto">
                  <TabsList className="h-8 bg-transparent p-0 space-x-1">
                    {threads.map((thread) => (
                      <TabsTrigger
                        key={thread.thread_id}
                        value={thread.thread_id}
                        className="h-7 px-2 text-xs data-[state=active]:bg-white data-[state=active]:shadow-sm"
                      >
                        <span className="truncate max-w-20">
                          {thread.title}
                        </span>
                        {thread.message_count > 0 && (
                          <Badge variant="secondary" className="ml-1 h-4 text-xs">
                            {thread.message_count}
                          </Badge>
                        )}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 flex-shrink-0"
                    onClick={() => setIsNewThreadDialogOpen(true)}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              {threads.map((thread) => (
                <TabsContent
                  key={thread.thread_id}
                  value={thread.thread_id}
                  className="flex-1 flex flex-col h-full m-0 data-[state=active]:flex"
                >
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="text-center text-neutral-500 text-sm">
                        Nenhuma mensagem ainda
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                              message.role === 'user'
                                ? 'bg-brand-700 text-white'
                                : message.role === 'system'
                                ? 'bg-neutral-100 text-neutral-600'
                                : 'bg-neutral-100 text-neutral-800'
                            }`}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              {getRoleIcon(message.role)}
                              <span className="text-xs opacity-75">
                                {formatTime(message.created_at)}
                              </span>
                            </div>
                            <div>{message.content}</div>
                            {message.metadata?.action_type && (
                              <Badge 
                                variant="outline" 
                                className="mt-1 text-xs"
                              >
                                {message.metadata.action_type}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Quick Actions */}
                  {thread.quick_actions && thread.quick_actions.length > 0 && (
                    <div className="border-t bg-neutral-50 p-2">
                      <div className="flex flex-wrap gap-1">
                        {thread.quick_actions.map((action) => (
                          <Button
                            key={action.id}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleQuickAction(action)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Message Input */}
                  <div className="border-t p-3">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          placeholder="Digite sua mensagem..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          className="pr-8"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1 h-6 w-6 p-0"
                        >
                          <Paperclip className="w-3 h-3" />
                        </Button>
                      </div>
                      <Button
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sendMessageMutation.isPending}
                        size="sm"
                        style={{ backgroundColor: "var(--brand-700)", color: "white" }}
                      >
                        {sendMessageMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Dialog para nova thread */}
      <Dialog open={isNewThreadDialogOpen} onOpenChange={setIsNewThreadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Título da conversa
              </label>
              <Input
                placeholder="Ex: Análise do processo, Documentos necessários..."
                value={newThreadTitle}
                onChange={(e) => setNewThreadTitle(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsNewThreadDialogOpen(false);
                  setNewThreadTitle("");
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createThreadMutation.mutate(newThreadTitle || `Chat - ${new Date().toLocaleString('pt-BR')}`)}
                disabled={createThreadMutation.isPending}
                style={{ backgroundColor: "var(--brand-700)", color: "white" }}
              >
                {createThreadMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Criar Conversa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para quick actions */}
      <Dialog open={isQuickActionDialogOpen} onOpenChange={setIsQuickActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedQuickAction?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedQuickAction?.id === 'create_task' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Título da tarefa *
                  </label>
                  <Input
                    placeholder="Descreva a tarefa"
                    value={quickActionData.title || ""}
                    onChange={(e) => setQuickActionData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Descrição (opcional)
                  </label>
                  <Textarea
                    placeholder="Detalhes adicionais"
                    value={quickActionData.description || ""}
                    onChange={(e) => setQuickActionData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Data de vencimento (opcional)
                  </label>
                  <Input
                    type="datetime-local"
                    value={quickActionData.due_date || ""}
                    onChange={(e) => setQuickActionData(prev => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
              </>
            )}

            {selectedQuickAction?.id === 'link_ticket' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Assunto do ticket *
                  </label>
                  <Input
                    placeholder="Descreva o problema ou solicitação"
                    value={quickActionData.subject || ""}
                    onChange={(e) => setQuickActionData(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Prioridade
                  </label>
                  <select
                    className="w-full p-2 border rounded"
                    value={quickActionData.priority || "media"}
                    onChange={(e) => setQuickActionData(prev => ({ ...prev, priority: e.target.value }))}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsQuickActionDialogOpen(false);
                  setQuickActionData({});
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={executeQuickAction}
                disabled={quickActionMutation.isPending}
                style={{ backgroundColor: "var(--brand-700)", color: "white" }}
              >
                {quickActionMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Executar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
