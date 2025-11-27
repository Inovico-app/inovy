"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { createProjectTemplateAction } from "../actions/create-project-template";
import { deleteProjectTemplateAction } from "../actions/delete-project-template";
import { updateProjectTemplateAction } from "../actions/update-project-template";

/**
 * Provides a React hook that performs project template creation and reports failures to the user.
 *
 * The hook invokes the configured create action and, on failure, displays an error toast using the server-provided message when available or "Failed to create template".
 *
 * @returns An action handler bound to the create project template action that can be called to create a project template
 */
export function useCreateProjectTemplate() {
  return useAction(createProjectTemplateAction, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to create template");
    },
  });
}

/**
 * Provides a hook to run project template update operations.
 *
 * @returns A callable action hook that performs the update; on failure it shows a toast with the server error message or "Failed to update template".
 */
export function useUpdateProjectTemplate() {
  return useAction(updateProjectTemplateAction, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to update template");
    },
  });
}

/**
 * Hook for deleting project templates
 */
export function useDeleteProjectTemplate() {
  return useAction(deleteProjectTemplateAction, {
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Failed to delete template");
    },
  });
}
