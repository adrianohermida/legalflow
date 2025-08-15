import React, { useEffect, useState } from 'react';

/**
 * EMERGENCY DEBUG COMPONENT
 * This will help identify what's causing React to render code as text
 */

export function EmergencyDebug() {
  const [debugInfo, setDebugInfo] = useState<any>(null);
  
  useEffect(() => {
    const info = {
      timestamp: new Date().toISOString(),
      reactVersion: React.version,
      hasReact: !!window.React,
      rootElement: !!document.getElementById('root'),
      errorBoundaries: Array.from(document.querySelectorAll('[data-error-boundary]')).length,
      scriptTags: Array.from(document.querySelectorAll('script')).length,
      moduleScripts: Array.from(document.querySelectorAll('script[type="module"]')).length,
      reactErrors: [],
      consoleErrors: [],
      domContent: document.body.innerHTML.slice(0, 500) + '...'
    };
    
    // Capture any React errors
    const originalError = console.error;
    console.error = function(...args) {
      if (args.some(arg => String(arg).includes('React') || String(arg).includes('component'))) {
        info.reactErrors.push(args.join(' '));
      }
      info.consoleErrors.push(args.join(' '));
      originalError.apply(console, args);
    };
    
    setDebugInfo(info);
    
    // Check if we're seeing code being rendered as text
    const bodyText = document.body.textContent || '';
    if (bodyText.includes('export default function') || bodyText.includes('MyComponent')) {
      console.error('🚨 CRITICAL: React code being rendered as text!');
      console.error('Body contains code:', bodyText.slice(0, 200));
    }
    
  }, []);
  
  if (!debugInfo) return <div>🔍 Debugging...</div>;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '20px',
      zIndex: 99999,
      overflow: 'auto',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h1 style={{ color: '#ff6b6b', marginBottom: '20px' }}>
        🚨 EMERGENCY DEBUG - React Rendering Issue
      </h1>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>React Status:</strong>
        <div>Version: {debugInfo.reactVersion}</div>
        <div>React Available: {debugInfo.hasReact ? '✅' : '❌'}</div>
        <div>Root Element: {debugInfo.rootElement ? '✅' : '❌'}</div>
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <strong>DOM Status:</strong>
        <div>Script Tags: {debugInfo.scriptTags}</div>
        <div>Module Scripts: {debugInfo.moduleScripts}</div>
        <div>Error Boundaries: {debugInfo.errorBoundaries}</div>
      </div>
      
      {debugInfo.reactErrors.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#ff6b6b' }}>React Errors:</strong>
          {debugInfo.reactErrors.map((error: string, i: number) => (
            <div key={i} style={{ background: '#2d1b1b', padding: '5px', margin: '5px 0' }}>
              {error}
            </div>
          ))}
        </div>
      )}
      
      {debugInfo.consoleErrors.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <strong style={{ color: '#ffa500' }}>Console Errors:</strong>
          {debugInfo.consoleErrors.slice(0, 5).map((error: string, i: number) => (
            <div key={i} style={{ background: '#2d2d1b', padding: '5px', margin: '5px 0' }}>
              {error}
            </div>
          ))}
        </div>
      )}
      
      <div style={{ marginBottom: '15px' }}>
        <strong>DOM Content Preview:</strong>
        <div style={{ background: '#1b1b1b', padding: '10px', maxHeight: '200px', overflow: 'auto' }}>
          {debugInfo.domContent}
        </div>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => window.location.reload()}
          style={{
            background: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          🔄 Reload Page
        </button>
        
        <button 
          onClick={() => {
            const root = document.getElementById('root');
            if (root) root.innerHTML = '<div>🔄 Restarting React...</div>';
            setTimeout(() => window.location.reload(), 1000);
          }}
          style={{
            background: '#dc3545',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🚨 Emergency Restart
        </button>
      </div>
    </div>
  );
}

export default EmergencyDebug;
