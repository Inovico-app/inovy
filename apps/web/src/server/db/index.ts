import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

// Configure Neon for edge environments
if (typeof window === "undefined") {
  // For Node.js environments (not edge), use WebSocket
  if (process.env.VERCEL_ENV !== "production" || !process.env.EDGE_RUNTIME) {
    // Only import ws in Node.js environments - use eval to prevent bundlers from trying to include it
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    neonConfig.webSocketConstructor = eval("require")("ws");
  } else {
    // For Vercel Edge Runtime, use fetch-based queries
    neonConfig.poolQueryViaFetch = true;
  }
}

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  // Configure pool for serverless environments
  max: 1, // Single connection for serverless
  idleTimeoutMillis: 0, // Disable idle timeout
  connectionTimeoutMillis: 10000, // 10 second connection timeout
});

export const db = drizzle(pool);

