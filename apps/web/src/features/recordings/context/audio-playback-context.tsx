"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Listener = (time: number) => void;

interface AudioPlaybackContextValue {
  registerMediaElement: (el: HTMLMediaElement | null) => void;
  currentTimeRef: React.RefObject<number>;
  isPlaying: boolean;
  subscribe: (listener: Listener) => () => void;
}

const AudioPlaybackContext = createContext<AudioPlaybackContextValue | null>(
  null
);

export function AudioPlaybackProvider({ children }: { children: ReactNode }) {
  const currentTimeRef = useRef(0);
  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const listenersRef = useRef<Set<Listener>>(new Set());
  const rafIdRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const notify = useCallback(() => {
    const time = currentTimeRef.current;
    for (const listener of listenersRef.current) {
      listener(time);
    }
  }, []);

  const startLoop = useCallback(() => {
    if (rafIdRef.current !== null) return;

    let lastNotified = 0;
    const tick = () => {
      const el = mediaRef.current;
      if (el) {
        currentTimeRef.current = el.currentTime;
        const now = performance.now();
        if (now - lastNotified >= 250) {
          lastNotified = now;
          notify();
        }
      }
      rafIdRef.current = requestAnimationFrame(tick);
    };
    rafIdRef.current = requestAnimationFrame(tick);
  }, [notify]);

  const stopLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const cleanupRef = useRef<(() => void) | null>(null);

  const registerMediaElement = useCallback(
    (el: HTMLMediaElement | null) => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      stopLoop();
      mediaRef.current = el;

      if (!el) {
        setIsPlaying(false);
        return;
      }

      const handlePlay = () => {
        setIsPlaying(true);
        startLoop();
      };
      const handlePause = () => {
        setIsPlaying(false);
        stopLoop();
        currentTimeRef.current = el.currentTime;
        notify();
      };
      const handleEnded = () => {
        currentTimeRef.current = el.currentTime;
        notify();
        setIsPlaying(false);
        stopLoop();
      };

      el.addEventListener("play", handlePlay);
      el.addEventListener("pause", handlePause);
      el.addEventListener("ended", handleEnded);

      cleanupRef.current = () => {
        el.removeEventListener("play", handlePlay);
        el.removeEventListener("pause", handlePause);
        el.removeEventListener("ended", handleEnded);
      };

      if (!el.paused) {
        setIsPlaying(true);
        startLoop();
      }
    },
    [startLoop, stopLoop, notify]
  );

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  useEffect(() => {
    return () => {
      stopLoop();
      cleanupRef.current?.();
    };
  }, [stopLoop]);

  return (
    <AudioPlaybackContext.Provider
      value={{ registerMediaElement, currentTimeRef, isPlaying, subscribe }}
    >
      {children}
    </AudioPlaybackContext.Provider>
  );
}

export function useAudioPlaybackContext() {
  const ctx = useContext(AudioPlaybackContext);
  if (!ctx) {
    throw new Error(
      "useAudioPlaybackContext must be used within an AudioPlaybackProvider"
    );
  }
  return ctx;
}

