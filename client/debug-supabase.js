// Debug script to test Supabase connection
import { supabase, supabaseConfigured } from './lib/supabase.js';

console.log('=== SUPABASE DEBUG ===');
console.log('Configured:', supabaseConfigured);
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key length:', import.meta.env.VITE_SUPABASE_ANON_KEY?.length);

if (supabaseConfigured) {
  console.log('Testing Supabase connection...');
  try {
    const { data, error } = await supabase.auth.getSession();
    console.log('Session check:', { hasSession: !!data.session, error });
  } catch (err) {
    console.error('Session check failed:', err);
  }
}
