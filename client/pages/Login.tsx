import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Scale, Mail, Lock } from 'lucide-react';
import { QuickSetup } from './QuickSetup';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [success, setSuccess] = useState('');
  const [isCreatingTestUser, setIsCreatingTestUser] = useState(false);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const { user, isLoading, login, signup } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  if (showQuickSetup) {
    return <QuickSetup onComplete={() => setShowQuickSetup(false)} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isSignupMode) {
        await signup(email, password);
        setSuccess('Conta criada! Para desenvolvimento: confirme o email no painel do Supabase ou desative a confirmação de email.');
        setIsSignupMode(false);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMessage = err.message || (isSignupMode ? 'Falha no cadastro.' : 'Falha no login. Verifique suas credenciais.');

      // Special handling for email confirmation error
      if (err.message?.includes('Email não confirmado') || err.message?.includes('Email not confirmed')) {
        errorMessage = 'Email não confirmado. Para desenvolvimento, siga os passos abaixo.';
      }

      setError(errorMessage);
    }
  };

  const handleDemoLogin = (email = 'admin.test@gmail.com') => {
    setEmail(email);
    setPassword('123456');
  };

  const testAccounts = [
    { email: 'admin.test@gmail.com', label: 'Admin Test' },
    { email: 'user.test@gmail.com', label: 'User Test' },
    { email: 'dev.test@gmail.com', label: 'Dev Test' }
  ];

  const createTestUser = async () => {
    setIsCreatingTestUser(true);
    setError('');
    setSuccess('');

    try {
      // Try to create the main test account
      try {
        await signup('admin.test@gmail.com', '123456');
        setSuccess('Conta criada! Abrindo painel do Supabase para confirmar email...');
      } catch (err: any) {
        if (err.message?.includes('rate limit')) {
          setSuccess('Rate limit atingido. Use a Configuração Rápida ou aguarde alguns minutos.');
          setError('');
        } else if (err.message?.includes('já cadastrado') || err.message?.includes('User already registered')) {
          setSuccess('Conta já existe! Abrindo painel para confirmar email...');
        } else {
          setSuccess('Abrindo painel do Supabase para criar conta manualmente...');
        }
      }

      handleDemoLogin('admin.test@gmail.com'); // Fill in the credentials

      // Auto-open Supabase dashboard after a short delay
      setTimeout(() => {
        window.open('https://supabase.com/dashboard/project/zqxpvajhzgirgciucwxl/auth/users', '_blank');
      }, 1000);

    } catch (err: any) {
      setError('Use a Configuração Rápida para um processo guiado: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsCreatingTestUser(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg">
              <Scale className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">LegalFlow</h1>
          <p className="text-gray-600 mt-2">Sistema de Gestão Jurídica</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isSignupMode ? 'Criar conta' : 'Entrar na sua conta'}</CardTitle>
            <CardDescription>
              {isSignupMode ? 'Crie uma nova conta no sistema' : 'Acesse o sistema com suas credenciais'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="space-y-2">
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>

                  {error.includes('Email não confirmado') && (
                    <Alert>
                      <AlertDescription className="text-sm space-y-3">
                        <div>
                          <strong>Para resolver (desenvolvimento):</strong>
                          <br />• Acesse o painel do Supabase → Authentication → Users
                          <br />• Encontre seu usuário e clique em "Confirm email"
                          <br />• Ou desative "Enable email confirmations" em Auth Settings
                        </div>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://supabase.com/dashboard/project/zqxpvajhzgirgciucwxl/auth/users', '_blank')}
                            className="w-full"
                          >
                            Abrir Painel do Supabase
                          </Button>
                          <div className="space-y-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setShowQuickSetup(true)}
                              className="w-full"
                            >
                              🚀 Configuração Rápida (3 passos)
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEmail('admin.test@gmail.com');
                                setPassword('123456');
                                setError('');
                                setSuccess('Credenciais preenchidas! Se ainda não funcionar, use a Configuração Rápida.');
                              }}
                              className="w-full"
                            >
                              Usar Conta de Teste (admin.test@gmail.com)
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading
                  ? (isSignupMode ? 'Criando conta...' : 'Entrando...')
                  : (isSignupMode ? 'Criar conta' : 'Entrar')
                }
              </Button>

              <div className="text-center space-y-2">
                {!isSignupMode && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 mb-2">Contas de teste:</div>
                    <div className="grid grid-cols-1 gap-1">
                      {testAccounts.map((account) => (
                        <Button
                          key={account.email}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDemoLogin(account.email)}
                          className="text-xs text-gray-600 h-8"
                        >
                          {account.label} ({account.email})
                        </Button>
                      ))}
                    </div>
                    <div className="space-y-2 mt-2">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() => setShowQuickSetup(true)}
                        className="text-sm w-full"
                      >
                        🚀 Configuração Rápida
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={createTestUser}
                        disabled={isCreatingTestUser}
                        className="text-sm w-full"
                      >
                        {isCreatingTestUser ? 'Criando...' : 'Criar contas de teste'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-600">
                  {isSignupMode ? 'Já tem uma conta?' : 'Não tem uma conta?'}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignupMode(!isSignupMode);
                      setError('');
                      setSuccess('');
                    }}
                    className="text-primary hover:underline"
                  >
                    {isSignupMode ? 'Fazer login' : 'Criar conta'}
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {!isSignupMode && (
          <div className="text-center mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>🚀 Primeira vez?</strong> Use a <strong>"Configuração Rápida"</strong> - te guiamos em 3 passos simples!
                <br />
                <strong>Ou use contas prontas:</strong> <code>admin@test.com</code> / <code>123456</code>
                <br />
                <strong>Problema com login?</strong> A Configuração Rápida resolve tudo automaticamente
                <br />
                Após fazer login, use OAB <strong>123456</strong> para vincular.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
