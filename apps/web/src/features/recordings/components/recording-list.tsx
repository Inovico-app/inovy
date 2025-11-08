import { Button } from "../../../components/ui/button";
import { getCachedRecordingsByProjectId } from "../../../server/cache";
import { RecordingCardWithStatus } from "./recording-card-with-status";
import { UploadRecordingModal } from "./upload-recording-modal";

interface RecordingListProps {
  projectId: string;
  searchQuery?: string;
}

export async function RecordingList({
  projectId,
  searchQuery,
}: RecordingListProps) {
  const recordingsResult = await getCachedRecordingsByProjectId(projectId, {
    search: searchQuery,
  });

  if (recordingsResult.isErr()) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Failed to load recordings</p>
        <p className="text-sm text-muted-foreground">
          {recordingsResult.error.message}
        </p>
      </div>
    );
  }

  const recordings = recordingsResult.value;

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          {searchQuery
            ? "No recordings found matching your search"
            : "No recordings yet"}
        </p>
        <UploadRecordingModal
          projectId={projectId}
          trigger={
            <Button variant="outline">Upload Your First Recording</Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recordings.map((recording) => (
        <RecordingCardWithStatus key={recording.id} recording={recording} />
      ))}
    </div>
  );
}

