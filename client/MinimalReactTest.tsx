import React from "react";
import { createRoot } from "react-dom/client";

console.log('🚀 MinimalReactTest: Iniciando...');

function MinimalApp() {
  console.log('🎯 MinimalApp: Componente renderizando...');
  
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "system-ui",
      color: "white"
    }}>
      <div style={{
        background: "white",
        color: "#333",
        padding: "40px",
        borderRadius: "20px",
        textAlign: "center",
        boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
        maxWidth: "600px"
      }}>
        <h1 style={{ 
          color: "#667eea", 
          marginBottom: "20px",
          fontSize: "2.5rem"
        }}>
          ⚡ LegalFlow
        </h1>
        
        <div style={{
          background: "#e8f5e8",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px",
          border: "2px solid #4caf50"
        }}>
          <h2 style={{ color: "#2e7d32", margin: "0 0 15px 0" }}>
            ✅ React Funcionando!
          </h2>
          <p style={{ color: "#388e3c", margin: "0" }}>
            O sistema React está carregando corretamente.
          </p>
        </div>
        
        <div style={{
          background: "#fff3e0",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "20px"
        }}>
          <h3 style={{ color: "#e65100", margin: "0 0 10px 0" }}>
            🔧 Próximos Passos:
          </h3>
          <p style={{ color: "#ef6c00", fontSize: "14px", margin: "0" }}>
            Agora vamos carregar o aplicativo LegalFlow completo.
          </p>
        </div>
        
        <button
          onClick={() => {
            console.log('🔄 Carregando app completo...');
            window.location.href = '/load-full-app';
          }}
          style={{
            background: "#22c55e",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            margin: "5px"
          }}
        >
          🚀 Carregar App Completo
        </button>
        
        <button
          onClick={() => {
            window.location.href = '/debug-loading-issues.html';
          }}
          style={{
            background: "#3b82f6",
            color: "white",
            border: "none",
            padding: "12px 24px",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            margin: "5px"
          }}
        >
          🔍 Ver Diagnóstico
        </button>
        
        <div style={{
          marginTop: "20px",
          fontSize: "14px",
          color: "#666"
        }}>
          <p>✅ React 18.3.1 ativo</p>
          <p>✅ TypeScript compilando</p>
          <p>✅ Vite funcionando</p>
          <p>✅ Componentes carregando</p>
        </div>
      </div>
    </div>
  );
}

// Inicialização com error handling
console.log('🔍 MinimalReactTest: Procurando elemento #root...');

const container = document.getElementById("root");
if (container) {
  console.log('✅ MinimalReactTest: Elemento #root encontrado');
  
  try {
    console.log('🏗️ MinimalReactTest: Criando root React...');
    const root = createRoot(container);
    
    console.log('🎨 MinimalReactTest: Renderizando componente...');
    root.render(<MinimalApp />);
    
    console.log('✅ MinimalReactTest: Inicialização completa!');
    
    // Adicionar ao DOM para indicar sucesso
    container.setAttribute('data-react-test', 'success');
    container.setAttribute('data-timestamp', new Date().toISOString());
    
  } catch (error) {
    console.error('❌ MinimalReactTest: Erro na inicialização:', error);
    
    // Fallback HTML direto
    container.innerHTML = `
      <div style="padding: 40px; font-family: system-ui; text-align: center; background: #fee; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <h1 style="color: #d32f2f; margin-bottom: 20px;">❌ Erro React</h1>
          <p>Erro ao inicializar React:</p>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: left; overflow: auto; font-size: 14px;">${error}</pre>
          <a href="/debug-loading-issues.html" style="color: #1976d2;">🔍 Ver Diagnóstico</a>
        </div>
      </div>
    `;
  }
} else {
  console.error('❌ MinimalReactTest: Elemento #root NÃO encontrado no DOM');
  
  // Tentar criar o elemento se não existir
  const body = document.body;
  if (body) {
    body.innerHTML = `
      <div id="root-error" style="padding: 40px; font-family: system-ui; text-align: center; background: #fee;">
        <h1 style="color: #d32f2f;">❌ DOM Error</h1>
        <p>Elemento #root não encontrado no DOM.</p>
        <p>Isso indica um problema fundamental na estrutura da página.</p>
      </div>
    `;
  }
}

console.log('🏁 MinimalReactTest: Script executado completamente');
