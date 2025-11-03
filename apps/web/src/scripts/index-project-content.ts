/**
 * Script to index existing project content into vector embeddings
 * 
 * Usage:
 * - Set PROJECT_ID and ORGANIZATION_ID environment variables
 * - Run: tsx src/scripts/index-project-content.ts
 */

import { EmbeddingService } from "@/server/services/embedding.service";
import { logger } from "@/lib/logger";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const projectId = process.env.PROJECT_ID;
  const organizationId = process.env.ORGANIZATION_ID;

  if (!projectId || !organizationId) {
    console.error("Error: PROJECT_ID and ORGANIZATION_ID must be set");
    console.error("Usage: PROJECT_ID=xxx ORGANIZATION_ID=yyy tsx src/scripts/index-project-content.ts");
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

