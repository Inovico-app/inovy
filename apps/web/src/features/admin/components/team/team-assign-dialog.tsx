"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamWithMemberCount } from "@/server/cache/team.cache";
import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { useMemo } from "react";
import type { TeamMember } from "./team-member-assignment";

interface TeamAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TeamMember[];
  availableTeams: TeamWithMemberCount[];
  selectedUserId: string;
  onSelectedUserChange: (id: string) => void;
  selectedTeamId: string;
  onSelectedTeamChange: (id: string) => void;
  selectedRole: string;
  onSelectedRoleChange: (role: string) => void;
  onAssign: () => void;
  isSubmitting: boolean;
  getUserName: (member: TeamMember) => string;
}

export function TeamAssignDialog({
  open,
  onOpenChange,
  members,
  availableTeams,
  selectedUserId,
  onSelectedUserChange,
  selectedTeamId,
  onSelectedTeamChange,
  selectedRole,
  onSelectedRoleChange,
  onAssign,
  isSubmitting,
  getUserName,
}: TeamAssignDialogProps) {
  const memberItems = useMemo(
    () =>
      Object.fromEntries(
        members.map((member) => [member.id, getUserName(member)]),
      ),
    [members, getUserName],
  );

  const teamItems = useMemo(
    () =>
      Object.fromEntries(availableTeams.map((team) => [team.id, team.name])),
    [availableTeams],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <UserPlusIcon className="mr-2 h-4 w-4" />
        Assign to Team
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign User to Team</DialogTitle>
          <DialogDescription>
            Assign a user to a team and set their role
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">User</Label>
            <Select
              value={selectedUserId}
              onValueChange={(value) => value && onSelectedUserChange(value)}
              items={memberItems}
            >
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Select a user" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {getUserName(member)} {member.email && `(${member.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-select">Team</Label>
            <Select
              value={selectedTeamId}
              onValueChange={(value) => value && onSelectedTeamChange(value)}
              disabled={!selectedUserId}
              items={teamItems}
            >
              <SelectTrigger id="team-select">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} ({team.memberCount} members)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-select">Role</Label>
            <Select
              value={selectedRole}
              onValueChange={(value) => value && onSelectedRoleChange(value)}
              items={{ member: "Member", lead: "Lead", admin: "Admin" }}
            >
              <SelectTrigger id="role-select">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={onAssign}
              disabled={isSubmitting || !selectedUserId || !selectedTeamId}
            >
              {isSubmitting && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Assign
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
