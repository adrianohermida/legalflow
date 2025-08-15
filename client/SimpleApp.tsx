import React from "react";
import { createRoot } from "react-dom/client";

function SimpleApp() {
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
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.1)"
      }}>
        <h1 style={{
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          fontSize: "2.5rem",
          fontWeight: "700",
          marginBottom: "1rem"
        }}>
          ✅ LegalFlow
        </h1>
        <p style={{ color: "#6b7280", fontSize: "1.2rem", marginBottom: "2rem" }}>
          Software Jurídico Inteligente
        </p>
        <div style={{
          background: "#f0f9ff",
          padding: "20px",
          borderRadius: "10px",
          marginBottom: "20px"
        }}>
          <h2 style={{ color: "#0369a1", margin: "0 0 10px 0" }}>🎉 React Funcionando!</h2>
          <p style={{ color: "#0c4a6e", margin: 0 }}>
            A aplicação React foi carregada com sucesso no ambiente Builder.io
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button 
            onClick={() => window.location.href = '/test'}
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              cursor: "pointer"
            }}
          >
            🔧 Página de Teste
          </button>
          <button 
            onClick={() => window.location.href = '/fallback'}
            style={{
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "10px",
              cursor: "pointer"
            }}
          >
            🔄 Fallback
          </button>
        </div>
        <div style={{
          marginTop: "20px",
          padding: "15px",
          background: "#f9fafb",
          borderRadius: "8px",
          fontSize: "0.9rem",
          color: "#6b7280"
        }}>
          <strong>Status:</strong> React carregado com sucesso<br />
          <strong>Timestamp:</strong> {new Date().toISOString()}<br />
          <strong>Environment:</strong> Builder.io + Fly.dev
        </div>
      </div>
    </div>
  );
}

// Simple initialization
const container = document.getElementById("root");
if (container) {
  try {
    const root = createRoot(container);
    root.render(<SimpleApp />);
    console.log("✅ Simple React app rendered successfully");
  } catch (error) {
    console.error("❌ Failed to render Simple React app:", error);
    // Fallback HTML
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h1 style="color: #dc2626;">❌ React Render Error</h1>
        <p>Failed to render React app: ${error.message}</p>
        <button onclick="window.location.href='/fallback'" style="padding: 10px 20px; background: #3b82f6; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Go to Fallback
        </button>
      </div>
    `;
  }
}
