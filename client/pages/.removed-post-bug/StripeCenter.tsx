import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { useSupabaseQuery } from "../hooks/useSupabaseQuery";
import { supabase } from "../lib/supabase";
import { useToast } from "../hooks/use-toast";
import { EmptyState, ErrorState, LoadingState } from "../components/states";
import { locale } from "../lib/locale";
import {
  Search,
  Plus,
  CreditCard,
  Users,
  Receipt,
  DollarSign,
  Calendar,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Link,
  Trash2,
  Eye,
  Edit,
  Settings,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface StripeCustomer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  contact_id?: string;
  public_cliente_cpfcnpj?: string;
  data: any;
  created_at: string;
  updated_at: string;
}

interface StripeSubscription {
  id: string;
  customer_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at?: string;
  canceled_at?: string;
  data: any;
  customer_email?: string;
  customer_name?: string;
  created_at: string;
}

interface StripeInvoice {
  id: string;
  customer_id: string;
  subscription_id?: string;
  status: string;
  number?: string;
  hosted_invoice_url?: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  due_date?: string;
  created_ts: string;
  customer_email?: string;
  customer_name?: string;
}

interface StripePaymentIntent {
  id: string;
  customer_id?: string;
  amount: number;
  currency: string;
  status: string;
  receipt_url?: string;
  created_ts: string;
  customer_email?: string;
  customer_name?: string;
}

interface CreateSubscriptionData {
  customer_id: string;
  price_id: string;
  quantity: number;
  trial_days?: number;
}

const StripeCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState("customers");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateSubOpen, setIsCreateSubOpen] = useState(false);
  const [createSubData, setCreateSubData] = useState<CreateSubscriptionData>({
    customer_id: "",
    price_id: "",
    quantity: 1,
    trial_days: 0,
  });
  const { toast } = useToast();

  // Fetch Stripe customers
  const {
    data: customers,
    isLoading: customersLoading,
    error: customersError,
    refetch: refetchCustomers,
  } = useSupabaseQuery<StripeCustomer[]>(
    "stripe-customers",
    `
    select 
      sc.*, 
      c.name as contact_name
    from legalflow.stripe_customers sc
    left join legalflow.contacts c on c.id = sc.contact_id
    where 
      sc.email ilike $1 or sc.name ilike $1 or sc.id ilike $1
    order by sc.updated_at desc
    limit 50
    `,
    [`%${searchTerm}%`],
  );

  // Fetch Stripe subscriptions
  const {
    data: subscriptions,
    isLoading: subscriptionsLoading,
    error: subscriptionsError,
    refetch: refetchSubscriptions,
  } = useSupabaseQuery<StripeSubscription[]>(
    "stripe-subscriptions",
    `
    select 
      ss.*,
      sc.email as customer_email,
      sc.name as customer_name
    from legalflow.stripe_subscriptions ss
    left join legalflow.stripe_customers sc on sc.id = ss.customer_id
    where 
      ($1 = 'all' or ss.status = $1)
      and (sc.email ilike $2 or sc.name ilike $2 or ss.id ilike $2)
    order by ss.updated_at desc
    limit 50
    `,
    [statusFilter === "all" ? "all" : statusFilter, `%${searchTerm}%`],
  );

  // Fetch Stripe invoices
  const {
    data: invoices,
    isLoading: invoicesLoading,
    error: invoicesError,
    refetch: refetchInvoices,
  } = useSupabaseQuery<StripeInvoice[]>(
    "stripe-invoices",
    `
    select 
      si.*,
      sc.email as customer_email,
      sc.name as customer_name
    from legalflow.stripe_invoices si
    left join legalflow.stripe_customers sc on sc.id = si.customer_id
    where 
      ($1 = 'all' or si.status = $1)
      and (sc.email ilike $2 or sc.name ilike $2 or si.number ilike $2 or si.id ilike $2)
    order by si.created_ts desc
    limit 50
    `,
    [statusFilter === "all" ? "all" : statusFilter, `%${searchTerm}%`],
  );

  // Fetch Stripe payment intents
  const {
    data: payments,
    isLoading: paymentsLoading,
    error: paymentsError,
    refetch: refetchPayments,
  } = useSupabaseQuery<StripePaymentIntent[]>(
    "stripe-payment-intents",
    `
    select 
      sp.*,
      sc.email as customer_email,
      sc.name as customer_name
    from legalflow.stripe_payment_intents sp
    left join legalflow.stripe_customers sc on sc.id = sp.customer_id
    where 
      ($1 = 'all' or sp.status = $1)
      and (sc.email ilike $2 or sc.name ilike $2 or sp.id ilike $2)
    order by sp.created_ts desc
    limit 50
    `,
    [statusFilter === "all" ? "all" : statusFilter, `%${searchTerm}%`],
  );

  // Fetch available prices for subscription creation
  const { data: prices } = useSupabaseQuery(
    "stripe-prices",
    `
    select 
      sp.*,
      spr.name as product_name
    from legalflow.stripe_prices sp
    left join legalflow.stripe_products spr on spr.id = sp.product_id
    where sp.active = true
    order by spr.name, sp.unit_amount
    `,
  );

  const getStatusBadge = (
    status: string,
    type: "subscription" | "invoice" | "payment",
  ) => {
    const getVariant = () => {
      if (type === "subscription") {
        switch (status) {
          case "active":
            return "default";
          case "trialing":
            return "secondary";
          case "past_due":
            return "destructive";
          case "canceled":
            return "outline";
          case "unpaid":
            return "destructive";
          default:
            return "outline";
        }
      } else if (type === "invoice") {
        switch (status) {
          case "paid":
            return "default";
          case "open":
            return "secondary";
          case "void":
            return "outline";
          case "uncollectible":
            return "destructive";
          default:
            return "outline";
        }
      } else {
        // payment
        switch (status) {
          case "succeeded":
            return "default";
          case "processing":
            return "secondary";
          case "requires_action":
            return "destructive";
          case "canceled":
            return "outline";
          default:
            return "outline";
        }
      }
    };

    return <Badge variant={getVariant()}>{status}</Badge>;
  };

  const formatCurrency = (amount: number, currency: string = "brl") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const handleCreateSubscription = async () => {
    try {
      const response = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createSubData),
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Assinatura criada",
          description: `Nova assinatura ${result.subscription_id} criada com sucesso`,
        });
        setIsCreateSubOpen(false);
        setCreateSubData({
          customer_id: "",
          price_id: "",
          quantity: 1,
          trial_days: 0,
        });
        refetchSubscriptions();
      } else {
        toast({
          title: "Erro",
          description: result.error || "Falha ao criar assinatura",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating subscription:", error);
      toast({
        title: "Erro",
        description: "Falha ao conectar com Stripe",
        variant: "destructive",
      });
    }
  };

  const syncStripeData = async () => {
    try {
      const response = await fetch("/api/stripe/sync-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();
      if (result.success) {
        toast({
          title: "Sincronização iniciada",
          description: "Dados do Stripe sendo atualizados",
        });

        // Refetch all data
        refetchCustomers();
        refetchSubscriptions();
        refetchInvoices();
        refetchPayments();
      } else {
        toast({
          title: "Erro",
          description: result.error || "Falha na sincronização",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error syncing Stripe data:", error);
      toast({
        title: "Erro",
        description: "Falha ao sincronizar dados do Stripe",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              Stripe Center
            </h1>
            <p className="text-gray-600">
              Visão 360° de clientes, assinaturas, faturas e pagamentos do
              Stripe
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={syncStripeData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar
            </Button>
            <Button onClick={() => window.open("/settings/stripe", "_blank")}>
              <Settings className="h-4 w-4 mr-2" />
              Configurações
            </Button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por email, nome, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {activeTab === "subscriptions" && (
                    <>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="trialing">Teste</SelectItem>
                      <SelectItem value="past_due">Vencida</SelectItem>
                      <SelectItem value="canceled">Cancelada</SelectItem>
                      <SelectItem value="unpaid">Não paga</SelectItem>
                    </>
                  )}
                  {activeTab === "invoices" && (
                    <>
                      <SelectItem value="paid">Paga</SelectItem>
                      <SelectItem value="open">Aberta</SelectItem>
                      <SelectItem value="void">Anulada</SelectItem>
                      <SelectItem value="uncollectible">Incobrável</SelectItem>
                    </>
                  )}
                  {activeTab === "payments" && (
                    <>
                      <SelectItem value="succeeded">Sucesso</SelectItem>
                      <SelectItem value="processing">Processando</SelectItem>
                      <SelectItem value="requires_action">
                        Requer ação
                      </SelectItem>
                      <SelectItem value="canceled">Cancelado</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="customers">
            <Users className="h-4 w-4 mr-2" />
            Clientes
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <Calendar className="h-4 w-4 mr-2" />
            Assinaturas
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <Receipt className="h-4 w-4 mr-2" />
            Faturas
          </TabsTrigger>
          <TabsTrigger value="payments">
            <DollarSign className="h-4 w-4 mr-2" />
            Pagamentos
          </TabsTrigger>
        </TabsList>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Clientes Stripe ({customers?.length || 0})</CardTitle>
              <CardDescription>
                Lista de clientes sincronizados do Stripe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customersLoading ? (
                <LoadingState type="list" title="Carregando clientes..." />
              ) : customersError ? (
                <ErrorState error={customersError} onRetry={refetchCustomers} />
              ) : !customers?.length ? (
                <EmptyState
                  type="clientes"
                  title="Nenhum cliente encontrado"
                  description="Os clientes do Stripe aparecerão aqui após a sincronização"
                />
              ) : (
                <div className="space-y-3">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="font-medium">
                            {customer.name || customer.email}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <span>{customer.email}</span>
                            </span>
                            <span className="text-xs text-gray-500">
                              {customer.id}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {customer.contact_id && (
                            <Badge variant="secondary" className="text-xs">
                              <Link className="h-3 w-3 mr-1" />
                              Vinculado CRM
                            </Badge>
                          )}
                          {customer.public_cliente_cpfcnpj && (
                            <Badge variant="outline" className="text-xs">
                              <Link className="h-3 w-3 mr-1" />
                              Cliente
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-gray-500">
                          {locale.formatRelativeTime(customer.updated_at)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `https://dashboard.stripe.com/customers/${customer.id}`,
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    Assinaturas ({subscriptions?.length || 0})
                  </CardTitle>
                  <CardDescription>
                    Assinaturas ativas e históricas do Stripe
                  </CardDescription>
                </div>
                <Dialog
                  open={isCreateSubOpen}
                  onOpenChange={setIsCreateSubOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Assinatura
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Nova Assinatura</DialogTitle>
                      <DialogDescription>
                        Crie uma nova assinatura para um cliente
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="customer">Cliente</Label>
                        <Select
                          value={createSubData.customer_id}
                          onValueChange={(value) =>
                            setCreateSubData((prev) => ({
                              ...prev,
                              customer_id: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar cliente..." />
                          </SelectTrigger>
                          <SelectContent>
                            {customers?.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name || customer.email} ({customer.id}
                                )
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="price">Plano</Label>
                        <Select
                          value={createSubData.price_id}
                          onValueChange={(value) =>
                            setCreateSubData((prev) => ({
                              ...prev,
                              price_id: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar plano..." />
                          </SelectTrigger>
                          <SelectContent>
                            {prices?.map((price: any) => (
                              <SelectItem key={price.id} value={price.id}>
                                {price.product_name} -{" "}
                                {formatCurrency(
                                  price.unit_amount,
                                  price.currency,
                                )}
                                {price.recurring_interval &&
                                  ` / ${price.recurring_interval}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="quantity">Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={createSubData.quantity}
                            onChange={(e) =>
                              setCreateSubData((prev) => ({
                                ...prev,
                                quantity: parseInt(e.target.value) || 1,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="trial">Período de teste (dias)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={createSubData.trial_days}
                            onChange={(e) =>
                              setCreateSubData((prev) => ({
                                ...prev,
                                trial_days: parseInt(e.target.value) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsCreateSubOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleCreateSubscription}
                        disabled={
                          !createSubData.customer_id || !createSubData.price_id
                        }
                      >
                        Criar Assinatura
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {subscriptionsLoading ? (
                <LoadingState type="list" title="Carregando assinaturas..." />
              ) : subscriptionsError ? (
                <ErrorState
                  error={subscriptionsError}
                  onRetry={refetchSubscriptions}
                />
              ) : !subscriptions?.length ? (
                <EmptyState
                  type="deals"
                  title="Nenhuma assinatura encontrada"
                  description="As assinaturas do Stripe aparecerão aqui"
                />
              ) : (
                <div className="space-y-3">
                  {subscriptions.map((subscription) => (
                    <div
                      key={subscription.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="font-medium">
                            {subscription.customer_name ||
                              subscription.customer_email}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-4">
                            <span className="text-xs text-gray-500">
                              {subscription.id}
                            </span>
                            <span>
                              {new Date(
                                subscription.current_period_start,
                              ).toLocaleDateString()}{" "}
                              -{" "}
                              {new Date(
                                subscription.current_period_end,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {getStatusBadge(subscription.status, "subscription")}
                        </div>

                        <div className="text-sm text-gray-500">
                          {locale.formatRelativeTime(subscription.created_at)}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `https://dashboard.stripe.com/subscriptions/${subscription.id}`,
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Faturas ({invoices?.length || 0})</CardTitle>
              <CardDescription>Faturas geradas pelo Stripe</CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <LoadingState type="list" title="Carregando faturas..." />
              ) : invoicesError ? (
                <ErrorState error={invoicesError} onRetry={refetchInvoices} />
              ) : !invoices?.length ? (
                <EmptyState
                  type="deals"
                  title="Nenhuma fatura encontrada"
                  description="As faturas do Stripe aparecerão aqui"
                />
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="font-medium">
                            {invoice.number || invoice.id}
                          </div>
                          <div className="text-sm text-gray-600">
                            {invoice.customer_name || invoice.customer_email}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(invoice.amount_due)}
                          </div>
                          {invoice.amount_remaining > 0 && (
                            <div className="text-sm text-red-600">
                              Pendente:{" "}
                              {formatCurrency(invoice.amount_remaining)}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          {getStatusBadge(invoice.status, "invoice")}
                        </div>

                        <div className="text-sm text-gray-500">
                          {invoice.due_date
                            ? new Date(invoice.due_date).toLocaleDateString()
                            : "Sem vencimento"}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {invoice.hosted_invoice_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(invoice.hosted_invoice_url!, "_blank")
                            }
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `https://dashboard.stripe.com/invoices/${invoice.id}`,
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Pagamentos ({payments?.length || 0})</CardTitle>
              <CardDescription>
                Histórico de payment intents do Stripe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <LoadingState type="list" title="Carregando pagamentos..." />
              ) : paymentsError ? (
                <ErrorState error={paymentsError} onRetry={refetchPayments} />
              ) : !payments?.length ? (
                <EmptyState
                  type="deals"
                  title="Nenhum pagamento encontrado"
                  description="Os pagamentos do Stripe aparecerão aqui"
                />
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="font-medium">
                            {payment.customer_name ||
                              payment.customer_email ||
                              "Cliente não identificado"}
                          </div>
                          <div className="text-sm text-gray-600 flex items-center gap-4">
                            <span className="text-xs text-gray-500">
                              {payment.id}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {getStatusBadge(payment.status, "payment")}
                        </div>

                        <div className="text-sm text-gray-500">
                          {new Date(payment.created_ts).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {payment.receipt_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              window.open(payment.receipt_url!, "_blank")
                            }
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open(
                              `https://dashboard.stripe.com/payments/${payment.id}`,
                              "_blank",
                            )
                          }
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
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
  );
};

export default StripeCenter;
