export type ErrorSeverity = "warning" | "fatal";

export interface BaseRecordingError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  recoverable: boolean;
  cause?: unknown;
}

export interface CaptureError extends BaseRecordingError {
  code:
    | "PERMISSION_DENIED"
    | "DEVICE_NOT_FOUND"
    | "DEVICE_LOST"
    | "SYSTEM_AUDIO_NOT_SUPPORTED"
    | "MEDIA_RECORDER_ERROR";
}

export interface PersistenceError extends BaseRecordingError {
  code:
    | "INDEXED_DB_FULL"
    | "INDEXED_DB_ERROR"
    | "BLOCK_UPLOAD_FAILED"
    | "COMMIT_FAILED"
    | "SAS_TOKEN_ERROR"
    | "FINALIZATION_FAILED";
}

export interface TranscriptionError extends BaseRecordingError {
  code:
    | "CONNECTION_FAILED"
    | "TOKEN_ERROR"
    | "WEBSOCKET_ERROR"
    | "TOKEN_EXPIRED";
}

export interface SessionError extends BaseRecordingError {
  code: "INVALID_TRANSITION" | "INITIALIZATION_FAILED" | "UNKNOWN";
}

export type RecordingError =
  | CaptureError
  | PersistenceError
  | TranscriptionError
  | SessionError;

export function createCaptureError(
  code: CaptureError["code"],
  message: string,
  options?: {
    severity?: ErrorSeverity;
    recoverable?: boolean;
    cause?: unknown;
  },
): CaptureError {
  return {
    code,
    message,
    severity: options?.severity ?? "fatal",
    recoverable: options?.recoverable ?? false,
    cause: options?.cause,
  };
}

export function createPersistenceError(
  code: PersistenceError["code"],
  message: string,
  options?: {
    severity?: ErrorSeverity;
    recoverable?: boolean;
    cause?: unknown;
  },
): PersistenceError {
  return {
    code,
    message,
    severity: options?.severity ?? "warning",
    recoverable: options?.recoverable ?? true,
    cause: options?.cause,
  };
}

export function createTranscriptionError(
  code: TranscriptionError["code"],
  message: string,
  options?: {
    severity?: ErrorSeverity;
    recoverable?: boolean;
    cause?: unknown;
  },
): TranscriptionError {
  return {
    code,
    message,
    severity: options?.severity ?? "warning",
    recoverable: options?.recoverable ?? true,
    cause: options?.cause,
  };
}

export function createSessionError(
  code: SessionError["code"],
  message: string,
  options?: {
    severity?: ErrorSeverity;
    recoverable?: boolean;
    cause?: unknown;
  },
): SessionError {
  return {
    code,
    message,
    severity: options?.severity ?? "fatal",
    recoverable: options?.recoverable ?? false,
    cause: options?.cause,
  };
}
