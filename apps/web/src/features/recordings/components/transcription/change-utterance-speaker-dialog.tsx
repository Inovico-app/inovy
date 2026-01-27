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
import { useEffect, useState } from "react";

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
  const [selectedSpeaker, setSelectedSpeaker] =
    useState<number>(currentSpeaker);

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

  // Reset selected speaker when dialog opens or currentSpeaker changes
  useEffect(() => {
    if (isOpen) {
      setSelectedSpeaker(currentSpeaker);
    }
  }, [isOpen, currentSpeaker]);

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
    if (!open) {
      setSelectedSpeaker(currentSpeaker);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Spreker wijzigen</DialogTitle>
          <DialogDescription>
            Selecteer een andere spreker voor deze zin
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label
              htmlFor="speaker-select"
              className="col-span-4 sm:col-span-1"
            >
              Spreker
            </label>
            <Select
              value={selectedSpeaker.toString()}
              onValueChange={(value) => setSelectedSpeaker(parseInt(value, 10))}
              disabled={isUpdating}
            >
              <SelectTrigger
                id="speaker-select"
                className="col-span-4 sm:col-span-3"
              >
                <SelectValue placeholder="Selecteer spreker" />
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
            {isUpdating ? "Opslaan..." : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
