"use client";

import { Button } from "@/components/ui/button";
import type { ProjectTemplateDto } from "@/server/dto/project-template.dto";
import { Loader2Icon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  useCreateProjectTemplate,
  useDeleteProjectTemplate,
  useUpdateProjectTemplate,
} from "../../hooks/use-project-template-actions";
import { ProjectTemplateForm } from "./project-template-form";

interface ProjectTemplateSectionClientProps {
  projectId: string;
  initialTemplate: ProjectTemplateDto | null;
}

/**
 * Render and manage a project's template UI, including create, edit, and delete flows.
 *
 * Displays the current template instructions (when present), allows switching into an edit form
 * to create or update the template, and supports deleting the template. While create/update/delete
 * operations are in progress the UI disables actions and shows appropriate loading state; successful
 * operations trigger user-facing success toasts and update local component state.
 *
 * @param projectId - The ID of the project the template belongs to.
 * @param initialTemplate - The initial template data or `null` when no template exists.
 * @returns A React element that provides the project template section UI and its interactions.
 */
export function ProjectTemplateSectionClient({
  projectId,
  initialTemplate,
}: ProjectTemplateSectionClientProps) {
  const [template, setTemplate] = useState<ProjectTemplateDto | null>(
    initialTemplate
  );
  const [isEditing, setIsEditing] = useState(false);

  const {
    executeAsync: executeCreate,
    isExecuting: isCreating,
  } = useCreateProjectTemplate();
  const {
    executeAsync: executeUpdate,
    isExecuting: isUpdating,
  } = useUpdateProjectTemplate();
  const {
    executeAsync: executeDelete,
    isExecuting: isDeleting,
  } = useDeleteProjectTemplate();

  const handleSave = useCallback(
    async (instructions: string) => {
      if (template) {
        // Update existing template
        const result = await executeUpdate({
          id: template.id,
          instructions,
        });
        if (!result?.data) {
          return;
        }
        setTemplate(result.data);
        toast.success("Template updated successfully");
        setIsEditing(false);
      } else {
        // Create new template
        const result = await executeCreate({
          projectId,
          instructions,
        });
        if (!result?.data) {
          return;
        }
        setTemplate(result.data);
        toast.success("Template created successfully");
        setIsEditing(false);
      }
    },
    [template, projectId, executeCreate, executeUpdate]
  );

  const handleDelete = useCallback(async () => {
    if (!template) return;

    const result = await executeDelete({ id: template.id });
    if (result?.serverError || result?.validationErrors) {
      return;
    }
    setTemplate(null);
    toast.success("Template deleted successfully");
    setIsEditing(false);
  }, [template, executeDelete]);

  const isProcessing = isCreating || isUpdating || isDeleting;

  return (
    <div className="space-y-4">
      {!isEditing && (
        <>
          {template ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 border border-border">
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {template.instructions}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => setIsEditing(true)}
                  disabled={isProcessing}
                >
                  Edit Template
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isProcessing}
                >
                  {isDeleting && (
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Delete Template
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No template defined yet</p>
              <Button
                variant="default"
                onClick={() => setIsEditing(true)}
                className="mt-4"
                disabled={isProcessing}
              >
                Create Template
              </Button>
            </div>
          )}
        </>
      )}

      {isEditing && (
        <ProjectTemplateForm
          initialValue={template?.instructions ?? ""}
          onSave={handleSave}
          onCancel={() => setIsEditing(false)}
          isLoading={isProcessing}
        />
      )}
    </div>
  );
}
