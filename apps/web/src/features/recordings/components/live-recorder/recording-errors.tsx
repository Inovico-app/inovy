import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface RecordingErrorsProps {
  permissionDenied: boolean;
  recorderError: string | null;
  transcriptionError: string | null;
  isSaving: boolean;
}

export function RecordingErrors({
  permissionDenied,
  recorderError,
  transcriptionError,
  isSaving,
}: RecordingErrorsProps) {
  return (
    <>
      {/* Permission Denied Error */}
      {permissionDenied && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Toegang tot microfoon geweigerd. Sta microfoontoegang toe in je
            browserinstellingen om op te kunnen nemen.
          </AlertDescription>
        </Alert>
      )}

      {/* Recording/Transcription Errors */}
      {(recorderError ?? transcriptionError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">Fout opgetreden:</p>
            <p className="text-sm mt-1">
              {recorderError ?? transcriptionError}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Saving Status */}
      {isSaving && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            Opname wordt opgeslagen en geüpload...
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}

