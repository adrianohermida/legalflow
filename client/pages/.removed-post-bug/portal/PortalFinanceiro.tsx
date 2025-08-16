import React from 'react';
import { Receipt, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export function PortalFinanceiro() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-neutral-900">
            Financeiro
          </h1>
          <p className="text-neutral-600 mt-1">
            Faturas e histórico de pagamentos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Financeiro - Em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <CreditCard className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Módulo em Desenvolvimento
            </h3>
            <p className="text-neutral-600 max-w-md mx-auto">
              O financeiro do cliente será implementado na Fase 2 com 
              faturas detalhadas e opções de pagamento online.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
