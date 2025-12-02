"use client";

interface UploadSummaryProps {
  successCount: number;
  hasErrors: boolean;
}

export function UploadSummary({ successCount, hasErrors }: UploadSummaryProps) {
  if (successCount === 0) {
    return null;
  }

  return (
    <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3">
      <p className="text-sm text-green-700 dark:text-green-400">
        {successCount} document{successCount > 1 ? "s" : ""} uploaded
        successfully
        {hasErrors && " (some uploads failed)"}
      </p>
    </div>
  );
}

