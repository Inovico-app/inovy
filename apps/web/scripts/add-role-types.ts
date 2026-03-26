#!/usr/bin/env tsx
/**
 * Post-generation script to add organization member role enum to auth schema
 *
 * This script should be run after `pnpx @better-auth/cli generate` to automatically:
 * 1. Add pgEnum import if missing
 * 2. Add organizationMemberRoleEnum definition
 * 3. Update member table to use enum instead of text
 * 4. Update invitation table to use enum instead of text
 *
 * Usage: pnpm tsx scripts/add-role-types.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Use process.cwd() which will be the project root when running from package.json scripts
const SCHEMA_FILE = join(process.cwd(), "src/server/db/schema/auth.ts");

function addRoleTypes() {
  try {
    let content = readFileSync(SCHEMA_FILE, "utf-8");

    // 1. Add pgEnum to imports if not present
    if (!content.includes("pgEnum")) {
      content = content.replace(
        '} from "drizzle-orm/pg-core"',
        '  pgEnum,\n} from "drizzle-orm/pg-core"',
      );
    }

    // 2. Add enum definition after all imports (handles multi-line imports)
    if (!content.includes("organizationMemberRoleEnum")) {
      // Find the last import block end by matching `from "...";\n`
      const importEndMatches = Array.from(content.matchAll(/from\s+"[^"]+";/g));
      if (importEndMatches.length > 0) {
        const lastImportEnd = importEndMatches[importEndMatches.length - 1];
        const insertIndex = lastImportEnd.index! + lastImportEnd[0].length + 1; // +1 for newline
        const enumDefinition = `
export const organizationMemberRoleEnum = pgEnum("organization_member_role", [
  "owner",
  "admin",
  "superadmin",
  "manager",
  "user",
  "viewer",
]);

export type OrganizationMemberRole =
  (typeof organizationMemberRoleEnum.enumValues)[number];
`;
        content =
          content.slice(0, insertIndex) +
          enumDefinition +
          content.slice(insertIndex);
      }
    }

    // 3. Update members table to use enum (Better Auth uses plural)
    content = content.replace(
      'role: text("role").default("member").notNull()',
      'role: organizationMemberRoleEnum("role").default("user").notNull()',
    );

    // 4. Update invitations table to use enum (Better Auth uses plural)
    // Match the invitations table role field more specifically
    content = content.replace(
      /(\n\s+email: text\("email"\)\.notNull\(\),\n\s+)role: text\("role"\)/,
      '$1role: organizationMemberRoleEnum("role").default("user").notNull()',
    );

    writeFileSync(SCHEMA_FILE, content, "utf-8");
    console.log(
      "✓ Successfully added organization member role enum to auth schema",
    );
  } catch (error) {
    console.error("✗ Error adding role types:", error);
    process.exit(1);
  }
}

addRoleTypes();
