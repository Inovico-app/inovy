"use client";

import { getUserProjectsAction } from "@/features/projects/actions/get-user-projects";
import type { DataExport } from "@/server/db/schema/data-exports";
import { useEffect, useReducer } from "react";
import { toast } from "sonner";
import {
  getExportHistory,
  requestDataExport,
} from "../actions/export-user-data";

// ============================================================================
// State & Actions
// ============================================================================

interface DataExportState {
  isRequesting: boolean;
  isLoadingHistory: boolean;
  exports: DataExport[];
  projects: Array<{ id: string; name: string }>;
  startDate: string;
  endDate: string;
  selectedProjectId: string;
}

type DataExportAction =
  | { type: "SET_LOADING_HISTORY"; payload: boolean }
  | { type: "SET_REQUESTING"; payload: boolean }
  | { type: "SET_EXPORTS"; payload: DataExport[] }
  | { type: "SET_PROJECTS"; payload: Array<{ id: string; name: string }> }
  | { type: "SET_START_DATE"; payload: string }
  | { type: "SET_END_DATE"; payload: string }
  | { type: "SET_PROJECT_ID"; payload: string }
  | { type: "RESET_FORM" };

function createInitialState(): DataExportState {
  return {
    isRequesting: false,
    isLoadingHistory: true,
    exports: [],
    projects: [],
    startDate: "",
    endDate: "",
    selectedProjectId: "all",
  };
}

// ============================================================================
// Reducer
// ============================================================================

function dataExportReducer(
  state: DataExportState,
  action: DataExportAction,
): DataExportState {
  switch (action.type) {
    case "SET_LOADING_HISTORY":
      return { ...state, isLoadingHistory: action.payload };

    case "SET_REQUESTING":
      return { ...state, isRequesting: action.payload };

    case "SET_EXPORTS":
      return { ...state, exports: action.payload };

    case "SET_PROJECTS":
      return { ...state, projects: action.payload };

    case "SET_START_DATE":
      return { ...state, startDate: action.payload };

    case "SET_END_DATE":
      return { ...state, endDate: action.payload };

    case "SET_PROJECT_ID":
      return { ...state, selectedProjectId: action.payload };

    case "RESET_FORM":
      return {
        ...state,
        startDate: "",
        endDate: "",
        selectedProjectId: "all",
      };

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

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
  const [state, dispatch] = useReducer(
    dataExportReducer,
    undefined,
    createInitialState,
  );

  useEffect(() => {
    loadHistory();
    loadProjects();
  }, []);

  async function loadHistory() {
    dispatch({ type: "SET_LOADING_HISTORY", payload: true });
    try {
      const result = await getExportHistory({});
      if (result.data?.success && result.data.exports) {
        dispatch({ type: "SET_EXPORTS", payload: result.data.exports });
      } else {
        toast.error(result.serverError || "Failed to load export history");
      }
    } catch {
      toast.error("Failed to load export history");
    } finally {
      dispatch({ type: "SET_LOADING_HISTORY", payload: false });
    }
  }

  async function loadProjects() {
    try {
      const result = await getUserProjectsAction();
      if (!result?.serverError && result?.data) {
        dispatch({ type: "SET_PROJECTS", payload: result.data });
      }
    } catch {
      // Silently fail - projects filter is optional
    }
  }

  async function handleRequestExport() {
    dispatch({ type: "SET_REQUESTING", payload: true });
    try {
      const filters: {
        dateRange?: { startDate: Date; endDate: Date };
        projectId?: string;
      } = {};

      if (state.startDate && state.endDate) {
        filters.dateRange = {
          startDate: new Date(state.startDate),
          endDate: new Date(state.endDate),
        };
      }

      if (state.selectedProjectId && state.selectedProjectId !== "all") {
        filters.projectId = state.selectedProjectId;
      }

      const result = await requestDataExport(
        Object.keys(filters).length > 0 ? filters : {},
      );

      if (result.data?.success) {
        toast.success(
          "Export request created. Your export will be ready shortly.",
        );
        // Reset form
        dispatch({ type: "RESET_FORM" });
        // Reload history
        await loadHistory();
      } else {
        toast.error(result.serverError || "Failed to create export request");
      }
    } catch {
      toast.error("Failed to create export request");
    } finally {
      dispatch({ type: "SET_REQUESTING", payload: false });
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
    isRequesting: state.isRequesting,
    isLoadingHistory: state.isLoadingHistory,
    exports: state.exports,
    projects: state.projects,
    startDate: state.startDate,
    setStartDate: (value: string) =>
      dispatch({ type: "SET_START_DATE", payload: value }),
    endDate: state.endDate,
    setEndDate: (value: string) =>
      dispatch({ type: "SET_END_DATE", payload: value }),
    selectedProjectId: state.selectedProjectId,
    setSelectedProjectId: (value: string) =>
      dispatch({ type: "SET_PROJECT_ID", payload: value }),
    handleRequestExport,
    handleDownload,
  };
}
