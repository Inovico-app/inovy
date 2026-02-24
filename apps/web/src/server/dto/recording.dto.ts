import type {
  RecordingArchiveStatus,
  RecordingMode,
  RecordingStatus,
  WorkflowStatus,
} from "../db/schema/recordings";
import type { DataClassificationLevel } from "../db/schema/data-classification";

export interface RecordingDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
  duration: number | null;
  recordingDate: Date;
  recordingMode: RecordingMode;
  transcriptionStatus: RecordingStatus;
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
  dataClassificationLevel: DataClassificationLevel;
  classificationMetadata: Record<string, unknown> | null;
  classifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

