import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Zap, Database, Play, Settings } from 'lucide-react';

interface ModeSelectorProps {
  onSelectDemo: () => void;
  onSelectSupabase: () => void;
}

export function ModeSelector({ onSelectDemo, onSelectSupabase }: ModeSelectorProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">LegalFlow</h1>
          <p className="text-gray-600">Sistema de Gestão Jurídica</p>
          <p className="text-sm text-gray-500 mt-2">Escolha como deseja acessar o sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Demo Mode */}
          <Card className="border-2 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <Play className="h-5 w-5" />
                Modo Demo
              </CardTitle>
              <CardDescription>
                Acesso imediato sem configuração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span>Login instantâneo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span>Dados de exemplo inclusos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span>Não requer banco de dados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  <span>Perfeito para testar</span>
                </div>
              </div>

              <Alert className="bg-green-100 border-green-300">
                <AlertDescription className="text-green-800">
                  <strong>Credenciais:</strong>
                  <br />• Email: <code>admin.test@gmail.com</code>
                  <br />• Senha: <code>123456</code>
                  <br />• OAB: <code>123456</code>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={onSelectDemo}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Começar Demo
              </Button>
            </CardContent>
          </Card>

          {/* Supabase Mode */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-800">
                <Database className="h-5 w-5" />
                Modo Supabase
              </CardTitle>
              <CardDescription>
                Banco de dados real com configuração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-600" />
                  <span>Dados persistentes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-600" />
                  <span>Autenticação real</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-600" />
                  <span>Múltiplos usuários</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-600" />
                  <span>Requer configuração</span>
                </div>
              </div>

              <Alert className="bg-blue-100 border-blue-300">
                <AlertDescription className="text-blue-800">
                  <strong>Requer:</strong>
                  <br />• Configuração do Supabase
                  <br />• Confirmação de email
                  <br />• Setup manual inicial
                </AlertDescription>
              </Alert>

              <Button 
                onClick={onSelectSupabase}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                size="lg"
              >
                <Database className="h-4 w-4 mr-2" />
                Configurar Supabase
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            💡 Recomendamos começar com o <strong>Modo Demo</strong> para explorar o sistema
          </p>
        </div>
      </div>
    </div>
  );
}
