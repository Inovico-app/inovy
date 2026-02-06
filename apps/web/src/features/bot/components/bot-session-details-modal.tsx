"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { BotSession } from "@/server/db/schema/bot-sessions";
import { BotStatusBadge } from "./bot-status-badge";

interface BotSessionDetailsModalProps {
  session: BotSession & {
    recording?: {
      id: string;
      title: string;
      fileUrl: string;
      fileName: string;
      fileSize: number;
      fileMimeType: string;
      duration: number | null;
      recordingDate: Date;
    } | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BotSessionDetailsModal({
  session,
  open,
  onOpenChange,
}: BotSessionDetailsModalProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds == null) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {session.meetingTitle || "Untitled Meeting"}
            <BotStatusBadge status={session.botStatus} />
          </DialogTitle>
          <DialogDescription>
            Bot session details and timeline
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="font-semibold mb-3">Basic Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Meeting URL:</span>
                <a
                  href={session.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {session.meetingUrl}
                </a>
              </div>
              {session.calendarEventId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Calendar Event ID:
                  </span>
                  <span className="font-mono text-xs">
                    {session.calendarEventId}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recall Bot ID:</span>
                <span className="font-mono text-xs">{session.recallBotId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recall Status:</span>
                <span>{session.recallStatus}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Timeline */}
          <div>
            <h3 className="font-semibold mb-3">Timeline</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{formatDate(session.createdAt)}</span>
              </div>
              {session.joinedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Joined:</span>
                  <span>{formatDate(session.joinedAt)}</span>
                </div>
              )}
              {session.leftAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Left:</span>
                  <span>{formatDate(session.leftAt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated:</span>
                <span>{formatDate(session.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Participants */}
          {session.meetingParticipants &&
            session.meetingParticipants.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Participants</h3>
                  <div className="space-y-1">
                    {session.meetingParticipants.map((participant, index) => (
                      <div key={index} className="text-sm">
                        {participant}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

          {/* Recording Details */}
          {session.recording && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Recording</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Title:</span>
                    <span>{session.recording.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{formatDuration(session.recording.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File Size:</span>
                    <span>{formatFileSize(session.recording.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File Type:</span>
                    <span>{session.recording.fileMimeType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Recording Date:
                    </span>
                    <span>{formatDate(session.recording.recordingDate)}</span>
                  </div>
                  <div className="pt-2">
                    <Button asChild>
                      <a
                        href={`/projects/${session.projectId}/recordings/${session.recording.id}`}
                      >
                        View Recording
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Error Information */}
          {session.error && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3 text-destructive">Error</h3>
                <p className="text-sm text-destructive">{session.error}</p>
              </div>
            </>
          )}

          {/* Retry Information */}
          {session.retryCount > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Retry History</h3>
                <div className="text-sm">
                  <p>Retry attempts: {session.retryCount}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

