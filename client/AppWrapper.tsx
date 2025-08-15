import React from "react";
import { createRoot } from "react-dom/client";

// Error Boundary simples
class ErrorBoundary extends React.Component<
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
    console.error('❌ React Error Boundary caught error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: "40px",
          fontFamily: "system-ui",
          textAlign: "center",
          background: "#fee",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            background: "white",
            padding: "30px",
            borderRadius: "10px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            maxWidth: "600px"
          }}>
            <h1 style={{ color: "#d32f2f", marginBottom: "20px" }}>
              ❌ Erro na Aplicação LegalFlow
            </h1>
            <p style={{ marginBottom: "20px" }}>
              Ocorreu um erro ao carregar o aplicativo. Detalhes:
            </p>
            <pre style={{
              background: "#f5f5f5",
              padding: "15px",
              borderRadius: "5px",
              textAlign: "left",
              overflow: "auto",
              fontSize: "14px"
            }}>
              {this.state.error?.message || 'Erro desconhecido'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#1976d2",
                color: "white",
                border: "none",
                padding: "10px 20px",
                borderRadius: "5px",
                cursor: "pointer",
                marginTop: "20px"
              }}
            >
              🔄 Recarregar Página
            </button>
            <br />
            <a 
              href="/debug-loading-issues.html"
              style={{
                display: "inline-block",
                marginTop: "10px",
                color: "#1976d2"
              }}
            >
              🔍 Ver Diagnóstico Detalhado
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component
function LoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontFamily: "system-ui"
    }}>
      <div style={{
        background: "white",
        color: "#333",
        padding: "40px",
        borderRadius: "20px",
        textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ color: "#667eea", marginBottom: "20px" }}>⚡ LegalFlow</h1>
        <div style={{
          background: "#f0f9ff",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px"
        }}>
          <h3>🔄 Carregando Sistema Completo...</h3>
          <p style={{ margin: "10px 0", color: "#666" }}>
            Inicializando todas as funcionalidades
          </p>
          <div style={{
            width: "200px",
            height: "4px",
            background: "#e5e7eb",
            borderRadius: "2px",
            overflow: "hidden",
            margin: "15px auto"
          }}>
            <div style={{
              width: "100%",
              height: "100%",
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
              animation: "loading 2s infinite"
            }}></div>
          </div>
        </div>
        <div style={{ fontSize: "14px", color: "#888" }}>
          Software Jurídico Inteligente
        </div>
      </div>
      <style>
        {`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
}

// Wrapper principal
function AppWrapper() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [App, setApp] = React.useState<any>(null);

  React.useEffect(() => {
    console.log('🚀 AppWrapper: Iniciando carregamento do App principal...');
    
    const loadApp = async () => {
      try {
        // Simular um delay mínimo para mostrar loading
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('📦 AppWrapper: Importando App.tsx...');
        const AppModule = await import('./App.tsx');
        
        console.log('✅ AppWrapper: App.tsx carregado com sucesso');
        console.log('📋 AppWrapper: Exports disponíveis:', Object.keys(AppModule));
        
        // O App.tsx não exporta o componente, ele se auto-inicializa
        // Então vamos simular que carregou
        setApp(() => () => (
          <div style={{
            padding: "40px",
            textAlign: "center",
            fontFamily: "system-ui"
          }}>
            <h2>✅ App.tsx Carregado</h2>
            <p>O módulo App.tsx foi importado com sucesso.</p>
            <p>O app deve estar inicializando automaticamente...</p>
            <div style={{
              marginTop: "20px",
              padding: "15px",
              background: "#e3f2fd",
              borderRadius: "8px"
            }}>
              <p style={{ color: "#1976d2" }}>
                Se o app não apareceu, verifique o console para erros.
              </p>
            </div>
          </div>
        ));
        
      } catch (error) {
        console.error('❌ AppWrapper: Erro ao carregar App.tsx:', error);
        setApp(() => () => (
          <div style={{
            padding: "40px",
            textAlign: "center",
            fontFamily: "system-ui",
            background: "#fee"
          }}>
            <h2 style={{ color: "#d32f2f" }}>❌ Erro ao Carregar App</h2>
            <p>Não foi possível carregar o App.tsx:</p>
            <pre style={{
              background: "#f5f5f5",
              padding: "15px",
              borderRadius: "5px",
              textAlign: "left",
              overflow: "auto"
            }}>
              {error instanceof Error ? error.message : String(error)}
            </pre>
            <a href="/debug-loading-issues.html" style={{ color: "#1976d2" }}>
              🔍 Ver Diagnóstico Detalhado
            </a>
          </div>
        ));
      } finally {
        setIsLoading(false);
      }
    };

    loadApp();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (App) {
    return <App />;
  }

  return (
    <div style={{
      padding: "40px",
      textAlign: "center",
      fontFamily: "system-ui"
    }}>
      <h2>⚠️ App não carregado</h2>
      <p>O componente App não foi carregado corretamente.</p>
    </div>
  );
}

// Initialize
const container = document.getElementById("root");
if (container) {
  console.log('🚀 AppWrapper: Inicializando wrapper com error handling...');
  
  try {
    const root = createRoot(container);
    root.render(
      <ErrorBoundary>
        <AppWrapper />
      </ErrorBoundary>
    );
    console.log('✅ AppWrapper: Wrapper inicializado com sucesso');
  } catch (error) {
    console.error('❌ AppWrapper: Erro fatal na inicialização:', error);
    
    // Fallback absoluto
    container.innerHTML = `
      <div style="padding: 40px; font-family: system-ui; text-align: center; background: #fee; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px;">
          <h1 style="color: #d32f2f;">❌ Erro Fatal</h1>
          <p>Não foi possível inicializar o React.</p>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: left; overflow: auto; font-size: 14px;">${error}</pre>
          <a href="/debug-loading-issues.html" style="color: #1976d2;">🔍 Ver Diagnóstico</a>
        </div>
      </div>
    `;
  }
} else {
  console.error('❌ AppWrapper: Elemento #root não encontrado no DOM');
}
