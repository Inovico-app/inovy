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
  recordingId: string;
  transcriptionText: string;
  utterances: Utterance[];
  isManuallyEdited?: boolean;
  lastEditedById?: string | null;
  lastEditedAt?: Date | null;
  speakersDetected?: number;
  confidence?: number;
}

export interface TranscriptionSectionProps {
  recordingId: string;
  recordingTitle: string;
  transcriptionStatus: "pending" | "processing" | "completed" | "failed";
  transcriptionText: string | null;
  utterances?: Utterance[];
  isTranscriptionManuallyEdited?: boolean;
  transcriptionLastEditedById?: string | null;
  transcriptionLastEditedAt?: Date | null;
  speakersDetected?: number;
  confidence?: number;
}

