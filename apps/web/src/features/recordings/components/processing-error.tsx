import { AlertCircleIcon } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";

interface ProcessingErrorProps {
  title?: string;
  message?: string;
  recordingTitle?: string;
  onRetry?: () => void;
}

export function ProcessingError({
  title = "Processing Failed",
  message = "There was an error processing this recording. This could be due to an unsupported file format, corrupted file, or a temporary service issue.",
  recordingTitle,
  onRetry,
}: ProcessingErrorProps) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertCircleIcon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {recordingTitle && (
            <p className="text-sm font-medium">
              Recording: <span className="font-normal">{recordingTitle}</span>
            </p>
          )}
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <div className="text-sm">
            <p className="font-medium mb-1">What you can do:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Verify the file is not corrupted and try uploading again</li>
              <li>Ensure the file format is supported (mp3, mp4, wav, m4a)</li>
              <li>Check if the file size is within limits (max 100MB)</li>
              <li>Contact support if the issue persists</li>
            </ul>
          </div>

          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="w-fit"
            >
              Retry Processing
            </Button>
          )}

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Need help? Contact{" "}
              <a
                href="mailto:support@example.com"
                className="text-primary hover:underline"
              >
                support@example.com
              </a>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

