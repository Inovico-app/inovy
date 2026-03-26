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
import { BotStatusBadge } from "@/features/bot/components/bot-status-badge";
import { isValidMeetingUrl } from "@/lib/meeting-url";
import { useUserProjects } from "@/features/projects/hooks/use-user-projects";
import { ClipboardList, Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAddBotToMeeting } from "../hooks/use-add-bot-to-meeting";
import { useRemoveBotFromMeeting } from "../hooks/use-remove-bot-from-meeting";
import { useUpdateBotSessionMeetingUrl } from "../hooks/use-update-bot-session-meeting-url";
import { useUpdateBotSessionProject } from "../hooks/use-update-bot-session-project";
import { useUpdateMeetingDetails } from "../hooks/use-update-meeting-details";
import { useNavigateToMeeting } from "../hooks/use-navigate-to-meeting";
import type { MeetingWithSession } from "../lib/calendar-utils";
import { AddBotProjectDialog } from "./add-bot-project-dialog";
import { AddBotSection } from "./add-bot-section";
import { BotDetailsSection } from "./bot-details-section";
import {
  MeetingDetailsFormSection,
  type MeetingDetailsFormData,
} from "./meeting-details-form-section";
import { RemoveBotConfirmDialog } from "./remove-bot-confirm-dialog";

const EDITABLE_BOT_STATUSES = ["scheduled", "failed"] as const;
const TERMINAL_BOT_STATUSES = ["failed", "removed"] as const;

interface MeetingDetailsModalProps {
  meeting: MeetingWithSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MeetingDetailsModal({
  meeting,
  open,
  onOpenChange,
  onSuccess,
}: MeetingDetailsModalProps) {
  const t = useTranslations("meetings");
  const [botMeetingUrl, setBotMeetingUrl] = useState("");
  const [isConsentDialogOpen, setIsConsentDialogOpen] = useState(false);
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false);
  const [pendingRemoveSessionId, setPendingRemoveSessionId] = useState<
    string | null
  >(null);

  const { updateMeetingDetails, isUpdating } = useUpdateMeetingDetails({
    onSuccess,
  });
  const { updateMeetingUrl, isUpdating: isUpdatingUrl } =
    useUpdateBotSessionMeetingUrl({
      onSuccess,
    });
  const { updateProject, isUpdating: isUpdatingProject } =
    useUpdateBotSessionProject({
      onSuccess,
    });
  const { execute: removeBot, isExecuting: isRemovingBot } =
    useRemoveBotFromMeeting({
      onSuccess: () => {
        setIsRemoveDialogOpen(false);
        setPendingRemoveSessionId(null);
        onOpenChange(false);
        onSuccess?.();
      },
    });
  const { execute: addBot, isExecuting: isAddingBot } = useAddBotToMeeting({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const { navigateToMeeting, isNavigating } = useNavigateToMeeting({
    onBeforeNavigate: () => onOpenChange(false),
  });

  const {
    projects,
    isLoadingProjects,
    defaultProjectId,
    hasOnlyOneProject,
    setLastUsedProjectId,
  } = useUserProjects({
    enabled: open,
  });

  const botSession = meeting?.botSession;

  useEffect(() => {
    if (botSession?.meetingUrl) {
      setBotMeetingUrl(botSession.meetingUrl);
    } else {
      setBotMeetingUrl("");
    }
  }, [botSession?.meetingUrl, open]);

  const canEditBot =
    botSession &&
    EDITABLE_BOT_STATUSES.includes(
      botSession.botStatus as (typeof EDITABLE_BOT_STATUSES)[number],
    );
  const isUpcoming = meeting ? meeting.start > new Date() : false;
  const hasMeetingUrl =
    !!meeting?.meetingUrl?.trim() && isValidMeetingUrl(meeting.meetingUrl);

  const handleMeetingDetailsSubmit = (data: MeetingDetailsFormData) => {
    if (!meeting) return;

    const start = new Date(`${data.startDate}T${data.startTime}:00`);
    const end = new Date(`${data.endDate}T${data.endTime}:00`);

    updateMeetingDetails({
      calendarEventId: meeting.id,
      title: data.title,
      start,
      end,
    });
  };

  const handleBotMeetingUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!botSession || !botMeetingUrl.trim()) return;

    const trimmed = botMeetingUrl.trim();
    try {
      const url = new URL(
        trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
      );
      if (!isValidMeetingUrl(url.href)) {
        toast.error(t("details.meetingUrlInvalid"));
        return;
      }
    } catch {
      toast.error(t("details.meetingUrlInvalidGeneric"));
      return;
    }

    updateMeetingUrl({
      sessionId: botSession.id,
      meetingUrl: trimmed.startsWith("http") ? trimmed : `https://${trimmed}`,
    });
  };

