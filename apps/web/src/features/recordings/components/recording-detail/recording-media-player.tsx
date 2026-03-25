import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecordingDto } from "@/server/dto/recording.dto";
import { RecordingPlayerWrapper } from "../recording-player-wrapper";

interface RecordingMediaPlayerProps {
  recording: RecordingDto;
}

export function RecordingMediaPlayer({ recording }: RecordingMediaPlayerProps) {
  // Early return if storage not complete
  if (
    recording.storageStatus !== "completed" ||
    !recording.fileUrl ||
    !recording.fileMimeType ||
    !recording.fileName
  ) {
    return (
      <Card id="player">
        <CardHeader>
          <CardTitle>Playback</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 rounded-lg border bg-muted">
            <p className="text-muted-foreground text-sm">
              {recording.storageStatus === "failed"
                ? "Recording storage failed"
                : "Recording is being uploaded..."}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isVideo = recording.fileMimeType.startsWith("video/");
  const isAudio = recording.fileMimeType.startsWith("audio/");

  return (
    <Card id="player">
      <CardHeader>
        <CardTitle>Playback</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <RecordingPlayerWrapper
            fileUrl={recording.fileUrl}
            fileMimeType={recording.fileMimeType}
            fileName={recording.fileName}
            isVideo={isVideo}
            isAudio={isAudio}
            recordingId={recording.id}
            isEncrypted={recording.isEncrypted}
          />
        </div>
      </CardContent>
    </Card>
  );
}
