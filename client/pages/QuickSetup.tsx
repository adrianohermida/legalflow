import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { CheckCircle, ExternalLink, User, Database } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface QuickSetupProps {
  onComplete: () => void;
}

export function QuickSetup({ onComplete }: QuickSetupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { signup } = useAuth();

  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard/project/zqxpvajhzgirgciucwxl/auth/users', '_blank');
  };

  const handleCreateAndConfirm = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Create the test account
      await signup('admin@test.com', '123456');
    } catch (err: any) {
      if (!err.message?.includes('já cadastrado') && !err.message?.includes('User already registered')) {
        setError('Erro ao criar conta: ' + err.message);
        setIsLoading(false);
        return;
      }
    }

    // Continue to next step
    setTimeout(() => {
      setCurrentStep(2);
      openSupabaseDashboard();
      setIsLoading(false);
    }, 1000);
  };

  const steps = [
    {
      title: "Passo 1: Criar Usuário de Teste",
      description: "Vamos criar um usuário e abrir o painel do Supabase",
      action: "Criar e Abrir Painel"
    },
    {
      title: "Passo 2: Confirmar Email",
      description: "No painel que abriu, confirme o email do usuário",
      action: "Confirmar Email"
    },
    {
      title: "Passo 3: Fazer Login",
      description: "Volte aqui e faça login com as credenciais",
      action: "Continuar para Login"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg">
              <Database className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Configuração Rápida</h1>
          <p className="text-gray-600 mt-2">Configure sua conta em 3 passos simples</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {steps[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>Vamos criar um usuário de teste:</strong>
                    <br />• Email: <code>admin@test.com</code>
                    <br />• Senha: <code>123456</code>
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={handleCreateAndConfirm}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? 'Criando usuário...' : 'Criar e Abrir Painel'}
                </Button>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    <strong>No painel do Supabase que abriu:</strong>
                    <br />1. Procure por <code>admin@test.com</code> na lista de usuários
                    <br />2. Clique no botão <strong>"Confirm email"</strong> ao lado do usuário
                    <br />3. Volte aqui e clique em "Email Confirmado"
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={openSupabaseDashboard}
                    className="flex-1"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Reabrir Painel
                  </Button>
                  <Button 
                    onClick={() => setCurrentStep(3)}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Email Confirmado
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4 mr-2 inline" />
                  <AlertDescription>
                    <strong>Perfeito! Agora você pode fazer login:</strong>
                    <br />• Email: <code>admin@test.com</code>
                    <br />• Senha: <code>123456</code>
                    <br />• OAB para vincular: <code>123456</code>
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={onComplete}
                  className="w-full"
                  size="lg"
                >
                  Ir para Login
                </Button>
              </div>
            )}

            {/* Progress indicator */}
            <div className="flex justify-center space-x-2 pt-4">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-3 h-3 rounded-full ${
                    step <= currentStep ? 'bg-primary' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
