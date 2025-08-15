import "./global.css";
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";

// Import only essential pages to start
import { Dashboard } from "./pages/Dashboard";
import { Processos } from "./pages/Processos";
import { Clientes } from "./pages/Clientes";

// Simple Auth Context
const AuthContext = React.createContext<any>(null);

function SimpleAuthProvider({ children }: { children: React.ReactNode }) {
  const [user] = useState({ name: "Demo User", authenticated: true });
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: true }}>
      {children}
    </AuthContext.Provider>
  );
}

// Simple App Shell
function SimpleAppShell({ children }: { children: React.ReactNode }) {
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
          color: "#667eea"
        }}>
          ⚡ LegalFlow
        </div>
        
        <nav>
          <a href="/dashboard" style={{ 
            display: "block", 
            color: "white", 
            textDecoration: "none",
            padding: "10px",
            marginBottom: "5px",
            borderRadius: "5px",
            background: "rgba(255,255,255,0.1)"
          }}>
            📊 Dashboard
          </a>
          <a href="/processos" style={{ 
            display: "block", 
            color: "white", 
            textDecoration: "none",
            padding: "10px",
            marginBottom: "5px"
          }}>
            ⚖️ Processos
          </a>
          <a href="/clientes" style={{ 
            display: "block", 
            color: "white", 
            textDecoration: "none",
            padding: "10px",
            marginBottom: "5px"
          }}>
            👥 Clientes
          </a>
        </nav>
      </div>
      
      {/* Main content */}
      <div style={{ flex: 1, padding: "30px" }}>
        {children}
      </div>
    </div>
  );
}

// Main App Component
function SimpleApp() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SimpleAuthProvider>
          <BrowserRouter>
            <SimpleAppShell>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/processos" element={<Processos />} />
                <Route path="/clientes" element={<Clientes />} />
                <Route path="*" element={
                  <div style={{
                    textAlign: "center",
                    padding: "40px"
                  }}>
                    <h2>✅ LegalFlow Simplificado Funcionando!</h2>
                    <p>O aplicativo básico está carregando corretamente.</p>
                    <p>Páginas disponíveis: Dashboard, Processos, Clientes</p>
                  </div>
                } />
              </Routes>
            </SimpleAppShell>
          </BrowserRouter>
          <Toaster />
        </SimpleAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

// Initialize React app
const container = document.getElementById("root");
if (container) {
  console.log('🚀 Initializing Simple LegalFlow App...');
  const root = createRoot(container);
  root.render(<SimpleApp />);
  console.log('✅ Simple LegalFlow App initialized successfully');
} else {
  console.error('❌ Root container not found');
}
