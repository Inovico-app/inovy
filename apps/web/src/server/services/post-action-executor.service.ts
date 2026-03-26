import { randomBytes, createHash } from "node:crypto";
import { err, ok } from "neverthrow";
import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { sendEmailFromTemplate } from "@/emails/client";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { MeetingPostActionsQueries } from "@/server/data-access/meeting-post-actions.queries";
import { MeetingShareTokensQueries } from "@/server/data-access/meeting-share-tokens.queries";
import { MeetingsQueries } from "@/server/data-access/meetings.queries";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { type MeetingPostAction } from "@/server/db/schema/meeting-post-actions";
import { type Meeting } from "@/server/db/schema/meetings";
import SummaryEmail from "@/emails/templates/summary-email";

export class PostActionExecutorService {
  /**
   * Execute all pending post-actions for a meeting
   */
  static async executePostActions(
    meetingId: string,
    organizationId: string,
  ): Promise<ActionResult<{ executed: number; failed: number }>> {
    try {
      const meeting = await MeetingsQueries.findById(meetingId, organizationId);
      if (!meeting) {
        return err(ActionErrors.notFound("Meeting"));
      }

      const pendingActions =
        await MeetingPostActionsQueries.findPendingByMeetingId(meetingId);
      let executed = 0;
      let failed = 0;

      for (const action of pendingActions) {
        const result = await this.executeAction(action, meeting);
        if (result.isOk()) {
          executed++;
        } else {
          failed++;
        }
      }

      logger.info("Post-actions execution completed", {
        component: "PostActionExecutorService",
        meetingId,
        executed,
        failed,
      });

      return ok({ executed, failed });
    } catch (error) {
      logger.error(
        "Failed to execute post-actions",
        {
          component: "PostActionExecutorService",
          meetingId,
        },
        error as Error,
      );
      return err(
        ActionErrors.internal("Failed to execute post-actions", error),
      );
    }
  }

