"use client";

import { useTranslations } from "next-intl";

interface UploadProgressBarProps {
  progress: number;
}

export function UploadProgressBar({ progress }: UploadProgressBarProps) {
  const t = useTranslations("recordings");
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>{t("upload.uploadProgress")}</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
