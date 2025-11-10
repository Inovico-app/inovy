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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSpeakerNames } from "@/features/recordings/actions/update-speaker-names";
import { useState } from "react";
import { toast } from "sonner";

interface EditSpeakerNameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  speakerNumber: number;
  currentName?: string;
  recordingId: string;
}

export function EditSpeakerNameDialog({
  isOpen,
  onOpenChange,
  speakerNumber,
  currentName,
  recordingId,
}: EditSpeakerNameDialogProps) {
  const [name, setName] = useState(currentName || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Speaker name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateSpeakerNames({
        recordingId,
        speakerNumber,
        speakerName: name.trim(),
      });

      if (result.data?.success) {
        toast.success("Speaker name updated");
        onOpenChange(false);
        setName("");
      } else {
        toast.error(result.data?.error || "Failed to update speaker name");
      }
    } catch (error) {
      console.error("Error updating speaker name:", error);
      toast.error("Failed to update speaker name");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName(currentName || "");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Spreaker naam wijzigen</DialogTitle>
          <DialogDescription>
            Wijzig de naam voor Spreker {speakerNumber + 1}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="speaker-name" className="col-span-4 sm:col-span-1">
              Naam
            </Label>
            <Input
              id="speaker-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Voer spreaker naam in"
              className="col-span-4 sm:col-span-3"
              maxLength={50}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {name.length}/50 karakters
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Annuleren
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? "Opslaan..." : "Opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

