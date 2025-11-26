import { logger } from "@/lib";
import { useEffect, useEffectEvent, useRef, useState } from "react";

interface UseWakeLockReturn {
  isSupported: boolean;
  isActive: boolean;
  request: () => Promise<void>;
  release: () => Promise<void>;
}

/**
 * Hook to manage Screen Wake Lock API
 * Prevents screen from locking during recording on mobile devices
 */
export function useWakeLock(): UseWakeLockReturn {
  const [isSupported] = useState(() => "wakeLock" in navigator);
  const [isActive, setIsActive] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Request wake lock
  const request = useEffectEvent(async () => {
    if (!isSupported) {
      logger.warn("Wake Lock API is not supported in this browser");
      return;
    }

    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setIsActive(true);

      logger.info("Wake Lock acquired - screen will stay active");

      // Listen for wake lock release
      wakeLockRef.current.addEventListener("release", () => {
        logger.info("Wake Lock released");
        setIsActive(false);
      });
    } catch (error) {
      logger.error("Failed to acquire Wake Lock:", { error });
      setIsActive(false);
    }
  });

  // Release wake lock
  const release = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        setIsActive(false);
        logger.info("Wake Lock released manually");
      } catch (error) {
        logger.error("Failed to release Wake Lock:", { error });
      }
    }
  };

  // Re-acquire wake lock when page becomes visible
  useEffect(() => {
    if (!isSupported) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && isActive) {
        // Reacquire wake lock when returning to the page
        logger.info("Page visible - reacquiring Wake Lock");
        void request();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported, isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      void release();
    };
  }, []);

  return {
    isSupported,
    isActive,
    request,
    release,
  };
}

