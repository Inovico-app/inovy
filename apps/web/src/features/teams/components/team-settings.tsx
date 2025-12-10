"use server";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBetterAuthSession } from "@/lib/better-auth-session";
import { getCachedTeamById } from "@/server/cache/team.cache";
import { TeamService } from "@/server/services/team.service";
import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { TeamSettingsForm } from "./team-settings-form";

interface TeamSettingsProps {
  teamId: string;
}

export async function TeamSettings({ teamId }: TeamSettingsProps) {
  const authResult = await getBetterAuthSession();

  if (
    authResult.isErr() ||
    !authResult.value.isAuthenticated ||
    !authResult.value.organization
  ) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">
            Unable to load team settings. Please refresh and try again.
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

  // Fetch team statistics
  const membersResult = await TeamService.getTeamMembers(teamId);
  const memberCount = membersResult.isOk() ? membersResult.value.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/teams/${teamId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">
            {team.name} - Settings
          </h1>
          <p className="text-muted-foreground">Manage team information and settings</p>
        </div>
      </div>

      {/* Edit Team Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Team Information</CardTitle>
          <CardDescription>
            Update the team name and description
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamSettingsForm
            teamId={teamId}
            initialData={{
              name: team.name,
              description: team.description || "",
            }}
          />
        </CardContent>
      </Card>

      {/* Team Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Team Statistics</CardTitle>
          <CardDescription>Overview of team metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Members</p>
              <p className="text-2xl font-bold">{memberCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-2xl font-bold">
                {new Date(team.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="text-2xl font-bold">
                {new Date(team.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

