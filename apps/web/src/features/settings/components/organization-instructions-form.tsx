"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
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
  organizationId,
  onSave,
  onCancel,
  isLoading = false,
  canEdit,
}: OrganizationInstructionsFormProps) {
  const [instructions, setInstructions] = useState(initialValue);
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
          <label className="text-sm font-medium">
            Organization AI Instructions
          </label>
          {!canEdit && (
            <span className="text-xs text-muted-foreground">
              (Admin access required to edit)
            </span>
          )}
        </div>
        <Textarea
          placeholder={
            canEdit
              ? "Enter organization-wide guidelines and instructions for the AI. These will be included in all chat responses across all projects to help guide AI behavior for your organization."
              : "No organization instructions set yet."
          }
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={!canEdit || isLoading || isSaving}
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
            <span className="text-destructive">Character limit exceeded</span>
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
          <Button
            onClick={handleSubmit}
            disabled={isDisabled || !hasChanges}
          >
            {isSaving && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
            Save Instructions
          </Button>
        </div>
      )}
    </div>
  );
}

