import React, { useState } from "react";
import {
  Gavel,
  Plus,
  Eye,
  Download,
  Edit2,
  Trash2,
  Bot,
  FileText,
  Calendar,
  Building,
  User,
  Clock,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Copy,
  Share,
  ExternalLink,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { formatDate } from "../lib/utils";

interface Peticao {
  id: string;
  numero_cnj?: string;
  tipo?: string;
  conteudo?: string;
  created_at: string;
  status?: "draft" | "generated" | "approved" | "filed";
  tribunal?: string;
  vara_forum?: string;
  data_protocolo?: string;
  numero_protocolo?: string;
  advogados?: string[];
  metadata?: {
    [key: string]: any;
  };
}

interface PecaForm {
  tipo: string;
  numero_cnj: string;
  conteudo: string;
  tribunal?: string;
  vara_forum?: string;
  prompt_ia?: string;
}

const TIPOS_PECA = [
  { value: "peticao_inicial", label: "Petição Inicial" },
  { value: "contestacao", label: "Contestação" },
  { value: "recurso", label: "Recurso" },
  { value: "agravo", label: "Agravo" },
  { value: "apelacao", label: "Apelação" },
  { value: "embargos", label: "Embargos" },
  { value: "manifestacao", label: "Manifestação" },
  { value: "peticao_simples", label: "Petição Simples" },
  { value: "memoriais", label: "Memoriais" },
  { value: "razoes_finais", label: "Razões Finais" },
  { value: "defesa_previa", label: "Defesa Prévia" },
  { value: "alegacoes_finais", label: "Alegações Finais" },
];

interface PecasAIManagerProps {
  searchTerm?: string;
  selectedCNJ?: string;
}

export function PecasAIManager({ searchTerm = "", selectedCNJ }: PecasAIManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState<Peticao | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [pecaForm, setPecaForm] = useState<PecaForm>({
    tipo: "",
    numero_cnj: selectedCNJ || "",
    conteudo: "",
    tribunal: "",
    vara_forum: "",
    prompt_ia: "",
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Queries
  const { data: peticoes = [], isLoading } = useQuery({
    queryKey: ["peticoes-ai", searchTerm, selectedCNJ, filterStatus, filterTipo],
    queryFn: async () => {
      let query = supabase
        .from("peticoes")
        .select("*")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`tipo.ilike.%${searchTerm}%,numero_cnj.ilike.%${searchTerm}%,conteudo.ilike.%${searchTerm}%`);
      }

      if (selectedCNJ) {
        query = query.eq("numero_cnj", selectedCNJ);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Apply client-side filters
      let filtered = data || [];
      if (filterStatus !== "all") {
        filtered = filtered.filter(p => p.status === filterStatus);
      }
      if (filterTipo !== "all") {
        filtered = filtered.filter(p => p.tipo === filterTipo);
      }

      return filtered;
    },
  });

  // Mutations
  const createPecaMutation = useMutation({
    mutationFn: async (form: PecaForm) => {
      const { data, error } = await supabase
        .from("peticoes")
        .insert({
          tipo: form.tipo,
          numero_cnj: form.numero_cnj || null,
          conteudo: form.conteudo,
          status: "draft",
          metadata: {
            tribunal: form.tribunal,
            vara_forum: form.vara_forum,
            prompt_ia: form.prompt_ia,
            generated_by: "manual",
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peticoes-ai"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Peça criada com sucesso!",
        description: "A peça processual foi salva.",
      });
    },
  });

  const generateAIMutation = useMutation({
    mutationFn: async (prompt: string) => {
      setIsGenerating(true);
      
      // Call AI generation function
      const response = await fetch("/.netlify/functions/generate-peca-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: pecaForm.tipo,
          numero_cnj: pecaForm.numero_cnj,
          prompt: prompt,
          tribunal: pecaForm.tribunal,
          vara_forum: pecaForm.vara_forum,
        }),
      });

      if (!response.ok) throw new Error("Falha na geração IA");
      
      const result = await response.json();
      return result.conteudo;
    },
    onSuccess: (conteudo) => {
      setPecaForm(prev => ({ ...prev, conteudo }));
      setIsGenerating(false);
      toast({
        title: "Conteúdo gerado com IA!",
        description: "O texto da peça foi gerado automaticamente.",
      });
    },
    onError: () => {
      setIsGenerating(false);
      toast({
        title: "Erro na geração",
        description: "Não foi possível gerar o conteúdo com IA.",
        variant: "destructive",
      });
    },
  });

  const deletePecaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("peticoes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peticoes-ai"] });
      toast({
        title: "Peça excluída",
        description: "A peça processual foi removida.",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("peticoes")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["peticoes-ai"] });
    },
  });

  // Handlers
  const resetForm = () => {
    setPecaForm({
      tipo: "",
      numero_cnj: selectedCNJ || "",
      conteudo: "",
      tribunal: "",
      vara_forum: "",
      prompt_ia: "",
    });
  };

  const handleGenerateAI = () => {
    if (!pecaForm.prompt_ia) {
      toast({
        title: "Prompt necessário",
        description: "Digite instruções para a geração com IA.",
        variant: "destructive",
      });
      return;
    }

    generateAIMutation.mutate(pecaForm.prompt_ia);
  };

  const handleSave = () => {
    if (!pecaForm.tipo || !pecaForm.conteudo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o tipo e conteúdo da peça.",
        variant: "destructive",
      });
      return;
    }

    createPecaMutation.mutate(pecaForm);
  };

  const exportToPDF = async (peca: Peticao) => {
    try {
      const response = await fetch("/.netlify/functions/export-peca-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: peca.id,
          tipo: peca.tipo,
          conteudo: peca.conteudo,
          numero_cnj: peca.numero_cnj,
        }),
      });

      if (!response.ok) throw new Error("Falha na exportação");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${peca.tipo || "peca"}-${peca.numero_cnj || "sem-cnj"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "PDF exportado",
        description: "A peça foi exportada como PDF.",
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar a peça.",
        variant: "destructive",
      });
    }
  };

  const copyContent = (conteudo: string) => {
    navigator.clipboard.writeText(conteudo).then(() => {
      toast({
        title: "Conteúdo copiado",
        description: "O texto da peça foi copiado para a área de transferência.",
      });
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Rascunho</Badge>;
      case "generated":
        return <Badge className="bg-blue-100 text-blue-800">Gerado</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Aprovado</Badge>;
      case "filed":
        return <Badge className="bg-purple-100 text-purple-800">Protocolado</Badge>;
      default:
        return <Badge variant="outline">-</Badge>;
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "filed":
        return <FileText className="h-4 w-4 text-purple-600" />;
      case "generated":
        return <Bot className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center">
            <Gavel className="mr-2 h-5 w-5 text-purple-600" />
            Peças Processuais IA
          </h3>
          <p className="text-gray-600 text-sm">
            Documentos jurídicos gerados e gerenciados por IA
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Peça
        </Button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="draft">Rascunho</SelectItem>
            <SelectItem value="generated">Gerado</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="filed">Protocolado</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterTipo} onValueChange={setFilterTipo}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo de Peça" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Tipos</SelectItem>
            {TIPOS_PECA.map((tipo) => (
              <SelectItem key={tipo.value} value={tipo.value}>
                {tipo.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Peças List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse border rounded-lg p-4"
              >
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : peticoes.length > 0 ? (
          peticoes.map((peca) => (
            <Card key={peca.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getStatusIcon(peca.status)}
                      <h4 className="font-medium">
                        {TIPOS_PECA.find(t => t.value === peca.tipo)?.label || peca.tipo}
                      </h4>
                      {getStatusBadge(peca.status)}
                      {peca.numero_cnj && (
                        <Badge variant="outline">{peca.numero_cnj}</Badge>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 mb-3 overflow-hidden">
                      {peca.conteudo?.substring(0, 200)}...
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        {formatDate(peca.created_at)}
                      </span>
                      {peca.tribunal && (
                        <span className="flex items-center">
                          <Building className="mr-1 h-3 w-3" />
                          {peca.tribunal}
                        </span>
                      )}
                      {peca.vara_forum && (
                        <span>{peca.vara_forum}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedPeca(peca);
                        setIsViewOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyContent(peca.conteudo || "")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => exportToPDF(peca)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deletePecaMutation.mutate(peca.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <Gavel className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              Nenhuma peça encontrada
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedCNJ || filterStatus !== "all" || filterTipo !== "all"
                ? "Tente ajustar os filtros de busca"
                : "Crie sua primeira peça processual com IA"}
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Peça IA
            </Button>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🤖 Nova Peça Processual com IA</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tipo">Tipo de Peça *</Label>
                <Select
                  value={pecaForm.tipo}
                  onValueChange={(value) => setPecaForm({ ...pecaForm, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_PECA.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="numero_cnj">CNJ do Processo</Label>
                <Input
                  id="numero_cnj"
                  value={pecaForm.numero_cnj}
                  onChange={(e) => setPecaForm({ ...pecaForm, numero_cnj: e.target.value })}
                  placeholder="0000000-00.0000.0.00.0000"
                />
              </div>

              <div>
                <Label htmlFor="tribunal">Tribunal</Label>
                <Input
                  id="tribunal"
                  value={pecaForm.tribunal}
                  onChange={(e) => setPecaForm({ ...pecaForm, tribunal: e.target.value })}
                  placeholder="Ex: TJSP, TJRJ, STJ"
                />
              </div>

              <div>
                <Label htmlFor="vara_forum">Vara/Fórum</Label>
                <Input
                  id="vara_forum"
                  value={pecaForm.vara_forum}
                  onChange={(e) => setPecaForm({ ...pecaForm, vara_forum: e.target.value })}
                  placeholder="Ex: 1ª Vara Cível"
                />
              </div>
            </div>

            {/* IA Generation Section */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <Bot className="mr-2 h-5 w-5" />
                Geração com Inteligência Artificial
              </h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="prompt_ia">Instruções para IA</Label>
                  <Textarea
                    id="prompt_ia"
                    value={pecaForm.prompt_ia}
                    onChange={(e) => setPecaForm({ ...pecaForm, prompt_ia: e.target.value })}
                    placeholder="Descreva os detalhes do caso, argumentos principais, pedidos específicos..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleGenerateAI}
                  disabled={!pecaForm.tipo || !pecaForm.prompt_ia || isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Gerando conteúdo...
                    </>
                  ) : (
                    <>
                      <Bot className="mr-2 h-4 w-4" />
                      Gerar Conteúdo com IA
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Content Editor */}
            <div>
              <Label htmlFor="conteudo">Conteúdo da Peça *</Label>
              <Textarea
                id="conteudo"
                value={pecaForm.conteudo}
                onChange={(e) => setPecaForm({ ...pecaForm, conteudo: e.target.value })}
                placeholder="Digite ou gere o conteúdo da peça..."
                rows={15}
                className="font-mono text-sm"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={!pecaForm.tipo || !pecaForm.conteudo || createPecaMutation.isPending}
              >
                {createPecaMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Peça"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPeca && (
                TIPOS_PECA.find(t => t.value === selectedPeca.tipo)?.label || selectedPeca.tipo
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedPeca && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getStatusBadge(selectedPeca.status)}
                  {selectedPeca.numero_cnj && (
                    <Badge variant="outline">{selectedPeca.numero_cnj}</Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyContent(selectedPeca.conteudo || "")}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportToPDF(selectedPeca)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>

              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap font-mono text-sm border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto">
                  {selectedPeca.conteudo}
                </div>
              </div>

              <div className="text-xs text-gray-500 flex items-center space-x-4">
                <span>Criado em {formatDate(selectedPeca.created_at)}</span>
                {selectedPeca.tribunal && <span>Tribunal: {selectedPeca.tribunal}</span>}
                {selectedPeca.vara_forum && <span>Vara: {selectedPeca.vara_forum}</span>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
