import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { invitations } from "./auth";

/**
 * Pending team assignments table
 * Stores team assignments that should be applied when an invitation is accepted
 * This allows multiple teams to be assigned during invitation (invitations table only supports single teamId)
 */
export const pendingTeamAssignments = pgTable(
  "pending_team_assignments",
  {
    id: text("id").primaryKey(),
    invitationId: text("invitation_id")
      .notNull()
      .references(() => invitations.id, { onDelete: "cascade" }),
    teamId: text("team_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("pendingTeamAssignments_invitationId_idx").on(table.invitationId),
    index("pendingTeamAssignments_teamId_idx").on(table.teamId),
  ]
);

