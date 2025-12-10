import { ONE_SECOND_MS } from "@/lib/constants/time";
import { formatDurationCompact } from "@/lib/formatters/duration-formatters";
import { useEffect, useRef, useState } from "react";

export function useRecordingDuration() {
  const [duration, setDuration] = useState(0);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    // Clear any existing interval
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }

    // Start new interval
    durationInterval.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, ONE_SECOND_MS);
  };

  const stopTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  };

  const resetTimer = () => {
    stopTimer();
    setDuration(0);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTimer();
    };
  }, []);

  return {
    duration,
    formattedDuration: formatDurationCompact(duration),
    startTimer,
    stopTimer,
    resetTimer,
  };
}

