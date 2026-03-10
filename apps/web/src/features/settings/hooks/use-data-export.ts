"use client";

import { getUserProjects } from "@/features/projects/actions/get-user-projects";
import type { DataExport } from "@/server/db/schema/data-exports";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  getExportHistory,
  requestDataExport,
} from "../actions/export-user-data";

interface UseDataExportReturn {
  isRequesting: boolean;
  isLoadingHistory: boolean;
  exports: DataExport[];
  projects: Array<{ id: string; name: string }>;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  selectedProjectId: string;
  setSelectedProjectId: (value: string) => void;
  handleRequestExport: () => Promise<void>;
  handleDownload: (export_: DataExport) => Promise<void>;
}

export function useDataExport(): UseDataExportReturn {
  const [isRequesting, setIsRequesting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [exports, setExports] = useState<DataExport[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>(
    []
  );

  // Form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  useEffect(() => {
    loadHistory();
    loadProjects();
  }, []);

  async function loadHistory() {
    setIsLoadingHistory(true);
    try {
      const result = await getExportHistory({});
      if (result.data?.success && result.data.exports) {
        setExports(result.data.exports);
      } else {
        toast.error(result.serverError || "Failed to load export history");
      }
    } catch {
      toast.error("Failed to load export history");
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function loadProjects() {
    try {
      const result = await getUserProjects();
      if (result.success && result.data) {
        setProjects(result.data);
      }
    } catch {
      // Silently fail - projects filter is optional
    }
  }

  async function handleRequestExport() {
    setIsRequesting(true);
    try {
      const filters: {
        dateRange?: { startDate: Date; endDate: Date };
        projectId?: string;
      } = {};

      if (startDate && endDate) {
        filters.dateRange = {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        };
      }

      if (selectedProjectId && selectedProjectId !== "all") {
        filters.projectId = selectedProjectId;
      }

      const result = await requestDataExport(
        Object.keys(filters).length > 0 ? filters : {}
      );

      if (result.data?.success) {
        toast.success(
          "Export request created. Your export will be ready shortly."
        );
        // Reset form
        setStartDate("");
        setEndDate("");
        setSelectedProjectId("all");
        // Reload history
        await loadHistory();
      } else {
        toast.error(result.serverError || "Failed to create export request");
      }
    } catch {
      toast.error("Failed to create export request");
    } finally {
      setIsRequesting(false);
    }
  }

  async function handleDownload(export_: DataExport) {
    const expiresAt = new Date(export_.expiresAt);
    if (expiresAt < new Date()) {
      toast.error("This export has expired. Please request a new export.");
      return;
    }

    try {
      // Download file from API route
      const response = await fetch(`/api/gdpr-export/${export_.id}`);
      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: "Download failed" }));
        toast.error(error.error || "Failed to download export");
        return;
      }

      // Get blob from response
      const blob = await response.blob();

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export-${export_.id}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error("Failed to download export");
      console.error("Download error:", error);
    }
  }

  return {
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
  };
}
