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
import { hasRole } from "@/lib/permissions/predicates";
import type { Role } from "@/lib/permissions/types";

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
      const activeMember = sessionData?.session
        ? await (async () => {
            try {
              return await auth.api.getActiveMember({
                headers: requestHeaders,
              });
            } catch {
              return null;
            }
          })()
        : null;

      const isAdmin = activeMember
        ? hasRole("admin").check({
            role: activeMember.role as Role,
            userId: activeMember.userId,
          })
        : ctx.user != null &&
          hasRole("admin").check({
            role: ctx.user.role as Role,
            userId: ctx.user.id,
          });

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
