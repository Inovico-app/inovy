import { useOrganizationMembers } from "@/features/tasks/hooks/use-organization-members";
import { getSpeakerInfo } from "../components/transcription/speaker-helpers";
import type { SpeakerInfo } from "../components/transcription/speaker-helpers";

interface UseSpeakerListProps {
  speakersDetected?: number;
  utterances?: Array<{ speaker?: number }>;
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
 * Calculates the actual number of speakers from utterances if available,
 * otherwise falls back to speakersDetected.
 * Always returns at least one speaker (speaker 0) to allow manual assignment.
 *
 * @param props - Speaker detection and naming data
 * @returns Array of speaker list items with number and info
 */
export function useSpeakerList({
  speakersDetected = 0,
  utterances,
  speakerNames,
  speakerUserIds,
}: UseSpeakerListProps): SpeakerListItem[] {
  const { members: users = [] } = useOrganizationMembers();

  // Calculate actual number of speakers from utterances if available
  let actualSpeakerCount = speakersDetected;
  
  if (utterances && utterances.length > 0) {
    // Find the maximum speaker number in utterances
    const maxSpeakerInUtterances = utterances.reduce((max, utterance) => {
      const speaker = utterance.speaker ?? 0;
      return Math.max(max, speaker);
    }, -1);
    
    // If we found speakers in utterances, use that + 1 (since speakers are 0-indexed)
    // Otherwise fall back to speakersDetected
    if (maxSpeakerInUtterances >= 0) {
      actualSpeakerCount = Math.max(actualSpeakerCount, maxSpeakerInUtterances + 1);
    }
  }

  const speakers: SpeakerListItem[] = [];
  
  // Always show at least one speaker (speaker 0) for manual assignment
  // Show all detected speakers up to the maximum found
  const maxSpeakers = Math.max(actualSpeakerCount, 1);

  for (let i = 0; i < maxSpeakers; i++) {
    const speakerInfo = getSpeakerInfo(i, speakerNames, speakerUserIds, users);
    speakers.push({
      number: i,
      info: speakerInfo,
    });
  }

  return speakers;
}
