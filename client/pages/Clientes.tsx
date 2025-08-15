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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Search,
  Plus,
  Users,
  Phone,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Edit,
  Eye,
  FolderPlus,
  ExternalLink,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { ClienteFormModal } from "../components/ClienteFormModal";
import { cpfUtils, cnpjUtils } from "../lib/external-apis";

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
  email?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
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

  // Enhanced query with process count binding
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

      // Apply search filters for CPF/name
      if (searchTerm) {
        query = query.or(
          `cpfcnpj.ilike.%${searchTerm}%,nome.ilike.%${searchTerm}%`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      // Process count and apply filter
      const processedData = data.map((cliente: any) => ({
        ...cliente,
        processo_count: cliente.clientes_processos?.length || 0,
      }));

      // Filter by process count
      let filteredData = processedData;
      if (filterProcessos === "com-processos") {
        filteredData = processedData.filter((c) => c.processo_count > 0);
      } else if (filterProcessos === "sem-processos") {
        filteredData = processedData.filter((c) => c.processo_count === 0);
      }

      // Apply pagination (20/page as specified)
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

  // Enhanced mutation for create/update
  const clienteMutation = useMutation({
    mutationFn: async (clienteData: ClienteFormData) => {
      // Only save core cliente data to public.clientes
      const coreData = {
        cpfcnpj: clienteData.cpfcnpj,
        nome: clienteData.nome,
        whatsapp: clienteData.whatsapp,
      };

      const { data, error } = editingCliente
        ? await supabase
            .from("clientes")
            .update(coreData)
            .eq("cpfcnpj", editingCliente.cpfcnpj)
            .select()
        : await supabase.from("clientes").insert([coreData]).select();

      if (error) throw error;
      return { data, formData: clienteData };
    },
    onSuccess: (result) => {
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

  const handleSubmitCliente = (clienteData: ClienteFormData) => {
    clienteMutation.mutate(clienteData);
  };

  const handleCreateProcess = (cliente: Cliente) => {
    // CTA "Criar processo" pre-fills CPF/CNPJ as specified
    const params = new URLSearchParams({
      cliente_cpfcnpj: cliente.cpfcnpj,
      cliente_nome: cliente.nome || "",
    });
    window.location.href = `/processos/novo?${params.toString()}`;
  };

  const handleOpenClienteDetail = (cliente: Cliente) => {
    // Navigate to client detail/profile page
    window.location.href = `/crm/contatos/${cliente.cpfcnpj}`;
  };

  const formatCpfCnpj = (cpfcnpj: string) => {
    const clean = cpfcnpj.replace(/\D/g, "");
    if (clean.length === 11) {
      return cpfUtils.format(cpfcnpj);
    } else if (clean.length === 14) {
      return cnpjUtils.format(cpfcnpj);
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

  const getDocumentType = (cpfcnpj: string) => {
    const clean = cpfcnpj.replace(/\D/g, "");
    return clean.length === 11 ? "CPF" : "CNPJ";
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
        <Button
          onClick={() => {
            setEditingCliente(null);
            setIsDialogOpen(true);
          }}
          className="bg-gray-800 text-white hover:bg-gray-900"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      {/* Enhanced search and filters */}
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

      {/* Enhanced table with specified columns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Clientes ({clientesData.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-800" />
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
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-mono text-sm">
                            {formatCpfCnpj(cliente.cpfcnpj)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {getDocumentType(cliente.cpfcnpj)}
                          </Badge>
                        </div>
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
                              <Phone className="w-4 h-4 text-gray-700" />
                              <span className="text-sm">
                                {formatWhatsApp(cliente.whatsapp)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  window.open(
                                    `https://wa.me/55${cliente.whatsapp?.replace(/\D/g, "")}`,
                                    "_blank",
                                  )
                                }
                                className="p-1 h-auto"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
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
                            onClick={() => handleOpenClienteDetail(cliente)}
                            title="Ver detalhes do cliente"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Abrir
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCreateProcess(cliente)}
                            className="text-gray-800"
                            title="Criar novo processo para este cliente"
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
                            title="Editar informações do cliente"
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

      {/* Enhanced pagination (20/page as specified) */}
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

      {/* Enhanced modal with DirectData and ViaCEP integration */}
      <ClienteFormModal
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingCliente(null);
        }}
        onSubmit={handleSubmitCliente}
        editingCliente={editingCliente}
        isLoading={clienteMutation.isPending}
      />
    </div>
  );
}
