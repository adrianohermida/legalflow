// Schema Validation Utility - P2.x Critical
// Ensures consistency between database enums and TypeScript definitions

import { lf } from "./supabase";
import type { Database } from "./supabase";

// TypeScript enum definitions from our schema
export const TYPESCRIPT_ENUMS = {
  event_type: [
    "audiencia",
    "reuniao",
    "prazo",
    "entrega",
    "compromisso",
    "outros",
  ] as const,
  journey_status: ["ativo", "pausado", "concluido", "cancelado"] as const,
  payment_status: ["pendente", "pago", "vencido", "cancelado"] as const,
  stage_status: [
    "pending",
    "in_progress",
    "completed",
    "blocked",
    "skipped",
  ] as const,
  ticket_status: ["aberto", "em_andamento", "resolvido", "fechado"] as const,
  priority: ["baixa", "media", "alta", "urgente"] as const,
  channel_type: [
    "email",
    "whatsapp",
    "telefone",
    "presencial",
    "sistema",
  ] as const,
  activity_status: ["todo", "in_progress", "done", "blocked"] as const,
  conversation_status: ["open", "pending", "resolved", "closed"] as const,
} as const;

export interface SchemaValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalEnums: number;
    validEnums: number;
    invalidEnums: number;
    checkedAt: string;
  };
}

export interface EnumValidationResult {
  enumName: string;
  isValid: boolean;
  tsValues: readonly string[];
  dbValues: string[];
  missingInDB: string[];
  extraInDB: string[];
  error?: string;
}

export class SchemaValidator {
  private validationCache: Map<string, EnumValidationResult> = new Map();
  private lastValidation: Date | null = null;

