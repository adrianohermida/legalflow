import { supabase } from "./supabase";

export async function setupAutofixTables() {
  try {
    // Create autofix_history table
    const { error: historyTableError } = await supabase.rpc("create_autofix_history_table");
    
    if (historyTableError) {
      console.warn("Autofix history table might already exist:", historyTableError);
    }

    // Create builder_prompts table for tracking Builder.io integration
    const { error: promptsTableError } = await supabase.rpc("create_builder_prompts_table");
    
    if (promptsTableError) {
      console.warn("Builder prompts table might already exist:", promptsTableError);
    }

    // Create indexes for better performance
    const { error: indexError } = await supabase.rpc("create_autofix_indexes");
    
    if (indexError) {
      console.warn("Autofix indexes might already exist:", indexError);
    }

    console.log("Autofix database setup completed successfully");
    return true;
  } catch (error) {
    console.error("Failed to setup autofix tables:", error);
    return false;
  }
}

// SQL scripts that should be run in Supabase to create the necessary tables
export const AUTOFIX_SQL_SCRIPTS = {
  CREATE_HISTORY_TABLE: `
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
  `,

  CREATE_BUILDER_PROMPTS_TABLE: `
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
  `,

  CREATE_INDEXES: `
    CREATE INDEX IF NOT EXISTS idx_autofix_history_timestamp ON autofix_history(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_autofix_history_type ON autofix_history(type);
    CREATE INDEX IF NOT EXISTS idx_autofix_history_module ON autofix_history(module);
    CREATE INDEX IF NOT EXISTS idx_autofix_history_success ON autofix_history(success);
    CREATE INDEX IF NOT EXISTS idx_builder_prompts_status ON builder_prompts(status);
    CREATE INDEX IF NOT EXISTS idx_builder_prompts_created_at ON builder_prompts(created_at DESC);
  `,

  CREATE_RPC_FUNCTIONS: `
    -- Function to create autofix history table
    CREATE OR REPLACE FUNCTION create_autofix_history_table()
    RETURNS void AS $$
    BEGIN
      ${AUTOFIX_SQL_SCRIPTS.CREATE_HISTORY_TABLE}
    END;
    $$ LANGUAGE plpgsql;

    -- Function to create builder prompts table
    CREATE OR REPLACE FUNCTION create_builder_prompts_table()
    RETURNS void AS $$
    BEGIN
      ${AUTOFIX_SQL_SCRIPTS.CREATE_BUILDER_PROMPTS_TABLE}
    END;
    $$ LANGUAGE plpgsql;

    -- Function to create indexes
    CREATE OR REPLACE FUNCTION create_autofix_indexes()
    RETURNS void AS $$
    BEGIN
      ${AUTOFIX_SQL_SCRIPTS.CREATE_INDEXES}
    END;
    $$ LANGUAGE plpgsql;

    -- Function to get autofix statistics
    CREATE OR REPLACE FUNCTION get_autofix_stats()
    RETURNS JSONB AS $$
    DECLARE
      result JSONB;
    BEGIN
      SELECT jsonb_build_object(
        'total_modifications', (SELECT COUNT(*) FROM autofix_history),
        'successful_modifications', (SELECT COUNT(*) FROM autofix_history WHERE success = true),
        'failed_modifications', (SELECT COUNT(*) FROM autofix_history WHERE success = false),
        'modifications_by_type', (
          SELECT jsonb_object_agg(type, count)
          FROM (
            SELECT type, COUNT(*) as count
            FROM autofix_history
            GROUP BY type
          ) counts
        ),
        'recent_activity', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', id,
              'timestamp', timestamp,
              'type', type,
              'module', module,
              'description', description,
              'success', success
            )
          )
          FROM (
            SELECT id, timestamp, type, module, description, success
            FROM autofix_history
            ORDER BY timestamp DESC
            LIMIT 10
          ) recent
        )
      ) INTO result;
      
      RETURN result;
    END;
    $$ LANGUAGE plpgsql;

    -- Function to clean old autofix history (keep last 1000 entries)
    CREATE OR REPLACE FUNCTION cleanup_autofix_history()
    RETURNS INTEGER AS $$
    DECLARE
      deleted_count INTEGER;
    BEGIN
      WITH oldest_entries AS (
        SELECT id
        FROM autofix_history
        ORDER BY timestamp DESC
        OFFSET 1000
      )
      DELETE FROM autofix_history
      WHERE id IN (SELECT id FROM oldest_entries);
      
      GET DIAGNOSTICS deleted_count = ROW_COUNT;
      RETURN deleted_count;
    END;
    $$ LANGUAGE plpgsql;
  `,
};

// Initialize the database setup when this module is imported
export async function initializeAutofixDatabase() {
  console.log("Initializing autofix database setup...");
  
  // First check if we can access Supabase
  try {
    const { error } = await supabase.from("autofix_history").select("id").limit(1);
    
    if (error && error.message.includes("relation") && error.message.includes("does not exist")) {
      console.log("Autofix tables don't exist, setting up...");
      await setupAutofixTables();
    } else if (!error) {
      console.log("Autofix tables already exist and accessible");
    }
  } catch (error) {
    console.warn("Could not verify autofix tables:", error);
  }
}
