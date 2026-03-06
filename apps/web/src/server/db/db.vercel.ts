import { neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

if (typeof window === "undefined") {
  const isEdgeRuntime =
    process.env.VERCEL_ENV === "production" && process.env.EDGE_RUNTIME;

  if (!isEdgeRuntime) {
    neonConfig.webSocketConstructor = ws;
  } else {
    neonConfig.poolQueryViaFetch = true;
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 1,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
