"use client";

import { useEffect, useState } from "react";
import { isToday } from "date-fns";
import { getMinutesSinceMidnight, HOUR_HEIGHT } from "../lib/time-grid-utils";

interface UseCurrentTimeIndicatorReturn {
  minutesSinceMidnight: number;
  topOffset: number;
  isTodayDate: (date: Date) => boolean;
}

/**
 * Hook that tracks the current time and returns positioning data
 * for the "current time" red line indicator in the time grid.
 * Updates every 60 seconds.
 */
export function useCurrentTimeIndicator(
  hourHeight: number = HOUR_HEIGHT,
): UseCurrentTimeIndicatorReturn {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  const minutesSinceMidnight = getMinutesSinceMidnight(now);
  const topOffset = (minutesSinceMidnight / 60) * hourHeight;

  return {
    minutesSinceMidnight,
    topOffset,
    isTodayDate: isToday,
  };
}
