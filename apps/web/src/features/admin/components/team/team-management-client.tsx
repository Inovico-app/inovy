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
import { Textarea } from "@/components/ui/textarea";

import type { TeamWithMemberCount } from "@/server/cache/team.cache";
import { Edit, Plus, Search, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { Activity, useEffect, useMemo, useState } from "react";
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
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamWithMemberCount | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createDepartmentId, setCreateDepartmentId] = useState<string>("none");
  const [editDepartmentId, setEditDepartmentId] = useState<string>("none");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (editingTeam) {
      setEditDepartmentId(editingTeam.departmentId ?? "none");
    }
  }, [editingTeam]);

  const handleCreate = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      const result = await createTeam({
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        departmentId:
          createDepartmentId && createDepartmentId !== "none"
            ? createDepartmentId
            : null,
      });
      if (result?.data) {
        setIsCreateOpen(false);
        setCreateDepartmentId("none");
        router.refresh();
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
        departmentId:
          editDepartmentId && editDepartmentId !== "none"
            ? editDepartmentId
            : null,
      });
      if (result?.data) {
        setEditingTeam(null);
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;
    setIsSubmitting(true);
    try {
      await deleteTeam({ id });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter teams based on search query
  const filteredTeams = useMemo(() => {
    if (!searchQuery.trim()) return teams;

    const query = searchQuery.toLowerCase();
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(query) ||
        team.description?.toLowerCase().includes(query)
    );
  }, [teams, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search teams..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {canEdit && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Team</DialogTitle>
              <DialogDescription>
                Add a new team to your organization
              </DialogDescription>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  Create
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Activity mode={editingTeam ? "visible" : "hidden"}>
        <Dialog
          open={!!editingTeam}
          onOpenChange={() => {
            setEditingTeam(null);
            setEditDepartmentId("none");
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Team</DialogTitle>
              <DialogDescription>Update team information</DialogDescription>
            </DialogHeader>
            <form action={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingTeam?.name || ""}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={editingTeam?.description || ""}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingTeam(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  Update
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </Activity>

      {teams.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No teams yet. {canEdit && "Create your first team above."}
        </p>
      ) : filteredTeams.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No teams match your search criteria.
        </p>
      ) : (
        <div className="space-y-2">
          {filteredTeams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between py-3 px-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium">{team.name}</div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{team.memberCount}</span>
                  </div>
                </div>
                {team.description && (
                  <div className="text-sm text-muted-foreground mt-1">
                    {team.description}
                  </div>
                )}
              </div>
              {canEdit && (
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingTeam(team)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(team.id)}
                    disabled={isSubmitting}
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

