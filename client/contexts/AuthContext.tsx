import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface Advogado {
  oab: number;
  nome: string;
  uf: string;
}

interface User {
  id: string;
  email: string;
  oab?: number;
  advogado?: Advogado;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectOAB: (oab: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          await loadUserData(session.user);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadUserData(session.user);
        } else {
          setUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (supabaseUser: SupabaseUser) => {
    try {
      // Try to find linked OAB
      const { data: userAdvogado } = await supabase
        .from('user_advogado')
        .select(`
          oab,
          advogados (
            oab,
            nome,
            uf
          )
        `)
        .eq('user_id', supabaseUser.id)
        .single();

      const userData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        oab: userAdvogado?.oab,
        advogado: userAdvogado?.advogados ? {
          oab: userAdvogado.advogados.oab,
          nome: userAdvogado.advogados.nome || '',
          uf: userAdvogado.advogados.uf || ''
        } : undefined
      };

      setUser(userData);
    } catch (error) {
      console.error('Failed to load user data:', error);
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || ''
      });
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Login failed:', error);
      throw new Error(error.message || 'Falha no login');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout failed:', error);
    }
    setUser(null);
  };

  const selectOAB = async (oab: number) => {
    if (!user) return;

    try {
      // First check if advogado exists
      const { data: advogado } = await supabase
        .from('advogados')
        .select('*')
        .eq('oab', oab)
        .single();

      if (!advogado) {
        throw new Error('Advogado não encontrado com este número OAB');
      }

      // Create or update user_advogado link
      const { error } = await supabase
        .from('user_advogado')
        .upsert({
          user_id: user.id,
          oab: oab
        });

      if (error) throw error;

      // Update local user state
      const updatedUser = {
        ...user,
        oab,
        advogado: {
          oab: advogado.oab,
          nome: advogado.nome || '',
          uf: advogado.uf || ''
        }
      };

      setUser(updatedUser);
    } catch (error: any) {
      console.error('OAB selection failed:', error);
      throw new Error(error.message || 'Falha ao vincular OAB');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      login,
      logout,
      selectOAB
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
