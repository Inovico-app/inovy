"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SummaryContent {
  hoofdonderwerpen: string[];
  beslissingen: string[];
  sprekersBijdragen: {
    spreker: string;
    bijdragen: string[];
  }[];
  belangrijkeQuotes: {
    spreker: string;
    quote: string;
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [localSummary, setLocalSummary] = useState(summary);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`/api/summarize/${recordingId}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();
      setLocalSummary(data.summary);
      toast.success("Samenvatting gegenereerd!");
      
      if (onRegenerate) {
        onRegenerate();
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Fout bij genereren van samenvatting");
    } finally {
      setIsGenerating(false);
    }
  };

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
        {/* Main Topics */}
        {content.hoofdonderwerpen && content.hoofdonderwerpen.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Hoofdonderwerpen</h3>
            <ul className="space-y-1">
              {content.hoofdonderwerpen.map((topic, index) => (
                <li key={index} className="text-sm flex items-start">
                  <span className="text-primary mr-2">•</span>
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Decisions */}
        {content.beslissingen && content.beslissingen.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Beslissingen</h3>
            <ul className="space-y-1">
              {content.beslissingen.map((decision, index) => (
                <li key={index} className="text-sm flex items-start">
                  <span className="text-primary mr-2">•</span>
                  {decision}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Speaker Contributions */}
        {content.sprekersBijdragen && content.sprekersBijdragen.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Sprekersbijdragen</h3>
            <div className="space-y-3">
              {content.sprekersBijdragen.map((speaker, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/50">
                  <Badge variant="secondary" className="mb-2">
                    {speaker.spreker}
                  </Badge>
                  <ul className="space-y-1">
                    {speaker.bijdragen.map((contribution, cIndex) => (
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
        {content.belangrijkeQuotes && content.belangrijkeQuotes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Belangrijke quotes</h3>
            <div className="space-y-2">
              {content.belangrijkeQuotes.map((quote, index) => (
                <div
                  key={index}
                  className="p-3 rounded-lg bg-muted/50 border-l-4 border-primary"
                >
                  <p className="text-sm italic mb-1">"{quote.quote}"</p>
                  <p className="text-xs text-muted-foreground">
                    — {quote.spreker}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

