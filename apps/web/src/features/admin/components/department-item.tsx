"use client";

import { Button } from "@/components/ui/button";
import type { DepartmentDto } from "@/server/dto/department.dto";
import { Edit, Trash2 } from "lucide-react";

interface DepartmentItemProps {
  department: DepartmentDto;
  departments: DepartmentDto[];
  canEdit: boolean;
  onEdit: (department: DepartmentDto) => void;
  onDelete: (id: string) => void;
  isSubmitting: boolean;
  level?: number;
}

/**
 * Recursive component for rendering a department and its children
 */
export function DepartmentItem({
  department,
  departments,
  canEdit,
  onEdit,
  onDelete,
  isSubmitting,
  level = 0,
}: DepartmentItemProps) {
  const children = departments.filter(
    (d) => d.parentDepartmentId === department.id
  );

  return (
    <div className="ml-4">
      <div className="flex items-center justify-between py-2 border-b">
        <div className="flex-1">
          <div className="font-medium">{department.name}</div>
          {department.description && (
            <div className="text-sm text-muted-foreground">
              {department.description}
            </div>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(department)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(department.id)}
              disabled={isSubmitting}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
      {children.map((child) => (
        <DepartmentItem
          key={child.id}
          department={child}
          departments={departments}
          canEdit={canEdit}
          onEdit={onEdit}
          onDelete={onDelete}
          isSubmitting={isSubmitting}
          level={level + 1}
        />
      ))}
    </div>
  );
}

