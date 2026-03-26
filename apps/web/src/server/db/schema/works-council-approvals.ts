import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const worksCouncilApprovalStatusEnum = ["active", "revoked"] as const;

export type WorksCouncilApprovalStatus =
  (typeof worksCouncilApprovalStatusEnum)[number];

export const worksCouncilApprovals = pgTable(
  "works_council_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id").notNull(),
    documentUrl: text("document_url").notNull(),
    approvalDate: timestamp("approval_date", { withTimezone: true }).notNull(),
    scopeDescription: text("scope_description"),
    status: text("status", { enum: worksCouncilApprovalStatusEnum })
      .notNull()
      .default("active"),
    uploadedBy: text("uploaded_by").notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: text("revoked_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    orgIdx: index("works_council_approvals_org_id_idx").on(
      table.organizationId,
    ),
  }),
);

export type WorksCouncilApproval = typeof worksCouncilApprovals.$inferSelect;
export type NewWorksCouncilApproval = typeof worksCouncilApprovals.$inferInsert;
