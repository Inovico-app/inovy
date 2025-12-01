"use server";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth/auth-helpers";
import { isOrganizationAdmin, isTeamManager } from "@/lib/rbac/rbac";
import { getCachedTeamById } from "@/server/cache/team.cache";
import type { TeamMemberWithUserDto } from "@/server/dto/team.dto";
import { TeamService } from "@/server/services/team.service";
import { SettingsIcon, UsersIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface TeamDashboardProps {
  teamId: string;
}

export async function TeamDashboard({ teamId }: TeamDashboardProps) {
  const authResult = await getAuthSession();

  if (
    authResult.isErr() ||
    !authResult.value.isAuthenticated ||
    !authResult.value.organization
  ) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            Unable to load team dashboard. Please refresh and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { user } = authResult.value;

  // user is guaranteed to be non-null after authentication check
  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            Unable to load team dashboard. Please refresh and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  const team = await getCachedTeamById(teamId);

  if (!team) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Team not found.</p>
        </CardContent>
      </Card>
    );
  }

  // Check permissions
  const isAdmin = isOrganizationAdmin(user);
  const isLead = await isTeamManager(user, teamId);
  const canManage = isAdmin || isLead;

  // Fetch team members with user details
  const membersResult = await TeamService.getTeamMembersWithUserDetails(teamId);
  const members = membersResult.isOk() ? membersResult.value : [];

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {team.name}
          </h1>
          {team.description && (
            <p className="text-muted-foreground">{team.description}</p>
          )}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link href={`/teams/${teamId}/members`}>
              <Button variant="outline">
                <UsersIcon className="mr-2 h-4 w-4" />
                Manage Members
              </Button>
            </Link>
            <Link href={`/teams/${teamId}/settings`}>
              <Button variant="outline">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(team.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(team.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isAdmin ? (
                <Badge>Organization Admin</Badge>
              ) : isLead ? (
                <Badge variant="secondary">Team Lead</Badge>
              ) : (
                <Badge variant="outline">Member</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {canManage ? "Can manage team" : "View only"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Quick View */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                {members.length} member{members.length !== 1 ? "s" : ""} in this
                team
              </CardDescription>
            </div>
            {canManage && (
              <Link href={`/teams/${teamId}/members`}>
                <Button variant="outline" size="sm">
                  Manage
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No members in this team yet.
            </p>
          ) : (
            <div className="space-y-2">
              {members.slice(0, 5).map((member: TeamMemberWithUserDto) => {
                const displayName = member.userName || member.userEmail || "Unknown User";
                const initials = member.userName
                  ? member.userName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : member.userEmail
                    ? member.userEmail.substring(0, 2).toUpperCase()
                    : "??";

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      {member.userImage ? (
                        <Image
                          src={member.userImage}
                          alt={displayName}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium">{initials}</span>
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{displayName}</div>
                        {member.userEmail && member.userName && (
                          <div className="text-xs text-muted-foreground">
                            {member.userEmail}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Joined{" "}
                          {new Date(
                            member.createdAt ?? new Date()
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {members.length > 5 && (
                <div className="text-center pt-4">
                  <Link href={`/teams/${teamId}/members`}>
                    <Button variant="ghost" size="sm">
                      View all {members.length} members
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

