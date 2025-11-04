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

interface RestoreConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isRestoring?: boolean;
  daysRemaining?: number;
}

export function RestoreConversationDialog({
  open,
  onOpenChange,
  onConfirm,
  isRestoring = false,
  daysRemaining,
}: RestoreConversationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore Conversation?</AlertDialogTitle>
          <AlertDialogDescription>
            This conversation will be restored to your active conversations.
            {daysRemaining !== undefined && (
              <span className="block mt-2 text-sm">
                {daysRemaining > 0
                  ? `${daysRemaining} days remaining before permanent deletion.`
                  : "This conversation will be permanently deleted soon."}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRestoring}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isRestoring}
          >
            {isRestoring ? "Restoring..." : "Restore"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

