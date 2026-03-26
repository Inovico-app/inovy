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
import { Textarea } from "@/components/ui/textarea";

import type { TeamWithMemberCount } from "@/server/cache/team.cache";
import { Edit, Plus, Search, Trash2, Users, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { createTeam, deleteTeam, updateTeam } from "../../actions/teams";

interface TeamManagementClientProps {
  teams: TeamWithMemberCount[];
  canEdit: boolean;
  organizationId: string;
}

export function TeamManagementClient({
  teams,
  canEdit,
}: TeamManagementClientProps) {
  const t = useTranslations("admin.teams");
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamWithMemberCount | null>(
    null,
  );
  const [deletingTeam, setDeletingTeam] = useState<TeamWithMemberCount | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCreate = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      const result = await createTeam({
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        departmentId: null,
      });
      if (result?.data) {
        setIsCreateOpen(false);
        toast.success(t("teamCreated"));
        router.refresh();
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingTeam) return;
    setIsSubmitting(true);
    try {
      const result = await updateTeam({
        id: editingTeam.id,
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        departmentId: null,
      });
      if (result?.data) {
        setEditingTeam(null);
        toast.success(t("teamUpdated"));
        router.refresh();
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTeam) return;
    setIsSubmitting(true);
    try {
      const result = await deleteTeam({ id: deletingTeam.id });
      if (result?.data) {
        toast.success(t("teamDeleted", { name: deletingTeam.name }));
        setDeletingTeam(null);
        router.refresh();
      } else if (result?.serverError) {
        toast.error(result.serverError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const query = searchQuery.toLowerCase();
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        team.description?.toLowerCase().includes(query),
    );
  }, [teams, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          placeholder={t("searchTeams")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          aria-label={t("searchTeams")}
        />
      </div>

      {/* Create team button */}
      {canEdit && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Create Team
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createTeam")}</DialogTitle>
              <DialogDescription>{t("addTeamDescription")}</DialogDescription>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  name="name"
                  required
                  placeholder="e.g. Engineering, Sales, Marketing"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">
                  Description{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Textarea
                  id="create-description"
                  name="description"
                  placeholder="What does this team work on?"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t("creating") : t("createTeam")}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit team dialog */}
      <Dialog
        open={!!editingTeam}
        onOpenChange={(open) => {
          if (!open) setEditingTeam(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editTeam")}</DialogTitle>
            <DialogDescription>{t("editTeamDescription")}</DialogDescription>
          </DialogHeader>
          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={editingTeam?.name || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="edit-description"
                name="description"
                defaultValue={editingTeam?.description || ""}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingTeam(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("saving") : t("saveChanges")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={!!deletingTeam}
        onOpenChange={(open) => !open && setDeletingTeam(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTeam")}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deletingTeam?.name}</strong>? Team-scoped projects and
              meetings will become org-wide. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? t("deleting") : t("deleteTeam")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Teams list */}
      {teams.length === 0 ? (
        <div className="text-center py-12">
          <Users
            className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3"
            aria-hidden="true"
          />
          <p className="text-muted-foreground">{t("noTeams")}</p>
          {canEdit && (
            <p className="text-sm text-muted-foreground mt-1">
              Create your first team to start organizing resources.
            </p>
          )}
        </div>
      ) : filteredTeams.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          {t("noTeamsMatch")}
        </p>
      ) : (
        <div className="space-y-2" role="list" aria-label="Teams">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              role="listitem"
              className="flex items-center justify-between py-3 px-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Link href={`/teams/${team.id}`} className="flex-1 min-w-0 group">
                <div className="flex items-center gap-2">
                  <span className="font-medium group-hover:underline truncate">
                    {team.name}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    <span>
                      {team.memberCount}{" "}
                      {team.memberCount === 1 ? "member" : "members"}
                    </span>
                  </span>
                </div>
                {team.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">
                    {team.description}
                  </p>
                )}
              </Link>
              {canEdit && (
                <div className="flex items-center gap-1 ml-4 shrink-0">
                  <Link
                    href={`/teams/${team.id}/members`}
                    aria-label={`Manage members of ${team.name}`}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingTeam(team)}
                    aria-label={`Edit ${team.name}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeletingTeam(team)}
                    disabled={isSubmitting}
                    aria-label={`Delete ${team.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
