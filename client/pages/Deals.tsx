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
  DollarSign,
  Plus,
  TrendingUp,
  Users,
  Target,
  Loader2,
  AlertTriangle,
  Edit,
  ArrowRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { lf, supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  cliente_cpfcnpj: string | null;
  numero_cnj: string | null;
  owner_oab: number | null;
  created_at: string;
  updated_at: string;
  cliente_nome?: string;
  owner_nome?: string;
}

interface DealFormData {
  title: string;
  value: string;
  currency: string;
  probability: string;
  cliente_cpfcnpj: string;
  numero_cnj: string;
  owner_oab: string;
}

const stages = [
  { value: "novo", label: "Novo", color: "secondary" },
  { value: "qualificado", label: "Qualificado", color: "default" },
  { value: "proposta", label: "Proposta", color: "default" },
  { value: "negociacao", label: "Negociação", color: "default" },
  { value: "ganho", label: "Ganho", color: "secondary" },
  { value: "perdido", label: "Perdido", color: "destructive" },
];

export function Deals() {
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // P2.9 - Buscar deals
  const {
    data: deals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await lf
        .from("deals")
        .select(`
          *,
          clientes:public.clientes!deals_cliente_cpfcnpj_fkey (
            nome
          ),
          advogados:public.advogados!deals_owner_oab_fkey (
            nome
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((deal: any) => ({
        ...deal,
        cliente_nome: deal.clientes?.nome,
        owner_nome: deal.advogados?.nome,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  // Buscar clientes e advogados para o formulário
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .select("cpfcnpj, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: advogados = [] } = useQuery({
    queryKey: ["advogados-deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advogados")
        .select("oab, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: processos = [] } = useQuery({
    queryKey: ["processos-deals"],
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

  // P2.9 - Mutation para criar/editar deal
  const dealMutation = useMutation({
    mutationFn: async (dealData: DealFormData) => {
      const dataToSave = {
        title: dealData.title,
        value: parseFloat(dealData.value) || 0,
        currency: dealData.currency,
        stage: "novo",
        probability: parseInt(dealData.probability) || 10,
        cliente_cpfcnpj: dealData.cliente_cpfcnpj || null,
        numero_cnj: dealData.numero_cnj || null,
        owner_oab: dealData.owner_oab ? parseInt(dealData.owner_oab) : null,
      };

      const { data, error } = editingDeal
        ? await lf
            .from("deals")
            .update(dataToSave)
            .eq("id", editingDeal.id)
            .select()
        : await lf
            .from("deals")
            .insert([dataToSave])
            .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      setIsDialogOpen(false);
      setEditingDeal(null);
      toast({
        title: editingDeal ? "Deal atualizado" : "Deal criado",
        description: editingDeal 
          ? "Deal atualizado com sucesso" 
          : "Novo deal adicionado ao pipeline",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar deal",
        variant: "destructive",
      });
    },
  });

  // P2.9 - Mutation para mover de estágio
  const moveStageMutation = useMutation({
    mutationFn: async ({ dealId, newStage }: { dealId: string; newStage: string }) => {
      const { data, error } = await lf
        .from("deals")
        .update({ stage: newStage, updated_at: new Date().toISOString() })
        .eq("id", dealId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      toast({
        title: "Estágio atualizado",
        description: "Deal movido para novo estágio",
      });
    },
  });

  const handleSubmitDeal = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const dealData: DealFormData = {
      title: formData.get("title") as string,
      value: formData.get("value") as string,
      currency: formData.get("currency") as string,
      probability: formData.get("probability") as string,
      cliente_cpfcnpj: formData.get("cliente_cpfcnpj") as string,
      numero_cnj: formData.get("numero_cnj") as string,
      owner_oab: formData.get("owner_oab") as string,
    };

    dealMutation.mutate(dealData);
  };

  const formatCurrency = (value: number, currency: string = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  const formatCNJ = (cnj: string | null) => {
    if (!cnj) return null;
    const clean = cnj.replace(/\D/g, "");
    if (clean.length === 20) {
      return clean.replace(/(\d{7})(\d{2})(\d{4})(\d{1})(\d{2})(\d{4})/, "$1-$2.$3.$4.$5.$6");
    }
    return cnj;
  };

  const getStageColor = (stage: string) => {
    const stageConfig = stages.find(s => s.value === stage);
    return stageConfig?.color || "secondary";
  };

  const getDealsByStage = (stage: string) => {
    return deals.filter(deal => deal.stage === stage);
  };

  const getTotalValue = () => {
    return deals.reduce((sum, deal) => sum + deal.value, 0);
  };

  const getWonValue = () => {
    return deals
      .filter(deal => deal.stage === "ganho")
      .reduce((sum, deal) => sum + deal.value, 0);
  };

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold">Deals</h1>
            <p className="text-neutral-600 mt-1">Acompanhar oportunidades/serviços até "ganho"</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-danger mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Erro ao carregar deals</h3>
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
          <h1 className="text-2xl font-heading font-semibold">Deals</h1>
          <p className="text-neutral-600 mt-1">Acompanhar oportunidades/serviços até "ganho"</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(value: "kanban" | "grid") => setViewMode(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kanban">Kanban</SelectItem>
              <SelectItem value="grid">Grid</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button style={{ backgroundColor: 'var(--brand-700)', color: 'white' }}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Deal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleSubmitDeal}>
                <DialogHeader>
                  <DialogTitle>
                    {editingDeal ? "Editar Deal" : "Novo Deal"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingDeal 
                      ? "Atualize as informações do deal" 
                      : "Crie uma nova oportunidade de negócio"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Título *</label>
                    <Input
                      name="title"
                      placeholder="Título do deal"
                      defaultValue={editingDeal?.title}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Valor *</label>
                      <Input
                        name="value"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        defaultValue={editingDeal?.value}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Moeda</label>
                      <Select name="currency" defaultValue={editingDeal?.currency || "BRL"}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BRL">BRL</SelectItem>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Probabilidade (%)</label>
                    <Input
                      name="probability"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="10"
                      defaultValue={editingDeal?.probability}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Cliente</label>
                    <Select name="cliente_cpfcnpj" defaultValue={editingDeal?.cliente_cpfcnpj || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um cliente (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum cliente</SelectItem>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.cpfcnpj} value={cliente.cpfcnpj}>
                            {cliente.nome} ({cliente.cpfcnpj})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Processo (CNJ)</label>
                    <Select name="numero_cnj" defaultValue={editingDeal?.numero_cnj || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um processo (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nenhum processo</SelectItem>
                        {processos.map((processo) => (
                          <SelectItem key={processo.numero_cnj} value={processo.numero_cnj}>
                            {formatCNJ(processo.numero_cnj)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Dono (OAB)</label>
                    <Select name="owner_oab" defaultValue={editingDeal?.owner_oab?.toString() || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um responsável (opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Não atribuído</SelectItem>
                        {advogados.map((advogado) => (
                          <SelectItem key={advogado.oab} value={advogado.oab.toString()}>
                            {advogado.nome} (OAB {advogado.oab})
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
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingDeal(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={dealMutation.isPending}>
                    {dealMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingDeal ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4" style={{ color: 'var(--brand-700)' }} />
              <div>
                <p className="text-2xl font-semibold">{deals.length}</p>
                <p className="text-xs text-neutral-600">Total Deals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4" style={{ color: 'var(--success)' }} />
              <div>
                <p className="text-2xl font-semibold" style={{ color: 'var(--success)' }}>
                  {formatCurrency(getTotalValue())}
                </p>
                <p className="text-xs text-neutral-600">Valor Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--success)' }} />
              <div>
                <p className="text-2xl font-semibold" style={{ color: 'var(--success)' }}>
                  {formatCurrency(getWonValue())}
                </p>
                <p className="text-xs text-neutral-600">Valor Ganho</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4" style={{ color: 'var(--brand-700)' }} />
              <div>
                <p className="text-2xl font-semibold">
                  {deals.filter(d => d.stage === "ganho").length}
                </p>
                <p className="text-xs text-neutral-600">Deals Ganhos</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* P2.9 - Kanban por stage ou grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--brand-700)' }} />
          <span className="ml-2 text-neutral-600">Carregando deals...</span>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stages.map((stage) => {
            const stageDeals = getDealsByStage(stage.value);
            const stageValue = stageDeals.reduce((sum, deal) => sum + deal.value, 0);
            
            return (
              <Card key={stage.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    {stage.label} ({stageDeals.length})
                  </CardTitle>
                  <p className="text-xs text-neutral-600">
                    {formatCurrency(stageValue)}
                  </p>
                </CardHeader>
                <CardContent className="space-y-2">
                  {stageDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="p-3 border rounded-lg cursor-pointer hover:shadow-sm"
                      onClick={() => {
                        setEditingDeal(deal);
                        setIsDialogOpen(true);
                      }}
                    >
                      <div className="font-medium text-sm mb-1 truncate">
                        {deal.title}
                      </div>
                      <div className="text-xs text-neutral-600 mb-2">
                        {formatCurrency(deal.value, deal.currency)}
                      </div>
                      {deal.cliente_nome && (
                        <div className="text-xs text-neutral-500 truncate">
                          {deal.cliente_nome}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-2">
                        <Badge variant="outline" className="text-xs">
                          {deal.probability}%
                        </Badge>
                        {stage.value !== "perdido" && stage.value !== "ganho" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextStageIndex = stages.findIndex(s => s.value === stage.value) + 1;
                              if (nextStageIndex < stages.length - 1) {
                                moveStageMutation.mutate({
                                  dealId: deal.id,
                                  newStage: stages[nextStageIndex].value,
                                });
                              }
                            }}
                          >
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Grid de Deals ({deals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deals.map((deal) => (
                <div
                  key={deal.id}
                  className="p-4 border rounded-lg cursor-pointer hover:shadow-sm"
                  onClick={() => {
                    setEditingDeal(deal);
                    setIsDialogOpen(true);
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium truncate">{deal.title}</h4>
                    <Badge variant={getStageColor(deal.stage)}>
                      {stages.find(s => s.value === deal.stage)?.label}
                    </Badge>
                  </div>
                  <div className="text-lg font-semibold mb-2" style={{ color: 'var(--success)' }}>
                    {formatCurrency(deal.value, deal.currency)}
                  </div>
                  <div className="space-y-1 text-sm text-neutral-600">
                    {deal.cliente_nome && (
                      <div>Cliente: {deal.cliente_nome}</div>
                    )}
                    {deal.owner_nome && (
                      <div>Dono: {deal.owner_nome}</div>
                    )}
                    <div>Probabilidade: {deal.probability}%</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
