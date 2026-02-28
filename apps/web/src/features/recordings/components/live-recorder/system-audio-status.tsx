"use client";

import { Badge } from "@/components/ui/badge";
import { Speaker, XCircle } from "lucide-react";

interface SystemAudioStatusProps {
  isActive: boolean;
  hasError?: boolean;
}

export function SystemAudioStatus({
  isActive,
  hasError = false,
}: SystemAudioStatusProps) {
  if (!isActive && !hasError) {
    return null;
  }

  if (hasError) {
    return (
      <Badge variant="destructive" className="flex items-center gap-1.5">
        <XCircle className="w-3 h-3" />
        <span>System Audio Error</span>
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="flex items-center gap-1.5">
      <Speaker className="w-3 h-3" />
      <span>System Audio Active</span>
    </Badge>
  );
}
