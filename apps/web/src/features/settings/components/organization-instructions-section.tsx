"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("settings.organization");
  const [instructions, setInstructions] = useState(() => initialInstructions);
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
        toast.success(t("instructionsUpdated"));

        // Refresh the data
        const refreshResult = await getOrganizationSettings();
        if (refreshResult.data?.instructions) {
          setInstructions(refreshResult.data.instructions);
        }
      } else {
        toast.error(result.serverError || t("instructionsUpdateFailed"));
      }
    } catch (error) {
      console.error("Error updating organization instructions:", error);
      toast.error(t("unexpectedError"));
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
            <CardTitle>{t("aiInstructions")}</CardTitle>
            <CardDescription>{t("aiInstructionsDescription")}</CardDescription>
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
                <p>{t("noInstructions")}</p>
                {canEdit && (
                  <p className="text-sm mt-2">{t("clickEditToAdd")}</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
