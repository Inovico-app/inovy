"use client";

import type { ChunkManifest } from "@/features/recordings/core/recording-session.types";
import { CloudUpload } from "lucide-react";

interface ChunkUploadStatusProps {
  manifest: ChunkManifest;
  className?: string;
}

export function ChunkUploadStatus({
  manifest,
  className,
}: ChunkUploadStatusProps) {
  if (manifest.totalChunks === 0) return null;

  const allUploaded = manifest.uploadedChunks === manifest.totalChunks;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className ?? ""}`}
      aria-label={`${manifest.uploadedChunks} van ${manifest.totalChunks} fragmenten geupload`}
    >
      <CloudUpload
        className={`w-3.5 h-3.5 ${allUploaded ? "text-green-600 dark:text-green-400" : "animate-pulse"}`}
      />
      <span className="font-mono tabular-nums">
        {manifest.uploadedChunks} / {manifest.totalChunks}
      </span>
      <span>chunks</span>
    </div>
  );
}
