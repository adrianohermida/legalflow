import React, { useState, useEffect } from "react";
import {
  Target,
  Plus,
  DollarSign,
  User,
  Calendar,
  TrendingUp,
  Filter,
  Search,
  Percent,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { supabase, lf } from "../../lib/supabase";
import { useToast } from "../../hooks/use-toast";

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  contact_id?: string;
  contact_name?: string;
  contact_email?: string;
  stage_id: number;
  pipeline_id: number;
  created_at: string;
  updated_at: string;
}

interface PipelineStage {
  id: number;
  code: string;
  name: string;
  order_index: number;
  is_won: boolean;
  is_lost: boolean;
}

interface NewDealData {
  title: string;
  value: string;
  currency: string;
  contact_id: string;
  probability: string;
}

const DealsKanban = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [highlightDealId, setHighlightDealId] = useState<string | null>(null);

  const [newDealData, setNewDealData] = useState<NewDealData>({
    title: "",
    value: "",
    currency: "BRL",
    contact_id: "",
    probability: "50",
  });

  // Pegar deal destacado da URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const highlight = params.get("highlight");
    if (highlight) {
      setHighlightDealId(highlight);
      // Remover highlight após 3 segundos
      setTimeout(() => setHighlightDealId(null), 3000);
    }
  }, []);

  // Query para pipeline stages (sales)
  const { data: stages = [] } = useSupabaseQuery(
    "pipeline-stages-sales",
    `
      SELECT ps.id, ps.code, ps.name, ps.order_index, ps.is_won, ps.is_lost
      FROM legalflow.pipeline_stages ps
      JOIN legalflow.pipeline_defs pd ON pd.id = ps.pipeline_id
      WHERE pd.code = 'sales'
      ORDER BY ps.order_index
    `,
    [],
  );

  // Query para deals por stage
  const {
    data: deals = [],
    isLoading,
    refetch,
  } = useSupabaseQuery(
    ["deals-kanban", searchTerm],
    `
      SELECT 
        d.id, d.title, d.value, d.currency, d.stage, d.probability,
        d.contact_id, d.stage_id, d.pipeline_id, d.created_at, d.updated_at,
        c.name as contact_name, c.email as contact_email
      FROM legalflow.deals d
      LEFT JOIN legalflow.contacts c ON c.id = d.contact_id
      JOIN legalflow.pipeline_defs pd ON pd.id = d.pipeline_id
      WHERE pd.code = 'sales'
        AND ($1 = '' OR d.title ILIKE '%' || $1 || '%' OR c.name ILIKE '%' || $1 || '%')
      ORDER BY d.updated_at DESC
    `,
    [searchTerm],
  );

  // Query para contatos (para novo deal)
  const { data: contacts = [] } = useSupabaseQuery(
    "contacts-for-deals",
    `
      SELECT id, name, email, phone
      FROM legalflow.contacts
      ORDER BY name
      LIMIT 100
    `,
    [],
  );

  // Query para estatísticas
  const { data: stats } = useSupabaseQuery(
    "deals-stats",
    `
      SELECT 
        COUNT(*) as total,
        SUM(value) as total_value,
        AVG(probability) as avg_probability,
        COUNT(*) FILTER (WHERE stage_id IN (
          SELECT id FROM legalflow.pipeline_stages ps2 
          JOIN legalflow.pipeline_defs pd2 ON pd2.id = ps2.pipeline_id 
          WHERE pd2.code = 'sales' AND ps2.is_won = true
        )) as won_count,
        SUM(value) FILTER (WHERE stage_id IN (
          SELECT id FROM legalflow.pipeline_stages ps2 
          JOIN legalflow.pipeline_defs pd2 ON pd2.id = ps2.pipeline_id 
          WHERE pd2.code = 'sales' AND ps2.is_won = true
        )) as won_value
      FROM legalflow.deals d
      JOIN legalflow.pipeline_defs pd ON pd.id = d.pipeline_id
      WHERE pd.code = 'sales'
    `,
    [],
  );

  // Agrupar deals por stage
  const dealsByStage = stages.reduce(
    (acc, stage) => {
      acc[stage.id] = deals.filter((deal) => deal.stage_id === stage.id);
      return acc;
    },
    {} as Record<number, Deal[]>,
  );

  // Criar novo deal
  const handleCreateDeal = async () => {
    try {
      const salesPipeline = await lf
        .from("pipeline_defs")
        .select("id")
        .eq("code", "sales")
        .single();

      const firstStage = stages.find((s) => s.order_index === 1);

      const { data, error } = await lf
        .from("deals")
        .insert({
          title: newDealData.title,
          value: parseFloat(newDealData.value) || 0,
          currency: newDealData.currency,
          contact_id: newDealData.contact_id || null,
          probability: parseInt(newDealData.probability) || 50,
          pipeline_id: salesPipeline.data?.id,
          stage_id: firstStage?.id,
          stage: firstStage?.code || "novo",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Deal criado com sucesso",
        description: `${newDealData.title} foi adicionado ao pipeline.`,
      });

      setIsNewDealOpen(false);
      setNewDealData({
        title: "",
        value: "",
        currency: "BRL",
        contact_id: "",
        probability: "50",
      });
      refetch();
    } catch (error) {
      console.error("Erro ao criar deal:", error);
      toast({
        title: "Erro ao criar deal",
        description: "Não foi possível criar o deal.",
        variant: "destructive",
      });
    }
  };

  // Mover deal para stage (drag & drop)
  const handleMoveDeal = async (dealId: string, newStageId: number) => {
    try {
      const newStage = stages.find((s) => s.id === newStageId);
      const deal = deals?.find((d) => d.id === dealId);

      const { error } = await lf
        .from("deals")
        .update({
          stage_id: newStageId,
          stage: newStage?.code || "novo",
          updated_at: new Date().toISOString(),
        })
        .eq("id", dealId);

      if (error) throw error;

      // Automação: ao mover para estágio de "ganho", oferece criar checkout
      if (newStage?.is_won && deal) {
        toast({
          title: "Deal fechado com sucesso! 🎉",
          description: `${deal.title} foi movido para ${newStage.name}`,
          action: (
            <Button
              size="sm"
              onClick={() => handleCreateCheckout(deal)}
              variant="default"
            >
              Criar Checkout
            </Button>
          ),
        });
      } else {
        toast({
          title: "Deal movido",
          description: `Deal movido para ${newStage?.name}.`,
        });
      }

      refetch();
    } catch (error) {
      console.error("Erro ao mover deal:", error);
      toast({
        title: "Erro ao mover deal",
        description: "Não foi possível mover o deal.",
        variant: "destructive",
      });
    }
  };

  // Criar checkout Stripe para deal fechado
  const handleCreateCheckout = (deal: Deal) => {
    // Integração com Stripe/checkout - implementação futura
    toast({
      title: "Checkout em desenvolvimento",
      description: "Feature de checkout será implementada na próxima versão",
    });
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, stageId: number) => {
    e.preventDefault();
    if (draggedDeal && draggedDeal.stage_id !== stageId) {
      handleMoveDeal(draggedDeal.id, stageId);
    }
    setDraggedDeal(null);
  };

  const formatCurrency = (value: number, currency: string = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  const getStageColor = (stage: PipelineStage) => {
    if (stage.is_won) return "bg-green-100 border-green-300";
    if (stage.is_lost) return "bg-red-100 border-red-300";

    switch (stage.code) {
      case "novo":
        return "bg-gray-50 border-gray-200";
      case "qualificado":
        return "bg-gray-100 border-gray-300";
      case "proposta":
        return "bg-gray-200 border-gray-400";
      default:
        return "bg-gray-100 border-gray-300";
    }
  };

  const getDealCardClass = (deal: Deal) => {
    const baseClass =
      "p-4 bg-white border rounded-lg shadow-sm cursor-move hover:shadow-md transition-shadow";
    const highlightClass =
      highlightDealId === deal.id
        ? " ring-2 ring-gray-500 ring-opacity-50"
        : "";
    return baseClass + highlightClass;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="h-8 w-8" />
            Pipeline de Vendas
          </h1>
          <p className="text-gray-600 mt-1">
            Acompanhe suas oportunidades até o fechamento
          </p>
        </div>

        <Button onClick={() => setIsNewDealOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Deal
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Target className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">
                    Total Deals
                  </p>
                  <p className="text-2xl font-bold">{stats.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">
                    Valor Total
                  </p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.total_value || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Fechados</p>
                  <p className="text-2xl font-bold">{stats.won_count || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Percent className="h-8 w-8 text-orange-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">
                    Prob. Média
                  </p>
                  <p className="text-2xl font-bold">
                    {Math.round(stats.avg_probability || 0)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar deals ou contatos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`min-h-96 p-4 rounded-lg border-2 border-dashed ${getStageColor(stage)}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            {/* Stage Header */}
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center justify-between">
                {stage.name}
                <Badge variant="outline">
                  {dealsByStage[stage.id]?.length || 0}
                </Badge>
              </h3>

              {/* Stage Value */}
              {dealsByStage[stage.id]?.length > 0 && (
                <p className="text-sm text-gray-600 mt-1">
                  {formatCurrency(
                    dealsByStage[stage.id].reduce(
                      (sum, deal) => sum + deal.value,
                      0,
                    ),
                  )}
                </p>
              )}
            </div>

            {/* Deal Cards */}
            <div className="space-y-3">
              {isLoading
                ? // Loading skeletons
                  Array.from({ length: 2 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse p-4 bg-gray-100 rounded-lg"
                    >
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))
                : dealsByStage[stage.id]?.map((deal) => (
                    <div
                      key={deal.id}
                      className={getDealCardClass(deal)}
                      draggable
                      onDragStart={(e) => handleDragStart(e, deal)}
                    >
                      {/* Deal Title */}
                      <h4 className="font-medium text-gray-900 mb-2">
                        {deal.title}
                      </h4>

                      {/* Deal Value */}
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-700">
                          {formatCurrency(deal.value, deal.currency)}
                        </span>
                      </div>

                      {/* Contact */}
                      {deal.contact_name && (
                        <div className="flex items-center gap-2 mb-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {deal.contact_name}
                          </span>
                        </div>
                      )}

                      {/* Probability */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Percent className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-600">
                            {deal.probability}%
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-600">
                            {new Date(deal.updated_at).toLocaleDateString(
                              "pt-BR",
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        ))}
      </div>

      {/* Dialog: Novo Deal */}
      <Dialog open={isNewDealOpen} onOpenChange={setIsNewDealOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Deal</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Título do Deal *</Label>
              <Input
                id="title"
                value={newDealData.title}
                onChange={(e) =>
                  setNewDealData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Nome da oportunidade"
              />
            </div>

            <div>
              <Label htmlFor="value">Valor</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={newDealData.value}
                onChange={(e) =>
                  setNewDealData((prev) => ({ ...prev, value: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="currency">Moeda</Label>
              <Select
                value={newDealData.currency}
                onValueChange={(value) =>
                  setNewDealData((prev) => ({ ...prev, currency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (BRL)</SelectItem>
                  <SelectItem value="USD">Dólar (USD)</SelectItem>
                  <SelectItem value="EUR">Euro (EUR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contact">Contato</Label>
              <Select
                value={newDealData.contact_id}
                onValueChange={(value) =>
                  setNewDealData((prev) => ({ ...prev, contact_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar contato..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum contato</SelectItem>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.name} {contact.email && `(${contact.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="probability">Probabilidade (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={newDealData.probability}
                onChange={(e) =>
                  setNewDealData((prev) => ({
                    ...prev,
                    probability: e.target.value,
                  }))
                }
                placeholder="50"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsNewDealOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateDeal} disabled={!newDealData.title}>
              Criar Deal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealsKanban;
