import { defineConfig, type Config } from "drizzle-kit";

import dotenv from "dotenv";

// Load .env.local only if it exists (for local development)
// In CI/CD, DATABASE_URL will be passed as an environment variable
dotenv.config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
      "For local development, create a .env.local file with DATABASE_URL. " +
      "For CI/CD, ensure DATABASE_URL is set as a repository secret or environment variable."
  );
}

export default defineConfig({
  schema: "./src/server/db/schema",
  out: "./src/server/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
}) satisfies Config;

