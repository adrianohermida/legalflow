import "./global.css";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { DemoAuthProvider } from "./contexts/DemoAuthContext";
import { DemoAppLayout } from "./components/DemoAppLayout";
import { RegularAppLayout } from "./components/RegularAppLayout";
import { Login } from "./pages/Login";
import { DemoLogin } from "./pages/DemoLogin";
import Setup from "./pages/Setup";
import { QuickSetup } from "./pages/QuickSetup";
import { ModeSelector } from "./pages/ModeSelector";
import { supabaseConfigured } from "./lib/supabase";
import { useState } from "react";

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
import { PlanosPagamento } from "./pages/PlanosPagamento";

// Portal do Cliente pages
import { PortalChat } from "./pages/portal/PortalChat";
import { PortalJornada } from "./pages/portal/PortalJornada";
import { PortalProcessos } from "./pages/portal/PortalProcessos";
import { PortalCompromissos } from "./pages/portal/PortalCompromissos";
import { PortalFinanceiro } from "./pages/portal/PortalFinanceiro";
import { PortalHelpdesk } from "./pages/portal/PortalHelpdesk";
import { PortalServicos } from "./pages/portal/PortalServicos";
import { PortalCliente } from "./pages/PortalCliente";

import { SupabaseSetup } from "./components/SupabaseSetup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function DemoAppRoutes() {
  const { user } = require('./contexts/DemoAuthContext').useDemoAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <DemoLogin />}
      />
      
      {/* Escritório - Área do Advogado */}
      <Route path="/" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<Dashboard />} />
        <Route path="processos" element={<Processos />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="jornadas" element={<Jornadas />} />
        <Route path="jornadas/nova" element={<NovaJornada />} />
        <Route path="jornadas/iniciar" element={<IniciarJornada />} />
        <Route path="inbox" element={<InboxLegal />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="documentos" element={<Documentos />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="planos-pagamento" element={<PlanosPagamento />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="helpdesk" element={<Helpdesk />} />
        <Route path="servicos" element={<Servicos />} />
      </Route>

      {/* Portal do Cliente */}
      <Route path="/portal" element={<DemoAppLayout userType="cliente" />}>
        <Route path="chat" element={<PortalChat />} />
        <Route path="jornada" element={<PortalJornada />} />
        <Route path="processos" element={<PortalProcessos />} />
        <Route path="compromissos" element={<PortalCompromissos />} />
        <Route path="financeiro" element={<PortalFinanceiro />} />
        <Route path="helpdesk" element={<PortalHelpdesk />} />
        <Route path="servicos" element={<PortalServicos />} />
        <Route path="cliente/:instanceId" element={<PortalCliente />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function RegularAppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/setup"
        element={!supabaseConfigured ? <Setup /> : <Navigate to="/" replace />}
      />
      <Route
        path="/quick-setup"
        element={supabaseConfigured ? <QuickSetup /> : <Navigate to="/setup" replace />}
      />
      
      {/* Escritório - Área do Advogado */}
      <Route path="/" element={<RegularAppLayout userType="advogado" />}>
        <Route index element={<Dashboard />} />
        <Route path="processos" element={<Processos />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="jornadas" element={<Jornadas />} />
        <Route path="jornadas/nova" element={<NovaJornada />} />
        <Route path="jornadas/iniciar" element={<IniciarJornada />} />
        <Route path="inbox" element={<InboxLegal />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="documentos" element={<Documentos />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="planos-pagamento" element={<PlanosPagamento />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="helpdesk" element={<Helpdesk />} />
        <Route path="servicos" element={<Servicos />} />
      </Route>

      {/* Portal do Cliente */}
      <Route path="/portal" element={<RegularAppLayout userType="cliente" />}>
        <Route path="chat" element={<PortalChat />} />
        <Route path="jornada" element={<PortalJornada />} />
        <Route path="processos" element={<PortalProcessos />} />
        <Route path="compromissos" element={<PortalCompromissos />} />
        <Route path="financeiro" element={<PortalFinanceiro />} />
        <Route path="helpdesk" element={<PortalHelpdesk />} />
        <Route path="servicos" element={<PortalServicos />} />
        <Route path="cliente/:instanceId" element={<PortalCliente />} />
      </Route>

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
