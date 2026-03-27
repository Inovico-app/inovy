"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSubmitFeedback } from "@/features/recordings/hooks/use-submit-feedback";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface FeedbackWidgetProps {
  recordingId: string;
  existingFeedback: Array<{
    type: string;
    rating: string;
    comment: string | null;
  }>;
}

type FeedbackType = "summary" | "transcription" | "general";

const FEEDBACK_TYPES: FeedbackType[] = ["summary", "transcription", "general"];

function buildInitialSubmitted(
  existingFeedback: FeedbackWidgetProps["existingFeedback"],
): Record<FeedbackType, string | null> {
  const map: Record<FeedbackType, string | null> = {
    summary: null,
    transcription: null,
    general: null,
  };
  for (const entry of existingFeedback) {
    const type = entry.type as FeedbackType;
    if (type in map) {
      map[type] = entry.rating;
    }
  }
  return map;
}

export function FeedbackWidget({
  recordingId,
  existingFeedback,
}: FeedbackWidgetProps) {
  const t = useTranslations("recordings.feedback");
  const { execute, isExecuting } = useSubmitFeedback();

  const [selectedType, setSelectedType] = useState<FeedbackType>("summary");
  const [submittedFeedback, setSubmittedFeedback] = useState<
    Record<FeedbackType, string | null>
  >(() => buildInitialSubmitted(existingFeedback));
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [pendingRating, setPendingRating] = useState<
    "positive" | "negative" | null
  >(null);

  const alreadySubmitted = submittedFeedback[selectedType] !== null;
  const submittedRating = submittedFeedback[selectedType];

  function handleTypeSelect(type: FeedbackType) {
    if (type === selectedType) return;
    setSelectedType(type);
    setShowComment(false);
    setComment("");
    setPendingRating(null);
  }

  function handleThumbClick(rating: "positive" | "negative") {
    if (alreadySubmitted || isExecuting) return;

    setPendingRating(rating);
    setShowComment(true);
    setComment("");
  }

  function handleCommentSubmit() {
    if (!pendingRating) return;

    execute({
      recordingId,
      type: selectedType,
      rating: pendingRating,
      comment: comment.trim() || undefined,
    });

    setSubmittedFeedback((prev) => ({
      ...prev,
      [selectedType]: pendingRating,
    }));
    setShowComment(false);
    setComment("");
    setPendingRating(null);
  }

  function getThumbColor(thumb: "positive" | "negative"): string {
    const activeColor =
      thumb === "positive" ? "text-emerald-500" : "text-destructive";
    if (submittedRating === thumb || pendingRating === thumb)
      return activeColor;
    if (submittedRating !== null) return "text-muted-foreground/40";
    return "text-muted-foreground";
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 text-xs text-muted-foreground">
          {t("wasThisHelpful")}
        </span>

        <div
          role="group"
          aria-label={t("feedbackType")}
          className="flex items-center gap-1"
        >
          {FEEDBACK_TYPES.map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              size="sm"
              onClick={() => handleTypeSelect(type)}
            >
              {t(type)}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("helpful")}
            disabled={alreadySubmitted || isExecuting}
            onClick={() => handleThumbClick("positive")}
            title={alreadySubmitted ? t("alreadySubmitted") : t("helpful")}
          >
            <ThumbsUp className={getThumbColor("positive")} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            aria-label={t("notHelpful")}
            disabled={alreadySubmitted || isExecuting}
            onClick={() => handleThumbClick("negative")}
            title={alreadySubmitted ? t("alreadySubmitted") : t("notHelpful")}
          >
            <ThumbsDown className={getThumbColor("negative")} />
          </Button>
        </div>
      </div>

      {showComment && !alreadySubmitted && (
        <div className="flex flex-col gap-2">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("commentPlaceholder")}
            maxLength={500}
            rows={2}
            className="min-h-0 resize-none text-sm"
            aria-label={t("commentPlaceholder")}
          />
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowComment(false);
                setComment("");
                setPendingRating(null);
              }}
              disabled={isExecuting}
            >
              {t("cancel")}
            </Button>
            <Button
              size="sm"
              onClick={handleCommentSubmit}
              disabled={isExecuting}
            >
              {t("submit")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
