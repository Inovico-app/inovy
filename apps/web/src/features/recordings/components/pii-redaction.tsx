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
      selectedDetection.endIndex
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
            <CardTitle>PII Redactie</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {hasDetections && (
              <Badge variant="outline">{detections.length} gedetecteerd</Badge>
            )}
            {hasRedactions && (
              <Badge variant="secondary">
                {redactions.length} geredacteerd
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Detecteer en redacteer persoonsgegevens uit transcripties
        </CardDescription>
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
            Detecteer PII
          </Button>
          {hasDetections && (
            <Button
              onClick={handleApplyAutomaticRedactions}
              disabled={isApplyingAutomatic}
              variant="default"
              size="sm"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Pas Alle Redacties Toe
            </Button>
          )}
        </div>

        {(isDetectingPII || isLoadingRedactions) && (
          <div className="space-y-2">
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {isDetectingPII ? "PII detecteren..." : "Redacties laden..."}
            </p>
          </div>
        )}

        {hasDetections && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Gedetecteerde PII:</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {detections.map((detection, index) => {
                const redacted = isRedacted(
                  detection.startIndex,
                  detection.endIndex
                );
                return (
                  <div
                    key={index}
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
                          Geredacteerd
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
            <h4 className="text-sm font-semibold">Redactie Geschiedenis:</h4>
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
                        ? "Automatisch"
                        : "Handmatig"}
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
            <h4 className="text-sm font-semibold">Voorvertoning:</h4>
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
                Geen PII gedetecteerd. Klik op "Detecteer PII" om de
                transcriptie te scannen.
              </p>
            </div>
          )}

        {!transcriptionText && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Geen transcriptie beschikbaar voor redactie.
            </p>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redactie Bevestigen</DialogTitle>
            <DialogDescription>
              Weet je zeker dat je deze PII wilt redacteren?
            </DialogDescription>
          </DialogHeader>
          {selectedDetection && (
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium">Type: </span>
                <Badge
                  variant="outline"
                  className={PII_TYPE_COLORS[selectedDetection.type] || ""}
                >
                  {PII_TYPE_LABELS[selectedDetection.type] ||
                    selectedDetection.type}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium">Tekst: </span>
                <span className="text-sm">{selectedDetection.text}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Vertrouwen: </span>
                <span className="text-sm">
                  {Math.round(selectedDetection.confidence * 100)}%
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuleren
            </Button>
            <Button
              onClick={handleConfirmRedaction}
              disabled={isCreatingRedaction}
            >
              {isCreatingRedaction ? "Redacteren..." : "Redactie Bevestigen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

