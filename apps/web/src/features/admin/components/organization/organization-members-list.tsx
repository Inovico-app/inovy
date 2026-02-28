"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUserDisplayName } from "@/lib/formatters/display-formatters";
import type { TeamWithMemberCount } from "@/server/cache/team.cache";
import type { OrganizationMemberDto } from "@/server/services/organization.service";
import { MailIcon, ShieldCheckIcon, UserIcon } from "lucide-react";
import { InviteMemberToOrganizationDialog } from "./invite-member-to-organization-dialog";

interface OrganizationMembersListProps {
  members: OrganizationMemberDto[];
  organizationId: string;
  organizationName: string;
  teams: TeamWithMemberCount[];
}

export function OrganizationMembersList({
  members,
  organizationId,
  organizationName,
  teams,
}: OrganizationMembersListProps) {
  if (members.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Organization Members</CardTitle>
              <CardDescription>
                No members in this organization yet
              </CardDescription>
            </div>
            <InviteMemberToOrganizationDialog
              organizationId={organizationId}
              organizationName={organizationName}
              teams={teams}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <UserIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium text-muted-foreground">
              No members to display
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Invite members to get started
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Organization Members
            </CardTitle>
            <CardDescription>
              {members.length} member{members.length === 1 ? "" : "s"} in this
              organization
            </CardDescription>
          </div>
          <InviteMemberToOrganizationDialog
            organizationId={organizationId}
            organizationName={organizationName}
            teams={teams}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="group relative overflow-hidden rounded-lg border bg-card p-4 transition-all hover:shadow-sm hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Member Avatar & Info */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="rounded-full bg-primary/10 p-2.5 ring-1 ring-primary/20 flex-shrink-0">
                    <UserIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">
                        {getUserDisplayName({
                          email: member.email,
                          given_name: member.given_name,
                          family_name: member.family_name,
                        })}
                      </p>
                      {member.roles && member.roles.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {member.roles.map((role) => (
                            <Badge
                              key={role}
                              variant="secondary"
                              className="text-xs font-medium capitalize flex items-center gap-1"
                            >
                              <ShieldCheckIcon className="h-3 w-3" />
                              {role}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {member.email && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MailIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{member.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

