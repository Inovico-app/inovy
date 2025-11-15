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
import { Textarea } from "@/components/ui/textarea";
import {
  createTeam,
  updateTeam,
  deleteTeam,
} from "../actions/teams";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { TeamDto } from "@/server/dto/team.dto";
import type { DepartmentDto } from "@/server/dto/department.dto";

interface TeamManagementClientProps {
  teams: TeamDto[];
  departments: DepartmentDto[];
  canEdit: boolean;
  organizationId: string;
}

export function TeamManagementClient({
  teams,
  departments,
  canEdit,
  organizationId,
}: TeamManagementClientProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createDepartmentId, setCreateDepartmentId] = useState<string>("none");
  const [editDepartmentId, setEditDepartmentId] = useState<string>("none");

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
        departmentId: createDepartmentId && createDepartmentId !== "none" ? createDepartmentId : null,
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
        departmentId: editDepartmentId && editDepartmentId !== "none" ? editDepartmentId : null,
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

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return "No Department";
    const dept = departments.find((d) => d.id === departmentId);
    return dept?.name || "Unknown";
  };

  return (
    <div className="space-y-4">
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
              <div>
                <Label htmlFor="departmentId">Department</Label>
                <Select
                  value={createDepartmentId}
                  onValueChange={setCreateDepartmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (Standalone Team)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Standalone Team)</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

      {editingTeam && (
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
                  defaultValue={editingTeam.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={editingTeam.description || ""}
                />
              </div>
              <div>
                <Label htmlFor="edit-departmentId">Department</Label>
                <Select
                  value={editDepartmentId}
                  onValueChange={setEditDepartmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (Standalone Team)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Standalone Team)</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
      )}

      {teams.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No teams yet. {canEdit && "Create your first team above."}
        </p>
      ) : (
        <div className="space-y-2">
          {teams.map((team) => (
            <div
              key={team.id}
              className="flex items-center justify-between py-2 border-b"
            >
              <div className="flex-1">
                <div className="font-medium">{team.name}</div>
                {team.description && (
                  <div className="text-sm text-muted-foreground">
                    {team.description}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1">
                  Department: {getDepartmentName(team.departmentId)}
                </div>
              </div>
              {canEdit && (
                <div className="flex gap-2">
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

