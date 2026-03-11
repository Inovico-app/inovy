"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ScrollShadowState {
  showLeftShadow: boolean;
  showRightShadow: boolean;
}

export function useScrollShadows<T extends HTMLElement = HTMLDivElement>() {
  const containerRef = useRef<T>(null);
  const [shadows, setShadows] = useState<ScrollShadowState>({
    showLeftShadow: false,
    showRightShadow: false,
  });

  const updateShadows = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const threshold = 2;

    setShadows({
      showLeftShadow: scrollLeft > threshold,
      showRightShadow: scrollLeft + clientWidth < scrollWidth - threshold,
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateShadows();

    el.addEventListener("scroll", updateShadows, { passive: true });
    const resizeObserver = new ResizeObserver(updateShadows);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener("scroll", updateShadows);
      resizeObserver.disconnect();
    };
  }, [updateShadows]);

  return {
    containerRef,
    ...shadows,
  };
}
