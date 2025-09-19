import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organizationsTable } from "./organizations";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  kindeId: text("kinde_id").notNull().unique(),
  email: text("email").notNull(),
  givenName: text("given_name"),
  familyName: text("family_name"),
  picture: text("picture"),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizationsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

