"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

export function useFocusManagement() {
  const pathname = usePathname();
  const mainContentRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Find main content element
    mainContentRef.current = document.getElementById("main-content");

    // Focus main content on route change
    if (mainContentRef.current) {
      mainContentRef.current.focus();
    }
  }, [pathname]);

  return mainContentRef;
}

