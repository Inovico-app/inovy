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
import type { DepartmentDto } from "@/server/dto/department.dto";
import { Plus } from "lucide-react";
import { useState } from "react";

interface CreateDepartmentDialogProps {
  departments: DepartmentDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => void;
  isSubmitting: boolean;
}

/**
 * Dialog component for creating a new department
 */
export function CreateDepartmentDialog({
  departments,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: CreateDepartmentDialogProps) {
  const [parentDepartmentId, setParentDepartmentId] = useState<string>("none");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
        <form action={onSubmit} className="space-y-4">
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
            <Select
              value={parentDepartmentId}
              onValueChange={setParentDepartmentId}
            >
              <SelectTrigger>
                <SelectValue placeholder="None (Top Level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Top Level)</SelectItem>
                {departments.map((dept) => (
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
              Create
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

