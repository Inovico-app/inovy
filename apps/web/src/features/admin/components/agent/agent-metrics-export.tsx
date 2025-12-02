"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useState } from "react";
import { exportAgentMetrics } from "../../actions/export-agent-metrics";

interface AgentMetricsExportProps {
  filters: {
    startDate: Date;
    endDate: Date;
    organizationId?: string;
    userId?: string;
  };
}

export function AgentMetricsExport({
  filters,
}: AgentMetricsExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportAgentMetrics({
        startDate: filters.startDate.toISOString(),
        endDate: filters.endDate.toISOString(),
        organizationId: filters.organizationId,
        userId: filters.userId,
      });

      if (result?.serverError) {
        console.error("Export error:", result.serverError);
        alert("Failed to export metrics. Please try again.");
        return;
      }

      if (result?.data) {
        // Create blob and download
        const blob = new Blob([result.data.csv], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to export metrics", error);
      alert("Failed to export metrics. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isExporting} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      {isExporting ? "Exporting..." : "Export CSV"}
    </Button>
  );
}

