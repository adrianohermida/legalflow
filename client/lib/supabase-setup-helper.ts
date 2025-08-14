import { supabase } from "./supabase";

export async function createAutofixTables(): Promise<{ success: boolean; error?: string }> {
  try {
    // SQL para criar as tabelas diretamente
    const createHistoryTable = `
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

    const createBuilderPromptsTable = `
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

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_autofix_history_timestamp ON autofix_history(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_autofix_history_type ON autofix_history(type);
      CREATE INDEX IF NOT EXISTS idx_autofix_history_module ON autofix_history(module);
      CREATE INDEX IF NOT EXISTS idx_autofix_history_success ON autofix_history(success);
      CREATE INDEX IF NOT EXISTS idx_builder_prompts_status ON builder_prompts(status);
      CREATE INDEX IF NOT EXISTS idx_builder_prompts_created_at ON builder_prompts(created_at DESC);
    `;

    // Tentar executar os SQLs via RPC
    const { error: historyError } = await supabase.rpc('sql', { 
      query: createHistoryTable 
    });

    if (historyError) {
      console.warn("Could not create autofix_history table via RPC:", historyError);
    }

    const { error: promptsError } = await supabase.rpc('sql', { 
      query: createBuilderPromptsTable 
    });

    if (promptsError) {
      console.warn("Could not create builder_prompts table via RPC:", promptsError);
    }

    const { error: indexError } = await supabase.rpc('sql', { 
      query: createIndexes 
    });

    if (indexError) {
      console.warn("Could not create indexes via RPC:", indexError);
    }

    // Verificar se as tabelas existem agora
    const { error: verifyError } = await supabase
      .from("autofix_history")
      .select("id")
      .limit(1);

    if (verifyError && verifyError.message.includes("relation") && verifyError.message.includes("does not exist")) {
      return {
        success: false,
        error: "Não foi possível criar as tabelas via interface. Use o SQL Editor do Supabase.",
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function insertSampleData(): Promise<{ success: boolean; error?: string }> {
  try {
    const sampleData = [
      {
        type: "git_import",
        module: "repository",
        description: "Git commit: feat: Implement office modules reorganization",
        changes: [
          "Modified client/components/Sidebar.tsx",
          "Modified client/components/OfficeModulesWindow.tsx",
          "Modified client/components/AppShell.tsx"
        ],
        success: true,
        context: {
          git_commit: "abc123",
          files_modified: [
            "client/components/Sidebar.tsx",
            "client/components/OfficeModulesWindow.tsx",
            "client/components/AppShell.tsx"
          ]
        },
        metadata: {
          author: "Adriano Hermida Maia",
          commit_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          additions: 354,
          deletions: 73
        }
      },
      {
        type: "git_import",
        module: "repository",
        description: "Git commit: fix: Resolve Label import error in InboxLegalV2",
        changes: ["Modified client/pages/InboxLegalV2.tsx"],
        success: true,
        context: {
          git_commit: "def456",
          files_modified: ["client/pages/InboxLegalV2.tsx"]
        },
        metadata: {
          author: "Adriano Hermida Maia",
          commit_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          additions: 1,
          deletions: 0
        }
      },
      {
        type: "autofix",
        module: "error_handling",
        description: "Correção automática de erros de logging",
        changes: [
          "Melhorou logging de erros para mostrar mensagens detalhadas",
          "Adicionou verificação de tabelas do banco",
          "Implementou fallback para tabelas ausentes"
        ],
        success: true,
        context: {
          patch_code: "error_logging_fix"
        },
        metadata: {
          execution_time_ms: 1250,
          affected_modules: ["autofix-history", "AutofixHistoryPanel"]
        }
      }
    ];

    const { error } = await supabase
      .from("autofix_history")
      .insert(sampleData);

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
