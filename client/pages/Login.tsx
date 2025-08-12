import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Scale, Mail, Lock } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [success, setSuccess] = useState('');
  const { user, isLoading, login, signup } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      if (isSignupMode) {
        await signup(email, password);
        setSuccess('Conta criada com sucesso! Verifique seu email para confirmar.');
        setIsSignupMode(false);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || (isSignupMode ? 'Falha no cadastro.' : 'Falha no login. Verifique suas credenciais.'));
    }
  };

  const handleDemoLogin = () => {
    setEmail('adriano@hermidamaia.adv.br');
    setPassword('123456');
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
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDemoLogin}
                    className="text-sm text-gray-600"
                  >
                    Usar conta demo
                  </Button>
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
                <strong>Primeira vez?</strong> Clique em "Criar conta" para criar sua primeira conta de usuário.
                <br />
                <strong>Para teste:</strong> Use email <code>adriano@hermidamaia.adv.br</code> e senha <code>123456</code>
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
