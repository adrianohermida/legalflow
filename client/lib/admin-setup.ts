// Admin setup utility to create confirmed test users
// This runs in development to ensure we have working test accounts

import { supabase, supabaseConfigured } from './supabase';

export const adminSetup = {
  async createConfirmedTestUser() {
    if (!supabaseConfigured) {
      console.log('Skipping admin setup - Supabase not configured');
      return;
    }

    try {
      console.log('🔧 Setting up test user for development...');
      
      // Create the test user
      const testUsers = [
        { email: 'admin@test.com', password: '123456' },
        { email: 'test@example.com', password: '123456' },
        { email: 'dev@localhost.com', password: '123456' }
      ];

      for (const user of testUsers) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email: user.email,
            password: user.password
          });

          if (error && !error.message.includes('User already registered')) {
            console.warn(`Failed to create ${user.email}:`, error.message);
          } else {
            console.log(`✅ Test user ${user.email} created or exists`);
          }
        } catch (err) {
          console.warn(`Error with ${user.email}:`, err);
        }
      }

      console.log('📧 Remember: You need to manually confirm emails in Supabase Dashboard');
      console.log('🔗 Go to: https://supabase.com/dashboard/project/zqxpvajhzgirgciucwxl/auth/users');
      
    } catch (error: any) {
    console.error('Admin setup failed:', error.message || error);
    }
  },

  async listUsers() {
    try {
      // This won't work from frontend, but useful for debugging
      console.log('Use Supabase Dashboard to view users');
    } catch (error) {
      console.error('Cannot list users from frontend');
    }
  }
};

// Auto-run in development
if (import.meta.env.DEV) {
  adminSetup.createConfirmedTestUser();
}
