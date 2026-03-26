"use client";

import type { ChunkManifest } from "@/features/recordings/core/recording-session.types";
import { CloudUpload } from "lucide-react";
import { useTranslations } from "next-intl";

interface ChunkUploadStatusProps {
  manifest: ChunkManifest;
  className?: string;
}

export function ChunkUploadStatus({
  manifest,
  className,
}: ChunkUploadStatusProps) {
  const t = useTranslations("recordings");
  if (manifest.totalChunks === 0) return null;

  const allUploaded = manifest.uploadedChunks === manifest.totalChunks;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className ?? ""}`}
      aria-label={t("chunks.chunksUploaded", {
        uploaded: manifest.uploadedChunks,
        total: manifest.totalChunks,
      })}
    >
      <CloudUpload
        className={`w-3.5 h-3.5 ${allUploaded ? "text-green-600 dark:text-green-400" : "animate-pulse"}`}
      />
      <span className="font-mono tabular-nums">
        {manifest.uploadedChunks} / {manifest.totalChunks}
      </span>
      <span>{t("chunks.chunksLabel")}</span>
    </div>
  );
}
