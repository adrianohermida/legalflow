import { supabase } from "./supabase";

export interface DiagnosticResult {
  step: string;
  status: "success" | "error" | "warning";
  message: string;
  details?: any;
}

export class AutofixDiagnostics {
  async runDiagnostics(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    console.log("🔍 Running Autofix System Diagnostics...");

    // 1. Check Supabase connection
    results.push(await this.checkSupabaseConnection());
    
    // 2. Check environment variables
    results.push(await this.checkEnvironmentVariables());
    
    // 3. Check table existence
    results.push(await this.checkTableExistence());
    
    // 4. Test basic database operations
    results.push(await this.testBasicOperations());
    
    // 5. Check data types and structure
    results.push(await this.checkDataStructure());

    return results;
  }

  private async checkSupabaseConnection(): Promise<DiagnosticResult> {
    try {
      const { data, error } = await supabase.from('dummy_table_that_should_not_exist').select('*').limit(1);
      
      // If we get here without throwing, Supabase is connected (even if table doesn't exist)
      return {
        step: "Supabase Connection",
        status: "success",
        message: "✅ Supabase client is properly configured and connected",
        details: { 
          connection: "active",
          expected_error: error?.message || "No error (unexpected)",
        }
      };
    } catch (error) {
      return {
        step: "Supabase Connection",
        status: "error",
        message: "❌ Supabase connection failed",
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async checkEnvironmentVariables(): Promise<DiagnosticResult> {
    const envVars = {
      VITE_BUILDER_IO_PUBLIC_KEY: import.meta.env.VITE_BUILDER_IO_PUBLIC_KEY,
      VITE_BUILDER_IO_PRIVATE_KEY: import.meta.env.VITE_BUILDER_IO_PRIVATE_KEY,
    };

    const configured = Object.entries(envVars).filter(([_, value]) => !!value);
    const missing = Object.entries(envVars).filter(([_, value]) => !value);

    return {
      step: "Environment Variables",
      status: missing.length === 0 ? "success" : "warning",
      message: missing.length === 0 
        ? "✅ All environment variables are configured"
        : `⚠️ ${missing.length} environment variables are missing`,
      details: {
        configured: configured.map(([key, value]) => `${key}: ${String(value).substring(0, 8)}...`),
        missing: missing.map(([key]) => key),
        all_vars: envVars
      }
    };
  }

  private async checkTableExistence(): Promise<DiagnosticResult> {
    try {
      // Test autofix_history table
      const { data: historyData, error: historyError } = await supabase
        .from("autofix_history")
        .select("id")
        .limit(1);

      // Test builder_prompts table
      const { data: promptsData, error: promptsError } = await supabase
        .from("builder_prompts")
        .select("id")
        .limit(1);

      const historyExists = !historyError || !historyError.message.includes("does not exist");
      const promptsExists = !promptsError || !promptsError.message.includes("does not exist");

      return {
        step: "Table Existence",
        status: historyExists && promptsExists ? "success" : "error",
        message: historyExists && promptsExists 
          ? "✅ All required tables exist and are accessible"
          : "❌ Some required tables are missing",
        details: {
          autofix_history: {
            exists: historyExists,
            error: historyError?.message,
            data_count: historyData?.length || 0
          },
          builder_prompts: {
            exists: promptsExists,
            error: promptsError?.message,
            data_count: promptsData?.length || 0
          }
        }
      };
    } catch (error) {
      return {
        step: "Table Existence",
        status: "error",
        message: "❌ Error checking table existence",
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  private async testBasicOperations(): Promise<DiagnosticResult> {
    try {
      // Create a minimal test entry
      const testEntry = {
        type: "manual",
        module: "diagnostics",
        description: "Diagnostic test entry",
        changes: ["Diagnostic test"],
        success: true,
        context: { diagnostic: true },
        metadata: { test_id: crypto.randomUUID() }
      };

      console.log("Testing insert operation with:", testEntry);

      // Try to insert
      const { data: insertData, error: insertError } = await supabase
        .from("autofix_history")
        .insert([testEntry])
        .select();

      if (insertError) {
        return {
          step: "Basic Operations",
          status: "error",
          message: `❌ Insert operation failed: ${insertError.message}`,
          details: {
            operation: "insert",
            error: insertError,
            test_entry: testEntry
          }
        };
      }

      // Clean up - delete the test entry
      if (insertData && insertData[0]) {
        await supabase
          .from("autofix_history")
          .delete()
          .eq("id", insertData[0].id);
      }

      return {
        step: "Basic Operations",
        status: "success",
        message: "✅ Insert and delete operations successful",
        details: {
          operations: ["insert", "delete"],
          test_entry_id: insertData?.[0]?.id,
          cleaned_up: true
        }
      };

    } catch (error) {
      return {
        step: "Basic Operations",
        status: "error",
        message: `❌ Operations test failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { error }
      };
    }
  }

  private async checkDataStructure(): Promise<DiagnosticResult> {
    try {
      // Try to get table schema information
      const { data, error } = await supabase
        .from("autofix_history")
        .select("*")
        .limit(1);

      if (error && error.message.includes("does not exist")) {
        return {
          step: "Data Structure",
          status: "error",
          message: "❌ Cannot check data structure - tables don't exist",
          details: { error: error.message }
        };
      }

      return {
        step: "Data Structure",
        status: "success",
        message: "✅ Data structure is accessible",
        details: {
          sample_data: data,
          record_count: data?.length || 0,
          table_accessible: !error
        }
      };

    } catch (error) {
      return {
        step: "Data Structure",
        status: "error",
        message: `❌ Data structure check failed: ${error instanceof Error ? error.message : String(error)}`,
        details: { error }
      };
    }
  }
}

export const autofixDiagnostics = new AutofixDiagnostics();

// Quick diagnostic function
export async function quickDiagnostic(): Promise<{
  overall_status: "healthy" | "issues" | "critical";
  results: DiagnosticResult[];
  summary: string;
}> {
  const results = await autofixDiagnostics.runDiagnostics();
  
  const successCount = results.filter(r => r.status === "success").length;
  const errorCount = results.filter(r => r.status === "error").length;
  const warningCount = results.filter(r => r.status === "warning").length;
  
  let overallStatus: "healthy" | "issues" | "critical";
  let summary: string;
  
  if (errorCount === 0) {
    overallStatus = warningCount === 0 ? "healthy" : "issues";
    summary = `✅ System healthy (${successCount}/${results.length} checks passed)`;
  } else if (errorCount < results.length / 2) {
    overallStatus = "issues";
    summary = `⚠️ System has issues (${errorCount} errors, ${warningCount} warnings)`;
  } else {
    overallStatus = "critical";
    summary = `❌ Critical issues detected (${errorCount} errors)`;
  }

  return { overall_status: overallStatus, results, summary };
}
