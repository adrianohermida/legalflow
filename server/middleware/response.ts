import { Request, Response, NextFunction } from "express";
import { ApiResponse, PaginatedResponse } from "@shared/api";

// Extend Express Response to include standardized methods
declare global {
  namespace Express {
    interface Response {
      success(data?: any, message?: string): void;
      error(error: string, statusCode?: number, details?: any): void;
      paginated<T>(data: T[], pagination: PaginatedResponse<T>["pagination"]): void;
    }
  }
}

export function standardizeResponse() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Success response
    res.success = function(data?: any, message?: string) {
      const response: ApiResponse = {
        success: true,
        data,
        message,
        timestamp: new Date().toISOString(),
      };
      
      return this.status(200).json(response);
    };

    // Error response
    res.error = function(error: string, statusCode: number = 500, details?: any) {
      const response: ApiResponse = {
        success: false,
        error,
        timestamp: new Date().toISOString(),
        ...(details && { data: details }),
      };

      return this.status(statusCode).json(response);
    };

    // Paginated response
    res.paginated = function<T>(data: T[], pagination: PaginatedResponse<T>["pagination"]) {
      const response: PaginatedResponse<T> & { success: boolean; timestamp: string } = {
        success: true,
        data,
        pagination,
        timestamp: new Date().toISOString(),
      };

      return this.status(200).json(response);
    };

    next();
  };
}

export function errorHandler() {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("API Error:", err);

    // Default error response
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Erro interno do servidor";

    const response: ApiResponse = {
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === "development" && { 
        data: { stack: err.stack } 
      }),
    };

    res.status(statusCode).json(response);
  };
}

export function notFound() {
  return (req: Request, res: Response) => {
    res.error(`Rota não encontrada: ${req.method} ${req.path}`, 404);
  };
}

export default standardizeResponse;
