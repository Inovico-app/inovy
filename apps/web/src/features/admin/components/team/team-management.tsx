"use server";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AuthContext } from "@/lib/auth-context";
import { getBetterAuthSession } from "@/lib/better-auth-session";

import { getCachedTeamsWithMemberCounts } from "@/server/cache/team.cache";
import { getTranslations } from "next-intl/server";
import { TeamManagementClient } from "./team-management-client";

export async function TeamManagement() {
  const t = await getTranslations("admin.teams");
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.organization) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            {t("unableToLoad") ||
              "Unable to load teams. Please refresh and try again."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    member,
    organization: { id: organizationId },
  } = authResult.value;

  const canEdit = member
    ? ["owner", "admin", "superadmin"].includes(member.role)
    : false;

  const auth: AuthContext = {
    user: authResult.value.user!,
    organizationId,
    userTeamIds: authResult.value.userTeamIds ?? [],
  };
  const teams = await getCachedTeamsWithMemberCounts(organizationId, auth);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("teamsCardTitle")}</CardTitle>
        <CardDescription>{t("teamsCardDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <TeamManagementClient
          teams={teams}
          canEdit={canEdit}
          organizationId={organizationId}
        />
      </CardContent>
    </Card>
  );
}
