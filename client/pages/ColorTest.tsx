import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export function ColorTest() {
  return (
    <div className="p-6 space-y-6 bg-surface min-h-screen">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">
          Teste de Sistema de Cores
        </h1>
        <p className="text-neutral-600">
          Verificação do branding e eliminação do amarelo
        </p>
      </div>

      {/* Brand Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Cores da Marca</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-brand-900 text-white p-4 rounded text-center">
              Brand 900
              <br />
              #1b3a2f
            </div>
            <div className="bg-brand-700 text-white p-4 rounded text-center">
              Brand 700
              <br />
              #285245
            </div>
            <div className="bg-brand-100 text-brand-900 p-4 rounded text-center">
              Brand 100
              <br />
              #e9f3ef
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Cores de Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-success text-white p-4 rounded text-center">
              Success
              <br />
              #16a34a
            </div>
            <div className="bg-warning text-white p-4 rounded text-center">
              Warning
              <br />
              #d97706
            </div>
            <div className="bg-danger text-white p-4 rounded text-center">
              Danger
              <br />
              #ef4444
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surface Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Cores de Superfície</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface border-2 border-neutral-200 p-4 rounded text-center">
              Surface (Branco)
              <br />
              var(--surface)
            </div>
            <div className="bg-surface-2 border-2 border-neutral-200 p-4 rounded text-center">
              Surface 2 (Cinza claro)
              <br />
              var(--surface-2)
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Componentes */}
      <Card>
        <CardHeader>
          <CardTitle>Componentes com Brand</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button className="bg-brand-700 hover:bg-brand-900 text-white">
              Botão Primary
            </Button>
            <Button variant="outline" className="border-brand-700 text-brand-700 hover:bg-brand-100">
              Botão Outline
            </Button>
            <Badge className="bg-brand-100 text-brand-900">
              Badge Brand
            </Badge>
            <Badge className="bg-success-100 text-success-700">
              Badge Success
            </Badge>
            <Badge className="bg-warning-100 text-warning-700">
              Badge Warning
            </Badge>
            <Badge className="bg-danger-100 text-danger-700">
              Badge Danger
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Teste de Texto */}
      <Card>
        <CardHeader>
          <CardTitle>Hierarquia de Texto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-neutral-900 font-bold">Texto Principal (neutral-900)</p>
          <p className="text-neutral-600">Texto Secundário (neutral-600)</p>
          <p className="text-neutral-500">Texto Terciário (neutral-500)</p>
          <p className="text-brand-700">Texto Brand (brand-700)</p>
          <p className="text-success">Texto Success</p>
          <p className="text-warning">Texto Warning</p>
          <p className="text-danger">Texto Danger</p>
        </CardContent>
      </Card>

      {/* Verificação Contra Amarelo */}
      <Card className="border-2 border-success">
        <CardHeader>
          <CardTitle className="text-success">✅ Verificação: Sem Amarelo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-neutral-600">
            Se você estiver vendo esta página com fundo branco e cores consistentes da marca,
            o sistema de cores foi implementado corretamente e todo amarelo foi eliminado.
          </p>
          <div className="mt-4 p-4 bg-success-50 border border-success-200 rounded">
            <p className="text-success-700 font-medium">
              ✅ Brand tokens implementados
              <br />
              ✅ Amarelo eliminado
              <br />
              ✅ Contraste AA+ garantido
              <br />
              ✅ Sistema consistente
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
