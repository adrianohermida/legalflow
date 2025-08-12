import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Clientes } from "./pages/Clientes";
import { Jornadas } from "./pages/Jornadas";
import { NovaJornada } from "./pages/NovaJornada";
import { IniciarJornada } from "./pages/IniciarJornada";
import { PortalCliente } from "./pages/PortalCliente";
import { InboxLegal } from "./pages/InboxLegal";
import { Documentos } from "./pages/Documentos";
import { PlaceholderPage } from "./pages/PlaceholderPage";
import { OABSelectionModal } from "./components/OABSelectionModal";
import NotFound from "./pages/NotFound";
import { useState, useEffect } from "react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [showOABModal, setShowOABModal] = useState(false);

  useEffect(() => {
    if (user && !user.oab) {
      setShowOABModal(true);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Layout>{children}</Layout>
      <OABSelectionModal
        open={showOABModal}
        onOpenChange={setShowOABModal}
      />
    </>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/clientes" element={
        <ProtectedRoute>
          <Clientes />
        </ProtectedRoute>
      } />
      <Route path="/jornadas" element={
        <ProtectedRoute>
          <Jornadas />
        </ProtectedRoute>
      } />
      <Route path="/jornadas/nova" element={
        <ProtectedRoute>
          <NovaJornada />
        </ProtectedRoute>
      } />
      <Route path="/jornadas/iniciar" element={
        <ProtectedRoute>
          <IniciarJornada />
        </ProtectedRoute>
      } />
      <Route path="/jornadas/instancia/:instanceId" element={
        <ProtectedRoute>
          <PlaceholderPage
            title="Detalhes da Instância"
            description="Detalhes completos da jornada em andamento com métricas e progresso."
          />
        </ProtectedRoute>
      } />
      <Route path="/portal-cliente/:instanceId" element={
        <ProtectedRoute>
          <PortalCliente />
        </ProtectedRoute>
      } />
      <Route path="/inbox" element={
        <ProtectedRoute>
          <InboxLegal />
        </ProtectedRoute>
      } />
      <Route path="/processos/:id" element={
        <ProtectedRoute>
          <PlaceholderPage
            title="Detalhes do Processo"
            description="Aqui você verá o overview completo do processo com timeline, documentos e jornadas."
          />
        </ProtectedRoute>
      } />
      <Route path="/processos/novo" element={
        <ProtectedRoute>
          <PlaceholderPage
            title="Criar Novo Processo"
            description="Formulário para criação de novos processos vinculados aos clientes."
          />
        </ProtectedRoute>
      } />
      <Route path="/documentos" element={
        <ProtectedRoute>
          <Documentos />
        </ProtectedRoute>
      } />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
