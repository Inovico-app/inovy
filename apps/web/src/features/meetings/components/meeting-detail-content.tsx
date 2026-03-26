"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, CheckCircle2, Circle, SkipForward } from "lucide-react";
import { useTranslations } from "next-intl";
import { MeetingHeader } from "./meeting-header";
import {
  postActionStatusColors,
  formatStatusLabel,
} from "../lib/meeting-constants";
import type { Meeting } from "@/server/db/schema/meetings";
import type { MeetingParticipant } from "@/server/db/schema/meetings";
import type { MeetingAgendaItem } from "@/server/db/schema/meeting-agenda-items";
import type { MeetingNote } from "@/server/db/schema/meeting-notes";
import type { MeetingPostAction } from "@/server/db/schema/meeting-post-actions";

interface MeetingDetailContentProps {
  meeting: Meeting;
  agendaItems: MeetingAgendaItem[];
  notes: MeetingNote[];
  postActions: MeetingPostAction[];
}

const agendaStatusIcons: Record<string, React.ElementType> = {
  covered: CheckCircle2,
  skipped: SkipForward,
  pending: Circle,
  in_progress: Circle,
};

export function MeetingDetailContent({
  meeting,
  agendaItems,
  notes,
  postActions,
}: MeetingDetailContentProps) {
  const t = useTranslations("meetings");
  const participants = (meeting.participants as MeetingParticipant[]) ?? [];
  const coveredCount = agendaItems.filter((i) => i.status === "covered").length;
  const postNotes = notes.find((n) => n.type === "post_meeting");
  const preNotes = notes.find((n) => n.type === "pre_meeting");

  return (
    <div className="space-y-6">
      <MeetingHeader meeting={meeting} showActualTime />

      {/* Agenda Coverage */}
      {agendaItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{t("detailContent.agendaCoverage")}</span>
              <span className="text-sm font-normal text-muted-foreground">
                {t("detailContent.coveredCount", {
                  covered: coveredCount,
                  total: agendaItems.length,
                })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agendaItems.map((item) => {
              const Icon = agendaStatusIcons[item.status] ?? Circle;
              const isCovered = item.status === "covered";

              return (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-start gap-2">
                    <Icon
                      className={`h-5 w-5 mt-0.5 ${
                        isCovered
                          ? "text-green-600 dark:text-green-400"
                          : item.status === "skipped"
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-muted-foreground"
                      }`}
                    />
                    <div className="flex-1">
                      <span className="font-medium text-sm">{item.title}</span>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                      {isCovered && item.aiSummary && (
                        <p className="text-sm text-green-600 dark:text-green-400 mt-1 italic">
                          {item.aiSummary}
                        </p>
                      )}
                      {isCovered &&
                        item.aiKeyPoints &&
                        item.aiKeyPoints.length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {item.aiKeyPoints.map((point, i) => (
                              <li
                                key={`keypoint-${i}-${point.slice(0, 20)}`}
                                className="text-xs text-muted-foreground pl-2 border-l-2 border-green-300 dark:border-green-700"
                              >
                                {point}
                              </li>
                            ))}
                          </ul>
                        )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {(preNotes || postNotes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("detailContent.notes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {preNotes && (
              <Collapsible>
                <CollapsibleTrigger
                  render={
                    <Button
                      variant="ghost"
                      className="w-full justify-between font-medium text-sm"
                    />
                  }
                >
                  {t("detailContent.preMeetingNotes")}
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap p-3">
                    {preNotes.content}
                  </p>
                </CollapsibleContent>
              </Collapsible>
            )}
            {postNotes && (
              <div>
                <h4 className="font-medium text-sm mb-2">
                  {t("detailContent.postMeetingNotes")}
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {postNotes.content}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Post-Action Results */}
      {postActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t("detailContent.postMeetingActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {postActions.map((action) => (
              <div
                key={action.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <span className="text-sm font-medium">
                  {formatStatusLabel(action.type)}
                </span>
                <Badge
                  variant="secondary"
                  className={postActionStatusColors[action.status]}
                >
                  {action.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Participants */}
      {participants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("participants")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {participants.map((p) => (
                <Badge key={p.email} variant="outline">
                  {p.name || p.email}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
