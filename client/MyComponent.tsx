// BUILDER.IO EMERGENCY FIX - COMPLETE REMOVAL
// This file exists only to prevent Builder.io from generating placeholder code

// Immediate redirect in Builder.io environment
if (typeof window !== 'undefined') {
  const isBuilderEnv = window.location.hostname.includes('builder.codes') || 
                       window.location.hostname.includes('fly.dev') ||
                       window.location.hostname.includes('builder.io');
  
  if (isBuilderEnv) {
    console.log('🚨 Builder.io environment detected - redirecting immediately');
    window.location.replace(window.location.origin + '/');
  }
}

// Return absolutely nothing to prevent any text rendering
const MyComponent = () => null;

export default MyComponent;
