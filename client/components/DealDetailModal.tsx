/**
 * Deal Detail Modal - Flow C9
 * Comprehensive deal management modal with tabs for details, activities, and history
 */

import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Save, Calendar, DollarSign, Percent, Tag, User, Building, FileText, Clock, MessageSquare, Activity, History, Edit, Trash2, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useToast } from "../hooks/use-toast";
import {
  Deal,
  Pipeline,
  PipelineStage,
  formatCurrency,
  formatProbability,
  getDealStatusColor,
  formatRelativeTime,
  isDealOverdue,
  getDaysUntilClose
} from "../lib/deals-utils";

interface DealDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  deal?: Deal | null;
  pipelines: Pipeline[];
  stages: PipelineStage[];
  mode: 'view' | 'edit' | 'create';
}

interface DealActivity {
  id: string;
  type: 'note' | 'call' | 'email' | 'meeting' | 'status_change' | 'stage_change';
  title: string;
  description: string;
  created_at: string;
  created_by: string;
  user_name: string;
  user_avatar?: string;
}

interface DealHistory {
  id: string;
  field: string;
  old_value: string;
  new_value: string;
  changed_at: string;
  changed_by: string;
  user_name: string;
}

export default function DealDetailModal({
  isOpen,
  onClose,
  deal,
  pipelines,
  stages,
  mode
}: DealDetailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    value: 0,
    currency: 'BRL',
    probability: 0,
    expected_close_date: '',
    stage_id: '',
    pipeline_id: '',
    contact_id: '',
    company_id: '',
    owner_id: '',
    tags: [] as string[],
    notes: '',
    status: 'open' as const,
    custom_fields: {} as Record<string, any>
  });

  const [newTag, setNewTag] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isEditing, setIsEditing] = useState(mode === 'create' || mode === 'edit');

  // Mock data for activities and history
  const [activities] = useState<DealActivity[]>([
    {
      id: "1",
      type: "note",
      title: "Primeira reunião realizada",
      description: "Cliente demonstrou interesse na proposta de consultoria trabalhista. Próximos passos: enviar proposta detalhada.",
      created_at: "2024-01-10T14:30:00Z",
      created_by: "user-1",
      user_name: "Dr. João Silva",
      user_avatar: "/avatars/joao.jpg"
    },
    {
      id: "2",
      type: "call",
      title: "Ligação de follow-up",
      description: "Conversamos sobre os detalhes da proposta. Cliente solicitou ajustes no valor.",
      created_at: "2024-01-08T10:15:00Z",
      created_by: "user-1",
      user_name: "Dr. João Silva"
    },
    {
      id: "3",
      type: "stage_change",
      title: "Movido para Proposta Enviada",
      description: "Deal movido automaticamente após envio da proposta.",
      created_at: "2024-01-07T16:45:00Z",
      created_by: "system",
      user_name: "Sistema"
    }
  ]);

  const [history] = useState<DealHistory[]>([
    {
      id: "1",
      field: "probability",
      old_value: "10",
      new_value: "25",
      changed_at: "2024-01-10T14:30:00Z",
      changed_by: "user-1",
      user_name: "Dr. João Silva"
    },
    {
      id: "2",
      field: "value",
      old_value: "12000",
      new_value: "15000",
      changed_at: "2024-01-09T11:20:00Z",
      changed_by: "user-1",
      user_name: "Dr. João Silva"
    },
    {
      id: "3",
      field: "stage_id",
      old_value: "1",
      new_value: "2",
      changed_at: "2024-01-07T16:45:00Z",
      changed_by: "user-1",
      user_name: "Dr. João Silva"
    }
  ]);

  // Initialize form data when deal changes
  useEffect(() => {
    if (deal) {
      setFormData({
        title: deal.title,
        value: deal.value,
        currency: deal.currency,
        probability: deal.probability,
        expected_close_date: deal.expected_close_date.split('T')[0],
        stage_id: deal.stage_id,
        pipeline_id: deal.pipeline_id,
        contact_id: deal.contact_id || '',
        company_id: deal.company_id || '',
        owner_id: deal.owner_id,
        tags: deal.tags,
        notes: deal.notes,
        status: deal.status,
        custom_fields: deal.custom_fields
      });
    } else if (mode === 'create') {
      // Reset form for new deal
      setFormData({
        title: '',
        value: 0,
        currency: 'BRL',
        probability: 0,
        expected_close_date: '',
        stage_id: stages[0]?.id || '',
        pipeline_id: pipelines[0]?.id || '',
        contact_id: '',
        company_id: '',
        owner_id: 'user-1', // Current user
        tags: [],
        notes: '',
        status: 'open',
        custom_fields: {}
      });
    }
  }, [deal, mode, stages, pipelines]);

  // Save deal mutation
  const saveDealMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      return data;
    },
    onSuccess: () => {
      toast({
        title: mode === 'create' ? "Deal criado" : "Deal atualizado",
        description: mode === 'create' ? "Novo deal criado com sucesso" : "Deal atualizado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar deal",
        variant: "destructive"
      });
    }
  });

  // Add activity mutation
  const addActivityMutation = useMutation({
    mutationFn: async (note: string) => {
      // Mock API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      return note;
    },
    onSuccess: () => {
      toast({
        title: "Atividade adicionada",
        description: "Nova atividade adicionada ao deal",
      });
      setNewNote('');
    }
  });

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast({
        title: "Erro de validação",
        description: "Título é obrigatório",
        variant: "destructive"
      });
      return;
    }

    saveDealMutation.mutate(formData);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleAddNote = () => {
    if (newNote.trim()) {
      addActivityMutation.mutate(newNote);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'note':
        return FileText;
      case 'call':
        return Phone;
      case 'email':
        return Mail;
      case 'meeting':
        return Calendar;
      case 'status_change':
      case 'stage_change':
        return Activity;
      default:
        return MessageSquare;
    }
  };

  const formatFieldName = (field: string) => {
    const fieldNames: Record<string, string> = {
      'probability': 'Probabilidade',
      'value': 'Valor',
      'stage_id': 'Estágio',
      'expected_close_date': 'Data de Fechamento',
      'title': 'Título',
      'notes': 'Observações'
    };
    return fieldNames[field] || field;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {mode === 'create' ? 'Novo Deal' : deal?.title}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {!isEditing && mode !== 'create' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              )}
              {isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      if (deal) {
                        // Reset form data
                        setFormData({
                          title: deal.title,
                          value: deal.value,
                          currency: deal.currency,
                          probability: deal.probability,
                          expected_close_date: deal.expected_close_date.split('T')[0],
                          stage_id: deal.stage_id,
                          pipeline_id: deal.pipeline_id,
                          contact_id: deal.contact_id || '',
                          company_id: deal.company_id || '',
                          owner_id: deal.owner_id,
                          tags: deal.tags,
                          notes: deal.notes,
                          status: deal.status,
                          custom_fields: deal.custom_fields
                        });
                      }
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={saveDealMutation.isPending}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {saveDealMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="details" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Detalhes</TabsTrigger>
              <TabsTrigger value="activities">Atividades</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="flex-1 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Título</Label>
                      {isEditing ? (
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({...formData, title: e.target.value})}
                          placeholder="Nome do deal"
                        />
                      ) : (
                        <p className="text-sm">{formData.title}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="value">Valor</Label>
                        {isEditing ? (
                          <Input
                            id="value"
                            type="number"
                            value={formData.value}
                            onChange={(e) => setFormData({...formData, value: Number(e.target.value)})}
                            placeholder="0.00"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-green-600">
                            {formatCurrency(formData.value)}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="probability">Probabilidade</Label>
                        {isEditing ? (
                          <Input
                            id="probability"
                            type="number"
                            min="0"
                            max="100"
                            value={formData.probability}
                            onChange={(e) => setFormData({...formData, probability: Number(e.target.value)})}
                            placeholder="0"
                          />
                        ) : (
                          <p className="text-sm">{formatProbability(formData.probability)}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="expected_close_date">Data de Fechamento</Label>
                      {isEditing ? (
                        <Input
                          id="expected_close_date"
                          type="date"
                          value={formData.expected_close_date}
                          onChange={(e) => setFormData({...formData, expected_close_date: e.target.value})}
                        />
                      ) : (
                        <p className="text-sm">
                          {new Date(formData.expected_close_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stage_id">Estágio</Label>
                      {isEditing ? (
                        <Select value={formData.stage_id} onValueChange={(value) => setFormData({...formData, stage_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar estágio" />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm">
                          {stages.find(s => s.id === formData.stage_id)?.name || 'N/A'}
                        </p>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {formData.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                            {tag}
                            {isEditing && (
                              <X
                                className="h-3 w-3 cursor-pointer"
                                onClick={() => handleRemoveTag(tag)}
                              />
                            )}
                          </Badge>
                        ))}
                      </div>
                      {isEditing && (
                        <div className="flex gap-2">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Nova tag"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                          />
                          <Button size="sm" onClick={handleAddTag}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Status and Metadata */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Status e Metadados</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Badge className={getDealStatusColor(formData.status)}>
                        {formData.status === 'won' ? 'Ganho' : formData.status === 'lost' ? 'Perdido' : 'Aberto'}
                      </Badge>
                    </div>

                    {deal && (
                      <>
                        <div className="space-y-2">
                          <Label>Criado em</Label>
                          <p className="text-sm text-gray-600">
                            {new Date(deal.created_at).toLocaleDateString('pt-BR')} às {new Date(deal.created_at).toLocaleTimeString('pt-BR')}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Última atualização</Label>
                          <p className="text-sm text-gray-600">
                            {formatRelativeTime(deal.updated_at)}
                          </p>
                        </div>

                        {deal.activities_count > 0 && (
                          <div className="space-y-2">
                            <Label>Atividades</Label>
                            <p className="text-sm text-gray-600">
                              {deal.activities_count} atividades registradas
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Observações sobre o deal..."
                      rows={4}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{formData.notes || 'Nenhuma observação'}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activities" className="flex-1 overflow-y-auto space-y-4">
              {/* Add new activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Nova Atividade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Adicionar nova atividade ou nota..."
                      rows={2}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || addActivityMutation.isPending}
                    >
                      {addActivityMutation.isPending ? 'Adicionando...' : 'Adicionar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Activities list */}
              <div className="space-y-4">
                {activities.map((activity) => {
                  const IconComponent = getActivityIcon(activity.type);
                  return (
                    <Card key={activity.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={activity.user_avatar} />
                            <AvatarFallback>
                              {activity.user_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4 text-gray-500" />
                              <h4 className="font-medium text-sm">{activity.title}</h4>
                              <span className="text-xs text-gray-500">
                                {formatRelativeTime(activity.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{activity.description}</p>
                            <p className="text-xs text-gray-500">por {activity.user_name}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-y-auto">
              <div className="space-y-4">
                {history.map((change) => (
                  <Card key={change.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <History className="h-4 w-4 text-gray-500 mt-1" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm">
                              {formatFieldName(change.field)} alterado
                            </h4>
                            <span className="text-xs text-gray-500">
                              {formatRelativeTime(change.changed_at)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="line-through text-red-600">{change.old_value}</span>
                            {' → '}
                            <span className="text-green-600">{change.new_value}</span>
                          </div>
                          <p className="text-xs text-gray-500">por {change.user_name}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
