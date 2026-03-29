import { db } from "@/server/db";
import { teamMembers } from "@/server/db/schema/auth";
import { and, eq } from "drizzle-orm";

import type { PermissionContext, PermissionSubject } from "../types";
import type { ScopeResolver } from "./types";

export const teamScopeResolver: ScopeResolver = {
  scope: "team",

  async resolve(
    subject: PermissionSubject,
    context: PermissionContext,
  ): Promise<boolean> {
    if (!context.teamId) return false;

    const rows = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, context.teamId),
          eq(teamMembers.userId, subject.userId),
        ),
      );

    return rows.length > 0;
  },
};
