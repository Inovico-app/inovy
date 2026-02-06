"use client";

import { Button } from "@/components/ui/button";
import { approveBotJoin } from "../actions/approve-bot-join";
import { denyBotJoin } from "../actions/deny-bot-join";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Notification } from "@/features/notifications/types";

interface BotConsentNotificationProps {
  notification: Notification;
  onActionComplete?: () => void;
}

/**
 * Component to display bot consent requests in notification feed
 * Shows meeting title and time with approve/deny actions
 */
export function BotConsentNotification({
  notification,
  onActionComplete,
}: BotConsentNotificationProps) {
  const [actionInProgress, setActionInProgress] = useState<"approve" | "deny" | null>(null);
  const metadata = notification.metadata as
    | {
        sessionId?: string;
        meetingTitle?: string;
        meetingTime?: string;
        action?: string;
      }
    | null
    | undefined;

  const sessionId = metadata?.sessionId;
  const meetingTitle = metadata?.meetingTitle || "meeting";
  const meetingTime = metadata?.meetingTime;

  const handleApprove = async () => {
    if (!sessionId) {
      toast.error("Invalid notification data");
      return;
    }

    setActionInProgress("approve");
    try {
      const result = await approveBotJoin({ sessionId });

      if (result?.data) {
        toast.success("Bot session approved", {
          description: `Bot will join "${meetingTitle}" as scheduled.`,
        });
        onActionComplete?.();
      } else {
        throw new Error("Failed to approve bot session");
      }
    } catch (error) {
      console.error("Failed to approve bot session:", error);
      toast.error("Failed to approve bot session", {
        description: "Please try again",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeny = async () => {
    if (!sessionId) {
      toast.error("Invalid notification data");
      return;
    }

    setActionInProgress("deny");
    try {
      const result = await denyBotJoin({ sessionId });

      if (result?.data) {
        toast.success("Bot session denied", {
          description: `Bot will not join "${meetingTitle}".`,
        });
        onActionComplete?.();
      } else {
        throw new Error("Failed to deny bot session");
      }
    } catch (error) {
      console.error("Failed to deny bot session:", error);
      toast.error("Failed to deny bot session", {
        description: "Please try again",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  // If action already taken, show confirmation message
  if (metadata?.action === "approved" || metadata?.action === "denied") {
    return (
      <div className="p-3">
        <p className="text-sm font-medium">{notification.title}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {notification.message}
        </p>
        {meetingTime && (
          <p className="text-xs text-muted-foreground mt-1">
            Meeting: {meetingTime}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div>
        <p className="text-sm font-medium">{notification.title}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {notification.message}
        </p>
        {meetingTime && (
          <p className="text-xs text-muted-foreground mt-1">
            Meeting time: {meetingTime}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={actionInProgress !== null}
          className="flex-1"
        >
          {actionInProgress === "approve" ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Approve"
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDeny}
          disabled={actionInProgress !== null}
          className="flex-1"
        >
          {actionInProgress === "deny" ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            "Deny"
          )}
        </Button>
      </div>
    </div>
  );
}
