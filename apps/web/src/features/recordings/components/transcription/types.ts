import type { AIInsightDto } from "@/server/dto/ai-insight.dto";
import type { RecordingDto } from "@/server/dto/recording.dto";

export interface Utterance {
  speaker: number;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface GroupedUtterance {
  speaker: number;
  utterances: Utterance[];
  text: string;
  start: number;
  end: number;
  confidence: number;
  startIndices: number[]; // Original utterance indices
}

export type ViewMode = "simple" | "detailed";

export interface TranscriptionMessageBubbleProps {
  groupedUtterance: GroupedUtterance;
  viewMode: ViewMode;
  speakersDetected?: number;
  speakerNames?: Record<string, string> | null;
  speakerUserIds?: Record<string, string> | null;
  recordingId: string;
}

export interface TranscriptionMessageViewProps {
  utterances: Utterance[];
  viewMode: ViewMode;
  speakersDetected?: number;
  confidence?: number;
  speakerNames?: Record<string, string> | null;
  speakerUserIds?: Record<string, string> | null;
  recordingId: string;
}

export interface TranscriptionTabsProps {
  utterances: Utterance[];
  transcriptionText: string;
  recordingId: string;
  isManuallyEdited?: boolean;
  lastEditedAt?: Date | null;
  speakersDetected?: number;
  confidence?: number;
  speakerNames?: Record<string, string> | null;
  speakerUserIds?: Record<string, string> | null;
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

