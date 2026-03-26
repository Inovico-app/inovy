"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KnowledgeUsageIndicator } from "@/features/knowledge-base/components/knowledge-usage-indicator";
import { PIIRedaction } from "../pii-redaction";
import { ProcessingError } from "../processing-error";
import { TranscriptionEditor } from "./transcription-editor";
import type { TranscriptionSectionProps } from "./types";
import { useTranslations } from "next-intl";

export function TranscriptionSection({
  recording,
  transcriptionInsights,
  knowledgeUsed,
}: TranscriptionSectionProps) {
  const t = useTranslations("recordings");
  const { transcriptionStatus, transcriptionText } = recording;

  if (transcriptionStatus !== "completed" || !transcriptionText) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("transcription.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {transcriptionStatus === "processing" ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("transcription.processing")}</p>
              <p className="text-sm mt-2">
                {t("transcription.processingTime")}
              </p>
            </div>
          ) : transcriptionStatus === "failed" ? (
            <ProcessingError
              title={t("transcription.failedTitle")}
              recordingTitle={recording.title}
              message={t("transcription.failedMessage")}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("transcription.pendingTitle")}</p>
              <p className="text-sm mt-2">
                {t("transcription.pendingMessage")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <TranscriptionEditor
        recording={recording}
        transcriptionInsights={transcriptionInsights}
      />
      <PIIRedaction
        recordingId={recording.id}
        transcriptionText={transcriptionText}
      />
      {knowledgeUsed && knowledgeUsed.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <KnowledgeUsageIndicator
              knowledgeEntryIds={knowledgeUsed}
              variant="compact"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
