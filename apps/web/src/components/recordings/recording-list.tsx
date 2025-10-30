import { RecordingService } from "@/server/services";
import { RecordingCard } from "./recording-card";
import { RecordingSearch } from "./recording-search";

interface RecordingListProps {
  projectId: string;
  searchQuery?: string;
}

export async function RecordingList({
  projectId,
  searchQuery,
}: RecordingListProps) {
  const result = await RecordingService.getRecordingsByProjectId(projectId, {
    search: searchQuery,
  });

  if (result.isErr()) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load recordings</p>
        <p className="text-sm text-muted-foreground mt-2">
          Please try refreshing the page
        </p>
      </div>
    );
  }

  const recordings = result.value;

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {searchQuery
            ? `No recordings found matching "${searchQuery}"`
            : "No recordings yet"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {recordings.length} {recordings.length === 1 ? "recording" : "recordings"}
        </p>
        <RecordingSearch />
      </div>

      <div className="space-y-4">
        {recordings.map((recording) => (
          <RecordingCard
            key={recording.id}
            recording={recording}
            projectId={projectId}
          />
        ))}
      </div>
    </div>
  );
}

