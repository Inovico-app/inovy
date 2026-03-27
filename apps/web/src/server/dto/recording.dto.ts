import type {
  RecordingArchiveStatus,
  RecordingMode,
  RecordingStatus,
  TranscriptionStatus,
  WorkflowStatus,
} from "../db/schema/recordings";

export interface RecordingDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileMimeType: string | null;
  storageStatus: RecordingStatus;
  recallBotId: string | null;
  duration: number | null;
  recordingDate: Date;
  recordingMode: RecordingMode;
  language: string; // ISO 639-1 language code
  transcriptionStatus: TranscriptionStatus;
  transcriptionRetryCount: number;
  transcriptionNextRetryAt: Date | null;
  transcriptionLastError: string | null;
  transcriptionText: string | null;
  redactedTranscriptionText: string | null;
  isTranscriptionManuallyEdited: boolean;
  transcriptionLastEditedById: string | null;
  transcriptionLastEditedAt: Date | null;
  status: RecordingArchiveStatus;
  workflowStatus: WorkflowStatus;
  workflowError: string | null;
  workflowRetryCount: number;
  lastReprocessedAt: Date | null;
  reprocessingTriggeredById: string | null;
  organizationId: string;
  createdById: string;
  consentGiven: boolean;
  consentGivenBy: string | null;
  consentGivenAt: Date | null;
  consentRevokedAt: Date | null;
  isEncrypted: boolean;
  encryptionMetadata: string | null;
  createdAt: Date;
  updatedAt: Date;
}
