"use client";

import { formatFileSizePrecise } from "@/lib/formatters/file-size-formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DataExport } from "@/server/db/schema/data-exports";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { Calendar, Download, Loader2 } from "lucide-react";

function getStatusBadge(status: DataExport["status"]) {
  switch (status) {
    case "pending":
      return (
        <Badge
          variant="outline"
          className="bg-yellow-50 text-yellow-700 border-yellow-200"
        >
          Pending
        </Badge>
      );
    case "processing":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200"
        >
          Processing
        </Badge>
      );
    case "completed":
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 border-green-200"
        >
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200"
        >
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function isExpired(expiresAt: Date | string): boolean {
  const expires = new Date(expiresAt);
  return expires < new Date();
}

interface DataExportHistoryProps {
  exports: DataExport[];
  isLoadingHistory: boolean;
  onDownload: (export_: DataExport) => void;
}

export function DataExportHistory({
  exports,
  isLoadingHistory,
  onDownload,
}: DataExportHistoryProps) {
  const t = useTranslations("settings.profile");
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">{t("exportHistory")}</h3>

      {isLoadingHistory ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : exports.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">
          {t("noExportsYet")}
        </p>
      ) : (
        <div className="space-y-3">
          {exports.map((export_) => (
            <div
              key={export_.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {getStatusBadge(export_.status)}
                  {isExpired(export_.expiresAt) && (
                    <Badge
                      variant="outline"
                      className="bg-gray-50 text-gray-600 border-gray-200"
                    >
                      Expired
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(
                        new Date(export_.createdAt),
                        "MMM d, yyyy 'at' h:mm a",
                      )}
                    </span>
                    {export_.fileSize && (
                      <span>{formatFileSizePrecise(export_.fileSize)}</span>
                    )}
                  </div>
                  <div className="text-xs">
                    {export_.recordingsCount} recordings, {export_.tasksCount}{" "}
                    tasks, {export_.conversationsCount} conversations
                  </div>
                  {export_.errorMessage && (
                    <p className="text-xs text-red-600">
                      {export_.errorMessage}
                    </p>
                  )}
                </div>
              </div>
              <div className="ml-4">
                {export_.status === "completed" &&
                !isExpired(export_.expiresAt) ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDownload(export_)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                ) : export_.status === "processing" ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
