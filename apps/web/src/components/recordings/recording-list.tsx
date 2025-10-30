import { ClockIcon, FileAudioIcon, FileVideoIcon } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import type { RecordingDto } from "../../server/dto";
import { UploadRecordingModal } from "./upload-recording-modal";
import { RecordingService } from "../../server/services/recording.service";
import { RecordingCardWithStatus } from "./recording-card-with-status";

interface RecordingListProps {
  projectId: string;
  searchQuery?: string;
}

export async function RecordingList({ projectId, searchQuery }: RecordingListProps) {
  const recordingsResult = await RecordingService.getRecordingsByProjectId(projectId, {
    search: searchQuery,
  });

  if (recordingsResult.isErr()) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">Failed to load recordings</p>
        <p className="text-sm text-muted-foreground">{recordingsResult.error.message}</p>
      </div>
    );
  }

  const recordings = recordingsResult.value;

  if (recordings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">
          {searchQuery ? "No recordings found matching your search" : "No recordings yet"}
        </p>
        <UploadRecordingModal
          projectId={projectId}
          trigger={<Button variant="outline">Upload Your First Recording</Button>}
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
