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
      {/* Permission / Recording device errors - stay on page with clear notification */}
      {(permissionDenied || recorderError) && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">
              {permissionDenied ? "Microfoontoegang nodig" : "Opname niet mogelijk"}
            </p>
            <p className="text-sm mt-1">
              {recorderError ??
                "Sta microfoontoegang toe in je browser om te kunnen opnemen. Klik op het slot- of camera‑icoon in de adresbalk en kies 'Toestaan'."}
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Transcription errors (when no device error) */}
      {transcriptionError && !permissionDenied && !recorderError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <p className="font-semibold">Fout opgetreden:</p>
            <p className="text-sm mt-1">{transcriptionError}</p>
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

