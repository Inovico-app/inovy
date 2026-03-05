import type { ToolCall } from "@/server/db/schema/chat-messages";
import type { ToolContext } from "./tool-context";
import { createListProjectsTool } from "./list-projects.tool";

export type { ToolContext } from "./tool-context";

export function createChatTools(ctx: ToolContext) {
  return {
    listProjects: createListProjectsTool(ctx),
  };
}

export function buildPersistedToolCalls(
  toolCalls: Array<{ toolCallId: string; toolName: string; input: unknown }> | undefined,
  toolResults: Array<{ toolCallId: string; output: unknown }> | undefined
): ToolCall[] | undefined {
  if (!toolCalls?.length) return undefined;

  const resultMap = new Map(
    toolResults?.map((tr) => [tr.toolCallId, tr.output]) ?? []
  );

  return toolCalls.map((tc) => ({
    id: tc.toolCallId,
    name: tc.toolName,
    arguments: tc.input as Record<string, unknown>,
    result: (resultMap.get(tc.toolCallId) ?? undefined) as
      | Record<string, unknown>
      | undefined,
  }));
}
