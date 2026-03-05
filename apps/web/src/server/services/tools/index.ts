import type { ToolCall } from "@/server/db/schema/chat-messages";
import type { ToolContext } from "./tool-context";
import { createListProjectsTool } from "./list-projects.tool";
import { createListRecordingsTool } from "./list-recordings.tool";
import { createListTasksTool } from "./list-tasks.tool";

export type { ToolContext } from "./tool-context";

export function createChatTools(ctx: ToolContext) {
  return {
    listProjects: createListProjectsTool(ctx),
    listRecordings: createListRecordingsTool(ctx),
    listTasks: createListTasksTool(ctx),
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
