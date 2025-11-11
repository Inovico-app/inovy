"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  createProjectTemplateAction,
  updateProjectTemplateAction,
  deleteProjectTemplateAction,
} from "../actions/index";
import { ProjectTemplateForm } from "./project-template-form";
import type { ProjectTemplateDto } from "@/server/dto";
import { Loader2Icon } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { getCachedProjectTemplate } from "@/server/cache/project-template.cache";

interface ProjectTemplateSectionProps {
  projectId: string;
}

export async function ProjectTemplateSection({
  projectId,
}: ProjectTemplateSectionProps) {
  // Fetch the template server-side first
  const template = await getCachedProjectTemplate(projectId);

  return (
    <ProjectTemplateSectionClient
      projectId={projectId}
      initialTemplate={template}
    />
  );
}

interface ProjectTemplateSectionClientProps {
  projectId: string;
  initialTemplate: ProjectTemplateDto | null;
}

function ProjectTemplateSectionClient({
  projectId,
  initialTemplate,
}: ProjectTemplateSectionClientProps) {
  const [template, setTemplate] = useState<ProjectTemplateDto | null>(
    initialTemplate
  );
  const [isEditing, setIsEditing] = useState(false);

  const { execute: executeCreate, isExecuting: isCreating } = useAction(
    createProjectTemplateAction,
    {
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to create template");
      },
    }
  );

  const { execute: executeUpdate, isExecuting: isUpdating } = useAction(
    updateProjectTemplateAction,
    {
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to update template");
      },
    }
  );

  const { execute: executeDelete, isExecuting: isDeleting } = useAction(
    deleteProjectTemplateAction,
    {
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to delete template");
      },
    }
  );

  const handleSave = useCallback(
    async (instructions: string) => {
      if (template) {
        // Update existing template
        await executeUpdate({
          id: template.id,
          instructions,
        });

        // Update local state
        setTemplate({
          ...template,
          instructions,
          updatedAt: new Date(),
        });
        toast.success("Template updated successfully");
        setIsEditing(false);
      } else {
        // Create new template
        await executeCreate({
          projectId,
          instructions,
        });

        toast.success("Template created successfully");
        setIsEditing(false);
      }
    },
    [template, projectId, executeCreate, executeUpdate]
  );

  const handleDelete = useCallback(async () => {
    if (!template) return;

    await executeDelete({ id: template.id });

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

