"use client";

import { toast } from "sonner";
import { useAction } from "next-safe-action/hooks";
import {
  createProjectTemplateAction,
  updateProjectTemplateAction,
  deleteProjectTemplateAction,
} from "../actions/index";

/**
 * Hook for creating project templates
 */
export function useCreateProjectTemplate() {
  return useAction(createProjectTemplateAction, {
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to create template");
    },
  });
}

/**
 * Hook for updating project templates
 */
export function useUpdateProjectTemplate() {
  return useAction(updateProjectTemplateAction, {
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to update template");
    },
  });
}

/**
 * Hook for deleting project templates
 */
export function useDeleteProjectTemplate() {
  return useAction(deleteProjectTemplateAction, {
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to delete template");
    },
  });
}