  private static async executeAction(
    action: MeetingPostAction,
    meeting: Meeting,
  ): Promise<ActionResult<void>> {
    await MeetingPostActionsQueries.update(action.id, { status: "running" });

    try {
      switch (action.type) {
        case "send_summary_email":
          await this.executeSendSummaryEmail(meeting, action);
          break;
        case "create_tasks":
          await this.executeCreateTasks(meeting, action);
          break;
        case "share_recording":
          await this.executeShareRecording(meeting, action);
          break;
        case "generate_followup_agenda":
          await this.executeGenerateFollowup(meeting, action);
          break;
        case "push_external":
          await this.executePushExternal(meeting, action);
          break;
      }

      await MeetingPostActionsQueries.update(action.id, {
        status: "completed",
        executedAt: new Date(),
      });

      return ok(undefined);
    } catch (error) {
      logger.error(
        "Post-action execution failed",
        {
          component: "PostActionExecutorService",
          actionId: action.id,
          actionType: action.type,
        },
        error as Error,
      );

      await MeetingPostActionsQueries.update(action.id, {
        status: "failed",
        result: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      return err(
        ActionErrors.internal(`Post-action ${action.type} failed`, error),
      );
    }
  }

  // --- Individual action implementations (stubs to be fleshed out) ---

  private static async executeSendSummaryEmail(
    meeting: Meeting,
    _action: MeetingPostAction,
  ): Promise<void> {
    const recording = await RecordingsQueries.selectRecordingByMeetingId(
      meeting.id,
    );
    if (!recording) {
      logger.warn("No recording found for meeting, skipping summary email", {
        component: "PostActionExecutorService",
        meetingId: meeting.id,
      });
      return;
    }

    const [summaryInsight, actionItemsInsight, decisionsInsight] =
      await Promise.all([
        AIInsightsQueries.getInsightByType(recording.id, "summary"),
        AIInsightsQueries.getInsightByType(recording.id, "action_items"),
        AIInsightsQueries.getInsightByType(recording.id, "decisions"),
      ]);

    const summary =
      (summaryInsight?.content as { text?: string })?.text ??
      "Geen samenvatting beschikbaar.";

    const actionItems: { text: string; assignee?: string }[] = [];
    if (actionItemsInsight?.content) {
      const items = (actionItemsInsight.content as { items?: unknown[] })
        ?.items;
      if (Array.isArray(items)) {
        for (const item of items) {
          const typed = item as { text?: string; assignee?: string };
          if (typed.text) {
            actionItems.push({
              text: typed.text,
              assignee: typed.assignee,
            });
          }
        }
      }
    }

    const decisions: string[] = [];
    if (decisionsInsight?.content) {
      const items = (decisionsInsight.content as { items?: unknown[] })?.items;
      if (Array.isArray(items)) {
        for (const item of items) {
          const text =
            typeof item === "string" ? item : (item as { text?: string })?.text;
          if (text) {
            decisions.push(text);
          }
        }
      }
    }

    // Generate share token for secure recording link
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await MeetingShareTokensQueries.insert({
      meetingId: meeting.id,
      createdById: meeting.createdById,
      tokenHash,
      expiresAt,
      requiresAuth: true,
      requiresOrgMembership: true,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const recordingUrl = `${appUrl}/meetings/${meeting.id}?token=${rawToken}`;

    // Get participant emails
    const participantEmails = (meeting.participants ?? [])
      .map((p) => p.email)
      .filter(Boolean);

    if (participantEmails.length === 0) {
      logger.warn("No participant emails found, skipping summary email", {
        component: "PostActionExecutorService",
        meetingId: meeting.id,
      });
      return;
    }

    const result = await sendEmailFromTemplate({
      to: participantEmails,
      subject: `Samenvatting: ${meeting.title}`,
      react: SummaryEmail({
        meetingTitle: meeting.title,
        summary,
        actionItems,
        decisions,
        recordingUrl,
      }),
    });

    if (!result.success) {
      throw new Error(`Failed to send summary email: ${result.error}`);
    }

    logger.info("Summary email sent", {
      component: "PostActionExecutorService",
      meetingId: meeting.id,
      recipients: participantEmails.length,
      messageId: result.messageId,
    });
  }

  private static async executeCreateTasks(
    meeting: Meeting,
    _action: MeetingPostAction,
  ): Promise<void> {
    // TODO: Implement
    // 1. Get AI-extracted tasks from recording workflow
    // 2. Fuzzy match assignees to participants
    // 3. Create tasks linked to meeting's project
    logger.info("Create tasks - not yet implemented", {
      component: "PostActionExecutorService",
      meetingId: meeting.id,
    });
  }

  private static async executeShareRecording(
    meeting: Meeting,
    _action: MeetingPostAction,
  ): Promise<void> {
    // TODO: Implement
    // 1. Generate meeting_share_token (requiresAuth, requiresOrgMembership, 30 day expiry)
    // 2. Send notification/email with secure link
    logger.info("Share recording - not yet implemented", {
      component: "PostActionExecutorService",
      meetingId: meeting.id,
    });
  }

  private static async executeGenerateFollowup(
    meeting: Meeting,
    _action: MeetingPostAction,
  ): Promise<void> {
    // TODO: Implement
    // 1. Get transcript + uncovered agenda items + action items
    // 2. LLM generates follow-up agenda
    // 3. Create new meeting in draft status with pre-populated agenda
    // 4. Send notification
    logger.info("Generate followup - not yet implemented", {
      component: "PostActionExecutorService",
      meetingId: meeting.id,
    });
  }

  private static async executePushExternal(
    meeting: Meeting,
    _action: MeetingPostAction,
  ): Promise<void> {
    // TODO: Implement
    // 1. Read config for provider (slack / google_docs)
    // 2. Call provider-specific API
    logger.info("Push external - not yet implemented", {
      component: "PostActionExecutorService",
      meetingId: meeting.id,
    });
  }
}
