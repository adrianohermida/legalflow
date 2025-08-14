import { createClient } from "@supabase/supabase-js";

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || "";

// Create admin client with service role key for database administration
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Check if admin client is properly configured
export const isAdminConfigured = !!(supabaseUrl && supabaseServiceRoleKey);

// Log configuration status
console.log("🔧 Supabase Admin Configuration:", {
  url: supabaseUrl ? "Configured" : "Missing",
  serviceKey: supabaseServiceRoleKey ? "Configured" : "Missing",
  isReady: isAdminConfigured
});

// Function to create tables directly with admin client
export async function createTableDirectly(tableName: string, tableSQL: string): Promise<{ success: boolean; error?: string }> {
  if (!isAdminConfigured) {
    return {
      success: false,
      error: "Admin client not configured. Missing URL or service role key."
    };
  }

  try {
    console.log(`🔧 Creating table ${tableName} with admin client...`);

    // Use the admin client to create table by attempting operations
    // that would fail if the table doesn't exist, then handle the error

    // First try to select from the table to see if it exists
    const { error: selectError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .limit(1);

    if (selectError && selectError.message.includes("does not exist")) {
      // Table doesn't exist, which is expected
      console.log(`📋 Table ${tableName} doesn't exist, setup required`);
      return {
        success: false,
        error: `Table ${tableName} doesn't exist. Manual SQL execution required.`
      };
    } else if (selectError) {
      // Other error
      return {
        success: false,
        error: selectError.message || "Unknown error checking table"
      };
    } else {
      // Table exists
      console.log(`✅ Table ${tableName} already exists`);
      return {
        success: true
      };
    }

  } catch (error) {
    console.error(`❌ Error checking table ${tableName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Function to verify tables with admin privileges
export async function createTablesWithAdmin(): Promise<{ success: boolean; error?: string; details?: any }> {
  if (!isAdminConfigured) {
    return {
      success: false,
      error: "Service role key não configurada. Configure VITE_SUPABASE_SERVICE_ROLE_KEY.",
      details: { admin_configured: false }
    };
  }

  try {
    console.log("🚀 Verificando tabelas com privilégios administrativos...");

    // Check if tables exist using admin client
    const historyResult = await createTableDirectly("autofix_history", "");
    const promptsResult = await createTableDirectly("builder_prompts", "");

    console.log("📊 Resultados da verificação:", { historyResult, promptsResult });

    // If both tables exist, we're good
    if (historyResult.success && promptsResult.success) {
      return {
        success: true,
        details: {
          tables_verified: ["autofix_history", "builder_prompts"],
          admin_access: true,
          message: "Tabelas verificadas com sucesso usando service role"
        }
      };
    }

    // If tables don't exist, recommend manual setup
    return {
      success: false,
      error: "Tabelas não encontradas. Execute o script SQL manualmente no Supabase SQL Editor.",
      details: {
        admin_configured: true,
        history_exists: historyResult.success,
        prompts_exists: promptsResult.success,
        recommendation: "Execute AUTOFIX_DATABASE_SETUP.sql no SQL Editor"
      }
    };

  } catch (error) {
    return {
      success: false,
      error: `Erro na verificação: ${error instanceof Error ? error.message : String(error)}`,
      details: { admin_configured: isAdminConfigured }
    };
  }
}
