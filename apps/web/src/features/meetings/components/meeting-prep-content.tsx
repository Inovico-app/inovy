"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";
import { AgendaBuilder } from "./agenda-builder";
import { MeetingHeader } from "./meeting-header";
import { PostActionConfig } from "./post-action-config";
import { useMeetingActions } from "../hooks/use-meeting-actions";
import type { Meeting } from "@/server/db/schema/meetings";
import type { MeetingAgendaItem } from "@/server/db/schema/meeting-agenda-items";
import type { MeetingNote } from "@/server/db/schema/meeting-notes";
import type { MeetingPostAction } from "@/server/db/schema/meeting-post-actions";
import type { MeetingAgendaTemplate } from "@/server/db/schema/meeting-agenda-templates";

interface MeetingPrepContentProps {
  meeting: Meeting;
  agendaItems: MeetingAgendaItem[];
  preNotes: MeetingNote | null;
  postActions: MeetingPostAction[];
  templates: MeetingAgendaTemplate[];
}

export function MeetingPrepContent({
  meeting,
  agendaItems,
  preNotes,
  postActions,
  templates,
}: MeetingPrepContentProps) {
  const [notes, setNotes] = useState(preNotes?.content ?? "");
  const { saveNotes, isSavingNotes } = useMeetingActions();

  const handleSaveNotes = () => {
    saveNotes({
      meetingId: meeting.id,
      content: notes,
      type: "pre_meeting",
    });
  };

  return (
    <div className="space-y-6">
      <MeetingHeader meeting={meeting} />

      {/* Agenda Builder */}
      <Card>
        <CardContent className="pt-6">
          <AgendaBuilder
            meetingId={meeting.id}
            items={agendaItems}
            templates={templates}
          />
        </CardContent>
      </Card>

      {/* Pre-Meeting Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pre-Meeting Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add your preparation notes, questions, or talking points..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            className="mb-3"
          />
          <Button
            size="sm"
            onClick={handleSaveNotes}
            disabled={isSavingNotes || notes === (preNotes?.content ?? "")}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSavingNotes ? "Saving..." : "Save Notes"}
          </Button>
        </CardContent>
      </Card>

      {/* Post-Meeting Actions Config */}
      <Card>
        <CardContent className="pt-6">
          <PostActionConfig
            meetingId={meeting.id}
            postActions={postActions}
          />
        </CardContent>
      </Card>
    </div>
  );
}
