"use client";

import { useEffect, type RefObject } from "react";
import { HOUR_HEIGHT } from "../lib/time-grid-utils";

interface UseTimeGridScrollOptions {
  containerRef: RefObject<HTMLDivElement | null>;
  hourHeight?: number;
  enabled?: boolean;
}

/**
 * Hook that auto-scrolls the time grid container to the current hour on mount.
 * Scrolls to (currentHour - 1) so the user sees context before the current time.
 */
export function useTimeGridScroll({
  containerRef,
  hourHeight = HOUR_HEIGHT,
  enabled = true,
}: UseTimeGridScrollOptions): void {
  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    const currentHour = new Date().getHours();
    const scrollTo = Math.max(0, (currentHour - 1) * hourHeight);

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      container.scrollTop = scrollTo;
    });
  }, [containerRef, hourHeight, enabled]);
}
