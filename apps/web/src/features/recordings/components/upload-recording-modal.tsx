"use client";

import { UploadIcon } from "lucide-react";
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
import { UploadRecordingForm } from "./upload-recording-form";

interface UploadRecordingModalProps {
  projectId: string;
  trigger?: React.ReactNode;
}

export function UploadRecordingModal({
  projectId,
  trigger,
}: UploadRecordingModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    setIsOpen(false);
    // The form will handle navigation/refresh
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <UploadIcon className="h-4 w-4 mr-2" />
            Upload Recording
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Recording</DialogTitle>
          <DialogDescription>
            Upload an audio or video recording to process with AI
          </DialogDescription>
        </DialogHeader>
        <UploadRecordingForm
          projectId={projectId}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}

