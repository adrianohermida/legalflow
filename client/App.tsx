import "./global.css";
import { Toaster } from "./components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DemoAuthProvider, useDemoAuth } from "./contexts/DemoAuthContext";
import { AppShell } from "./components/AppShell";
import { DemoLoginPage } from "./pages/DemoLoginPage";
import { SupabaseLoginPage } from "./pages/SupabaseLoginPage";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import Setup from "./pages/Setup";
import { QuickSetup } from "./pages/QuickSetup";
import { ModeSelector } from "./pages/ModeSelector";
import { supabaseConfigured } from "./lib/supabase";
import { useState, useEffect } from "react";
import {
  AppErrorBoundary,
  PageErrorBoundary,
} from "./components/ErrorBoundary";
import { useNeutralTheme } from "./hooks/useNeutralTheme";
import { validateSchemaOnStartup } from "./lib/schema-validator";
import { runEnumConsistencyCheck } from "./lib/enum-validator";
import BuilderDebugger from "./components/BuilderDebugger";

// Import Builder.io fix to ensure all components are available
import "./lib/builder-fix";

// Initialize development data only when Supabase is configured
if (supabaseConfigured) {
  // dev-setup.ts handles its own initialization
  // Just import admin-setup for admin user creation
  import("./lib/admin-setup").catch((error) => {
    console.log("Admin setup skipped:", error.message || error);
  });
}

// Import core page components (Sistema Original)
import { Dashboard } from "./pages/Dashboard";
import { Processos } from "./pages/Processos";
import { ProcessoOverview } from "./pages/ProcessoOverview";
import { ProcessoDetail } from "./pages/ProcessoDetail";
import { Clientes } from "./pages/Clientes";
import Jornadas from "./pages/Jornadas";
import JourneyDesignerPage from "./pages/JourneyDesigner";
import { NovaJornada } from "./pages/NovaJornada";
import { IniciarJornada } from "./pages/IniciarJornada";
import { InboxLegal } from "./pages/InboxLegal";
import { Agenda } from "./pages/Agenda";
import { Financeiro } from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import { Helpdesk } from "./pages/Helpdesk";
import { Servicos } from "./pages/Servicos";
import { Tickets } from "./pages/Tickets";
import { PlanosPagamento } from "./pages/PlanosPagamento";
import Documentos from "./pages/Documentos";
import Deals from "./pages/Deals";

import { SupabaseSetup } from "./components/SupabaseSetup";
import { UnifiedOABSelectionModal } from "./components/UnifiedOABSelectionModal";
import { AdminBrandingConfig } from "./components/AdminBrandingConfig";
import { RedirectHandler } from "./components/RedirectHandler";
import { ROUTES } from "./lib/routes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function DemoProtectedRoute({
  children,
  userType,
}: {
  children: React.ReactNode;
  userType: "advogado" | "cliente";
}) {
  const { user, isLoading, logout } = useDemoAuth();
  const [showOABModal, setShowOABModal] = useState(false);

  // No dev pages available
  const isDevPage = false;

  useEffect(() => {
    if (user && !user.oab && userType === "advogado") {
      setShowOABModal(true);
    }
  }, [user, userType]);

  if (isLoading && !isDevPage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-neutral-600">Carregando Demo...</p>
        </div>
      </div>
    );
  }

  // Use authenticated user
  const effectiveUser = user;

  if (!effectiveUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <AppShell userType={userType} user={effectiveUser} logout={logout}>
        {children}
      </AppShell>
      {userType === "advogado" && effectiveUser?.oab && (
        <UnifiedOABSelectionModal
          open={showOABModal}
          onOpenChange={setShowOABModal}
          mode="demo"
        />
      )}
    </>
  );
}

function ProtectedRoute({
  children,
  userType,
}: {
  children: React.ReactNode;
  userType: "advogado" | "cliente";
}) {
  const { user, isLoading, logout } = useAuth();
  const [showOABModal, setShowOABModal] = useState(false);

  useEffect(() => {
    if (user && !user.oab && userType === "advogado") {
      setShowOABModal(true);
    }
  }, [user, userType]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
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
      {userType === "advogado" && (
        <UnifiedOABSelectionModal
          open={showOABModal}
          onOpenChange={setShowOABModal}
          mode="production"
        />
      )}
    </>
  );
}

