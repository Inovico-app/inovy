"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CheckCircle2Icon, ChevronDown } from "lucide-react";
import { useState } from "react";
import type { SummaryResult } from "@/server/cache/summary.cache";
import { UserNotesEditor } from "./user-notes-editor";
import { SummaryVersionHistoryDialog } from "./summary-version-history-dialog";
import { EditSummaryDialog } from "./edit-summary-dialog";

interface EnhancedSummarySectionProps {
  recordingId: string;
  summary: SummaryResult | null;
  transcriptionStatus: string;
}

export function EnhancedSummarySection({
  recordingId,
  summary,
  transcriptionStatus,
}: EnhancedSummarySectionProps) {
  const [overviewOpen, setOverviewOpen] = useState(true);
  const [topicsOpen, setTopicsOpen] = useState(true);
  const [decisionsOpen, setDecisionsOpen] = useState(true);
  const [contributionsOpen, setContributionsOpen] = useState(false);
  const [quotesOpen, setQuotesOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(true);

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI-Generated Summary</CardTitle>
        </CardHeader>
      <CardContent>
        {transcriptionStatus === "completed" ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-4">
              No summary available yet. Generate one now to get insights.
            </p>
            <p className="text-sm">Use the reprocess button above to generate a summary.</p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Summary will be generated after transcription is complete.</p>
          </div>
        )}
      </CardContent>
      </Card>
    );
  }

  return (
    <Card className="print:break-inside-avoid">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>AI-Generated Summary</CardTitle>
            {summary.isManuallyEdited && (
              <Badge variant="secondary">Edited</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <SummaryVersionHistoryDialog recordingId={recordingId} />
            <EditSummaryDialog
              recordingId={recordingId}
              summary={summary.content}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overview Section */}
        {summary.content.overview && (
          <Collapsible open={overviewOpen} onOpenChange={setOverviewOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group hover:bg-muted/50 p-2 rounded-md print:bg-transparent">
              <h3 className="font-semibold text-base">Overview</h3>
              <ChevronDown
                className={`h-4 w-4 transition-transform print:hidden ${
                  overviewOpen ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 px-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {summary.content.overview}
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Key Topics Section */}
        {summary.content.topics && summary.content.topics.length > 0 && (
          <Collapsible open={topicsOpen} onOpenChange={setTopicsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group hover:bg-muted/50 p-2 rounded-md print:bg-transparent">
              <h3 className="font-semibold text-base">
                Key Topics ({summary.content.topics.length})
              </h3>
              <ChevronDown
                className={`h-4 w-4 transition-transform print:hidden ${
                  topicsOpen ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 px-2">
              <ul className="space-y-2">
                {summary.content.topics.map((topic, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <span className="text-primary mt-1">•</span>
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Decisions Section */}
        {summary.content.decisions && summary.content.decisions.length > 0 && (
          <Collapsible open={decisionsOpen} onOpenChange={setDecisionsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full group hover:bg-muted/50 p-2 rounded-md print:bg-transparent">
              <h3 className="font-semibold text-base">
                Decisions ({summary.content.decisions.length})
              </h3>
              <ChevronDown
                className={`h-4 w-4 transition-transform print:hidden ${
                  decisionsOpen ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 px-2">
              <ul className="space-y-2">
                {summary.content.decisions.map((decision, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <CheckCircle2Icon className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{decision}</span>
                  </li>
                ))}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Speaker Contributions Section */}
        {summary.content.speakerContributions &&
          summary.content.speakerContributions.length > 0 && (
            <Collapsible
              open={contributionsOpen}
              onOpenChange={setContributionsOpen}
            >
              <CollapsibleTrigger className="flex items-center justify-between w-full group hover:bg-muted/50 p-2 rounded-md print:bg-transparent">
                <h3 className="font-semibold text-base">
                  Speaker Contributions (
                  {summary.content.speakerContributions.length})
                </h3>
                <ChevronDown
                  className={`h-4 w-4 transition-transform print:hidden ${
                    contributionsOpen ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 px-2">
                <div className="space-y-4">
                  {summary.content.speakerContributions.map((speaker, idx) => (
                    <div key={idx}>
                      <p className="font-medium text-sm mb-2">
                        {speaker.speaker}
                      </p>
                      <ul className="space-y-1 ml-4">
                        {speaker.contributions.map((contribution, cIdx) => (
                          <li
                            key={cIdx}
                            className="text-sm text-muted-foreground"
                          >
                            • {contribution}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

        {/* Important Quotes Section */}
        {summary.content.importantQuotes &&
          summary.content.importantQuotes.length > 0 && (
            <Collapsible open={quotesOpen} onOpenChange={setQuotesOpen}>
              <CollapsibleTrigger className="flex items-center justify-between w-full group hover:bg-muted/50 p-2 rounded-md print:bg-transparent">
                <h3 className="font-semibold text-base">
                  Important Quotes ({summary.content.importantQuotes.length})
                </h3>
                <ChevronDown
                  className={`h-4 w-4 transition-transform print:hidden ${
                    quotesOpen ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 px-2">
                <div className="space-y-3">
                  {summary.content.importantQuotes.map((quote, idx) => (
                    <div
                      key={idx}
                      className="border-l-2 border-primary pl-3 py-1"
                    >
                      <p className="text-sm italic text-muted-foreground">
                        &quot;{quote.quote}&quot;
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        — {quote.speaker}
                      </p>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

        {/* User Notes Section */}
        <Collapsible open={notesOpen} onOpenChange={setNotesOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full group hover:bg-muted/50 p-2 rounded-md print:bg-transparent">
            <h3 className="font-semibold text-base">User Notes</h3>
            <ChevronDown
              className={`h-4 w-4 transition-transform print:hidden ${
                notesOpen ? "rotate-180" : ""
              }`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 px-2">
            <UserNotesEditor
              recordingId={recordingId}
              initialNotes={summary.userNotes}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Confidence Score */}
        {summary.confidence && (
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>AI Confidence:</span>
              <Badge variant="outline">
                {(summary.confidence * 100).toFixed(0)}%
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

