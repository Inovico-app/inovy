"use client";

import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  LoaderIcon,
} from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import type { RecordingStatus } from "../../../server/db/schema/recordings";

interface StatusBadgeProps {
  status: RecordingStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusConfig: Record<
    RecordingStatus,
    {
      label: string;
      variant: "default" | "secondary" | "destructive" | "outline";
      icon: React.ReactNode;
      className?: string;
    }
  > = {
    pending: {
      label: "Pending",
      variant: "outline",
      icon: <ClockIcon className="h-3 w-3" />,
      className: "text-muted-foreground border-muted-foreground/30",
    },
    processing: {
      label: "Processing",
      variant: "default",
      icon: <LoaderIcon className="h-3 w-3 animate-spin" />,
      className: "bg-blue-500 text-white border-blue-500",
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

