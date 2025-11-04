"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ChatConversation } from "@/server/db/schema";
import { FileText, FileType, Loader2 } from "lucide-react";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ChatConversation | null;
  onExport: (format: "text" | "pdf") => void;
  isExporting?: boolean;
}

export function ExportDialog({
  open,
  onOpenChange,
  conversation,
  onExport,
  isExporting = false,
}: ExportDialogProps) {
  if (!conversation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Conversation</DialogTitle>
          <DialogDescription>
            Choose a format to export this conversation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Conversation Details</h4>
            <div className="text-sm text-muted-foreground">
              <p>
                <span className="font-medium">Title:</span>{" "}
                {conversation.title || "Untitled"}
              </p>
              <p>
                <span className="font-medium">Created:</span>{" "}
                {conversation.createdAt.toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium">Context:</span>{" "}
                {conversation.context}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Export Format</h4>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => onExport("text")}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Plain Text
              </Button>
              <Button
                variant="outline"
                className="justify-start"
                onClick={() => onExport("pdf")}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileType className="mr-2 h-4 w-4" />
                )}
                PDF
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

