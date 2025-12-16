"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateProjectForm } from "./create-project-form";

interface CreateProjectModalProps {
  /**
   * Optional custom trigger element to open the modal.
   * If omitted, a default "Create New Project" button with a plus icon is used.
   */
  trigger?: React.ReactNode;
  /**
   * Optional controlled open state; when provided, the modal's visibility is driven by this value.
   */
  open?: boolean;
  /**
   * Optional controlled state updater called with the new open state when the modal requests to open or close.
   */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Renders a modal dialog that lets the user create a new project.
 *
 * The modal can be used in either controlled or uncontrolled mode: when `open` and
 * `onOpenChange` are provided the parent controls visibility; otherwise the component
 * manages its own open state.
 *
 * @param trigger - Optional custom trigger element to open the modal
 * @param open - Optional controlled open state for the dialog
 * @param onOpenChange - Optional callback invoked with the new open state when the dialog is toggled
 * @returns A JSX element rendering the Create Project modal
 */
export function CreateProjectModal({
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: CreateProjectModalProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleOpenChange = (open: boolean) => {
    if (controlledOnOpenChange) {
      controlledOnOpenChange(open);
    } else {
      setInternalOpen(open);
    }
  };

  const handleSuccess = (projectId: string) => {
    handleOpenChange(false);
    // Navigate to the newly created project
    router.push(`/projects/${projectId}`);
    router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            Create New Project
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Create a new project to organize your meeting recordings.
          </DialogDescription>
        </DialogHeader>
        <CreateProjectForm onSuccess={handleSuccess} showCard={false} />
      </DialogContent>
    </Dialog>
  );
}

