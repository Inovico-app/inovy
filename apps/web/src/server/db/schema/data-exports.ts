import {
  customType,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const exportStatusEnum = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type ExportStatus = (typeof exportStatusEnum)[number];

// Custom bytea type for PostgreSQL binary data
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer): Buffer {
    return value;
  },
  fromDriver(value: Buffer): Buffer {
    return value;
  },
});

export const dataExports = pgTable("data_exports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull(), // Kinde user ID
  organizationId: text("organization_id").notNull(), // Kinde organization code
  status: text("status", { enum: exportStatusEnum })
    .notNull()
    .default("pending"),
  fileData: bytea("file_data"), // ZIP file binary data
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  fileSize: integer("file_size"), // Size in bytes
  recordingsCount: integer("recordings_count").notNull().default(0),
  tasksCount: integer("tasks_count").notNull().default(0),
  conversationsCount: integer("conversations_count").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export type DataExport = typeof dataExports.$inferSelect;
export type NewDataExport = typeof dataExports.$inferInsert;

