import React from 'react';
import { Calendar, Clock, Plus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export function Agenda() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-neutral-900">
            Agenda
          </h1>
          <p className="text-neutral-600 mt-1">
            Compromissos, prazos e eventos
          </p>
        </div>
        <Button className="btn-brand">
          <Plus className="w-4 h-4 mr-2" />
          Novo Compromisso
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Agenda - Em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Módulo em Desenvolvimento
            </h3>
            <p className="text-neutral-600 max-w-md mx-auto">
              O módulo de Agenda será implementado na Fase 2 com calendário completo, 
              lembretes de prazos e integração com o sistema de processos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
