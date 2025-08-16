import React, { useEffect, useState } from "react";

interface BuilderDebugInfo {
  timestamp: string;
  environment: string;
  apiUrls: string[];
  reactStatus: boolean;
  builderContext: any;
}

export function BuilderDebugger() {
  const [debugInfo, setDebugInfo] = useState<BuilderDebugInfo | null>(null);

  useEffect(() => {
    const info: BuilderDebugInfo = {
      timestamp: new Date().toISOString(),
      environment: window.location.hostname.includes("builder.codes")
        ? "Builder.io"
        : "Development",
      apiUrls: [
        `${window.location.protocol}//${window.location.host}/api/health`,
        `${window.location.protocol}//${window.location.host}/api/v1`,
      ],
      reactStatus:
        !!window.React ||
        !!document.querySelector("#root[data-react-loaded]") ||
        !!document.querySelector("[data-react-loaded]"),
      builderContext: {
        userAgent: navigator.userAgent.slice(0, 60),
        url: window.location.href,
        hasBuilderSDK: !!(window as any).Builder,
        hasReact: !!window.React,
        rootElement: !!document.getElementById("root"),
        bodyClasses: document.body.className,
      },
    };

    setDebugInfo(info);

    // Log para debug
    console.log("🔍 Builder.io Debug Info:", info);

    // Verificar se há componentes problemáticos
    const checkForEmptyComponents = () => {
      const allElements = document.querySelectorAll("*");
      let emptyComponents = 0;

      allElements.forEach((el) => {
        if (el.tagName && el.innerHTML === "" && el.children.length === 0) {
          emptyComponents++;
        }
      });

      if (emptyComponents > 10) {
        console.warn(
          "🚨 Muitos componentes vazios detectados:",
          emptyComponents,
        );
      }
    };

    setTimeout(checkForEmptyComponents, 2000);
  }, []);

  if (!debugInfo) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "rgba(0,0,0,0.8)",
        color: "white",
        padding: "10px",
        borderRadius: "8px",
        fontSize: "12px",
        fontFamily: "monospace",
        zIndex: 9999,
        maxWidth: "300px",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: "8px" }}>
        🔧 Builder.io Debug
      </div>
      <div>Env: {debugInfo.environment}</div>
      <div>React: {debugInfo.reactStatus ? "✅" : "❌"}</div>
      <div>
        Builder SDK: {debugInfo.builderContext.hasBuilderSDK ? "✅" : "❌"}
      </div>
      <div>Time: {debugInfo.timestamp.slice(11, 19)}</div>

      <div style={{ marginTop: "8px", fontSize: "10px", opacity: 0.7 }}>
        Para debug completo, verifique o console do browser
      </div>
    </div>
  );
}

export default BuilderDebugger;
