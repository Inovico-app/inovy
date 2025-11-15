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
import { createDepartment, updateDepartment, deleteDepartment } from "../actions/departments";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DepartmentDto } from "@/server/dto/department.dto";

interface DepartmentManagementClientProps {
  departments: DepartmentDto[];
  topLevelDepartments: DepartmentDto[];
  departmentMap: Map<string, DepartmentDto>;
  canEdit: boolean;
  organizationId: string;
}

export function DepartmentManagementClient({
  departments,
  topLevelDepartments,
  departmentMap,
  canEdit,
  organizationId,
}: DepartmentManagementClientProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      const result = await createDepartment({
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        parentDepartmentId: (formData.get("parentDepartmentId") as string) || null,
      });
      if (result?.data) {
        setIsCreateOpen(false);
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    if (!editingDepartment) return;
    setIsSubmitting(true);
    try {
      const result = await updateDepartment({
        id: editingDepartment.id,
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        parentDepartmentId: (formData.get("parentDepartmentId") as string) || null,
      });
      if (result?.data) {
        setEditingDepartment(null);
        router.refresh();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    setIsSubmitting(true);
    try {
      await deleteDepartment({ id });
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDepartment = (dept: DepartmentDto, level = 0) => {
    const children = departments.filter((d) => d.parentDepartmentId === dept.id);
    return (
      <div key={dept.id} className="ml-4">
        <div className="flex items-center justify-between py-2 border-b">
          <div className="flex-1">
            <div className="font-medium">{dept.name}</div>
            {dept.description && (
              <div className="text-sm text-muted-foreground">
                {dept.description}
              </div>
            )}
          </div>
          {canEdit && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingDepartment(dept)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(dept.id)}
                disabled={isSubmitting}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        {children.map((child) => renderDepartment(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {canEdit && (
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Department
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Department</DialogTitle>
              <DialogDescription>
                Add a new department to your organization
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
                <Label htmlFor="parentDepartmentId">Parent Department</Label>
                <Select name="parentDepartmentId">
                  <SelectTrigger>
                    <SelectValue placeholder="None (Top Level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Top Level)</SelectItem>
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

      {editingDepartment && (
        <Dialog open={!!editingDepartment} onOpenChange={() => setEditingDepartment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Department</DialogTitle>
              <DialogDescription>
                Update department information
              </DialogDescription>
            </DialogHeader>
            <form action={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  name="name"
                  defaultValue={editingDepartment.name}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={editingDepartment.description || ""}
                />
              </div>
              <div>
                <Label htmlFor="edit-parentDepartmentId">Parent Department</Label>
                <Select
                  name="parentDepartmentId"
                  defaultValue={editingDepartment.parentDepartmentId || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None (Top Level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Top Level)</SelectItem>
                    {departments
                      .filter((d) => d.id !== editingDepartment.id)
                      .map((dept) => (
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
                  onClick={() => setEditingDepartment(null)}
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

      {departments.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No departments yet. {canEdit && "Create your first department above."}
        </p>
      ) : (
        <div className="space-y-2">
          {topLevelDepartments.map((dept) => renderDepartment(dept))}
        </div>
      )}
    </div>
  );
}

