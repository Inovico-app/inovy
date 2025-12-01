import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamMemberAssignment } from "@/features/admin/components/team/team-member-assignment";
import { UserManagementTable } from "@/features/admin/components/user/user-management-table";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { Permissions } from "@/lib/rbac/permissions";
import { checkPermission } from "@/lib/rbac/permissions-server";
import { isOrganizationAdmin } from "@/lib/rbac/rbac";
import { getCachedTeamsWithMemberCounts } from "@/server/cache/team.cache";
import { OrganizationService } from "@/server/services/organization.service";
import { TeamService } from "@/server/services/team.service";
import { redirect } from "next/navigation";
import { Suspense } from "react";

function AdminUsersHeader() {
  return (
    <div className="mb-10">
      <h1 className="text-3xl font-bold text-foreground">
        User Management
      </h1>
      <p className="text-muted-foreground mt-2">
        View and manage all organization members
      </p>
    </div>
  );
}

async function TeamAssignmentTab() {
  const authResult = await getAuthSession();

  if (
    authResult.isErr() ||
    !authResult.value.isAuthenticated ||
    !authResult.value.organization
  ) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Unable to load team assignments. Please refresh and try again.
        </p>
      </div>
    );
  }

  const { organization, user } = authResult.value;
  const canEdit = user ? isOrganizationAdmin(user) : false;

  // Fetch members and teams
  const membersResult = await OrganizationService.getOrganizationMembers(
    organization.id
  );
  const teams = await getCachedTeamsWithMemberCounts(organization.id);

  // Fetch team memberships for all users
  const members = membersResult.isOk() ? membersResult.value : [];
  const membersWithTeams = await Promise.all(
    members.map(async (member) => {
      const userTeamsResult = await TeamService.getUserTeams(member.id);
      const userTeams = userTeamsResult.isOk() ? userTeamsResult.value : [];

      return {
        ...member,
        teams: userTeams.map((ut) => {
          const team = teams.find((t) => t.id === ut.teamId);
          return {
            teamId: ut.teamId,
            teamName: team?.name || "Unknown",
            role: "member", // Better Auth doesn't support team member roles
          };
        }),
      };
    })
  );

  return (
    <TeamMemberAssignment
      members={membersWithTeams}
      teams={teams}
      canEdit={canEdit}
    />
  );
}

async function AdminUsersContainer() {
  // Check if user is authenticated and has admin permissions
  const sessionResult = await getAuthSession();

  if (sessionResult.isErr() || !sessionResult.value.isAuthenticated) {
    redirect("/");
  }

  // Check admin permissions using type-safe helper
  const hasAdminPermission = await checkPermission(Permissions.admin.all);

  if (!hasAdminPermission) {
    redirect("/");
  }

  return (
    <div className="container mx-auto max-w-4xl py-12 px-6">
      <AdminUsersHeader />

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="team-assignments">Team Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Suspense
            fallback={
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            }
          >
            <UserManagementTable />
          </Suspense>
        </TabsContent>

        <TabsContent value="team-assignments">
          <Suspense
            fallback={
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            }
          >
            <TeamAssignmentTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-4xl py-12 px-6">
          <div className="mb-10 space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <AdminUsersContainer />
    </Suspense>
  );
}

