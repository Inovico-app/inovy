"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDataExport } from "../hooks/use-data-export";
import { DataExportForm } from "./data-export-form";
import { DataExportHistory } from "./data-export-history";

export function DataExport() {
  const {
    isRequesting,
    isLoadingHistory,
    exports,
    projects,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedProjectId,
    setSelectedProjectId,
    handleRequestExport,
    handleDownload,
  } = useDataExport();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Export</CardTitle>
        <CardDescription>
          Export all your personal data in compliance with GDPR. Your export
          will be available for 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <DataExportForm
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          selectedProjectId={selectedProjectId}
          setSelectedProjectId={setSelectedProjectId}
          projects={projects}
          isRequesting={isRequesting}
          onRequestExport={handleRequestExport}
        />
        <DataExportHistory
          exports={exports}
          isLoadingHistory={isLoadingHistory}
          onDownload={handleDownload}
        />
      </CardContent>
    </Card>
  );
}
