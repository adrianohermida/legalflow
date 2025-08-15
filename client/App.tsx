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

// Initialize development data only when Supabase is configured
if (supabaseConfigured) {
  // dev-setup.ts handles its own initialization
  // Just import admin-setup for admin user creation
  import("./lib/admin-setup").catch((error) => {
    console.log("Admin setup skipped:", error.message || error);
  });
}

// Import all page components
import { Dashboard } from "./pages/Dashboard";
import { DashboardV2 } from "./pages/DashboardV2";
import { Processos } from "./pages/Processos";
import ProcessosV2 from "./pages/ProcessosV2";
import { ProcessoOverview } from "./pages/ProcessoOverview";
import { ProcessoDetail } from "./pages/ProcessoDetail";
import ProcessoDetailV2 from "./pages/ProcessoDetailV2";
import ProcessoOverviewV3 from "./pages/ProcessoOverviewV3";
import { Clientes } from "./pages/Clientes";
import Jornadas from "./pages/Jornadas";
import JourneyDesignerPage from "./pages/JourneyDesigner";
import { NovaJornada } from "./pages/NovaJornada";
import { IniciarJornada } from "./pages/IniciarJornada";
import { InboxLegal } from "./pages/InboxLegal";
import InboxLegalV2 from "./pages/InboxLegalV2";
import InboxLegalSF4 from "./pages/InboxLegalSF4";
import InboxLegalC4 from "./pages/InboxLegalC4";
import { Agenda } from "./pages/Agenda";
import AgendaC5 from "./pages/AgendaC5";
import { Financeiro } from "./pages/Financeiro";
import Relatorios from "./pages/Relatorios";
import { Helpdesk } from "./pages/Helpdesk";
import { Servicos } from "./pages/Servicos";
import { Tickets } from "./pages/Tickets";
import { PlanosPagamento } from "./pages/PlanosPagamento";
import QAConsole from "./pages/QAConsole";
import StatusDashboard from "./pages/StatusDashboard";
import FeatureFlags from "./pages/FeatureFlags";
import DevTools from "./pages/DevTools";
import AdminIntegrity from "./pages/AdminIntegrity";
import DevAuditoria from "./pages/DevAuditoria";
import Documentos from "./pages/Documentos";
import DocumentosC6 from "./pages/DocumentosC6";
import TicketsC7 from "./pages/TicketsC7";
import ActivitiesC8 from "./pages/ActivitiesC8";
import DealsC9 from "./pages/DealsC9";
import JourneysD1 from "./pages/JourneysD1";
import JourneyDesignerD2 from "./pages/JourneyDesignerD2";
import AuditLog from "./pages/AuditLog";
import Examples from "./pages/Examples";
import ContatosUnificados from "./pages/crm/ContatosUnificados";
import LeadsConversao from "./pages/crm/LeadsConversao";
import DealsKanban from "./pages/crm/DealsKanban";
import ContatoPerfil360 from "./pages/crm/ContatoPerfil360";
import RelatoriosCRM from "./pages/crm/RelatoriosCRM";
import LaunchPlan from "./pages/LaunchPlan";

// CRM pages
import CRMContatos from "./pages/crm/Contatos";
import CRMLeads from "./pages/crm/Leads";
import CRMDeals from "./pages/crm/Deals";
import ContactProfile from "./pages/crm/ContactProfile";
import CRMReports from "./pages/crm/Reports";

// Stripe integration pages
import StripeSettings from "./pages/StripeSettings";
import StripeCenter from "./pages/StripeCenter";

