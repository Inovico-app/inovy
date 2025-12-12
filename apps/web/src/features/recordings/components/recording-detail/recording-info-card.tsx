import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateLong } from "@/lib/formatters/date-formatters";
import { formatDuration } from "@/lib/formatters/duration-formatters";
import { formatFileSize } from "@/lib/formatters/file-size-formatters";
import type { RecordingDto } from "@/server/dto/recording.dto";
import { CalendarIcon, ClockIcon, FileIcon } from "lucide-react";

interface RecordingInfoCardProps {
  recording: RecordingDto;
}

export function RecordingInfoCard({ recording }: RecordingInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recording Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Date:</span>
            <span className="text-sm">{formatDateLong(recording.recordingDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Duration:</span>
            <span className="text-sm">
              {formatDuration(recording.duration)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">File size:</span>
            <span className="text-sm">{formatFileSize(recording.fileSize)}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Format:</span>
            <span className="text-sm">
              {recording.fileName.split(".").pop()?.toUpperCase()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


