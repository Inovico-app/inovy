"use client";

import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import type { ConsentStatus } from "@/server/db/schema/consent";

interface ConsentStatusProps {
  status: ConsentStatus;
  count?: number;
  className?: string;
}

export function ConsentStatus({
  status,
  count,
  className,
}: ConsentStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "granted":
        return {
          icon: CheckCircle2,
          label: "Consent Granted",
          variant: "default" as const,
          className: "bg-green-500/10 text-green-700 dark:text-green-400",
        };
      case "pending":
        return {
          icon: Clock,
          label: "Consent Pending",
          variant: "outline" as const,
          className: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        };
      case "revoked":
        return {
          icon: XCircle,
          label: "Consent Revoked",
          variant: "destructive" as const,
          className: "bg-red-500/10 text-red-700 dark:text-red-400",
        };
      case "expired":
        return {
          icon: AlertCircle,
          label: "Consent Expired",
          variant: "outline" as const,
          className: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`gap-1 ${config.className} ${className ?? ""}`}>
      <Icon className="h-3 w-3" />
      {config.label}
      {count !== undefined && count > 0 && (
        <span className="ml-1">({count})</span>
      )}
    </Badge>
  );
}

