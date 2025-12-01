"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TeamWithMemberCount } from "@/server/cache/team.cache";
import { Loader2Icon, Search, UserPlusIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  assignUserToTeam,
  removeUserFromTeam,
  updateUserTeamRole,
} from "../../actions/teams";

interface TeamMember {
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
          <Dialog
            open={isAssignDialogOpen}
            onOpenChange={setIsAssignDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <UserPlusIcon className="mr-2 h-4 w-4" />
                Assign to Team
              </Button>
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
                    onValueChange={setSelectedUserId}
                  >
                    <SelectTrigger id="user-select">
                      <SelectValue placeholder="Select a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {getUserName(member)}{" "}
                          {member.email && `(${member.email})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team-select">Team</Label>
                  <Select
                    value={selectedTeamId}
                    onValueChange={setSelectedTeamId}
                    disabled={!selectedUserId}
                  >
                    <SelectTrigger id="team-select">
                      <SelectValue placeholder="Select a team" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTeamsForUser.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name} ({team.memberCount} members)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-select">Role</Label>
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
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
                    onClick={() => setIsAssignDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssign}
                    disabled={
                      isSubmitting || !selectedUserId || !selectedTeamId
                    }
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
        )}
      </div>

      {/* Members List */}
      <div className="space-y-2">
        {filteredMembers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {searchQuery
              ? "No members match your search criteria."
              : "No members found."}
          </p>
        ) : (
          filteredMembers.map((member) => (
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
                                  setShowRemoveDialog({
                                    userId: member.id,
                                    userName: getUserName(member),
                                    teamId: teamMembership.teamId,
                                    teamName: teamMembership.teamName,
                                  })
                                }
                                disabled={isSubmitting}
                              >
                                <XIcon className="h-3 w-3" />
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

      {/* Remove Confirmation Dialog */}
      <AlertDialog
        open={!!showRemoveDialog}
        onOpenChange={(open) => !open && setShowRemoveDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{showRemoveDialog?.userName}</strong> from{" "}
              <strong>{showRemoveDialog?.teamName}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

