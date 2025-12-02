"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@/components/loader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { queryKeys } from "@/lib/query-keys";
import type { DocumentPreviewDto } from "@/server/dto/knowledge-base-browser.dto";

interface DocumentPreviewDialogProps {
  documentId: string;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const contentTypeLabels: Record<string, string> = {
  knowledge_document: "Document",
  recording: "Recording",
  transcription: "Transcription",
  summary: "Summary",
  task: "Task",
  project_template: "Template",
  organization_instructions: "Instructions",
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
};

const formatDate = (date?: Date): string => {
  if (!date) return "Unknown";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export function DocumentPreviewDialog({
  documentId,
  organizationId,
  open,
  onOpenChange,
}: DocumentPreviewDialogProps) {
  // Fetch document preview
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.agentKnowledgeBase.document(documentId),
    queryFn: async () => {
      const response = await fetch(
        `/api/agent/knowledge-base/preview?documentId=${documentId}&sampleSize=10`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch document preview");
      }
      return response.json() as Promise<DocumentPreviewDto>;
    },
    enabled: open, // Only fetch when dialog is open
  });

  const document = data?.document;
  const sampleChunks = data?.sampleChunks ?? [];
  const totalChunks = data?.totalChunks ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {document?.title || document?.filename || documentId}
          </DialogTitle>
          <DialogDescription>
            Document preview and metadata
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircleIcon className="h-4 w-4" />
            <AlertDescription>
              Failed to load document preview:{" "}
              {error instanceof Error ? error.message : "Unknown error"}
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && document && (
          <div className="flex-1 flex flex-col gap-6 overflow-hidden">
            {/* Metadata */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">
                  {contentTypeLabels[document.contentType] ||
                    document.contentType}
                </Badge>
                <Badge variant="secondary">
                  {totalChunks} chunk{totalChunks !== 1 ? "s" : ""}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Document ID:</strong>{" "}
                  <code className="text-xs">{document.documentId}</code>
                </div>
                {document.filename && (
                  <div>
                    <strong>Filename:</strong> {document.filename}
                  </div>
                )}
                {document.fileSize && (
                  <div>
                    <strong>File Size:</strong> {formatFileSize(document.fileSize)}
                  </div>
                )}
                {document.fileType && (
                  <div>
                    <strong>File Type:</strong> {document.fileType}
                  </div>
                )}
                {document.uploadDate && (
                  <div>
                    <strong>Uploaded:</strong> {formatDate(document.uploadDate)}
                  </div>
                )}
                {document.projectId && (
                  <div>
                    <strong>Project ID:</strong>{" "}
                    <code className="text-xs">{document.projectId}</code>
                  </div>
                )}
              </div>
            </div>

            {/* Sample Chunks */}
            <div className="flex-1 flex flex-col min-h-0">
              <h3 className="text-lg font-semibold mb-2">
                Sample Chunks ({sampleChunks.length} of {totalChunks})
              </h3>
              <div className="flex-1 border rounded-md p-4 overflow-auto">
                <div className="space-y-4">
                  {sampleChunks.map((chunk, index) => (
                    <div
                      key={String(chunk.id)}
                      className="border-b pb-4 last:border-b-0 last:pb-0"
                    >
                      <div className="text-xs text-muted-foreground mb-2">
                        Chunk {index + 1}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">
                        {chunk.content || "(Empty chunk)"}
                      </p>
                    </div>
                  ))}
                  {sampleChunks.length < totalChunks && (
                    <div className="text-sm text-muted-foreground italic">
                      ... and {totalChunks - sampleChunks.length} more chunk
                      {totalChunks - sampleChunks.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

