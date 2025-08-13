import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Scale, Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase, supabaseConfigured } from '../lib/supabase';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const authMode = localStorage.getItem('auth-mode') as 'demo' | 'supabase' | null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    // Check if demo mode
    if (authMode === 'demo') {
      setMessage('No modo demonstração, a recuperação de senha não está disponível. Use as credenciais de teste: admin.test@gmail.com / 123456');
      setIsLoading(false);
      return;
    }

    // Check if Supabase is configured
    if (!supabaseConfigured) {
      setError('Supabase não está configurado. A recuperação de senha não está disponível.');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
      setMessage('Email de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(err.message || 'Erro ao enviar email de recuperação. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-brand-700 text-white p-3 rounded-lg">
              <Scale className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">LegalFlow</h1>
          <p className="text-gray-600 mt-2">Recuperação de Senha</p>
        </div>

        <Card className="border-brand-200">
          <CardHeader>
            <CardTitle className="text-brand-800">Esqueceu sua senha?</CardTitle>
            <CardDescription>
              Digite seu email para receber um link de recuperação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isSuccess ? (
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

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {message && !isSuccess && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{message}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-brand-700 hover:bg-brand-900 text-white" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Enviando...' : 'Enviar link de recuperação'}
                </Button>

                <div className="text-center">
                  <Link 
                    to="/login" 
                    className="inline-flex items-center text-sm text-brand-700 hover:text-brand-900 hover:underline"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Voltar ao login
                  </Link>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <Alert className="bg-success-50 border-success">
                  <CheckCircle className="h-4 w-4 text-success-600" />
                  <AlertDescription className="text-success-700">
                    {message}
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 text-sm text-gray-600">
                  <p>Instruções:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Verifique sua caixa de entrada</li>
                    <li>Clique no link recebido por email</li>
                    <li>Defina uma nova senha</li>
                    <li>Faça login com a nova senha</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={() => {
                      setIsSuccess(false);
                      setMessage('');
                      setEmail('');
                    }}
                    variant="outline"
                    className="w-full border-brand-300 text-brand-700 hover:bg-brand-50"
                  >
                    Enviar para outro email
                  </Button>
                  
                  <Link to="/login">
                    <Button 
                      variant="default"
                      className="w-full bg-brand-700 hover:bg-brand-900 text-white"
                    >
                      Voltar ao login
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {authMode === 'demo' && (
          <div className="text-center mt-6">
            <Alert className="bg-brand-50 border-brand-300">
              <AlertDescription className="text-brand-700 text-sm">
                <strong>Modo Demonstração:</strong> Use as credenciais de teste para acessar o sistema.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}
