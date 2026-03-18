"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, ListChecks, StickyNote, Zap } from "lucide-react";
import { AgendaBuilder } from "./agenda-builder";
import { MeetingHeader } from "./meeting-header";
import { useMeetingActions } from "../hooks/use-meeting-actions";
import type { Meeting } from "@/server/db/schema/meetings";
import type { MeetingAgendaItem } from "@/server/db/schema/meeting-agenda-items";
import type { MeetingNote } from "@/server/db/schema/meeting-notes";
import type { MeetingAgendaTemplate } from "@/server/db/schema/meeting-agenda-templates";

interface MeetingPrepContentProps {
  meeting: Meeting;
  agendaItems: MeetingAgendaItem[];
  preNotes: MeetingNote | null;
  templates: MeetingAgendaTemplate[];
}

function SectionHeader({
  step,
  icon: Icon,
  title,
  description,
}: {
  step: number;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-semibold">
        {step}
      </div>
      <div className="space-y-0.5 pt-0.5">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function MeetingPrepContent({
  meeting,
  agendaItems,
  preNotes,
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
    <div className="space-y-8">
      <MeetingHeader meeting={meeting} />

      {/* Section 1: Agenda */}
      <section>
        <SectionHeader
          step={1}
          icon={ListChecks}
          title="Agenda"
          description="Define the topics you want to cover in this meeting."
        />
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-6">
            <AgendaBuilder
              meetingId={meeting.id}
              items={agendaItems}
              templates={templates}
            />
          </CardContent>
        </Card>
      </section>

      {/* Section 2: Notes */}
      <section>
        <SectionHeader
          step={2}
          icon={StickyNote}
          title="Pre-Meeting Notes"
          description="Jot down questions, talking points, or context before the meeting."
        />
        <Card className="border-border/60 shadow-sm">
          <CardContent className="pt-6">
            <Textarea
              placeholder="What do you want to discuss? Any questions or context to share..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="mb-3 resize-none"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveNotes}
              disabled={isSavingNotes || notes === (preNotes?.content ?? "")}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSavingNotes ? "Saving..." : "Save Notes"}
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Section 3: Post-Meeting Actions (Coming Soon) */}
      <section className="opacity-60">
        <SectionHeader
          step={3}
          icon={Zap}
          title="Post-Meeting Actions"
          description="Configure what happens automatically after the meeting ends."
        />
        <Card className="border-border/60 shadow-sm border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted mb-3">
              <Zap className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Coming soon</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Automated post-meeting actions like email summaries, task
              extraction, and follow-up scheduling are on the way.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
