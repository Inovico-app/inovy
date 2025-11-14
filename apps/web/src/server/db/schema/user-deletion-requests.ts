import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * User Deletion Requests Table
 * Tracks GDPR right to be forgotten requests with soft delete and recovery period
 * Supports 30-day recovery window for accidental deletions
 */
export const userDeletionRequests = pgTable("user_deletion_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // Kinde user ID
  organizationId: text("organization_id").notNull(), // Kinde organization code
  status: text("status", {
    enum: ["pending", "processing", "completed", "cancelled"],
  })
    .notNull()
    .default("pending"),
  requestedAt: timestamp("requested_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }), // When deletion was processed
  scheduledDeletionAt: timestamp("scheduled_deletion_at", {
    withTimezone: true,
  }), // When permanent deletion will occur (30 days after processing)
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }), // If user cancels before permanent deletion
  cancelledBy: text("cancelled_by"), // Kinde user ID who cancelled
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type UserDeletionRequest =
  typeof userDeletionRequests.$inferSelect;
export type NewUserDeletionRequest =
  typeof userDeletionRequests.$inferInsert;

