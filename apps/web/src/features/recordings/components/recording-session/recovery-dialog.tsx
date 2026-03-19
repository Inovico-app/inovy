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
    return `${hours} uur en ${minutes % 60} minuten`;
  }

  if (minutes > 0) {
    return `${minutes} ${minutes === 1 ? "minuut" : "minuten"}`;
  }

  return "minder dan een minuut";
}

export function RecoveryDialog({
  orphanedSession,
  onRecover,
  onDiscard,
}: RecoveryDialogProps) {
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
          <AlertDialogTitle>Onvoltooide opname gevonden</AlertDialogTitle>
          <AlertDialogDescription>
            Er is een opname gevonden die {age} geleden is gestart met{" "}
            {chunkCount} {chunkCount === 1 ? "fragment" : "fragmenten"}. Wilt u
            deze herstellen of verwijderen?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Verwijderen</AlertDialogCancel>
          <AlertDialogAction onClick={onRecover}>Herstellen</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
