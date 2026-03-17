"use client";

import { PlusIcon } from "lucide-react";
import React, { useState } from "react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import { UploadRecordingForm } from "./upload-recording-form";

interface UploadRecordingModalProps {
  projectId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Renders a modal dialog that lets the user upload an audio or video recording for a project.
 *
 * @param projectId - The project identifier to associate the uploaded recording with.
 * @param trigger - Optional custom trigger element to open the modal. If omitted, a default outlined "New Recording" button with a plus icon is used.
 * @param open - Optional controlled open state; when provided, the modal's visibility is driven by this value.
 * @param onOpenChange - Optional controlled state updater called with the new open state when the modal requests to open or close.
 * @returns The modal element containing the upload form and its trigger.
 */
export function UploadRecordingModal({
  projectId,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: UploadRecordingModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setFormKey((k) => k + 1);
    }
    if (controlledOnOpenChange) {
      controlledOnOpenChange(open);
    } else {
      setInternalOpen(open);
    }
  };

  const handleSuccess = () => {
    handleOpenChange(false);
    // The form will handle navigation/refresh
  };

  const handleCancel = () => {
    handleOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger render={React.isValidElement(trigger) ? trigger : <Button variant="outline" />}>
        {React.isValidElement(trigger) ? null : (
          <>
            <PlusIcon className="size-4 mr-2" />
            New Recording
          </>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden min-w-0">
        <DialogHeader>
          <DialogTitle>Upload Recording</DialogTitle>
          <DialogDescription>
            Upload an audio or video recording to process with AI
          </DialogDescription>
        </DialogHeader>
        <UploadRecordingForm
          key={formKey}
          projectId={projectId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
