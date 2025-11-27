"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RecordingDto } from "@/server/dto/recording.dto";
import { RecordingCard } from "./recording-card";
import { RecordingsFilters } from "./recordings-filters";
import { RecordingsViewToggle } from "./recordings-view-toggle";
import { useFilteredRecordings } from "../hooks/use-filtered-recordings";
import { useRecordingsFilters } from "../hooks/use-recordings-filters";

interface RecordingsOverviewClientProps {
  recordings: Array<RecordingDto & { projectName: string }>;
  projects: Array<{ id: string; name: string }>;
}

export function RecordingsOverviewClient({
  recordings,
  projects,
}: RecordingsOverviewClientProps) {
  const {
    statusFilter,
    searchQuery,
    selectedProjectIds,
    viewMode,
    handleStatusChange,
    handleSearchChange,
    handleProjectIdsChange,
    handleViewModeChange,
    handleClearFilters,
  } = useRecordingsFilters();

  const filteredRecordings = useFilteredRecordings({
    recordings,
    statusFilter,
    searchQuery,
    selectedProjectIds,
  });

  // Group recordings by project for grouped view
  const groupedRecordings = filteredRecordings.reduce(
    (acc, recording) => {
      const projectId = recording.projectId;
      if (!acc[projectId]) {
        acc[projectId] = {
          projectId,
          projectName: recording.projectName,
          recordings: [],
        };
      }
      acc[projectId].recordings.push(recording);
      return acc;
    },
    {} as Record<
      string,
      {
        projectId: string;
        projectName: string;
        recordings: Array<RecordingDto & { projectName: string }>;
      }
    >
  );

  const groupedRecordingsList = Object.values(groupedRecordings);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters Sidebar */}
      <div className="lg:col-span-1">
        <RecordingsFilters
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          selectedProjectIds={selectedProjectIds}
          onProjectIdsChange={handleProjectIdsChange}
          projects={projects}
          onClearFilters={handleClearFilters}
        />
      </div>

      {/* Recordings List */}
      <div className="lg:col-span-3">
        <div className="space-y-4">
          {/* Header with tabs and view toggle */}
          <div className="flex items-center justify-between">
            <Tabs
              value={statusFilter}
              onValueChange={(value) =>
                handleStatusChange(value as "active" | "archived")
              }
            >
              <TabsList>
                <TabsTrigger value="active">
                  Active
                  <Badge variant="secondary" className="ml-2">
                    {recordings.filter((r) => r.status === "active").length}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="archived">
                  Archived
                  <Badge variant="secondary" className="ml-2">
                    {recordings.filter((r) => r.status === "archived").length}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <RecordingsViewToggle
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
          </div>

          {/* Recordings Content */}
          {filteredRecordings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  {searchQuery || selectedProjectIds.length > 0
                    ? "No recordings found matching your filters"
                    : statusFilter === "active"
                    ? "No active recordings yet"
                    : "No archived recordings"}
                </p>
              </CardContent>
            </Card>
          ) : viewMode === "grouped" ? (
            <div className="space-y-6">
              {groupedRecordingsList.map((group) => (
                <div key={group.projectId} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{group.projectName}</h2>
                    <Badge variant="outline">{group.recordings.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {group.recordings.map((recording) => (
                      <RecordingCard
                        key={recording.id}
                        recording={recording}
                        projectId={recording.projectId}
                        projectName={recording.projectName}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecordings.map((recording) => (
                <RecordingCard
                  key={recording.id}
                  recording={recording}
                  projectId={recording.projectId}
                  projectName={recording.projectName}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

