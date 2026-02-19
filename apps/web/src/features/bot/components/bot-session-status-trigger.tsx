"use client";

import { useState } from "react";
import type { BotSession } from "@/server/db/schema/bot-sessions";
import { BotSessionDetailsModal } from "./bot-session-details-modal";
import { BotStatusBadge } from "./bot-status-badge";
import { useBotSessionDetails } from "../hooks/use-bot-session-details";
import type { MeetingBotStatus } from "./bot-status-badge";

interface BotSessionStatusTriggerProps {
  status: MeetingBotStatus;
  sessionId?: string | null;
  /** Pre-loaded session (e.g. from bot sessions page) - skips fetch when provided */
  session?: BotSession | null;
  /** Optional error for failed status - shown in tooltip */
  error?: string | null;
  className?: string;
  /** Controlled mode: when provided, use these instead of internal state */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Wraps BotStatusBadge with optional click-to-view session details.
 * When sessionId is provided, clicking the badge opens a modal with full session details.
 */
export function BotSessionStatusTrigger({
  status,
  sessionId,
  session: preloadedSession,
  error,
  className,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: BotSessionStatusTriggerProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const showModal = isControlled ? controlledOpen : internalOpen;
  const setShowModal = isControlled
    ? (controlledOnOpenChange ?? (() => {}))
    : setInternalOpen;

  const hasSession = status !== "no_bot";
  const canOpenDetails = hasSession && (sessionId || preloadedSession);

  const { data: fetchedSession, isLoading } = useBotSessionDetails({
    sessionId: canOpenDetails && !preloadedSession ? sessionId ?? null : null,
    enabled: showModal && !preloadedSession,
  });

  const sessionForModal = preloadedSession ?? fetchedSession ?? null;

  const badge = (
    <BotStatusBadge status={status} error={error} className={className} />
  );

  if (canOpenDetails) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="cursor-pointer rounded-md transition-opacity hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="View bot session details"
        >
          {badge}
        </button>
        <BotSessionDetailsModal
          session={sessionForModal}
          open={showModal}
          onOpenChange={setShowModal}
          isLoading={!preloadedSession && isLoading}
        />
      </>
    );
  }

  return badge;
}
