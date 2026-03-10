"use client";

import { Input } from "@/components/ui/input";
import type { TeamWithMemberCount } from "@/server/cache/team.cache";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  assignUserToTeam,
  removeUserFromTeam,
  updateUserTeamRole,
} from "../../actions/teams";
import { TeamAssignDialog } from "./team-assign-dialog";
import { TeamMemberList } from "./team-member-list";
import { TeamRemoveDialog } from "./team-remove-dialog";

export interface TeamMember {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
  roles?: string[];
  teams?: Array<{ teamId: string; teamName: string; role: string }>;
}

interface TeamMemberAssignmentProps {
  members: TeamMember[];
  teams: TeamWithMemberCount[];
  canEdit: boolean;
}

export function TeamMemberAssignment({
  members,
  teams,
  canEdit,
}: TeamMemberAssignmentProps) {
  const router = useRouter();
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState<{
    userId: string;
    userName: string;
    teamId: string;
    teamName: string;
  } | null>(null);

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;

    const query = searchQuery.toLowerCase();
    return members.filter(
      (member) =>
        member.email?.toLowerCase().includes(query) ||
        member.given_name?.toLowerCase().includes(query) ||
        member.family_name?.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  // Get available teams for selected user
  const availableTeamsForUser = useMemo(() => {
    if (!selectedUserId) return teams;

    const user = members.find((m) => m.id === selectedUserId);
    const userTeamIds = new Set(user?.teams?.map((t) => t.teamId) || []);

    return teams.filter((team) => !userTeamIds.has(team.id));
  }, [selectedUserId, members, teams]);

  const handleAssign = async () => {
    if (!selectedUserId || !selectedTeamId) {
      toast.error("Please select both a user and a team");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await assignUserToTeam({
        userId: selectedUserId,
        teamId: selectedTeamId,
        role: selectedRole as "member" | "lead" | "admin",
      });

      if (result?.data) {
        toast.success("User assigned to team successfully");
        setIsAssignDialogOpen(false);
        setSelectedUserId("");
        setSelectedTeamId("");
        setSelectedRole("member");
        router.refresh();
      } else if (result?.validationErrors) {
        const firstFieldErrors = Object.values(result.validationErrors)[0];
        const firstError = Array.isArray(firstFieldErrors)
          ? firstFieldErrors[0]
          : firstFieldErrors?._errors?.[0];
        toast.error(firstError ?? "Validation failed");
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } catch (error) {
      toast.error("Failed to assign user to team");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!showRemoveDialog) return;

    setIsSubmitting(true);
    try {
      const result = await removeUserFromTeam({
        userId: showRemoveDialog.userId,
        teamId: showRemoveDialog.teamId,
      });

      if (result?.data) {
        toast.success(
          `${showRemoveDialog.userName} removed from ${showRemoveDialog.teamName}`
        );
        setShowRemoveDialog(null);
        router.refresh();
      } else if (result?.validationErrors) {
        const firstFieldErrors = Object.values(result.validationErrors)[0];
        const firstError = Array.isArray(firstFieldErrors)
          ? firstFieldErrors[0]
          : firstFieldErrors?._errors?.[0];
        toast.error(firstError ?? "Validation failed");
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } catch (error) {
      toast.error("Failed to remove user from team");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (
    userId: string,
    teamId: string,
    newRole: string
  ) => {
    setIsSubmitting(true);
    try {
      const result = await updateUserTeamRole({
        userId,
        teamId,
        role: newRole as "member" | "lead" | "admin",
      });

      if (result?.data) {
        toast.success("Role updated successfully");
        router.refresh();
      } else if (result?.validationErrors) {
        const firstFieldErrors = Object.values(result.validationErrors)[0];
        const firstError = Array.isArray(firstFieldErrors)
          ? firstFieldErrors[0]
          : firstFieldErrors?._errors?.[0];
        toast.error(firstError ?? "Validation failed");
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } catch (error) {
      toast.error("Failed to update role");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserName = (member: TeamMember) => {
    if (member.given_name && member.family_name) {
      return `${member.given_name} ${member.family_name}`;
    }
    return member.given_name || member.family_name || member.email || "Unknown";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {canEdit && (
          <TeamAssignDialog
            open={isAssignDialogOpen}
            onOpenChange={setIsAssignDialogOpen}
            members={members}
            availableTeams={availableTeamsForUser}
            selectedUserId={selectedUserId}
            onSelectedUserChange={setSelectedUserId}
            selectedTeamId={selectedTeamId}
            onSelectedTeamChange={setSelectedTeamId}
            selectedRole={selectedRole}
            onSelectedRoleChange={setSelectedRole}
            onAssign={handleAssign}
            isSubmitting={isSubmitting}
            getUserName={getUserName}
          />
        )}
      </div>

      {/* Members List */}
      <TeamMemberList
        members={filteredMembers}
        searchQuery={searchQuery}
        canEdit={canEdit}
        isSubmitting={isSubmitting}
        getUserName={getUserName}
        onShowRemoveDialog={setShowRemoveDialog}
        onRoleChange={handleRoleChange}
      />

      {/* Remove Confirmation Dialog */}
      <TeamRemoveDialog
        data={showRemoveDialog}
        onOpenChange={() => setShowRemoveDialog(null)}
        onConfirm={handleRemove}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
