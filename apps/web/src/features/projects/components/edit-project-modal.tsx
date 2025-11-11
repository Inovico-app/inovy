"use client";

import { PencilIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { EditProjectForm } from "./edit-project-form";

interface EditProjectModalProps {
  projectId: string;
  initialData: {
    name: string;
    description: string | null;
  };
  variant?: "default" | "outline" | "ghost";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Render a modal that allows editing a project's name and description.
 *
 * The modal can be used in either controlled or uncontrolled mode: when `open` and
 * `onOpenChange` are provided the parent controls visibility; otherwise the component
 * manages its own open state.
 *
 * @param projectId - The ID of the project being edited
 * @param initialData - Initial form values; expected shape: `{ name: string; description: string | null }`
 * @param variant - Button variant for the trigger; defaults to `"default"`
 * @param open - Optional controlled open state for the dialog
 * @param onOpenChange - Optional callback invoked with the new open state when the dialog is toggled
 * @returns A JSX element rendering the Edit Project modal
 */
export function EditProjectModal({
  projectId,
  initialData,
  variant = "default",
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: EditProjectModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <PencilIcon className="h-4 w-4 mr-2" />
          Edit Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Update your project information. Changes will be reflected immediately.
          </DialogDescription>
        </DialogHeader>
        <EditProjectForm
          projectId={projectId}
          initialData={initialData}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
