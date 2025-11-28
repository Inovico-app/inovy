#!/usr/bin/env tsx
/**
 * Post-generation script to add organization member role enum and magic link table to auth-schema.ts
 *
 * This script should be run after `pnpx @better-auth/cli generate` to automatically:
 * 1. Add pgEnum import if missing
 * 2. Add organizationMemberRoleEnum definition
 * 3. Update member table to use enum instead of text
 * 4. Update invitation table to use enum instead of text
 * 5. Add magic link table (Better Auth CLI doesn't generate it)
 *
 * Usage: pnpm tsx scripts/add-role-types.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Use process.cwd() which will be the project root when running from package.json scripts
const SCHEMA_FILE = join(process.cwd(), "auth-schema.ts");

function addRoleTypes() {
  try {
    let content = readFileSync(SCHEMA_FILE, "utf-8");

    // 1. Add pgEnum to imports if not present
    if (!content.includes("pgEnum")) {
      content = content.replace(
        '} from "drizzle-orm/pg-core"',
        '  pgEnum,\n} from "drizzle-orm/pg-core"'
      );
    }

    // 2. Add enum definition before organizations table (Better Auth uses plural)
    if (!content.includes("organizationMemberRoleEnum")) {
      const orgTableIndex = content.indexOf(
        'export const organizations = pgTable("organizations"'
      );
      if (orgTableIndex !== -1) {
        const enumDefinition = `export const organizationMemberRoleEnum = pgEnum("organization_member_role", [
  "owner",
  "admin",
  "superadmin",
  "manager",
  "user",
  "viewer",
]);

`;
        content =
          content.slice(0, orgTableIndex) +
          enumDefinition +
          content.slice(orgTableIndex);
      }
    }

    // 3. Update members table to use enum (Better Auth uses plural)
    content = content.replace(
      'role: text("role").default("member").notNull()',
      'role: organizationMemberRoleEnum("role").default("user").notNull()'
    );

    // 4. Update invitations table to use enum (Better Auth uses plural)
    content = content.replace(
      'role: text("role")',
      'role: organizationMemberRoleEnum("role").default("user").notNull()'
    );

    // 5. Add magic link table if not present
    if (!content.includes("export const magicLink = pgTable")) {
      const passkeysEndIndex = content.indexOf("export const userRelations");
      if (passkeysEndIndex !== -1) {
        const magicLinkTable = `export const magicLinks = pgTable(
  "magic_links",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("magic_link_email_idx").on(table.email),
    index("magic_link_token_idx").on(table.token),
  ],
);

`;
        content =
          content.slice(0, passkeysEndIndex) +
          magicLinkTable +
          content.slice(passkeysEndIndex);
      }
    }

    // 6. Add magic link relations if not present
    if (!content.includes("export const magicLinkRelations")) {
      const passkeyRelationsIndex = content.indexOf(
        "export const passkeyRelations"
      );
      if (passkeyRelationsIndex !== -1) {
        const afterPasskeyRelations = content.substring(passkeyRelationsIndex);
        const endIndex = afterPasskeyRelations.indexOf("});") + 3;
        if (endIndex > 2) {
          const insertIndex = passkeyRelationsIndex + endIndex;
          const magicLinkRelations = `
export const magicLinkRelations = relations(magicLink, ({ one }) => ({
  user: one(users, {
    fields: [magicLink.email],
    references: [users.email],
  }),
}));
`;
          content =
            content.slice(0, insertIndex) +
            magicLinkRelations +
            content.slice(insertIndex);
        }
      }
    }

    writeFileSync(SCHEMA_FILE, content, "utf-8");
    console.log(
      "✓ Successfully added organization user role enum and magic link table to auth-schema.ts"
    );
  } catch (error) {
    console.error("✗ Error adding role types:", error);
    process.exit(1);
  }
}

addRoleTypes();

