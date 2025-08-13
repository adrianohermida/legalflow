import React from 'react';
import { MessageSquare, Send, Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export function PortalChat() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-semibold text-neutral-900">
            Chat
          </h1>
          <p className="text-neutral-600 mt-1">
            Converse com seu advogado
          </p>
        </div>
        <Button className="bg-brand-700 hover:bg-brand-900 text-white">
          <Plus className="w-4 h-4 mr-2" />
          Nova Conversa
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Chat - Em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Send className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 mb-2">
              Módulo em Desenvolvimento
            </h3>
            <p className="text-neutral-600 max-w-md mx-auto">
              O chat será implementado na Fase 2 com conversas em tempo real, 
              histórico de mensagens e notificações push.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
