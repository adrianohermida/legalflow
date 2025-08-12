import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { DollarSign, TrendingUp, AlertTriangle, ExternalLink } from 'lucide-react';

interface FinancialMetrics {
  total_revenue: number;
  monthly_revenue: number;
  overdue_amount: number;
  collection_rate: number;
  active_plans: number;
  overdue_installments: number;
}

interface FinancialWidgetProps {
  metrics: FinancialMetrics;
}

export function FinancialWidget({ metrics }: FinancialWidgetProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${Math.round(value * 10) / 10}%`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base">Financeiro</CardTitle>
          <CardDescription>Resumo dos planos de pagamento</CardDescription>
        </div>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Revenue Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Receita Total</div>
            <div className="text-lg font-bold text-green-600">
              {formatCurrency(metrics.total_revenue)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Este Mês</div>
            <div className="text-lg font-bold">
              {formatCurrency(metrics.monthly_revenue)}
            </div>
          </div>
        </div>

        {/* Collection Rate */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Taxa de Cobrança</span>
            <span className="text-sm font-medium">{formatPercentage(metrics.collection_rate)}</span>
          </div>
          <Progress value={metrics.collection_rate} className="h-2" />
        </div>

        {/* Key Metrics */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm">Planos Ativos</span>
            <Badge variant="outline">{metrics.active_plans}</Badge>
          </div>
          
          {metrics.overdue_amount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Valores Vencidos</span>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-sm font-medium text-red-600">
                  {formatCurrency(metrics.overdue_amount)}
                </span>
              </div>
            </div>
          )}

          {metrics.overdue_installments > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm">Parcelas em Atraso</span>
              <Badge variant="destructive">{metrics.overdue_installments}</Badge>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t">
          <Button size="sm" variant="outline" className="w-full" asChild>
            <Link to="/planos-pagamento">
              <ExternalLink className="h-3 w-3 mr-2" />
              Ver Todos os Planos
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Default props for when no metrics are provided
FinancialWidget.defaultProps = {
  metrics: {
    total_revenue: 245000,
    monthly_revenue: 38500,
    overdue_amount: 23500,
    collection_rate: 91.2,
    active_plans: 18,
    overdue_installments: 8
  }
};
