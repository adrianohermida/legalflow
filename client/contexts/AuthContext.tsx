import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase, supabaseConfigured } from "../lib/supabase";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface OABSupplementar {
  numero: string;
  uf: string;
}

interface Advogado {
  oab: number;
  nome: string;
  uf: string;
  sociedade?: string;
  oab_suplementares?: OABSupplementar[];
}

interface User {
  id: string;
  email: string;
  oab?: number;
  advogado?: Advogado;
  role?: "superadmin" | "admin" | "advogado" | "cliente";
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  selectOAB: (oab: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Failsafe: Ensure loading never gets stuck
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn("Auth loading timeout - forcing loading to false");
        setIsLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading]);

  useEffect(() => {
    // Don't try to authenticate if Supabase is not configured
    if (!supabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // Check for existing session with timeout
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          await loadUserData(session.user);
        }
      } catch (error: any) {
        console.error("Auth check failed:", error.message || error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserData(session.user);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (supabaseUser: SupabaseUser) => {
    try {
      // Try to find linked OAB
      const { data: userAdvogado } = await supabase
        .from("user_advogado")
        .select(
          `
          oab,
          advogados (
            oab,
            nome,
            uf
          )
        `,
        )
        .eq("user_id", supabaseUser.id)
        .single();

      // Determine user role
      let role: User["role"] = "cliente"; // Default role

      // Check for superadmin
      if (supabaseUser.email === "adrianohermida@gmail.com") {
        role = "superadmin";
      } else if (userAdvogado?.oab) {
        role = "advogado";
      }

      // Special handling for superadmin
      let advogadoData: Advogado | undefined;
      let oabNumber: number | undefined;

      if (role === "superadmin") {
        oabNumber = 8894; // OAB principal do superadmin
        advogadoData = {
          oab: 8894,
          nome: "Adriano Hermida Maia",
          uf: "AM",
          sociedade: "HERMIDA MAIA SOCIEDADE INDIVIDUAL DE ADVOCACIA",
          oab_suplementares: [
            { numero: "476963", uf: "SP" },
            { numero: "107048", uf: "RS" },
            { numero: "075394", uf: "DF" },
          ],
        };
      } else if (userAdvogado?.advogados?.[0]) {
        oabNumber = userAdvogado.oab;
        advogadoData = {
          oab: userAdvogado.advogados[0].oab,
          nome: userAdvogado.advogados[0].nome || "",
          uf: userAdvogado.advogados[0].uf || "",
        };
      }

      const userData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        oab: oabNumber,
        advogado: advogadoData,
        role,
      };

      setUser(userData);
    } catch (error: any) {
      console.error("Failed to load user data:", error.message || error);
      // Determine role for fallback case too
      let fallbackRole: User["role"] = "cliente";
      let fallbackData: Partial<User> = {};

      if (supabaseUser.email === "adrianohermida@gmail.com") {
        fallbackRole = "superadmin";
        fallbackData = {
          oab: 8894,
          advogado: {
            oab: 8894,
            nome: "Adriano Hermida Maia",
            uf: "AM",
            sociedade: "HERMIDA MAIA SOCIEDADE INDIVIDUAL DE ADVOCACIA",
            oab_suplementares: [
              { numero: "476963", uf: "SP" },
              { numero: "107048", uf: "RS" },
              { numero: "075394", uf: "DF" },
            ],
          },
        };
      }

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email || "",
        role: fallbackRole,
        ...fallbackData,
      });
    }
  };

  const login = async (email: string, password: string) => {
    if (!supabaseConfigured) {
      throw new Error(
        "Supabase não está configurado. Configure as credenciais do banco de dados.",
      );
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Login failed:", error);

      // Handle specific error types
      if (
        error.message?.includes("Failed to fetch") ||
        error.name?.includes("AuthRetryableFetchError")
      ) {
        throw new Error(
          "Erro de conexão com o banco de dados. Verifique se as credenciais do Supabase estão configuradas corretamente.",
        );
      }

      if (error.message?.includes("Invalid login credentials")) {
        throw new Error("Email ou senha incorretos");
      }

      if (error.message?.includes("Email not confirmed")) {
        // In development, try to create and auto-login the user
        if (import.meta.env.DEV) {
          console.log(
            "Development mode: attempting to create confirmed user...",
          );
          try {
            // For development, we'll show a helpful error instead of trying complex workarounds
            throw new Error(
              "Conta criada mas email não confirmado. Soluções:\n• Acesse o painel do Supabase e confirme o email manualmente\n• Ou use a conta de teste: test@example.com / 123456",
            );
          } catch (devError) {
            throw devError;
          }
        } else {
          throw new Error(
            "Email não confirmado. Verifique seu email e clique no link de confirmação.",
          );
        }
      }

      throw new Error(error.message || "Falha no login");
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string) => {
    if (!supabaseConfigured) {
      throw new Error(
        "Supabase não está configurado. Configure as credenciais do banco de dados.",
      );
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      console.error("Signup failed:", error);

      if (error.message?.includes("User already registered")) {
        throw new Error("Usuário já cadastrado com este email");
      }

      if (error.message?.includes("email confirmation")) {
        throw new Error(
          "Conta criada! Verifique seu email para confirmar a conta antes de fazer login.",
        );
      }

      throw new Error(error.message || "Falha no cadastro");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error.message || error);
    }
    setUser(null);
  };

  const selectOAB = async (oab: number) => {
    if (!user) return;

    try {
      // First check if advogado exists
      const { data: advogado } = await supabase
        .from("advogados")
        .select("*")
        .eq("oab", oab)
        .single();

      if (!advogado) {
        throw new Error("Advogado não encontrado com este número OAB");
      }

      // Create or update user_advogado link
      const { error } = await supabase.from("user_advogado").upsert({
        user_id: user.id,
        oab: oab,
      });

      if (error) throw error;

      // Update local user state
      const updatedUser = {
        ...user,
        oab,
        advogado: {
          oab: advogado.oab,
          nome: advogado.nome || "",
          uf: advogado.uf || "",
        },
      };

      setUser(updatedUser);
    } catch (error: any) {
      console.error("OAB selection failed:", error);
      throw new Error(error.message || "Falha ao vincular OAB");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        selectOAB,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
