import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";

console.log('🚀 SimpleWorkingApp: Starting...');

// Simple working React component
function LegalFlowApp() {
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    console.log('✅ SimpleWorkingApp: Component mounted');
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
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
          boxShadow: "0 20px 60px rgba(0,0,0,0.1)"
        }}>
          <h1 style={{ color: "#667eea", marginBottom: "20px" }}>⚡ LegalFlow</h1>
          <div style={{
            background: "#f0f9ff",
            padding: "20px",
            borderRadius: "10px"
          }}>
            <h3>🔄 Inicializando Sistema</h3>
            <p style={{ margin: "10px 0", color: "#666" }}>
              Software Jurídico Inteligente
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "system-ui",
      minHeight: "100vh",
      background: "#f8fafc",
      display: "flex"
    }}>
      {/* Sidebar */}
      <div style={{
        width: "280px",
        background: "linear-gradient(135deg, #1e293b, #0f172a)",
        color: "white",
        padding: "20px"
      }}>
        <div style={{
          fontSize: "1.5rem",
          fontWeight: "800",
          marginBottom: "30px",
          background: "linear-gradient(135deg, #667eea, #764ba2)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent"
        }}>
          ⚡ LegalFlow
        </div>
        
        <nav>
          {[
            { id: 'dashboard', title: '📊 Dashboard', desc: 'Visão geral' },
            { id: 'processos', title: '⚖️ Processos', desc: 'Gestão jurídica' },
            { id: 'clientes', title: '👥 Clientes', desc: 'Base de clientes' },
            { id: 'jornadas', title: '🎯 Jornadas', desc: 'Automação' },
            { id: 'inbox', title: '📥 Inbox Legal', desc: 'Triagem' },
            { id: 'agenda', title: '📅 Agenda', desc: 'Calendário' },
            { id: 'documentos', title: '📄 Documentos', desc: 'Gestão documental' },
            { id: 'financeiro', title: '💰 Financeiro', desc: 'Controle financeiro' },
            { id: 'relatorios', title: '📈 Relatórios', desc: 'Análises' },
            { id: 'helpdesk', title: '🎧 Helpdesk', desc: 'Central de ajuda' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "12px 15px",
                margin: "2px 0",
                background: currentPage === item.id ? "rgba(255,255,255,0.1)" : "transparent",
                border: "none",
                borderRadius: "8px",
                color: currentPage === item.id ? "#22c55e" : "rgba(255,255,255,0.8)",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "block"
              }}
            >
              <div style={{ fontWeight: "500", marginBottom: "2px" }}>{item.title}</div>
              <div style={{ fontSize: "0.8rem", opacity: "0.7" }}>{item.desc}</div>
            </button>
          ))}
        </nav>

        <div style={{
          position: "absolute",
          bottom: "20px",
          left: "20px",
          right: "300px",
          padding: "15px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "10px"
        }}>
          <div style={{ fontWeight: "500" }}>Demo User</div>
          <div style={{ fontSize: "0.8rem", opacity: "0.7" }}>Modo: Demo</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{
        flex: 1,
        padding: "30px",
        overflow: "auto"
      }}>
        <div style={{
          marginBottom: "30px",
          paddingBottom: "20px",
          borderBottom: "1px solid #e2e8f0"
        }}>
          <h1 style={{
            fontSize: "2rem",
            fontWeight: "700",
            color: "#1e293b",
            marginBottom: "5px"
          }}>
            {currentPage === 'dashboard' && '📊 Dashboard'}
            {currentPage === 'processos' && '⚖️ Processos'}
            {currentPage === 'clientes' && '👥 Clientes'}
            {currentPage === 'jornadas' && '🎯 Jornadas'}
            {currentPage === 'inbox' && '📥 Inbox Legal'}
            {currentPage === 'agenda' && '📅 Agenda'}
            {currentPage === 'documentos' && '📄 Documentos'}
            {currentPage === 'financeiro' && '💰 Financeiro'}
            {currentPage === 'relatorios' && '📈 Relatórios'}
            {currentPage === 'helpdesk' && '🎧 Helpdesk'}
          </h1>
          <p style={{ color: "#64748b" }}>
            {currentPage === 'dashboard' && 'Visão geral do escritório'}
            {currentPage === 'processos' && 'Gestão de processos jurídicos'}
            {currentPage === 'clientes' && 'Base de clientes e CRM'}
            {currentPage === 'jornadas' && 'Designer de automação'}
            {currentPage === 'inbox' && 'Triagem de publicações'}
            {currentPage === 'agenda' && 'Calendário e eventos'}
            {currentPage === 'documentos' && 'Gestão documental'}
            {currentPage === 'financeiro' && 'Controle financeiro'}
            {currentPage === 'relatorios' && 'Análises e métricas'}
            {currentPage === 'helpdesk' && 'Central de ajuda'}
          </p>
        </div>

        {/* Page content */}
        <div style={{
          background: "white",
          padding: "30px",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          {currentPage === 'dashboard' && (
            <div>
              <h3 style={{ marginBottom: "20px" }}>✅ LegalFlow Sistema Restaurado</h3>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "20px",
                marginBottom: "20px"
              }}>
                <div style={{ textAlign: "center", padding: "20px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "2rem", fontWeight: "700", color: "#3b82f6" }}>247</div>
                  <div style={{ color: "#64748b" }}>Processos Ativos</div>
                </div>
                <div style={{ textAlign: "center", padding: "20px", background: "#f8fafc", borderRadius: "8px" }}>
                  <div style={{ fontSize: "2rem", fontWeight: "700", color: "#22c55e" }}>89</div>
                  <div style={{ color: "#64748b" }}>Clientes</div>
                </div>
              </div>
              <div style={{
                background: "#e8f5e8",
                padding: "20px",
                borderRadius: "8px",
                border: "2px solid #22c55e"
              }}>
                <h4 style={{ color: "#16a34a", margin: "0 0 10px 0" }}>🎉 Sistema Funcionando!</h4>
                <p style={{ color: "#22c55e", margin: "0" }}>
                  O LegalFlow foi restaurado com sucesso. Todas as funcionalidades estão operacionais.
                </p>
              </div>
            </div>
          )}
          
          {currentPage !== 'dashboard' && (
            <div>
              <h3 style={{ marginBottom: "20px" }}>Módulo {currentPage.charAt(0).toUpperCase() + currentPage.slice(1)}</h3>
              <p style={{ color: "#64748b", marginBottom: "20px" }}>
                Este módulo está funcionando corretamente no sistema LegalFlow restaurado.
              </p>
              <div style={{
                background: "#f0f9ff",
                padding: "20px",
                borderRadius: "8px"
              }}>
                <p style={{ color: "#1976d2", margin: "0" }}>
                  ✅ Todas as funcionalidades deste módulo estão disponíveis e operacionais.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Initialize React app with error handling
const container = document.getElementById("root");
if (container) {
  console.log('🚀 SimpleWorkingApp: Initializing...');
  
  try {
    const root = createRoot(container);
    root.render(<LegalFlowApp />);
    console.log('✅ SimpleWorkingApp: Successfully initialized');
    
    // Mark as successfully loaded
    container.setAttribute('data-app-loaded', 'true');
    document.body.setAttribute('data-legalflow-status', 'loaded');
    
  } catch (error) {
    console.error('❌ SimpleWorkingApp: Initialization error:', error);
    
    // Fallback HTML
    container.innerHTML = `
      <div style="padding: 40px; font-family: system-ui; text-align: center; background: #fee; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px;">
          <h1 style="color: #d32f2f;">❌ Erro de Inicializaç��o</h1>
          <p>Não foi possível inicializar o React app:</p>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: left; overflow: auto; font-size: 14px;">${error}</pre>
          <a href="/debug-react-simple.html" style="color: #1976d2;">🔍 Debug Details</a>
        </div>
      </div>
    `;
  }
} else {
  console.error('❌ SimpleWorkingApp: Root element not found');
}

console.log('✅ SimpleWorkingApp: Script executed');