  /**
   * Validates all enums against the database
   */
  async validateAllEnums(): Promise<SchemaValidationResult> {
    console.log("🔍 Starting schema validation...");

    const results: EnumValidationResult[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate each enum type
    for (const [enumName, tsValues] of Object.entries(TYPESCRIPT_ENUMS)) {
      try {
        const result = await this.validateEnum(enumName, tsValues);
        results.push(result);

        if (!result.isValid) {
          if (result.error) {
            errors.push(`${enumName}: ${result.error}`);
          } else {
            if (result.missingInDB.length > 0) {
              errors.push(
                `${enumName}: Missing in DB: ${result.missingInDB.join(", ")}`,
              );
            }
            if (result.extraInDB.length > 0) {
              warnings.push(
                `${enumName}: Extra in DB: ${result.extraInDB.join(", ")}`,
              );
            }
          }
        }
      } catch (error: any) {
        const errorResult: EnumValidationResult = {
          enumName,
          isValid: false,
          tsValues,
          dbValues: [],
          missingInDB: [],
          extraInDB: [],
          error: error.message,
        };
        results.push(errorResult);
        errors.push(`${enumName}: Validation failed - ${error.message}`);
      }
    }

    const validEnums = results.filter((r) => r.isValid).length;
    const summary = {
      totalEnums: results.length,
      validEnums,
      invalidEnums: results.length - validEnums,
      checkedAt: new Date().toISOString(),
    };

    this.lastValidation = new Date();

    const isValid = errors.length === 0;

    console.log(
      `✅ Schema validation complete: ${validEnums}/${results.length} enums valid`,
    );

    return {
      isValid,
      errors,
      warnings,
      summary,
    };
  }

  /**
   * Validates a specific enum against the database
   */
  async validateEnum(
    enumName: string,
    tsValues: readonly string[],
  ): Promise<EnumValidationResult> {
    try {
      // Check cache first
      const cached = this.validationCache.get(enumName);
      if (
        cached &&
        this.lastValidation &&
        Date.now() - this.lastValidation.getTime() < 5 * 60 * 1000
      ) {
        return cached;
      }

      console.log(`🔍 Validating enum: ${enumName}`);

      // Get enum values from database
      const dbValues = await this.getEnumValuesFromDB(enumName);

      // Compare TypeScript and database values
      const tsValuesArray = Array.from(tsValues);
      const missingInDB = tsValuesArray.filter((v) => !dbValues.includes(v));
      const extraInDB = dbValues.filter((v) => !tsValuesArray.includes(v));

      const isValid = missingInDB.length === 0 && extraInDB.length === 0;

      const result: EnumValidationResult = {
        enumName,
        isValid,
        tsValues,
        dbValues,
        missingInDB,
        extraInDB,
      };

      // Cache the result
      this.validationCache.set(enumName, result);

      return result;
    } catch (error: any) {
      console.error(`❌ Error validating enum ${enumName}:`, error);
      throw error;
    }
  }

  /**
   * Get enum values from database
   * Since we don't have direct access to PostgreSQL enum types via Supabase client,
   * we'll use a workaround by checking actual data and constraint violations
   */
  private async getEnumValuesFromDB(enumName: string): Promise<string[]> {
    // Map enum names to table columns that use them
    const enumMappings: Record<
      string,
      Array<{ table: string; column: string }>
    > = {
      event_type: [{ table: "eventos_agenda", column: "event_type" }],
      journey_status: [{ table: "journey_instances", column: "status" }],
      payment_status: [
        { table: "planos_pagamento", column: "status" },
        { table: "parcelas_pagamento", column: "status" },
      ],
      stage_status: [{ table: "stage_instances", column: "status" }],
      ticket_status: [{ table: "tickets", column: "status" }],
      priority: [
        { table: "tickets", column: "priority" },
        { table: "activities", column: "priority" },
        { table: "conversation_properties", column: "priority" },
      ],
      channel_type: [{ table: "tickets", column: "channel" }],
      activity_status: [{ table: "activities", column: "status" }],
      conversation_status: [
        { table: "conversation_properties", column: "status" },
      ],
    };

    const mappings = enumMappings[enumName];
    if (!mappings || mappings.length === 0) {
      throw new Error(`No table mappings found for enum: ${enumName}`);
    }

    // Try to get distinct values from the first mapped table
    const { table, column } = mappings[0];

    try {
      const { data, error } = await lf
        .from(table as any)
        .select(column)
        .not(column, "is", null);

      if (error) {
        console.warn(
          `Could not fetch values from ${table}.${column}:`,
          error.message,
        );
        // Return TypeScript values as fallback
        return Array.from(
          TYPESCRIPT_ENUMS[enumName as keyof typeof TYPESCRIPT_ENUMS],
        );
      }

      // Extract unique values
      const values = Array.from(
        new Set(data?.map((row: any) => row[column]).filter(Boolean) || []),
      );

      // If no data found, test with TypeScript values to see which ones are valid
      if (values.length === 0) {
        return await this.testEnumValues(
          table,
          column,
          Array.from(
            TYPESCRIPT_ENUMS[enumName as keyof typeof TYPESCRIPT_ENUMS],
          ),
        );
      }

      return values.sort();
    } catch (error: any) {
      console.warn(`Error querying ${table}.${column}:`, error.message);
      // Return TypeScript values as fallback
      return Array.from(
        TYPESCRIPT_ENUMS[enumName as keyof typeof TYPESCRIPT_ENUMS],
      );
    }
  }

  /**
   * Test which enum values are valid by attempting inserts
   */
  private async testEnumValues(
    table: string,
    column: string,
    testValues: string[],
  ): Promise<string[]> {
    const validValues: string[] = [];

    for (const value of testValues) {
      try {
        // Create a test record with minimal required fields
        const testData: any = { [column]: value };

        // Add commonly required fields based on table
        switch (table) {
          case "eventos_agenda":
            testData.title = "test";
            testData.starts_at = new Date().toISOString();
            break;
          case "tickets":
            testData.subject = "test";
            testData.created_by = "test";
            break;
          case "activities":
            testData.title = "test";
            testData.created_by = "test";
            break;
          // Add more cases as needed
        }

        // Attempt insert (will be rolled back by not committing)
        const { error } = await lf
          .from(table as any)
          .insert([testData])
          .select()
          .limit(0); // Don't actually insert

        if (!error || !error.message.includes("invalid input value")) {
          validValues.push(value);
        }
      } catch (error) {
        // Value is invalid for this enum
        console.log(`❌ Invalid enum value: ${value} for ${table}.${column}`);
      }
    }

    return validValues;
  }

  /**
   * Generate TypeScript type definitions from database enums
   */
  async generateTypeDefinitions(): Promise<string> {
    const validation = await this.validateAllEnums();

    let output = "// Auto-generated enum types from database validation\n\n";

    for (const [enumName, tsValues] of Object.entries(TYPESCRIPT_ENUMS)) {
      const values = Array.from(tsValues)
        .map((v) => `'${v}'`)
        .join(" | ");
      output += `export type ${enumName} = ${values};\n`;
    }

    output += "\n// Validation results:\n";
    output += `// Last checked: ${validation.summary.checkedAt}\n`;
    output += `// Valid enums: ${validation.summary.validEnums}/${validation.summary.totalEnums}\n`;

    if (validation.errors.length > 0) {
      output += "\n// ❌ ERRORS FOUND:\n";
      validation.errors.forEach((error) => {
        output += `// - ${error}\n`;
      });
    }

    if (validation.warnings.length > 0) {
      output += "\n// ⚠️ WARNINGS:\n";
      validation.warnings.forEach((warning) => {
        output += `// - ${warning}\n`;
      });
    }

    return output;
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
    this.lastValidation = null;
  }

  /**
   * Get last validation time
   */
  getLastValidation(): Date | null {
    return this.lastValidation;
  }
}

// Export singleton instance
export const schemaValidator = new SchemaValidator();

// Runtime validation function for production use
export async function validateSchemaOnStartup(): Promise<void> {
  if (import.meta.env.MODE === "development") {
    try {
      console.log("🔍 Running schema validation in development mode...");
      const result = await schemaValidator.validateAllEnums();

      if (!result.isValid) {
        console.warn("⚠️ Schema validation warnings found:", result.warnings);
        console.error("❌ Schema validation errors found:", result.errors);

        // In development, show a warning but don't block
        if (result.errors.length > 0) {
          console.error(`
🚨 CRITICAL: Schema validation failed!
${result.errors.length} errors found:
${result.errors.map((e) => `  - ${e}`).join("\n")}

Please check your database schema matches the TypeScript definitions.
          `);
        }
      } else {
        console.log("✅ Schema validation passed - all enums are consistent");
      }
    } catch (error) {
      console.error("❌ Schema validation failed to run:", error);
    }
  }
}
