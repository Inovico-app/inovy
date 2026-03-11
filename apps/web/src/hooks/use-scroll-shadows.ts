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

    const showLeftShadow = scrollLeft > threshold;
    const showRightShadow = scrollLeft + clientWidth < scrollWidth - threshold;

    setShadows((prev) => {
      if (
        prev.showLeftShadow === showLeftShadow &&
        prev.showRightShadow === showRightShadow
      ) {
        return prev;
      }
      return { showLeftShadow, showRightShadow };
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    updateShadows();

    el.addEventListener("scroll", updateShadows, { passive: true });

    const resizeObserver = new ResizeObserver(updateShadows);
    resizeObserver.observe(el);

    const mutationObserver = new MutationObserver(updateShadows);
    mutationObserver.observe(el, { childList: true, subtree: true });

    return () => {
      el.removeEventListener("scroll", updateShadows);
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [updateShadows]);

  return {
    containerRef,
    ...shadows,
  };
}
