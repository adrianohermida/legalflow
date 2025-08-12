import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Advogado {
  oab: string;
  nome: string;
  uf: string;
}

interface User {
  id: string;
  email: string;
  oab?: string;
  advogado?: Advogado;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectOAB: (oab: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for existing session
    const checkAuth = async () => {
      try {
        // In a real app, this would check Supabase session
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Mock login - in real app would use Supabase
      const mockUser: User = {
        id: '1',
        email,
        // Some users might not have OAB linked yet
        oab: email === 'admin@example.com' ? undefined : '123456/SP',
        advogado: email === 'admin@example.com' ? undefined : {
          oab: '123456/SP',
          nome: 'Dr. João Silva',
          uf: 'SP'
        }
      };
      
      setUser(mockUser);
      localStorage.setItem('user', JSON.stringify(mockUser));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const selectOAB = async (oab: string) => {
    if (!user) return;
    
    // Mock OAB selection - in real app would update Supabase
    const mockAdvogado: Advogado = {
      oab,
      nome: 'Dr. João Silva',
      uf: 'SP'
    };

    const updatedUser = {
      ...user,
      oab,
      advogado: mockAdvogado
    };

    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
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
