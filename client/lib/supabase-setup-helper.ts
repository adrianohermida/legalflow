import { supabase } from "./supabase";
import { createTablesWithAdmin, isAdminConfigured } from "./supabase-admin";

export interface DatabaseSetupResult {
  success: boolean;
  error?: string;
  details?: {
    tables_exist: boolean;
    tables_found: string[];
    setup_method: "automatic" | "manual_required";
    sql_script_location: string;
  };
}

export async function checkTablesExist(): Promise<{
  autofix_history: boolean;
  builder_prompts: boolean;
  both_exist: boolean;
}> {
  try {
    // Test autofix_history table
    const { error: historyError } = await supabase
      .from("autofix_history")
      .select("id")
      .limit(1);

    // Test builder_prompts table  
    const { error: promptsError } = await supabase
      .from("builder_prompts")
      .select("id")
      .limit(1);

    const historyExists = !historyError || !historyError.message.includes("does not exist");
    const promptsExists = !promptsError || !promptsError.message.includes("does not exist");

    return {
      autofix_history: historyExists,
      builder_prompts: promptsExists,
      both_exist: historyExists && promptsExists,
    };
  } catch (error) {
    console.error("Error checking tables:", error);
    return {
      autofix_history: false,
      builder_prompts: false,
      both_exist: false,
    };
  }
}

export async function createAutofixTables(): Promise<DatabaseSetupResult> {
  try {
    console.log("🔍 Verificando se as tabelas do autofix já existem...");

    // First, check if tables already exist
    const tablesStatus = await checkTablesExist();

    if (tablesStatus.both_exist) {
      return {
        success: true,
        details: {
          tables_exist: true,
          tables_found: ["autofix_history", "builder_prompts"],
          setup_method: "automatic",
          sql_script_location: "AUTOFIX_DATABASE_SETUP.sql",
        },
      };
    }

    console.log("📋 Tabelas não encontradas. Tentando setup automático...");

    // Try admin setup first if service role key is available
    if (isAdminConfigured) {
      console.log("🔧 Tentando criar tabelas com privilégios administrativos...");

      try {
        const adminResult = await createTablesWithAdmin();

        if (adminResult.success) {
          console.log("✅ Tabelas criadas com sucesso usando service role");

          return {
            success: true,
            details: {
              tables_exist: true,
              tables_found: ["autofix_history", "builder_prompts"],
              setup_method: "automatic",
              sql_script_location: "AUTOFIX_DATABASE_SETUP.sql",
              admin_setup: true,
            },
          };
        } else {
          console.warn("⚠️ Setup administrativo falhou:", adminResult.error);
        }
      } catch (adminError) {
        console.warn("⚠️ Erro no setup administrativo:", adminError);
      }
    }

    // Fallback: Try to test table existence using insert operation
    try {
      const testData = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: "autofix",
        module: "setup_test",
        description: "Test entry to verify table setup",
        changes: ["Setup verification"],
        success: true,
        context: { setup_test: true },
        metadata: { created_by: "autofix_setup" },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Try to insert test data - this will tell us if tables exist and are accessible
      const { error: insertError } = await supabase
        .from("autofix_history")
        .insert([testData]);

      if (insertError) {
        // Tables don't exist or we don't have permission
        console.log("⚠️ Não foi possível criar dados nas tabelas automaticamente");

        return {
          success: false,
          error: isAdminConfigured
            ? "As tabelas do autofix não existem. Execute o script SQL manualmente no Supabase SQL Editor."
            : "As tabelas do autofix não existem. Configure a service role key ou execute o script SQL manualmente.",
          details: {
            tables_exist: false,
            tables_found: [],
            setup_method: "manual_required",
            sql_script_location: "AUTOFIX_DATABASE_SETUP.sql",
            admin_configured: isAdminConfigured,
          },
        };
      }

      // If we got here, the table exists and we have permissions
      console.log("✅ Tabelas já existem e estão acessíveis");

      // Clean up test data
      await supabase
        .from("autofix_history")
        .delete()
        .eq("id", testData.id);

      return {
        success: true,
        details: {
          tables_exist: true,
          tables_found: ["autofix_history"],
          setup_method: "automatic",
          sql_script_location: "AUTOFIX_DATABASE_SETUP.sql",
        },
      };

    } catch (setupError) {
      console.error("Erro durante setup automático:", setupError);

      return {
        success: false,
        error: "Setup automático falhou. Use o SQL Editor do Supabase para executar o script.",
        details: {
          tables_exist: false,
          tables_found: [],
          setup_method: "manual_required",
          sql_script_location: "AUTOFIX_DATABASE_SETUP.sql",
          admin_configured: isAdminConfigured,
        },
      };
    }

  } catch (error) {
    return {
      success: false,
      error: `Erro na verificação do banco: ${error instanceof Error ? error.message : String(error)}`,
      details: {
        tables_exist: false,
        tables_found: [],
        setup_method: "manual_required",
        sql_script_location: "AUTOFIX_DATABASE_SETUP.sql",
        admin_configured: isAdminConfigured,
      },
    };
  }
}

