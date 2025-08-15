import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../lib/supabase";
import {
  DollarSign,
  Users,
  FileText,
  Receipt,
  CreditCard,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  Send,
  Eye,
  MoreHorizontal,
  ArrowRight,
  ShoppingCart,
  Target,
  Calendar,
  TrendingUp,
  AlertCircle,
} from "lucide-react";

interface StripeCustomer {
  id: string;
  stripe_customer_id: string;
  email: string;
  name: string;
  phone: string;
  delinquent: boolean;
  total_subscriptions: number;
  active_subscriptions: number;
  total_invoices: number;
  unpaid_invoices: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

interface StripeSubscription {
  id: string;
  stripe_subscription_id: string;
  customer_email: string;
  customer_name: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  amount_total: number;
  cancel_at_period_end: boolean;
  created_at: string;
}

interface StripeInvoice {
  id: string;
  stripe_invoice_id: string;
  customer_email: string;
  customer_name: string;
  status: string;
  number: string;
  amount_due: number;
  amount_paid: number;
  total: number;
  due_date: string;
  hosted_invoice_url: string;
  created_at: string;
}

interface StripePaymentIntent {
  id: string;
  stripe_payment_intent_id: string;
  customer_email: string;
  status: string;
  amount: number;
  currency: string;
  description: string;
  created_at: string;
}

interface CheckoutSession {
  customer_email: string;
  line_items: Array<{
    price_id: string;
    quantity: number;
  }>;
  success_url: string;
  cancel_url: string;
  mode: "payment" | "subscription";
  metadata: Record<string, any>;
}

export const SF10StripeWizard: React.FC = () => {
  const [customers, setCustomers] = useState<StripeCustomer[]>([]);
  const [subscriptions, setSubscriptions] = useState<StripeSubscription[]>([]);
  const [invoices, setInvoices] = useState<StripeInvoice[]>([]);
  const [payments, setPayments] = useState<StripePaymentIntent[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<
    "customers" | "subscriptions" | "invoices" | "payments" | "checkout"
  >("customers");

  // Checkout Wizard State
  const [showCheckoutWizard, setShowCheckoutWizard] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<
    "contact" | "price" | "quantity" | "session"
  >("contact");
  const [checkoutData, setCheckoutData] = useState<CheckoutSession>({
    customer_email: "",
    line_items: [],
    success_url: "",
    cancel_url: "",
    mode: "payment",
    metadata: {},
  });
  const [availablePrices, setAvailablePrices] = useState<any[]>([]);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);

  const { toast } = useToast();

  useEffect(() => {
    loadData();
    loadPrices();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadCustomers(),
        loadSubscriptions(),
        loadInvoices(),
        loadPayments(),
      ]);
    } catch (error) {
      console.error("Error loading Stripe data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados do Stripe",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase.rpc(
        "legalflow.list_stripe_customers",
        {
          p_search: searchTerm || null,
          p_status: statusFilter === "all" ? null : statusFilter,
        },
      );

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error loading customers:", error);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from("legalflow.stripe_subscriptions")
        .select(
          `
          *,
          customer:customer_id(email, name)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const formatted = (data || []).map((sub) => ({
        ...sub,
        customer_email: sub.customer?.email || "",
        customer_name: sub.customer?.name || "",
      }));

      setSubscriptions(formatted);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
    }
  };

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("legalflow.stripe_invoices")
        .select(
          `
          *,
          customer:customer_id(email, name)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const formatted = (data || []).map((inv) => ({
        ...inv,
        customer_email: inv.customer?.email || "",
        customer_name: inv.customer?.name || "",
      }));

      setInvoices(formatted);
    } catch (error) {
      console.error("Error loading invoices:", error);
    }
  };

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("legalflow.stripe_payment_intents")
        .select(
          `
          *,
          customer:customer_id(email, name)
        `,
        )
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const formatted = (data || []).map((payment) => ({
        ...payment,
        customer_email: payment.customer?.email || "",
      }));

      setPayments(formatted);
    } catch (error) {
      console.error("Error loading payments:", error);
    }
  };

  const loadPrices = async () => {
    try {
      const { data, error } = await supabase
        .from("legalflow.stripe_prices")
        .select(
          `
          *,
          product:product_id(name, description)
        `,
        )
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAvailablePrices(data || []);
    } catch (error) {
      console.error("Error loading prices:", error);
    }
  };

  const createCheckoutSession = async () => {
    try {
      setCreatingCheckout(true);

      const priceIds = checkoutData.line_items.map((item) => item.price_id);
      const quantities = checkoutData.line_items.map((item) => item.quantity);

      const { data, error } = await supabase.rpc(
        "legalflow.create_checkout_session",
        {
          p_customer_email: checkoutData.customer_email,
          p_price_ids: priceIds,
          p_quantities: quantities,
          p_success_url:
            checkoutData.success_url || `${window.location.origin}/success`,
          p_cancel_url:
            checkoutData.cancel_url || `${window.location.origin}/cancel`,
          p_mode: checkoutData.mode,
          p_metadata: checkoutData.metadata,
        },
      );

      if (error) throw error;

      if (data.success) {
        setCheckoutResult(data);
        setCheckoutStep("session");

        toast({
          title: "Checkout criado com sucesso",
          description: `Total: R$ ${(data.amount_total / 100).toFixed(2)}`,
        });

        // Reload data to show new session
        await loadData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      toast({
        title: "Erro ao criar checkout",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setCreatingCheckout(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "paid":
      case "succeeded":
      case "complete":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "past_due":
      case "unpaid":
      case "requires_payment_method":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "canceled":
      case "failed":
      case "uncollectible":
        return <XCircle className="w-4 h-4 text-red-600" />;
      case "incomplete":
      case "processing":
      case "open":
        return <Clock className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "paid":
      case "succeeded":
      case "complete":
        return "bg-green-100 text-green-800";
      case "past_due":
      case "unpaid":
      case "requires_payment_method":
        return "bg-yellow-100 text-yellow-800";
      case "canceled":
      case "failed":
      case "uncollectible":
        return "bg-red-100 text-red-800";
      case "incomplete":
      case "processing":
      case "open":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(amount / 100);
  };

  const resetCheckoutWizard = () => {
    setCheckoutStep("contact");
    setCheckoutData({
      customer_email: "",
      line_items: [],
      success_url: "",
      cancel_url: "",
      mode: "payment",
      metadata: {},
    });
    setCheckoutResult(null);
  };

  // Filter data based on search and status
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      searchTerm === "" ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && customer.active_subscriptions > 0) ||
      (statusFilter === "delinquent" && customer.delinquent) ||
      (statusFilter === "past_due" && customer.unpaid_invoices > 0);

    return matchesSearch && matchesStatus;
  });

  const getPastDueCount = () => {
    return invoices.filter(
      (inv) =>
        inv.status === "open" &&
        inv.due_date &&
        new Date(inv.due_date) < new Date(),
    ).length;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-600" />
            Stripe Wizard (Financeiro)
          </h1>
          <p className="text-neutral-600 mt-1">
            Cobrar com clareza e zero retrabalho - Gestão completa de pagamentos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Atualizar
          </Button>
          <Button
            onClick={() => setShowCheckoutWizard(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Criar Checkout
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{customers.length}</div>
                <div className="text-sm text-neutral-600">Clientes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <div className="text-2xl font-bold">
                  {subscriptions.filter((s) => s.status === "active").length}
                </div>
                <div className="text-sm text-neutral-600">
                  Assinaturas Ativas
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Receipt className="w-8 h-8 text-purple-600" />
              <div>
                <div className="text-2xl font-bold">{invoices.length}</div>
                <div className="text-sm text-neutral-600">Faturas</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {getPastDueCount()}
                </div>
                <div className="text-sm text-neutral-600">Past Due</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            <Input
              placeholder="Buscar clientes, emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="active">Clientes Ativos</SelectItem>
            <SelectItem value="delinquent">Inadimplentes</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as typeof activeTab)}
      >
        <TabsList>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Clientes
          </TabsTrigger>
          <TabsTrigger
            value="subscriptions"
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Assinaturas
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Faturas
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Pagamentos
          </TabsTrigger>
        </TabsList>

        {/* Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          <div className="grid gap-4">
            {filteredCustomers.map((customer) => (
              <Card
                key={customer.id}
                className="transition-all hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${customer.delinquent ? "bg-red-100" : "bg-green-100"}`}
                      >
                        <Users
                          className={`w-5 h-5 ${customer.delinquent ? "text-red-600" : "text-green-600"}`}
                        />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {customer.name || customer.email}
                        </CardTitle>
                        <CardDescription>{customer.email}</CardDescription>
                        {customer.phone && (
                          <div className="text-sm text-neutral-600">
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        {customer.delinquent && (
                          <Badge variant="destructive">Inadimplente</Badge>
                        )}
                        {customer.active_subscriptions > 0 && (
                          <Badge className="bg-green-100 text-green-800">
                            {customer.active_subscriptions} ativa(s)
                          </Badge>
                        )}
                        {customer.unpaid_invoices > 0 && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {customer.unpaid_invoices} pendente(s)
                          </Badge>
                        )}
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(customer.total_spent * 100)}
                      </div>
                      <div className="text-sm text-neutral-600">
                        Total gasto
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-neutral-600">Assinaturas</div>
                      <div className="font-medium">
                        {customer.total_subscriptions}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Faturas</div>
                      <div className="font-medium">
                        {customer.total_invoices}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Stripe ID</div>
                      <div className="font-mono text-xs">
                        {customer.stripe_customer_id}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Criado em</div>
                      <div className="font-medium">
                        {new Date(customer.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions" className="space-y-4">
          <div className="grid gap-4">
            {subscriptions.map((subscription) => (
              <Card
                key={subscription.id}
                className="transition-all hover:shadow-md"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(subscription.status)}
                      <div>
                        <CardTitle className="text-base">
                          {subscription.customer_name ||
                            subscription.customer_email}
                        </CardTitle>
                        <CardDescription>
                          {subscription.customer_email}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(subscription.status)}>
                        {subscription.status}
                      </Badge>
                      <div className="text-lg font-bold mt-1">
                        {formatCurrency(subscription.amount_total || 0)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-neutral-600">Período atual</div>
                      <div className="font-medium">
                        {new Date(
                          subscription.current_period_start,
                        ).toLocaleDateString()}{" "}
                        -{" "}
                        {new Date(
                          subscription.current_period_end,
                        ).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Cancelar no fim</div>
                      <div className="font-medium">
                        {subscription.cancel_at_period_end ? "Sim" : "Não"}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Criado em</div>
                      <div className="font-medium">
                        {new Date(subscription.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <div className="grid gap-4">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(invoice.status)}
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {invoice.number || invoice.stripe_invoice_id}
                          {invoice.hosted_invoice_url && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                window.open(
                                  invoice.hosted_invoice_url,
                                  "_blank",
                                )
                              }
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {invoice.customer_name || invoice.customer_email}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                      <div className="text-lg font-bold mt-1">
                        {formatCurrency(invoice.total)}
                      </div>
                      {invoice.due_date && (
                        <div className="text-sm text-neutral-600">
                          Vence:{" "}
                          {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-neutral-600">Valor devido</div>
                      <div className="font-medium">
                        {formatCurrency(invoice.amount_due)}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Valor pago</div>
                      <div className="font-medium">
                        {formatCurrency(invoice.amount_paid)}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Status</div>
                      <div className="font-medium">{invoice.status}</div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Criado em</div>
                      <div className="font-medium">
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <div className="grid gap-4">
            {payments.map((payment) => (
              <Card key={payment.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(payment.status)}
                      <div>
                        <CardTitle className="text-base">
                          {payment.description ||
                            payment.stripe_payment_intent_id}
                        </CardTitle>
                        <CardDescription>
                          {payment.customer_email}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(payment.status)}>
                        {payment.status}
                      </Badge>
                      <div className="text-lg font-bold mt-1">
                        {formatCurrency(payment.amount)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-neutral-600">Moeda</div>
                      <div className="font-medium">
                        {payment.currency.toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Status</div>
                      <div className="font-medium">{payment.status}</div>
                    </div>
                    <div>
                      <div className="text-neutral-600">Criado em</div>
                      <div className="font-medium">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Checkout Wizard Dialog */}
      <Dialog open={showCheckoutWizard} onOpenChange={setShowCheckoutWizard}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wizard de Checkout</DialogTitle>
            <DialogDescription>
              Contato → Preço → Quantidade → Sessão
            </DialogDescription>
          </DialogHeader>

          <CheckoutWizardPanel
            step={checkoutStep}
            setStep={setCheckoutStep}
            checkoutData={checkoutData}
            setCheckoutData={setCheckoutData}
            availablePrices={availablePrices}
            onCreateCheckout={createCheckoutSession}
            creatingCheckout={creatingCheckout}
            checkoutResult={checkoutResult}
            onReset={resetCheckoutWizard}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente separado para o Wizard de Checkout
interface CheckoutWizardPanelProps {
  step: "contact" | "price" | "quantity" | "session";
  setStep: (step: "contact" | "price" | "quantity" | "session") => void;
  checkoutData: CheckoutSession;
  setCheckoutData: React.Dispatch<React.SetStateAction<CheckoutSession>>;
  availablePrices: any[];
  onCreateCheckout: () => Promise<void>;
  creatingCheckout: boolean;
  checkoutResult: any;
  onReset: () => void;
}

const CheckoutWizardPanel: React.FC<CheckoutWizardPanelProps> = ({
  step,
  setStep,
  checkoutData,
  setCheckoutData,
  availablePrices,
  onCreateCheckout,
  creatingCheckout,
  checkoutResult,
  onReset,
}) => {
  const addLineItem = () => {
    setCheckoutData((prev) => ({
      ...prev,
      line_items: [...prev.line_items, { price_id: "", quantity: 1 }],
    }));
  };

  const updateLineItem = (
    index: number,
    field: keyof CheckoutSession["line_items"][0],
    value: any,
  ) => {
    setCheckoutData((prev) => ({
      ...prev,
      line_items: prev.line_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const removeLineItem = (index: number) => {
    setCheckoutData((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index),
    }));
  };

  const canProceed = () => {
    switch (step) {
      case "contact":
        return checkoutData.customer_email.includes("@");
      case "price":
        return (
          checkoutData.line_items.length > 0 &&
          checkoutData.line_items.every((item) => item.price_id)
        );
      case "quantity":
        return checkoutData.line_items.every((item) => item.quantity > 0);
      default:
        return false;
    }
  };

  const getTotalAmount = () => {
    return checkoutData.line_items.reduce((total, item) => {
      const price = availablePrices.find(
        (p) => p.stripe_price_id === item.price_id,
      );
      return total + (price?.unit_amount || 0) * item.quantity;
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center space-x-4">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            step === "contact"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <Users className="w-4 h-4" />
          1. Contato
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            step === "price"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          2. Preço
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            step === "quantity"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <Target className="w-4 h-4" />
          3. Quantidade
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            step === "session"
              ? "bg-blue-100 text-blue-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          4. Sessão
        </div>
      </div>

      {/* Step Content */}
      {step === "contact" && (
        <Card>
          <CardHeader>
            <CardTitle>1. Informações do Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email do Cliente</Label>
              <Input
                id="email"
                type="email"
                value={checkoutData.customer_email}
                onChange={(e) =>
                  setCheckoutData((prev) => ({
                    ...prev,
                    customer_email: e.target.value,
                  }))
                }
                placeholder="cliente@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="mode">Tipo de Checkout</Label>
              <Select
                value={checkoutData.mode}
                onValueChange={(value: "payment" | "subscription") =>
                  setCheckoutData((prev) => ({ ...prev, mode: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="payment">Pagamento único</SelectItem>
                  <SelectItem value="subscription">Assinatura</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => setStep("price")}
              disabled={!canProceed()}
              className="w-full"
            >
              Próximo: Selecionar Preços
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "price" && (
        <Card>
          <CardHeader>
            <CardTitle>2. Selecionar Preços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkoutData.line_items.map((item, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <Select
                  value={item.price_id}
                  onValueChange={(value) =>
                    updateLineItem(index, "price_id", value)
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um preço" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePrices.map((price) => (
                      <SelectItem key={price.id} value={price.stripe_price_id}>
                        {price.product?.name} - R${" "}
                        {(price.unit_amount / 100).toFixed(2)}
                        {price.type === "recurring" &&
                          ` /${price.recurring_interval}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeLineItem(index)}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            ))}

            <Button variant="outline" onClick={addLineItem} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
            </Button>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("contact")}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={() => setStep("quantity")}
                disabled={!canProceed()}
                className="flex-1"
              >
                Próximo: Definir Quantidades
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "quantity" && (
        <Card>
          <CardHeader>
            <CardTitle>3. Definir Quantidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkoutData.line_items.map((item, index) => {
              const price = availablePrices.find(
                (p) => p.stripe_price_id === item.price_id,
              );
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{price?.product?.name}</div>
                    <div className="text-sm text-neutral-600">
                      R$ {(price?.unit_amount / 100).toFixed(2)}
                      {price?.type === "recurring" &&
                        ` /${price.recurring_interval}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Label>Quantidade:</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(
                          index,
                          "quantity",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className="w-20"
                    />
                    <div className="font-bold">
                      R${" "}
                      {(
                        ((price?.unit_amount || 0) * item.quantity) /
                        100
                      ).toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="border-t pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>R$ {(getTotalAmount() / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("price")}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={onCreateCheckout}
                disabled={!canProceed() || creatingCheckout}
                className="flex-1"
              >
                {creatingCheckout ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    Criar Checkout
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "session" && checkoutResult && (
        <Card>
          <CardHeader>
            <CardTitle>4. Checkout Criado com Sucesso!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <AlertDescription>
                <div className="font-medium text-green-800">
                  Checkout criado com sucesso! Total: R${" "}
                  {(checkoutResult.amount_total / 100).toFixed(2)}
                </div>
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-2">URL do Checkout:</div>
              <div className="flex items-center gap-2">
                <Input
                  value={checkoutResult.checkout_url}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button
                  size="sm"
                  onClick={() =>
                    window.open(checkoutResult.checkout_url, "_blank")
                  }
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-2">Itens do Checkout:</div>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(checkoutResult.line_items, null, 2)}
              </pre>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onReset} className="flex-1">
                Criar Novo Checkout
              </Button>
              <Button
                onClick={() =>
                  window.open(checkoutResult.checkout_url, "_blank")
                }
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Checkout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SF10StripeWizard;
