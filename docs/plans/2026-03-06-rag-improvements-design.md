# RAG Improvements: getRecordingDetails tool + searchKnowledge filters + prompt guidance

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix the chat's inability to answer temporal/project-scoped queries like "give me the latest summary of my recording in project X" by adding a deterministic recording details tool, content-type filters to search, and better LLM tool-chaining guidance.

**Architecture:** Three complementary changes: (A) A new `getRecordingDetails` tool that fetches recording metadata + summary + tasks directly from the database — no semantic search needed. (B) Add `contentType` and `recordingId` filter parameters to the existing `searchKnowledge` tool so the LLM can narrow RAG results. (C) Improve system prompts to teach the LLM when to chain tools (e.g., listRecordings → getRecordingDetails) and increase `stepCountIs` from 3 to 10 to allow multi-step tool chains.

**Tech Stack:** TypeScript, Vercel AI SDK (`tool` from "ai"), Zod, Drizzle ORM, Qdrant vector DB

---

### Task 1: Create `getRecordingDetails` tool

**Files:**
- Create: `apps/web/src/server/services/tools/get-recording-details.tool.ts`

**Step 1: Create the tool file**

```typescript
import { tool } from "ai";
import { z } from "zod";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { logger } from "@/lib/logger";
import type { ToolContext } from "./tool-context";

export function createGetRecordingDetailsTool(ctx: ToolContext) {
  return tool({
    description:
      "Get detailed information about a specific recording, including its summary, tasks, and metadata. " +
      "Use this when you know a recording ID (e.g., from listRecordings) and need its summary, action items, " +
      "or other details. This is the BEST tool for answering questions like 'what was discussed in recording X' " +
      "or 'give me the summary of the latest recording'.",
    inputSchema: z.object({
      recordingId: z
        .string()
        .uuid()
        .describe("The recording ID to get details for"),
    }),
    execute: async ({ recordingId }) => {
      try {
        const recording =
          await RecordingsQueries.selectRecordingById(recordingId);

        if (!recording) {
          return { error: "Recording not found." };
        }

        // Verify organization access
        if (recording.organizationId !== ctx.organizationId) {
          return { error: "Recording not found." };
        }

        // If in project context, verify project access
        if (ctx.projectId && recording.projectId !== ctx.projectId) {
          return { error: "Recording not found in this project." };
        }

        // Fetch all insights for this recording
        const insights =
          await AIInsightsQueries.getInsightsByRecordingId(recordingId);

        const summaryInsight = insights.find(
          (i) => i.insightType === "summary" && i.processingStatus === "completed"
        );

        const taskInsights = insights.filter(
          (i) =>
            i.insightType === "action_items" &&
            i.processingStatus === "completed"
        );

        // Format summary content
        let summaryContent: string | null = null;
        if (summaryInsight?.content) {
          const content = summaryInsight.content as Record<string, unknown>;
          if (typeof content.overview === "string") {
            summaryContent = content.overview;
          } else {
            summaryContent = JSON.stringify(content);
          }
        }

        // Format tasks
        let tasks: Array<{ title: string; priority?: string; status?: string }> =
          [];
        for (const taskInsight of taskInsights) {
          const content = taskInsight.content as Record<string, unknown>;
          if (Array.isArray(content.tasks)) {
            tasks = content.tasks.map(
              (t: Record<string, unknown>) => ({
                title: String(t.title ?? ""),
                priority: t.priority ? String(t.priority) : undefined,
                status: t.status ? String(t.status) : undefined,
              })
            );
          }
        }

        return {
          recording: {
            id: recording.id,
            title: recording.title,
            description: recording.description,
            recordingDate: recording.recordingDate,
            duration: recording.duration,
            status: recording.transcriptionStatus,
          },
          summary: summaryContent,
          topics: summaryInsight?.content
            ? ((summaryInsight.content as Record<string, unknown>)
                .topics as string[]) ?? []
            : [],
          decisions: summaryInsight?.content
            ? ((summaryInsight.content as Record<string, unknown>)
                .decisions as string[]) ?? []
            : [],
          tasks,
          speakerCount: summaryInsight?.speakersDetected ?? null,
        };
      } catch (error) {
        logger.error("Error in get-recording-details tool", {
          component: "GetRecordingDetailsTool",
          error,
        });
        return { error: "Failed to fetch recording details. Please try again." };
      }
    },
  });
}
```

