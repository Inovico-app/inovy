import type { Utterance } from "../components/transcription/types";

export interface GroupedUtterance {
  speaker: number;
  utterances: Utterance[]; // Original utterance objects
  text: string; // Concatenated text
  start: number; // Earliest start time
  end: number; // Latest end time
  confidence: number; // Average confidence
  startIndices: number[]; // Original indices for speaker editing
}

/**
 * Groups consecutive utterances from the same speaker into a single grouped utterance.
 * This is a pure function that performs a single-pass algorithm to group utterances.
 *
 * @param utterances - Array of utterances to group
 * @returns Array of grouped utterances
 */
export function groupConsecutiveUtterances(
  utterances: Utterance[]
): GroupedUtterance[] {
  if (!utterances || utterances.length === 0) {
    return [];
  }

  const grouped: GroupedUtterance[] = [];
  let currentGroup: Utterance[] = [];
  let currentSpeaker: number | null = null;
  let startIndex = 0;

  for (let i = 0; i < utterances.length; i++) {
    const utterance = utterances[i];
    const speaker = utterance.speaker ?? 0; // Default to speaker 0 if undefined

    // If speaker changes or this is the first utterance, start a new group
    if (currentSpeaker === null || speaker !== currentSpeaker) {
      // Save previous group if it exists
      if (currentGroup.length > 0 && currentSpeaker !== null) {
        grouped.push(createGroupedUtterance(currentGroup, startIndex));
      }

      // Start new group
      currentGroup = [utterance];
      currentSpeaker = speaker;
      startIndex = i;
    } else {
      // Add to current group
      currentGroup.push(utterance);
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0 && currentSpeaker !== null) {
    grouped.push(createGroupedUtterance(currentGroup, startIndex));
  }

  return grouped;
}

/**
 * Creates a GroupedUtterance from an array of consecutive utterances.
 * @param utterances - Non-empty array of utterances (caller must ensure this)
 * @param startIndex - Starting index of the first utterance in the original array
 */
function createGroupedUtterance(
  utterances: Utterance[],
  startIndex: number
): GroupedUtterance {
  // Note: This function assumes utterances.length > 0
  // The caller (groupConsecutiveUtterances) ensures this condition
  const speaker = utterances[0].speaker ?? 0;
  const texts = utterances.map((u) => u.text.trim());
  const concatenatedText = texts.join(" ");

  let minStart = utterances[0].start;
  let maxEnd = utterances[0].end;
  let totalConfidence = 0;

  for (const utterance of utterances) {
    if (utterance.start < minStart) {
      minStart = utterance.start;
    }
    if (utterance.end > maxEnd) {
      maxEnd = utterance.end;
    }
    totalConfidence += utterance.confidence;
  }

  const averageConfidence = totalConfidence / utterances.length;
  const startIndices = utterances.map((_, index) => startIndex + index);

  return {
    speaker,
    utterances,
    text: concatenatedText,
    start: minStart,
    end: maxEnd,
    confidence: averageConfidence,
    startIndices,
  };
}
