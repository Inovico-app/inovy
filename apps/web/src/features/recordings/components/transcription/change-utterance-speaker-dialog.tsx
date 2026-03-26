"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAvailableSpeakers } from "@/features/recordings/hooks/use-available-speakers";
import { useUpdateUtteranceSpeaker } from "@/features/recordings/hooks/use-update-utterance-speaker";
import { useState } from "react";
import { useTranslations } from "next-intl";

interface ChangeUtteranceSpeakerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recordingId: string;
  utteranceIndex: number;
  currentSpeaker: number;
  speakersDetected?: number;
  speakerNames?: Record<string, string> | null;
  speakerUserIds?: Record<string, string> | null;
  onSuccess?: () => void;
}

export function ChangeUtteranceSpeakerDialog({
  isOpen,
  onOpenChange,
  recordingId,
  utteranceIndex,
  currentSpeaker,
  speakersDetected,
  speakerNames,
  speakerUserIds,
  onSuccess,
}: ChangeUtteranceSpeakerDialogProps) {
  const t = useTranslations("recordings");
  const tc = useTranslations("common");
  const [selectedSpeaker, setSelectedSpeaker] = useState<number>(
    () => currentSpeaker,
  );

  const availableSpeakers = useAvailableSpeakers({
    speakersDetected,
    currentSpeaker,
    speakerNames,
    speakerUserIds,
  });

  const { updateUtteranceSpeaker, isUpdating } = useUpdateUtteranceSpeaker({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleSave = () => {
    if (selectedSpeaker === currentSpeaker) {
      onOpenChange(false);
      return;
    }

    updateUtteranceSpeaker({
      recordingId,
      utteranceIndex,
      newSpeaker: selectedSpeaker,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setSelectedSpeaker(currentSpeaker);
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("transcription.changeSpeaker")}</DialogTitle>
          <DialogDescription>
            {t("transcription.changeSpeakerDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="speaker-select"
              className="col-span-4 sm:col-span-1"
            >
              {t("transcription.speakerLabel")}
            </label>
            <Select
              value={selectedSpeaker.toString()}
              onValueChange={(value) =>
                value && setSelectedSpeaker(parseInt(value, 10))
              }
              disabled={isUpdating}
            >
              <SelectTrigger
                id="speaker-select"
                className="col-span-4 sm:col-span-3"
              >
                <SelectValue placeholder={t("transcription.selectSpeaker")} />
              </SelectTrigger>
              <SelectContent>
                {availableSpeakers.map((speaker) => (
                  <SelectItem
                    key={speaker.number}
                    value={speaker.number.toString()}
                  >
                    {speaker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isUpdating}
          >
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={isUpdating}>
            {isUpdating ? t("transcription.saving") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
