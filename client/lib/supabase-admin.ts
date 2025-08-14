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

// Function to create tables with admin privileges
export async function createTablesWithAdmin(): Promise<{ success: boolean; error?: string; details?: any }> {
  if (!isAdminConfigured) {
    return {
      success: false,
      error: "Service role key não configurada. Configure VITE_SUPABASE_SERVICE_ROLE_KEY.",
      details: { admin_configured: false }
    };
  }

  const createHistoryTableSQL = `
    CREATE TABLE IF NOT EXISTS autofix_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      type TEXT NOT NULL CHECK (type IN ('autofix', 'manual', 'builder_prompt', 'git_import')),
      module TEXT NOT NULL,
      description TEXT NOT NULL,
      changes JSONB NOT NULL DEFAULT '[]'::jsonb,
      success BOOLEAN NOT NULL DEFAULT false,
      context JSONB DEFAULT '{}'::jsonb,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  const createBuilderPromptsTableSQL = `
    CREATE TABLE IF NOT EXISTS builder_prompts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prompt TEXT NOT NULL,
      context TEXT,
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
      category TEXT NOT NULL CHECK (category IN ('bug_fix', 'feature', 'improvement', 'refactor')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      result JSONB DEFAULT '{}'::jsonb,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    );
  `;

  const createIndexesSQL = `
    CREATE INDEX IF NOT EXISTS idx_autofix_history_timestamp ON autofix_history(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_autofix_history_type ON autofix_history(type);
    CREATE INDEX IF NOT EXISTS idx_autofix_history_module ON autofix_history(module);
    CREATE INDEX IF NOT EXISTS idx_autofix_history_success ON autofix_history(success);
    CREATE INDEX IF NOT EXISTS idx_builder_prompts_status ON builder_prompts(status);
    CREATE INDEX IF NOT EXISTS idx_builder_prompts_created_at ON builder_prompts(created_at DESC);
  `;

  try {
    console.log("🚀 Creating autofix tables with admin privileges...");

    // Try to execute each SQL statement
    const historyResult = await executeAdminSQL(createHistoryTableSQL);
    const promptsResult = await executeAdminSQL(createBuilderPromptsTableSQL);
    const indexesResult = await executeAdminSQL(createIndexesSQL);

    const results = { historyResult, promptsResult, indexesResult };
    const hasErrors = !historyResult.success || !promptsResult.success || !indexesResult.success;

    if (hasErrors) {
      return {
        success: false,
        error: "Algumas operações falharam. Verifique os detalhes.",
        details: results
      };
    }

    return {
      success: true,
      details: { 
        tables_created: ["autofix_history", "builder_prompts"],
        indexes_created: true,
        results
      }
    };

  } catch (error) {
    return {
      success: false,
      error: `Erro inesperado: ${error instanceof Error ? error.message : String(error)}`,
      details: { admin_configured: isAdminConfigured }
    };
  }
}
