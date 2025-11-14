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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  applyAutomaticRedactionsAction,
  createRedactionAction,
  deleteRedactionAction,
  detectPIIAction,
  getRedactionsAction,
} from "@/features/recordings/actions/redact-pii";
import type { PIIDetection } from "@/server/services/pii-detection.service";
import type { Redaction } from "@/server/db/schema/redactions";
import { AlertTriangle, Eye, EyeOff, Shield, Sparkles, X } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

interface PIIRedactionProps {
  recordingId: string;
  transcriptionText: string | null;
  onRedactionsChange?: () => void;
}

const PII_TYPE_LABELS: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  ssn: "SSN",
  credit_card: "Credit Card",
  medical_record: "Medical Record",
  date_of_birth: "Date of Birth",
  address: "Address",
  person_name: "Name",
  ip_address: "IP Address",
};

const PII_TYPE_COLORS: Record<string, string> = {
  email: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  phone: "bg-green-500/20 text-green-700 dark:text-green-400",
  ssn: "bg-red-500/20 text-red-700 dark:text-red-400",
  credit_card: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  medical_record: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  date_of_birth: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  address: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
  person_name: "bg-pink-500/20 text-pink-700 dark:text-pink-400",
  ip_address: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
};

export function PIIRedaction({
  recordingId,
  transcriptionText,
  onRedactionsChange,
}: PIIRedactionProps) {
  const [detections, setDetections] = useState<PIIDetection[]>([]);
  const [redactions, setRedactions] = useState<Redaction[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDetection, setSelectedDetection] =
    useState<PIIDetection | null>(null);

  const { execute: detectPII, isExecuting: isDetectingPII } = useAction(
    detectPIIAction,
    {
      onSuccess: ({ data }) => {
        if (data) {
          setDetections(data);
          toast.success(`Found ${data.length} potential PII items`);
        }
      },
      onError: () => {
        toast.error("Failed to detect PII");
      },
    }
  );

  const { execute: getRedactions, isExecuting: isLoadingRedactions } =
    useAction(getRedactionsAction, {
      onSuccess: ({ data }) => {
        if (data) {
          setRedactions(data);
        }
      },
      onError: () => {
        toast.error("Failed to load redactions");
      },
    });

  const { execute: createRedaction, isExecuting: isCreatingRedaction } =
    useAction(createRedactionAction, {
      onSuccess: () => {
        toast.success("Redaction created");
        getRedactions({ recordingId });
        onRedactionsChange?.();
        setIsDialogOpen(false);
        setSelectedDetection(null);
      },
      onError: () => {
        toast.error("Failed to create redaction");
      },
    });

  const { execute: deleteRedaction, isExecuting: isDeletingRedaction } =
    useAction(deleteRedactionAction, {
      onSuccess: () => {
        toast.success("Redaction removed");
        getRedactions({ recordingId });
        onRedactionsChange?.();
      },
      onError: () => {
        toast.error("Failed to delete redaction");
      },
    });

  const {
    execute: applyAutomaticRedactions,
    isExecuting: isApplyingAutomatic,
  } = useAction(applyAutomaticRedactionsAction, {
    onSuccess: ({ data }) => {
      toast.success(`Applied ${data?.length ?? 0} automatic redactions`);
      getRedactions({ recordingId });
      onRedactionsChange?.();
    },
    onError: () => {
      toast.error("Failed to apply automatic redactions");
    },
  });

  useEffect(() => {
    if (recordingId) {
      getRedactions({ recordingId });
    }
  }, [recordingId, getRedactions]);

  const handleDetectPII = useCallback(() => {
    if (!transcriptionText) {
      toast.error("No transcription available");
      return;
    }
    setIsDetecting(true);
    detectPII({ recordingId, minConfidence: 0.5 });
  }, [recordingId, transcriptionText, detectPII]);

  const handleManualRedaction = useCallback(
    (detection: PIIDetection) => {
      setSelectedDetection(detection);
      setIsDialogOpen(true);
    },
    []
  );

  const handleCreateRedaction = useCallback(() => {
    if (!selectedDetection || !transcriptionText) {
      return;
    }

    createRedaction({
      recordingId,
      redactionType: "pii",
      originalText: selectedDetection.text,
      startIndex: selectedDetection.startIndex,
      endIndex: selectedDetection.endIndex,
      detectedBy: "manual",
    });
  }, [recordingId, selectedDetection, transcriptionText, createRedaction]);

  const handleApplyAutomaticRedactions = useCallback(() => {
    if (!transcriptionText) {
      toast.error("No transcription available");
      return;
    }
    applyAutomaticRedactions({ recordingId, minConfidence: 0.5 });
  }, [recordingId, transcriptionText, applyAutomaticRedactions]);

  const handleRemoveRedaction = useCallback(
    (redactionId: string) => {
      deleteRedaction({ redactionId });
    },
    [deleteRedaction]
  );

  const isRedacted = (detection: PIIDetection) => {
    return redactions.some(
      (r) =>
        r.startIndex === detection.startIndex &&
        r.endIndex === detection.endIndex
    );
  };

  const renderTextWithHighlights = () => {
    if (!transcriptionText) {
      return null;
    }

    const parts: Array<{ text: string; isPII: boolean; detection?: PIIDetection }> = [];
    let lastIndex = 0;

    // Sort detections by start index
    const sortedDetections = [...detections].sort(
      (a, b) => a.startIndex - b.startIndex
    );

    for (const detection of sortedDetections) {
      // Add text before detection
      if (detection.startIndex > lastIndex) {
        parts.push({
          text: transcriptionText.slice(lastIndex, detection.startIndex),
          isPII: false,
        });
      }

      // Add detection
      parts.push({
        text: detection.text,
        isPII: true,
        detection,
      });

      lastIndex = detection.endIndex;
    }

    // Add remaining text
    if (lastIndex < transcriptionText.length) {
      parts.push({
        text: transcriptionText.slice(lastIndex),
        isPII: false,
      });
    }

    return (
      <div className="space-y-2">
        {parts.map((part, index) => {
          if (!part.isPII || !part.detection) {
            return <span key={index}>{part.text}</span>;
          }

          const redacted = isRedacted(part.detection);
          const colorClass =
            PII_TYPE_COLORS[part.detection.type] ||
            "bg-gray-500/20 text-gray-700 dark:text-gray-400";

          return (
            <span
              key={index}
              className={`inline-block px-1 rounded ${
                redacted
                  ? "bg-red-500/30 text-red-700 dark:text-red-400 line-through"
                  : colorClass
              } cursor-pointer hover:opacity-80 transition-opacity`}
              onClick={() => !redacted && handleManualRedaction(part.detection!)}
              title={`${PII_TYPE_LABELS[part.detection.type] || part.detection.type} (${Math.round(part.detection.confidence * 100)}% confidence)`}
            >
              {redacted ? "[REDACTED]" : part.text}
            </span>
          );
        })}
      </div>
    );
  };

  const isLoading = isDetectingPII || isLoadingRedactions;
  const hasDetections = detections.length > 0;
  const hasRedactions = redactions.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>PII Redaction</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {hasDetections && (
              <Badge variant="outline">
                {detections.length} detected
              </Badge>
            )}
            {hasRedactions && (
              <Badge variant="secondary">
                {redactions.length} redacted
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>
          Detect and redact personally identifiable information from transcripts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={handleDetectPII}
            disabled={!transcriptionText || isLoading}
            variant="outline"
            size="sm"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Detect PII
          </Button>
          {hasDetections && (
            <Button
              onClick={handleApplyAutomaticRedactions}
              disabled={isApplyingAutomatic}
              variant="default"
              size="sm"
            >
              <EyeOff className="h-4 w-4 mr-2" />
              Apply All Redactions
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="space-y-2">
            <Progress value={undefined} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {isDetectingPII ? "Detecting PII..." : "Loading redactions..."}
            </p>
          </div>
        )}

        {hasDetections && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Detected PII:</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {detections.map((detection, index) => {
                const redacted = isRedacted(detection);
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
                        className={
                          PII_TYPE_COLORS[detection.type] || ""
                        }
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
                          Redacted
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
            <h4 className="text-sm font-semibold">Redaction History:</h4>
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
                        ? "Auto"
                        : "Manual"}
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
            <h4 className="text-sm font-semibold">Preview:</h4>
            <div className="p-4 rounded-lg bg-muted/50 text-sm max-h-60 overflow-y-auto">
              {renderTextWithHighlights()}
            </div>
          </div>
        )}

        {!hasDetections && !isLoading && transcriptionText && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No PII detected. Click "Detect PII" to scan the transcript.
            </p>
          </div>
        )}

        {!transcriptionText && (
          <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No transcription available for redaction.
            </p>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Redaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to redact this PII?
            </DialogDescription>
          </DialogHeader>
          {selectedDetection && (
            <div className="space-y-2">
              <div>
                <span className="text-sm font-medium">Type: </span>
                <Badge
                  variant="outline"
                  className={
                    PII_TYPE_COLORS[selectedDetection.type] || ""
                  }
                >
                  {PII_TYPE_LABELS[selectedDetection.type] ||
                    selectedDetection.type}
                </Badge>
              </div>
              <div>
                <span className="text-sm font-medium">Text: </span>
                <span className="text-sm">{selectedDetection.text}</span>
              </div>
              <div>
                <span className="text-sm font-medium">Confidence: </span>
                <span className="text-sm">
                  {Math.round(selectedDetection.confidence * 100)}%
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateRedaction}
              disabled={isCreatingRedaction}
            >
              {isCreatingRedaction ? "Redacting..." : "Confirm Redaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

