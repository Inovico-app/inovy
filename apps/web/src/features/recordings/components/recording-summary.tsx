"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SummaryContent } from "@/server/cache/summary.cache";
import { Loader2, RefreshCw } from "lucide-react";
import { useGenerateSummaryMutation } from "../hooks/use-generate-summary-mutation";
import { useJumpToTimestamp } from "../hooks/use-jump-to-timestamp";
import { TimestampButton } from "./timestamp-button";
import { useTranslations } from "next-intl";

interface RecordingSummaryProps {
  recordingId: string;
  summary?: {
    content: SummaryContent;
    confidence: number;
    status?: string;
  };
  onRegenerate?: () => void;
}

export function RecordingSummary({
  recordingId,
  summary,
  onRegenerate,
}: RecordingSummaryProps) {
  const t = useTranslations("recordings");
  const {
    generateSummary,
    isGenerating,
    summary: mutationSummary,
  } = useGenerateSummaryMutation({
    recordingId,
    onSuccess: onRegenerate,
  });
  const jumpToTimestamp = useJumpToTimestamp();

  const handleGenerate = () => {
    generateSummary();
  };

  // Use mutation summary if available, otherwise use prop summary
  const localSummary = mutationSummary ?? summary;

  if (!localSummary) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground mb-4">{t("summary.noSummary")}</p>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("summary.generateSummary")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const content = localSummary.content;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t("summary.meetingSummary")}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {t("summary.confidence", {
                value: Math.round(localSummary.confidence * 100),
              })}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview */}
        {content.overview && (
          <div>
            <h3 className="text-sm font-semibold mb-2">
              {t("summary.overview")}
            </h3>
            <p className="text-sm">{content.overview}</p>
          </div>
        )}

        {/* Main Topics */}
        {content.topics && content.topics.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">
              {t("summary.keyTopics")}
            </h3>
            <ul className="space-y-1">
              {content.topics.map((topic, index) => (
                <li
                  key={`topic-${index}-${String(topic).slice(0, 20)}`}
                  className="text-sm flex items-start"
                >
                  <span className="text-primary mr-2">•</span>
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decisions */}
        {content.decisions && content.decisions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">
              {t("summary.decisions")}
            </h3>
            <ul className="space-y-1">
              {content.decisions.map((decision, index) => (
                <li
                  key={`decision-${index}-${String(decision).slice(0, 20)}`}
                  className="text-sm flex items-start"
                >
                  <span className="text-primary mr-2">•</span>
                  {decision}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* {t("summary.speakerContributions")} */}
        {content.speakerContributions &&
          content.speakerContributions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">
                Speaker Contributions
              </h3>
              <div className="space-y-3">
                {content.speakerContributions.map((speaker, index) => (
                  <div
                    key={`speaker-${index}-${speaker.speaker}`}
                    className="p-3 rounded-lg bg-muted/50"
                  >
                    <Badge variant="secondary" className="mb-2">
                      {speaker.speaker}
                    </Badge>
                    <ul className="space-y-1">
                      {speaker.contributions.map((contribution, cIndex) => (
                        <li
                          key={`contribution-${cIndex}-${String(contribution).slice(0, 20)}`}
                          className="text-sm flex items-start"
                        >
                          <span className="text-muted-foreground mr-2">-</span>
                          {contribution}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Important Quotes */}
        {content.importantQuotes && content.importantQuotes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">
              {t("summary.importantQuotes")}
            </h3>
            <div className="space-y-2">
              {content.importantQuotes.map((quote, index) => (
                <div
                  key={`quote-${index}-${quote.speaker}`}
                  className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary"
                >
                  <p className="text-sm italic mb-1">
                    &quot;{quote.quote}&quot;
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      — {quote.speaker}
                    </p>
                    {quote.startTime != null && (
                      <TimestampButton
                        startTime={quote.startTime}
                        onJump={jumpToTimestamp}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