function DemoAppRoutes() {
  const { user } = useDemoAuth();

  return (
    <>
      <RedirectHandler />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <DemoLoginPage />}
        />
        <Route
          path="/forgot-password"
          element={user ? <Navigate to="/" replace /> : <ForgotPassword />}
        />
        <Route
          path="/reset-password"
          element={user ? <Navigate to="/" replace /> : <ResetPassword />}
        />

        {/* Escritório - Área do Advogado */}
        <Route
          path="/"
          element={
            <DemoProtectedRoute userType="advogado">
              <Dashboard />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <DemoProtectedRoute userType="advogado">
              <Dashboard />
            </DemoProtectedRoute>
          }
        />
        {/* Process routes - Original */}
        <Route
          path="/processos"
          element={
            <DemoProtectedRoute userType="advogado">
              <Processos />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/processos/:numero_cnj"
          element={
            <DemoProtectedRoute userType="advogado">
              <ProcessoDetail />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/processos/:numero_cnj/overview"
          element={
            <DemoProtectedRoute userType="advogado">
              <ProcessoOverview />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/processos/new"
          element={
            <DemoProtectedRoute userType="advogado">
              <ProcessoDetail />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <DemoProtectedRoute userType="advogado">
              <Clientes />
            </DemoProtectedRoute>
          }
        />
        {/* Journey routes - Original */}
        <Route
          path="/jornadas"
          element={
            <DemoProtectedRoute userType="advogado">
              <Jornadas />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/jornadas/designer/:templateId?"
          element={
            <DemoProtectedRoute userType="advogado">
              <JourneyDesignerPage />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/jornadas/new"
          element={
            <DemoProtectedRoute userType="advogado">
              <NovaJornada />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/jornadas/start"
          element={
            <DemoProtectedRoute userType="advogado">
              <IniciarJornada />
            </DemoProtectedRoute>
          }
        />
        {/* Inbox routes - Original */}
        <Route
          path="/inbox"
          element={
            <DemoProtectedRoute userType="advogado">
              <InboxLegal />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/InboxLegal"
          element={
            <DemoProtectedRoute userType="advogado">
              <InboxLegal />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/inbox-legal"
          element={
            <DemoProtectedRoute userType="advogado">
              <InboxLegal />
            </DemoProtectedRoute>
          }
        />
        {/* Agenda routes - Original */}
        <Route
          path="/agenda"
          element={
            <DemoProtectedRoute userType="advogado">
              <Agenda />
            </DemoProtectedRoute>
          }
        />
        {/* Document routes - Original */}
        <Route
          path="/documentos"
          element={
            <DemoProtectedRoute userType="advogado">
              <Documentos />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <DemoProtectedRoute userType="advogado">
              <Tickets />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/deals"
          element={
            <DemoProtectedRoute userType="advogado">
              <Deals />
            </DemoProtectedRoute>
          }
        />
        {/* Financial routes */}
        <Route
          path="/financeiro"
          element={
            <DemoProtectedRoute userType="advogado">
              <Financeiro />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/financeiro/planos"
          element={
            <DemoProtectedRoute userType="advogado">
              <PlanosPagamento />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/relatorios"
          element={
            <DemoProtectedRoute userType="advogado">
              <Relatorios />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/helpdesk"
          element={
            <DemoProtectedRoute userType="advogado">
              <Helpdesk />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/servicos"
          element={
            <DemoProtectedRoute userType="advogado">
              <Servicos />
            </DemoProtectedRoute>
          }
        />

        <Route
          path="/tickets"
          element={
            <DemoProtectedRoute userType="advogado">
              <Tickets />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/branding"
          element={
            <DemoProtectedRoute userType="advogado">
              <AdminBrandingConfig />
            </DemoProtectedRoute>
          }
        />


        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function RegularAppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <RedirectHandler />
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" replace /> : <SupabaseLoginPage />}
        />
        <Route
          path="/forgot-password"
          element={user ? <Navigate to="/" replace /> : <ForgotPassword />}
        />
        <Route
          path="/reset-password"
          element={user ? <Navigate to="/" replace /> : <ResetPassword />}
        />
        <Route
          path="/setup"
          element={
            !supabaseConfigured ? <Setup /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/quick-setup"
          element={
            supabaseConfigured ? (
              <QuickSetup onComplete={() => {}} />
            ) : (
              <Navigate to="/setup" replace />
            )
          }
        />

        {/* Same routes as demo but with regular auth */}
        <Route
          path="/"
          element={
            <ProtectedRoute userType="advogado">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute userType="advogado">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/processos"
          element={
            <ProtectedRoute userType="advogado">
              <Processos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/processos/:cnj"
          element={
            <ProtectedRoute userType="advogado">
              <ProcessoOverview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <ProtectedRoute userType="advogado">
              <Clientes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jornadas"
          element={
            <ProtectedRoute userType="advogado">
              <Jornadas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jornadas/nova"
          element={
            <ProtectedRoute userType="advogado">
              <NovaJornada />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jornadas/iniciar"
          element={
            <ProtectedRoute userType="advogado">
              <IniciarJornada />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbox"
          element={
            <ProtectedRoute userType="advogado">
              <InboxLegal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/InboxLegal"
          element={
            <ProtectedRoute userType="advogado">
              <InboxLegal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbox-legal"
          element={
            <ProtectedRoute userType="advogado">
              <InboxLegal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/agenda"
          element={
            <ProtectedRoute userType="advogado">
              <Agenda />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro"
          element={
            <ProtectedRoute userType="advogado">
              <Financeiro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/planos-pagamento"
          element={
            <ProtectedRoute userType="advogado">
              <PlanosPagamento />
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatorios"
          element={
            <ProtectedRoute userType="advogado">
              <Relatorios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/helpdesk"
          element={
            <ProtectedRoute userType="advogado">
              <Helpdesk />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documentos"
          element={
            <ProtectedRoute userType="advogado">
              <Documentos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute userType="advogado">
              <Tickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deals"
          element={
            <ProtectedRoute userType="advogado">
              <Deals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/servicos"
          element={
            <ProtectedRoute userType="advogado">
              <Servicos />
            </ProtectedRoute>
          }
        />


        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

export default function App() {
  // Initialize neutral theme immediately
  const neutralTheme = useNeutralTheme();

  // Run schema validation on app startup
  useEffect(() => {
    // Mark React as loaded for Builder.io
    const rootElement = document.getElementById('root');
    if (rootElement) {
      rootElement.setAttribute('data-react-loaded', 'true');
      rootElement.setAttribute('data-app-status', 'loaded');
    }

    // Builder.io debug logging
    console.log('✅ LegalFlow React App loaded successfully');
    console.log('🌐 Environment:', window.location.hostname.includes('builder.codes') ? 'Builder.io' : 'Development');

    validateSchemaOnStartup().catch((error) => {
      console.error("Schema validation failed on startup:", error);
    });

    // Run enum consistency check
    runEnumConsistencyCheck();
  }, []);

  const [authMode, setAuthMode] = useState<"demo" | "supabase" | null>(() => {
    try {
      // If Supabase is not configured, force demo mode
      if (!supabaseConfigured) {
        console.log("🔧 Supabase not configured, forcing demo mode");
        localStorage.setItem("auth-mode", "demo");
        return "demo";
      }

      const currentPath = window.location.pathname;

      // Force demo mode for dashboard access or any page without auth mode
      if (currentPath === "/" || currentPath === "/dashboard" || currentPath.includes("404")) {
        const savedMode = localStorage.getItem("auth-mode");
        if (!savedMode) {
          console.log("🚀 No auth mode set, defaulting to demo for quick access");
          localStorage.setItem("auth-mode", "demo");
          return "demo";
        }
        return savedMode as "demo" | "supabase";
      }


      return localStorage.getItem("auth-mode") as "demo" | "supabase" | null;
    } catch (error) {
      console.warn("Failed to read localStorage:", error);
      // Fallback to demo mode on error
      return "demo";
    }
  });

  // Show mode selector if no mode is selected
  if (!authMode) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <BrowserRouter>
            <ModeSelector
              onModeSelect={(mode) => {
                try {
                  localStorage.setItem("auth-mode", mode);
                  setAuthMode(mode);
                } catch (error) {
                  console.error("Failed to set auth mode:", error);
                }
              }}
            />
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  const AppContent =
    authMode === "demo" ? (
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
        <BrowserRouter>{AppContent}</BrowserRouter>
        <Toaster />
        <Sonner />
        {/* Builder.io Debug Component - only in development */}
        {import.meta.env.DEV && <BuilderDebugger />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Initialize React app properly
const container = document.getElementById("root");
if (container) {
  console.log('🚀 Initializing LegalFlow React App...');
  
  if (!(container as any)._reactRoot) {
    const root = createRoot(container);
    (container as any)._reactRoot = root;

    // Render the main app with error boundary
    root.render(
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    );
    
    console.log('✅ LegalFlow React App initialized successfully');
  }
}
