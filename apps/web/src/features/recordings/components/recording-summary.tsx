"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimestamp } from "@/lib/formatters/duration-formatters";
import { Clock, Loader2, RefreshCw } from "lucide-react";
import { useGenerateSummaryMutation } from "../hooks/use-generate-summary-mutation";
import { useJumpToTimestamp } from "../hooks/use-jump-to-timestamp";

interface SummaryContent {
  overview: string;
  topics: string[];
  decisions: string[];
  speakerContributions: {
    speaker: string;
    contributions: string[];
  }[];
  importantQuotes: {
    speaker: string;
    quote: string;
    startTime?: number;
  }[];
}

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
          <p className="text-muted-foreground mb-4">
            Geen samenvatting beschikbaar
          </p>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Samenvatting genereren
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
          <CardTitle>Vergadersamenvatting</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {Math.round(localSummary.confidence * 100)}% vertrouwen
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
            <h3 className="text-sm font-semibold mb-2">Overview</h3>
            <p className="text-sm">{content.overview}</p>
          </div>
        )}

        {/* Main Topics */}
        {content.topics && content.topics.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Key Topics</h3>
            <ul className="space-y-1">
              {content.topics.map((topic, index) => (
                <li key={index} className="text-sm flex items-start">
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
            <h3 className="text-sm font-semibold mb-2">Decisions</h3>
            <ul className="space-y-1">
              {content.decisions.map((decision, index) => (
                <li key={index} className="text-sm flex items-start">
                  <span className="text-primary mr-2">•</span>
                  {decision}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Speaker Contributions */}
        {content.speakerContributions &&
          content.speakerContributions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">
                Speaker Contributions
              </h3>
              <div className="space-y-3">
                {content.speakerContributions.map((speaker, index) => (
                  <div key={index} className="p-3 rounded-lg bg-muted/50">
                    <Badge variant="secondary" className="mb-2">
                      {speaker.speaker}
                    </Badge>
                    <ul className="space-y-1">
                      {speaker.contributions.map((contribution, cIndex) => (
                        <li key={cIndex} className="text-sm flex items-start">
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
            <h3 className="text-sm font-semibold mb-2">Important Quotes</h3>
            <div className="space-y-2">
              {content.importantQuotes.map((quote, index) => {
                const startTime = quote.startTime;
                return (
                  <div
                    key={index}
                    className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary"
                  >
                    <p className="text-sm italic mb-1">
                      &quot;{quote.quote}&quot;
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">
                        — {quote.speaker}
                      </p>
                      {startTime != null && (
                        <button
                          type="button"
                          onClick={() => jumpToTimestamp(startTime)}
                          aria-label={`Jump to ${formatTimestamp(startTime)}`}
                          className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:text-primary/80 transition-colors cursor-pointer"
                        >
                          <Clock className="h-3 w-3" />
                          {formatTimestamp(startTime)}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

