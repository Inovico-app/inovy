import type { AIInsightDto } from "@/server/dto/ai-insight.dto";
import type { RecordingDto } from "@/server/dto/recording.dto";

export interface Utterance {
  speaker: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export type ViewMode = "simple" | "detailed";

export interface TranscriptionMessageBubbleProps {
  utterance: Utterance;
  viewMode: ViewMode;
  speakersDetected?: number;
}

export interface TranscriptionMessageViewProps {
  utterances: Utterance[];
  viewMode: ViewMode;
  speakersDetected?: number;
  confidence?: number;
}

export interface TranscriptionTabsProps {
  utterances: Utterance[];
  transcriptionText: string;
  recordingId: string;
  isManuallyEdited?: boolean;
  lastEditedAt?: Date | null;
  speakersDetected?: number;
  confidence?: number;
  onEditStart: () => void;
}

export interface TranscriptionEditViewProps {
  recordingId: string;
  transcriptionText: string;
  isManuallyEdited?: boolean;
  lastEditedAt?: Date | null;
  speakersDetected?: number;
  confidence?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

export interface TranscriptionEditorProps {
  recording: RecordingDto;
  transcriptionInsights: AIInsightDto | null;
}

export interface TranscriptionSectionProps {
  recording: RecordingDto;
  transcriptionInsights: AIInsightDto | null;
  knowledgeUsed: string[];
}

