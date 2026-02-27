"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GroupedUtterance } from "../components/transcription/types";
import { useAudioPlaybackContext } from "../context/audio-playback-context";

/**
 * Binary-searches sorted grouped utterances to find which group
 * contains the given playback time (seconds).
 */
function findActiveGroupIndex(
  groups: GroupedUtterance[],
  time: number
): number | null {
  if (groups.length === 0) return null;

  let low = 0;
  let high = groups.length - 1;
  let result: number | null = null;

  while (low <= high) {
    const mid = (low + high) >>> 1;
    const group = groups[mid];

    if (time >= group.start && time <= group.end) {
      return mid;
    }

    if (time < group.start) {
      high = mid - 1;
    } else {
      result = mid;
      low = mid + 1;
    }
  }

  // If no exact range match, return the last group whose start <= time
  // (handles gaps between utterances)
  if (result !== null && time >= groups[result].start) {
    return result;
  }

  return null;
}

interface AudioTranscriptSyncResult {
  activeGroupIndex: number | null;
}

export function useAudioTranscriptSync(
  groupedUtterances: GroupedUtterance[]
): AudioTranscriptSyncResult {
  const { subscribe, isPlaying, currentTimeRef } = useAudioPlaybackContext();
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const lastIndexRef = useRef<number | null>(null);
  const groupsRef = useRef(groupedUtterances);
  groupsRef.current = groupedUtterances;

  const updateActiveIndex = useCallback((time: number) => {
    const idx = findActiveGroupIndex(groupsRef.current, time);
    if (idx !== lastIndexRef.current) {
      lastIndexRef.current = idx;
      setActiveGroupIndex(idx);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribe(updateActiveIndex);
    return unsubscribe;
  }, [subscribe, updateActiveIndex]);

  // When playback stops, do one final sync
  useEffect(() => {
    if (!isPlaying) {
      updateActiveIndex(currentTimeRef.current);
    }
  }, [isPlaying, updateActiveIndex, currentTimeRef]);

  return { activeGroupIndex };
}

