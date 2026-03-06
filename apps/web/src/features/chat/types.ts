export interface SourceReference {
  contentId: string;
  contentType:
    | "recording"
    | "transcription"
    | "summary"
    | "task"
    | "knowledge_document";
  title: string;
  excerpt: string;
  similarityScore: number;
  recordingId?: string;
  timestamp?: number;
  recordingDate?: string;
  projectName?: string;
  projectId?: string;
  documentTitle?: string;
}

export interface Project {
  id: string;
  name: string;
}

export interface ToolPart {
  type: string;
  toolCallId: string;
  toolName?: string;
  state: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
}

export function isToolPart(part: { type: string }): part is ToolPart {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

export function getToolName(part: ToolPart): string {
  if (part.type === "dynamic-tool") return part.toolName ?? "unknown";
  return part.type.replace(/^tool-/, "");
}

export type TextPart = { type: "text"; text?: string | null };
export type MessagePart = TextPart | ToolPart;

