import { serve } from "@hono/node-server";
import { MCPClientConfig } from "@inovy/agent-shared";
import fs from "fs";
import { Hono } from "hono";
import { cors } from "hono/cors";
import path from "path";
import { fileURLToPath } from "url";
import { generateCorrelationId, logger } from "./lib/logger.js";
import { MCPClientManager } from "./services/mcp-client-manager.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Define custom context type for Hono
type Bindings = Record<string, never>;
type Variables = {
  correlationId: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Configure allowed origins for CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

// Vercel domain configuration
const vercelProjectName = process.env.VERCEL_PROJECT_NAME || "inovy";
const vercelProductionDomain = process.env.VERCEL_PRODUCTION_DOMAIN; // e.g., your-app.com or your-app.vercel.app

logger.info(
  {
    allowedOrigins,
    vercelProjectName,
    vercelProductionDomain,
  },
  "CORS configured"
);

// Enable CORS with restricted origins
app.use(
  "/*",
  cors({
    origin: (origin) => {
      // Allow requests with no origin (like mobile apps or curl) in development
      if (!origin && process.env.NODE_ENV === "development") {
        return origin;
      }

      if (!origin) {
        logger.warn("CORS: Request with no origin rejected");
        return null;
      }

      // Check if origin is in explicit allowed list
      if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
        return origin;
      }

      // Allow localhost for development
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:")
      ) {
        return origin;
      }

      // Allow Vercel preview deployments (e.g., projectname-hash-username.vercel.app)
      if (
        origin.match(
          new RegExp(`https://${vercelProjectName}-.*\\.vercel\\.app$`)
        )
      ) {
        return origin;
      }

      // Allow custom production domain if configured
      if (
        vercelProductionDomain &&
        origin === `https://${vercelProductionDomain}`
      ) {
        return origin;
      }

      // Log rejected origins for security monitoring
      logger.warn({ origin, allowedOrigins }, "CORS: Rejected origin");
      return null;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Correlation-ID"],
    exposeHeaders: ["X-Correlation-ID"],
    maxAge: 86400, // 24 hours
    credentials: true,
  })
);

// Add correlation ID middleware
app.use("*", async (c, next) => {
  const correlationId =
    c.req.header("X-Correlation-ID") || generateCorrelationId();
  c.set("correlationId", correlationId);
  c.res.headers.set("X-Correlation-ID", correlationId);

  logger.info(
    {
      correlationId,
      method: c.req.method,
      path: c.req.path,
    },
    "Incoming request"
  );

  await next();

  logger.info(
    {
      correlationId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
    },
    "Request completed"
  );
});

// Load MCP server configuration
const configPath = path.resolve(__dirname, "../config/mcp-servers.json");
let mcpConfigs: MCPClientConfig[] = [];

try {
  const configFile = fs.readFileSync(configPath, "utf-8");
  mcpConfigs = JSON.parse(configFile);
  logger.info(
    { configPath, serverCount: mcpConfigs.length },
    "Loaded MCP server configuration"
  );
} catch (error) {
  logger.warn(
    { configPath, error },
    "Could not load mcp-servers.json, starting with empty config"
  );
}

const mcpManager = new MCPClientManager(mcpConfigs);

// Routes
app.get("/health", (c) => {
  const correlationId = c.get("correlationId");
  const healthStatus = mcpManager.getHealthStatus();

  logger.debug(
    { correlationId, serverCount: healthStatus.length },
    "Health check requested"
  );

  return c.json({
    status: "ok",
    mcpServers: healthStatus,
  });
});

app.get("/tools", async (c) => {
  const correlationId = c.get("correlationId");

  try {
    const tools = await mcpManager.getAllTools();

    logger.info(
      { correlationId, toolCount: tools.length },
      "Tools list requested"
    );

    return c.json(tools);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ correlationId, error: errorMessage }, "Failed to get tools");

    return c.json({ error: errorMessage }, 500);
  }
});

app.post("/tools/execute", async (c) => {
  const correlationId = c.get("correlationId");

  try {
    const body = await c.req.json<{ toolName: string; args: any }>();
    const { toolName, args } = body;

    logger.info({ correlationId, toolName, args }, "Tool execution requested");

    const result = await mcpManager.invokeTool(toolName, args, correlationId);

    logger.info(
      { correlationId, toolName, result },
      "Tool execution successful"
    );

    return c.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      { correlationId, error: errorMessage },
      "Tool execution failed"
    );

    return c.json({ error: errorMessage }, 500);
  }
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, "Received shutdown signal");

  try {
    await mcpManager.shutdown();
    logger.info("Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error({ error }, "Error during shutdown");
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Start server
const start = async () => {
  try {
    await mcpManager.connectAll();

    const port = process.env.PORT ? parseInt(process.env.PORT) : 3001;

    logger.info(
      { port, env: process.env.NODE_ENV || "development" },
      "Agent Server starting"
    );

    serve({
      fetch: app.fetch,
      port,
    });

    logger.info({ port }, "Agent Server running");
  } catch (err) {
    logger.error({ error: err }, "Failed to start Agent Server");
    process.exit(1);
  }
};

start();

