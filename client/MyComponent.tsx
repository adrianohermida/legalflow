// CRITICAL FIX - PREVENT TEXT RENDERING
// This file should NEVER render as text

// Immediate browser redirect if this executes as JS
if (typeof window !== 'undefined') {
  console.log('🚨 MyComponent executing - immediate redirect');
  window.location.replace('/');
  throw new Error('MyComponent should not execute');
}

// If somehow this gets called as React component, return nothing
export default function MyComponent() {
  // Force immediate redirect
  if (typeof window !== 'undefined') {
    window.location.replace('/');
  }
  return null;
}

// Additional export variations to catch any reference
export { MyComponent };
export const MyComponentFix = MyComponent;
