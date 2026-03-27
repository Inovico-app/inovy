/**
 * Backfill Audit Log Hash Chain
 *
 * Populates previousHash for existing audit log entries.
 * Idempotent — skips entries where previousHash is already set.
 * Processes one organization at a time.
 *
 * Usage: npx tsx scripts/backfill-audit-hash-chain.ts
 */

import "dotenv/config";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";
import { auditLogs } from "../src/server/db/schema/audit-logs";
import { computeHash } from "../src/server/services/audit-log.service";

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

async function main() {
  console.log("Starting audit log hash chain backfill...\n");

  const orgs = await db
    .selectDistinct({ organizationId: auditLogs.organizationId })
    .from(auditLogs);

  console.log(`Found ${orgs.length} organizations to process\n`);

  let totalProcessed = 0;
  let totalSkipped = 0;

  for (const { organizationId } of orgs) {
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(asc(auditLogs.createdAt));

    let processed = 0;
    let skipped = 0;

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i]!;

      if (log.previousHash !== null) {
        skipped++;
        continue;
      }

      const previousHash =
        i === 0 ? "genesis" : (logs[i - 1]!.hash ?? "genesis");

      const hash =
        log.hash ??
        computeHash({
          eventType: log.eventType,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          userId: log.userId,
          organizationId: log.organizationId,
          action: log.action,
          category: log.category,
          createdAt: log.createdAt,
          metadata: log.metadata,
        });

      await db
        .update(auditLogs)
        .set({ previousHash, hash })
        .where(eq(auditLogs.id, log.id));

      log.hash = hash;
      log.previousHash = previousHash;
      processed++;
    }

    console.log(
      `  Org ${organizationId}: ${processed} updated, ${skipped} skipped (${logs.length} total)`,
    );
    totalProcessed += processed;
    totalSkipped += skipped;
  }

  console.log(
    `\nDone. ${totalProcessed} entries updated, ${totalSkipped} skipped.`,
  );
  await pool.end();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
