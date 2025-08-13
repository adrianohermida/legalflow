import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Send, Paperclip, Minimize2, Settings, Tag, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { cn } from '../lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, lf } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';

interface ChatDockControllerProps {
  isOpen: boolean;
  onClose: () => void;
  userType: 'advogado' | 'cliente';
}

interface ThreadLink {
  id: string;
  numero_cnj: string | null;
  cliente_cpfcnpj: string | null;
  context_type: string;
  created_at: string;
}

interface ConversationProperties {
  thread_link_id: string;
  status: string | null;
  priority: string | null;
  group_key: string | null;
  tags: string[] | null;
  assignee_id: string | null;
  sla_due_at: string | null;
  custom: any | null;
  created_at: string;
  updated_at: string;
}

interface AIMessage {
  id: string;
  thread_link_id: string;
  sender_type: string;
  content: string;
  created_at: string;
}

export function ChatDockController({ isOpen, onClose, userType }: ChatDockControllerProps) {
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // P2.11 - Buscar thread links ativas
  const {
    data: threads = [],
    isLoading: threadsLoading,
  } = useQuery({
    queryKey: ["thread-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("thread_links")
        .select(`
          *,
          clientes:cliente_cpfcnpj (
            nome
          ),
          processos:numero_cnj (
            titulo_polo_ativo
          )
        `)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
    enabled: isOpen,
  });

  // P2.11 - Buscar conversation properties para thread ativa
  const {
    data: conversationProps,
  } = useQuery({
    queryKey: ["conversation-properties", activeThread],
    queryFn: async () => {
      if (!activeThread) return null;
      
      const { data, error } = await lf
        .from("conversation_properties")
        .select("*")
        .eq("thread_link_id", activeThread)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
      return data;
    },
    enabled: !!activeThread,
  });

  // P2.11 - Buscar mensagens da thread ativa
  const {
    data: messages = [],
    isLoading: messagesLoading,
  } = useQuery({
    queryKey: ["ai-messages", activeThread],
    queryFn: async () => {
      if (!activeThread) return [];
      
      const { data, error } = await supabase
        .from("ai_messages")
        .select("*")
        .eq("thread_link_id", activeThread)
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeThread,
  });

  // P2.11 - Mutation para enviar mensagem
  const sendMessageMutation = useMutation({
    mutationFn: async ({ threadId, content }: { threadId: string; content: string }) => {
      const { data, error } = await supabase
        .from("ai_messages")
        .insert([{
          thread_link_id: threadId,
          sender_type: userType === 'advogado' ? 'agent' : 'user',
          content,
        }])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-messages", activeThread] });
      setMessage("");
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

  // P2.11 - Mutation para atualizar conversation properties
  const updatePropertiesMutation = useMutation({
    mutationFn: async (properties: Partial<ConversationProperties>) => {
      if (!activeThread) return;
      
      const { data, error } = await lf
        .from("conversation_properties")
        .upsert([{
          thread_link_id: activeThread,
          ...properties,
        }])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversation-properties", activeThread] });
      toast({
        title: "Propriedades atualizadas",
        description: "Propriedades da conversa foram atualizadas",
      });
    },
  });

  // Auto-select first thread if none selected
  useEffect(() => {
    if (threads.length > 0 && !activeThread) {
      setActiveThread(threads[0].id);
    }
  }, [threads, activeThread]);

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !activeThread) return;
    
    sendMessageMutation.mutate({
      threadId: activeThread,
      content: message,
    });
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "open": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "resolved": return "bg-blue-100 text-blue-800";
      case "closed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string | null) => {
    switch (priority) {
      case "urgente": return "bg-red-100 text-red-800";
      case "alta": return "bg-orange-100 text-orange-800";
      case "media": return "bg-yellow-100 text-yellow-800";
      case "baixa": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={cn(
      'fixed bottom-0 right-4 bg-white shadow-strong rounded-t-lg border border-b-0 z-50 transition-all duration-200',
      isMinimized ? 'h-12' : 'h-96',
      'w-80'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-brand-700 text-white rounded-t-lg">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-4 h-4" />
          <span className="font-medium text-sm">Chat AdvogaAI</span>
          {threads.some((t: any) => t.unread > 0) && (
            <Badge variant="secondary" className="bg-white text-brand-700 text-xs">
              {threads.reduce((sum: number, t: any) => sum + (t.unread || 0), 0)}
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {activeThread && (
            <Dialog open={isPropertiesOpen} onOpenChange={setIsPropertiesOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-brand-600 h-6 w-6 p-0"
                >
                  <Settings className="w-3 h-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Propriedades da Conversa</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={conversationProps?.status || ""}
                      onValueChange={(value) => updatePropertiesMutation.mutate({ status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Aberto</SelectItem>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="resolved">Resolvido</SelectItem>
                        <SelectItem value="closed">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Prioridade</Label>
                    <Select
                      value={conversationProps?.priority || ""}
                      onValueChange={(value) => updatePropertiesMutation.mutate({ priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">Baixa</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tags (separadas por vírgula)</Label>
                    <Input
                      value={conversationProps?.tags?.join(", ") || ""}
                      onChange={(e) => {
                        const tags = e.target.value.split(",").map(t => t.trim()).filter(Boolean);
                        updatePropertiesMutation.mutate({ tags });
                      }}
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={conversationProps?.custom?.notes || ""}
                      onChange={(e) => {
                        const custom = { ...conversationProps?.custom, notes: e.target.value };
                        updatePropertiesMutation.mutate({ custom });
                      }}
                      placeholder="Observações internas sobre a conversa"
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-white hover:bg-brand-600 h-6 w-6 p-0"
          >
            <Minimize2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-white hover:bg-brand-600 h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Thread List */}
          <div className="h-24 border-b border-border overflow-y-auto">
            <div className="space-y-1 p-2">
              {threadsLoading ? (
                <div className="text-center text-xs text-neutral-500 py-2">
                  Carregando conversas...
                </div>
              ) : threads.length === 0 ? (
                <div className="text-center text-xs text-neutral-500 py-2">
                  Nenhuma conversa ativa
                </div>
              ) : (
                threads.map((thread: any) => (
                  <div
                    key={thread.id}
                    onClick={() => setActiveThread(thread.id)}
                    className={cn(
                      'p-2 rounded cursor-pointer transition-colors text-sm',
                      activeThread === thread.id 
                        ? 'bg-brand-50 border border-brand-200'
                        : 'hover:bg-neutral-50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs truncate">
                        {thread.numero_cnj || thread.clientes?.nome || `Conversa ${thread.context_type}`}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {formatDateTime(thread.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-600 truncate mt-1">
                      {thread.context_type} - {thread.clientes?.nome}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Conversation Properties Bar */}
          {activeThread && conversationProps && (
            <div className="px-3 py-2 border-b border-border bg-neutral-50">
              <div className="flex items-center gap-2 flex-wrap">
                {conversationProps.status && (
                  <Badge className={cn("text-xs", getStatusColor(conversationProps.status))}>
                    {conversationProps.status}
                  </Badge>
                )}
                {conversationProps.priority && (
                  <Badge className={cn("text-xs", getPriorityColor(conversationProps.priority))}>
                    {conversationProps.priority}
                  </Badge>
                )}
                {conversationProps.tags && conversationProps.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-neutral-500" />
                    <span className="text-xs text-neutral-600">
                      {conversationProps.tags.slice(0, 2).join(", ")}
                      {conversationProps.tags.length > 2 && "..."}
                    </span>
                  </div>
                )}
                {conversationProps.sla_due_at && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-orange-600">
                      SLA: {formatDateTime(conversationProps.sla_due_at)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 h-48 overflow-y-auto p-3 space-y-3">
            {messagesLoading ? (
              <div className="text-center text-xs text-neutral-500">
                Carregando mensagens...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-xs text-neutral-500">
                Nenhuma mensagem ainda. Inicie a conversa!
              </div>
            ) : (
              messages.map((msg: AIMessage) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex',
                    msg.sender_type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[80%] rounded-lg px-3 py-2 text-xs',
                      msg.sender_type === 'user'
                        ? 'bg-brand-600 text-white'
                        : 'bg-neutral-100 text-neutral-900'
                    )}
                  >
                    <p>{msg.content}</p>
                    <p className={cn(
                      'text-xs mt-1 opacity-70',
                      msg.sender_type === 'user' ? 'text-brand-100' : 'text-neutral-500'
                    )}>
                      {formatDateTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="border-t border-border p-3">
            <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                className="flex-1 text-sm"
                disabled={!activeThread || sendMessageMutation.isPending}
              />
              <Button
                type="submit"
                size="sm"
                disabled={!message.trim() || !activeThread || sendMessageMutation.isPending}
                style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}
              >
                <Send className="w-3 h-3" />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
