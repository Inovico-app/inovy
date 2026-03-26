/**
 * Integration tests for the recording → AI insights pipeline.
 *
 * These tests validate the wiring between components rather than
 * testing through the workflow runtime (which requires a DB connection).
 * Each test verifies that data flows correctly between steps.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Post-action executor tests ---

vi.mock("@/server/data-access/recordings.queries", () => ({
  RecordingsQueries: {
    selectRecordingByMeetingId: vi.fn(),
    selectRecordingById: vi.fn(),
  },
}));

vi.mock("@/server/data-access/ai-insights.queries", () => ({
  AIInsightsQueries: {
    getInsightByType: vi.fn(),
  },
}));

vi.mock("@/server/data-access/meeting-share-tokens.queries", () => ({
  MeetingShareTokensQueries: {
    insert: vi.fn(),
  },
}));

vi.mock("@/server/data-access/meeting-post-actions.queries", () => ({
  MeetingPostActionsQueries: {
    findPendingByMeetingId: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/server/data-access/meetings.queries", () => ({
  MeetingsQueries: {
    findById: vi.fn(),
  },
}));

vi.mock("@/server/data-access/tasks.queries", () => ({
  TasksQueries: {
    createTask: vi.fn(),
  },
}));

vi.mock("@/server/services/notification.service", () => ({
  NotificationService: {
    createNotification: vi.fn(),
  },
}));

vi.mock("@/emails/client", () => ({
  sendEmailFromTemplate: vi.fn(),
}));

import { ok } from "neverthrow";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { MeetingShareTokensQueries } from "@/server/data-access/meeting-share-tokens.queries";
import { TasksQueries } from "@/server/data-access/tasks.queries";
import { NotificationService } from "@/server/services/notification.service";
import { sendEmailFromTemplate } from "@/emails/client";
import { PostActionExecutorService } from "@/server/services/post-action-executor.service";
import type { Meeting } from "@/server/db/schema/meetings";
import type { MeetingPostAction } from "@/server/db/schema/meeting-post-actions";

const mockMeeting: Meeting = {
  id: "meeting-1",
  organizationId: "org-1",
  projectId: "project-1",
  teamId: null,
  createdById: "user-1",
  calendarEventId: null,
  externalCalendarId: null,
  title: "Sprint Planning Q2",
  description: null,
  scheduledStartAt: new Date("2026-04-01T09:00:00Z"),
  scheduledEndAt: new Date("2026-04-01T10:00:00Z"),
  actualStartAt: null,
  actualEndAt: null,
  status: "completed",
  meetingUrl: null,
  participants: [
    { email: "jan@example.nl", name: "Jan de Vries", role: null },
    { email: "maria@example.nl", name: "Maria Bakker", role: null },
  ],
  lastAgendaCheckAt: null,
  lastTranscriptLength: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Pipeline integration: all 3 post-actions execute for a single meeting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://app.inovy.nl";
  });

  it("executes send_summary_email, create_tasks, and share_recording in sequence", async () => {
    const pendingActions: MeetingPostAction[] = [
      {
        id: "action-1",
        meetingId: "meeting-1",
        type: "send_summary_email",
        config: {},
        status: "pending",
        result: null,
        executedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "action-2",
        meetingId: "meeting-1",
        type: "create_tasks",
        config: {},
        status: "pending",
        result: null,
        executedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "action-3",
        meetingId: "meeting-1",
        type: "share_recording",
        config: {},
        status: "pending",
        result: null,
        executedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Meeting lookup
    const { MeetingsQueries } =
      await import("@/server/data-access/meetings.queries");
    const { MeetingPostActionsQueries } =
      await import("@/server/data-access/meeting-post-actions.queries");

    vi.mocked(MeetingsQueries.findById).mockResolvedValue(mockMeeting);
    vi.mocked(
      MeetingPostActionsQueries.findPendingByMeetingId,
    ).mockResolvedValue(pendingActions);
    vi.mocked(MeetingPostActionsQueries.update).mockResolvedValue(
      undefined as never,
    );

    // Recording for all 3 actions
    vi.mocked(RecordingsQueries.selectRecordingByMeetingId).mockResolvedValue({
      id: "rec-1",
      meetingId: "meeting-1",
      projectId: "project-1",
      organizationId: "org-1",
    } as never);

    // AI insights for send_summary_email and create_tasks
    vi.mocked(AIInsightsQueries.getInsightByType).mockImplementation(
      async (_recId, type) => {
        if (type === "summary") {
          return {
            content: { text: "Sprint planning voor Q2 besproken." },
          } as never;
        }
        if (type === "action_items") {
          return {
            content: {
              items: [
                { text: "API endpoints opzetten", assignee: "Jan" },
                { text: "Database migratie schrijven", assignee: "Maria" },
              ],
            },
          } as never;
        }
        if (type === "decisions") {
          return {
            content: {
              items: [
                { text: "We gebruiken PostgreSQL voor de nieuwe service" },
              ],
            },
          } as never;
        }
        return null;
      },
    );

    // Share token creation (called by both send_summary_email and share_recording)
    vi.mocked(MeetingShareTokensQueries.insert).mockResolvedValue({} as never);

    // Email sending
    vi.mocked(sendEmailFromTemplate).mockResolvedValue({
      success: true,
      messageId: "msg-123",
    });

    // Task creation
    vi.mocked(TasksQueries.createTask).mockResolvedValue({} as never);

    // Notification (for share_recording)
    vi.mocked(NotificationService.createNotification).mockResolvedValue(
      ok({}) as never,
    );

    const result = await PostActionExecutorService.executePostActions(
      "meeting-1",
      "org-1",
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.executed).toBe(3);
      expect(result.value.failed).toBe(0);
    }

    // Verify all 3 actions were marked as running then completed
    expect(MeetingPostActionsQueries.update).toHaveBeenCalledWith("action-1", {
      status: "running",
    });
    expect(MeetingPostActionsQueries.update).toHaveBeenCalledWith(
      "action-1",
      expect.objectContaining({ status: "completed" }),
    );
    expect(MeetingPostActionsQueries.update).toHaveBeenCalledWith("action-2", {
      status: "running",
    });
    expect(MeetingPostActionsQueries.update).toHaveBeenCalledWith(
      "action-2",
      expect.objectContaining({ status: "completed" }),
    );
    expect(MeetingPostActionsQueries.update).toHaveBeenCalledWith("action-3", {
      status: "running",
    });
    expect(MeetingPostActionsQueries.update).toHaveBeenCalledWith(
      "action-3",
      expect.objectContaining({ status: "completed" }),
    );

    // Verify send_summary_email: email sent to participants
    expect(sendEmailFromTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["jan@example.nl", "maria@example.nl"],
        subject: "Samenvatting: Sprint Planning Q2",
      }),
    );

    // Verify create_tasks: 2 tasks created with correct assignees
    expect(TasksQueries.createTask).toHaveBeenCalledTimes(2);
    expect(TasksQueries.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "API endpoints opzetten",
        assigneeName: "Jan de Vries",
        projectId: "project-1",
      }),
    );
    expect(TasksQueries.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Database migratie schrijven",
        assigneeName: "Maria Bakker",
      }),
    );

    // Verify share_recording: notification sent
    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        type: "recording_processed",
      }),
    );

    // Verify share tokens were created (2 total: one from email, one from share)
    expect(MeetingShareTokensQueries.insert).toHaveBeenCalledTimes(2);
  });

  it("marks individual actions as failed without blocking others", async () => {
    const pendingActions: MeetingPostAction[] = [
      {
        id: "action-1",
        meetingId: "meeting-1",
        type: "send_summary_email",
        config: {},
        status: "pending",
        result: null,
        executedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "action-2",
        meetingId: "meeting-1",
        type: "share_recording",
        config: {},
        status: "pending",
        result: null,
        executedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const { MeetingsQueries } =
      await import("@/server/data-access/meetings.queries");
    const { MeetingPostActionsQueries } =
      await import("@/server/data-access/meeting-post-actions.queries");

    vi.mocked(MeetingsQueries.findById).mockResolvedValue(mockMeeting);
    vi.mocked(
      MeetingPostActionsQueries.findPendingByMeetingId,
    ).mockResolvedValue(pendingActions);
    vi.mocked(MeetingPostActionsQueries.update).mockResolvedValue(
      undefined as never,
    );

    // Recording exists
    vi.mocked(RecordingsQueries.selectRecordingByMeetingId).mockResolvedValue({
      id: "rec-1",
    } as never);

    // AI insights exist
    vi.mocked(AIInsightsQueries.getInsightByType).mockResolvedValue({
      content: { text: "Summary text" },
    } as never);

    // Share token works
    vi.mocked(MeetingShareTokensQueries.insert).mockResolvedValue({} as never);

    // Email FAILS
    vi.mocked(sendEmailFromTemplate).mockResolvedValue({
      success: false,
      error: "Resend API rate limited",
    });

    // Notification works (for share_recording)
    vi.mocked(NotificationService.createNotification).mockResolvedValue(
      ok({}) as never,
    );

    const result = await PostActionExecutorService.executePostActions(
      "meeting-1",
      "org-1",
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.executed).toBe(1); // share_recording succeeded
      expect(result.value.failed).toBe(1); // send_summary_email failed
    }

    // Verify failed action was marked with error
    expect(MeetingPostActionsQueries.update).toHaveBeenCalledWith(
      "action-1",
      expect.objectContaining({
        status: "failed",
        result: expect.objectContaining({
          error: expect.stringContaining("Resend API rate limited"),
        }),
      }),
    );

    // Verify share_recording still completed despite email failure
    expect(MeetingPostActionsQueries.update).toHaveBeenCalledWith(
      "action-2",
      expect.objectContaining({ status: "completed" }),
    );
  });
});

// --- step-post-actions wiring verification ---

describe("Pipeline integration: step-post-actions wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("step-post-actions calls PostActionExecutorService when recording has meetingId", async () => {
    vi.mocked(RecordingsQueries.selectRecordingById).mockResolvedValue({
      id: "rec-1",
      meetingId: "meeting-1",
    } as never);

    const { MeetingsQueries } =
      await import("@/server/data-access/meetings.queries");
    const { MeetingPostActionsQueries } =
      await import("@/server/data-access/meeting-post-actions.queries");

    vi.mocked(MeetingsQueries.findById).mockResolvedValue(mockMeeting);
    vi.mocked(
      MeetingPostActionsQueries.findPendingByMeetingId,
    ).mockResolvedValue([]); // No pending actions

    // Import and call the step directly (bypasses "use step" directive)
    const { executePostActionsStep } =
      await import("../steps/step-post-actions");

    await executePostActionsStep("rec-1", "org-1");

    // Verify it looked up the recording
    expect(RecordingsQueries.selectRecordingById).toHaveBeenCalledWith("rec-1");
    // Verify it called the executor with the meeting ID
    expect(MeetingsQueries.findById).toHaveBeenCalledWith("meeting-1", "org-1");
  });

  it("step-post-actions skips when recording has no meetingId", async () => {
    vi.mocked(RecordingsQueries.selectRecordingById).mockResolvedValue({
      id: "rec-1",
      meetingId: null,
    } as never);

    const { MeetingsQueries } =
      await import("@/server/data-access/meetings.queries");

    const { executePostActionsStep } =
      await import("../steps/step-post-actions");

    await executePostActionsStep("rec-1", "org-1");

    // Should NOT attempt to find a meeting or execute post-actions
    expect(MeetingsQueries.findById).not.toHaveBeenCalled();
  });
});
