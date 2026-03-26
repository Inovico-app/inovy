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
import { useTranslations } from "next-intl";
import { DataExportHistory } from "./data-export-history";

export function DataExport() {
  const t = useTranslations("settings.profile");
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
        <CardTitle>{t("dataExport")}</CardTitle>
        <CardDescription>{t("dataExportDescription")}</CardDescription>
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
