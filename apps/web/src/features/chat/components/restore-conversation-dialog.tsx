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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("chat");
  const tc = useTranslations("common");
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("restoreConversationTitle")}</AlertDialogTitle>
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
          <AlertDialogCancel disabled={isRestoring}>
            {tc("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isRestoring}
          >
            {isRestoring ? t("restoring") : "Restore"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
