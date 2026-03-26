import { Button } from "../../../components/ui/button";
import { getCachedRecordingsByProjectId } from "../../../server/cache/recording.cache";
import { RecordingListClient } from "./recording-list-client";
import { MicIcon } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

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
  const t = await getTranslations("recordings");
  const recordings = await getCachedRecordingsByProjectId(
    projectId,
    organizationId,
    {
      search: searchQuery,
    },
  );

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          {searchQuery ? t("list.noRecordingsSearch") : t("list.noRecordings")}
        </p>
        {!isArchived && (
          <Button
            variant="outline"
            render={
              <Link
                href={`/record?projectId=${encodeURIComponent(projectId)}`}
                className="inline-flex items-center gap-2"
              />
            }
            nativeButton={false}
          >
            <MicIcon className="h-4 w-4" />
            {t("actions.startLiveRecording")}
          </Button>
        )}
      </div>
    );
  }

  return <RecordingListClient recordings={recordings} projectId={projectId} />;
}
