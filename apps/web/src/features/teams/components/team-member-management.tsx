"use server";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { resolveAuthContext } from "@/lib/auth-context";
import { getCachedTeamById } from "@/server/cache/team.cache";
import { OrganizationService } from "@/server/services/organization.service";
import { TeamService } from "@/server/services/team.service";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { TeamMemberManagementClient } from "./team-member-management-client";

interface TeamMemberManagementProps {
  teamId: string;
}

export async function TeamMemberManagement({
  teamId,
}: TeamMemberManagementProps) {
  const authResult = await resolveAuthContext("TeamMemberManagement");

  if (authResult.isErr()) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            Unable to load team members. Please refresh and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const auth = authResult.value;
  const team = await getCachedTeamById(teamId, auth);

  if (!team) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Team not found.</p>
        </CardContent>
      </Card>
    );
  }

  // Fetch team members with user details (name, email, image)
  const membersResult = await TeamService.getTeamMembersWithUserDetails(
    teamId,
    auth,
  );
  const teamMembers = membersResult.isOk() ? membersResult.value : [];

  // Fetch all organization members to show available users
  const orgMembersResult = await OrganizationService.getOrganizationMembers(
    auth.organizationId,
  );
  const allMembers = orgMembersResult.isOk() ? orgMembersResult.value : [];

  // Get team member IDs for filtering
  const teamMemberIds = new Set(
    teamMembers.map((m: { userId: string }) => m.userId),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/teams/${teamId}`}>
          <Button variant="ghost" size="icon" aria-label="Back to team">
            <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            {team.name} - Members
          </h1>
          <p className="text-muted-foreground">
            Manage team members and their roles
          </p>
        </div>
      </div>

      {/* Team Member Management */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Add or remove members and manage their roles in the team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamMemberManagementClient
            teamId={teamId}
            teamMembers={teamMembers}
            availableMembers={allMembers.filter(
              (m) => !teamMemberIds.has(m.id),
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
