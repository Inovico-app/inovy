"use server";

import { z } from "zod";
import { headers } from "next/headers";
import {
  authorizedActionClient,
  resultToActionResponse,
} from "@/lib/server-action-client/action-client";
import { auth } from "@/lib/auth";
import { ok, err } from "neverthrow";
import { ActionErrors } from "@/lib/server-action-client/action-errors";
import { isOrganizationAdmin } from "@/lib/rbac/rbac";

export interface UserTeam {
  id: string;
  name: string;
  organizationId: string;
}

export interface UserTeamsData {
  teams: UserTeam[];
  isOrgAdmin: boolean;
}

const listUserTeamsSchema = z.object({});

export const listUserTeamsAction = authorizedActionClient
  .metadata({
    name: "list-user-teams",
    permissions: {},
    audit: { resourceType: "team", action: "list", category: "read" },
  })
  .inputSchema(listUserTeamsSchema)
  .action(async ({ ctx }) => {
    try {
      const requestHeaders = await headers();

      const [teamsResult, sessionData] = await Promise.all([
        auth.api.listUserTeams({ headers: requestHeaders }),
        auth.api.getSession({ headers: requestHeaders }),
      ]);

      // Filter teams to only the active organization
      const activeOrgId =
        sessionData?.session?.activeOrganizationId ?? ctx.organizationId;

      const userTeams: UserTeam[] = Array.isArray(teamsResult)
        ? teamsResult
            .filter(
              (team) => !activeOrgId || team.organizationId === activeOrgId,
            )
            .map((team) => ({
              id: team.id,
              name: team.name,
              organizationId: team.organizationId,
            }))
        : [];

      // Get member role from the session for org-level admin check
      const memberRole = sessionData?.session
        ? await (async () => {
            try {
              const activeMember = await auth.api.getActiveMember({
                headers: requestHeaders,
              });
              return activeMember ?? null;
            } catch {
              return null;
            }
          })()
        : null;
      const isAdmin =
        ctx.user != null && isOrganizationAdmin(ctx.user, memberRole);

      return resultToActionResponse(
        ok({
          teams: userTeams,
          isOrgAdmin: isAdmin,
        } satisfies UserTeamsData),
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
