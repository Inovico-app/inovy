"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";
import type { TeamMember } from "./team-member-assignment";

interface TeamMemberListProps {
  members: TeamMember[];
  searchQuery: string;
  canEdit: boolean;
  isSubmitting: boolean;
  getUserName: (member: TeamMember) => string;
  onShowRemoveDialog: (data: {
    userId: string;
    userName: string;
    teamId: string;
    teamName: string;
  }) => void;
  onRoleChange?: (userId: string, teamId: string, newRole: string) => void;
}

export function TeamMemberList({
  members,
  searchQuery,
  canEdit,
  isSubmitting,
  getUserName,
  onShowRemoveDialog,
}: TeamMemberListProps) {
  return (
    <div className="space-y-2">
      {members.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {searchQuery
            ? "No members match your search criteria."
            : "No members found."}
        </p>
      ) : (
        members.map((member) => (
          <div
            key={member.id}
            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="font-medium">{getUserName(member)}</div>
                {member.email && (
                  <div className="text-sm text-muted-foreground">
                    {member.email}
                  </div>
                )}

                {/* Team Memberships */}
                {member.teams && member.teams.length > 0 ? (
                  <div className="mt-3 space-y-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      Team Memberships
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {member.teams.map((teamMembership) => (
                        <div
                          key={teamMembership.teamId}
                          className="flex items-center gap-1 group"
                        >
                          <Badge variant="outline" className="text-xs">
                            {teamMembership.teamName}
                            {teamMembership.role !== "member" && (
                              <span className="ml-1 text-muted-foreground">
                                ({teamMembership.role})
                              </span>
                            )}
                          </Badge>
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() =>
                                onShowRemoveDialog({
                                  userId: member.id,
                                  userName: getUserName(member),
                                  teamId: teamMembership.teamId,
                                  teamName: teamMembership.teamName,
                                })
                              }
                              disabled={isSubmitting}
                              aria-label={`Remove ${getUserName(member)} from ${teamMembership.teamName}`}
                            >
                              <XIcon className="h-3 w-3" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Not assigned to any teams
                  </div>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