**Step 2: Verify no lint/type errors**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -i "get-recording-details" | head -20`

**Step 3: Commit**

```bash
git add apps/web/src/server/services/tools/get-recording-details.tool.ts
git commit -m "feat(chat): add getRecordingDetails tool for deterministic recording info retrieval"
```

---

### Task 2: Register the new tool in the chat tools index

**Files:**
- Modify: `apps/web/src/server/services/tools/index.ts`

**Step 1: Add the import and register the tool**

Add import at top:
```typescript
import { createGetRecordingDetailsTool } from "./get-recording-details.tool";
```

Add to `createChatTools` return object:
```typescript
export function createChatTools(ctx: ToolContext) {
  return {
    listProjects: createListProjectsTool(ctx),
    listRecordings: createListRecordingsTool(ctx),
    listTasks: createListTasksTool(ctx),
    searchKnowledge: createSearchKnowledgeTool(ctx),
    getRecordingDetails: createGetRecordingDetailsTool(ctx),
  };
}
```

**Step 2: Verify no type errors**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -i "tools/index" | head -10`

**Step 3: Commit**

```bash
git add apps/web/src/server/services/tools/index.ts
git commit -m "feat(chat): register getRecordingDetails in chat tools"
```

---

### Task 3: Add `contentType` and `recordingId` filters to `searchKnowledge` tool

**Files:**
- Modify: `apps/web/src/server/services/tools/search-knowledge.tool.ts`

**Step 1: Add new parameters to the input schema and pass them as filters**

Update the `inputSchema` to add `contentType` and `recordingId` parameters, and pass them through as Qdrant filters:

```typescript
inputSchema: z.object({
  query: z.string().min(1).describe("Search query text"),
  limit: z
    .number()
    .int()
    .positive()
    .max(20)
    .optional()
    .default(5)
    .describe("Maximum number of results to return (1-20)"),
  contentType: z
    .enum([
      "transcription",
      "summary",
      "task",
      "knowledge_document",
      "project_template",
      "organization_instructions",
    ])
    .optional()
    .describe(
      "Filter results by content type. Use 'summary' to find recording summaries, 'transcription' for transcript chunks, 'task' for action items."
    ),
  recordingId: z
    .string()
    .uuid()
    .optional()
    .describe(
      "Filter results to a specific recording by its ID. Combine with contentType for precise results."
    ),
  useHybrid: z
    .boolean()
    .optional()
    .default(true)
    .describe("Use hybrid search combining vector and keyword matching"),
  useReranking: z
    .boolean()
    .optional()
    .default(true)
    .describe("Use cross-encoder re-ranking for improved relevance"),
}),
```

Update the `execute` function to build filters from the new parameters:

```typescript
execute: async ({ query, limit, contentType, recordingId, useHybrid, useReranking }) => {
  try {
    // Build additional filters from parameters
    const filters: Record<string, unknown> = {};
    if (contentType) {
      filters.contentType = contentType;
    }
    if (recordingId) {
      filters.documentId = recordingId;
    }

    const result = await ragSearchTool.execute({
      query,
      limit,
      useHybrid,
      useReranking,
      organizationId: ctx.organizationId,
      projectId: ctx.projectId,
      filters,
    });
    // ... rest unchanged
```

**Step 2: Verify no type errors**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -i "search-knowledge" | head -10`

**Step 3: Commit**

```bash
git add apps/web/src/server/services/tools/search-knowledge.tool.ts
git commit -m "feat(chat): add contentType and recordingId filters to searchKnowledge tool"
```

---

### Task 4: Update system prompts with tool-chaining guidance

**Files:**
- Modify: `apps/web/src/server/services/prompt-builder.service.ts`

**Step 1: Update the project-level system prompt**

In `PromptBuilder.Chat.buildBaseSystemPrompt`, update the project-level prompt (the `return` at the bottom, starting around line 685). Replace the `Available Tools:` and `Tool Usage Guidelines:` sections with:

```
Available Tools:
You have access to tools that let you look up live data. Use them to answer the user's questions.

- searchKnowledge: Semantic search across the knowledge base (transcriptions, summaries, tasks, documents). Supports contentType filter ('summary', 'transcription', 'task') and recordingId filter. Use this as your PRIMARY tool for broad questions about meeting content, discussions, or decisions.
- getRecordingDetails: Get a specific recording's summary, tasks, topics, and decisions by recording ID. Use this INSTEAD of searchKnowledge when you already know which recording the user is asking about. This is the BEST tool for "give me the summary of recording X" type questions.
- listProjects: Lists projects with their status and recording counts. Use when the user asks about projects or you need a project ID for another tool.
- listRecordings: Lists recordings in this project with optional title search. Returns recordings sorted by date (newest first). Use when the user asks about specific recordings, wants recent recordings, or needs a recording list.
- listTasks: Lists tasks with filters for status, priority, and project. Use when the user asks about action items, todos, task progress, or assignments.

