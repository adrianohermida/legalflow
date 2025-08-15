import { Request, Response, NextFunction } from "express";
import { ApiResponse, ValidationError } from "@shared/api";

export interface ValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: "string" | "number" | "boolean" | "array" | "object";
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    enum?: string[];
  };
}

export function validateRequest(schema: ValidationSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const errors: ValidationError[] = [];
    const body = req.body;

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];

      // Check required fields
      if (rules.required && (value === undefined || value === null || value === "")) {
        errors.push({
          field,
          message: `Campo ${field} é obrigatório`,
          code: "REQUIRED_FIELD"
        });
        continue;
      }

      // Skip validation if field is not required and not present
      if (!rules.required && (value === undefined || value === null)) {
        continue;
      }

      // Type validation
      if (rules.type && typeof value !== rules.type) {
        errors.push({
          field,
          message: `Campo ${field} deve ser do tipo ${rules.type}`,
          code: "INVALID_TYPE"
        });
        continue;
      }

      // String validations
      if (rules.type === "string" && typeof value === "string") {
        if (rules.minLength && value.length < rules.minLength) {
          errors.push({
            field,
            message: `Campo ${field} deve ter pelo menos ${rules.minLength} caracteres`,
            code: "MIN_LENGTH"
          });
        }

        if (rules.maxLength && value.length > rules.maxLength) {
          errors.push({
            field,
            message: `Campo ${field} deve ter no máximo ${rules.maxLength} caracteres`,
            code: "MAX_LENGTH"
          });
        }

        if (rules.pattern && !rules.pattern.test(value)) {
          errors.push({
            field,
            message: `Campo ${field} tem formato inválido`,
            code: "INVALID_FORMAT"
          });
        }

        if (rules.enum && !rules.enum.includes(value)) {
          errors.push({
            field,
            message: `Campo ${field} deve ser um dos valores: ${rules.enum.join(", ")}`,
            code: "INVALID_ENUM"
          });
        }
      }
    }

    if (errors.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: "Dados inválidos",
        message: "Por favor, corrija os erros de validação",
        timestamp: new Date().toISOString(),
        data: { validationErrors: errors }
      };
      return res.status(400).json(response);
    }

    next();
  };
}

// Common validation schemas
export const commonSchemas = {
  cpfcnpj: {
    required: true,
    type: "string" as const,
    pattern: /^\d{11}$|^\d{14}$/,
  },
  
  cnj: {
    required: true,
    type: "string" as const,
    pattern: /^\d{7}-\d{2}\.\d{4}\.\d{1}\.\d{2}\.\d{4}$/,
  },

  email: {
    required: true,
    type: "string" as const,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },

  oab: {
    required: true,
    type: "number" as const,
  },

  priority: {
    type: "string" as const,
    enum: ["baixa", "media", "alta", "urgente"],
  },

  status: {
    type: "string" as const,
    enum: ["aberto", "em_andamento", "resolvido", "fechado"],
  },
};

export default validateRequest;
