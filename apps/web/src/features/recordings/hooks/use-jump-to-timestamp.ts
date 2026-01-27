"use client";

import { parseAsString, useQueryState } from "nuqs";

/**
 * Hook for navigating to a specific timestamp in a recording.
 * Updates the URL query parameter to trigger the player to seek.
 *
 * @returns A function that accepts a timestamp (in seconds) and updates the URL
 */
export function useJumpToTimestamp() {
  const [, setTimestamp] = useQueryState("t", parseAsString);

  const jumpToTimestamp = (timestamp: number) => {
    void setTimestamp(Math.floor(timestamp).toString());
  };

  return jumpToTimestamp;
}
