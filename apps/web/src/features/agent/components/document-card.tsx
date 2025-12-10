"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFileSizePrecise } from "@/lib/formatters/file-size-formatters";
import { queryKeys } from "@/lib/query-keys";
import type { IndexedDocumentDto } from "@/server/dto/knowledge-base-browser.dto";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  EyeIcon,
  FileTextIcon,
  MoreVerticalIcon,
  RefreshCwIcon,
  TrashIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DocumentPreviewDialog } from "./document-preview-dialog";

interface DocumentCardProps {
  document: IndexedDocumentDto;
  organizationId: string;
  onDeleted?: () => void;
  onReindexed?: () => void;
}

const processingStatusColors: Record<
  string,
  "default" | "secondary" | "destructive"
> = {
  completed: "default",
  processing: "secondary",
  pending: "secondary",
  failed: "destructive",
};

const processingStatusLabels: Record<string, string> = {
  completed: "Processed",
  processing: "Processing",
  pending: "Pending",
  failed: "Failed",
};

const contentTypeLabels: Record<string, string> = {
  knowledge_document: "Document",
  recording: "Recording",
  transcription: "Transcription",
  summary: "Summary",
  task: "Task",
  project_template: "Template",
  organization_instructions: "Instructions",
};

export function DocumentCard({
  document,
  organizationId,
  onDeleted,
  onReindexed,
}: DocumentCardProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const queryClient = useQueryClient();

  const formatDate = (date?: Date): string => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/agent/knowledge-base", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId: document.documentId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete document");
      }
    },
    onSuccess: () => {
      toast.success("Document deleted successfully");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agentKnowledgeBase.all,
      });
      onDeleted?.();
      setShowDeleteDialog(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete document: ${error.message}`);
    },
  });

  // Re-index mutation
  const reindexMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/agent/knowledge-base/reindex", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId: document.documentId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to re-index document");
      }
    },
    onSuccess: () => {
      toast.success("Document re-indexing started");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.agentKnowledgeBase.all,
      });
      onReindexed?.();
    },
    onError: (error: Error) => {
      toast.error(`Failed to re-index document: ${error.message}`);
    },
  });

  const displayTitle =
    document.title || document.filename || document.documentId;
  const canReindex = !!document.processingStatus; // Only if document exists in DB

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg flex items-center gap-2 truncate">
                <FileTextIcon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{displayTitle}</span>
              </CardTitle>
              {document.filename && document.filename !== displayTitle && (
                <CardDescription className="mt-1 truncate">
                  {document.filename}
                </CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <MoreVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowPreview(true)}>
                  <EyeIcon className="h-4 w-4 mr-2" />
                  Preview
                </DropdownMenuItem>
                {canReindex && (
                  <DropdownMenuItem
                    onClick={() => reindexMutation.mutate()}
                    disabled={reindexMutation.isPending}
                  >
                    <RefreshCwIcon className="h-4 w-4 mr-2" />
                    Re-index
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">
                {contentTypeLabels[document.contentType] ||
                  document.contentType}
              </Badge>
              {document.processingStatus && (
                <Badge
                  variant={
                    processingStatusColors[document.processingStatus] ||
                    "secondary"
                  }
                >
                  {processingStatusLabels[document.processingStatus] ||
                    document.processingStatus}
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                <strong>Chunks:</strong> {document.chunksCount}
              </div>
              {document.fileSize && (
                <div>
                  <strong>Size:</strong>{" "}
                  {formatFileSizePrecise(document.fileSize)}
                </div>
              )}
              {document.uploadDate && (
                <div>
                  <strong>Uploaded:</strong> {formatDate(document.uploadDate)}
                </div>
              )}
              {document.processingError && (
                <div className="text-destructive text-xs">
                  <strong>Error:</strong> {document.processingError}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      {showPreview && (
        <DocumentPreviewDialog
          documentId={document.documentId}
          organizationId={organizationId}
          open={showPreview}
          onOpenChange={setShowPreview}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This will remove
              all chunks from the knowledge base. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

