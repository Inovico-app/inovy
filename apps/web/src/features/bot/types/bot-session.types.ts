import type { BotSession } from "@/server/db/schema/bot-sessions";

export interface BotRecordingDetails {
  id: string;
  title: string;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  fileMimeType: string | null;
  duration: number | null;
  recordingDate: Date;
}

export interface BotSessionWithRecording extends BotSession {
  recording?: BotRecordingDetails | null;
}
