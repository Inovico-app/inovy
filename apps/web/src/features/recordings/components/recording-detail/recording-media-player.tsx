import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecordingDto } from "@/server/dto/recording.dto";
import { RecordingPlayerWrapper } from "../recording-player-wrapper";
import { getTranslations } from "next-intl/server";

interface RecordingMediaPlayerProps {
  recording: RecordingDto;
}

export async function RecordingMediaPlayer({
  recording,
}: RecordingMediaPlayerProps) {
  const t = await getTranslations("recordings");
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
          <CardTitle>{t("player.playback")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48 rounded-lg border bg-muted">
            <p className="text-muted-foreground text-sm">
              {recording.storageStatus === "failed"
                ? t("player.storageFailed")
                : t("player.uploading")}
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
        <CardTitle>{t("player.playback")}</CardTitle>
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
