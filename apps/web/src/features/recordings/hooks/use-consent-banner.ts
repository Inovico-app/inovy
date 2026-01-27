import { useEffect, useRef, useState } from "react";

export interface Participant {
  id: string;
  email: string;
  name?: string;
}

interface UseConsentBannerProps {
  isOpen: boolean;
  onConsentGranted: (participants: Participant[]) => void;
  onConsentDenied: () => void;
  initialParticipants?: Participant[];
}

export function useConsentBanner({
  isOpen,
  onConsentGranted,
  onConsentDenied,
  initialParticipants = [],
}: UseConsentBannerProps) {
  const [hasRead, setHasRead] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>(
    initialParticipants
  );
  const [newParticipantEmail, setNewParticipantEmail] = useState("");
  const [newParticipantName, setNewParticipantName] = useState("");
  const isGrantingConsentRef = useRef(false);
  const prevIsOpenRef = useRef(isOpen);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      setHasRead(false);
      setParticipants(initialParticipants);
      setNewParticipantEmail("");
      setNewParticipantName("");
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialParticipants]);

  // Handle dialog open/close changes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Only call onConsentDenied if consent is not being granted
      if (!isGrantingConsentRef.current) {
        onConsentDenied();
      }
      // Reset the flag after handling the close
      isGrantingConsentRef.current = false;
    }
  };

  // Handle consent granted
  const handleConsentGranted = () => {
    // Set flag FIRST to prevent onConsentDenied from being called
    isGrantingConsentRef.current = true;
    // Call the parent handler - it will set isOpen to false
    onConsentGranted(participants);
  };

  // Add participant
  const handleAddParticipant = () => {
    if (!newParticipantEmail.trim()) {
      return;
    }

    const newParticipant: Participant = {
      id: crypto.randomUUID(),
      email: newParticipantEmail.trim(),
      name: newParticipantName.trim() || undefined,
    };

    setParticipants([...participants, newParticipant]);
    setNewParticipantEmail("");
    setNewParticipantName("");
  };

  // Remove participant
  const handleRemoveParticipant = (id: string) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  return {
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
  };
}
