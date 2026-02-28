import { Button } from "../../../components/ui/button";
import { getCachedRecordingsByProjectId } from "../../../server/cache/recording.cache";
import { RecordingListClient } from "./recording-list-client";
import { MicIcon } from "lucide-react";
import Link from "next/link";

interface RecordingListProps {
  projectId: string;
  organizationId: string;
  searchQuery?: string;
  isArchived?: boolean;
}

export async function RecordingList({
  projectId,
  organizationId,
  searchQuery,
  isArchived = false,
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
        {!isArchived && (
          <Button variant="outline" asChild>
            <Link
              href={`/record?projectId=${encodeURIComponent(projectId)}`}
              className="inline-flex items-center gap-2"
            >
              <MicIcon className="h-4 w-4" />
              Start Live Recording
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return <RecordingListClient recordings={recordings} projectId={projectId} />;
}

