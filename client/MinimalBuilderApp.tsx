import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import BuilderPlaceholderPrevention from "./components/BuilderPlaceholderPrevention";

/**
 * MINIMAL BUILDER.IO COMPATIBLE APP
 *
 * This is a stripped-down version of the app designed specifically
 * to work correctly in Builder.io environment without any conflicts.
 */

// Simple error boundary
class SimpleErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("🚨 React Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            fontFamily: "system-ui",
            background: "#f8f9fa",
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div>
            <h1 style={{ color: "#dc3545", marginBottom: "16px" }}>
              ⚠️ Erro na Aplicação
            </h1>
            <p style={{ color: "#6c757d", marginBottom: "16px" }}>
              Ocorreu um problema. Tentando recuperar...
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#007bff",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              🔄 Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main minimal app component
function MinimalApp() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [environment, setEnvironment] = useState("");

  useEffect(() => {
    // Detect environment
    const env = window.location.hostname.includes("builder.codes")
      ? "Builder.io Production"
      : window.location.hostname.includes("fly.dev")
        ? "Fly.dev Production"
        : "Development";

    setEnvironment(env);

    // Mark as loaded
    setIsLoaded(true);

    // Debug logging
    console.log("✅ LegalFlow Minimal App loaded successfully");
    console.log("🌐 Environment:", env);

    // Set loaded marker for Builder.io
    const rootElement = document.getElementById("root");
    if (rootElement) {
      rootElement.setAttribute("data-react-loaded", "true");
      rootElement.setAttribute("data-app-status", "success");
    }
  }, []);

  if (!isLoaded) {
    return (
      <div
        style={{
          padding: "40px",
          textAlign: "center",
          fontFamily: "system-ui",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div>
          <h2>🔄 Carregando LegalFlow...</h2>
          <p>Sistema iniciando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <BuilderPlaceholderPrevention />
      <div
        style={{
          fontFamily: "system-ui",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "40px",
            borderRadius: "20px",
            textAlign: "center",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)",
            maxWidth: "600px",
            width: "90%",
          }}
        >
          <div
            style={{
              fontSize: "2.5rem",
              fontWeight: "700",
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "1rem",
            }}
          >
            ✅ LegalFlow
          </div>

          <div
            style={{
              color: "#6b7280",
              marginBottom: "2rem",
              fontSize: "1.2rem",
            }}
          >
            Software Jurídico Inteligente
          </div>

          <div
            style={{
              background: "#d4edda",
              color: "#155724",
              padding: "20px",
              borderRadius: "10px",
              marginBottom: "20px",
            }}
          >
            <h2 style={{ margin: "0 0 10px 0" }}>🎉 Sistema Funcionando!</h2>
            <p style={{ margin: 0 }}>
              Aplicação LegalFlow carregou com sucesso no {environment}
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "15px",
              margin: "20px 0",
            }}
          >
            <div
              style={{
                background: "#f8f9fa",
                padding: "20px",
                borderRadius: "10px",
                borderLeft: "4px solid #667eea",
              }}
            >
              <h3 style={{ color: "#667eea", marginBottom: "10px" }}>
                📊 Dashboard
              </h3>
              <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                Visão geral do escritório
              </p>
            </div>

            <div
              style={{
                background: "#f8f9fa",
                padding: "20px",
                borderRadius: "10px",
                borderLeft: "4px solid #667eea",
              }}
            >
              <h3 style={{ color: "#667eea", marginBottom: "10px" }}>
                ⚖️ Processos
              </h3>
              <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                Gestão jurídica completa
              </p>
            </div>

            <div
              style={{
                background: "#f8f9fa",
                padding: "20px",
                borderRadius: "10px",
                borderLeft: "4px solid #667eea",
              }}
            >
              <h3 style={{ color: "#667eea", marginBottom: "10px" }}>
                👥 Clientes
              </h3>
              <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                CRM integrado
              </p>
            </div>
          </div>

          <div
            style={{
              background: "#f9fafb",
              padding: "20px",
              borderRadius: "10px",
              marginTop: "20px",
              fontSize: "0.9rem",
              color: "#6b7280",
              textAlign: "left",
            }}
          >
            <strong>Status Técnico:</strong>
            <br />
            ✅ React: Funcionando
            <br />
            ✅ Componentes: Carregados
            <br />✅ Environment: {environment}
            <br />✅ Timestamp: {new Date().toLocaleString("pt-BR")}
            <br />
          </div>
        </div>
      </div>
    </>
  );
}

// Export the minimal app with error boundary
export default function MinimalBuilderApp() {
  return (
    <SimpleErrorBoundary>
      <MinimalApp />
    </SimpleErrorBoundary>
  );
}

// Auto-initialize if this is the entry point
if (typeof window !== "undefined") {
  const container = document.getElementById("root");
  if (container && !container.hasChildNodes()) {
    const root = createRoot(container);
    root.render(<MinimalBuilderApp />);
    console.log("🚀 Minimal Builder App auto-initialized");
  }
}
