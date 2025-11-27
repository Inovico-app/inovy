import { Button } from "../../../components/ui/button";
import { getCachedRecordingsByProjectId } from "../../../server/cache/recording.cache";
import { RecordingListClient } from "./recording-list-client";
import { UploadRecordingModal } from "./upload-recording-modal";

interface RecordingListProps {
  projectId: string;
  organizationId: string;
  searchQuery?: string;
}

export async function RecordingList({
  projectId,
  organizationId,
  searchQuery,
}: RecordingListProps) {
  const recordings = await getCachedRecordingsByProjectId(
    projectId,
    organizationId,
    {
      search: searchQuery,
    }
  );

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

  return <RecordingListClient recordings={recordings} projectId={projectId} />;
}

