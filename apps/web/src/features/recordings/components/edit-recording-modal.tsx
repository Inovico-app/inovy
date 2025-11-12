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
import type { RecordingDto } from "../../../server/dto";
import { EditRecordingForm } from "./edit-recording-form";

interface EditRecordingModalProps {
  recording: RecordingDto;
  variant?: "default" | "outline" | "ghost";
  triggerContent?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditRecordingModal({
  recording,
  variant = "outline",
  triggerContent,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: EditRecordingModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use controlled or uncontrolled state
  const open = controlledOpen ?? internalOpen;
  const setOpen = controlledOnOpenChange ?? setInternalOpen;

  const handleSuccess = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerContent || (
          <Button variant={variant} size="sm">
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Recording</DialogTitle>
          <DialogDescription>
            Update your recording information. Changes will be reflected
            immediately.
          </DialogDescription>
        </DialogHeader>
        <EditRecordingForm
          recordingId={recording.id}
          initialData={{
            title: recording.title,
            description: recording.description,
            recordingDate: recording.recordingDate,
          }}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

