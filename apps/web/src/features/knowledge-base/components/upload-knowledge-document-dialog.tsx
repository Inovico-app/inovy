"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
import type { KnowledgeDocumentDto } from "@/server/dto/knowledge-base.dto";
import { useRef, useState } from "react";
import { useBatchUpload } from "../hooks/use-batch-upload";
import { useFileSelection } from "../hooks/use-file-selection";
import { DocumentFileList } from "./document-file-list";
import { UploadSummary } from "./upload-summary";
import { cn } from "@/lib/utils";

interface UploadKnowledgeDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: KnowledgeBaseScope;
  scopeId: string | null;
  onSuccess?: (document: KnowledgeDocumentDto) => void;
}

export function UploadKnowledgeDocumentDialog({
  open,
  onOpenChange,
  scope,
  scopeId,
  onSuccess,
}: UploadKnowledgeDocumentDialogProps) {
  const [sharedDescription, setSharedDescription] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const {
    selectedFiles,
    fileError,
    handleFileChange,
    handleFilesDrop,
    removeFile,
    updateFileMetadata,
    clearFiles,
    validateFiles,
    maxBatchSize,
  } = useFileSelection();

  const {
    isLoading,
    uploadStates,
    uploadFiles,
    clearUploadStates,
    hasSuccessfulUploads,
    hasErrors,
    isUploading,
  } = useBatchUpload({
    scope,
    scopeId,
    sharedDescription,
    onSuccess,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateFiles()) {
      return;
    }

    const result = await uploadFiles(selectedFiles, sharedDescription);

    if (result.success && hasSuccessfulUploads) {
      setTimeout(
        () => {
          onOpenChange(false);
          resetForm();
        },
        selectedFiles.length > 1 ? 2000 : 1000
      );
    }
  };

  const resetForm = () => {
    clearFiles();
    clearUploadStates();
    setSharedDescription("");
  };

  const successCount = Array.from(uploadStates.values()).filter(
    (s) => s.status === "success"
  ).length;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types?.includes("Files")) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set drag over to false if we're leaving the drop zone itself
    if (
      !dropZoneRef.current?.contains(e.relatedTarget as Node) &&
      e.currentTarget === dropZoneRef.current
    ) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isLoading || selectedFiles.length >= maxBatchSize) {
      return;
    }

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFilesDrop(files);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {selectedFiles.length > 1
              ? "Upload Knowledge Documents"
              : "Upload Knowledge Document"}
          </DialogTitle>
          <DialogDescription>
            Upload document{selectedFiles.length > 1 ? "s" : ""} to extract
            terms and definitions automatically. You can upload up to{" "}
            {maxBatchSize} files at once.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">
              Document{selectedFiles.length > 1 ? "s" : ""} *
            </Label>
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (!isLoading && selectedFiles.length < maxBatchSize) {
                  document.getElementById("file")?.click();
                }
              }}
              className={cn(
                "border-2 border-dashed rounded-lg p-6 transition-colors",
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50",
                isLoading || selectedFiles.length >= maxBatchSize
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              )}
            >
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.txt,.md"
                  multiple
                  disabled={isLoading || selectedFiles.length >= maxBatchSize}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "text-sm font-medium",
                    isLoading || selectedFiles.length >= maxBatchSize
                      ? "opacity-50"
                      : ""
                  )}
                >
                  {isDragOver
                    ? "Drop files here"
                    : "Click to select files or drag and drop"}
                </span>
                <p className="text-xs text-muted-foreground">
                  PDF, Word, or text files up to 50MB each
                </p>
              </div>
            </div>
            {fileError && (
              <div className="text-sm text-destructive whitespace-pre-line">
                {fileError}
              </div>
            )}
            {selectedFiles.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}{" "}
                selected
                {selectedFiles.length >= maxBatchSize && " (maximum reached)"}
              </p>
            )}
          </div>

          {selectedFiles.length > 0 && (
            <DocumentFileList
              files={selectedFiles}
              uploadStates={uploadStates}
              onFileRemove={removeFile}
              onFileMetadataChange={updateFileMetadata}
              disabled={isLoading}
            />
          )}

          {selectedFiles.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="shared-description">
                Shared Description (optional)
              </Label>
              <Textarea
                id="shared-description"
                value={sharedDescription}
                onChange={(e) => setSharedDescription(e.target.value)}
                placeholder="Description that will be applied to all documents if individual descriptions are not provided"
                rows={2}
                maxLength={1000}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                This description will be used for documents that don't have an
                individual description set.
              </p>
            </div>
          )}

          {hasSuccessfulUploads && (
            <UploadSummary successCount={successCount} hasErrors={hasErrors} />
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              {hasSuccessfulUploads ? "Close" : "Cancel"}
            </Button>
            {!hasSuccessfulUploads && (
              <Button
                type="submit"
                disabled={
                  isLoading ||
                  selectedFiles.length === 0 ||
                  isUploading ||
                  selectedFiles.some((f) => !f.title || f.title.trim() === "")
                }
              >
                {isLoading || isUploading
                  ? `Uploading... (${Array.from(uploadStates.values()).filter((s) => s.status === "uploading").length}/${selectedFiles.length})`
                  : selectedFiles.length > 1
                    ? `Upload ${selectedFiles.length} Documents`
                    : "Upload Document"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

