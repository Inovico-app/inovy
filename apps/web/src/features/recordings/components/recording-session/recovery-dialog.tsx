"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { RecoveredSession } from "@/features/recordings/core/recording-session.types";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface RecoveryDialogProps {
  orphanedSession: RecoveredSession | null;
  onRecover: () => void;
  onDiscard: () => void;
}

function formatAge(startedAt: number): string {
  const ageMs = Date.now() - startedAt;
  const minutes = Math.floor(ageMs / 60_000);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} and ${minutes % 60} ${minutes % 60 === 1 ? "minute" : "minutes"}`;
  }

  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  }

  return "< 1 min";
}

export function RecoveryDialog({
  orphanedSession,
  onRecover,
  onDiscard,
}: RecoveryDialogProps) {
  const t = useTranslations("recordings");
  if (!orphanedSession) return null;

  const age = formatAge(orphanedSession.manifest.startedAt);
  const chunkCount = orphanedSession.manifest.totalChunks;

  return (
    <AlertDialog open>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </AlertDialogMedia>
          <AlertDialogTitle>{t("recovery.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("recovery.description", {
              age,
              chunks: chunkCount,
              chunkLabel:
                chunkCount === 1 ? t("recovery.chunk") : t("recovery.chunks"),
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>
            {t("recovery.discardRecovery")}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onRecover}>
            {t("recovery.recover")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
