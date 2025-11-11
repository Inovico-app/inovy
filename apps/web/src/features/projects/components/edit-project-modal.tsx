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

