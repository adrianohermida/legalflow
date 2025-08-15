import React from "react";
import { createRoot } from "react-dom/client";

function UltraSimpleApp() {
  return (
    <div style={{
      padding: "20px",
      fontFamily: "Arial, sans-serif",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{
        background: "white",
        padding: "40px",
        borderRadius: "20px",
        textAlign: "center" as const,
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)",
        maxWidth: "600px"
      }}>
        <h1 style={{
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: "2.5rem",
          fontWeight: "700",
          marginBottom: "1rem"
        }}>
          ✅ LegalFlow React
        </h1>
        
        <div style={{
          background: "#d4edda",
          color: "#155724",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px"
        }}>
          <h2 style={{ margin: "0 0 10px 0" }}>🎉 React Funcionando!</h2>
          <p style={{ margin: 0 }}>
            Ultra-simple React app carregado com sucesso!
          </p>
        </div>

        <div style={{
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          flexWrap: "wrap" as const,
          marginBottom: "20px"
        }}>
          <button 
            onClick={() => window.location.href = '/basic'}
            style={{
              background: "#007bff",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            📄 Página Básica
          </button>
          <button 
            onClick={() => window.location.href = '/test'}
            style={{
              background: "#28a745",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            🔧 Teste Servidor
          </button>
          <button 
            onClick={() => alert('React funcionando! 🎉')}
            style={{
              background: "#17a2b8",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            🧪 Testar React
          </button>
        </div>

        <div style={{
          background: "#f8f9fa",
          padding: "15px",
          borderRadius: "8px",
          fontSize: "0.9rem",
          color: "#6c757d"
        }}>
          <strong>Status:</strong> React Ultra-Simple funcionando<br />
          <strong>Carregado:</strong> {new Date().toISOString()}<br />
          <strong>Environment:</strong> Builder.io + Fly.dev
        </div>
      </div>
    </div>
  );
}

// Ultra-simple initialization without error boundaries or complex setup
console.log("🚀 Starting Ultra-Simple React App...");

const container = document.getElementById("root");
if (container) {
  try {
    const root = createRoot(container);
    root.render(<UltraSimpleApp />);
    console.log("✅ Ultra-Simple React App rendered successfully!");
  } catch (error) {
    console.error("❌ Failed to render Ultra-Simple React app:", error);
    // Fallback without React
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif; background: #f8d7da; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 30px; border-radius: 10px;">
          <h1 style="color: #721c24;">❌ React Error</h1>
          <p>Ultra-Simple React failed: ${error.message}</p>
          <button onclick="window.location.href='/basic'" style="background: #dc3545; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
            Go to Basic Page
          </button>
        </div>
      </div>
    `;
  }
} else {
  console.error("❌ Root container not found!");
}
