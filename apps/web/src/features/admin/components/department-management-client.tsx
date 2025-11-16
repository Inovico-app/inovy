"use client";

import type { DepartmentDto } from "@/server/dto/department.dto";
import { Activity, useState } from "react";
import { useDepartmentActions } from "../hooks/use-department-actions";
import { CreateDepartmentDialog } from "./create-department-dialog";
import { DepartmentItem } from "./department-item";
import { EditDepartmentDialog } from "./edit-department-dialog";

interface DepartmentManagementClientProps {
  departments: DepartmentDto[];
  topLevelDepartments: DepartmentDto[];
  canEdit: boolean;
}

export function DepartmentManagementClient({
  departments,
  topLevelDepartments,
  canEdit,
}: DepartmentManagementClientProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] =
    useState<DepartmentDto | null>(null);

  const { handleCreate, handleUpdate, handleDelete, isSubmitting } =
    useDepartmentActions({
      onCreateSuccess: () => {
        setIsCreateOpen(false);
      },
      onUpdateSuccess: () => {
        setEditingDepartment(null);
      },
    });

  return (
    <div className="space-y-4">
      {canEdit && (
        <CreateDepartmentDialog
          departments={departments}
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onSubmit={handleCreate}
          isSubmitting={isSubmitting}
        />
      )}

      <Activity mode={editingDepartment ? "visible" : "hidden"}>
        <EditDepartmentDialog
          department={editingDepartment}
          departments={departments}
          open={!!editingDepartment}
          onOpenChange={(open) => {
            if (!open) {
              setEditingDepartment(null);
            }
          }}
          onSubmit={(formData) => {
            if (editingDepartment) {
              handleUpdate(editingDepartment.id, formData);
            }
          }}
          isSubmitting={isSubmitting}
        />
      </Activity>

      {departments.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          No departments yet. {canEdit && "Create your first department above."}
        </p>
      ) : (
        <div className="space-y-2">
          {topLevelDepartments.map((dept) => (
            <DepartmentItem
              key={dept.id}
              department={dept}
              departments={departments}
              canEdit={canEdit}
              onEdit={setEditingDepartment}
              onDelete={handleDelete}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </div>
  );
}

