// EMERGENCY FIX - IMMEDIATE REDIRECT
if (typeof window !== 'undefined') {
  console.log('🚨 MyComponent detected - IMMEDIATE REDIRECT');
  window.location.replace('/');
}

// Fallback export (should never be used)
export default function MyComponent() {
  return null;
}
