"use client";

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
import type { KnowledgeBaseScope } from "@/server/db/schema/knowledge-base-entries";
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
  scope: KnowledgeBaseScope;
  scopeId: string | null;
  canEdit: boolean;
  onDocumentDeleted: (documentId: string) => void;
  onUploadClick?: () => void;
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

export function KnowledgeDocumentList({
  documents,
  scope: _scope,
  scopeId: _scopeId,
  canEdit,
  onDocumentDeleted,
  onUploadClick,
}: KnowledgeDocumentListProps) {
  const [deletingDocument, setDeletingDocument] =
    useState<KnowledgeDocumentDto | null>(null);

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileTextIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground font-medium">
          No knowledge documents yet
        </p>
        <p className="text-sm text-muted-foreground mt-2 mb-4">
          Upload documents to extract terms and definitions automatically
        </p>
        {canEdit && onUploadClick && (
          <Button onClick={onUploadClick} variant="default" size="sm">
            <UploadIcon className="h-4 w-4 mr-2" />
            Batch Upload Documents
          </Button>
        )}
      </div>
    );
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      {documents.map((document) => (
        <Card key={document.id}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileTextIcon className="h-5 w-5" />
                  {document.title}
                </CardTitle>
                {document.description && (
                  <CardDescription className="mt-2">
                    {document.description}
                  </CardDescription>
                )}
                <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{document.fileName}</span>
                  <span>•</span>
                  <span>{formatFileSize(document.fileSize)}</span>
                  <span>•</span>
                  <span>{document.fileType}</span>
                </div>
              </div>
              {canEdit && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVerticalIcon className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <a
                        href={document.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center"
                      >
                        <ExternalLinkIcon className="h-4 w-4 mr-2" />
                        Open Document
                      </a>
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
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  processingStatusColors[document.processingStatus] ||
                  "secondary"
                }
              >
                {processingStatusLabels[document.processingStatus] ||
                  document.processingStatus}
              </Badge>
              {document.processingError && (
                <span className="text-sm text-destructive">
                  Error: {document.processingError}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Delete Dialog */}
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

