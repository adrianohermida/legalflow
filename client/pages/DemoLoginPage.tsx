import React, { useState } from "react";
import { useDemoAuth } from "../contexts/DemoAuthContext";
import { Navigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Scale, Mail, Lock, AlertCircle } from "lucide-react";

export function DemoLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { user, login } = useDemoAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      console.error("Demo auth error:", err);
      setError(err.message || "Falha no login. Verifique suas credenciais.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetAuthMode = () => {
    localStorage.removeItem("auth-mode");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-brand-700 text-white p-3 rounded-lg">
              <Scale className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">LegalFlow</h1>
          <p className="text-neutral-600 mt-2">Modo Demo</p>
        </div>

        <Card className="border-brand-200">
          <CardHeader>
            <CardTitle className="text-brand-800">Acesso Demo</CardTitle>
            <CardDescription>
              Use as credenciais de demonstração para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
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
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
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
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-brand-700 hover:bg-brand-900 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar no Demo"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={resetAuthMode}
                  className="text-sm text-brand-700 hover:text-brand-900 hover:underline"
                >
                  Escolher outro modo
                </button>
              </div>
            </form>

            <Alert className="mt-4 bg-surface-2 border-brand-300">
              <AlertDescription className="text-brand-700">
                <strong>Credenciais Demo:</strong>
                <br />• Email: admin.test@gmail.com
                <br />• Senha: 123456
                <br />�� OAB para teste: 123456
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
