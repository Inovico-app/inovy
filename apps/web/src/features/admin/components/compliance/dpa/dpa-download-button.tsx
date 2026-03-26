"use client";

import { Button } from "@/components/ui/button";
import { DownloadIcon, LoaderIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function DpaDownloadButton() {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    try {
      const response = await fetch("/api/compliance/dpa");
      if (!response.ok) {
        throw new Error(`Download mislukt: ${response.statusText}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition");
      const filename =
        disposition?.match(/filename="(.+)"/)?.[1] ??
        "verwerkersovereenkomst.pdf";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);

      toast.success("Verwerkersovereenkomst gedownload");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Download van verwerkersovereenkomst mislukt",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Button onClick={handleDownload} disabled={isDownloading}>
      {isDownloading ? (
        <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <DownloadIcon className="h-4 w-4 mr-2" />
      )}
      {isDownloading ? "Genereren..." : "Download PDF"}
    </Button>
  );
}
