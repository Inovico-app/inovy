import { neonConfig, Pool } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
// @ts-expect-error - ws does not have a type definition
import ws from "ws";
import * as schema from "./schema";

dotenv.config();

// To work in edge environments (Cloudflare Workers, Vercel Edge, etc.), enable querying over fetch
neonConfig.poolQueryViaFetch = true;
neonConfig.webSocketConstructor = ws;

const postgres = new Pool({ connectionString: process.env.DATABASE_URL || "" });
export const db = drizzle(postgres, { schema });