Tool Usage Guidelines:
- For "latest recording" or "most recent" questions: FIRST call listRecordings to find the most recent recording, THEN call getRecordingDetails with its ID.
- For "summary of recording X": Use getRecordingDetails with the recording ID. Do NOT use searchKnowledge for this.
- For broad topic searches ("what was discussed about X"): Use searchKnowledge, optionally with contentType filter.
- For finding specific content types: Use searchKnowledge with contentType='summary' or contentType='task' to narrow results.
- You may chain multiple tools in sequence when needed (e.g., listProjects -> listRecordings -> getRecordingDetails).
- Keep tool calls focused: use specific filters and search terms rather than broad unfiltered queries.
- For simple greetings or general questions that don't require data, respond directly without using tools.
```

**Step 2: Update the organization-level system prompt**

In the same method, update the org-level prompt (the `if (isOrgLevel)` block starting around line 643). Replace the `Available Tools:` and `Tool Usage Guidelines:` sections with:

```
Available Tools:
You have access to tools that let you look up live data. Use them to answer the user's questions.

- searchKnowledge: Semantic search across the entire knowledge base (transcriptions, summaries, tasks, documents). Supports contentType filter ('summary', 'transcription', 'task') and recordingId filter. Use this as your PRIMARY tool for broad questions about meeting content, discussions, or decisions.
- getRecordingDetails: Get a specific recording's summary, tasks, topics, and decisions by recording ID. Use this INSTEAD of searchKnowledge when you already know which recording the user is asking about.
- listProjects: Lists projects with their status and recording counts. Use when the user asks "what projects do I have?", wants an overview, or you need a project ID for another tool.
- listRecordings: Lists recordings with optional title search and project filter. Returns recordings sorted by date (newest first). Use when the user asks about specific recordings, wants recent recordings, or needs a recording list.
- listTasks: Lists tasks with filters for status, priority, and project. Use when the user asks about action items, todos, task progress, or assignments.

Tool Usage Guidelines:
- For "latest recording in project X": FIRST call listProjects to resolve the project name to an ID, THEN call listRecordings with that projectId to find the most recent recording, THEN call getRecordingDetails with its ID.
- For "summary of recording X": Use getRecordingDetails with the recording ID. Do NOT use searchKnowledge for this.
- For broad topic searches ("what was discussed about X across projects"): Use searchKnowledge, optionally with contentType filter.
- For finding specific content types: Use searchKnowledge with contentType='summary' or contentType='task' to narrow results.
- You may chain multiple tools in sequence when needed. The step limit is generous — use as many tool calls as needed to answer thoroughly.
- Keep tool calls focused: use specific filters and search terms rather than broad unfiltered queries.
- For simple greetings or general questions that don't require data, respond directly without using tools.
```

**Step 3: Verify no type errors**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -i "prompt-builder" | head -10`

**Step 4: Commit**

```bash
git add apps/web/src/server/services/prompt-builder.service.ts
git commit -m "feat(chat): improve system prompts with tool-chaining guidance and new tool docs"
```

---

### Task 5: Increase `stepCountIs` from 3 to 10

**Files:**
- Modify: `apps/web/src/server/services/chat.service.ts`

**Step 1: Update all `stepCountIs(3)` calls to `stepCountIs(10)`**

There are two occurrences — one in `streamResponse` (project-level, around line 621) and one in `streamOrganizationResponse` (org-level, around line 894). Change both:

```typescript
// Before:
stopWhen: stepCountIs(3),

// After:
stopWhen: stepCountIs(10),
```

**Step 2: Verify no type errors**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -i "chat.service" | head -10`

**Step 3: Commit**

```bash
git add apps/web/src/server/services/chat.service.ts
git commit -m "feat(chat): increase step count limit from 3 to 10 for multi-step tool chains"
```

---

### Task 6: Update source extraction to handle new tool

**Files:**
- Modify: `apps/web/src/server/services/tools/index.ts`

**Step 1: Update `extractSourcesFromToolResults` to also extract sources from `getRecordingDetails`**

Add handling for the new tool after the existing `searchKnowledge` handling:

```typescript
for (const tc of toolCalls) {
  if (tc.toolName === "searchKnowledge") {
    // ... existing code unchanged ...
  }

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
}
```

**Step 2: Verify no type errors**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -i "tools/index" | head -10`

**Step 3: Commit**

```bash
git add apps/web/src/server/services/tools/index.ts
git commit -m "feat(chat): extract sources from getRecordingDetails tool results"
```

---

### Task 7: Verify full build passes

**Step 1: Run typecheck**

Run: `cd apps/web && pnpm run typecheck`
Expected: Clean pass

**Step 2: Run lint**

Run: `cd apps/web && pnpm lint`
Expected: No new warnings/errors introduced

**Step 3: Run build**

Run: `pnpm build`
Expected: Clean build

**Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any build/lint issues from RAG improvements"
```
