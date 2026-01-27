import type { GroupedUtterance } from "./types";

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Formats timestamp range for display.
 * Returns single timestamp if only one utterance, otherwise returns range.
 */
export function formatTimestampRange(grouped: GroupedUtterance): string {
  if (grouped.utterances.length === 1) {
    return formatTime(grouped.start);
  }
  return `${formatTime(grouped.start)} → ${formatTime(grouped.end)}`;
}

/**
 * Formats text for copying to clipboard.
 * Includes speaker name and timestamp(s) with utterance text.
 */
export function formatCopyText(
  grouped: GroupedUtterance,
  speakerName: string
): string {
  if (grouped.utterances.length === 1) {
    return `${speakerName} [${formatTime(grouped.start)}]: ${grouped.text}`;
  }
  return `${speakerName} [${formatTime(grouped.start)} - ${formatTime(
    grouped.end
  )}]: ${grouped.text}`;
}

/**
 * Returns label for utterance count when multiple utterances are grouped.
 * Returns empty string if only one utterance.
 */
export function getUtteranceCountLabel(count: number): string {
  return count > 1 ? `${count} zinnen` : "";
}
