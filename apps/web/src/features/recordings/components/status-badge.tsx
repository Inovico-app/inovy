"use client";

import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  LoaderIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import type { TranscriptionStatus } from "../../../server/db/schema/recordings";
import { useTranslations } from "next-intl";

interface StatusBadgeProps {
  status: TranscriptionStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const t = useTranslations("recordings");
  const statusConfig: Record<
    TranscriptionStatus,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
      icon: React.ReactNode;
      className?: string;
    }
  > = {
    pending: {
      label: t("status.pending"),
      variant: "outline",
      icon: <ClockIcon className="h-3 w-3" />,
      className: "text-muted-foreground border-muted-foreground/30",
    },
    processing: {
      label: t("status.processing"),
      variant: "default",
      icon: <LoaderIcon className="h-3 w-3 animate-spin" />,
      className: "bg-blue-500 text-white border-blue-500",
    },
    completed: {
      label: t("status.completed"),
      variant: "secondary",
      icon: <CheckCircleIcon className="h-3 w-3" />,
      className:
        "bg-green-500/10 text-green-700 border-green-500/30 dark:text-green-400",
    },
    failed: {
      label: t("status.failed"),
      variant: "destructive",
      icon: <AlertCircleIcon className="h-3 w-3" />,
    },
    queued_for_retry: {
      label: t("status.queuedForRetry"),
      variant: "outline",
      icon: <RefreshCwIcon className="h-3 w-3" />,
      className:
        "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
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
