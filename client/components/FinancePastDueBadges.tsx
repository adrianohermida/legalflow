import React, { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "../hooks/use-toast";
import { supabase } from "../lib/supabase";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  ExternalLink,
  Calendar,
  User,
  Mail,
  RefreshCw,
} from "lucide-react";

interface PastDueInvoice {
  id: string;
  stripe_invoice_id: string;
  customer_email: string;
  customer_name: string;
  number: string;
  amount_due: number;
  total: number;
  currency: string;
  due_date: string;
  days_overdue: number;
  hosted_invoice_url: string;
  status: string;
}

interface FinancePastDueBadgesProps {
  className?: string;
  showDetails?: boolean;
  refreshInterval?: number; // minutes
}

export const FinancePastDueBadges: React.FC<FinancePastDueBadgesProps> = ({
  className = "",
  showDetails = true,
  refreshInterval = 5, // 5 minutes default
}) => {
  const [pastDueInvoices, setPastDueInvoices] = useState<PastDueInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    loadPastDueInvoices();
    
    // Setup refresh interval
    const interval = setInterval(() => {
      loadPastDueInvoices();
    }, refreshInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadPastDueInvoices = async () => {
    try {
      setLoading(true);
      
      // Get invoices that are past due
      const { data, error } = await supabase
        .from("legalflow.stripe_invoices")
        .select(`
          *,
          customer:customer_id(email, name)
        `)
        .in("status", ["open", "past_due"])
        .not("due_date", "is", null)
        .order("due_date", { ascending: true });

      if (error) throw error;

      // Filter and format past due invoices
      const now = new Date();
      const pastDue = (data || [])
        .map(invoice => ({
          ...invoice,
          customer_email: invoice.customer?.email || '',
          customer_name: invoice.customer?.name || '',
          days_overdue: Math.floor(
            (now.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
          ),
        }))
        .filter(invoice => invoice.days_overdue > 0)
        .slice(0, 10); // Limit to 10 most critical

      setPastDueInvoices(pastDue);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error loading past due invoices:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(amount / 100);
  };

  const getSeverityColor = (daysOverdue: number) => {
    if (daysOverdue <= 7) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (daysOverdue <= 30) return "bg-orange-100 text-orange-800 border-orange-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const getSeverityLabel = (daysOverdue: number) => {
    if (daysOverdue <= 7) return "Vencido Recente";
    if (daysOverdue <= 30) return "Vencido";
    return "Crítico";
  };

  const totalPastDueAmount = pastDueInvoices.reduce(
    (total, invoice) => total + invoice.amount_due, 
    0
  );

  if (loading && pastDueInvoices.length === 0) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin text-gray-400" />
        <span className="text-sm text-gray-600">Carregando...</span>
      </div>
    );
  }

  if (pastDueInvoices.length === 0) {
    return showDetails ? (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          <Clock className="w-3 h-3 mr-1" />
          Nenhuma fatura vencida
        </Badge>
      </div>
    ) : null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" className="p-0 h-auto">
            <Badge 
              variant="destructive" 
              className="cursor-pointer hover:bg-red-600 transition-colors"
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              {pastDueInvoices.length} Past Due
            </Badge>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="w-5 h-5" />
                    Faturas Vencidas
                  </CardTitle>
                  <CardDescription>
                    {pastDueInvoices.length} faturas • {formatCurrency(totalPastDueAmount)} total
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={loadPastDueInvoices}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 max-h-80 overflow-y-auto">
              {pastDueInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {invoice.number || invoice.stripe_invoice_id}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {invoice.customer_name || invoice.customer_email}
                      </div>
                      <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                        <Mail className="w-3 h-3" />
                        {invoice.customer_email}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">
                        {formatCurrency(invoice.amount_due)}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getSeverityColor(invoice.days_overdue)}`}
                      >
                        {getSeverityLabel(invoice.days_overdue)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Venceu {invoice.days_overdue} dia(s) atrás
                    </div>
                    {invoice.hosted_invoice_url && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => window.open(invoice.hosted_invoice_url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="text-xs text-gray-500 text-center pt-2 border-t">
                Última atualização: {lastUpdate.toLocaleTimeString()}
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      {showDetails && totalPastDueAmount > 0 && (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          <DollarSign className="w-3 h-3 mr-1" />
          {formatCurrency(totalPastDueAmount)}
        </Badge>
      )}
    </div>
  );
};

// Hook para usar em outros componentes
export const usePastDueInvoices = (refreshInterval = 5) => {
  const [pastDueCount, setPastDueCount] = useState(0);
  const [totalPastDue, setTotalPastDue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from("legalflow.stripe_invoices")
          .select("amount_due, due_date")
          .in("status", ["open", "past_due"])
          .not("due_date", "is", null);

        if (error) throw error;

        const now = new Date();
        const pastDue = (data || []).filter(invoice => 
          new Date(invoice.due_date) < now
        );

        setPastDueCount(pastDue.length);
        setTotalPastDue(pastDue.reduce((total, invoice) => total + invoice.amount_due, 0));
      } catch (error) {
        console.error("Error loading past due summary:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    
    // Setup refresh interval
    const interval = setInterval(loadData, refreshInterval * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { pastDueCount, totalPastDue, loading };
};

export default FinancePastDueBadges;
