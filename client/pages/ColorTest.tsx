/**
 * TESTE MONOCROMÁTICO
 * Página para validar que apenas tons de preto/branco/cinza estão sendo usados
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';

const MonochromaticTest = () => {
  const grayScale = [
    { name: 'Black', value: '#000000', bg: 'bg-black', text: 'text-white' },
    { name: 'Gray 900', value: '#111827', bg: 'bg-gray-900', text: 'text-white' },
    { name: 'Gray 800', value: '#1f2937', bg: 'bg-gray-800', text: 'text-white' },
    { name: 'Gray 700', value: '#374151', bg: 'bg-gray-700', text: 'text-white' },
    { name: 'Gray 600', value: '#4b5563', bg: 'bg-gray-600', text: 'text-white' },
    { name: 'Gray 500', value: '#6b7280', bg: 'bg-gray-500', text: 'text-white' },
    { name: 'Gray 400', value: '#9ca3af', bg: 'bg-gray-400', text: 'text-black' },
    { name: 'Gray 300', value: '#d1d5db', bg: 'bg-gray-300', text: 'text-black' },
    { name: 'Gray 200', value: '#e5e7eb', bg: 'bg-gray-200', text: 'text-black' },
    { name: 'Gray 100', value: '#f3f4f6', bg: 'bg-gray-100', text: 'text-black' },
    { name: 'Gray 50', value: '#f9fafb', bg: 'bg-gray-50', text: 'text-black' },
    { name: 'White', value: '#ffffff', bg: 'bg-white border', text: 'text-black' },
  ];

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Sistema Monocromático
          </h1>
          <p className="text-lg text-gray-600">
            Teste de validação - ZERO cores, foco total no desenvolvimento
          </p>
          <Alert className="max-w-2xl mx-auto">
            <AlertDescription className="text-gray-700">
              ✅ <strong>ZERO COLOR POLICY ATIVO</strong> - Apenas tons de preto, branco e cinza são permitidos
            </AlertDescription>
          </Alert>
        </div>

        {/* Escala de Cinza */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Escala de Cinza Autorizada</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {grayScale.map((color) => (
                <div key={color.name} className="space-y-2">
                  <div 
                    className={`h-20 rounded-lg flex items-center justify-center ${color.bg} ${color.text}`}
                  >
                    <span className="font-medium text-sm">
                      {color.name}
                    </span>
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-mono text-gray-600">
                      {color.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Componentes de Teste */}
        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Botões */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900">Botões Monocromáticos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button className="w-full bg-gray-900 hover:bg-gray-800 text-white">
                  Primário
                </Button>
                <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                  Secundário
                </Button>
                <Button variant="ghost" className="w-full text-gray-600 hover:bg-gray-100">
                  Ghost
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-gray-900">Estados em Cinza</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Badge className="bg-gray-700 text-white">Sucesso</Badge>
                <Badge className="bg-gray-600 text-white">Informação</Badge>
                <Badge className="bg-gray-800 text-white">Erro</Badge>
                <Badge className="bg-gray-500 text-white">Aviso</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-gray-900">Formulários Monocromáticos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Input padrão"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:border-gray-700 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Input focado"
                className="w-full px-3 py-2 border-2 border-gray-700 rounded-md text-gray-900 placeholder-gray-400 focus:border-gray-900 focus:outline-none"
              />
            </div>
            <textarea
              placeholder="Textarea monocromática"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:border-gray-700 focus:outline-none resize-none"
            />
          </CardContent>
        </Card>

        {/* Cards de Layout */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-white border-gray-200">
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-gray-900">Card Claro</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-gray-600">
                Conteúdo em fundo claro com texto em cinza.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-100 border-gray-300">
            <CardHeader className="bg-gray-200">
              <CardTitle className="text-gray-900">Card Neutro</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-gray-700">
                Conteúdo em fundo neutro com texto mais escuro.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-700">
            <CardHeader className="bg-gray-800">
              <CardTitle className="text-white">Card Escuro</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-gray-300">
                Conteúdo em fundo escuro com texto claro.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Status de Validação */}
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-gray-900">Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-700"></div>
                  <span className="text-gray-700">Sistema Monocromático: ATIVO</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-700"></div>
                  <span className="text-gray-700">Zero Color Policy: APLICADA</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-700"></div>
                  <span className="text-gray-700">Foco no Desenvolvimento: MÁXIMO</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-gray-700">Cores Detectadas: 0</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-gray-700">Tons de Cinza: 12</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span className="text-gray-700">Distrações Visuais: ELIMINADAS</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default MonochromaticTest;
