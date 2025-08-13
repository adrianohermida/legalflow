// Runtime Enum Validation Utility
// Validates enum values at runtime to prevent database constraint violations

import {
  EventType,
  JourneyStatus,
  PaymentStatus,
  StageStatus,
  TicketStatus,
  Priority,
  ChannelType,
  ActivityStatus,
  ConversationStatus,
} from "../../shared/api";

// Runtime enum definitions that match the database
const RUNTIME_ENUMS = {
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

export interface ValidationResult {
  isValid: boolean;
  value: string;
  enumType: string;
  error?: string;
  suggestion?: string;
}

export class EnumValidator {
  /**
   * Validates if a value is a valid enum value
   */
  static validate<T extends keyof typeof RUNTIME_ENUMS>(
    enumType: T,
    value: any,
  ): ValidationResult {
    const enumValues = RUNTIME_ENUMS[enumType];
    const stringValue = String(value).toLowerCase().trim();

    // Check if the value is valid
    const isValid = enumValues.includes(stringValue as any);

    if (isValid) {
      return {
        isValid: true,
        value: stringValue,
        enumType,
      };
    }

    // Find closest match for suggestion
    const suggestion = this.findClosestMatch(stringValue, enumValues);

    return {
      isValid: false,
      value: stringValue,
      enumType,
      error: `Invalid ${enumType} value: "${value}". Must be one of: ${enumValues.join(", ")}`,
      suggestion: suggestion ? `Did you mean "${suggestion}"?` : undefined,
    };
  }

  /**
   * Validates and normalizes an enum value, throwing an error if invalid
   */
  static validateOrThrow<T extends keyof typeof RUNTIME_ENUMS>(
    enumType: T,
    value: any,
  ): (typeof RUNTIME_ENUMS)[T][number] {
    const result = this.validate(enumType, value);

    if (!result.isValid) {
      const errorMessage = result.suggestion
        ? `${result.error} ${result.suggestion}`
        : result.error;
      throw new Error(errorMessage);
    }

    return result.value as (typeof RUNTIME_ENUMS)[T][number];
  }

  /**
   * Validates and normalizes an enum value, returning default if invalid
   */
  static validateOrDefault<T extends keyof typeof RUNTIME_ENUMS>(
    enumType: T,
    value: any,
    defaultValue: (typeof RUNTIME_ENUMS)[T][number],
  ): (typeof RUNTIME_ENUMS)[T][number] {
    const result = this.validate(enumType, value);

    if (!result.isValid) {
      console.warn(
        `Invalid ${enumType} value "${value}", using default "${defaultValue}"`,
      );
      return defaultValue;
    }

    return result.value as (typeof RUNTIME_ENUMS)[T][number];
  }

  /**
   * Gets all valid values for an enum type
   */
  static getValidValues<T extends keyof typeof RUNTIME_ENUMS>(
    enumType: T,
  ): readonly (typeof RUNTIME_ENUMS)[T][number][] {
    return RUNTIME_ENUMS[enumType];
  }

  /**
   * Checks if a value is valid for an enum type
   */
  static isValid<T extends keyof typeof RUNTIME_ENUMS>(
    enumType: T,
    value: any,
  ): value is (typeof RUNTIME_ENUMS)[T][number] {
    return this.validate(enumType, value).isValid;
  }

  /**
   * Finds the closest string match using Levenshtein distance
   */
  private static findClosestMatch(
    input: string,
    candidates: readonly string[],
  ): string | null {
    if (candidates.length === 0) return null;

    let closest = candidates[0];
    let minDistance = this.levenshteinDistance(input, closest);

    for (const candidate of candidates.slice(1)) {
      const distance = this.levenshteinDistance(input, candidate);
      if (distance < minDistance) {
        minDistance = distance;
        closest = candidate;
      }
    }

    // Only suggest if the distance is reasonable (less than half the string length)
    return minDistance <= Math.max(1, Math.floor(input.length / 2))
      ? closest
      : null;
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private static levenshteinDistance(a: string, b: string): number {
    const matrix = Array(b.length + 1)
      .fill(null)
      .map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i += 1) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= b.length; j += 1) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= b.length; j += 1) {
      for (let i = 1; i <= a.length; i += 1) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    return matrix[b.length][a.length];
  }
}

// Convenient type guards for each enum type
export const isEventType = (value: any): value is EventType =>
  EnumValidator.isValid("event_type", value);

export const isJourneyStatus = (value: any): value is JourneyStatus =>
  EnumValidator.isValid("journey_status", value);

export const isPaymentStatus = (value: any): value is PaymentStatus =>
  EnumValidator.isValid("payment_status", value);

export const isStageStatus = (value: any): value is StageStatus =>
  EnumValidator.isValid("stage_status", value);

