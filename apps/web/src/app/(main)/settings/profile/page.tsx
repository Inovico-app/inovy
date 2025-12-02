import { ProtectedPage } from "@/components/protected-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AutoProcessToggle } from "@/features/recordings/components/auto-process-toggle";
import { DataDeletion } from "@/features/settings/components/data-deletion";
import { DataExport } from "@/features/settings/components/data-export";
import { getDeletionStatus } from "@/features/settings/lib/get-deletion-status";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import {
  getCachedTeamsByOrganization,
  getCachedUserTeams,
} from "@/server/cache/team.cache";
import { Building2Icon, MailIcon, UserIcon, UsersIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

async function ProfileContent() {
  const authResult = await getAuthSession();

  if (authResult.isErr() || !authResult.value.user) {
    return (
      <div className="text-center">
        <p className="text-red-500">Failed to load profile information</p>
      </div>
    );
  }

  const user = authResult.value.user;
  const organization = authResult.value.organization;
  const orgName =
    ((organization as unknown as Record<string, unknown>)?.display_name as
      | string
      | undefined) ??
    ((organization as unknown as Record<string, unknown>)?.name as
      | string
      | undefined) ??
    "Personal Organization";

  const organizationId = organization?.id;

  // Fetch user teams
  const userTeams = organizationId
    ? await getCachedUserTeams(user.id, organizationId)
    : [];
  const allTeams = organizationId
    ? await getCachedTeamsByOrganization(organizationId)
    : [];
  const teamMap = new Map(allTeams.map((t) => [t.id, t]));

  // Fetch deletion status server-side
  const deletionStatus = await getDeletionStatus();

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          View your account and organization information
        </p>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your personal profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Name */}
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Full Name
              </p>
              <p className="text-lg font-semibold">
                {user.name || user.email || "Not specified"}
              </p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <MailIcon className="h-5 w-5 text-green-600 dark:text-green-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-lg font-semibold">
                {user.email || "Not available"}
              </p>
            </div>
          </div>

          {/* Organization */}
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Building2Icon className="h-5 w-5 text-purple-600 dark:text-purple-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">
                Organization
              </p>
              <p className="text-lg font-semibold">{orgName}</p>
            </div>
          </div>

          {/* Teams */}
          {userTeams.length > 0 && (
            <div className="flex items-start space-x-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <UsersIcon className="h-5 w-5 text-orange-600 dark:text-orange-300" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">
                  Teams
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {userTeams.map((userTeam) => {
                    const team = teamMap.get(userTeam.teamId);
                    if (!team) return null;
                    return (
                      <Badge
                        key={userTeam.teamId}
                        variant="outline"
                        className="text-sm"
                      >
                        {team.name}
                        {userTeam.role !== "member" && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({userTeam.role})
                          </span>
                        )}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recording Preferences */}
      <AutoProcessToggle />

      {/* Data Export */}
      <DataExport />

      {/* Data Deletion */}
      <DataDeletion initialDeletionRequest={deletionStatus} />

      {/* Actions */}
      <div className="flex gap-3">
        <Button asChild>
          <Link href="/settings/profile/edit">Edit Profile</Link>
        </Button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-2xl py-8 px-4">
          <div className="space-y-4">
            <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
            <div className="h-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
      }
    >
      <ProtectedPage>
        <div className="container mx-auto max-w-6xl py-12 px-6">
          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="h-8 bg-muted rounded w-1/4 animate-pulse" />
                <div className="h-64 bg-muted rounded animate-pulse" />
              </div>
            }
          >
            <ProfileContent />
          </Suspense>
        </div>
      </ProtectedPage>
    </Suspense>
  );
}

