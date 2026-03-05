import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// Configure Neon for different runtime environments
if (typeof window === "undefined") {
  // Check if we're in an edge runtime environment
  const isEdgeRuntime =
    process.env.VERCEL_ENV === "production" && process.env.EDGE_RUNTIME;

  if (!isEdgeRuntime) {
    // For Node.js environments (not edge), use WebSocket
    neonConfig.webSocketConstructor = ws;
  } else {
    // For Vercel Edge Runtime, use fetch-based queries
    neonConfig.poolQueryViaFetch = true;
  }
}

// Create connection pool with TLS/SSL enforcement
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  // Configure pool for serverless environments
  max: 1, // Single connection for serverless
  idleTimeoutMillis: 0, // Disable idle timeout
  connectionTimeoutMillis: 10000, // 10 second connection timeout
  // SSL/TLS configuration (Neon enforces TLS by default)
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined,
});

// Initialize drizzle with all schema including relations
// This is required for Drizzle's Relational Query API and Better Auth's experimental joins feature
export const db = drizzle(pool, {
  schema,
});