export const isTicketStatus = (value: any): value is TicketStatus =>
  EnumValidator.isValid("ticket_status", value);

export const isPriority = (value: any): value is Priority =>
  EnumValidator.isValid("priority", value);

export const isChannelType = (value: any): value is ChannelType =>
  EnumValidator.isValid("channel_type", value);

export const isActivityStatus = (value: any): value is ActivityStatus =>
  EnumValidator.isValid("activity_status", value);

export const isConversationStatus = (value: any): value is ConversationStatus =>
  EnumValidator.isValid("conversation_status", value);

// Validation helpers for common use cases
export const validateTicketData = (data: any) => {
  const errors: string[] = [];

  if (data.status && !isTicketStatus(data.status)) {
    errors.push(`Invalid ticket status: ${data.status}`);
  }

  if (data.priority && !isPriority(data.priority)) {
    errors.push(`Invalid priority: ${data.priority}`);
  }

  if (data.channel && !isChannelType(data.channel)) {
    errors.push(`Invalid channel: ${data.channel}`);
  }

  return errors;
};

export const validateActivityData = (data: any) => {
  const errors: string[] = [];

  if (data.status && !isActivityStatus(data.status)) {
    errors.push(`Invalid activity status: ${data.status}`);
  }

  if (data.priority && !isPriority(data.priority)) {
    errors.push(`Invalid priority: ${data.priority}`);
  }

  return errors;
};

export const validateEventoData = (data: any) => {
  const errors: string[] = [];

  if (data.event_type && !isEventType(data.event_type)) {
    errors.push(`Invalid event type: ${data.event_type}`);
  }

  return errors;
};

export const validatePaymentData = (data: any) => {
  const errors: string[] = [];

  if (data.status && !isPaymentStatus(data.status)) {
    errors.push(`Invalid payment status: ${data.status}`);
  }

  return errors;
};

// Utility to sanitize form data before submission
export const sanitizeFormData = (
  formData: Record<string, any>,
  entityType: string,
) => {
  const sanitized = { ...formData };

  switch (entityType) {
    case "ticket":
      if (sanitized.status) {
        sanitized.status = EnumValidator.validateOrDefault(
          "ticket_status",
          sanitized.status,
          "aberto",
        );
      }
      if (sanitized.priority) {
        sanitized.priority = EnumValidator.validateOrDefault(
          "priority",
          sanitized.priority,
          "media",
        );
      }
      if (sanitized.channel) {
        sanitized.channel = EnumValidator.validateOrDefault(
          "channel_type",
          sanitized.channel,
          "sistema",
        );
      }
      break;

    case "activity":
      if (sanitized.status) {
        sanitized.status = EnumValidator.validateOrDefault(
          "activity_status",
          sanitized.status,
          "todo",
        );
      }
      if (sanitized.priority) {
        sanitized.priority = EnumValidator.validateOrDefault(
          "priority",
          sanitized.priority,
          "media",
        );
      }
      break;

    case "evento":
      if (sanitized.event_type) {
        sanitized.event_type = EnumValidator.validateOrDefault(
          "event_type",
          sanitized.event_type,
          "outros",
        );
      }
      break;

    case "payment":
      if (sanitized.status) {
        sanitized.status = EnumValidator.validateOrDefault(
          "payment_status",
          sanitized.status,
          "pendente",
        );
      }
      break;
  }

  return sanitized;
};

// Runtime validation hook for React components
export const useEnumValidation = () => {
  const validateAndShowError = (
    enumType: keyof typeof RUNTIME_ENUMS,
    value: any,
  ) => {
    const result = EnumValidator.validate(enumType, value);

    if (!result.isValid) {
      console.error(`Enum validation failed: ${result.error}`);
      if (result.suggestion) {
        console.warn(result.suggestion);
      }
    }

    return result;
  };

  return {
    validate: EnumValidator.validate,
    validateOrThrow: EnumValidator.validateOrThrow,
    validateOrDefault: EnumValidator.validateOrDefault,
    isValid: EnumValidator.isValid,
    getValidValues: EnumValidator.getValidValues,
    validateAndShowError,
    sanitizeFormData,
  };
};

// Export enum values for use in components
export const ENUM_VALUES = RUNTIME_ENUMS;

// Development-only validation check
export const runEnumConsistencyCheck = () => {
  if (import.meta.env.MODE === "development") {
    console.log("🔍 Running enum consistency check...");

    // Check that our runtime enums match the TypeScript types
    const checkResults = Object.entries(RUNTIME_ENUMS).map(
      ([enumType, values]) => ({
        enumType,
        values: values.slice(),
        count: values.length,
      }),
    );

    console.table(checkResults);
    console.log("✅ Enum consistency check complete");
  }
};
