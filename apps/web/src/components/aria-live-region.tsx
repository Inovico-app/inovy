"use client";

import { useState } from "react";

interface AriaLiveRegionProps {
  level?: "polite" | "assertive" | "off";
  children?: React.ReactNode;
}

export function AriaLiveRegion({
  level = "polite",
  children,
}: AriaLiveRegionProps) {
  return (
    <div role="status" aria-live={level} aria-atomic="true" className="sr-only">
      {children}
    </div>
  );
}

// Hook to announce messages to screen readers
export function useAriaLiveAnnouncement() {
  const [announcement, setAnnouncement] = useState<string>("");
  const [level, setLevel] = useState<"polite" | "assertive">("polite");

  const announce = (
    message: string,
    priority: "polite" | "assertive" = "polite"
  ) => {
    setLevel(priority);
    setAnnouncement(message);
    // Clear announcement after it's been read
    setTimeout(() => setAnnouncement(""), 1000);
  };

  return { announcement, level, announce };
}

