import { pgTable, text, timestamp, uuid, index, primaryKey } from "drizzle-orm/pg-core";
import { teams } from "./teams";

export const userTeamRoleEnum = ["member", "lead", "admin"] as const;
export type UserTeamRole = (typeof userTeamRoleEnum)[number];

export const userTeams = pgTable(
  "user_teams",
  {
    userId: text("user_id").notNull(), // Better Auth user ID
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    role: text("role", { enum: userTeamRoleEnum })
      .notNull()
      .default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.teamId] }),
    userIdIdx: index("user_teams_user_id_idx").on(table.userId),
    teamIdIdx: index("user_teams_team_id_idx").on(table.teamId),
  })
);

export type UserTeam = typeof userTeams.$inferSelect;
export type NewUserTeam = typeof userTeams.$inferInsert;

