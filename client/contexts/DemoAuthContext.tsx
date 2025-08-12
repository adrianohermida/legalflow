import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

interface DemoAuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectOAB: (oab: number) => Promise<void>;
  isDemoMode: boolean;
}

const DemoAuthContext = createContext<DemoAuthContextType | undefined>(undefined);

export function DemoAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isDemoMode = true; // Always demo mode

  // Demo users database
  const demoUsers = [
    { email: 'admin.test@gmail.com', password: '123456', id: 'demo-1' },
    { email: 'user.test@gmail.com', password: '123456', id: 'demo-2' },
    { email: 'demo@test.com', password: '123456', id: 'demo-3' }
  ];

  // Demo lawyers database
  const demoAdvogados = [
    { oab: 123456, nome: 'Dr. Adriano Hermida Maia', uf: 'SP' },
    { oab: 654321, nome: 'Dra. Maria Santos', uf: 'SP' },
    { oab: 789012, nome: 'Dr. João Silva', uf: 'RJ' }
  ];

  useEffect(() => {
    // Check for saved demo session
    const savedUser = localStorage.getItem('demo-user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const demoUser = demoUsers.find(u => u.email === email && u.password === password);
      
      if (!demoUser) {
        throw new Error('Email ou senha incorretos');
      }

      const userData: User = {
        id: demoUser.id,
        email: demoUser.email
      };

      setUser(userData);
      localStorage.setItem('demo-user', JSON.stringify(userData));
      
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string) => {
    setIsLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      const existingUser = demoUsers.find(u => u.email === email);
      
      if (existingUser) {
        throw new Error('Usuário já cadastrado com este email');
      }

      // In demo mode, just add to our demo users array (temporarily)
      const newUser = { email, password, id: `demo-${Date.now()}` };
      demoUsers.push(newUser);
      
      // Don't auto-login, let them login manually
      console.log('Demo user created:', email);
      
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('demo-user');
  };

  const selectOAB = async (oab: number) => {
    if (!user) return;

    setIsLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const advogado = demoAdvogados.find(a => a.oab === oab);
      
      if (!advogado) {
        throw new Error('Advogado não encontrado com este número OAB');
      }

      const updatedUser = {
        ...user,
        oab: oab,
        advogado: advogado
      };

      setUser(updatedUser);
      localStorage.setItem('demo-user', JSON.stringify(updatedUser));
      
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DemoAuthContext.Provider value={{
      user,
      isLoading,
      login,
      signup,
      logout,
      selectOAB,
      isDemoMode
    }}>
      {children}
    </DemoAuthContext.Provider>
  );
}

export function useDemoAuth() {
  const context = useContext(DemoAuthContext);
  if (context === undefined) {
    throw new Error('useDemoAuth must be used within a DemoAuthProvider');
  }
  return context;
}
