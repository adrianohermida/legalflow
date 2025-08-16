import "./global.css";
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";

// Safe import wrapper
async function safeImport(path: string) {
  try {
    return await import(path);
  } catch (error) {
    console.error(`Failed to import ${path}:`, error);
    return null;
  }
}

// Fallback components for failed imports
const FallbackPage = ({ name }: { name: string }) => (
  <div
    style={{
      padding: "40px",
      textAlign: "center",
      background: "white",
      borderRadius: "10px",
      margin: "20px",
    }}
  >
    <h2>⚠️ Página em Carregamento</h2>
    <p>
      A página <strong>{name}</strong> está sendo carregada...
    </p>
    <p style={{ color: "#666", fontSize: "14px" }}>
      Se este problema persistir, verifique o console para mais detalhes.
    </p>
  </div>
);

function SafeApp() {
  const [loadedComponents, setLoadedComponents] = useState<Record<string, any>>(
    {},
  );
  const [isLoading, setIsLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000,
      },
    },
  });

  useEffect(() => {
    const loadComponents = async () => {
      console.log("🚀 Starting safe component loading...");

      // Load core components first
      const coreImports = [
        { key: "AppShell", path: "./components/AppShell" },
        { key: "AuthContext", path: "./contexts/AuthContext" },
        { key: "DemoAuthContext", path: "./contexts/DemoAuthContext" },
      ];

      const pageImports = [
        { key: "Dashboard", path: "./pages/Dashboard" },
        { key: "DashboardV2", path: "./pages/DashboardV2" },
        { key: "Processos", path: "./pages/Processos" },
        { key: "ProcessosV2", path: "./pages/ProcessosV2" },
        { key: "Clientes", path: "./pages/Clientes" },
        { key: "Jornadas", path: "./pages/Jornadas" },
        { key: "InboxLegal", path: "./pages/InboxLegal" },
        { key: "Agenda", path: "./pages/Agenda" },
        { key: "Financeiro", path: "./pages/Financeiro" },
        { key: "Relatorios", path: "./pages/Relatorios" },
        { key: "Documentos", path: "./pages/Documentos" },
      ];

      const loaded: Record<string, any> = {};
      const errors: string[] = [];

      // Load core components
      for (const { key, path } of coreImports) {
        const module = await safeImport(path);
        if (module) {
          loaded[key] = module;
          console.log(`✅ Loaded ${key}`);
        } else {
          errors.push(`Failed to load ${key}`);
        }
      }

      // Load pages
      for (const { key, path } of pageImports) {
        const module = await safeImport(path);
        if (module) {
          loaded[key] = module;
          console.log(`✅ Loaded ${key}`);
        } else {
          errors.push(`Failed to load ${key}`);
        }
      }

      setLoadedComponents(loaded);
      setLoadErrors(errors);
      setIsLoading(false);

      console.log(
        `🎉 Safe loading complete. Loaded: ${Object.keys(loaded).length}, Errors: ${errors.length}`,
      );
    };

    loadComponents();
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "system-ui",
        }}
      >
        <div
          style={{
            background: "white",
            color: "#333",
            padding: "40px",
            borderRadius: "20px",
            textAlign: "center",
            maxWidth: "500px",
          }}
        >
          <h1 style={{ color: "#667eea", marginBottom: "20px" }}>
            ⚡ LegalFlow
          </h1>
          <div
            style={{
              background: "#f0f9ff",
              padding: "20px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            <h3>🔄 Carregando Sistema Completo...</h3>
            <p style={{ margin: "10px 0", color: "#666" }}>
              Inicializando todas as funcionalidades do LegalFlow
            </p>
          </div>
          <div style={{ fontSize: "14px", color: "#888" }}>
            Software Jurídico Inteligente
          </div>
        </div>
      </div>
    );
  }

  // Get loaded components with fallbacks
  const Dashboard =
    loadedComponents.Dashboard?.Dashboard ||
    (() => <FallbackPage name="Dashboard" />);
  const DashboardV2 =
    loadedComponents.DashboardV2?.DashboardV2 ||
    (() => <FallbackPage name="Dashboard V2" />);
  const Processos =
    loadedComponents.Processos?.Processos ||
    (() => <FallbackPage name="Processos" />);
  const Clientes =
    loadedComponents.Clientes?.Clientes ||
    (() => <FallbackPage name="Clientes" />);

  const AppShell =
    loadedComponents.AppShell?.AppShell ||
    (({ children }: { children: React.ReactNode }) => (
      <div style={{ padding: "20px" }}>
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            background: "#fff3cd",
            borderRadius: "5px",
          }}
        >
          ⚠️ AppShell não carregado - usando layout simples
        </div>
        {children}
      </div>
    ));

  const AuthProvider =
    loadedComponents.AuthContext?.AuthProvider ||
    (({ children }: { children: React.ReactNode }) => children);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppShell>
              <Routes>
                <Route
                  path="/"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/dashboard-v2" element={<DashboardV2 />} />
                <Route path="/processos" element={<Processos />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route
                  path="*"
                  element={
                    <div style={{ padding: "40px", textAlign: "center" }}>
                      <h2>✅ LegalFlow Safe Mode</h2>
                      <p>
                        Sistema carregado com{" "}
                        {Object.keys(loadedComponents).length} componentes
                      </p>
                      {loadErrors.length > 0 && (
                        <div
                          style={{
                            marginTop: "20px",
                            padding: "15px",
                            background: "#ffe6e6",
                            borderRadius: "5px",
                          }}
                        >
                          <strong>Avisos de carregamento:</strong>
                          <ul style={{ textAlign: "left", marginTop: "10px" }}>
                            {loadErrors.map((error, i) => (
                              <li key={i} style={{ color: "#d32f2f" }}>
                                {error}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  }
                />
              </Routes>
            </AppShell>
          </BrowserRouter>
          <Toaster />
          <Sonner />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Initialize React app with error handling
const container = document.getElementById("root");
if (container) {
  console.log("🚀 Initializing Safe LegalFlow App...");

  try {
    const root = createRoot(container);
    root.render(<SafeApp />);
    console.log("✅ Safe LegalFlow App initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Safe App:", error);

    // Fallback to basic HTML
    container.innerHTML = `
      <div style="padding: 40px; font-family: system-ui; text-align: center;">
        <h1 style="color: #d32f2f;">❌ Erro de Inicialização</h1>
        <p>Não foi possível carregar o aplicativo LegalFlow.</p>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: left; overflow: auto;">
${error}
        </pre>
        <p><a href="/debug-app-loading.html">📝 Ver diagnóstico detalhado</a></p>
      </div>
    `;
  }
} else {
  console.error("❌ Root container not found in DOM");
}
