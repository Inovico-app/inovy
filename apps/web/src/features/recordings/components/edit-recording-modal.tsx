"use client";

import { isValidElement } from "react";
import { PencilIcon } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/ui/dialog";
import type { RecordingDto } from "../../../server/dto/recording.dto";
import { EditRecordingForm } from "./edit-recording-form";
import { useTranslations } from "next-intl";

interface EditRecordingModalProps {
  recording: RecordingDto;
  variant?: "default" | "outline" | "ghost";
  triggerContent?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function EditRecordingModal({
  recording,
  variant = "outline",
  triggerContent,
  onOpenChange,
}: EditRecordingModalProps) {
  const t = useTranslations("recordings");
  const triggerElement = isValidElement(triggerContent)
    ? triggerContent
    : undefined;
  return (
    <Dialog open>
      <DialogTrigger
        render={triggerElement ?? <Button variant={variant} size="sm" />}
      >
        {!triggerElement && (
          <>
            <PencilIcon className="h-4 w-4 mr-2" />
            {t("actions.edit")}
          </>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("actions.editRecording")}</DialogTitle>
          <DialogDescription>{t("actions.editDescription")}</DialogDescription>
        </DialogHeader>
        <EditRecordingForm
          recordingId={recording.id}
          initialData={{
            title: recording.title,
            description: recording.description,
            recordingDate: recording.recordingDate,
          }}
          onSuccess={() => onOpenChange?.(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
