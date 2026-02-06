"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BotSession } from "@/server/db/schema/bot-sessions";
import {
  AlertCircleIcon,
  ExternalLinkIcon,
  EyeIcon,
  MoreVerticalIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cancelBotSession } from "../actions/cancel-bot-session";
import { retryBotSession } from "../actions/retry-bot-session";
import { BotSessionDetailsModal } from "./bot-session-details-modal";
import { BotStatusBadge } from "./bot-status-badge";

interface BotSessionCardProps {
  session: BotSession;
  onActionComplete?: () => void;
}

export function BotSessionCard({
  session,
  onActionComplete,
}: BotSessionCardProps) {
  const router = useRouter();
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { execute: executeCancel, isExecuting: isCanceling } = useAction(
    cancelBotSession,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          toast.success("Bot session canceled successfully");
          onActionComplete?.();
          router.refresh();
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to cancel bot session");
      },
    }
  );

  const { execute: executeRetry, isExecuting: isRetrying } = useAction(
    retryBotSession,
    {
      onSuccess: ({ data }) => {
        if (data?.success) {
          toast.success("Bot session retry initiated");
          onActionComplete?.();
          router.refresh();
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to retry bot session");
      },
    }
  );

  const canCancel =
    session.botStatus === "scheduled" ||
    session.botStatus === "joining" ||
    session.botStatus === "pending_consent";
  const canRetry = session.botStatus === "failed" && session.retryCount < 3;
  const hasRecording = session.recordingId !== null;

  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const meetingTime = session.joinedAt
    ? formatDate(session.joinedAt)
    : formatDate(session.createdAt);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="truncate">
                {session.meetingTitle || "Untitled Meeting"}
              </span>
            </CardTitle>
            <CardDescription className="mt-1 space-y-1">
              {meetingTime && <div>Meeting time: {meetingTime}</div>}
              {session.meetingUrl && (
                <div className="flex items-center gap-1">
                  <a
                    href={session.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    Meeting URL
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <BotStatusBadge status={session.botStatus} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0">
                  <MoreVerticalIcon className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowDetailsModal(true)}>
                  <EyeIcon className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {hasRecording && (
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/projects/${session.projectId}/recordings/${session.recordingId}`}
                    >
                      View Recording
                    </Link>
                  </DropdownMenuItem>
                )}
                {(canCancel || canRetry) && <DropdownMenuSeparator />}
                {canCancel && (
                  <DropdownMenuItem
                    onClick={() => executeCancel({ sessionId: session.id })}
                    disabled={isCanceling}
                    className="text-destructive focus:text-destructive"
                  >
                    {isCanceling ? (
                      <>
                        <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                        Canceling...
                      </>
                    ) : (
                      <>
                        <XIcon className="h-4 w-4 mr-2" />
                        Cancel Session
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {canRetry && (
                  <DropdownMenuItem
                    onClick={() => executeRetry({ sessionId: session.id })}
                    disabled={isRetrying}
                  >
                    {isRetrying ? (
                      <>
                        <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RefreshCwIcon className="h-4 w-4 mr-2" />
                        Retry Session
                      </>
                    )}
                  </DropdownMenuItem>
                )}
                {session.error && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      disabled
                      className="text-xs text-muted-foreground"
                    >
                      <AlertCircleIcon className="h-3 w-3 mr-2" />
                      {session.error}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground">
          {session.error && (
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircleIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{session.error}</span>
            </div>
          )}
          {session.retryCount > 0 && (
            <div>Retry attempts: {session.retryCount}</div>
          )}
          {session.meetingParticipants &&
            session.meetingParticipants.length > 0 && (
              <div>Participants: {session.meetingParticipants.join(", ")}</div>
            )}
        </div>
      </CardContent>
      <BotSessionDetailsModal
        session={session}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
      />
    </Card>
  );
}

