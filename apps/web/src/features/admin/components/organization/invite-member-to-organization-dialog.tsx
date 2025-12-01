"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Loader2Icon, UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { inviteMemberToOrganization } from "../../actions/invite-member-to-organization";

const inviteFormSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["owner", "admin", "user", "viewer", "manager"]),
  teamIds: z.array(z.string()).optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteMemberToOrganizationDialogProps {
  organizationId: string;
  organizationName: string;
  teams: TeamWithMemberCount[];
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function InviteMemberToOrganizationDialog({
  organizationId,
  organizationName,
  teams,
  variant = "default",
  size = "default",
}: InviteMemberToOrganizationDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

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
      teamIds: [],
    },
  });

  const role = watch("role");

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams((prev) => {
      const updated = prev.includes(teamId)
        ? prev.filter((id) => id !== teamId)
        : [...prev, teamId];
      setValue("teamIds", updated);
      return updated;
    });
  };

  const onSubmit = async (data: InviteFormValues) => {
    try {
      const result = await inviteMemberToOrganization({
        organizationId,
        email: data.email,
        role: data.role,
        teamIds: selectedTeams.length > 0 ? selectedTeams : undefined,
      });

      if (result?.data) {
        const teamCount = selectedTeams.length;
        toast.success(
          `Invitation sent successfully${teamCount > 0 ? ` with ${teamCount} team assignment(s)` : ""}`
        );
        reset();
        setSelectedTeams([]);
        setOpen(false);
      } else if (result?.validationErrors) {
        const firstFieldErrors = Object.values(result.validationErrors)[0];
        let firstError: string | undefined;
        
        if (Array.isArray(firstFieldErrors)) {
          const firstItem = firstFieldErrors[0];
          if (typeof firstItem === 'string') {
            firstError = firstItem;
          } else if (firstItem && typeof firstItem === 'object' && '_errors' in firstItem) {
            const errors = firstItem._errors;
            firstError = Array.isArray(errors) && errors.length > 0 ? errors[0] : undefined;
          }
        } else if (firstFieldErrors && typeof firstFieldErrors === 'object' && '_errors' in firstFieldErrors) {
          const errors = firstFieldErrors._errors;
          firstError = Array.isArray(errors) && errors.length > 0 ? errors[0] : undefined;
        }
        
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
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          reset();
          setSelectedTeams([]);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={variant} size={size}>
          <UserPlusIcon className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite Member to {organizationName}</DialogTitle>
          <DialogDescription>
            Send an invitation email to add a new member to this organization.
            Optionally assign them to teams.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              className="w-full"
              {...register("email")}
              aria-invalid={errors.email ? "true" : "false"}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              The email address of the person you want to invite
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Organization Role</Label>
            <Select
              value={role}
              onValueChange={(value) =>
                setValue(
                  "role",
                  value as "owner" | "admin" | "user" | "viewer" | "manager"
                )
              }
            >
              <SelectTrigger id="role" className="w-full">
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
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              The role this member will have in the organization
            </p>
          </div>

          {/* Team Selection */}
          {teams.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Assign to Teams (Optional)</Label>
                <p className="text-sm text-muted-foreground">
                  Select teams to add this member to after they accept the
                  invitation
                </p>
              </div>
              <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                {teams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-start space-x-3 rounded-md p-2 hover:bg-accent transition-colors"
                  >
                    <Checkbox
                      id={`team-${team.id}`}
                      checked={selectedTeams.includes(team.id)}
                      onCheckedChange={() => handleTeamToggle(team.id)}
                    />
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor={`team-${team.id}`}
                        className="font-medium cursor-pointer"
                      >
                        {team.name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {team.memberCount} member
                        {team.memberCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {selectedTeams.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedTeams.length} team{selectedTeams.length === 1 ? "" : "s"}{" "}
                  selected
                </p>
              )}
            </div>
          )}

          {teams.length === 0 && (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No teams available in this organization
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t">
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

