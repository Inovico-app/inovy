/**
 * Script to index existing project content into vector embeddings
 *
 * CRITICAL: This script must be run with --env-file flag to load environment variables
 * BEFORE the script starts, because the database connection is initialized at module import time.
 *
 * Usage:
 *   PROJECT_ID=xxx ORGANIZATION_ID=yyy npx tsx --env-file=.env.local src/scripts/index-project-content.ts
 *
 * Or use the npm script:
 *   pnpm run index-project
 *   (Make sure to set PROJECT_ID and ORGANIZATION_ID in your .env.local file first)
 */

import { logger } from "@/lib/logger";
import { EmbeddingService } from "@/server/services/embedding.service";

async function main() {
  const projectId = process.env.PROJECT_ID;
  const organizationId = process.env.ORGANIZATION_ID;

  if (!projectId || !organizationId) {
    console.error("Error: PROJECT_ID and ORGANIZATION_ID must be set");
    console.error(
      "Usage: PROJECT_ID=xxx ORGANIZATION_ID=yyy tsx src/scripts/index-project-content.ts"
    );
    process.exit(1);
  }

  console.log(`Starting indexing for project: ${projectId}`);
  console.log(`Organization: ${organizationId}`);
  console.log("---");

  const result = await EmbeddingService.indexProject(projectId, organizationId);

  if (result.isErr()) {
    console.error("Indexing failed:", result.error.message);
    process.exit(1);
  }

  const { indexed, failed } = result.value;

  console.log("---");
  console.log("Indexing completed!");
  console.log(`Successfully indexed: ${indexed} recordings`);
  console.log(`Failed: ${failed} recordings`);

  process.exit(0);
}

main().catch((error) => {
  logger.error("Script error", { error });
  console.error("Fatal error:", error);
  process.exit(1);
});

