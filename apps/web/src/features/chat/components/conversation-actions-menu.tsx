"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ChatConversation } from "@/server/db/schema/chat-conversations";
import {
  Archive,
  ArchiveRestore,
  Download,
  FileText,
  FileType,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { useConversationActions } from "../hooks/use-conversation-actions";
import { useConversationExport } from "../hooks/use-conversation-export";
import { DeleteConversationDialog } from "./delete-conversation-dialog";
import { RestoreConversationDialog } from "./restore-conversation-dialog";
import { ExportDialog } from "./export-dialog";

interface ConversationActionsMenuProps {
  conversation: ChatConversation;
  trigger: React.ReactNode;
}

export function ConversationActionsMenu({
  conversation,
  trigger,
}: ConversationActionsMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const { softDelete, restore, archive, unarchive } = useConversationActions();
  const { exportConversation, isExporting } = useConversationExport();

  const isDeleted = conversation.deletedAt !== null;
  const isArchived = conversation.archivedAt !== null && !isDeleted;

  const handleDelete = () => {
    softDelete.mutate(conversation.id);
    setShowDeleteDialog(false);
  };

  const handleRestore = () => {
    restore.mutate(conversation.id);
    setShowRestoreDialog(false);
  };

  const handleArchive = () => {
    archive.mutate(conversation.id);
  };

  const handleUnarchive = () => {
    unarchive.mutate(conversation.id);
  };

  const handleExport = (format: "text" | "pdf") => {
    exportConversation(conversation.id, format);
    setShowExportDialog(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {!isDeleted && (
            <>
              {isArchived ? (
                <DropdownMenuItem onClick={handleUnarchive}>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Unarchive
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem
                    onClick={() => exportConversation(conversation.id, "text")}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Plain Text
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => exportConversation(conversation.id, "pdf")}
                  >
                    <FileType className="mr-2 h-4 w-4" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
          {isDeleted && (
            <DropdownMenuItem onClick={() => setShowRestoreDialog(true)}>
              <Undo2 className="mr-2 h-4 w-4" />
              Restore
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConversationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        isDeleting={softDelete.isPending}
      />

      <RestoreConversationDialog
        open={showRestoreDialog}
        onOpenChange={setShowRestoreDialog}
        onConfirm={handleRestore}
        isRestoring={restore.isPending}
      />

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        conversation={conversation}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </>
  );
}

