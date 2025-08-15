import "./global.css";
import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";

function ProgressiveApp() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadNextStep = async () => {
      try {
        switch(step) {
          case 1:
            // Test basic UI components
            await import("./components/ui/toaster");
            console.log("✅ Step 1: UI components loaded");
            setStep(2);
            break;
          case 2:
            // Test auth contexts
            await import("./contexts/AuthContext");
            await import("./contexts/DemoAuthContext");
            console.log("✅ Step 2: Auth contexts loaded");
            setStep(3);
            break;
          case 3:
            // Test main components
            await import("./components/AppShell");
            console.log("✅ Step 3: Main components loaded");
            setStep(4);
            break;
          case 4:
            // Test core pages
            await import("./pages/Dashboard");
            await import("./pages/Processos");
            await import("./pages/Clientes");
            console.log("✅ Step 4: Core pages loaded");
            setStep(5);
            break;
          case 5:
            // All good, load full app
            console.log("✅ All components loaded successfully!");
            console.log("🔄 Redirecting to full app...");
            setTimeout(() => {
              window.location.href = '/full-app';
            }, 2000);
            break;
        }
      } catch (err: any) {
        console.error(`❌ Error at step ${step}:`, err);
        setError(`Step ${step} failed: ${err.message}`);
      }
    };

    if (step <= 5 && !error) {
      const timer = setTimeout(loadNextStep, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, error]);

  return (
    <div style={{ 
      padding: "40px", 
      fontFamily: "system-ui",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "100vh",
      color: "white"
    }}>
      <div style={{
        background: "white",
        color: "#333",
        padding: "30px",
        borderRadius: "15px",
        maxWidth: "600px",
        margin: "0 auto",
        textAlign: "center"
      }}>
        <h1 style={{ color: "#667eea", marginBottom: "20px" }}>⚡ LegalFlow</h1>
        <p style={{ marginBottom: "30px" }}>Diagnóstico Progressivo de Carregamento</p>
        
        {error ? (
          <div style={{ 
            background: "#fee", 
            color: "#c53030", 
            padding: "20px", 
            borderRadius: "8px",
            marginBottom: "20px"
          }}>
            <h3>❌ Erro Encontrado:</h3>
            <pre style={{ textAlign: "left", fontSize: "14px" }}>{error}</pre>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ 
                background: "#e3f2fd", 
                padding: "15px", 
                borderRadius: "8px",
                marginBottom: "15px"
              }}>
                <h3 style={{ color: "#1976d2" }}>Etapa {step} de 5</h3>
                <div style={{ color: "#555" }}>
                  {step === 1 && "🔧 Carregando componentes UI..."}
                  {step === 2 && "🔐 Carregando sistema de autenticação..."}
                  {step === 3 && "🏗️ Carregando componentes principais..."}
                  {step === 4 && "📄 Carregando páginas principais..."}
                  {step === 5 && "🎉 Tudo carregado! Redirecionando..."}
                </div>
              </div>
              
              <div style={{ 
                background: "#f5f5f5", 
                height: "8px", 
                borderRadius: "4px",
                overflow: "hidden"
              }}>
                <div style={{
                  width: `${(step / 5) * 100}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #22c55e, #16a34a)",
                  transition: "width 0.5s ease"
                }}></div>
              </div>
            </div>
            
            <div style={{ fontSize: "14px", color: "#666" }}>
              ✅ Componentes React funcionando<br/>
              ✅ TypeScript compilando<br/>
              ✅ Vite carregando modules<br/>
              {step >= 2 && "✅ UI components OK"}
              {step >= 3 && <><br/>✅ Auth system OK</>}
              {step >= 4 && <><br/>✅ Main components OK</>}
              {step >= 5 && <><br/>✅ Core pages OK</>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Initialize React app
const container = document.getElementById("root");
if (container) {
  console.log('🚀 Initializing Progressive Diagnostic App...');
  const root = createRoot(container);
  root.render(<ProgressiveApp />);
  console.log('✅ Progressive Diagnostic App initialized');
}
