"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";

interface ProjectTemplateFormProps {
  initialValue: string;
  onSave: (instructions: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * Renders a form for creating or editing a project instruction template.
 *
 * The form includes a labeled multiline textarea prefilled with `initialValue`, a live character count,
 * and Cancel/Save actions. The Save button calls `onSave` with the current instructions; inputs are disabled
 * while `isLoading` or an internal save is in progress.
 *
 * @param initialValue - Initial instructions to populate the textarea
 * @param onSave - Called with the current instructions when the user saves the template
 * @param onCancel - Called when the user cancels editing the template
 * @param isLoading - When true, disables inputs and actions to reflect an external loading state
 * @returns A React element containing the instruction textarea, character count, and Cancel/Save buttons
 */
export function ProjectTemplateForm({
  initialValue,
  onSave,
  onCancel,
  isLoading = false,
}: ProjectTemplateFormProps) {
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
    isLoading ||
    isSaving ||
    !instructions.trim() ||
    instructions.length > 50000;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Project Instructions</label>
        <Textarea
          placeholder="Enter project-specific guidelines and instructions for the AI. These will be included in chat responses to help guide AI behavior for this project."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={isLoading || isSaving}
          rows={10}
          className="min-h-[240px] resize-vertical"
          maxLength={50000}
        />
        <div className="text-xs text-muted-foreground">
          {instructions.length} / 50000 characters
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel} disabled={isDisabled}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isDisabled}>
          {isSaving && <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />}
          Save Template
        </Button>
      </div>
    </div>
  );
}

