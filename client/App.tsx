import "./global.css";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DemoAuthProvider, useDemoAuth } from "./contexts/DemoAuthContext";
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
  const { user } = useDemoAuth();
  
  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/" replace /> : <DemoLogin />} 
      />
      
      {/* Escritório - Área do Advogado com Layout */}
      <Route path="/" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<Dashboard />} />
      </Route>
      
      <Route path="/processos" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<Processos />} />
      </Route>
      
      <Route path="/clientes" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<Clientes />} />
      </Route>
      
      <Route path="/jornadas" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<Jornadas />} />
      </Route>

      <Route path="/jornadas/nova" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<NovaJornada />} />
      </Route>

      <Route path="/jornadas/iniciar" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<IniciarJornada />} />
      </Route>

      <Route path="/inbox" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<InboxLegal />} />
      </Route>

      <Route path="/agenda" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<Agenda />} />
      </Route>

      <Route path="/documentos" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<Documentos />} />
      </Route>

      <Route path="/financeiro" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<Financeiro />} />
      </Route>

      <Route path="/planos-pagamento" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<PlanosPagamento />} />
      </Route>

      <Route path="/relatorios" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<Relatorios />} />
      </Route>

      <Route path="/helpdesk" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<Helpdesk />} />
      </Route>

      <Route path="/servicos" element={<DemoAppLayout userType="advogado" />}>
        <Route index element={<Servicos />} />
      </Route>

      {/* Portal do Cliente */}
      <Route path="/portal/chat" element={<DemoAppLayout userType="cliente" />}>
        <Route index element={<PortalChat />} />
      </Route>

      <Route path="/portal/jornada" element={<DemoAppLayout userType="cliente" />}>
        <Route index element={<PortalJornada />} />
      </Route>

      <Route path="/portal/processos" element={<DemoAppLayout userType="cliente" />}>
        <Route index element={<PortalProcessos />} />
      </Route>

      <Route path="/portal/compromissos" element={<DemoAppLayout userType="cliente" />}>
        <Route index element={<PortalCompromissos />} />
      </Route>

      <Route path="/portal/financeiro" element={<DemoAppLayout userType="cliente" />}>
        <Route index element={<PortalFinanceiro />} />
      </Route>

      <Route path="/portal/helpdesk" element={<DemoAppLayout userType="cliente" />}>
        <Route index element={<PortalHelpdesk />} />
      </Route>

      <Route path="/portal/servicos" element={<DemoAppLayout userType="cliente" />}>
        <Route index element={<PortalServicos />} />
      </Route>

      <Route path="/portal/cliente/:instanceId" element={<DemoAppLayout userType="cliente" />}>
        <Route index element={<PortalCliente />} />
      </Route>

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
      
      {/* Same structure as demo routes but with RegularAppLayout */}
      <Route path="/" element={<RegularAppLayout userType="advogado" />}>
        <Route index element={<Dashboard />} />
      </Route>

      <Route path="/processos" element={<RegularAppLayout userType="advogado" />}>
        <Route index element={<Processos />} />
      </Route>

      <Route path="/clientes" element={<RegularAppLayout userType="advogado" />}>
        <Route index element={<Clientes />} />
      </Route>

      {/* Add other routes... */}

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
