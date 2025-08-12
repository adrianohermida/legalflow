import "./global.css";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DemoAuthProvider, useDemoAuth } from "./contexts/DemoAuthContext";
import { AppShell } from "./components/AppShell";
import { Login } from "./pages/Login";
import { DemoLogin } from "./pages/DemoLogin";
import Setup from "./pages/Setup";
import { QuickSetup } from "./pages/QuickSetup";
import { ModeSelector } from "./pages/ModeSelector";
import { supabaseConfigured } from "./lib/supabase";
import { useState, useEffect } from "react";

// Initialize development data only when Supabase is configured
if (supabaseConfigured) {
  // dev-setup.ts handles its own initialization
  // Just import admin-setup for admin user creation
  import("./lib/admin-setup").catch(error => {
    console.log('Admin setup skipped:', error.message || error);
  });
}

// Import all page components
import { Dashboard } from "./pages/Dashboard";
import { Processos } from "./pages/Processos";
import { Clientes } from "./pages/Clientes";
import { Jornadas } from "./pages/Jornadas";
import { NovaJornada } from "./pages/NovaJornada";
import { IniciarJornada } from "./pages/IniciarJornada";
import { InboxLegal } from "./pages/InboxLegal";
import { Agenda } from "./pages/Agenda";
import { Documentos } from "./pages/Documentos";
import { Financeiro } from "./pages/Financeiro";
import { Relatorios } from "./pages/Relatorios";
import { Helpdesk } from "./pages/Helpdesk";
import { Servicos } from "./pages/Servicos";

// Portal do Cliente pages
import { PortalChat } from "./pages/portal/PortalChat";
import { PortalJornada } from "./pages/portal/PortalJornada";
import { PortalProcessos } from "./pages/portal/PortalProcessos";
import { PortalCompromissos } from "./pages/portal/PortalCompromissos";
import { PortalFinanceiro } from "./pages/portal/PortalFinanceiro";
import { PortalHelpdesk } from "./pages/portal/PortalHelpdesk";
import { PortalServicos } from "./pages/portal/PortalServicos";

import { SupabaseSetup } from "./components/SupabaseSetup";
import { DemoOABSelectionModal } from "./components/DemoOABSelectionModal";
import { OABSelectionModal } from "./components/OABSelectionModal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function DemoProtectedRoute({ children, userType }: { children: React.ReactNode; userType: 'advogado' | 'cliente' }) {
  const { user, isLoading, logout } = useDemoAuth();
  const [showOABModal, setShowOABModal] = useState(false);

  useEffect(() => {
    if (user && !user.oab && userType === 'advogado') {
      setShowOABModal(true);
    }
  }, [user, userType]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Carregando Demo...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <AppShell userType={userType} user={user} logout={logout}>
        {children}
      </AppShell>
      {userType === 'advogado' && (
        <DemoOABSelectionModal
          open={showOABModal}
          onOpenChange={setShowOABModal}
        />
      )}
    </>
  );
}

function ProtectedRoute({ children, userType }: { children: React.ReactNode; userType: 'advogado' | 'cliente' }) {
  const { user, isLoading, logout } = useAuth();
  const [showOABModal, setShowOABModal] = useState(false);

  useEffect(() => {
    if (user && !user.oab && userType === 'advogado') {
      setShowOABModal(true);
    }
  }, [user, userType]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <AppShell userType={userType} user={user} logout={logout}>
        {children}
      </AppShell>
      {userType === 'advogado' && (
        <OABSelectionModal
          open={showOABModal}
          onOpenChange={setShowOABModal}
        />
      )}
    </>
  );
}

