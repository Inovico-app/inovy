"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { auth } from "@/lib/auth";
import { db } from "@/server/db";
import { sessions } from "@/server/db/schema/auth";
import { ok, err } from "neverthrow";
import { ActionErrors } from "@/lib/server-action-client/action-errors";

export interface UserTeam {
  id: string;
  name: string;
  organizationId: string;
}

export interface UserTeamsData {
  teams: UserTeam[];
  activeTeamId: string | null;
}

const listUserTeamsSchema = z.object({});

export const listUserTeamsAction = authorizedActionClient
  .metadata({ permissions: {} })
  .inputSchema(listUserTeamsSchema)
  .action(async ({ ctx }) => {
    try {
      const requestHeaders = await headers();

      const [teamsResult, sessionData] = await Promise.all([
        auth.api.listUserTeams({ headers: requestHeaders }),
        auth.api.getSession({ headers: requestHeaders }),
      ]);

      const userTeams: UserTeam[] = Array.isArray(teamsResult)
        ? teamsResult.map((team) => ({
            id: team.id,
            name: team.name,
            organizationId: team.organizationId,
          }))
        : [];

      // Resolve activeTeamId from the session record
      let activeTeamId: string | null = null;
      if (sessionData?.session?.id) {
        try {
          const rawSession = sessionData.session as
            | { activeTeamId?: string | null }
            | undefined;
          activeTeamId = rawSession?.activeTeamId ?? null;

          // If not on the session object, query the DB directly
          if (activeTeamId === null || activeTeamId === undefined) {
            const [sessionRecord] = await db
              .select({ activeTeamId: sessions.activeTeamId })
              .from(sessions)
              .where(eq(sessions.id, sessionData.session.id))
              .limit(1);
            activeTeamId = sessionRecord?.activeTeamId ?? null;
          }
        } catch {
          activeTeamId = null;
        }
      }

      // Validate that the active team is in the user's team list
      if (
        activeTeamId &&
        !userTeams.some((t) => t.id === activeTeamId) &&
        !ctx.user?.role
      ) {
        activeTeamId = null;
      }

      return resultToActionResponse(
        ok({ teams: userTeams, activeTeamId } satisfies UserTeamsData),
      );
    } catch (error) {
      return resultToActionResponse(
        err(
          ActionErrors.internal(
            "Failed to list user teams",
            error as Error,
            "list-user-teams",
          ),
        ),
      );
    }
  });
