"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatFileSizePrecise } from "@/lib/formatters/file-size-formatters";
import type { KnowledgeDocumentDto } from "@/server/dto/knowledge-base.dto";
import {
  ExternalLinkIcon,
  FileTextIcon,
  MoreVerticalIcon,
  TrashIcon,
  UploadIcon,
} from "lucide-react";
import { useState } from "react";
import { DeleteKnowledgeDocumentDialog } from "./delete-knowledge-document-dialog";

interface KnowledgeDocumentListProps {
  documents: KnowledgeDocumentDto[];
  canEdit: boolean;
  onDocumentDeleted: (documentId: string) => void;
  onUploadClick?: () => void;
}

const processingStatusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive"; label: string }
> = {
  completed: { variant: "default", label: "Processed" },
  processing: { variant: "secondary", label: "Processing" },
  pending: { variant: "secondary", label: "Pending" },
  failed: { variant: "destructive", label: "Failed" },
};

export function KnowledgeDocumentList({
  documents,
  canEdit,
  onDocumentDeleted,
  onUploadClick,
}: KnowledgeDocumentListProps) {
  const [deletingDocument, setDeletingDocument] =
    useState<KnowledgeDocumentDto | null>(null);

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <FileTextIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-foreground">
          No documents uploaded yet
        </p>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Upload documents to extract terms and definitions automatically
        </p>
        {canEdit && onUploadClick && (
          <Button onClick={onUploadClick} size="sm" className="mt-4">
            <UploadIcon className="h-3.5 w-3.5 mr-1.5" />
            Upload Documents
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((document) => {
        const statusConfig = processingStatusConfig[
          document.processingStatus
        ] ?? {
          variant: "secondary" as const,
          label: document.processingStatus,
        };

        return (
          <div
            key={document.id}
            className="group flex items-start gap-3 rounded-lg border border-border/60 bg-card p-3.5 transition-colors hover:border-border"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <FileTextIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">
                  {document.title}
                </span>
                <Badge
                  variant={statusConfig.variant}
                  className="text-[10px] py-0 shrink-0"
                >
                  {statusConfig.label}
                </Badge>
              </div>
              {document.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {document.description}
                </p>
              )}
              <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground/80">
                <span className="truncate">{document.fileName}</span>
                <span className="text-border">·</span>
                <span className="shrink-0">
                  {formatFileSizePrecise(document.fileSize)}
                </span>
                <span className="text-border">·</span>
                <span className="shrink-0">{document.fileType}</span>
              </div>
              {document.processingError && (
                <p className="mt-1.5 text-xs text-destructive">
                  {document.processingError}
                </p>
              )}
            </div>
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Actions for ${document.title}`}
                    />
                  }
                >
                  <MoreVerticalIcon className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    render={
                      <a
                        href={`/api/documents/${document.id}/view`}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    <ExternalLinkIcon className="h-4 w-4 mr-2" />
                    Open Document
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeletingDocument(document)}
                    className="text-destructive focus:text-destructive"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        );
      })}

      {deletingDocument && (
        <DeleteKnowledgeDocumentDialog
          document={deletingDocument}
          open={!!deletingDocument}
          onOpenChange={(open) => !open && setDeletingDocument(null)}
          onSuccess={() => {
            onDocumentDeleted(deletingDocument.id);
            setDeletingDocument(null);
          }}
        />
      )}
    </div>
  );
}
