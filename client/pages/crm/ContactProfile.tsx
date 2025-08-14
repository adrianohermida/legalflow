import React, { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Textarea } from "../../components/ui/textarea";
import { useSupabaseQuery } from "../../hooks/useSupabaseQuery";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../hooks/use-toast";
import { EmptyState, ErrorState, LoadingState } from "../../components/states";
import { locale } from "../../lib/locale";
import {
  User,
  Building,
  Mail,
  Phone,
  MessageCircle,
  CreditCard,
  Link,
  Plus,
  ExternalLink,
  Calendar,
  DollarSign,
  Target,
  FileText,
  Activity,
  Ticket,
  CheckCircle,
  Clock,
  TrendingUp,
  Edit,
  Share,
} from "lucide-react";

interface Contact {
  id: string;
  kind: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  cpfcnpj?: string;
  public_cliente_cpfcnpj?: string;
  stripe_customer_id?: string;
  properties: any;
  created_at: string;
  updated_at: string;
}

interface Activity {
  id: string;
  title: string;
  description?: string;
  status: string;
  due_date?: string;
  created_at: string;
}

interface Deal {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: string;
  probability: number;
  stage_name?: string;
  created_at: string;
}

interface ActivityFormData {
  title: string;
  description: string;
  due_date: string;
  status: string;
}

interface TicketFormData {
  title: string;
  description: string;
  priority: string;
}

interface DealFormData {
  title: string;
  value: string;
  probability: string;
}

const ContactProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isNewActivityOpen, setIsNewActivityOpen] = useState(false);
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);
  const [activityForm, setActivityForm] = useState<ActivityFormData>({
    title: "",
    description: "",
    due_date: "",
    status: "pending",
  });
  const [ticketForm, setTicketForm] = useState<TicketFormData>({
    title: "",
    description: "",
    priority: "medium",
  });
  const [dealForm, setDealForm] = useState<DealFormData>({
    title: "",
    value: "",
    probability: "50",
  });
  const { toast } = useToast();

  // Fetch contact details
  const {
    data: contact,
    isLoading,
    error,
    refetch,
  } = useSupabaseQuery<Contact>(
    ["contact-profile", id],
    `
    select id, kind, name, email, phone, whatsapp, cpfcnpj,
           public_cliente_cpfcnpj, stripe_customer_id, properties,
           created_at, updated_at
    from legalflow.contacts
    where id = $1
    `,
    [id],
  );

  // Fetch contact activities
  const { data: activities, refetch: refetchActivities } = useSupabaseQuery<
    Activity[]
  >(
    ["contact-activities", id],
    `
    select id, title, description, status, due_date, created_at
    from legalflow.activities
    where contact_id = $1 or (properties->>'contact_id')::uuid = $1
    order by created_at desc
    limit 20
    `,
    [id],
  );

  // Fetch contact deals
  const { data: deals, refetch: refetchDeals } = useSupabaseQuery<Deal[]>(
    ["contact-deals", id],
    `
    select d.id, d.title, d.value, d.currency, d.stage, d.probability, d.created_at,
           ps.name as stage_name
    from legalflow.deals d
    left join legalflow.pipeline_stages ps on ps.id = d.stage_id
    where d.contact_id = $1
    order by d.created_at desc
    limit 10
    `,
    [id],
  );

  // Fetch contact tickets
  const { data: tickets, refetch: refetchTickets } = useSupabaseQuery(
    ["contact-tickets", id],
    `
    select id, title, description, status, priority, created_at
    from legalflow.tickets
    where contact_id = $1 or (properties->>'contact_id')::uuid = $1
    order by created_at desc
    limit 20
    `,
    [id],
  );

  // Fetch linked client info
  const { data: linkedClient } = useSupabaseQuery(
    ["contact-linked-client", contact?.public_cliente_cpfcnpj],
    `
    select cpfcnpj, nome, created_at
    from public.clientes
    where cpfcnpj = $1
    `,
    [contact?.public_cliente_cpfcnpj],
    { enabled: !!contact?.public_cliente_cpfcnpj },
  );

  // Fetch contact stats
  const { data: contactStats } = useSupabaseQuery(
    ["contact-stats", id],
    `
    select
      (select count(*) from legalflow.activities where contact_id = $1) as total_activities,
      (select count(*) from legalflow.activities where contact_id = $1 and status = 'completed') as completed_activities,
      (select count(*) from legalflow.deals where contact_id = $1) as total_deals,
      (select sum(value) from legalflow.deals where contact_id = $1) as total_deal_value,
      (select count(*) from legalflow.tickets where contact_id = $1) as total_tickets,
      (select count(*) from legalflow.tickets where contact_id = $1 and status = 'resolved') as resolved_tickets
    `,
    [id],
  );

  const handleCreateActivity = async () => {
    try {
      const { error } = await supabase.from("legalflow.activities").insert({
        title: activityForm.title,
        description: activityForm.description || null,
        status: activityForm.status,
        due_date: activityForm.due_date || null,
        contact_id: id,
        properties: { contact_id: id },
      });

      if (error) throw error;

      toast({
        title: "Atividade criada",
        description: "Nova atividade adicionada ao contato",
      });

      setIsNewActivityOpen(false);
      setActivityForm({
        title: "",
        description: "",
        due_date: "",
        status: "pending",
      });
      refetchActivities();
    } catch (error) {
      console.error("Error creating activity:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar atividade",
        variant: "destructive",
      });
    }
  };

  const handleCreateTicket = async () => {
    try {
      const { error } = await supabase.from("legalflow.tickets").insert({
        title: ticketForm.title,
        description: ticketForm.description,
        priority: ticketForm.priority,
        status: "open",
        contact_id: id,
        properties: { contact_id: id },
      });

      if (error) throw error;

      toast({
        title: "Ticket criado",
        description: "Novo ticket de suporte criado",
      });

      setIsNewTicketOpen(false);
      setTicketForm({ title: "", description: "", priority: "medium" });
      refetchTickets();
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar ticket",
        variant: "destructive",
      });
    }
  };

  const handleCreateDeal = async () => {
    try {
      const { error } = await supabase.from("legalflow.deals").insert({
        title: dealForm.title,
        value: parseFloat(dealForm.value) || 0,
        currency: "BRL",
        stage: "novo",
        probability: parseInt(dealForm.probability) || 50,
        contact_id: id,
        pipeline_id: 1, // Sales pipeline
      });

      if (error) throw error;

      toast({
        title: "Deal criado",
        description: "Nova oportunidade criada para o contato",
      });

      setIsNewDealOpen(false);
      setDealForm({ title: "", value: "", probability: "50" });
      refetchDeals();
    } catch (error) {
      console.error("Error creating deal:", error);
      toast({
        title: "Erro",
        description: "Falha ao criar deal",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (
    status: string,
    type: "activity" | "ticket" | "deal",
  ) => {
    const configs = {
      activity: {
        pending: "bg-yellow-100 text-yellow-800",
        in_progress: "bg-blue-100 text-blue-800",
        completed: "bg-green-100 text-green-800",
        cancelled: "bg-red-100 text-red-800",
      },
      ticket: {
        open: "bg-red-100 text-red-800",
        in_progress: "bg-blue-100 text-blue-800",
        resolved: "bg-green-100 text-green-800",
        closed: "bg-gray-100 text-gray-800",
      },
      deal: {
        novo: "bg-blue-100 text-blue-800",
        qualificado: "bg-yellow-100 text-yellow-800",
        proposta: "bg-purple-100 text-purple-800",
        ganho: "bg-green-100 text-green-800",
        perdido: "bg-red-100 text-red-800",
      },
    };

    const color =
      configs[type][status as keyof (typeof configs)[typeof type]] ||
      "bg-gray-100 text-gray-800";
    return <Badge className={color}>{status}</Badge>;
  };

  if (isLoading)
    return <LoadingState type="detail" title="Carregando perfil..." />;
  if (error || !contact) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 rounded-full p-3">
              {contact.kind === "org" ? (
                <Building className="h-8 w-8 text-blue-600" />
              ) : (
                <User className="h-8 w-8 text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {contact.name}
              </h1>
              <p className="text-gray-600">
                {contact.kind === "org" ? "Organização" : "Pessoa"} • Criado{" "}
                {locale.formatRelativeTime(contact.created_at)}
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button variant="outline">
              <Share className="h-4 w-4 mr-2" />
              Compartilhar
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Column A - Contact Summary */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contact.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{contact.email}</div>
                    <div className="text-sm text-gray-600">Email</div>
                  </div>
                </div>
              )}

              {contact.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {locale.formatPhoneNumber(contact.phone)}
                    </div>
                    <div className="text-sm text-gray-600">Telefone</div>
                  </div>
                </div>
              )}

              {contact.whatsapp && (
                <div className="flex items-center space-x-3">
                  <MessageCircle className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">{contact.whatsapp}</div>
                    <div className="text-sm text-gray-600">WhatsApp</div>
                  </div>
                </div>
              )}

              {contact.cpfcnpj && (
                <div className="flex items-center space-x-3">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="font-medium">
                      {locale.formatCpfCnpj(contact.cpfcnpj)}
                    </div>
                    <div className="text-sm text-gray-600">CPF/CNPJ</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Links */}
          <Card>
            <CardHeader>
              <CardTitle>Vinculações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {linkedClient && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Link className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="font-medium">{linkedClient.nome}</div>
                      <div className="text-sm text-gray-600">
                        Cliente (public)
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {contact.stripe_customer_id && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-4 w-4 text-purple-600" />
                    <div>
                      <div className="font-medium">
                        {contact.stripe_customer_id}
                      </div>
                      <div className="text-sm text-gray-600">
                        Stripe Customer
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {!linkedClient && !contact.stripe_customer_id && (
                <div className="text-center py-4 text-sm text-gray-500">
                  Nenhuma vinculação ativa
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo de Atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {contactStats?.total_activities || 0}
                  </div>
                  <div className="text-sm text-gray-600">Atividades</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {contactStats?.total_deals || 0}
                  </div>
                  <div className="text-sm text-gray-600">Deals</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {locale.formatCurrency(contactStats?.total_deal_value || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Valor Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {contactStats?.total_tickets || 0}
                  </div>
                  <div className="text-sm text-gray-600">Tickets</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column B - Timeline */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="timeline" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="activities">Atividades</TabsTrigger>
              <TabsTrigger value="deals">Deals</TabsTrigger>
              <TabsTrigger value="tickets">Tickets</TabsTrigger>
            </TabsList>

            {/* Timeline Tab */}
            <TabsContent value="timeline">
              <Card>
                <CardHeader>
                  <CardTitle>Timeline de Interações</CardTitle>
                  <CardDescription>
                    Histórico completo de atividades e interações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Combined timeline from activities, deals, tickets */}
                    {[
                      ...(activities?.map((a) => ({
                        ...a,
                        type: "activity",
                      })) || []),
                      ...(deals?.map((d) => ({ ...d, type: "deal" })) || []),
                      ...(tickets?.map((t) => ({ ...t, type: "ticket" })) ||
                        []),
                    ]
                      .sort(
                        (a, b) =>
                          new Date(b.created_at).getTime() -
                          new Date(a.created_at).getTime(),
                      )
                      .slice(0, 20)
                      .map((item: any) => (
                        <div
                          key={`${item.type}-${item.id}`}
                          className="flex items-start space-x-3 p-3 border rounded-lg"
                        >
                          <div className="mt-1">
                            {item.type === "activity" && (
                              <Activity className="h-4 w-4 text-blue-600" />
                            )}
                            {item.type === "deal" && (
                              <Target className="h-4 w-4 text-green-600" />
                            )}
                            {item.type === "ticket" && (
                              <Ticket className="h-4 w-4 text-orange-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{item.title}</div>
                              <div className="text-sm text-gray-500">
                                {locale.formatRelativeTime(item.created_at)}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {item.type === "activity" && item.description}
                              {item.type === "deal" &&
                                `${locale.formatCurrency(item.value)} - ${item.stage_name || item.stage}`}
                              {item.type === "ticket" && item.description}
                            </div>
                            <div className="mt-2">
                              {item.type === "activity" &&
                                getStatusBadge(item.status, "activity")}
                              {item.type === "deal" &&
                                getStatusBadge(item.stage, "deal")}
                              {item.type === "ticket" &&
                                getStatusBadge(item.status, "ticket")}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activities Tab */}
            <TabsContent value="activities">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Atividades</CardTitle>
                      <CardDescription>
                        Tarefas e compromissos relacionados ao contato
                      </CardDescription>
                    </div>
                    <Dialog
                      open={isNewActivityOpen}
                      onOpenChange={setIsNewActivityOpen}
                    >
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Atividade
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Nova Atividade</DialogTitle>
                          <DialogDescription>
                            Criar uma nova atividade para {contact.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="activity-title">Título *</Label>
                            <Input
                              id="activity-title"
                              value={activityForm.title}
                              onChange={(e) =>
                                setActivityForm((prev) => ({
                                  ...prev,
                                  title: e.target.value,
                                }))
                              }
                              placeholder="Título da atividade"
                            />
                          </div>
                          <div>
                            <Label htmlFor="activity-description">
                              Descrição
                            </Label>
                            <Textarea
                              id="activity-description"
                              value={activityForm.description}
                              onChange={(e) =>
                                setActivityForm((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Detalhes da atividade"
                              rows={3}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="activity-due-date">
                                Data de Vencimento
                              </Label>
                              <Input
                                id="activity-due-date"
                                type="date"
                                value={activityForm.due_date}
                                onChange={(e) =>
                                  setActivityForm((prev) => ({
                                    ...prev,
                                    due_date: e.target.value,
                                  }))
                                }
                              />
                            </div>
                            <div>
                              <Label htmlFor="activity-status">Status</Label>
                              <Select
                                value={activityForm.status}
                                onValueChange={(value) =>
                                  setActivityForm((prev) => ({
                                    ...prev,
                                    status: value,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">
                                    Pendente
                                  </SelectItem>
                                  <SelectItem value="in_progress">
                                    Em Andamento
                                  </SelectItem>
                                  <SelectItem value="completed">
                                    Concluída
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setIsNewActivityOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleCreateActivity}
                            disabled={!activityForm.title.trim()}
                          >
                            Criar Atividade
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {!activities?.length ? (
                    <EmptyState
                      type="activities"
                      title="Nenhuma atividade encontrada"
                      description="Crie atividades para acompanhar tarefas relacionadas ao contato"
                      actionLabel="Nova Atividade"
                      onAction={() => setIsNewActivityOpen(true)}
                    />
                  ) : (
                    <div className="space-y-3">
                      {activities.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{activity.title}</div>
                            {activity.description && (
                              <div className="text-sm text-gray-600 mt-1">
                                {activity.description}
                              </div>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                              {getStatusBadge(activity.status, "activity")}
                              {activity.due_date && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Calendar className="h-3 w-3" />
                                  {locale.formatDate(activity.due_date)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {locale.formatRelativeTime(activity.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Deals Tab */}
            <TabsContent value="deals">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Deals</CardTitle>
                      <CardDescription>
                        Oportunidades de negócio relacionadas ao contato
                      </CardDescription>
                    </div>
                    <Dialog
                      open={isNewDealOpen}
                      onOpenChange={setIsNewDealOpen}
                    >
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Deal
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Novo Deal</DialogTitle>
                          <DialogDescription>
                            Criar uma nova oportunidade para {contact.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="deal-title">Título *</Label>
                            <Input
                              id="deal-title"
                              value={dealForm.title}
                              onChange={(e) =>
                                setDealForm((prev) => ({
                                  ...prev,
                                  title: e.target.value,
                                }))
                              }
                              placeholder="Nome da oportunidade"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="deal-value">Valor</Label>
                              <Input
                                id="deal-value"
                                type="number"
                                step="0.01"
                                value={dealForm.value}
                                onChange={(e) =>
                                  setDealForm((prev) => ({
                                    ...prev,
                                    value: e.target.value,
                                  }))
                                }
                                placeholder="0,00"
                              />
                            </div>
                            <div>
                              <Label htmlFor="deal-probability">
                                Probabilidade (%)
                              </Label>
                              <Input
                                id="deal-probability"
                                type="number"
                                min="0"
                                max="100"
                                value={dealForm.probability}
                                onChange={(e) =>
                                  setDealForm((prev) => ({
                                    ...prev,
                                    probability: e.target.value,
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setIsNewDealOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleCreateDeal}
                            disabled={!dealForm.title.trim()}
                          >
                            Criar Deal
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {!deals?.length ? (
                    <EmptyState
                      type="deals"
                      title="Nenhum deal encontrado"
                      description="Crie oportunidades de negócio para este contato"
                      actionLabel="Novo Deal"
                      onAction={() => setIsNewDealOpen(true)}
                    />
                  ) : (
                    <div className="space-y-3">
                      {deals.map((deal) => (
                        <div
                          key={deal.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{deal.title}</div>
                            <div className="flex items-center space-x-4 mt-2">
                              <div className="text-lg font-semibold text-green-600">
                                {locale.formatCurrency(deal.value)}
                              </div>
                              {getStatusBadge(deal.stage, "deal")}
                              <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Target className="h-3 w-3" />
                                {deal.probability}%
                              </div>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {locale.formatRelativeTime(deal.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tickets Tab */}
            <TabsContent value="tickets">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Tickets</CardTitle>
                      <CardDescription>
                        Solicitações de suporte relacionadas ao contato
                      </CardDescription>
                    </div>
                    <Dialog
                      open={isNewTicketOpen}
                      onOpenChange={setIsNewTicketOpen}
                    >
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Ticket
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Novo Ticket</DialogTitle>
                          <DialogDescription>
                            Criar um novo ticket de suporte para {contact.name}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="ticket-title">Título *</Label>
                            <Input
                              id="ticket-title"
                              value={ticketForm.title}
                              onChange={(e) =>
                                setTicketForm((prev) => ({
                                  ...prev,
                                  title: e.target.value,
                                }))
                              }
                              placeholder="Assunto do ticket"
                            />
                          </div>
                          <div>
                            <Label htmlFor="ticket-description">
                              Descrição
                            </Label>
                            <Textarea
                              id="ticket-description"
                              value={ticketForm.description}
                              onChange={(e) =>
                                setTicketForm((prev) => ({
                                  ...prev,
                                  description: e.target.value,
                                }))
                              }
                              placeholder="Detalhes da solicitação"
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label htmlFor="ticket-priority">Prioridade</Label>
                            <Select
                              value={ticketForm.priority}
                              onValueChange={(value) =>
                                setTicketForm((prev) => ({
                                  ...prev,
                                  priority: value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Baixa</SelectItem>
                                <SelectItem value="medium">Média</SelectItem>
                                <SelectItem value="high">Alta</SelectItem>
                                <SelectItem value="urgent">Urgente</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button
                            variant="outline"
                            onClick={() => setIsNewTicketOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleCreateTicket}
                            disabled={!ticketForm.title.trim()}
                          >
                            Criar Ticket
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {!tickets?.length ? (
                    <EmptyState
                      type="tickets"
                      title="Nenhum ticket encontrado"
                      description="Crie tickets de suporte para acompanhar solicitações do contato"
                      actionLabel="Novo Ticket"
                      onAction={() => setIsNewTicketOpen(true)}
                    />
                  ) : (
                    <div className="space-y-3">
                      {tickets.map((ticket: any) => (
                        <div
                          key={ticket.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{ticket.title}</div>
                            {ticket.description && (
                              <div className="text-sm text-gray-600 mt-1">
                                {ticket.description}
                              </div>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                              {getStatusBadge(ticket.status, "ticket")}
                              <Badge variant="outline" className="text-xs">
                                {ticket.priority}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            {locale.formatRelativeTime(ticket.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ContactProfile;
