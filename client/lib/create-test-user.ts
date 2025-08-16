import { supabase, supabaseConfigured } from './supabase';

export async function createConfirmedTestUser() {
  if (!supabaseConfigured) {
    console.log('���� Skipping test user creation - Supabase not configured (using demo mode)');
    return false;
  }

  try {
    console.log('Creating confirmed test user for development...');
    
    // First, try to create the user normally
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: '123456',
      options: {
        data: {
          confirmed_at: new Date().toISOString() // Try to set as confirmed
        }
      }
    });

    if (error && !error.message.includes('User already registered')) {
      console.error('Failed to create test user:', error.message);
      return false;
    }

    console.log('Test user created or already exists');
    console.log('Email: test@example.com');
    console.log('Password: 123456');
    console.log('Note: You may need to manually confirm this email in the Supabase dashboard');
    
    return true;
  } catch (error: any) {
    console.error('Error creating confirmed test user:', error.message || error);
    return false;
  }
}

// Auto-run in development
if (import.meta.env.DEV) {
  createConfirmedTestUser();
}
