import type { SourceReference, ToolCall } from "@/server/db/schema/chat-messages";
import type { ToolContext } from "./tool-context";
import { createListProjectsTool } from "./list-projects.tool";
import { createListRecordingsTool } from "./list-recordings.tool";
import { createListTasksTool } from "./list-tasks.tool";
import { createGetRecordingDetailsTool } from "./get-recording-details.tool";
import { createSearchKnowledgeTool } from "./search-knowledge.tool";

export type { ToolContext } from "./tool-context";

export function createChatTools(ctx: ToolContext) {
  return {
    getRecordingDetails: createGetRecordingDetailsTool(ctx),
    listProjects: createListProjectsTool(ctx),
    listRecordings: createListRecordingsTool(ctx),
    listTasks: createListTasksTool(ctx),
    searchKnowledge: createSearchKnowledgeTool(ctx),
  };
}

function ensureRecord(value: unknown): Record<string, unknown> {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}

export function buildPersistedToolCalls(
  toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }> | undefined,
  toolResults: Array<{ toolCallId: string; output: unknown }> | undefined
): ToolCall[] | undefined {
  if (!toolCalls?.length) return undefined;

  const resultMap = new Map(
    toolResults?.map((tr) => [tr.toolCallId, tr.output]) ?? []
  );

  return toolCalls.map((tc) => {
    const rawResult = resultMap.get(tc.toolCallId);
    return {
      id: tc.toolCallId,
      name: tc.toolName,
      arguments: ensureRecord(tc.input),
      result: rawResult !== undefined ? ensureRecord(rawResult) : undefined,
    };
  });
}

interface SearchKnowledgeResult {
  content: string;
  score: number;
  sourceType: string;
  title: string | null;
  source: string | null;
  recordingId: string | null;
  recordingDate: string | null;
}

export function extractSourcesFromToolResults(
  toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }> | undefined,
  toolResults: Array<{ toolCallId: string; output: unknown }> | undefined
): SourceReference[] {
  if (!toolCalls?.length || !toolResults?.length) return [];

  const resultMap = new Map(
    toolResults.map((tr) => [tr.toolCallId, tr.output])
  );

  const sources: SourceReference[] = [];

  for (const tc of toolCalls) {
    if (tc.toolName === "getRecordingDetails") {
      const output = resultMap.get(tc.toolCallId) as
        | {
            recording?: { id: string; title: string; recordingDate: string };
            summary?: string | null;
            error?: string;
          }
        | undefined;

      if (!output?.recording || output.error) continue;

      sources.push({
        contentId: output.recording.id,
        contentType: "summary",
        title: output.recording.title,
        excerpt: output.summary
          ? output.summary.substring(0, 200)
          : "Recording details",
        similarityScore: 1.0,
        recordingId: output.recording.id,
        recordingDate: output.recording.recordingDate,
      });
    }

    if (tc.toolName !== "searchKnowledge") continue;

    const output = resultMap.get(tc.toolCallId) as
      | { results?: SearchKnowledgeResult[]; error?: string }
      | undefined;

    if (!output?.results?.length) continue;

    for (const r of output.results) {
      sources.push({
        contentId: r.recordingId ?? r.title ?? "",
        contentType: mapSourceType(r.sourceType),
        title: r.title ?? r.source ?? "Untitled",
        excerpt: r.content,
        similarityScore: r.score,
        recordingId: r.recordingId ?? undefined,
        recordingDate: r.recordingDate ?? undefined,
      });
    }
  }

  return sources;
}

function mapSourceType(
  sourceType: string
): SourceReference["contentType"] {
  const validTypes: SourceReference["contentType"][] = [
    "recording",
    "transcription",
    "summary",
    "task",
    "knowledge_document",
  ];
  return validTypes.includes(sourceType as SourceReference["contentType"])
    ? (sourceType as SourceReference["contentType"])
    : "transcription";
}
