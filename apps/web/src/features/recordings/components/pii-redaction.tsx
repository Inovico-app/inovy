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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { usePIIDetection } from "@/features/recordings/hooks/use-pii-detection";
import { useRedactions } from "@/features/recordings/hooks/use-redactions";
import type { PIIDetection } from "@/server/services/pii-detection.service";
import { AlertTriangle, EyeOff, Shield, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { PII_TYPE_COLORS, PII_TYPE_LABELS } from "./pii-redaction-helpers";
import { PIITextHighlight } from "./pii-text-highlight";
import { useTranslations } from "next-intl";

interface PIIRedactionProps {
  recordingId: string;
  transcriptionText: string | null;
  onRedactionsChange?: () => void;
}

export function PIIRedaction({
  recordingId,
  transcriptionText,
  onRedactionsChange,
}: PIIRedactionProps) {
  const t = useTranslations("recordings");
  const tc = useTranslations("common");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDetection, setSelectedDetection] =
    useState<PIIDetection | null>(null);

  const {
    redactions,
    isLoadingRedactions,
    isCreatingRedaction,
    isDeletingRedaction,
    handleCreateRedaction,
    handleRemoveRedaction,
    isRedacted,
    refreshRedactions,
  } = useRedactions(recordingId, onRedactionsChange);

  const {
    detections,
    isDetectingPII,
    isApplyingAutomatic,
    handleDetectPII,
    handleApplyAutomaticRedactions,
  } = usePIIDetection(recordingId, transcriptionText, {
    onAutomaticRedactionsApplied: refreshRedactions,
  });

  const handleManualRedaction = (detection: PIIDetection) => {
    setSelectedDetection(detection);
    setIsDialogOpen(true);
  };

  const handleConfirmRedaction = () => {
    if (!selectedDetection) {
      return;
    }

    handleCreateRedaction(
      selectedDetection.text,
      selectedDetection.startIndex,
      selectedDetection.endIndex,
    );
    setIsDialogOpen(false);
    setSelectedDetection(null);
  };

  const hasDetections = detections.length > 0;
  const hasRedactions = redactions.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>{t("pii.title")}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {hasDetections && (
              <Badge variant="outline">
                {t("pii.detected", { count: detections.length })}
              </Badge>
            )}
            {hasRedactions && (
              <Badge variant="secondary">
                {t("pii.redacted", { count: redactions.length })}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>{t("pii.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDetectPII}
            disabled={
              !transcriptionText || isDetectingPII || isLoadingRedactions
            }
            variant="outline"
            size="sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {t("pii.detectPii")}
          </Button>
          {hasDetections && (
            <Button
              onClick={handleApplyAutomaticRedactions}
              disabled={isApplyingAutomatic}
              variant="default"
              size="sm"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              {t("pii.applyAllRedactions")}
            </Button>
          )}
        </div>

        {(isDetectingPII || isLoadingRedactions) && (
          <div className="space-y-2">
            <Progress value={null} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {isDetectingPII ? t("pii.detecting") : t("pii.loadingRedactions")}
            </p>
          </div>
        )}

        {hasDetections && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t("pii.detectedPii")}</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {detections.map((detection, _index) => {
                const redacted = isRedacted(
                  detection.startIndex,
                  detection.endIndex,
                );
                return (
                  <div
                    key={`pii-${detection.type}-${detection.startIndex}-${detection.endIndex}`}
                    className={`flex items-center justify-between p-2 rounded border ${
                      redacted ? "bg-muted" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={PII_TYPE_COLORS[detection.type] || ""}
                      >
                        {PII_TYPE_LABELS[detection.type] || detection.type}
                      </Badge>
                      <span
                        className={`text-sm ${
                          redacted ? "line-through text-muted-foreground" : ""
                        }`}
                      >
                        {detection.text}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({Math.round(detection.confidence * 100)}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {redacted ? (
                        <Badge variant="secondary" className="text-xs">
                          {t("pii.redactedBadge")}
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManualRedaction(detection)}
                          disabled={isCreatingRedaction}
                        >
                          <EyeOff className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasRedactions && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">
              {t("pii.redactionHistory")}
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {redactions.map((redaction) => (
                <div
                  key={redaction.id}
                  className="flex items-center justify-between p-2 rounded border bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {PII_TYPE_LABELS[redaction.redactionType] ||
                        redaction.redactionType}
                    </Badge>
                    <span className="text-sm line-through text-muted-foreground">
                      {redaction.originalText}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      → {redaction.redactedText}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {redaction.detectedBy === "automatic"
                        ? t("pii.automatic")
                        : t("pii.manual")}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveRedaction(redaction.id)}
                    disabled={isDeletingRedaction}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {hasDetections && transcriptionText && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">{t("pii.preview")}</h4>
            <div className="p-4 rounded-lg bg-muted/50 text-sm max-h-60 overflow-y-auto">
              <PIITextHighlight
                transcriptionText={transcriptionText}
                detections={detections}
                isRedacted={isRedacted}
                onRedact={handleManualRedaction}
              />
            </div>
          </div>
        )}

        {!hasDetections &&
          !isDetectingPII &&
          !isLoadingRedactions &&
          transcriptionText && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("pii.noPiiDetected")}
              </p>
            </div>
          )}

        {!transcriptionText && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("pii.noTranscription")}
            </p>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pii.confirmRedaction")}</DialogTitle>
            <DialogDescription>
              {t("pii.confirmRedactionDescription")}
            </DialogDescription>
          </DialogHeader>
          {selectedDetection && (
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium">{t("pii.type")} </span>
                <Badge
                  variant="outline"
                  className={PII_TYPE_COLORS[selectedDetection.type] || ""}
                >
                  {PII_TYPE_LABELS[selectedDetection.type] ||
                    selectedDetection.type}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium">{t("pii.text")} </span>
                <span className="text-sm">{selectedDetection.text}</span>
              </div>
              <div>
                <span className="text-sm font-medium">
                  {t("pii.confidenceLabel")}{" "}
                </span>
                <span className="text-sm">
                  {Math.round(selectedDetection.confidence * 100)}%
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {tc("cancel")}
            </Button>
            <Button
              onClick={handleConfirmRedaction}
              disabled={isCreatingRedaction}
            >
              {isCreatingRedaction
                ? t("pii.redacting")
                : t("pii.confirmRedactionButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
