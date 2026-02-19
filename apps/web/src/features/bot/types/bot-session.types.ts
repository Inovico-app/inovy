import type { BotSession } from "@/server/db/schema/bot-sessions";

export interface BotRecordingDetails {
  id: string;
  title: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileMimeType: string;
  duration: number | null;
  recordingDate: Date;
}

export interface BotSessionWithRecording extends BotSession {
  recording?: BotRecordingDetails | null;
}
