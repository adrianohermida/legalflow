import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Link, CheckCircle, Calendar, Trash2, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { toast } from "../hooks/use-toast";
import { lf } from "../lib/supabase";

interface StagePaymentLink {
  id: string;
  stage_instance_id: string;
  plano_pagamento_id: string;
  parcela_numero: number;
  trigger_on_status: 'started' | 'completed';
  stage_title?: string;
  valor_parcela?: number;
}

interface JourneyInstance {
  id: string;
  template_name: string;
  cliente_cpfcnpj: string;
}

interface PaymentPlan {
  id: string;
  cliente_cpfcnpj: string;
  descricao: string;
  valor_total: number;
  parcelas: PaymentInstallment[];
}

interface PaymentInstallment {
  numero: number;
  valor: number;
  vencimento: string;
  status: string;
}

interface StageInstance {
  id: string;
  title: string;
  status: string;
}

const LinkStageToPaymentDialog: React.FC<{
  journeyInstance: JourneyInstance;
  onSuccess: () => void;
}> = ({ journeyInstance, onSuccess }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    stageInstanceId: "",
    planoPagamentoId: "",
    parcelaNumero: 1,
    triggerOnStatus: 'completed' as 'started' | 'completed'
  });

  const { data: stageInstances } = useQuery({
    queryKey: ["journey-stage-instances", journeyInstance.id],
    queryFn: async () => {
      const { data, error } = await lf
        .from("stage_instances")
        .select(`
          id,
          status,
          journey_template_stages (
            title
          )
        `)
        .eq("instance_id", journeyInstance.id)
        .order("sla_at");
      
      if (error) throw error;
      return data.map(stage => ({
        id: stage.id,
        title: stage.journey_template_stages?.title || "Etapa",
        status: stage.status
      })) as StageInstance[];
    },
    enabled: open,
  });

  const { data: paymentPlans } = useQuery({
    queryKey: ["payment-plans", journeyInstance.cliente_cpfcnpj],
    queryFn: async () => {
      // Fetch real payment plans from database
      const { data, error } = await lf
        .from('planos_pagamento')
        .select(`
          id,
          cliente_cpfcnpj,
          amount_total,
          installments,
          paid_amount,
          status,
          parcelas_pagamento(*)
        `)
        .eq('cliente_cpfcnpj', journeyInstance.cliente_cpfcnpj);

      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  const linkMutation = useMutation({
    mutationFn: async () => {
      const { error } = await lf
        .from("stage_payment_links")
        .insert({
          stage_instance_id: formData.stageInstanceId,
          plano_pagamento_id: formData.planoPagamentoId,
          parcela_numero: formData.parcelaNumero,
          trigger_on_status: formData.triggerOnStatus
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Vínculo criado",
        description: "Etapa vinculada ao plano de pagamento.",
      });
      setOpen(false);
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao criar vínculo: " + error.message,
        variant: "destructive",
      });
    },
  });

  const selectedPlan = paymentPlans?.find(p => p.id === formData.planoPagamentoId);
  const selectedParcela = selectedPlan?.parcelas.find(p => p.numero === formData.parcelaNumero);
  const selectedStage = stageInstances?.find(s => s.id === formData.stageInstanceId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Vincular Etapa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-5 h-5" />
            Vincular Etapa ao Pagamento
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Etapa da Jornada</Label>
            <Select 
              value={formData.stageInstanceId} 
              onValueChange={(value) => setFormData({...formData, stageInstanceId: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a etapa" />
              </SelectTrigger>
              <SelectContent>
                {stageInstances?.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      <span>{stage.title}</span>
                      <Badge variant="secondary" className="text-xs">
                        {stage.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Plano de Pagamento</Label>
            <Select 
              value={formData.planoPagamentoId} 
              onValueChange={(value) => setFormData({...formData, planoPagamentoId: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o plano" />
              </SelectTrigger>
              <SelectContent>
                {paymentPlans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.descricao} (R$ {plan.valor_total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlan && (
            <div className="space-y-2">
              <Label>Parcela</Label>
              <Select 
                value={formData.parcelaNumero.toString()} 
                onValueChange={(value) => setFormData({...formData, parcelaNumero: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a parcela" />
                </SelectTrigger>
                <SelectContent>
                  {selectedPlan.parcelas.map((parcela) => (
                    <SelectItem key={parcela.numero} value={parcela.numero.toString()}>
                      Parcela {parcela.numero} - R$ {parcela.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} 
                      ({new Date(parcela.vencimento).toLocaleDateString("pt-BR")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Gatilho</Label>
            <Select 
              value={formData.triggerOnStatus} 
              onValueChange={(value: 'started' | 'completed') => setFormData({...formData, triggerOnStatus: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="started">Quando etapa iniciar</SelectItem>
                <SelectItem value="completed">Quando etapa concluir</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedStage && selectedParcela && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm font-medium text-green-900 mb-1">Vínculo Configurado</div>
              <div className="text-sm text-green-700">
                <div>🎯 <strong>{selectedStage.title}</strong></div>
                <div>💰 Parcela {selectedParcela.numero}: R$ {selectedParcela.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                <div>⚡ Ação: {formData.triggerOnStatus === 'completed' ? 'Ativar cobrança ao concluir' : 'Ativar cobrança ao iniciar'}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={() => linkMutation.mutate()}
            disabled={!formData.stageInstanceId || !formData.planoPagamentoId || linkMutation.isPending}
            className="flex-1"
          >
            {linkMutation.isPending ? "Vinculando..." : "Criar Vínculo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const FinancialMilestones: React.FC<{
  journeyInstance: JourneyInstance;
}> = ({ journeyInstance }) => {
  const queryClient = useQueryClient();

  const { data: stagePaymentLinks, refetch } = useQuery({
    queryKey: ["stage-payment-links", journeyInstance.id],
    queryFn: async () => {
      const { data, error } = await lf
        .from("stage_payment_links")
        .select(`
          *,
          stage_instances (
            journey_template_stages (
              title
            )
          )
        `)
        .eq("stage_instance_id", journeyInstance.id);
      
      if (error) throw error;
      return data.map(link => ({
        ...link,
        stage_title: link.stage_instances?.journey_template_stages?.title || "Etapa"
      })) as StagePaymentLink[];
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await lf
        .from("stage_payment_links")
        .delete()
        .eq("id", linkId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Vínculo removido",
        description: "Vínculo financeiro removido com sucesso.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao remover vínculo: " + error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Marcos Financeiros
          </CardTitle>
          <LinkStageToPaymentDialog 
            journeyInstance={journeyInstance}
            onSuccess={() => refetch()}
          />
        </div>
      </CardHeader>
      <CardContent>
        {!stagePaymentLinks || stagePaymentLinks.length === 0 ? (
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="font-medium text-neutral-900 mb-2">Nenhum marco financeiro</h3>
            <p className="text-neutral-600 text-sm">
              Vincule etapas da jornada a parcelas do plano de pagamento.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stagePaymentLinks.map((link) => (
              <div key={link.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{link.stage_title}</div>
                    <div className="text-xs text-neutral-600">
                      Parcela {link.parcela_numero} • 
                      {link.trigger_on_status === 'completed' ? ' Ao concluir' : ' Ao iniciar'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    R$ {link.valor_parcela?.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) || "---"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteLinkMutation.mutate(link.id)}
                    disabled={deleteLinkMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialMilestones;
