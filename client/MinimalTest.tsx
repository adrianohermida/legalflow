import { createRoot } from "react-dom/client";

function MinimalApp() {
  return (
    <div
      style={{
        padding: "40px",
        fontFamily: "system-ui",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
        color: "white",
        textAlign: "center",
      }}
    >
      <h1>✅ LegalFlow - Teste Mínimo Funcionando!</h1>
      <p>Se você vê esta mensagem, o React está carregando corretamente.</p>
      <div
        style={{
          background: "white",
          color: "#333",
          padding: "20px",
          borderRadius: "10px",
          marginTop: "20px",
          display: "inline-block",
        }}
      >
        <h3>🎉 Sistema Funcional</h3>
        <p>
          O carregamento do React está OK. Agora vamos voltar ao app completo.
        </p>
      </div>
    </div>
  );
}

// Initialize React app
const container = document.getElementById("root");
if (container) {
  console.log("🚀 Initializing Minimal Test App...");
  const root = createRoot(container);
  root.render(<MinimalApp />);
  console.log("✅ Minimal Test App initialized successfully");
}
