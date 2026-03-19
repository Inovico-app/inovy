import type { TranscriptSegment } from "../../recording-session.types";

/**
 * Raw Deepgram transcript event shape (subset of LiveTranscriptionEvent).
 * Using a structural type instead of importing SDK types keeps this module
 * free of heavy dependencies and easily testable.
 */
export interface DeepgramTranscriptEvent {
  is_final: boolean;
  channel: {
    alternatives: Array<{
      transcript: string;
      confidence: number;
      words?: Array<{
        word: string;
        start: number;
        end: number;
        confidence: number;
        speaker?: number;
      }>;
    }>;
  };
}

/**
 * Converts a Deepgram live-transcription event into a `TranscriptSegment`.
 *
 * Returns `null` when the event represents silence (empty transcript)
 * or when no alternatives are present.
 */
export function processDeepgramTranscript(
  event: DeepgramTranscriptEvent,
): TranscriptSegment | null {
  const alternative = event.channel?.alternatives?.[0];
  if (!alternative) return null;

  const text = alternative.transcript.trim();
  if (text === "") return null;

  const words = alternative.words ?? [];

  // Extract speaker from the first word's diarization data
  const speaker =
    words.length > 0 && words[0]!.speaker !== undefined
      ? words[0]!.speaker
      : undefined;

  // Derive start/end times from the words array, falling back to 0
  const startTime = words.length > 0 ? words[0]!.start : 0;
  const endTime = words.length > 0 ? words[words.length - 1]!.end : 0;

  return {
    text,
    speaker,
    isFinal: event.is_final,
    confidence: alternative.confidence,
    startTime,
    endTime,
  };
}
