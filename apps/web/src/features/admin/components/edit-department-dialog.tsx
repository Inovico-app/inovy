"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import type { DepartmentDto } from "@/server/dto/department.dto";
import { useState, useEffect } from "react";

interface EditDepartmentDialogProps {
  department: DepartmentDto | null;
  departments: DepartmentDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => void;
  isSubmitting: boolean;
}

/**
 * Dialog component for editing an existing department
 */
export function EditDepartmentDialog({
  department,
  departments,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: EditDepartmentDialogProps) {
  const [parentDepartmentId, setParentDepartmentId] = useState<string>("none");

  useEffect(() => {
    if (department) {
      setParentDepartmentId(department.parentDepartmentId ?? "none");
    }
  }, [department]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>Update department information</DialogDescription>
        </DialogHeader>
        {department && (
          <form action={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                name="name"
                defaultValue={department.name}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                defaultValue={department.description ?? ""}
              />
            </div>
            <div>
              <Label htmlFor="edit-parentDepartmentId">Parent Department</Label>
              <Select
                value={parentDepartmentId}
                onValueChange={setParentDepartmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None (Top Level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Top Level)</SelectItem>
                  {departments
                    .filter((d) => d.id !== department.id)
                    .map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <input
                type="hidden"
                name="parentDepartmentId"
                value={parentDepartmentId}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                Update
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

