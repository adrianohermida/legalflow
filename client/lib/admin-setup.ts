// Admin setup utility to create confirmed test users
// This runs in development to ensure we have working test accounts

import { supabase, supabaseConfigured } from "./supabase";

export const adminSetup = {
  async createConfirmedTestUser() {
    if (!supabaseConfigured) {
      console.log("Skipping admin setup - Supabase not configured");
      return;
    }

    try {
      // First check if we can connect to Supabase
      const connectionTest = await supabase
        .from("clientes")
        .select("cpfcnpj")
        .limit(1);

      if (connectionTest.error) {
        console.log(
          "Skipping admin setup - Supabase connection failed:",
          connectionTest.error.message,
        );
        return;
      }

      console.log("🔧 Setting up test user for development...");

      // Create the superadmin user with specific data
      const superadmin = {
        email: "adrianohermida@gmail.com",
        password: "HermidaMaia123!",
        role: "superadmin",
        profile: {
          oab_principal: "008894",
          uf_principal: "AM",
          oab_suplementares: [
            { numero: "476963", uf: "SP" },
            { numero: "107048", uf: "RS" },
            { numero: "075394", uf: "DF" },
          ],
          nome_sociedade: "HERMIDA MAIA SOCIEDADE INDIVIDUAL DE ADVOCACIA",
          nome_completo: "Adriano Hermida Maia",
        },
      };

      // Create additional test users
      const testUsers = [
        { email: "admin@test.com", password: "123456" },
        { email: "test@example.com", password: "123456" },
        { email: "dev@localhost.com", password: "123456" },
      ];

      // First, create the superadmin
      try {
        const { data: superadminData, error: superadminError } =
          await supabase.auth.signUp({
            email: superadmin.email,
            password: superadmin.password,
            options: {
              data: {
                role: superadmin.role,
                oab_principal: superadmin.profile.oab_principal,
                uf_principal: superadmin.profile.uf_principal,
                oab_suplementares: JSON.stringify(
                  superadmin.profile.oab_suplementares,
                ),
                nome_sociedade: superadmin.profile.nome_sociedade,
                nome_completo: superadmin.profile.nome_completo,
              },
            },
          });

        if (
          superadminError &&
          !superadminError.message.includes("User already registered")
        ) {
          console.warn(
            `Failed to create superadmin ${superadmin.email}:`,
            superadminError.message,
          );
        } else {
          console.log(
            `✅ Superadmin ${superadmin.email} created or exists with complete profile`,
          );
          console.log(
            `📋 OAB Principal: ${superadmin.profile.oab_principal}/${superadmin.profile.uf_principal}`,
          );
          console.log(
            `📋 OAB Suplementares: ${superadmin.profile.oab_suplementares.map((s) => `${s.numero}/${s.uf}`).join(", ")}`,
          );
          console.log(`🏢 Sociedade: ${superadmin.profile.nome_sociedade}`);
        }
      } catch (err) {
        console.warn(`Error creating superadmin:`, err);
      }

      // Then create test users
      for (const user of testUsers) {
        try {
          const { data, error } = await supabase.auth.signUp({
            email: user.email,
            password: user.password,
          });

          if (error && !error.message.includes("User already registered")) {
            console.warn(`Failed to create ${user.email}:`, error.message);
          } else {
            console.log(`✅ Test user ${user.email} created or exists`);
          }
        } catch (err) {
          console.warn(`Error with ${user.email}:`, err);
        }
      }

      console.log(
        "📧 Remember: You need to manually confirm emails in Supabase Dashboard",
      );
      console.log(
        "🔗 Go to: https://supabase.com/dashboard/project/zqxpvajhzgirgciucwxl/auth/users",
      );
    } catch (error: any) {
      console.log("Admin setup failed:", error.message || error);
    }
  },

  async listUsers() {
    try {
      // This won't work from frontend, but useful for debugging
      console.log("Use Supabase Dashboard to view users");
    } catch (error) {
      console.error("Cannot list users from frontend");
    }
  },
};

// Auto-run in development with error handling
if (import.meta.env.DEV && supabaseConfigured) {
  // Add delay to let app initialize
  setTimeout(() => {
    try {
      adminSetup.createConfirmedTestUser().catch((error) => {
        console.log(
          "Admin setup skipped due to connection issues:",
          error.message || error,
        );
      });
    } catch (error) {
      console.log("Admin setup could not start:", error);
    }
  }, 3000); // Increased delay to let app fully initialize
}
