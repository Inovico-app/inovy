import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { AutoProcessToggle } from "@/features/recordings/components/auto-process-toggle";
import { DataDeletion } from "@/features/settings/components/data-deletion";
import { DataExport } from "@/features/settings/components/data-export";
import { PrivacyRights } from "@/features/settings/components/privacy-rights";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { getDeletionStatus } from "@/features/settings/lib/get-deletion-status";
import { getPrivacyRequests } from "@/features/settings/lib/get-privacy-requests";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import {
  getCachedTeamsByOrganization,
  getCachedUserTeams,
} from "@/server/cache/team.cache";
import { UserService } from "@/server/services/user.service";
import { Building2Icon, UsersIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";

async function ProfileContent() {
  const authResult = await getBetterAuthSession();

  if (authResult.isErr() || !authResult.value.user) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load profile information</p>
      </div>
    );
  }

  const { user, organization } = authResult.value;
  const organizationId = organization?.id;
  const orgName = organization?.name ?? "Personal Organization";

  const [
    userDetailResult,
    userTeams,
    allTeams,
    deletionStatus,
    privacyRequests,
  ] = await Promise.all([
    UserService.getUserById(user.id),
    organizationId
      ? getCachedUserTeams(user.id, organizationId)
      : Promise.resolve([]),
    organizationId
      ? getCachedTeamsByOrganization(organizationId)
      : Promise.resolve([]),
    getDeletionStatus(),
    getPrivacyRequests(),
  ]);

  const givenName = userDetailResult.isOk()
    ? (userDetailResult.value.given_name ?? "")
    : "";
  const familyName = userDetailResult.isOk()
    ? (userDetailResult.value.family_name ?? "")
    : "";

  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  return (
    <>
      <PageHeader
        title="Profile"
        description="Manage your personal account information"
      />

      <ProfileForm
        initialGivenName={givenName}
        initialFamilyName={familyName}
        email={user.email || ""}
      />

      {/* Organization (display-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Building2Icon className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{orgName}</p>
              <p className="text-xs text-muted-foreground">
                {allTeams.length} team{allTeams.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {userTeams.length > 0 && (
            <div className="flex items-start gap-3">
              <UsersIcon className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex flex-wrap gap-1.5">
                {userTeams.map((userTeam) => {
                  const team = teamMap.get(userTeam.teamId);
                  if (!team) return null;
                  return (
                    <Badge
                      key={userTeam.teamId}
                      variant="outline"
                      className="text-xs"
                    >
                      {team.name}
                      {userTeam.role !== "member" && (
                        <span className="ml-1 text-muted-foreground">
                          ({userTeam.role})
                        </span>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <Link
            href={"/settings/organization" as Route}
            className="text-xs text-primary hover:underline"
          >
            Manage organization settings
          </Link>
        </CardContent>
      </Card>

      {/* Preferences */}
      <AutoProcessToggle />

      {/* Data & Privacy */}
      <DataExport />

      <PrivacyRights initialRequests={privacyRequests} />

      <div className="border-l-2 border-destructive pl-4">
        <DataDeletion initialDeletionRequest={deletionStatus} />
      </div>
    </>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-8 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-64 bg-muted rounded animate-pulse" />
          <div className="h-32 bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
