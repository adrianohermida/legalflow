import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";

// Import middleware
import { standardizeResponse, errorHandler, notFound } from "./middleware/response";

// Import route modules
import { handleDemo } from "./routes/demo";
import v1Router from "./routes/v1";

export function createServer() {
  const app = express();

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: "Muitas requisições. Tente novamente em 15 minutos.",
      timestamp: new Date().toISOString(),
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", limiter);

  // Basic middleware
  app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true,
  }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Custom response middleware
  app.use(standardizeResponse());

  // API Routes
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.success({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
    }, "Sistema funcionando corretamente");
  });

  // Debug page
  app.get("/debug", (req, res) => {
    const fs = require('fs');
    const path = require('path');
    try {
      const debugHtml = fs.readFileSync(path.join(process.cwd(), 'debug-app.html'), 'utf8');
      res.set('Content-Type', 'text/html');
      res.send(debugHtml);
    } catch (error) {
      res.error("Debug page not found", 404);
    }
  });

  // Legacy routes (maintain backward compatibility)
  app.get("/api/ping", (req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.success({ message: ping }, "Pong!");
  });

  app.get("/api/demo", handleDemo);

  // API v1 routes with standardized REST structure
  app.use("/api/v1", v1Router);

  // Catch-all for undefined API routes
  app.use("/api/*", notFound());

  // Error handling middleware (must be last)
  app.use(errorHandler());

  return app;
}
