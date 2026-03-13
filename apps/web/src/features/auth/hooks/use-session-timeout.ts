"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARNING_THRESHOLD_MS = 25 * 60 * 1000; // 25 minutes (show warning at 5 min before timeout)
const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;
const THROTTLE_MS = 30_000; // Throttle activity detection to every 30 seconds

interface UseSessionTimeoutOptions {
  onTimeout: () => void;
  onWarning: () => void;
  onExtend: () => void;
}

interface UseSessionTimeoutReturn {
  isWarningVisible: boolean;
  remainingSeconds: number;
  extendSession: () => void;
}

export function useSessionTimeout({
  onTimeout,
  onWarning,
  onExtend,
}: UseSessionTimeoutOptions): UseSessionTimeoutReturn {
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastThrottleRef = useRef(0);
  const isWarningVisibleRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    const timeLeft = Math.ceil(
      (IDLE_TIMEOUT_MS - (Date.now() - lastActivityRef.current)) / 1000,
    );
    setRemainingSeconds(Math.max(0, timeLeft));

    countdownRef.current = setInterval(() => {
      const remaining = Math.ceil(
        (IDLE_TIMEOUT_MS - (Date.now() - lastActivityRef.current)) / 1000,
      );
      setRemainingSeconds(Math.max(0, remaining));

      if (remaining <= 0) {
        if (countdownRef.current) {
          clearInterval(countdownRef.current);
          countdownRef.current = null;
        }
      }
    }, 1000);
  }, []);

  const resetTimers = useCallback(() => {
    clearTimers();
    setIsWarningVisible(false);
    lastActivityRef.current = Date.now();

    warningRef.current = setTimeout(() => {
      setIsWarningVisible(true);
      isWarningVisibleRef.current = true;
      onWarning();
      startCountdown();
    }, WARNING_THRESHOLD_MS);

    timeoutRef.current = setTimeout(() => {
      setIsWarningVisible(false);
      isWarningVisibleRef.current = false;
      onTimeout();
    }, IDLE_TIMEOUT_MS);
  }, [clearTimers, onTimeout, onWarning, startCountdown]);

  const extendSession = useCallback(() => {
    setIsWarningVisible(false);
    isWarningVisibleRef.current = false;
    resetTimers();
    onExtend();
  }, [resetTimers, onExtend]);

  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Throttle activity events to avoid excessive timer resets
    if (now - lastThrottleRef.current < THROTTLE_MS) {
      return;
    }
    lastThrottleRef.current = now;

    // Only reset timers if the warning is not visible
    // (user must explicitly click extend when warning is shown)
    // Use ref to avoid stale closure issues with event listeners
    if (!isWarningVisibleRef.current) {
      resetTimers();
    }
  }, [resetTimers]);

  useEffect(() => {
    // Start initial timers
    resetTimers();

    // Add activity event listeners
    for (const event of ACTIVITY_EVENTS) {
      document.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      clearTimers();
      for (const event of ACTIVITY_EVENTS) {
        document.removeEventListener(event, handleActivity);
      }
    };
  }, [handleActivity, resetTimers, clearTimers]);

  return {
    isWarningVisible,
    remainingSeconds,
    extendSession,
  };
}
