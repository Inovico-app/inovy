"use client";

import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  LoaderIcon,
  LogOutIcon,
  MinusIcon,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import type { BotStatus } from "../../../server/db/schema/bot-sessions";

export type MeetingBotStatus = BotStatus | "no_bot";

const STATUS_CONFIG = {
  scheduled: {
    label: "Scheduled",
    variant: "outline" as const,
    icon: <ClockIcon className="h-3 w-3" />,
    className:
      "text-gray-700 border-gray-500/30 dark:text-gray-400 bg-gray-500/10",
    tooltip: "Bot will join when the meeting starts",
  },
  joining: {
    label: "Joining",
    variant: "default" as const,
    icon: <LoaderIcon className="h-3 w-3 animate-spin" />,
    className: "bg-blue-500 text-white border-blue-500",
    tooltip: "Bot is connecting to the meeting",
  },
  active: {
    label: "Active",
    variant: "secondary" as const,
    icon: <CheckCircleIcon className="h-3 w-3" />,
    className:
      "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400",
    tooltip: "Bot is recording the meeting",
  },
  leaving: {
    label: "Leaving",
    variant: "outline" as const,
    icon: <LogOutIcon className="h-3 w-3" />,
    className:
      "text-gray-700 border-gray-500/30 dark:text-gray-400 bg-gray-500/10",
    tooltip: "Bot is leaving the meeting",
  },
  completed: {
    label: "Completed",
    variant: "outline" as const,
    icon: <CheckCircleIcon className="h-3 w-3" />,
    className:
      "text-gray-700 border-gray-500/30 dark:text-gray-400 bg-gray-500/10",
    tooltip: "Meeting finished, recording is processing",
  },
  failed: {
    label: "Failed",
    variant: "destructive" as const,
    icon: <AlertCircleIcon className="h-3 w-3" />,
    className: undefined,
    tooltip: "Bot failed to join",
  },
  pending_consent: {
    label: "Pending Consent",
    variant: "outline" as const,
    icon: <AlertCircleIcon className="h-3 w-3" />,
    className:
      "text-amber-700 border-amber-500/30 dark:text-amber-400 bg-amber-500/10",
    tooltip: "Waiting for host approval to join",
  },
  no_bot: {
    label: "No Bot",
    variant: "outline" as const,
    icon: <MinusIcon className="h-3 w-3" />,
    className:
      "text-gray-600 border-gray-400/30 dark:text-gray-500 bg-gray-500/10",
    tooltip: "No bot session for this meeting",
  },
} satisfies Record<
  MeetingBotStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ReactNode;
    className?: string;
    tooltip: string;
  }
>;

interface BotStatusBadgeProps {
  status: MeetingBotStatus;
  className?: string;
  /** Optional error message for failed status - shown in tooltip */
  error?: string | null;
  /** Tab index for keyboard focus. Default 0 for standalone. Use -1 when inside a button to avoid focusable descendant. */
  tabIndex?: number;
}

export function BotStatusBadge({
  status,
  className,
  error,
  tabIndex = 0,
}: BotStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const tooltipContent =
    status === "failed" && error ? `${config.tooltip}: ${error}` : config.tooltip;

  const badge = (
    <Badge
      variant={config.variant}
      className={`${config.className ?? ""} ${className ?? ""}`}
      tabIndex={tabIndex}
      role="status"
    >
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent sideOffset={4}>{tooltipContent}</TooltipContent>
    </Tooltip>
  );
}