// Portal do Cliente pages
import { PortalChat } from "./pages/portal/PortalChat";
import { PortalJornada } from "./pages/portal/PortalJornada";
import { PortalProcessos } from "./pages/portal/PortalProcessos";
import { PortalCompromissos } from "./pages/portal/PortalCompromissos";
import { PortalFinanceiro } from "./pages/portal/PortalFinanceiro";
import { PortalHelpdesk } from "./pages/portal/PortalHelpdesk";
import { PortalServicos } from "./pages/portal/PortalServicos";
import { PortalCliente } from "./pages/portal/PortalCliente";

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

  // Allow direct access to dev pages for debugging
  const currentPath = window.location.pathname;
  const isDevPage =
    currentPath.includes("dev-auditoria") ||
    currentPath.includes("dev/auditoria");

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

  // For dev pages without user, create a mock user
  const effectiveUser =
    user ||
    (isDevPage
      ? {
          id: "debug-user",
          email: "debug@test.com",
          name: "Debug User",
          oab: "123456",
        }
      : null);

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
              <DashboardV2 />
            </DemoProtectedRoute>
          }
        />
        {/* Consolidated process routes */}
        <Route
          path="/processos"
          element={
            <DemoProtectedRoute userType="advogado">
              <ProcessosV2 />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/processos/:numero_cnj"
          element={
            <DemoProtectedRoute userType="advogado">
              <ProcessoDetailV2 />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/processos/:numero_cnj/overview"
          element={
            <DemoProtectedRoute userType="advogado">
              <ProcessoOverviewV3 />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/processos/new"
          element={
            <DemoProtectedRoute userType="advogado">
              <ProcessoDetailV2 />
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
        {/* Consolidated journey routes */}
        <Route
          path="/jornadas"
          element={
            <DemoProtectedRoute userType="advogado">
              <JourneysD1 />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/jornadas/designer/:templateId?"
          element={
            <DemoProtectedRoute userType="advogado">
              <JourneyDesignerD2 />
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
        {/* Consolidated inbox routes */}
        <Route
          path="/inbox"
          element={
            <DemoProtectedRoute userType="advogado">
              <InboxLegalC4 />
            </DemoProtectedRoute>
          }
        />
        {/* Consolidated agenda routes */}
        <Route
          path="/agenda"
          element={
            <DemoProtectedRoute userType="advogado">
              <AgendaC5 />
            </DemoProtectedRoute>
          }
        />
        {/* Consolidated document routes */}
        <Route
          path="/documentos"
          element={
            <DemoProtectedRoute userType="advogado">
              <DocumentosC6 />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <DemoProtectedRoute userType="advogado">
              <TicketsC7 />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <DemoProtectedRoute userType="advogado">
              <ActivitiesC8 />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/deals"
          element={
            <DemoProtectedRoute userType="advogado">
              <DealsC9 />
            </DemoProtectedRoute>
          }
        />
        {/* Admin and development routes */}
        <Route
          path="/dev/audit-log"
          element={
            <DemoProtectedRoute userType="advogado">
              <AuditLog />
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
        <Route
          path="/qa"
          element={
            <DemoProtectedRoute userType="advogado">
              <QAConsole />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/status"
          element={
            <DemoProtectedRoute userType="advogado">
              <StatusDashboard />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/config/flags"
          element={
            <DemoProtectedRoute userType="advogado">
              <FeatureFlags />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/dev/tools"
          element={
            <DemoProtectedRoute userType="advogado">
              <DevTools />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/dev/auditoria"
          element={
            <DemoProtectedRoute userType="advogado">
              <DevAuditoria />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/dev-auditoria"
          element={
            <DemoProtectedRoute userType="advogado">
              <DevAuditoria />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/admin/integrity"
          element={
            <DemoProtectedRoute userType="advogado">
              <AdminIntegrity />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/launch"
          element={
            <DemoProtectedRoute userType="advogado">
              <LaunchPlan />
            </DemoProtectedRoute>
          }
        />

        {/* CRM Routes */}
        <Route
          path="/crm/contatos"
          element={
            <DemoProtectedRoute userType="advogado">
              <ContatosUnificados />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/crm/contatos/:id"
          element={
            <DemoProtectedRoute userType="advogado">
              <ContatoPerfil360 />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/crm/leads"
          element={
            <DemoProtectedRoute userType="advogado">
              <LeadsConversao />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/crm/deals"
          element={
            <DemoProtectedRoute userType="advogado">
              <DealsKanban />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/crm/relatorios"
          element={
            <DemoProtectedRoute userType="advogado">
              <RelatoriosCRM />
            </DemoProtectedRoute>
          }
        />

        {/* Stripe Integration */}
        <Route
          path="/settings/stripe"
          element={
            <DemoProtectedRoute userType="advogado">
              <StripeSettings />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/financeiro/stripe"
          element={
            <DemoProtectedRoute userType="advogado">
              <StripeCenter />
            </DemoProtectedRoute>
          }
        />

        {/* Portal do Cliente */}
        <Route
          path="/portal/chat"
          element={
            <DemoProtectedRoute userType="cliente">
              <PortalChat />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/portal/jornada"
          element={
            <DemoProtectedRoute userType="cliente">
              <PortalJornada />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/portal/processos"
          element={
            <DemoProtectedRoute userType="cliente">
              <PortalProcessos />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/portal/compromissos"
          element={
            <DemoProtectedRoute userType="cliente">
              <PortalCompromissos />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/portal/financeiro"
          element={
            <DemoProtectedRoute userType="cliente">
              <PortalFinanceiro />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/portal/helpdesk"
          element={
            <DemoProtectedRoute userType="cliente">
              <PortalHelpdesk />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/portal/servicos"
          element={
            <DemoProtectedRoute userType="cliente">
              <PortalServicos />
            </DemoProtectedRoute>
          }
        />
        <Route
          path="/portal/cliente/:instanceId"
          element={
            <DemoProtectedRoute userType="cliente">
              <PortalCliente />
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
          path="/inbox-v2"
          element={
            <ProtectedRoute userType="advogado">
              <InboxLegalV2 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inbox-sf4"
          element={
            <ProtectedRoute userType="advogado">
              <InboxLegalSF4 />
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
          path="/documentos-c6"
          element={
            <ProtectedRoute userType="advogado">
              <DocumentosC6 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute userType="advogado">
              <TicketsC7 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activities"
          element={
            <ProtectedRoute userType="advogado">
              <ActivitiesC8 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deals"
          element={
            <ProtectedRoute userType="advogado">
              <DealsC9 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/jornadas-d1"
          element={
            <ProtectedRoute userType="advogado">
              <JourneysD1 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/journey-designer"
          element={
            <ProtectedRoute userType="advogado">
              <JourneyDesignerD2 />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit-log"
          element={
            <ProtectedRoute userType="advogado">
              <AuditLog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/examples"
          element={
            <ProtectedRoute userType="advogado">
              <Examples />
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
        <Route
          path="/tickets"
          element={
            <ProtectedRoute userType="advogado">
              <Tickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/branding"
          element={
            <ProtectedRoute userType="advogado">
              <AdminBrandingConfig />
            </ProtectedRoute>
          }
        />
        <Route
          path="/qa"
          element={
            <ProtectedRoute userType="advogado">
              <QAConsole />
            </ProtectedRoute>
          }
        />
        <Route
          path="/status"
          element={
            <ProtectedRoute userType="advogado">
              <StatusDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/config/flags"
          element={
            <ProtectedRoute userType="advogado">
              <FeatureFlags />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dev/tools"
          element={
            <ProtectedRoute userType="advogado">
              <DevTools />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dev/auditoria"
          element={
            <ProtectedRoute userType="advogado">
              <DevAuditoria />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dev-auditoria"
          element={
            <ProtectedRoute userType="advogado">
              <DevAuditoria />
            </ProtectedRoute>
          }
        />
        <Route
          path="/launch"
          element={
            <ProtectedRoute userType="advogado">
              <LaunchPlan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/autofix-testing"
          element={
            <ProtectedRoute userType="advogado">
              <DevAuditoria />
            </ProtectedRoute>
          }
        />
        <Route
          path="/examples"
          element={
            <ProtectedRoute userType="advogado">
              <Examples />
            </ProtectedRoute>
          }
        />

        {/* CRM Routes */}
        <Route
          path="/crm/contatos"
          element={
            <ProtectedRoute userType="advogado">
              <ContatosUnificados />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/contatos/:id"
          element={
            <ProtectedRoute userType="advogado">
              <ContactProfile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/leads"
          element={
            <ProtectedRoute userType="advogado">
              <CRMLeads />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/deals"
          element={
            <ProtectedRoute userType="advogado">
              <CRMDeals />
            </ProtectedRoute>
          }
        />
        <Route
          path="/crm/relatorios"
          element={
            <ProtectedRoute userType="advogado">
              <CRMReports />
            </ProtectedRoute>
          }
        />

        {/* Stripe Integration */}
        <Route
          path="/settings/stripe"
          element={
            <ProtectedRoute userType="advogado">
              <StripeSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/financeiro/stripe"
          element={
            <ProtectedRoute userType="advogado">
              <StripeCenter />
            </ProtectedRoute>
          }
        />

        {/* Portal do Cliente */}
        <Route
          path="/portal/chat"
          element={
            <ProtectedRoute userType="cliente">
              <PortalChat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/jornada"
          element={
            <ProtectedRoute userType="cliente">
              <PortalJornada />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/processos"
          element={
            <ProtectedRoute userType="cliente">
              <PortalProcessos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/compromissos"
          element={
            <ProtectedRoute userType="cliente">
              <PortalCompromissos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/financeiro"
          element={
            <ProtectedRoute userType="cliente">
              <PortalFinanceiro />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/helpdesk"
          element={
            <ProtectedRoute userType="cliente">
              <PortalHelpdesk />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/servicos"
          element={
            <ProtectedRoute userType="cliente">
              <PortalServicos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/portal/cliente/:instanceId"
          element={
            <ProtectedRoute userType="cliente">
              <PortalCliente />
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
    validateSchemaOnStartup().catch((error) => {
      console.error("Schema validation failed on startup:", error);
    });

    // Run enum consistency check
    runEnumConsistencyCheck();
  }, []);

  const [authMode, setAuthMode] = useState<"demo" | "supabase" | null>(() => {
    try {
      const currentPath = window.location.pathname;
      // Auto-set demo mode for dev pages to enable debugging
      if (
        currentPath.includes("dev-auditoria") ||
        currentPath.includes("dev/auditoria")
      ) {
        localStorage.setItem("auth-mode", "demo");
        return "demo";
      }
      return localStorage.getItem("auth-mode") as "demo" | "supabase" | null;
    } catch (error) {
      console.warn("Failed to read localStorage:", error);
      return null;
    }
  });

  // Show mode selector if no mode is selected, but allow direct access to dev-auditoria in demo mode
  if (!authMode) {
    const currentPath = window.location.pathname;
    if (
      currentPath.includes("dev-auditoria") ||
      currentPath.includes("dev/auditoria")
    ) {
      // Force demo mode for dev-auditoria access
      setAuthMode("demo");
    } else {
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const container = document.getElementById("root");
if (container) {
  // Check if root already exists to prevent React warning
  if (!container._reactRoot) {
    const root = createRoot(container);
    container._reactRoot = root;
    root.render(
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>,
    );
  } else {
    // Re-render on existing root
    container._reactRoot.render(
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>,
    );
  }
}
