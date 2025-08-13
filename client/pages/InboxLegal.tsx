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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Search,
  Filter,
  Inbox,
  FileText,
  Building,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Link2,
  Bell,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface Publicacao {
  id: number;
  data_publicacao: string | null;
  data: any;
  numero_cnj: string | null;
  created_at: string;
}

interface Movimentacao {
  id: number;
  data_movimentacao: string | null;
  data: any;
  numero_cnj: string | null;
  created_at: string;
}

export function InboxLegal() {
  const [activeTab, setActiveTab] = useState("publicacoes");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isVincularDialogOpen, setIsVincularDialogOpen] = useState(false);
  const [isNotificarDialogOpen, setIsNotificarDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const itemsPerPage = 20;

  // P2.4 - Buscar publicações
  const {
    data: publicacoesData = { data: [], total: 0, totalPages: 0 },
    isLoading: publicacoesLoading,
    error: publicacoesError,
  } = useQuery({
    queryKey: ["publicacoes", searchTerm, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("publicacoes")
        .select("*", { count: "exact" })
        .order("data_publicacao", { ascending: false, nullsLast: true });

      // Aplicar filtro de busca
      if (searchTerm) {
        query = query.or(`numero_cnj.ilike.%${searchTerm}%`);
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const { data, error, count } = await query
        .range(startIndex, startIndex + itemsPerPage - 1);

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
      };
    },
    enabled: activeTab === "publicacoes",
    staleTime: 5 * 60 * 1000,
  });

  // P2.4 - Buscar movimentações
  const {
    data: movimentacoesData = { data: [], total: 0, totalPages: 0 },
    isLoading: movimentacoesLoading,
    error: movimentacoesError,
  } = useQuery({
    queryKey: ["movimentacoes", searchTerm, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("movimentacoes")
        .select("*", { count: "exact" })
        .order("data_movimentacao", { ascending: false, nullsLast: true });

      // Aplicar filtro de busca
      if (searchTerm) {
        query = query.or(`numero_cnj.ilike.%${searchTerm}%`);
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const { data, error, count } = await query
        .range(startIndex, startIndex + itemsPerPage - 1);

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
      };
    },
    enabled: activeTab === "movimentacoes",
    staleTime: 5 * 60 * 1000,
  });

  // Buscar processos para vincular
  const { data: processos = [] } = useQuery({
    queryKey: ["processos-para-vincular"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("numero_cnj, titulo_polo_ativo, titulo_polo_passivo")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Buscar advogados para notificar
  const { data: advogados = [] } = useQuery({
    queryKey: ["advogados-para-notificar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advogados")
        .select("oab, nome")
        .order("nome");
      
      if (error) throw error;
      return data;
    },
  });

  // P2.4 - Mutation para vincular ao CNJ
  const vincularMutation = useMutation({
    mutationFn: async ({ itemId, tableName, numero_cnj }: { itemId: number; tableName: string; numero_cnj: string }) => {
      const { data, error } = await supabase
        .from(tableName)
        .update({ numero_cnj })
        .eq("id", itemId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publicacoes"] });
      queryClient.invalidateQueries({ queryKey: ["movimentacoes"] });
      setIsVincularDialogOpen(false);
      setSelectedItem(null);
      toast({
        title: "Item vinculado",
        description: "Item vinculado ao processo com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao vincular item",
        variant: "destructive",
      });
    },
  });

  // P2.4 - Mutation para notificar responsável
  const notificarMutation = useMutation({
    mutationFn: async ({ oab, message, title }: { oab: number; message: string; title: string }) => {
      // Buscar user_id do advogado
      const { data: userAdvogado } = await supabase
        .from("user_advogado")
        .select("user_id")
        .eq("oab", oab)
        .single();

      if (!userAdvogado) {
        throw new Error("Advogado não encontrado no sistema");
      }

      // Inserir notificação
      const { data, error } = await supabase
        .from("notifications")
        .insert([{
          user_id: userAdvogado.user_id,
          title,
          message,
          read: false,
        }])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setIsNotificarDialogOpen(false);
      setSelectedItem(null);
      toast({
        title: "Notificação enviada",
        description: "Responsável notificado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar notificação",
        variant: "destructive",
      });
    },
  });

  const handleVincular = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const numero_cnj = formData.get("numero_cnj") as string;
    
    vincularMutation.mutate({
      itemId: selectedItem.id,
      tableName: activeTab,
      numero_cnj,
    });
  };

  const handleNotificar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const oab = parseInt(formData.get("oab") as string);
    const customMessage = formData.get("message") as string;
    
    const isPublicacao = activeTab === "publicacoes";
    const title = `Nova ${isPublicacao ? "Publicação" : "Movimentação"} - ${selectedItem.numero_cnj || "Sem CNJ"}`;
    const defaultMessage = `Uma nova ${isPublicacao ? "publicação" : "movimentação"} foi registrada${selectedItem.numero_cnj ? ` para o processo ${selectedItem.numero_cnj}` : ""}.`;
    const message = customMessage || defaultMessage;
    
    notificarMutation.mutate({ oab, title, message });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Data não informada";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatCNJ = (cnj: string | null) => {
    if (!cnj) return null;
    const clean = cnj.replace(/\D/g, "");
    if (clean.length === 20) {
      return clean.replace(/(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/, "$1-$2.$3.$4.$5.$6");
    }
    return cnj;
  };

  const getResumo = (item: any) => {
    if (item.data && typeof item.data === 'object') {
      // Tentar extrair resumo dos dados
      if (item.data.conteudo) return item.data.conteudo.substring(0, 100) + "...";
      if (item.data.descricao) return item.data.descricao.substring(0, 100) + "...";
      if (item.data.texto) return item.data.texto.substring(0, 100) + "...";
      return "Dados disponíveis para análise";
    }
    return "Sem resumo disponível";
  };

  const getOrigem = (item: any) => {
    if (item.data && typeof item.data === 'object') {
      if (item.data.tribunal) return item.data.tribunal;
      if (item.data.origem) return item.data.origem;
      if (item.data.fonte) return item.data.fonte;
    }
    return "Origem não identificada";
  };

  const currentData = activeTab === "publicacoes" ? publicacoesData : movimentacoesData;
  const currentLoading = activeTab === "publicacoes" ? publicacoesLoading : movimentacoesLoading;
  const currentError = activeTab === "publicacoes" ? publicacoesError : movimentacoesError;

  if (currentError) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold">Inbox Legal</h1>
            <p className="text-neutral-600 mt-1">Triagem de publicações e movimentações</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Erro ao carregar dados</h3>
              <p className="text-neutral-600 mb-4">{currentError.message}</p>
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
          <h1 className="text-2xl font-heading font-semibold">Inbox Legal</h1>
          <p className="text-neutral-600 mt-1">Triagem de publicações e movimentações</p>
        </div>
      </div>

      {/* P2.4 - Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Buscar por CNJ..."
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

      {/* P2.4 - Tabs Publicações | Movimentações */}
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value);
        setCurrentPage(1);
      }}>
        <TabsList>
          <TabsTrigger value="publicacoes" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Publicações ({publicacoesData.total})
          </TabsTrigger>
          <TabsTrigger value="movimentacoes" className="flex items-center gap-2">
            <Building className="w-4 h-4" />
            Movimentações ({movimentacoesData.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="publicacoes">
          <Card>
            <CardHeader>
              <CardTitle>Publicações ({publicacoesData.total})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-700)' }} />
                  <span className="ml-2 text-neutral-600">Carregando publicações...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Origem/Tribunal</TableHead>
                      <TableHead>Resumo</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-neutral-500">
                            <Inbox className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                            <p>Nenhuma publicação encontrada</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentData.data?.map((item) => (
                        <TableRow key={item.id} className="hover:bg-neutral-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm">
                                {formatDate(item.data_publicacao)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm">
                                {getOrigem(item)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md">
                              <p className="text-sm text-neutral-700 line-clamp-2">
                                {getResumo(item)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.numero_cnj ? (
                              <Badge style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}>
                                {formatCNJ(item.numero_cnj)}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                Não vinculado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsVincularDialogOpen(true);
                                }}
                                style={{ color: 'var(--brand-700)' }}
                              >
                                <Link2 className="w-4 h-4 mr-1" />
                                Vincular
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsNotificarDialogOpen(true);
                                }}
                              >
                                <Bell className="w-4 h-4 mr-1" />
                                Notificar
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
        </TabsContent>

        <TabsContent value="movimentacoes">
          <Card>
            <CardHeader>
              <CardTitle>Movimentações ({movimentacoesData.total})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-700)' }} />
                  <span className="ml-2 text-neutral-600">Carregando movimentações...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Origem/Tribunal</TableHead>
                      <TableHead>Resumo</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-neutral-500">
                            <Inbox className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                            <p>Nenhuma movimentação encontrada</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentData.data?.map((item) => (
                        <TableRow key={item.id} className="hover:bg-neutral-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm">
                                {formatDate(item.data_movimentacao)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4 text-neutral-400" />
                              <span className="text-sm">
                                {getOrigem(item)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md">
                              <p className="text-sm text-neutral-700 line-clamp-2">
                                {getResumo(item)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.numero_cnj ? (
                              <Badge style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}>
                                {formatCNJ(item.numero_cnj)}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                Não vinculado
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsVincularDialogOpen(true);
                                }}
                                style={{ color: 'var(--brand-700)' }}
                              >
                                <Link2 className="w-4 h-4 mr-1" />
                                Vincular
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsNotificarDialogOpen(true);
                                }}
                              >
                                <Bell className="w-4 h-4 mr-1" />
                                Notificar
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
        </TabsContent>
      </Tabs>

      {/* Paginação */}
      {currentData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, currentData.total)} de {currentData.total} itens
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
              Página {currentPage} de {currentData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === currentData.totalPages}
            >
              Próximo
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* P2.4 - Dialog Vincular CNJ */}
      <Dialog open={isVincularDialogOpen} onOpenChange={setIsVincularDialogOpen}>
        <DialogContent>
          <form onSubmit={handleVincular}>
            <DialogHeader>
              <DialogTitle>Vincular ao Processo</DialogTitle>
              <DialogDescription>
                Selecione o processo para vincular este item
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <label className="block text-sm font-medium mb-2">Processo (CNJ)</label>
              <Select name="numero_cnj" required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um processo" />
                </SelectTrigger>
                <SelectContent>
                  {processos.map((processo) => (
                    <SelectItem key={processo.numero_cnj} value={processo.numero_cnj}>
                      {formatCNJ(processo.numero_cnj)} - {processo.titulo_polo_ativo}
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
                  setIsVincularDialogOpen(false);
                  setSelectedItem(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={vincularMutation.isPending}>
                {vincularMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Vincular
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* P2.4 - Dialog Notificar Responsável */}
      <Dialog open={isNotificarDialogOpen} onOpenChange={setIsNotificarDialogOpen}>
        <DialogContent>
          <form onSubmit={handleNotificar}>
            <DialogHeader>
              <DialogTitle>Notificar Responsável</DialogTitle>
              <DialogDescription>
                Envie uma notificação para o advogado responsável
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="block text-sm font-medium mb-2">Advogado</label>
                <Select name="oab" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um advogado" />
                  </SelectTrigger>
                  <SelectContent>
                    {advogados.map((advogado) => (
                      <SelectItem key={advogado.oab} value={advogado.oab.toString()}>
                        {advogado.nome} (OAB {advogado.oab})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Mensagem personalizada (opcional)</label>
                <Input
                  name="message"
                  placeholder="Deixe em branco para usar mensagem padrão"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsNotificarDialogOpen(false);
                  setSelectedItem(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={notificarMutation.isPending}>
                {notificarMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Notificar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
