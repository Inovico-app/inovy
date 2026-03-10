"use client";

import { Input } from "@/components/ui/input";
import type { TeamWithMemberCount } from "@/server/cache/team.cache";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  assignUserToTeam,
  removeUserFromTeam,
  updateUserTeamRole,
} from "../../actions/teams";
import { useTeamAssignmentState } from "../../hooks/use-team-assignment-state";
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
  const {
    state,
    setSelectedUser,
    setSelectedTeam,
    setSelectedRole,
    setSubmitting,
    setSearchQuery,
    showRemoveDialog,
    hideRemoveDialog,
    closeAssignDialog,
    setAssignDialogOpen,
  } = useTeamAssignmentState();

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!state.searchQuery.trim()) return members;

    const query = state.searchQuery.toLowerCase();
    return members.filter(
      (member) =>
        member.email?.toLowerCase().includes(query) ||
        member.given_name?.toLowerCase().includes(query) ||
        member.family_name?.toLowerCase().includes(query)
    );
  }, [members, state.searchQuery]);

  // Get available teams for selected user
  const availableTeamsForUser = useMemo(() => {
    if (!state.selectedUserId) return teams;

    const user = members.find((m) => m.id === state.selectedUserId);
    const userTeamIds = new Set(user?.teams?.map((t) => t.teamId) || []);

    return teams.filter((team) => !userTeamIds.has(team.id));
  }, [state.selectedUserId, members, teams]);

  const handleAssign = async () => {
    if (!state.selectedUserId || !state.selectedTeamId) {
      toast.error("Please select both a user and a team");
      return;
    }

    setSubmitting(true);
    try {
      const result = await assignUserToTeam({
        userId: state.selectedUserId,
        teamId: state.selectedTeamId,
        role: state.selectedRole as "member" | "lead" | "admin",
      });

      if (result?.data) {
        toast.success("User assigned to team successfully");
        closeAssignDialog();
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
      setSubmitting(false);
    }
  };

  const handleRemove = async () => {
    if (!state.showRemoveDialog) return;

    setSubmitting(true);
    try {
      const result = await removeUserFromTeam({
        userId: state.showRemoveDialog.userId,
        teamId: state.showRemoveDialog.teamId,
      });

      if (result?.data) {
        toast.success(
          `${state.showRemoveDialog.userName} removed from ${state.showRemoveDialog.teamName}`
        );
        hideRemoveDialog();
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
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (
    userId: string,
    teamId: string,
    newRole: string
  ) => {
    setSubmitting(true);
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
      setSubmitting(false);
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
            value={state.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {canEdit && (
          <TeamAssignDialog
            open={state.isAssignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            members={members}
            availableTeams={availableTeamsForUser}
            selectedUserId={state.selectedUserId}
            onSelectedUserChange={setSelectedUser}
            selectedTeamId={state.selectedTeamId}
            onSelectedTeamChange={setSelectedTeam}
            selectedRole={state.selectedRole}
            onSelectedRoleChange={setSelectedRole}
            onAssign={handleAssign}
            isSubmitting={state.isSubmitting}
            getUserName={getUserName}
          />
        )}
      </div>

      {/* Members List */}
      <TeamMemberList
        members={filteredMembers}
        searchQuery={state.searchQuery}
        canEdit={canEdit}
        isSubmitting={state.isSubmitting}
        getUserName={getUserName}
        onShowRemoveDialog={showRemoveDialog}
        onRoleChange={handleRoleChange}
      />

      {/* Remove Confirmation Dialog */}
      <TeamRemoveDialog
        data={state.showRemoveDialog}
        onOpenChange={() => hideRemoveDialog()}
        onConfirm={handleRemove}
        isSubmitting={state.isSubmitting}
      />
    </div>
  );
}
