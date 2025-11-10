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
    }, 1000);
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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return {
    duration,
    formattedDuration: formatDuration(duration),
    startTimer,
    stopTimer,
    resetTimer,
  };
}

