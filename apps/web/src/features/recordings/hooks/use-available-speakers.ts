import { useOrganizationUsersQuery } from "@/features/tasks/hooks/use-organization-users-query";
import { useMemo } from "react";

interface UseAvailableSpeakersProps {
  speakersDetected?: number;
  currentSpeaker: number;
  speakerNames?: Record<string, string> | null;
  speakerUserIds?: Record<string, string> | null;
}

export interface SpeakerOption {
  number: number;
  name: string;
}

export function useAvailableSpeakers({
  speakersDetected = 0,
  currentSpeaker,
  speakerNames,
  speakerUserIds,
}: UseAvailableSpeakersProps): SpeakerOption[] {
  const { data: users = [] } = useOrganizationUsersQuery();

  return useMemo(() => {
    const speakers: SpeakerOption[] = [];
    const maxSpeakers = Math.max(speakersDetected, currentSpeaker + 1);

    for (let i = 0; i < maxSpeakers; i++) {
      const speakerKey = i.toString();
      const userId = speakerUserIds?.[speakerKey];
      const customName = speakerNames?.[speakerKey];

      let displayName = `Spreker ${i + 1}`;

      if (userId) {
        const user = users.find((u) => u.id === userId);
        if (user) {
          const fullName = [user.given_name, user.family_name]
            .filter(Boolean)
            .join(" ");
          displayName = fullName || user.email || displayName;
        }
      } else if (customName) {
        displayName = customName;
      }

      speakers.push({ number: i, name: displayName });
    }

    return speakers;
  }, [speakersDetected, currentSpeaker, speakerNames, speakerUserIds, users]);
}
