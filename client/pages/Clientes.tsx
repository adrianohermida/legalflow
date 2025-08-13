import React, { useState } from "react";
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
  Plus,
  Filter,
  Users,
  Phone,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Edit,
  Eye,
  FolderPlus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface Cliente {
  cpfcnpj: string;
  nome: string | null;
  whatsapp: string | null;
  created_at: string;
  crm_id: string | null;
  processo_count?: number;
}

interface ClienteFormData {
  cpfcnpj: string;
  nome: string;
  whatsapp: string;
}

export function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProcessos, setFilterProcessos] = useState("todos");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const itemsPerPage = 20;

  // P2.1 - Buscar clientes com count de processos
  const {
    data: clientesData = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["clientes", searchTerm, filterProcessos, currentPage],
    queryFn: async () => {
      let query = supabase
        .from("clientes")
        .select(
          `
          cpfcnpj,
          nome,
          whatsapp,
          created_at,
          crm_id,
          clientes_processos (
            numero_cnj
          )
        `,
        )
        .order("created_at", { ascending: false });

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(
          `cpfcnpj.ilike.%${searchTerm}%,nome.ilike.%${searchTerm}%`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      // Processar count de processos e aplicar filtro
      const processedData = data.map((cliente: any) => ({
        ...cliente,
        processo_count: cliente.clientes_processos?.length || 0,
      }));

      // Filtrar por processos
      let filteredData = processedData;
      if (filterProcessos === "com-processos") {
        filteredData = processedData.filter((c) => c.processo_count > 0);
      } else if (filterProcessos === "sem-processos") {
        filteredData = processedData.filter((c) => c.processo_count === 0);
      }

      // Aplicar paginação
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;

      return {
        data: filteredData.slice(startIndex, endIndex),
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / itemsPerPage),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // P2.1 - Mutation para criar/editar cliente
  const clienteMutation = useMutation({
    mutationFn: async (clienteData: ClienteFormData) => {
      const { data, error } = editingCliente
        ? await supabase
            .from("clientes")
            .update(clienteData)
            .eq("cpfcnpj", editingCliente.cpfcnpj)
            .select()
        : await supabase.from("clientes").insert([clienteData]).select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      setIsDialogOpen(false);
      setEditingCliente(null);
      toast({
        title: editingCliente ? "Cliente atualizado" : "Cliente criado",
        description: editingCliente
          ? "Cliente atualizado com sucesso"
          : "Novo cliente adicionado à base",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar cliente",
        variant: "destructive",
      });
    },
  });

  const handleSubmitCliente = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const clienteData: ClienteFormData = {
      cpfcnpj: formData.get("cpfcnpj") as string,
      nome: formData.get("nome") as string,
      whatsapp: formData.get("whatsapp") as string,
    };

    clienteMutation.mutate(clienteData);
  };

  const handleCreateProcess = (cliente: Cliente) => {
    // P2.1 - CTA "Criar processo" pré-preenche cpfcnpj
    const params = new URLSearchParams({
      cliente_cpfcnpj: cliente.cpfcnpj,
      cliente_nome: cliente.nome || "",
    });
    window.location.href = `/processos/novo?${params.toString()}`;
  };

  const formatCpfCnpj = (cpfcnpj: string) => {
    const clean = cpfcnpj.replace(/\D/g, "");
    if (clean.length === 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else if (clean.length === 14) {
      return clean.replace(
        /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
        "$1.$2.$3/$4-$5",
      );
    }
    return cpfcnpj;
  };

  const formatWhatsApp = (whatsapp?: string) => {
    if (!whatsapp) return "-";
    const clean = whatsapp.replace(/\D/g, "");
    if (clean.length === 11) {
      return clean.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (clean.length === 10) {
      return clean.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return whatsapp;
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold">Clientes</h1>
            <p className="text-neutral-600 mt-1">
              Base de clientes e relacionamento
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                Erro ao carregar clientes
              </h3>
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
          <h1 className="text-2xl font-heading font-semibold">Clientes</h1>
          <p className="text-neutral-600 mt-1">
            Base de clientes e relacionamento
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              style={{ backgroundColor: "var(--brand-700)", color: "white" }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleSubmitCliente}>
              <DialogHeader>
                <DialogTitle>
                  {editingCliente ? "Editar Cliente" : "Novo Cliente"}
                </DialogTitle>
                <DialogDescription>
                  {editingCliente
                    ? "Atualize as informações do cliente"
                    : "Preencha os dados para cadastrar um novo cliente"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    CPF/CNPJ
                  </label>
                  <Input
                    name="cpfcnpj"
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    defaultValue={editingCliente?.cpfcnpj}
                    disabled={!!editingCliente}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Nome</label>
                  <Input
                    name="nome"
                    placeholder="Nome completo ou razão social"
                    defaultValue={editingCliente?.nome || ""}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    WhatsApp
                  </label>
                  <Input
                    name="whatsapp"
                    placeholder="(00) 00000-0000"
                    defaultValue={editingCliente?.whatsapp || ""}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingCliente(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={clienteMutation.isPending}>
                  {clienteMutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingCliente ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* P2.1 - Filtros conforme especificação */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <Input
                placeholder="Buscar por CPF/CNPJ ou nome..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={filterProcessos}
              onValueChange={(value) => {
                setFilterProcessos(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os clientes</SelectItem>
                <SelectItem value="com-processos">Com processos</SelectItem>
                <SelectItem value="sem-processos">Sem processos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* P2.1 - Tabela conforme especificação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Clientes ({clientesData.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: "var(--brand-700)" }}
              />
              <span className="ml-2 text-neutral-600">
                Carregando clientes...
              </span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead># Processos</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesData.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="text-neutral-500">
                        <Users className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                        <p>Nenhum cliente encontrado</p>
                        <p className="text-sm">
                          Ajuste os filtros ou adicione um novo cliente
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  clientesData.data?.map((cliente) => (
                    <TableRow
                      key={cliente.cpfcnpj}
                      className="hover:bg-neutral-50"
                    >
                      <TableCell className="font-mono text-sm">
                        {formatCpfCnpj(cliente.cpfcnpj)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {cliente.nome || "Nome não informado"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {cliente.whatsapp ? (
                            <>
                              <Phone
                                className="w-4 h-4"
                                style={{ color: "var(--success)" }}
                              />
                              <span className="text-sm">
                                {formatWhatsApp(cliente.whatsapp)}
                              </span>
                            </>
                          ) : (
                            <span className="text-neutral-400 text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            cliente.processo_count > 0 ? "default" : "secondary"
                          }
                          style={
                            cliente.processo_count > 0
                              ? {
                                  backgroundColor: "var(--brand-700)",
                                  color: "white",
                                }
                              : {}
                          }
                        >
                          {cliente.processo_count} processo
                          {cliente.processo_count !== 1 ? "s" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCliente(cliente);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Abrir
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateProcess(cliente)}
                            style={{ color: "var(--brand-700)" }}
                          >
                            <FolderPlus className="w-4 h-4 mr-1" />
                            Criar Processo
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingCliente(cliente);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
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

      {/* P2.1 - Paginação 20/pg */}
      {clientesData.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-600">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
            {Math.min(currentPage * itemsPerPage, clientesData.total)} de{" "}
            {clientesData.total} clientes
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
              Página {currentPage} de {clientesData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === clientesData.totalPages}
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
