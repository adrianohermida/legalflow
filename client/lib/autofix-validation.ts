import { autofixHistory } from "./autofix-history";
import { createAutofixTables, insertSampleData } from "./supabase-setup-helper";

export interface ValidationResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

export class AutofixValidator {
  private results: ValidationResult[] = [];

  private addResult(
    step: string,
    success: boolean,
    message: string,
    details?: any,
  ) {
    this.results.push({
      step,
      success,
      message,
      details,
      timestamp: new Date().toISOString(),
    });
  }

  async runCompleteValidation(): Promise<ValidationResult[]> {
    this.results = [];

    console.log("🚀 Starting Autofix System Complete Validation...");

    // Step 1: Validate Credentials
    await this.validateCredentials();

    // Step 2: Validate Database Setup
    await this.validateDatabaseSetup();

    // Step 3: Validate Core Functionality
    await this.validateCoreFunctionality();

    // Step 4: Validate Builder.io Integration
    await this.validateBuilderIntegration();

    // Step 5: Validate Git History Import
    await this.validateGitImport();

    // Step 6: Validate Statistics
    await this.validateStatistics();

    console.log("✅ Autofix System Validation Complete!");
    return this.results;
  }

  private async validateCredentials(): Promise<void> {
    try {
      console.log("🔑 Validating API Credentials...");

      const credentials = autofixHistory.getCredentialsStatus();

      if (
        credentials.public_key_configured &&
        credentials.private_key_configured
      ) {
        this.addResult(
          "API Credentials",
          true,
          "All Builder.io API credentials are properly configured",
          credentials,
        );
      } else {
        this.addResult(
          "API Credentials",
          false,
          "Missing required Builder.io API credentials",
          credentials,
        );
      }
    } catch (error) {
      this.addResult(
        "API Credentials",
        false,
        `Credential validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async validateDatabaseSetup(): Promise<void> {
    try {
      console.log("🗄️ Validating Database Setup...");

      // Try to setup database tables
      const setupResult = await createAutofixTables();

      if (setupResult.success) {
        this.addResult(
          "Database Setup",
          true,
          "Database tables created or verified successfully",
          setupResult,
        );

        // Try to insert sample data
        const sampleResult = await insertSampleData();
        this.addResult(
          "Sample Data",
          sampleResult.success,
          sampleResult.success
            ? "Sample data inserted successfully"
            : `Sample data insertion failed: ${sampleResult.error}`,
          sampleResult,
        );
      } else {
        this.addResult(
          "Database Setup",
          false,
          setupResult.error || "Database setup failed",
          setupResult,
        );
      }
    } catch (error) {
      this.addResult(
        "Database Setup",
        false,
        `Database validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async validateCoreFunctionality(): Promise<void> {
    try {
      console.log("⚙️ Validating Core Functionality...");

      // Test modification recording
      const testModId = await autofixHistory.recordModification({
        type: "manual",
        module: "validation_test",
        description: "Validation test modification entry",
        changes: ["Test change for validation"],
        success: true,
        context: {
          validation_test: true,
        },
        metadata: {
          test_timestamp: new Date().toISOString(),
          validator: "AutofixValidator",
        },
      });

      this.addResult(
        "Modification Recording",
        true,
        `Successfully recorded test modification with ID: ${testModId}`,
        { modification_id: testModId },
      );

      // Test history retrieval
      const history = await autofixHistory.getModificationHistory(5);

      this.addResult(
        "History Retrieval",
        true,
        `Successfully retrieved ${history.length} modification entries`,
        {
          count: history.length,
          latest: history[0],
        },
      );
    } catch (error) {
      this.addResult(
        "Core Functionality",
        false,
        `Core functionality validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async validateBuilderIntegration(): Promise<void> {
    try {
      console.log("🛠️ Validating Builder.io Integration...");

      const testPrompt = {
        prompt: "Validation test for Builder.io integration",
        context: "Testing API connectivity and response handling",
        priority: "low" as const,
        category: "improvement" as const,
      };

      const response = await autofixHistory.executeBuilderPrompt(testPrompt);

      this.addResult(
        "Builder.io Integration",
        response.status === "completed",
        response.status === "completed"
          ? "Builder.io integration test completed successfully"
          : `Builder.io integration test failed: ${response.error}`,
        {
          prompt_id: response.id,
          status: response.status,
          result_summary: response.result?.summary,
        },
      );
    } catch (error) {
      this.addResult(
        "Builder.io Integration",
        false,
        `Builder.io integration validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async validateGitImport(): Promise<void> {
    try {
      console.log("📚 Validating Git History Import...");

      await autofixHistory.importGitHistory();

      this.addResult(
        "Git History Import",
        true,
        "Git history import completed successfully",
      );
    } catch (error) {
      this.addResult(
        "Git History Import",
        false,
        `Git history import validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async validateStatistics(): Promise<void> {
    try {
      console.log("📊 Validating System Statistics...");

      const stats = await autofixHistory.getSystemStats();

      this.addResult(
        "System Statistics",
        true,
        `System statistics retrieved successfully. Total modifications: ${stats.total_modifications}`,
        {
          total: stats.total_modifications,
          successful: stats.successful_modifications,
          failed: stats.failed_modifications,
          by_type: stats.modifications_by_type,
          recent_count: stats.recent_activity.length,
        },
      );
    } catch (error) {
      this.addResult(
        "System Statistics",
        false,
        `System statistics validation failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getValidationSummary(): {
    total_tests: number;
    passed: number;
    failed: number;
    success_rate: number;
    overall_status: "success" | "partial" | "failed";
  } {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.success).length;
    const failed = total - passed;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    let overallStatus: "success" | "partial" | "failed";
    if (successRate >= 100) {
      overallStatus = "success";
    } else if (successRate >= 70) {
      overallStatus = "partial";
    } else {
      overallStatus = "failed";
    }

    return {
      total_tests: total,
      passed,
      failed,
      success_rate: successRate,
      overall_status: overallStatus,
    };
  }

  getResults(): ValidationResult[] {
    return this.results;
  }
}

// Export singleton instance
export const autofixValidator = new AutofixValidator();

// Quick validation function for easy use
export async function validateAutofixSystem(): Promise<{
  results: ValidationResult[];
  summary: ReturnType<AutofixValidator["getValidationSummary"]>;
}> {
  const results = await autofixValidator.runCompleteValidation();
  const summary = autofixValidator.getValidationSummary();

  return { results, summary };
}
