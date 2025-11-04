"use client";

import { cn } from "@/lib/utils";

interface ConfidenceIndicatorProps {
  score: number; // 0-1 range
  showPercentage?: boolean;
  showBar?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ConfidenceIndicator({
  score,
  showPercentage = true,
  showBar = true,
  size = "sm",
  className,
}: ConfidenceIndicatorProps) {
  const percentage = Math.round(score * 100);

  // Determine color based on confidence level
  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "text-green-600 dark:text-green-500";
    if (score >= 0.6) return "text-yellow-600 dark:text-yellow-500";
    return "text-red-600 dark:text-red-500";
  };

  const getProgressColor = (score: number) => {
    if (score >= 0.8) return "bg-green-600 dark:bg-green-500";
    if (score >= 0.6) return "bg-yellow-600 dark:bg-yellow-500";
    return "bg-red-600 dark:bg-red-500";
  };

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showPercentage && (
        <span
          className={cn(
            "font-medium tabular-nums",
            getConfidenceColor(score),
            sizeClasses[size]
          )}
        >
          {percentage}%
        </span>
      )}
      {showBar && (
        <div className="flex-1 min-w-[60px] max-w-[100px]">
          <div className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-secondary", size === "lg" && "h-2")}>
            <div
              className={cn("h-full transition-all", getProgressColor(score))}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface ConfidenceBadgeProps {
  score: number;
  className?: string;
}

export function ConfidenceBadge({ score, className }: ConfidenceBadgeProps) {
  const percentage = Math.round(score * 100);

  const getVariant = (score: number) => {
    if (score >= 0.8) return "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800";
    if (score >= 0.6) return "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800";
    return "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border",
        getVariant(score),
        className
      )}
    >
      {percentage}% match
    </span>
  );
}

