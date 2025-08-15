import "./global.css";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "./components/ui/tooltip";

// Simple dashboard component
function SimpleDashboard() {
  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "Arial, sans-serif",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "20px",
          maxWidth: "800px",
          margin: "0 auto",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h1
          style={{
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: "2.5rem",
            fontWeight: "700",
            marginBottom: "1rem",
            textAlign: "center" as const,
          }}
        >
          ✅ LegalFlow React
        </h1>

        <div
          style={{
            background: "#f0f9ff",
            padding: "20px",
            borderRadius: "10px",
            marginBottom: "20px",
            textAlign: "center" as const,
          }}
        >
          <h2 style={{ color: "#0369a1", margin: "0 0 10px 0" }}>
            🎉 React App Funcionando!
          </h2>
          <p style={{ color: "#0c4a6e", margin: 0 }}>
            A aplicação React foi carregada com sucesso no Builder.io
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "15px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              background: "#d4edda",
              padding: "15px",
              borderRadius: "8px",
              textAlign: "center" as const,
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#155724" }}>
              📊 Dashboard
            </h3>
            <p style={{ margin: 0, color: "#155724" }}>Sistema principal</p>
          </div>

          <div
            style={{
              background: "#cce5ff",
              padding: "15px",
              borderRadius: "8px",
              textAlign: "center" as const,
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#0066cc" }}>
              ⚖️ Processos
            </h3>
            <p style={{ margin: 0, color: "#0066cc" }}>Gestão jurídica</p>
          </div>

          <div
            style={{
              background: "#ffe6cc",
              padding: "15px",
              borderRadius: "8px",
              textAlign: "center" as const,
            }}
          >
            <h3 style={{ margin: "0 0 10px 0", color: "#cc6600" }}>
              👥 Clientes
            </h3>
            <p style={{ margin: 0, color: "#cc6600" }}>CRM integrado</p>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            flexWrap: "wrap" as const,
          }}
        >
          <button
            onClick={() => (window.location.href = "/test")}
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            🔧 Teste Servidor
          </button>
          <button
            onClick={() => (window.location.href = "/basic")}
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            📄 Página Básica
          </button>
          <button
            onClick={() => (window.location.href = "/api/health")}
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            🔍 API Status
          </button>
        </div>

        <div
          style={{
            marginTop: "20px",
            padding: "15px",
            background: "#f9fafb",
            borderRadius: "8px",
            fontSize: "0.9rem",
            color: "#6b7280",
          }}
        >
          <strong>Informações técnicas:</strong>
          <br />
          ✅ React: Funcionando
          <br />
          ✅ React Router: Funcionando
          <br />
          ✅ Vite HMR: Funcionando
          <br />
          ✅ CSS Global: Carregado
          <br />⏰ Carregado em: {new Date().toISOString()}
        </div>
      </div>
    </div>
  );
}

// Simple error boundary
class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "20px",
            textAlign: "center" as const,
            fontFamily: "Arial, sans-serif",
            background: "#fee",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "30px",
              borderRadius: "10px",
              border: "2px solid #dc2626",
            }}
          >
            <h1 style={{ color: "#dc2626" }}>❌ Erro no React</h1>
            <p>Algo deu errado: {this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#dc2626",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              🔄 Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function MinimalApp() {
  const [mode, setMode] = useState<"demo" | "supabase">("demo");

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SimpleDashboard />} />
            <Route
              path="*"
              element={
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center" as const,
                    fontFamily: "Arial, sans-serif",
                  }}
                >
                  <h1>404 - Página não encontrada</h1>
                  <button
                    onClick={() => (window.location.href = "/")}
                    style={{
                      background: "#3b82f6",
                      color: "white",
                      border: "none",
                      padding: "10px 20px",
                      borderRadius: "5px",
                      cursor: "pointer",
                    }}
                  >
                    🏠 Voltar ao início
                  </button>
                </div>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Safe initialization
const container = document.getElementById("root");
if (container) {
  try {
    console.log("🚀 Initializing Minimal React App...");
    const root = createRoot(container);
    root.render(
      <SimpleErrorBoundary>
        <MinimalApp />
      </SimpleErrorBoundary>,
    );
    console.log("✅ Minimal React App rendered successfully");
  } catch (error) {
    console.error("❌ Failed to render Minimal React app:", error);
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif; background: #fee; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 30px; border-radius: 10px; border: 2px solid #dc2626;">
          <h1 style="color: #dc2626;">❌ Critical React Error</h1>
          <p>Failed to initialize React: ${error.message}</p>
          <button onclick="window.location.href='/basic'" style="background: #dc2626; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
            🔄 Go to Basic Page
          </button>
        </div>
      </div>
    `;
  }
}
