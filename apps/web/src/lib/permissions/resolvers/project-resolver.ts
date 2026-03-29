import { db } from "@/server/db";
import { teamMembers } from "@/server/db/schema/auth";
import { projects } from "@/server/db/schema/projects";
import { and, eq } from "drizzle-orm";

import type { PermissionContext, PermissionSubject } from "../types";
import type { ScopeResolver } from "./types";

export const projectScopeResolver: ScopeResolver = {
  scope: "project",

  async resolve(
    subject: PermissionSubject,
    context: PermissionContext,
  ): Promise<boolean> {
    if (!context.projectId) return false;

    const projectRows = await db
      .select({ teamId: projects.teamId })
      .from(projects)
      .where(eq(projects.id, context.projectId as string));

    const project = projectRows[0];
    if (!project?.teamId) return false;

    const memberRows = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, project.teamId),
          eq(teamMembers.userId, subject.userId),
        ),
      );

    return memberRows.length > 0;
  },
};
