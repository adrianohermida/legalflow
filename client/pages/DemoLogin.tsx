import React, { useState } from 'react';
import { useDemoAuth } from '../contexts/DemoAuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Scale, Mail, Lock, Play, RotateCcw } from 'lucide-react';

export function DemoLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { user, isLoading, login } = useDemoAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Falha no login');
    }
  };

  const fillDemoCredentials = () => {
    setEmail('admin.test@gmail.com');
    setPassword('123456');
  };

  const switchToSupabase = () => {
    localStorage.setItem('auth-mode', 'supabase');
    window.location.reload();
  };

  const resetMode = () => {
    localStorage.removeItem('auth-mode');
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-success text-white p-3 rounded-lg">
              <Scale className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">LegalFlow</h1>
          <p className="text-gray-600 mt-2">Sistema de Gestão Jurídica</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Play className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-700 font-medium">Modo Demo</span>
          </div>
        </div>

        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">Entrar no Demo</CardTitle>
            <CardDescription>
              Use as credenciais de teste para explorar o sistema
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
                    placeholder="admin.test@gmail.com"
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
                    placeholder="123456"
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

              <Alert className="bg-success-50 border-success">
                <AlertDescription className="text-success-700">
                  <strong>Credenciais de teste:</strong>
                  <br />• Email: <code>admin.test@gmail.com</code>
                  <br />• Senha: <code>123456</code>
                  <br />• OAB para vincular: <code>123456</code>
                </AlertDescription>
              </Alert>

              <Button type="submit" className="w-full bg-success hover:bg-success-600" disabled={isLoading}>
                {isLoading ? 'Entrando...' : 'Entrar no Demo'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={fillDemoCredentials}
                className="w-full border-success text-success hover:bg-success-50"
              >
                Preencher credenciais de teste
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-green-200 space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={switchToSupabase}
                className="w-full text-brand-700 hover:text-brand-900 hover:bg-brand-50"
              >
                Trocar para Modo Supabase
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetMode}
                className="w-full text-gray-600 hover:text-gray-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Voltar à seleção de modo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
