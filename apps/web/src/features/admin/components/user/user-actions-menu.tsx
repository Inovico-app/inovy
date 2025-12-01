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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2Icon,
  MoreVerticalIcon,
  ShieldIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  removeMember,
  updateMemberRole,
} from "../../actions/member-management";

interface UserActionsMenuProps {
  memberId: string;
  memberEmail: string;
  memberName: string;
  currentRole?: string;
}

export function UserActionsMenu({
  memberId,
  memberEmail,
  memberName,
  currentRole = "member",
}: UserActionsMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>(currentRole);

  const handleRemoveMember = async () => {
    setIsDeleting(true);
    try {
      const result = await removeMember({ memberIdOrEmail: memberEmail });

      if (result?.data) {
        toast.success(`${memberName} has been removed from the organization`);
        setShowDeleteDialog(false);
      } else if (result?.validationErrors) {
        toast.error(JSON.stringify(result.validationErrors));
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } catch (error) {
      toast.error("Failed to remove member");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (selectedRole === currentRole) {
      setShowRoleDialog(false);
      return;
    }

    setIsUpdatingRole(true);
    try {
      const result = await updateMemberRole({
        memberId,
        role: selectedRole as "owner" | "admin" | "member",
      });

      if (result?.data) {
        toast.success(
          `${memberName}'s role has been updated to ${selectedRole}`
        );
        setShowRoleDialog(false);
      } else if (result?.validationErrors) {
        toast.error(JSON.stringify(result.validationErrors));
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } catch (error) {
      toast.error("Failed to update role");
      console.error(error);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVerticalIcon className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowRoleDialog(true)}>
            <ShieldIcon className="mr-2 h-4 w-4" />
            Change Role
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600 focus:text-red-600"
          >
            <TrashIcon className="mr-2 h-4 w-4" />
            Remove from Organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberName}</strong> from
              the organization? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Update Dialog */}
      <AlertDialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Member Role</AlertDialogTitle>
            <AlertDialogDescription>
              Change the role for <strong>{memberName}</strong> in the
              organization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingRole}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateRole}
              disabled={isUpdatingRole || selectedRole === currentRole}
            >
              {isUpdatingRole && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