function DemoAppRoutes() {
  const { user } = useDemoAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <DemoLogin />}
      />
      
      {/* Escritório - Área do Advogado */}
      <Route path="/" element={
        <DemoProtectedRoute userType="advogado">
          <Dashboard />
        </DemoProtectedRoute>
      } />
      <Route path="/processos" element={
        <DemoProtectedRoute userType="advogado">
          <Processos />
        </DemoProtectedRoute>
      } />
      <Route path="/clientes" element={
        <DemoProtectedRoute userType="advogado">
          <Clientes />
        </DemoProtectedRoute>
      } />
      <Route path="/jornadas" element={
        <DemoProtectedRoute userType="advogado">
          <Jornadas />
        </DemoProtectedRoute>
      } />
      <Route path="/jornadas/nova" element={
        <DemoProtectedRoute userType="advogado">
          <NovaJornada />
        </DemoProtectedRoute>
      } />
      <Route path="/jornadas/iniciar" element={
        <DemoProtectedRoute userType="advogado">
          <IniciarJornada />
        </DemoProtectedRoute>
      } />
      <Route path="/inbox" element={
        <DemoProtectedRoute userType="advogado">
          <InboxLegal />
        </DemoProtectedRoute>
      } />
      <Route path="/agenda" element={
        <DemoProtectedRoute userType="advogado">
          <Agenda />
        </DemoProtectedRoute>
      } />
      <Route path="/documentos" element={
        <DemoProtectedRoute userType="advogado">
          <Documentos />
        </DemoProtectedRoute>
      } />
      <Route path="/financeiro" element={
        <DemoProtectedRoute userType="advogado">
          <Financeiro />
        </DemoProtectedRoute>
      } />
      <Route path="/relatorios" element={
        <DemoProtectedRoute userType="advogado">
          <Relatorios />
        </DemoProtectedRoute>
      } />
      <Route path="/helpdesk" element={
        <DemoProtectedRoute userType="advogado">
          <Helpdesk />
        </DemoProtectedRoute>
      } />
      <Route path="/servicos" element={
        <DemoProtectedRoute userType="advogado">
          <Servicos />
        </DemoProtectedRoute>
      } />

      {/* Portal do Cliente */}
      <Route path="/portal/chat" element={
        <DemoProtectedRoute userType="cliente">
          <PortalChat />
        </DemoProtectedRoute>
      } />
      <Route path="/portal/jornada" element={
        <DemoProtectedRoute userType="cliente">
          <PortalJornada />
        </DemoProtectedRoute>
      } />
      <Route path="/portal/processos" element={
        <DemoProtectedRoute userType="cliente">
          <PortalProcessos />
        </DemoProtectedRoute>
      } />
      <Route path="/portal/compromissos" element={
        <DemoProtectedRoute userType="cliente">
          <PortalCompromissos />
        </DemoProtectedRoute>
      } />
      <Route path="/portal/financeiro" element={
        <DemoProtectedRoute userType="cliente">
          <PortalFinanceiro />
        </DemoProtectedRoute>
      } />
      <Route path="/portal/helpdesk" element={
        <DemoProtectedRoute userType="cliente">
          <PortalHelpdesk />
        </DemoProtectedRoute>
      } />
      <Route path="/portal/servicos" element={
        <DemoProtectedRoute userType="cliente">
          <PortalServicos />
        </DemoProtectedRoute>
      } />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function RegularAppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/setup"
        element={!supabaseConfigured ? <Setup /> : <Navigate to="/" replace />}
      />
      <Route
        path="/quick-setup"
        element={supabaseConfigured ? <QuickSetup /> : <Navigate to="/setup" replace />}
      />
      
      {/* Same routes as demo but with regular auth */}
      <Route path="/" element={
        <ProtectedRoute userType="advogado">
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/processos" element={
        <ProtectedRoute userType="advogado">
          <Processos />
        </ProtectedRoute>
      } />
      <Route path="/clientes" element={
        <ProtectedRoute userType="advogado">
          <Clientes />
        </ProtectedRoute>
      } />
      {/* Add all other routes similarly... */}
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  const [authMode, setAuthMode] = useState<'demo' | 'supabase' | null>(
    localStorage.getItem('auth-mode') as 'demo' | 'supabase' | null
  );

  // Show mode selector if no mode is selected
  if (!authMode) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <ModeSelector onModeSelect={(mode) => {
              localStorage.setItem('auth-mode', mode);
              setAuthMode(mode);
            }} />
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const AppContent = authMode === 'demo' ? (
    <DemoAuthProvider>
      <DemoAppRoutes />
    </DemoAuthProvider>
  ) : (
    <AuthProvider>
      <RegularAppRoutes />
    </AuthProvider>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          {AppContent}
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
