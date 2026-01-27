import { groupConsecutiveUtterances } from "../lib/group-utterances";
import type {
  GroupedUtterance,
  Utterance,
} from "../components/transcription/types";

/**
 * Hook that groups consecutive utterances from the same speaker.
 * Separates data transformation logic from presentation components.
 */
export function useGroupedUtterances(
  utterances: Utterance[] | undefined
): GroupedUtterance[] {
  if (!utterances || utterances.length === 0) {
    return [];
  }

  return groupConsecutiveUtterances(utterances);
}
