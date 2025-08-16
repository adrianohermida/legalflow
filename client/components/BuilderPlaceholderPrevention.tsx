import React, { useEffect } from "react";

/**
 * BUILDER.IO PLACEHOLDER PREVENTION SYSTEM
 *
 * This component prevents Builder.io from showing code as text
 * by intercepting and redirecting any placeholder attempts.
 */

export function BuilderPlaceholderPrevention() {
  useEffect(() => {
    // Immediate check on mount
    const checkAndPrevent = () => {
      const bodyText = document.body.textContent || "";
      const hasPlaceholder =
        bodyText.includes("export default function MyComponent") ||
        bodyText.includes("return <></>") ||
        bodyText.includes("function MyComponent");

      if (hasPlaceholder) {
        console.error(
          "🚨 Builder.io placeholder detected - preventing display",
        );

        // Find and replace any text nodes containing the placeholder
        const walker = document.createTreeWalker(
          document.body,
          NodeFilter.SHOW_TEXT,
          null,
          false,
        );

        let node;
        while ((node = walker.nextNode())) {
          const text = node.textContent || "";
          if (
            text.includes("export default function MyComponent") ||
            text.includes("return <></>")
          ) {
            // Replace with proper loading message
            const replacement = document.createElement("div");
            replacement.style.cssText = `
              padding: 40px; 
              text-align: center; 
              font-family: system-ui;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            `;

            replacement.innerHTML = `
              <div style="
                background: white; 
                color: #333; 
                padding: 40px; 
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.1);
                max-width: 500px;
              ">
                <h1 style="color: #667eea; margin-bottom: 20px;">
                  ⚡ LegalFlow Carregando
                </h1>
                <p style="margin-bottom: 20px;">
                  Inicializando aplicação...
                </p>
                <div style="
                  width: 100%; 
                  height: 4px; 
                  background: #f0f0f0; 
                  border-radius: 2px;
                  overflow: hidden;
                ">
                  <div style="
                    width: 70%; 
                    height: 100%; 
                    background: linear-gradient(90deg, #667eea, #764ba2);
                    animation: loading 2s infinite;
                  "></div>
                </div>
              </div>
              
              <style>
                @keyframes loading {
                  0% { transform: translateX(-100%); }
                  100% { transform: translateX(300%); }
                }
              </style>
            `;

            // Replace the problematic node
            if (node.parentNode) {
              node.parentNode.replaceChild(replacement, node);
            }

            // Force reload after 3 seconds
            setTimeout(() => {
              window.location.reload();
            }, 3000);

            break;
          }
        }
      }
    };

    // Check immediately
    checkAndPrevent();

    // Check periodically for first 10 seconds
    const interval = setInterval(checkAndPrevent, 1000);
    setTimeout(() => clearInterval(interval), 10000);

    // Also observe for dynamic content changes
    const observer = new MutationObserver(() => {
      checkAndPrevent();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Cleanup
    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  return null; // This component doesn't render anything itself
}

export default BuilderPlaceholderPrevention;
