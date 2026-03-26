"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface OrganizationInstructionsFormProps {
  initialValue: string;
  organizationId: string;
  onSave: (instructions: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  canEdit: boolean;
}

/**
 * Form for editing organization-wide AI instructions
 * Admin-only edit access, read-only for other users
 */
export function OrganizationInstructionsForm({
  initialValue,
  organizationId: _organizationId,
  onSave,
  onCancel,
  isLoading = false,
  canEdit,
}: OrganizationInstructionsFormProps) {
  const t = useTranslations("settings.organization");
  const [instructions, setInstructions] = useState(() => initialValue);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!instructions.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(instructions);
    } finally {
      setIsSaving(false);
    }
  };

  const isDisabled =
    !canEdit ||
    isLoading ||
    isSaving ||
    !instructions.trim() ||
    instructions.length > 100000;

  const hasChanges = instructions !== initialValue;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="org-ai-instructions" className="text-sm font-medium">
            {t("orgAiInstructions")}
          </label>
          {!canEdit && (
            <span className="text-xs text-muted-foreground">
              (Admin access required to edit)
            </span>
          )}
        </div>
        <Textarea
          id="org-ai-instructions"
          placeholder={
            canEdit
              ? t("instructionsPlaceholder")
              : t("noInstructionsPlaceholder")
          }
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={isLoading || isSaving}
          readOnly={!canEdit}
          rows={12}
          className="min-h-[300px] resize-vertical"
          maxLength={100000}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {instructions.length.toLocaleString()} / 100,000 characters
          </span>
          {instructions.length > 100000 && (
            <span className="text-destructive">
              {t("characterLimitExceeded")}
            </span>
          )}
        </div>
      </div>

      {canEdit && (
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading || isSaving || !hasChanges}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isDisabled || !hasChanges}>
            {isSaving && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
            Save Instructions
          </Button>
        </div>
      )}
    </div>
  );
}
