"use client";

import type { RecordingDto } from "@/server/dto";

interface UseFilteredRecordingsParams {
  recordings: Array<RecordingDto & { projectName: string }>;
  statusFilter: "active" | "archived";
  searchQuery: string;
  selectedProjectIds: string[];
}

export function useFilteredRecordings({
  recordings,
  statusFilter,
  searchQuery,
  selectedProjectIds,
}: UseFilteredRecordingsParams): Array<
  RecordingDto & { projectName: string }
> {
  let filtered = [...recordings];

  // Filter by status
  filtered = filtered.filter((recording) => recording.status === statusFilter);

  // Filter by search query (title)
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter((recording) =>
      recording.title.toLowerCase().includes(query)
    );
  }

  // Filter by project IDs
  if (selectedProjectIds.length > 0) {
    filtered = filtered.filter((recording) =>
      selectedProjectIds.includes(recording.projectId)
    );
  }

  // Sort by recordingDate DESC (most recent first)
  filtered.sort((a, b) => {
    const dateA = new Date(a.recordingDate).getTime();
    const dateB = new Date(b.recordingDate).getTime();
    return dateB - dateA;
  });

  return filtered;
}

