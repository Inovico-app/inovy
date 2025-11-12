import { pgTable, text, timestamp, uuid, unique, index } from "drizzle-orm/pg-core";

/**
 * Organization Settings Table
 * Stores organization-wide settings and instructions for AI context
 * One record per organization (enforced via unique constraint)
 */
export const organizationSettings = pgTable(
  "organization_settings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(), // Kinde organization code
    instructions: text("instructions"), // Up to 100,000 characters for comprehensive org guidelines
    createdById: text("created_by_id").notNull(), // Kinde user ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // Ensure one settings record per organization
    uniqueOrgId: unique().on(table.organizationId),
    // Index for efficient lookups by organizationId
    orgIdIdx: index("organization_settings_organization_id_idx").on(
      table.organizationId
    ),
  })
);

export type OrganizationSettings =
  typeof organizationSettings.$inferSelect;
export type NewOrganizationSettings =
  typeof organizationSettings.$inferInsert;