  const handleAddBot = () => {
    if (!meeting) return;

    // Fast path: skip dialog when there's only one project
    if (hasOnlyOneProject && defaultProjectId) {
      setLastUsedProjectId(defaultProjectId);
      addBot({
        calendarEventId: meeting.id,
        meetingUrl: meeting.meetingUrl ?? "",
        meetingTitle: meeting.title,
        projectId: defaultProjectId,
      });
      return;
    }

    setIsConsentDialogOpen(true);
  };

  const handleProjectSelected = (projectId: string) => {
    if (!meeting) return;
    setLastUsedProjectId(projectId);
    addBot({
      calendarEventId: meeting.id,
      meetingUrl: meeting.meetingUrl ?? "",
      meetingTitle: meeting.title,
      projectId,
    });
    setIsConsentDialogOpen(false);
  };

  const handleProjectChange = (sessionId: string, projectId: string) => {
    updateProject({ sessionId, projectId });
  };

  const handleRemoveBot = (sessionId: string) => {
    setPendingRemoveSessionId(sessionId);
    setIsRemoveDialogOpen(true);
  };

  const handleConfirmRemove = () => {
    if (!pendingRemoveSessionId) return;
    removeBot({ sessionId: pendingRemoveSessionId });
  };

  if (!meeting) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("details.meetingDetails")}</DialogTitle>
            <DialogDescription>
              {t("details.noMeetingSelected")}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <RemoveBotConfirmDialog
        open={isRemoveDialogOpen}
        onOpenChange={(open) => {
          setIsRemoveDialogOpen(open);
          if (!open) setPendingRemoveSessionId(null);
        }}
        onConfirm={handleConfirmRemove}
        meetingTitle={meeting.title}
        isRemoving={isRemovingBot}
      />
      <AddBotProjectDialog
        open={isConsentDialogOpen}
        onOpenChange={(open) => {
          setIsConsentDialogOpen(open);
        }}
        onAccept={handleProjectSelected}
        meetingTitle={meeting.title}
        projects={projects}
        defaultProjectId={defaultProjectId}
        isLoadingProjects={isLoadingProjects}
      />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby="meeting-details-description"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {meeting.title || t("details.untitledMeeting")}
              {botSession && (
                <BotStatusBadge
                  status={botSession.botStatus}
                  error={botSession.error}
                />
              )}
            </DialogTitle>
            <DialogDescription id="meeting-details-description">
              {t("details.viewAndEdit")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Meeting Prep Navigation */}
            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                navigateToMeeting({
                  calendarEventId: meeting.id,
                  title: meeting.title || t("details.untitledMeeting"),
                  scheduledStartAt: new Date(meeting.start).toISOString(),
                  scheduledEndAt: new Date(meeting.end).toISOString(),
                  meetingUrl: meeting.meetingUrl || undefined,
                  participants: meeting.attendees?.map((a) => ({
                    email: a.email,
                    name: null,
                    role: null,
                  })),
                })
              }
              disabled={isNavigating}
            >
              {isNavigating ? (
                <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ClipboardList className="h-4 w-4 mr-2" />
              )}
              {isNavigating
                ? t("details.opening")
                : t("details.prepareMeeting")}
            </Button>

            <Separator />

            {/* Section 1: Meeting Details */}
            <MeetingDetailsFormSection
              meeting={meeting}
              onSubmit={handleMeetingDetailsSubmit}
              isUpdating={isUpdating}
            />

            {/* Section 2: Bot Details (if bot exists and is not in a terminal state for upcoming meetings) */}
            {botSession &&
              !(
                isUpcoming &&
                TERMINAL_BOT_STATUSES.includes(
                  botSession.botStatus as (typeof TERMINAL_BOT_STATUSES)[number],
                )
              ) && (
                <>
                  <Separator />
                  <BotDetailsSection
                    botSession={botSession}
                    canEditBot={!!canEditBot}
                    botMeetingUrl={botMeetingUrl}
                    onBotMeetingUrlChange={setBotMeetingUrl}
                    onBotMeetingUrlSubmit={handleBotMeetingUrlSubmit}
                    isUpdatingUrl={isUpdatingUrl}
                    projects={projects}
                    isLoadingProjects={isLoadingProjects}
                    onProjectChange={handleProjectChange}
                    isUpdatingProject={isUpdatingProject}
                    onRemoveBot={handleRemoveBot}
                    isRemovingBot={isRemovingBot}
                  />
                </>
              )}

            {/* Section 3: Add Bot (if no bot, or bot was removed/failed on upcoming meeting) */}
            {((!botSession && isUpcoming && hasMeetingUrl) ||
              (botSession &&
                isUpcoming &&
                hasMeetingUrl &&
                TERMINAL_BOT_STATUSES.includes(
                  botSession.botStatus as (typeof TERMINAL_BOT_STATUSES)[number],
                ))) && (
              <>
                <Separator />
                <AddBotSection
                  onAddBot={handleAddBot}
                  isAddingBot={isAddingBot}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
