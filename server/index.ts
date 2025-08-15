import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { readFileSync } from "fs";
import { join } from "path";

// Import middleware
import {
  standardizeResponse,
  errorHandler,
  notFound,
} from "./middleware/response";

// Import route modules
import { handleDemo } from "./routes/demo";
import v1Router from "./routes/v1";

export function createServer() {
  const app = express();

  // Trust proxy for Fly.dev environment
  app.set("trust proxy", true);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // Rate limiting - only for production
  if (process.env.NODE_ENV === "production") {
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
      trustProxy: true,
    });
    app.use("/api", limiter);
  }

  // Basic middleware
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      credentials: true,
    }),
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Custom response middleware
  app.use(standardizeResponse());

  // API Routes

  // Health check
  app.get("/api/health", (req, res) => {
    res.success(
      {
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV || "development",
        uptime: process.uptime(),
      },
      "Sistema funcionando corretamente",
    );
  });

  // Debug page
  app.get("/debug", (req, res) => {
    try {
      const debugHtml = readFileSync(
        join(process.cwd(), "debug-app.html"),
        "utf8",
      );
      res.set("Content-Type", "text/html");
      res.send(debugHtml);
    } catch (error) {
      res.error("Debug page not found", 404);
    }
  });

  // React debug page
  app.get("/debug-react", (req, res) => {
    try {
      const debugHtml = readFileSync(
        join(process.cwd(), "debug-simple.html"),
        "utf8",
      );
      res.set("Content-Type", "text/html");
      res.send(debugHtml);
    } catch (error) {
      res.error("React debug page not found", 404);
    }
  });

  // Basic test page
  app.get("/basic", (req, res) => {
    try {
      const basicHtml = readFileSync(
        join(process.cwd(), "test-basic.html"),
        "utf8",
      );
      res.set("Content-Type", "text/html");
      res.send(basicHtml);
    } catch (error) {
      res.error("Basic test page not found", 404);
    }
  });

  // Dashboard page
  app.get("/dashboard", (req, res) => {
    try {
      const dashboardHtml = readFileSync(
        join(process.cwd(), "dashboard.html"),
        "utf8",
      );
      res.set("Content-Type", "text/html");
      res.send(dashboardHtml);
    } catch (error) {
      res.error("Dashboard page not found", 404);
    }
  });

  // Simple test page
  app.get("/test", (req, res) => {
    res.set("Content-Type", "text/html");
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page - LegalFlow</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
            .status { padding: 10px; margin: 10px 0; background: #d4edda; color: #155724; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🟢 Servidor LegalFlow - Funcionando</h1>
            <div class="status">
              ✅ Express Server: OK<br>
              ✅ API REST: OK<br>
              ✅ Fly.dev Environment: OK<br>
              ⏰ Timestamp: ${new Date().toISOString()}<br>
              🔧 Uptime: ${process.uptime().toFixed(2)}s
            </div>
            <p><a href="/api/health">Testar API Health</a></p>
            <p><a href="/api/v1/health">Testar API v1 Health</a></p>
            <p><a href="/">Voltar para App Principal</a></p>
          </div>
        </body>
      </html>
    `);
  });

  // Legacy routes (maintain backward compatibility)
  app.get("/api/ping", (req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.success({ message: ping }, "Pong!");
  });

  app.get("/api/demo", handleDemo);

  // API v1 routes with standardized REST structure
  app.use("/api/v1", v1Router);

  // Serve fallback page when React app doesn't load
  app.get("/fallback", (req, res) => {
    try {
      const fallbackHtml = readFileSync(
        join(process.cwd(), "public/fallback.html"),
        "utf8",
      );
      res.set("Content-Type", "text/html");
      res.send(fallbackHtml);
    } catch (error) {
      res.error("Fallback page not found", 404);
    }
  });

  // Catch-all for undefined API routes
  app.use("/api/*", notFound());

  // Error handling middleware (must be last)
  app.use(errorHandler());

  return app;
}
