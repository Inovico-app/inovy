"use client";

import { Button } from "@/components/ui/button";
import { formatFileSizePrecise } from "@/lib/formatters/file-size-formatters";
import { MAX_FILE_SIZE } from "@/server/validation/recordings/upload-recording";
import { UploadIcon, XIcon } from "lucide-react";
import type { ChangeEvent, DragEvent } from "react";
import { useTranslations } from "next-intl";

interface FileDropZoneProps {
  file: File | null;
  isDragging: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onDragEnter: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onFileInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
}

export function FileDropZone({
  file,
  isDragging,
  isUploading,
  fileInputRef,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInputChange,
  onRemoveFile,
}: FileDropZoneProps) {
  const t = useTranslations("recordings");
  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors min-w-0
        ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        }
        ${file ? "bg-muted/50" : "bg-background"}
        ${isUploading ? "pointer-events-none opacity-50" : "cursor-pointer"}
      `}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      role="button"
      tabIndex={0}
      onClick={() => !file && !isUploading && fileInputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!file && !isUploading) fileInputRef.current?.click();
        }
      }}
      aria-label={t("upload.uploadAriaLabel")}
    >
      <input
        ref={fileInputRef}
        type="file"
        id="file"
        className="hidden"
        accept=".mp3,.mp4,.wav,.m4a,.webm,audio/mpeg,audio/mp4,audio/wav,audio/webm,video/mp4,video/webm"
        onChange={onFileInputChange}
        disabled={isUploading}
      />

      {!file ? (
        <div className="space-y-2">
          <UploadIcon className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">{t("upload.dropOrBrowse")}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("upload.supportedFormats", {
                size: MAX_FILE_SIZE / 1024 / 1024,
              })}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 min-w-0">
          <div className="flex-1 min-w-0 text-left overflow-hidden">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSizePrecise(file.size)}
            </p>
          </div>
          {!isUploading && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveFile();
              }}
            >
              <XIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
