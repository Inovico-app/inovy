"use client";

import { EditIcon } from "lucide-react";
import { useState } from "react";
import type { RecordingDto } from "@/server/dto";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { EditRecordingForm } from "./edit-recording-form";

interface EditRecordingModalProps {
  recording: RecordingDto;
  trigger?: React.ReactNode;
}

export function EditRecordingModal({
  recording,
  trigger,
}: EditRecordingModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSuccess = () => {
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <EditIcon className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Recording</DialogTitle>
          <DialogDescription>
            Update the recording title, description, or date
          </DialogDescription>
        </DialogHeader>
        <EditRecordingForm
          recording={recording}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}

