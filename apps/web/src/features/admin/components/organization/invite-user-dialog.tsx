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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { inviteMember } from "../../actions/member-management";

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["owner", "admin", "user", "viewer", "manager"]),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

export function InviteUserDialog() {
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    resolver: standardSchemaResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "user",
    },
  });

  const role = watch("role");

  const onSubmit = async (data: InviteFormValues) => {
    try {
      const result = await inviteMember(data);

      if (result?.data) {
        toast.success("Invitation sent successfully");
        reset();
        setOpen(false);
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
      toast.error("Failed to send invitation");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Organization Member</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new member to your organization
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              {...register("email")}
              aria-invalid={errors.email ? "true" : "false"}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              The email address of the person you want to invite
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(value) =>
                setValue(
                  "role",
                  value as "owner" | "admin" | "user" | "viewer" | "manager"
                )
              }
            >
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
            {errors.role && (
              <p className="text-sm text-red-600">{errors.role.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              The role this member will have in the organization
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              Send Invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

