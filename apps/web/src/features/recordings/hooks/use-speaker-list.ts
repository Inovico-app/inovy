import { useOrganizationUsersQuery } from "@/features/tasks/hooks/use-organization-users-query";
import { getSpeakerInfo } from "../components/transcription/speaker-helpers";
import type { SpeakerInfo } from "../components/transcription/speaker-helpers";

interface UseSpeakerListProps {
  speakersDetected?: number;
  speakerNames?: Record<string, string> | null;
  speakerUserIds?: Record<string, string> | null;
}

export interface SpeakerListItem {
  number: number;
  info: SpeakerInfo;
}

/**
 * Hook that generates a list of all detected speakers with their display information.
 * Uses centralized speaker info logic to ensure consistency.
 *
 * @param props - Speaker detection and naming data
 * @returns Array of speaker list items with number and info
 */
export function useSpeakerList({
  speakersDetected = 0,
  speakerNames,
  speakerUserIds,
}: UseSpeakerListProps): SpeakerListItem[] {
  const { data: users = [] } = useOrganizationUsersQuery();

  if (speakersDetected <= 0) {
    return [];
  }

  const speakers: SpeakerListItem[] = [];

  for (let i = 0; i < speakersDetected; i++) {
    const speakerInfo = getSpeakerInfo(i, speakerNames, speakerUserIds, users);
    speakers.push({
      number: i,
      info: speakerInfo,
    });
  }

  return speakers;
}
