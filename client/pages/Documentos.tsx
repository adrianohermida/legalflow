import React, { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Search,
  Upload,
  FileText,
  Download,
  Eye,
  Plus,
  Wand2,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Trash2,
  File,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface Documento {
  id: string;
  numero_cnj: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  metadata: any | null;
  created_at: string;
}

interface Peticao {
  id: string;
  numero_cnj: string | null;
  tipo: string | null;
  conteudo: string | null;
  created_at: string;
}

export function Documentos() {
  const [activeTab, setActiveTab] = useState("biblioteca");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCNJ, setFilterCNJ] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isPeticaoDialogOpen, setIsPeticaoDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const itemsPerPage = 20;

  // P2.6 - Buscar documentos (uploads livres)
  const {
    data: documentosData = { data: [], total: 0, totalPages: 0 },
    isLoading: documentosLoading,
    error: documentosError,
  } = useQuery({
    queryKey: ["documentos", searchTerm, filterCNJ, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("documents")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(
          `file_name.ilike.%${searchTerm}%,numero_cnj.ilike.%${searchTerm}%`,
        );
      }

      if (filterCNJ !== "todos") {
        if (filterCNJ === "com-cnj") {
          query = query.not("numero_cnj", "is", null);
        } else if (filterCNJ === "sem-cnj") {
          query = query.is("numero_cnj", null);
        } else {
          query = query.eq("numero_cnj", filterCNJ);
        }
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const { data, error, count } = await query.range(
        startIndex,
        startIndex + itemsPerPage - 1,
      );

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
      };
    },
    enabled: activeTab === "biblioteca",
    staleTime: 5 * 60 * 1000,
  });

  // P2.6 - Buscar peções (IA)
  const {
    data: peticoesData = { data: [], total: 0, totalPages: 0 },
    isLoading: peticoesLoading,
    error: peticoesError,
  } = useQuery({
    queryKey: ["peticoes", searchTerm, filterCNJ, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("peticoes")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(
          `tipo.ilike.%${searchTerm}%,numero_cnj.ilike.%${searchTerm}%`,
        );
      }

      if (filterCNJ !== "todos") {
        if (filterCNJ === "com-cnj") {
          query = query.not("numero_cnj", "is", null);
        } else if (filterCNJ === "sem-cnj") {
          query = query.is("numero_cnj", null);
        } else {
          query = query.eq("numero_cnj", filterCNJ);
        }
      }

      const startIndex = (currentPage - 1) * itemsPerPage;
      const { data, error, count } = await query.range(
        startIndex,
        startIndex + itemsPerPage - 1,
      );

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        totalPages: Math.ceil((count || 0) / itemsPerPage),
      };
    },
    enabled: activeTab === "pecas",
    staleTime: 5 * 60 * 1000,
  });

  // Buscar processos para filtro
  const { data: processos = [] } = useQuery({
    queryKey: ["processos-para-filtro"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processos")
        .select("numero_cnj")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  // P2.6 - Mutation para upload de documento
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const file = formData.get("file") as File;
      const numero_cnj = formData.get("numero_cnj") as string;
      const metadata = {
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
      };

      // Simular upload (na implementação real, usar Supabase Storage)
      const file_path = `documents/${Date.now()}-${file.name}`;

      const { data, error } = await supabase
        .from("documents")
        .insert([
          {
            numero_cnj: numero_cnj || null,
            file_name: file.name,
            file_path,
            file_size: file.size,
            metadata,
          },
        ])
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documentos"] });
      setIsUploadDialogOpen(false);
      toast({
        title: "Documento enviado",
        description: "Documento adicionado à biblioteca",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar documento",
        variant: "destructive",
      });
    },
  });

  // P2.6 - Mutation para criar petição
  const peticaoMutation = useMutation({
    mutationFn: async (data: {
      tipo: string;
      numero_cnj: string;
      conteudo: string;
    }) => {
      const { data: result, error } = await supabase
        .from("peticoes")
        .insert([
          {
            tipo: data.tipo,
            numero_cnj: data.numero_cnj || null,
            conteudo: data.conteudo,
          },
        ])
        .select();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peticoes"] });
      setIsPeticaoDialogOpen(false);
      toast({
        title: "Petição criada",
        description: "Nova petição adicionada com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar petição",
        variant: "destructive",
      });
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    uploadMutation.mutate(formData);
  };

  const handleCreatePeticao = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    peticaoMutation.mutate({
      tipo: formData.get("tipo") as string,
      numero_cnj: formData.get("numero_cnj") as string,
      conteudo: formData.get("conteudo") as string,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatCNJ = (cnj: string | null) => {
    if (!cnj) return null;
    const clean = cnj.replace(/\D/g, "");
    if (clean.length === 20) {
      return clean.replace(
        /(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/,
        "$1-$2.$3.$4.$5.$6",
      );
    }
    return cnj;
  };

  const currentData =
    activeTab === "biblioteca" ? documentosData : peticoesData;
  const currentLoading =
    activeTab === "biblioteca" ? documentosLoading : peticoesLoading;
  const currentError =
    activeTab === "biblioteca" ? documentosError : peticoesError;

  if (currentError) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold">
              Documentos & Peças
            </h1>
            <p className="text-neutral-600 mt-1">
              Centralizar entregáveis e preparar jornada
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Erro ao carregar dados
              </h3>
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
          <h1 className="text-2xl font-heading font-semibold">
            Documentos & Peças
          </h1>
          <p className="text-neutral-600 mt-1">
            Centralizar entregáveis e preparar jornada
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog
            open={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleUpload}>
                <DialogHeader>
                  <DialogTitle>Upload de Documento</DialogTitle>
                  <DialogDescription>
                    Adicione um documento à biblioteca
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Arquivo *
                    </label>
                    <Input name="file" type="file" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Processo (CNJ)
                    </label>
                    <Select name="numero_cnj">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um processo (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum processo</SelectItem>
                        {processos.map((processo) => (
                          <SelectItem
                            key={processo.numero_cnj}
                            value={processo.numero_cnj}
                          >
                            {formatCNJ(processo.numero_cnj)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsUploadDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={uploadMutation.isPending}>
                    {uploadMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Upload
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog
            open={isPeticaoDialogOpen}
            onOpenChange={setIsPeticaoDialogOpen}
          >
            <DialogTrigger asChild>
              <Button
                style={{ backgroundColor: "var(--brand-700)", color: "white" }}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Nova Petição
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <form onSubmit={handleCreatePeticao}>
                <DialogHeader>
                  <DialogTitle>Nova Petição (IA)</DialogTitle>
                  <DialogDescription>
                    Crie uma nova petição com assistência de IA
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tipo *
                    </label>
                    <Select name="tipo" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inicial">Petição Inicial</SelectItem>
                        <SelectItem value="contestacao">Contestação</SelectItem>
                        <SelectItem value="recurso">Recurso</SelectItem>
                        <SelectItem value="manifestacao">
                          Manifestação
                        </SelectItem>
                        <SelectItem value="alegacoes">
                          Alegações Finais
                        </SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Processo (CNJ)
                    </label>
                    <Select name="numero_cnj">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um processo (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum processo</SelectItem>
                        {processos.map((processo) => (
                          <SelectItem
                            key={processo.numero_cnj}
                            value={processo.numero_cnj}
                          >
                            {formatCNJ(processo.numero_cnj)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Conteúdo *
                    </label>
                    <textarea
                      name="conteudo"
                      className="w-full min-h-48 p-3 border rounded-lg"
                      placeholder="Digite o conteúdo da petição ou solicite ajuda da IA..."
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsPeticaoDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={peticaoMutation.isPending}>
                    {peticaoMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Criar Petição
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder={
                  activeTab === "biblioteca"
                    ? "Buscar documentos..."
                    : "Buscar petições..."
                }
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={filterCNJ}
              onValueChange={(value) => {
                setFilterCNJ(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os itens</SelectItem>
                <SelectItem value="com-cnj">Com CNJ</SelectItem>
                <SelectItem value="sem-cnj">Sem CNJ</SelectItem>
                {processos.slice(0, 10).map((processo) => (
                  <SelectItem
                    key={processo.numero_cnj}
                    value={processo.numero_cnj}
                  >
                    {formatCNJ(processo.numero_cnj)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* P2.6 - Abas Biblioteca e Peças */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value);
          setCurrentPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="biblioteca" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Biblioteca ({documentosData.total})
          </TabsTrigger>
          <TabsTrigger value="pecas" className="flex items-center gap-2">
            <Wand2 className="w-4 h-4" />
            Peças (IA) ({peticoesData.total})
          </TabsTrigger>
          {/* P2.6 - "Entregáveis da Etapa" só aparece quando houver Jornada (F3) */}
          <TabsTrigger
            value="entregaveis"
            className="flex items-center gap-2"
            disabled
          >
            <CheckCircle className="w-4 h-4" />
            Entregáveis (F3)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="biblioteca">
          <Card>
            <CardHeader>
              <CardTitle>
                Biblioteca de Documentos ({documentosData.total})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2
                    className="w-8 h-8 animate-spin"
                    style={{ color: "var(--brand-700)" }}
                  />
                  <span className="ml-2 text-neutral-600">
                    Carregando documentos...
                  </span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-neutral-500">
                            <FileText className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                            <p>Nenhum documento encontrado</p>
                            <p className="text-sm">
                              Faça upload do primeiro documento
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentData.data?.map((item: Documento) => (
                        <TableRow key={item.id} className="hover:bg-neutral-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <File className="w-4 h-4 text-neutral-400" />
                              <span className="font-medium">
                                {item.file_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.numero_cnj ? (
                              <Badge
                                style={{
                                  backgroundColor: "var(--brand-700)",
                                  color: "white",
                                }}
                              >
                                {formatCNJ(item.numero_cnj)}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Geral</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-neutral-600">
                            {formatFileSize(item.file_size)}
                          </TableCell>
                          <TableCell className="text-sm text-neutral-600">
                            {formatDate(item.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4 mr-1" />
                                Download
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

        <TabsContent value="pecas">
          <Card>
            <CardHeader>
              <CardTitle>Peças Jurídicas (IA) ({peticoesData.total})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {currentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2
                    className="w-8 h-8 animate-spin"
                    style={{ color: "var(--brand-700)" }}
                  />
                  <span className="ml-2 text-neutral-600">
                    Carregando peças...
                  </span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Conteúdo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentData.data?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="text-neutral-500">
                            <Wand2 className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                            <p>Nenhuma petição criada</p>
                            <p className="text-sm">
                              Crie sua primeira petição com IA
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      currentData.data?.map((item: Peticao) => (
                        <TableRow key={item.id} className="hover:bg-neutral-50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Wand2 className="w-4 h-4 text-neutral-400" />
                              <span className="font-medium">
                                {item.tipo || "Não especificado"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {item.numero_cnj ? (
                              <Badge
                                style={{
                                  backgroundColor: "var(--brand-700)",
                                  color: "white",
                                }}
                              >
                                {formatCNJ(item.numero_cnj)}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Geral</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md">
                              <p className="text-sm text-neutral-700 line-clamp-2">
                                {item.conteudo
                                  ? item.conteudo.substring(0, 100) + "..."
                                  : "Sem conteúdo"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-neutral-600">
                            {formatDate(item.created_at)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4 mr-1" />
                                Ver
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4 mr-1" />
                                Baixar
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

        <TabsContent value="entregaveis">
          <Card>
            <CardHeader>
              <CardTitle>Entregáveis da Etapa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  Disponível na Fase 3
                </h3>
                <p className="text-neutral-600 max-w-md mx-auto">
                  Os entregáveis da etapa estarão disponíveis quando uma jornada
                  estiver ativa. Esta funcionalidade será implementada na Fase 3
                  - Jornadas.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Paginação */}
      {currentData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
            {Math.min(currentPage * itemsPerPage, currentData.total)} de{" "}
            {currentData.total} itens
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
    </div>
  );
}
