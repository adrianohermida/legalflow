import React from 'react';
import { CalendarCheck, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export function PortalCompromissos() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-neutral-900">
            Compromissos
          </h1>
          <p className="text-neutral-600 mt-1">
            Seus agendamentos e prazos
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5" />
            Compromissos - Em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Módulo em Desenvolvimento
            </h3>
            <p className="text-neutral-600 max-w-md mx-auto">
              Os compromissos serão implementados na Fase 2 com agenda 
              compartilhada e lembretes automáticos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
