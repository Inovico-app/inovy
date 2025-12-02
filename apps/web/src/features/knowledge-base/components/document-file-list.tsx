"use client";

import { X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface FileWithMetadata {
  file: File;
  title: string;
  description?: string;
  id: string;
}

export type FileUploadStatus = "pending" | "uploading" | "success" | "error";

export interface FileUploadState {
  status: FileUploadStatus;
  error?: string;
  documentId?: string;
}

interface DocumentFileListProps {
  files: FileWithMetadata[];
  uploadStates?: Map<string, FileUploadState>;
  onFileRemove: (id: string) => void;
  onFileMetadataChange: (
    id: string,
    updates: { title?: string; description?: string }
  ) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType === "application/pdf") {
    return "📄";
  }
  if (
    fileType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileType === "application/msword"
  ) {
    return "📝";
  }
  if (fileType === "text/plain" || fileType === "text/markdown") {
    return "📃";
  }
  return "📎";
}

function getStatusIcon(status: FileUploadStatus) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="size-4 text-green-600" />;
    case "error":
      return <AlertCircle className="size-4 text-destructive" />;
    case "uploading":
      return <Loader2 className="size-4 animate-spin text-primary" />;
    default:
      return null;
  }
}

export function DocumentFileList({
  files,
  uploadStates = new Map(),
  onFileRemove,
  onFileMetadataChange,
  disabled = false,
}: DocumentFileListProps) {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Label>Selected Files ({files.length})</Label>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {files.map((fileItem) => {
          const uploadState = uploadStates.get(fileItem.id);
          const status = uploadState?.status ?? "pending";
          const isUploading = status === "uploading";
          const isSuccess = status === "success";
          const isError = status === "error";

          return (
            <div
              key={fileItem.id}
              className={cn(
                "border rounded-lg p-3 space-y-2",
                isError && "border-destructive/50 bg-destructive/5",
                isSuccess && "border-green-500/50 bg-green-500/5"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="mt-1">{getFileIcon(fileItem.file.type)}</div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileItem.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileItem.file.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      {!disabled && !isUploading && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onFileRemove(fileItem.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isError && uploadState?.error && (
                    <p className="text-xs text-destructive">
                      {uploadState.error}
                    </p>
                  )}

                  {!isSuccess && (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor={`title-${fileItem.id}`} className="text-xs">
                          Title *
                        </Label>
                        <Input
                          id={`title-${fileItem.id}`}
                          value={fileItem.title}
                          onChange={(e) =>
                            onFileMetadataChange(fileItem.id, {
                              title: e.target.value,
                            })
                          }
                          placeholder="Document title"
                          disabled={disabled || isUploading}
                          maxLength={200}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

