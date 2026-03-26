"use client";

import { useState } from "react";
import { History, RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranscriptionHistory } from "../hooks/use-transcription-history";
import { useRestoreTranscriptionMutation } from "../hooks/use-restore-transcription-mutation";
import { useTranslations } from "next-intl";

interface TranscriptionHistoryDialogProps {
  recordingId: string;
}

export function TranscriptionHistoryDialog({
  recordingId,
}: TranscriptionHistoryDialogProps) {
  const t = useTranslations("recordings");
  const [open, setOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const { data: history, isLoading } = useTranscriptionHistory(recordingId);
  const restoreMutation = useRestoreTranscriptionMutation({
    onSuccess: () => {
      setOpen(false);
      setSelectedVersion(null);
    },
  });

  const handleRestore = (versionNumber: number) => {
    if (
      confirm(
        t("transcriptionHistory.restoreConfirm", { number: versionNumber }),
      )
    ) {
      restoreMutation.mutate({ recordingId, versionNumber });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            title={t("transcriptionHistory.viewHistory")}
          />
        }
      >
        <History className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("transcriptionHistory.title")}</DialogTitle>
          <DialogDescription>
            {t("transcriptionHistory.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          ) : !history || history.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              {t("transcriptionHistory.noHistory")}
            </Card>
          ) : (
            <>
              {history.map((version) => (
                <Card key={version.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {t("transcriptionHistory.version", {
                          number: version.versionNumber,
                        })}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(version.editedAt).toLocaleString("nl-NL", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedVersion(
                            selectedVersion === version.versionNumber
                              ? null
                              : version.versionNumber,
                          )
                        }
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {selectedVersion === version.versionNumber
                          ? t("transcriptionHistory.hide")
                          : t("transcriptionHistory.view")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(version.versionNumber)}
                        disabled={restoreMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        {t("transcriptionHistory.restoreButton")}
                      </Button>
                    </div>
                  </div>

                  {version.changeDescription && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {version.changeDescription}
                    </p>
                  )}

                  {selectedVersion === version.versionNumber && (
                    <div className="mt-3 p-3 rounded-lg bg-muted/50 max-h-[300px] overflow-y-auto">
                      <p className="text-sm whitespace-pre-wrap">
                        {version.content}
                      </p>
                    </div>
                  )}
                </Card>
              ))}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
