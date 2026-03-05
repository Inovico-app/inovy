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
import { EmailChipInput } from "@/components/email-chip-input";
import { useEmailChipInput } from "@/hooks/use-email-chip-input";
import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { inviteMember } from "../../actions/member-management";

type Role = "owner" | "admin" | "user" | "viewer" | "manager";

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("user");
  const [isPending, startTransition] = useTransition();

  const {
    emails,
    inputValue,
    error,
    handleInputChange,
    handleKeyDown,
    handlePaste,
    removeEmail,
    clear,
  } = useEmailChipInput({
    messages: {
      invalidEmail: (email) => `"${email}" is not a valid email address`,
      duplicateEmail: (email) => `${email} has already been added`,
      maxEmails: (max) => `You can invite up to ${max} people at a time`,
    },
  });

  const handleSubmit = () => {
    if (emails.length === 0) return;

    startTransition(async () => {
      const settled = await Promise.allSettled(
        emails.map(async (email) => {
          const result = await inviteMember({ email, role });

          if (result?.data) return { email, success: true as const };

          if (result?.serverError) {
            return {
              email,
              success: false as const,
              error: result.serverError,
            };
          }

          if (result?.validationErrors) {
            const firstFieldErrors = Object.values(
              result.validationErrors
            )[0];
            const firstError = Array.isArray(firstFieldErrors)
              ? firstFieldErrors[0]
              : firstFieldErrors?._errors?.[0];
            return {
              email,
              success: false as const,
              error: firstError ?? "Validation failed",
            };
          }

          return { email, success: false as const, error: "Unknown error" };
        })
      );

      const results = settled.map((s) =>
        s.status === "fulfilled"
          ? s.value
          : {
              email: "unknown",
              success: false as const,
              error: "Failed to send",
            }
      );

      const successCount = results.filter((r) => r.success).length;
      const failures = results.filter((r) => !r.success);

      if (successCount > 0 && failures.length === 0) {
        toast.success(
          successCount === 1
            ? "Invitation sent successfully"
            : `${successCount} invitations sent successfully`
        );
      } else if (successCount > 0 && failures.length > 0) {
        toast.warning(`${successCount} sent, ${failures.length} failed`, {
          description: failures
            .map((r) => `${r.email}: ${r.error}`)
            .join(", "),
        });
      } else {
        toast.error("Failed to send invitations", {
          description: failures
            .map((r) => `${r.email}: ${r.error}`)
            .join(", "),
        });
      }

      setOpen(false);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          clear();
          setRole("user");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon className="mr-2 h-4 w-4" />
          Invite Members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>
            Add email addresses to invite new members to your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Email chip input */}
          <div className="space-y-2">
            <Label htmlFor="invite-email-input">Email Addresses</Label>
            <EmailChipInput
              emails={emails}
              inputValue={inputValue}
              error={error}
              disabled={isPending}
              onInputChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onRemove={removeEmail}
            />
          </div>

          {/* Role selector */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              All invited members will receive this role
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || emails.length === 0}
            >
              {isPending && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              {emails.length <= 1
                ? "Send Invitation"
                : `Send ${emails.length} Invitations`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
