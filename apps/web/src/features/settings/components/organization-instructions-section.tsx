"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { OrganizationInstructionsForm } from "./organization-instructions-form";
import {
  getOrganizationSettings,
  updateOrganizationSettings,
} from "../actions/organization-settings";

interface OrganizationInstructionsSectionProps {
  initialInstructions: string;
  organizationId: string;
  canEdit: boolean;
}

/**
 * Client component for managing organization AI instructions
 */
export function OrganizationInstructionsSection({
  initialInstructions,
  organizationId,
  canEdit,
}: OrganizationInstructionsSectionProps) {
  const [instructions, setInstructions] = useState(initialInstructions);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (newInstructions: string) => {
    setIsSaving(true);
    try {
      const result = await updateOrganizationSettings({
        organizationId,
        instructions: newInstructions,
      });

      if (result.data) {
        setInstructions(newInstructions);
        setIsEditing(false);
        toast.success("Organization instructions updated successfully");

        // Refresh the data
        const refreshResult = await getOrganizationSettings();
        if (refreshResult.data?.instructions) {
          setInstructions(refreshResult.data.instructions);
        }
      } else {
        toast.error(result.serverError || "Failed to update instructions");
      }
    } catch (error) {
      console.error("Error updating organization instructions:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>AI Instructions</CardTitle>
            <CardDescription>
              Organization-wide guidelines for AI behavior across all projects
            </CardDescription>
          </div>
          {canEdit && !isEditing && (
            <button
              onClick={handleEdit}
              className="text-sm text-primary hover:underline"
            >
              Edit
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <OrganizationInstructionsForm
            initialValue={instructions}
            organizationId={organizationId}
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={isSaving}
            canEdit={canEdit}
          />
        ) : (
          <div className="space-y-2">
            {instructions ? (
              <div className="rounded-lg border p-4 bg-muted/50">
                <pre className="whitespace-pre-wrap text-sm font-mono">
                  {instructions}
                </pre>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No organization instructions set yet.</p>
                {canEdit && (
                  <p className="text-sm mt-2">
                    Click "Edit" to add instructions for your organization.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

