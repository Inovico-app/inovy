"use client";

import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  LoaderIcon,
  LogOutIcon,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import type { BotStatus } from "../../../server/db/schema/bot-sessions";

interface BotStatusBadgeProps {
  status: BotStatus;
  className?: string;
}

export function BotStatusBadge({ status, className }: BotStatusBadgeProps) {
  const statusConfig: Record<
    BotStatus,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
      icon: React.ReactNode;
      className?: string;
    }
  > = {
    scheduled: {
      label: "Scheduled",
      variant: "outline",
      icon: <ClockIcon className="h-3 w-3" />,
      className:
        "text-yellow-700 border-yellow-500/30 dark:text-yellow-400 bg-yellow-500/10",
    },
    joining: {
      label: "Joining",
      variant: "default",
      icon: <LoaderIcon className="h-3 w-3 animate-spin" />,
      className: "bg-blue-500 text-white border-blue-500",
    },
    active: {
      label: "Active",
      variant: "secondary",
      icon: <CheckCircleIcon className="h-3 w-3" />,
      className:
        "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400",
    },
    leaving: {
      label: "Leaving",
      variant: "outline",
      icon: <LogOutIcon className="h-3 w-3" />,
      className:
        "text-gray-700 border-gray-500/30 dark:text-gray-400 bg-gray-500/10",
    },
    completed: {
      label: "Completed",
      variant: "secondary",
      icon: <CheckCircleIcon className="h-3 w-3" />,
      className:
        "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400",
    },
    failed: {
      label: "Failed",
      variant: "destructive",
      icon: <AlertCircleIcon className="h-3 w-3" />,
    },
    pending_consent: {
      label: "Pending Consent",
      variant: "outline",
      icon: <AlertCircleIcon className="h-3 w-3" />,
      className:
        "text-amber-700 border-amber-500/30 dark:text-amber-400 bg-amber-500/10",
    },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={`${config.className ?? ""} ${className ?? ""}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );
}

