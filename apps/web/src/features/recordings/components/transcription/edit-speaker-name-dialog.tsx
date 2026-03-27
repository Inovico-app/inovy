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
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("recordings");
  const tc = useTranslations("common");
  const [name, setName] = useState(currentName || "");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    currentUserId || null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const { members: users = [], isLoading: isLoadingUsers } =
    useOrganizationMembers();

  const userItems = useMemo(
    () => ({
      __none__: t("transcription.noUser"),
      ...Object.fromEntries(
        users.map((user) => {
          const fullName = [user.given_name, user.family_name]
            .filter(Boolean)
            .join(" ");
          return [user.id, fullName || user.email || user.id];
        }),
      ),
    }),
    [users, t],
  );

  // Auto-fill name when user is selected (only if name field is empty)
  const handleUserChange = (value: string) => {
    const newUserId = value === "__none__" ? null : value;
    setSelectedUserId(newUserId);

    if (newUserId && !name.trim()) {
      const selectedUser = users.find((u) => u.id === newUserId);
      if (selectedUser) {
        const fullName = [selectedUser.given_name, selectedUser.family_name]
          .filter(Boolean)
          .join(" ");
        if (fullName) {
          setName(fullName);
        }
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t("transcription.speakerNameEmpty"));
      return;
    }

    // Validate allowed characters (alphanumeric, spaces, hyphens, periods)
    const validNamePattern = /^[a-zA-Z0-9\s\-.]+$/;
    if (!validNamePattern.test(name.trim())) {
      toast.error(t("transcription.speakerNameInvalid"));
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
        toast.success(t("transcription.speakerNameUpdated"));
        onOpenChange(false);
        setName("");
      } else {
        toast.error(
          result.data?.error || t("transcription.speakerNameUpdateFailed"),
        );
      }
    } catch (error) {
      console.error("Error updating speaker name:", error);
      toast.error(t("transcription.speakerNameUpdateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setName(currentName || "");
    setSelectedUserId(currentUserId || null);
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("transcription.editSpeakerName")}</DialogTitle>
          <DialogDescription>
            {t("transcription.editSpeakerDescription", {
              number: speakerNumber + 1,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="speaker-user" className="col-span-4 sm:col-span-1">
              {t("transcription.user")}
            </Label>
            <Select
              value={selectedUserId ?? "__none__"}
              onValueChange={(value) => handleUserChange(value ?? "__none__")}
              disabled={isLoadingUsers || isSaving}
              items={userItems}
            >
              <SelectTrigger
                id="speaker-user"
                className="col-span-4 sm:col-span-3"
              >
                <SelectValue
                  placeholder={t("transcription.selectUserOptional")}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  {t("transcription.noUser")}
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
              {t("transcription.name")}
            </Label>
            <Input
              id="speaker-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                selectedUserId
                  ? t("transcription.nameAutoFilled")
                  : t("transcription.enterSpeakerName")
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
            {isSaving ? t("transcription.saving") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
