import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { env } from "./config/env";
import apiRouter from "./routes";

const app = express();

// CORS configuration supporting configured frontend URL & local development
const allowedOrigins = [
  env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((allowed) => allowed === origin || origin.startsWith("http://localhost:"))) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for hackathon testing while keeping client-key restricted
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Root welcome & info endpoint
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    name: "Nova AI Backend API",
    description: "AI Marketing Avatar Backend using official D-ID Agents API",
    version: "1.0.0",
    status: "online",
    endpoints: {
      health: "/api/health",
      avatarStatus: "/api/avatar/status",
      avatarConfig: "/api/avatar/config",
      initializeAvatar: "POST /api/avatar/initialize",
      generateClientKey: "POST /api/avatar/client-key",
      disconnectAvatar: "POST /api/avatar/disconnect",
    },
  });
});

// Mount modular API router
app.use("/api", apiRouter);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[Global Error] ${err.message}`, err.stack);
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

export default app;
