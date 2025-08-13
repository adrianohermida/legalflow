import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MessageSquare,
  Send,
  X,
  Plus,
  Loader2,
  Target,
  Calendar,
  FileText,
  User,
  Clock,
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
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
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

interface ProcessoChatSimpleProps {
  numero_cnj: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProcessoChatSimple({
  numero_cnj,
  isOpen,
  onClose,
}: ProcessoChatSimpleProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);

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

  // Mutation para criar nova conversa
  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("thread_links")
        .insert({
          properties: { numero_cnj },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newThread) => {
      refetchThreads();
      setActiveThreadId(newThread.id);
      setIsNewConversationOpen(false);
      toast({
        title: "Nova conversa criada",
        description: "Conversa criada com sucesso",
      });
    },
  });

  // Mutation para enviar mensagem
  const sendMessageMutation = useMutation({
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
        })
        .select()
        .single();

      if (userError) throw userError;

      // Simular resposta da IA
      const aiResponse = `Entendi sua mensagem sobre o processo ${numero_cnj}. Como posso ajudar?`;

      const { data: aiMessage, error: aiError } = await supabase
        .from("ai_messages")
        .insert({
          thread_link_id: thread_id,
          role: "assistant",
          content: aiResponse,
        })
        .select()
        .single();

      if (aiError) throw aiError;

      return { userMessage, aiMessage };
    },
    onSuccess: () => {
      refetchMessages();
      setNewMessage("");
    },
  });

  // Mutation para criar tarefa
  const createTaskMutation = useMutation({
    mutationFn: async ({
      title,
      due_at,
      assigned_oab,
    }: {
      title: string;
      due_at: string;
      assigned_oab?: number;
    }) => {
      const { data, error } = await supabase
        .from("activities")
        .insert({
          numero_cnj,
          title,
          due_at,
          assigned_oab,
          status: "pending",
        })
        .select()
        .single();

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

  // Mutation para agendar evento
  const createEventMutation = useMutation({
    mutationFn: async ({
      title,
      starts_at,
      location,
    }: {
      title: string;
      starts_at: string;
      location?: string;
    }) => {
      const { data, error } = await supabase
        .from("eventos_agenda")
        .insert({
          numero_cnj,
          title,
          starts_at,
          location,
          duration_minutes: 60,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Evento agendado",
        description: "Novo evento criado via chat",
      });
    },
  });

  // Mutation para solicitar documento
  const requestDocumentMutation = useMutation({
    mutationFn: async ({
      name,
      mandatory,
    }: {
      name: string;
      mandatory: boolean;
    }) => {
      const { data, error } = await supabase
        .from("document_requirements")
        .insert({
          template_stage_id: null,
          name,
          mandatory,
          numero_cnj,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Documento solicitado",
        description: "Solicitação de documento criada",
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

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeThreadId || sendMessageMutation.isPending)
      return;

    sendMessageMutation.mutate({
      content: newMessage.trim(),
      thread_id: activeThreadId,
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "task":
        setNewMessage("Crie uma nova tarefa para este processo: ");
        break;
      case "event":
        setNewMessage("Agende um compromisso para este processo: ");
        break;
      case "document":
        setNewMessage("Solicite um documento para este processo: ");
        break;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 w-96 bg-white border-r border-neutral-200 shadow-xl z-50 flex flex-col">
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
        <div className="border-b border-neutral-200 p-4">
          <div className="flex items-center gap-2 overflow-x-auto">
            {threads.map((thread, index) => (
              <button
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                className={`flex-shrink-0 px-3 py-2 text-sm rounded-lg border transition-colors ${
                  activeThreadId === thread.id
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                Chat {index + 1}
              </button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => createConversationMutation.mutate()}
              className="flex-shrink-0"
              disabled={createConversationMutation.isPending}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-neutral-200">
          <Button
            onClick={() => createConversationMutation.mutate()}
            className="w-full"
            disabled={createConversationMutation.isPending}
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
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div
                    className={`max-w-[70%] ${message.role === "user" ? "order-first" : ""}`}
                  >
                    <div
                      className={`rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-neutral-200"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {formatDate(message.created_at)}
                    </p>
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-neutral-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
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
            <Button onClick={() => createConversationMutation.mutate()}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Conversa
            </Button>
          </div>
        )}
      </div>

      {/* Composer */}
      {activeThreadId && (
        <div className="p-4 border-t border-neutral-200 bg-white">
          {/* Quick Actions */}
          <div className="flex gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("task")}
            >
              <Target className="w-4 h-4 mr-1" />
              Tarefa
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("event")}
            >
              <Calendar className="w-4 h-4 mr-1" />
              Evento
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickAction("document")}
            >
              <FileText className="w-4 h-4 mr-1" />
              Documento
            </Button>
          </div>

          {/* Message Input */}
          <div className="flex gap-2">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="min-h-[60px] resize-none flex-1"
              disabled={sendMessageMutation.isPending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              size="sm"
              className="self-end"
            >
              {sendMessageMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Contexto do processo ativo
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
