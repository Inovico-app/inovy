import {
  bigint,
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";

/**
 * Drive Watches Table
 * Tracks Google Drive watch subscriptions for monitoring folder file uploads
 * Each watch subscription has a channel ID and resource ID from Google Drive API
 */
export const driveWatches = pgTable(
  "drive_watches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(), // Better Auth user ID
    folderId: text("folder_id").notNull(), // Google Drive folder ID
    channelId: text("channel_id").notNull().unique(), // Google Drive channel ID (unique)
    resourceId: text("resource_id").notNull(), // Google Drive resource ID
    expiration: bigint("expiration", { mode: "number" }).notNull(), // Expiration timestamp in milliseconds
    isActive: boolean("is_active").notNull().default(true), // Whether the watch is currently active
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, {
        onDelete: "cascade",
      }), // References projects table
    organizationId: text("organization_id").notNull(), // Better Auth organization ID
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    expirationIdx: index("drive_watches_expiration_idx").on(table.expiration),
    isActiveIdx: index("drive_watches_is_active_idx").on(table.isActive),
    userIdFolderIdIsActiveIdx: index(
      "drive_watches_user_id_folder_id_is_active_idx"
    ).on(table.userId, table.folderId, table.isActive),
    projectIdIdx: index("drive_watches_project_id_idx").on(table.projectId),
  })
);

export type DriveWatch = typeof driveWatches.$inferSelect;
export type NewDriveWatch = typeof driveWatches.$inferInsert;

