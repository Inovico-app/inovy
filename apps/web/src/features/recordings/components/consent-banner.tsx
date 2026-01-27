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
import { AlertTriangle, CheckCircle2, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useConsentBanner, type Participant } from "../hooks/use-consent-banner";

interface ConsentBannerProps {
  isOpen: boolean;
  onConsentGranted: (participants: Participant[]) => void;
  onConsentDenied: () => void;
  participantEmails?: string[];
  initialParticipants?: Participant[];
}

export function ConsentBanner({
  isOpen,
  onConsentGranted,
  onConsentDenied,
  participantEmails = [],
  initialParticipants = [],
}: ConsentBannerProps) {
  // Use local state to ensure dialog closes immediately when consent is granted
  const [localIsOpen, setLocalIsOpen] = useState(isOpen);

  // Sync local state with prop
  useEffect(() => {
    setLocalIsOpen(isOpen);
  }, [isOpen]);

  const {
    hasRead,
    setHasRead,
    participants,
    newParticipantEmail,
    newParticipantName,
    setNewParticipantEmail,
    setNewParticipantName,
    handleOpenChange,
    handleConsentGranted,
    handleAddParticipant,
    handleRemoveParticipant,
  } = useConsentBanner({
    isOpen: localIsOpen,
    onConsentGranted,
    onConsentDenied,
    initialParticipants,
  });

  // Handle consent granted - close dialog immediately
  const handleConsentGrantedClick = () => {
    // Call the handler which sets the ref flag and notifies parent
    handleConsentGranted();
    // Close dialog immediately using local state
    setLocalIsOpen(false);
    // Also call handleOpenChange to ensure hook state is updated
    handleOpenChange(false);
  };

  // Handle dialog open/close changes
  const handleDialogOpenChange = (open: boolean) => {
    setLocalIsOpen(open);
    handleOpenChange(open);
  };

  return (
    <Dialog open={localIsOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Recording Consent Required</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            Before starting the recording, you must obtain consent from all
            participants. This is required for compliance with GDPR and HIPAA
            regulations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h4 className="font-medium mb-2">Consent Requirements:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>
                All participants must explicitly consent to being recorded
              </li>
              <li>Consent can be revoked at any time</li>
              <li>Consent status will be tracked and audited</li>
            </ul>
          </div>

          {/* Participants Section */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Participants</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddParticipant}
                disabled={!newParticipantEmail.trim()}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            {/* Add Participant Form */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="participant-email" className="text-xs">
                  Email *
                </Label>
                <Input
                  id="participant-email"
                  type="email"
                  placeholder="participant@example.com"
                  value={newParticipantEmail}
                  onChange={(e) => setNewParticipantEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newParticipantEmail.trim()) {
                      e.preventDefault();
                      handleAddParticipant();
                    }
                  }}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="participant-name" className="text-xs">
                  Name (Optional)
                </Label>
                <Input
                  id="participant-name"
                  type="text"
                  placeholder="John Doe"
                  value={newParticipantName}
                  onChange={(e) => setNewParticipantName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newParticipantEmail.trim()) {
                      e.preventDefault();
                      handleAddParticipant();
                    }
                  }}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Participants List */}
            {participants.length > 0 ? (
              <div className="space-y-2 pt-2 border-t">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between rounded-md border bg-muted/30 p-2 text-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {participant.name || participant.email}
                      </div>
                      {participant.name && (
                        <div className="text-xs text-muted-foreground truncate">
                          {participant.email}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveParticipant(participant.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : participantEmails.length > 0 ? (
              <div className="pt-2 border-t">
                <div className="text-sm text-muted-foreground">
                  <div className="font-medium mb-1">Legacy participants:</div>
                  <ul className="space-y-1 list-disc list-inside">
                    {participantEmails.map((email) => (
                      <li key={email}>{email}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="pt-2 border-t text-sm text-muted-foreground text-center py-2">
                No participants added yet
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-lg border p-3">
            <input
              type="checkbox"
              id="consent-read"
              checked={hasRead}
              onChange={(e) => setHasRead(e.target.checked)}
              className="mt-1"
            />
            <label
              htmlFor="consent-read"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              I confirm that I have obtained explicit consent from all
              participants before starting this recording.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onConsentDenied}>
            Cancel
          </Button>
          <Button
            onClick={handleConsentGrantedClick}
            disabled={!hasRead}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />I Have Consent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

