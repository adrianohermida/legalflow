import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Zap, Database, Play, Settings } from "lucide-react";

interface ModeSelectorProps {
  onModeSelect: (mode: "demo" | "supabase") => void;
}

export function ModeSelector({ onModeSelect }: ModeSelectorProps) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            LegalFlow
          </h1>
          <p className="text-neutral-600">Sistema de Gestão Jurídica</p>
          <p className="text-sm text-neutral-500 mt-2">
            Escolha como deseja acessar o sistema
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Demo Mode */}
          <Card className="border-2 border-brand-200 bg-brand-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-brand-700">
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
                  <Zap className="h-4 w-4 text-brand-600" />
                  <span>Login instantâneo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-brand-600" />
                  <span>Dados de exemplo inclusos</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-brand-600" />
                  <span>Não requer banco de dados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-brand-600" />
                  <span>Perfeito para testar</span>
                </div>
              </div>

              <Alert className="bg-brand-100 border-brand-300">
                <AlertDescription className="text-brand-700">
                  <strong>Credenciais:</strong>
                  <br />• Email: <code>admin.test@gmail.com</code>
                  <br />• Senha: <code>123456</code>
                  <br />
                  ��� OAB: <code>123456</code>
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => onModeSelect("demo")}
                className="w-full bg-brand-700 hover:bg-brand-900 text-white"
                size="lg"
              >
                <Play className="h-4 w-4 mr-2" />
                Começar Demo
              </Button>
            </CardContent>
          </Card>

          {/* Supabase Mode */}
          <Card className="border-2 border-brand-200 bg-brand-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-brand-700">
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
                  <Settings className="h-4 w-4 text-brand-600" />
                  <span>Dados persistentes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-brand-600" />
                  <span>Autenticação real</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-brand-600" />
                  <span>Múltiplos usuários</span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-brand-600" />
                  <span>Requer configuração</span>
                </div>
              </div>

              <Alert className="bg-brand-100 border-brand-300">
                <AlertDescription className="text-brand-700">
                  <strong>Requer:</strong>
                  <br />• Configuração do Supabase
                  <br />• Confirmação de email
                  <br />• Setup manual inicial
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => onModeSelect("supabase")}
                variant="outline"
                className="w-full border-brand-300 text-brand-700 hover:bg-brand-100"
                size="lg"
              >
                <Database className="h-4 w-4 mr-2" />
                Configurar Supabase
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-neutral-500">
            💡 Recomendamos começar com o <strong>Modo Demo</strong> para
            explorar o sistema
          </p>
        </div>
      </div>
    </div>
  );
}
