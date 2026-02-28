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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSpeakerNames } from "@/features/recordings/actions/update-speaker-names";
import { useOrganizationMembers } from "@/features/tasks/hooks/use-organization-members";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EditSpeakerNameDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  speakerNumber: number;
  currentName?: string;
  currentUserId?: string | null;
  recordingId: string;
}

export function EditSpeakerNameDialog({
  isOpen,
  onOpenChange,
  speakerNumber,
  currentName,
  currentUserId,
  recordingId,
}: EditSpeakerNameDialogProps) {
  const [name, setName] = useState(currentName || "");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    currentUserId || null
  );
  const [isSaving, setIsSaving] = useState(false);
  const { members: users = [], isLoading: isLoadingUsers } =
    useOrganizationMembers();

  // Update state when props change
  useEffect(() => {
    if (isOpen) {
      setName(currentName || "");
      setSelectedUserId(currentUserId || null);
    }
  }, [isOpen, currentName, currentUserId]);

  // Auto-fill name when user is selected (only if name field is empty)
  useEffect(() => {
    if (selectedUserId && !name.trim()) {
      const selectedUser = users.find((u) => u.id === selectedUserId);
      if (selectedUser) {
        const fullName = [selectedUser.given_name, selectedUser.family_name]
          .filter(Boolean)
          .join(" ");
        if (fullName) {
          setName(fullName);
        }
      }
    }
  }, [selectedUserId, users, name]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Sprekernaam mag niet leeg zijn");
      return;
    }

    // Validate allowed characters (alphanumeric, spaces, hyphens, periods)
    const validNamePattern = /^[a-zA-Z0-9\s\-.]+$/;
    if (!validNamePattern.test(name.trim())) {
      toast.error(
        "Naam mag alleen letters, cijfers, spaties, streepjes en punten bevatten"
      );
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateSpeakerNames({
        recordingId,
        speakerNumber,
        speakerName: name.trim(),
        userId: selectedUserId || null,
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
      setSelectedUserId(currentUserId || null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Spreker naam wijzigen</DialogTitle>
          <DialogDescription>
            Wijzig de naam voor Spreker {speakerNumber + 1}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="speaker-user" className="col-span-4 sm:col-span-1">
              Gebruiker
            </Label>
            <Select
              value={selectedUserId ?? "__none__"}
              onValueChange={(value) =>
                setSelectedUserId(value === "__none__" ? null : value)
              }
              disabled={isLoadingUsers || isSaving}
            >
              <SelectTrigger
                id="speaker-user"
                className="col-span-4 sm:col-span-3"
              >
                <SelectValue placeholder="Selecteer gebruiker (optioneel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  Geen gebruiker (externe spreker)
                </SelectItem>
                {users.map((user) => {
                  const fullName = [user.given_name, user.family_name]
                    .filter(Boolean)
                    .join(" ");
                  const displayName = fullName || user.email || user.id;
                  return (
                    <SelectItem key={user.id} value={user.id}>
                      {displayName}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="speaker-name" className="col-span-4 sm:col-span-1">
              Naam
            </Label>
            <Input
              id="speaker-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                selectedUserId
                  ? "Naam wordt automatisch ingevuld"
                  : "Voer spreker naam in (bijv. externe spreker)"
              }
              className="col-span-4 sm:col-span-3"
              maxLength={50}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {name.length}/50 karakters (alleen letters, cijfers, spaties, - en
            .)
            {!selectedUserId && (
              <span className="block mt-1">
                Selecteer "Geen gebruiker" om een externe spreker toe te voegen
                met alleen een naam.
              </span>
            )}
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

