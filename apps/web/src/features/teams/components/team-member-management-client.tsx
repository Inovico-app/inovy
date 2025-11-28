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
import { assignUserToTeam, removeUserFromTeam } from "@/features/admin/actions/teams";
import { Loader2Icon, Search, TrashIcon, UserPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  createdAt: Date | null;
}

interface OrgMember {
  id: string;
  email: string | null;
  given_name: string | null;
  family_name: string | null;
}

interface TeamMemberManagementClientProps {
  teamId: string;
  teamMembers: TeamMember[];
  availableMembers: OrgMember[];
}

export function TeamMemberManagementClient({
  teamId,
  teamMembers,
  availableMembers,
}: TeamMemberManagementClientProps) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("member");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRemoveDialog, setShowRemoveDialog] = useState<{
    userId: string;
    userName: string;
  } | null>(null);

  // Filter team members by search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return teamMembers;

    const query = searchQuery.toLowerCase();
    return teamMembers.filter((member) =>
      member.userId.toLowerCase().includes(query)
    );
  }, [teamMembers, searchQuery]);

  const handleAddMember = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await assignUserToTeam({
        userId: selectedUserId,
        teamId,
        role: selectedRole as "member" | "lead" | "admin",
      });

      if (result?.data) {
        toast.success("Member added successfully");
        setIsAddDialogOpen(false);
        setSelectedUserId("");
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
      toast.error("Failed to add member");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!showRemoveDialog) return;

    setIsSubmitting(true);
    try {
      const result = await removeUserFromTeam({
        userId: showRemoveDialog.userId,
        teamId,
      });

      if (result?.data) {
        toast.success(`${showRemoveDialog.userName} removed from team`);
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
      toast.error("Failed to remove member");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUserName = (member: OrgMember) => {
    if (member.given_name && member.family_name) {
      return `${member.given_name} ${member.family_name}`;
    }
    return member.given_name || member.family_name || member.email || "Unknown";
  };

  return (
    <div className="space-y-4">
      {/* Search and Add */}
      <div className="flex items-center gap-4">
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

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlusIcon className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Member to Team</DialogTitle>
              <DialogDescription>
                Select a user from the organization to add to this team
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-select">User</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger id="user-select">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMembers.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground">
                        No available members
                      </div>
                    ) : (
                      availableMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {getUserName(member)} {member.email && `(${member.email})`}
                        </SelectItem>
                      ))
                    )}
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
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddMember}
                  disabled={isSubmitting || !selectedUserId}
                >
                  {isSubmitting && (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Member
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Members List */}
      <div className="space-y-2">
        {filteredMembers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {searchQuery
              ? "No members match your search criteria."
              : "No members in this team yet."}
          </p>
        ) : (
          filteredMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between py-3 px-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {member.userId.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium">User {member.userId.substring(0, 8)}...</div>
                  <div className="text-xs text-muted-foreground">
                    Joined {new Date(member.createdAt ?? new Date()).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setShowRemoveDialog({
                    userId: member.userId,
                    userName: `User ${member.userId.substring(0, 8)}`,
                  })
                }
                disabled={isSubmitting}
              >
                <TrashIcon className="h-4 w-4 text-red-600" />
              </Button>
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
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{showRemoveDialog?.userName}</strong> from this team?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

