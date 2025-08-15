import React from 'react';

/**
 * EMERGENCY COMPONENT - BUILDER.IO FIX
 * 
 * This component exists ONLY to prevent Builder.io from generating
 * empty placeholder components. It should redirect to the main app.
 */

const MyComponent: React.FC<any> = (props) => {
  // Immediate redirect to main app
  if (typeof window !== 'undefined') {
    console.log('🚨 MyComponent loaded - redirecting to main app');
    window.location.href = '/';
  }

  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      fontFamily: 'system-ui',
      background: '#f8f9fa',
      border: '2px solid #e9ecef',
      borderRadius: '8px',
      margin: '20px'
    }}>
      <h2 style={{ color: '#495057', marginBottom: '16px' }}>
        🔄 Redirecionando para LegalFlow
      </h2>
      <p style={{ color: '#6c757d', marginBottom: '16px' }}>
        Este componente não deveria aparecer. Redirecionando...
      </p>
      <button 
        onClick={() => window.location.href = '/'}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Ir para LegalFlow
      </button>
    </div>
  );
};

export default MyComponent;
