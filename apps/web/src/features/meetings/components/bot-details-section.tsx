"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BotStatusBadge } from "@/features/bot/components/bot-status-badge";
import { Loader2Icon, Trash2Icon } from "lucide-react";
import { useMemo } from "react";
import type { MeetingWithSession } from "../lib/calendar-utils";

interface BotDetailsSectionProps {
  botSession: NonNullable<MeetingWithSession["botSession"]>;
  canEditBot: boolean;
  botMeetingUrl: string;
  onBotMeetingUrlChange: (url: string) => void;
  onBotMeetingUrlSubmit: (e: React.FormEvent) => void;
  isUpdatingUrl: boolean;
  projects: Array<{ id: string; name: string }>;
  isLoadingProjects: boolean;
  onProjectChange: (sessionId: string, projectId: string) => void;
  isUpdatingProject: boolean;
  onRemoveBot: (sessionId: string) => void;
  isRemovingBot: boolean;
}

export function BotDetailsSection({
  botSession,
  canEditBot,
  botMeetingUrl,
  onBotMeetingUrlChange,
  onBotMeetingUrlSubmit,
  isUpdatingUrl,
  projects,
  isLoadingProjects,
  onProjectChange,
  isUpdatingProject,
  onRemoveBot,
  isRemovingBot,
}: BotDetailsSectionProps) {
  const projectItems = useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  return (
    <section aria-labelledby="notetaker-details-heading">
      <h3 id="notetaker-details-heading" className="font-semibold mb-3">
        Notetaker Details
      </h3>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <BotStatusBadge
            status={botSession.botStatus}
            error={botSession.error}
          />
        </div>

        {canEditBot && (
          <>
            <form onSubmit={onBotMeetingUrlSubmit} className="space-y-2">
              <Label htmlFor="bot-meeting-url">Meeting URL</Label>
              <Input
                id="bot-meeting-url"
                type="url"
                placeholder="Meeting URL (Google Meet or Teams)"
                value={botMeetingUrl}
                onChange={(e) => onBotMeetingUrlChange(e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={
                  isUpdatingUrl ||
                  !botMeetingUrl.trim() ||
                  botMeetingUrl.trim() === botSession.meetingUrl
                }
              >
                {isUpdatingUrl ? (
                  <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Update URL"
                )}
              </Button>
            </form>

            <div className="space-y-2">
              <Label htmlFor="bot-project">Project</Label>
              <Select
                value={botSession.projectId ?? ""}
                onValueChange={(projectId) =>
                  projectId && onProjectChange(botSession.id, projectId)
                }
                disabled={isUpdatingProject || isLoadingProjects}
                items={projectItems}
              >
                <SelectTrigger id="bot-project">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <Button
          variant="destructive"
          size="sm"
          onClick={() => onRemoveBot(botSession.id)}
          disabled={isRemovingBot}
        >
          {isRemovingBot ? (
            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Trash2Icon className="h-4 w-4 mr-2" />
          )}
          Remove Notetaker
        </Button>
      </div>
    </section>
  );
}
