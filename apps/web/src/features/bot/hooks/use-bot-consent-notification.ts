"use client";

import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { approveBotJoin } from "../actions/approve-bot-join";
import { denyBotJoin } from "../actions/deny-bot-join";

interface UseBotConsentNotificationParams {
  sessionId: string | undefined;
  meetingTitle: string;
  onActionComplete?: () => void;
}

export function useBotConsentNotification({
  sessionId,
  meetingTitle,
  onActionComplete,
}: UseBotConsentNotificationParams) {
  const { execute: executeApprove, isExecuting: isApproving } = useAction(
    approveBotJoin,
    {
      onSuccess: ({ data }) => {
        if (data) {
          toast.success("Bot session approved", {
            description: `Bot will join "${meetingTitle}" as scheduled.`,
          });
          onActionComplete?.();
        }
      },
      onError: ({ error }) => {
        toast.error("Failed to approve bot session", {
          description: error.serverError || "Please try again",
        });
      },
    }
  );

  const { execute: executeDeny, isExecuting: isDenying } = useAction(
    denyBotJoin,
    {
      onSuccess: ({ data }) => {
        if (data) {
          toast.success("Bot session denied", {
            description: `Bot will not join "${meetingTitle}".`,
          });
          onActionComplete?.();
        }
      },
      onError: ({ error }) => {
        toast.error("Failed to deny bot session", {
          description: error.serverError || "Please try again",
        });
      },
    }
  );

  const handleApprove = () => {
    if (!sessionId) {
      toast.error("Invalid notification data");
      return;
    }

    executeApprove({ sessionId });
  };

  const handleDeny = () => {
    if (!sessionId) {
      toast.error("Invalid notification data");
      return;
    }

    executeDeny({ sessionId });
  };

  return {
    actionInProgress: isApproving ? "approve" : isDenying ? "deny" : null,
    handleApprove,
    handleDeny,
  };
}

