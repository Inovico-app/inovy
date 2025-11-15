"use client";

import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createDepartment,
  deleteDepartment,
  updateDepartment,
} from "../actions/departments";

interface UseDepartmentActionsOptions {
  onCreateSuccess?: () => void;
  onUpdateSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

/**
 * Custom hook for department management actions
 * Uses useAction from next-safe-action to handle all submitting states and errors
 */
export function useDepartmentActions(
  options?: UseDepartmentActionsOptions
) {
  const router = useRouter();

  const {
    execute: executeCreate,
    isExecuting: isCreating,
    result: createResult,
  } = useAction(createDepartment, {
    onSuccess: ({ data }) => {
      if (data) {
        toast.success("Department created successfully");
        router.refresh();
        options?.onCreateSuccess?.();
      }
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || "Failed to create department. Please try again."
      );
    },
  });

  const {
    execute: executeUpdate,
    isExecuting: isUpdating,
    result: updateResult,
  } = useAction(updateDepartment, {
    onSuccess: ({ data }) => {
      if (data) {
        toast.success("Department updated successfully");
        router.refresh();
        options?.onUpdateSuccess?.();
      }
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || "Failed to update department. Please try again."
      );
    },
  });

  const {
    execute: executeDelete,
    isExecuting: isDeleting,
    result: deleteResult,
  } = useAction(deleteDepartment, {
    onSuccess: ({ data }) => {
      if (data !== undefined) {
        toast.success("Department deleted successfully");
        router.refresh();
      }
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError || "Failed to delete department. Please try again."
      );
    },
  });

  const handleCreate = (formData: FormData) => {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const parentDepartmentId = formData.get("parentDepartmentId") as string;

    executeCreate({
      name,
      description: description || null,
      parentDepartmentId: parentDepartmentId && parentDepartmentId !== "none" ? parentDepartmentId : null,
    });
  };

  const handleUpdate = (id: string, formData: FormData) => {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const parentDepartmentId = formData.get("parentDepartmentId") as string;

    executeUpdate({
      id,
      name,
      description: description || null,
      parentDepartmentId: parentDepartmentId && parentDepartmentId !== "none" ? parentDepartmentId : null,
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) {
      return;
    }

    executeDelete({ id });
  };

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
    isCreating,
    isUpdating,
    isDeleting,
    isSubmitting: isCreating || isUpdating || isDeleting,
    createResult,
    updateResult,
    deleteResult,
  };
}

