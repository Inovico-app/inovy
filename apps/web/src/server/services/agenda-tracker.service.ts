import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { MeetingAgendaItemsQueries } from "@/server/data-access/meeting-agenda-items.queries";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { type MeetingAgendaItem } from "@/server/db/schema/meeting-agenda-items";
import { type Meeting } from "@/server/db/schema/meetings";
import { generateObject } from "ai";
import { err, ok } from "neverthrow";
import { z } from "zod";
import { connectionPool } from "./connection-pool.service";
import { RecallApiService } from "./recall-api.service";

const agendaCheckResultSchema = z.object({
  items: z.array(
    z.object({
      agendaItemId: z.string(),
      covered: z.boolean(),
      summary: z.string(),
      keyPoints: z.array(z.string()),
    }),
  ),
});

export class AgendaTrackerService {
  /**
   * Check a single meeting's agenda against its live transcript
   */
  static async checkMeetingAgenda(
    meeting: Meeting,
    recallBotId: string,
  ): Promise<ActionResult<{ newlyCovered: number }>> {
    try {
      // 1. Fetch transcript from Recall.ai
      const transcriptResult =
        await RecallApiService.getTranscript(recallBotId);
      if (transcriptResult.isErr()) {
        return err(transcriptResult.error);
      }

      // 2. Flatten transcript to plain text
      const transcriptText = transcriptResult.value.transcript
        .map((segment) => {
          const words = segment.words.map((w) => w.text).join(" ");
          return `${segment.speaker}: ${words}`;
        })
        .join("\n");

      // 3. Skip if transcript hasn't grown since last check
      if (transcriptText.length <= meeting.lastTranscriptLength) {
        return ok({ newlyCovered: 0 });
      }

      // 4. Skip if too short since last check
      const newContent = transcriptText.slice(meeting.lastTranscriptLength);
      const wordCount = newContent.split(/\s+/).length;
      if (wordCount < 100) {
        return ok({ newlyCovered: 0 });
      }

      // 5. Get all agenda items (single query), derive unchecked subset
      const allItems = await MeetingAgendaItemsQueries.findByMeetingId(
        meeting.id,
      );
      const uncheckedItems = allItems.filter(
        (item) => item.status === "pending" || item.status === "in_progress",
      );
      if (uncheckedItems.length === 0) {
        return ok({ newlyCovered: 0 });
      }

      // 6. LLM analysis
      const result = await this.analyzeTranscript(
        transcriptText,
        uncheckedItems,
      );

      if (result.isErr()) {
        return err(result.error);
      }

      // 7. Update covered items in parallel
      const coveredResults = await Promise.all(
        result.value.items
          .filter((itemResult) => itemResult.covered)
          .map((itemResult) =>
            MeetingAgendaItemsQueries.update(
              itemResult.agendaItemId,
              meeting.id,
              {
                status: "covered",
                coveredAt: new Date(),
                aiSummary: itemResult.summary,
                aiKeyPoints: itemResult.keyPoints,
              },
            ),
          ),
      );
      const coveredItems = coveredResults.filter(
        (item): item is MeetingAgendaItem => item !== null,
      );

      // 8. Send chat message if items were newly covered
      if (coveredItems.length > 0) {
        const message = this.composeChatMessage(allItems, coveredItems);
        const sendResult = await RecallApiService.sendChatMessage(
          recallBotId,
          message,
        );
        if (sendResult.isErr()) {
          logger.warn("Failed to send agenda update chat message", {
            component: "AgendaTrackerService",
            meetingId: meeting.id,
            error: sendResult.error.message,
          });
        }
      }

      // 9. Update meeting tracking fields
      await MeetingsQueries.update(meeting.id, meeting.organizationId, {
        lastAgendaCheckAt: new Date(),
        lastTranscriptLength: transcriptText.length,
      });

      return ok({ newlyCovered: coveredItems.length });
    } catch (error) {
      logger.error(
        "Failed to check meeting agenda",
        {
          component: "AgendaTrackerService",
          meetingId: meeting.id,
        },
        error as Error,
      );
      return err(
        ActionErrors.internal("Failed to check meeting agenda", error),
      );
    }
  }

  private static async analyzeTranscript(
    transcript: string,
    uncheckedItems: MeetingAgendaItem[],
  ): Promise<ActionResult<z.infer<typeof agendaCheckResultSchema>>> {
    try {
      const itemsList = uncheckedItems
        .map(
          (item, i) =>
            `${i + 1}. [ID: ${item.id}] ${item.title}${item.description ? ` - ${item.description}` : ""}`,
        )
        .join("\n");

      const { object } = await connectionPool.executeWithRetry(
        () =>
          connectionPool.withAnthropicAISdkClient(async (anthropic) =>
            generateObject({
              model: anthropic("claude-sonnet-4-6"),
              schema: agendaCheckResultSchema,
              prompt: `You are analyzing a live meeting transcript to determine which agenda items have been discussed and covered.

Agenda items to check:
${itemsList}

Transcript:
${transcript}

For each agenda item, determine:
- covered: has this topic been substantively discussed (not just a passing mention)?
- summary: 1-2 sentence summary of what was discussed (empty string if not covered)
- keyPoints: bullet points of key decisions/takeaways (empty array if not covered)

Use the exact agendaItemId from the list above. Only mark items as covered if there was meaningful discussion.`,
            }),
          ),
        "anthropic",
      );

      return ok(object);
    } catch (error) {
      logger.error(
        "Failed to analyze transcript with LLM",
        { component: "AgendaTrackerService" },
        error as Error,
      );
      return err(ActionErrors.internal("Failed to analyze transcript", error));
    }
  }

  private static composeChatMessage(
    allItems: MeetingAgendaItem[],
    newlyCoveredItems: MeetingAgendaItem[],
  ): string {
    const coveredCount = allItems.filter(
      (item) =>
        item.status === "covered" ||
        newlyCoveredItems.some((c) => c.id === item.id),
    ).length;
    const totalCount = allItems.length;

    let message = `Meeting Progress: ${coveredCount}/${totalCount} agenda items covered\n\n`;

    for (const item of newlyCoveredItems) {
      message += `${item.title}`;
      if (item.aiKeyPoints && item.aiKeyPoints.length > 0) {
        message += ` -- Key points: ${item.aiKeyPoints.join(". ")}.`;
      }
      message += "\n\n";
    }

    const remaining = allItems.filter(
      (item) =>
        item.status !== "covered" &&
        item.status !== "skipped" &&
        !newlyCoveredItems.some((c) => c.id === item.id),
    );

    if (remaining.length > 0) {
      message += `Remaining: ${remaining.map((item) => item.title).join(", ")}`;
    }

    return message.trim();
  }
}
