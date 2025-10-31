import type {
  RecordingStatus,
  RecordingArchiveStatus,
} from "../db/schema/recordings";

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
  transcriptionStatus: RecordingStatus;
  transcriptionText: string | null;
  status: RecordingArchiveStatus;
  organizationId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