export async function insertSampleData(): Promise<{ success: boolean; error?: string; inserted_count?: number }> {
  try {
    console.log("📊 Inserindo dados de exemplo...");

    // Check if we already have data
    const { data: existingData, error: checkError } = await supabase
      .from("autofix_history")
      .select("id")
      .limit(5);

    if (checkError) {
      return {
        success: false,
        error: `Erro ao verificar dados existentes: ${checkError.message}`,
      };
    }

    if (existingData && existingData.length > 0) {
      return {
        success: true,
        error: "Dados de exemplo já existem no banco",
        inserted_count: 0,
      };
    }

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
          git_commit: "abc123def",
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
          git_commit: "def456ghi",
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
      },
      {
        type: "builder_prompt",
        module: "setup_validation",
        description: "Teste inicial do sistema autofix com Builder.io",
        changes: [
          "Configurou credenciais da API",
          "Validou conexão com Builder.io",
          "Criou entrada de teste no histórico"
        ],
        success: true,
        context: {
          builder_prompt_id: crypto.randomUUID(),
        },
        metadata: {
          prompt: "Validate autofix system setup",
          category: "improvement",
          priority: "medium",
          api_keys_configured: true
        }
      }
    ];

    const { error, data } = await supabase
      .from("autofix_history")
      .insert(sampleData)
      .select();

    if (error) {
      return {
        success: false,
        error: `Erro ao inserir dados de exemplo: ${error.message}`,
      };
    }

    return {
      success: true,
      inserted_count: data?.length || sampleData.length,
    };

  } catch (error) {
    return {
      success: false,
      error: `Erro inesperado ao inserir dados: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function validateDatabaseSetup(): Promise<{
  success: boolean;
  message: string;
  details: {
    tables_accessible: boolean;
    sample_data_exists: boolean;
    can_insert: boolean;
    can_query: boolean;
    total_records?: number;
  };
}> {
  try {
    console.log("🔍 Validando setup completo do banco de dados...");

    const tablesStatus = await checkTablesExist();
    
    if (!tablesStatus.both_exist) {
      return {
        success: false,
        message: "Tabelas do autofix não encontradas no banco de dados",
        details: {
          tables_accessible: false,
          sample_data_exists: false,
          can_insert: false,
          can_query: false,
        },
      };
    }

    // Test querying
    const { data: queryData, error: queryError } = await supabase
      .from("autofix_history")
      .select("*")
      .limit(10);

    const canQuery = !queryError;
    const totalRecords = queryData?.length || 0;
    const sampleDataExists = totalRecords > 0;

    // Test inserting
    const testEntry = {
      type: "manual",
      module: "validation",
      description: "Teste de validação do sistema",
      changes: ["Teste de inserção"],
      success: true,
      context: { validation: true },
      metadata: { test_timestamp: new Date().toISOString() },
    };

    const { error: insertError, data: insertData } = await supabase
      .from("autofix_history")
      .insert([testEntry])
      .select();

    const canInsert = !insertError;

    // Clean up test entry
    if (canInsert && insertData && insertData[0]) {
      await supabase
        .from("autofix_history")
        .delete()
        .eq("id", insertData[0].id);
    }

    const allWorking = canQuery && canInsert;

    return {
      success: allWorking,
      message: allWorking 
        ? "Sistema de banco de dados totalmente funcional"
        : "Problemas detectados no acesso ao banco de dados",
      details: {
        tables_accessible: tablesStatus.both_exist,
        sample_data_exists: sampleDataExists,
        can_insert: canInsert,
        can_query: canQuery,
        total_records: totalRecords,
      },
    };

  } catch (error) {
    return {
      success: false,
      message: `Erro na validação: ${error instanceof Error ? error.message : String(error)}`,
      details: {
        tables_accessible: false,
        sample_data_exists: false,
        can_insert: false,
        can_query: false,
      },
    };
  }
}

// Helper function to generate setup instructions
export function getSetupInstructions(): {
  step1: string;
  step2: string;
  step3: string;
  sql_file: string;
  verification: string;
} {
  return {
    step1: "1. Abra o Supabase Dashboard e acesse o SQL Editor",
    step2: "2. Copie todo o conteúdo do arquivo /AUTOFIX_DATABASE_SETUP.sql",
    step3: "3. Execute o script completo no SQL Editor",
    sql_file: "AUTOFIX_DATABASE_SETUP.sql",
    verification: "4. Volte aqui e clique em 'Run All Tests' para verificar",
  };
}
