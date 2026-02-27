"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_RESUME_DELAY_MS = 5_000;

interface AutoScrollPauseOptions {
  scrollContainerRef: React.RefObject<HTMLElement | null>;
}

interface AutoScrollPauseResult {
  isAutoScrollPaused: boolean;
  resumeAutoScroll: () => void;
  markProgrammaticScroll: () => void;
}

/**
 * Detects manual user scrolling and pauses auto-scroll.
 * Resumes automatically after a timeout or when explicitly called.
 */
export function useAutoScrollPause({
  scrollContainerRef,
}: AutoScrollPauseOptions): AutoScrollPauseResult {
  const [isAutoScrollPaused, setIsAutoScrollPaused] = useState(false);
  const isProgrammaticScrollRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const resumeAutoScroll = useCallback(() => {
    clearResumeTimer();
    setIsAutoScrollPaused(false);
  }, [clearResumeTimer]);

  const scheduleResume = useCallback(() => {
    clearResumeTimer();
    resumeTimerRef.current = setTimeout(() => {
      setIsAutoScrollPaused(false);
    }, AUTO_RESUME_DELAY_MS);
  }, [clearResumeTimer]);

  /**
   * Call this before triggering a programmatic scrollIntoView
   * so the scroll listener ignores the resulting scroll events.
   */
  const markProgrammaticScroll = useCallback(() => {
    isProgrammaticScrollRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isProgrammaticScrollRef.current = false;
      });
    });
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let lastScrollTop = container.scrollTop;
    let wheelDetected = false;
    let touchDetected = false;

    const handleWheel = () => {
      wheelDetected = true;
    };

    const handleTouchStart = () => {
      touchDetected = true;
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        touchDetected = false;
      }, 100);
    };

    const handleScroll = () => {
      if (isProgrammaticScrollRef.current) return;

      const isManual = wheelDetected || touchDetected;
      wheelDetected = false;

      if (isManual) {
        const scrollDelta = Math.abs(container.scrollTop - lastScrollTop);
        if (scrollDelta > 2) {
          setIsAutoScrollPaused(true);
          scheduleResume();
        }
      }

      lastScrollTop = container.scrollTop;
    };

    container.addEventListener("wheel", handleWheel, { passive: true });
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("scroll", handleScroll);
      clearResumeTimer();
    };
  }, [scrollContainerRef, scheduleResume, clearResumeTimer]);

  return {
    isAutoScrollPaused,
    resumeAutoScroll,
    markProgrammaticScroll,
  };
}

