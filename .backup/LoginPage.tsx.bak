import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
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

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check which auth mode is active
  const authMode = localStorage.getItem("auth-mode") as
    | "demo"
    | "supabase"
    | null;

  // Use hooks conditionally based on auth mode
  let user, login;
  try {
    if (authMode === "demo") {
      const demoAuth = useDemoAuth();
      user = demoAuth.user;
      login = demoAuth.login;
    } else {
      const supabaseAuth = useAuth();
      user = supabaseAuth.user;
      login = supabaseAuth.login;
    }
  } catch (error) {
    // If we get an error, it means we're not in the right context
    console.error("Auth context error:", error);
    user = null;
    login = async () => {
      throw new Error("Contexto de autenticação não disponível");
    };
  }

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
      console.error("Auth error:", err);
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
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <div className="bg-brand-700 text-white p-3 rounded-lg">
              <Scale className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">LegalFlow</h1>
          <p className="text-gray-600 mt-2">Sistema de Gestão Jurídica</p>
          {authMode && (
            <div className="mt-2">
              <span className="text-sm text-brand-700 font-medium">
                Modo: {authMode === "demo" ? "Demonstração" : "Produção"}
              </span>
            </div>
          )}
        </div>

        <Card className="border-brand-200">
          <CardHeader>
            <CardTitle className="text-brand-800">
              Entrar na sua conta
            </CardTitle>
            <CardDescription>
              Acesse o sistema com suas credenciais
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
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full bg-brand-700 hover:bg-brand-900 text-white"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>

              <div className="text-center space-y-2">
                <Link
                  to="/forgot-password"
                  className="text-sm text-brand-700 hover:text-brand-900 hover:underline"
                >
                  Esqueceu sua senha?
                </Link>

                <div className="text-sm text-gray-600">
                  <button
                    type="button"
                    onClick={resetAuthMode}
                    className="text-brand-700 hover:underline"
                  >
                    Trocar modo de autenticação
                  </button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {authMode === "demo" && (
          <div className="text-center mt-6">
            <Alert className="bg-brand-50 border-brand-300">
              <AlertDescription className="text-brand-700 text-sm">
                <strong>Credenciais de demonstração:</strong>
                <br />• Email: <code>admin.test@gmail.com</code>
                <br />• Senha: <code>123456</code>
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}
