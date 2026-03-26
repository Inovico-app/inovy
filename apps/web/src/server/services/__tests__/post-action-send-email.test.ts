import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/server/data-access/recordings.queries", () => ({
  RecordingsQueries: {
    selectRecordingByMeetingId: vi.fn(),
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

vi.mock("@/emails/client", () => ({
  sendEmailFromTemplate: vi.fn(),
}));

import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { MeetingShareTokensQueries } from "@/server/data-access/meeting-share-tokens.queries";
import { sendEmailFromTemplate } from "@/emails/client";
import { PostActionExecutorService } from "../post-action-executor.service";
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
  title: "Weekoverleg Team Alpha",
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

const mockAction: MeetingPostAction = {
  id: "action-1",
  meetingId: "meeting-1",
  type: "send_summary_email",
  config: {},
  status: "pending",
  result: null,
  executedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("PostActionExecutorService.executeSendSummaryEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://app.inovy.nl";
  });

  it("sends summary email to all participants with correct content", async () => {
    const mockRecording = { id: "rec-1", meetingId: "meeting-1" };

    vi.mocked(RecordingsQueries.selectRecordingByMeetingId).mockResolvedValue(
      mockRecording as never,
    );

    vi.mocked(AIInsightsQueries.getInsightByType).mockImplementation(
      async (_recId, type) => {
        if (type === "summary") {
          return {
            content: { text: "Het team heeft de voortgang besproken." },
          } as never;
        }
        if (type === "action_items") {
          return {
            content: {
              items: [
                { text: "Rapport afronden", assignee: "Jan" },
                { text: "Budget indienen", assignee: "Maria" },
              ],
            },
          } as never;
        }
        if (type === "decisions") {
          return {
            content: {
              items: [{ text: "We gaan door met optie B" }],
            },
          } as never;
        }
        return null;
      },
    );

    vi.mocked(MeetingShareTokensQueries.insert).mockResolvedValue({} as never);

    vi.mocked(sendEmailFromTemplate).mockResolvedValue({
      success: true,
      messageId: "msg-123",
    });

    // Call the private method via the public executePostActions path
    // We need to test through the public API
    const { MeetingPostActionsQueries } =
      await import("@/server/data-access/meeting-post-actions.queries");
    const { MeetingsQueries } =
      await import("@/server/data-access/meetings.queries");

    vi.mocked(MeetingsQueries.findById).mockResolvedValue(mockMeeting);
    vi.mocked(
      MeetingPostActionsQueries.findPendingByMeetingId,
    ).mockResolvedValue([mockAction]);
    vi.mocked(MeetingPostActionsQueries.update).mockResolvedValue(
      undefined as never,
    );

    const result = await PostActionExecutorService.executePostActions(
      "meeting-1",
      "org-1",
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.executed).toBe(1);
      expect(result.value.failed).toBe(0);
    }

    // Verify recording was fetched by meetingId
    expect(RecordingsQueries.selectRecordingByMeetingId).toHaveBeenCalledWith(
      "meeting-1",
    );

    // Verify AI insights were fetched
    expect(AIInsightsQueries.getInsightByType).toHaveBeenCalledWith(
      "rec-1",
      "summary",
    );
    expect(AIInsightsQueries.getInsightByType).toHaveBeenCalledWith(
      "rec-1",
      "action_items",
    );
    expect(AIInsightsQueries.getInsightByType).toHaveBeenCalledWith(
      "rec-1",
      "decisions",
    );

    // Verify share token was created
    expect(MeetingShareTokensQueries.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingId: "meeting-1",
        createdById: "user-1",
        requiresAuth: true,
        requiresOrgMembership: true,
      }),
    );

    // Verify email was sent to both participants
    expect(sendEmailFromTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["jan@example.nl", "maria@example.nl"],
        subject: "Samenvatting: Weekoverleg Team Alpha",
      }),
    );
  });

  it("skips sending when no recording exists", async () => {
    vi.mocked(RecordingsQueries.selectRecordingByMeetingId).mockResolvedValue(
      null,
    );

    const { MeetingPostActionsQueries } =
      await import("@/server/data-access/meeting-post-actions.queries");
    const { MeetingsQueries } =
      await import("@/server/data-access/meetings.queries");

    vi.mocked(MeetingsQueries.findById).mockResolvedValue(mockMeeting);
    vi.mocked(
      MeetingPostActionsQueries.findPendingByMeetingId,
    ).mockResolvedValue([mockAction]);
    vi.mocked(MeetingPostActionsQueries.update).mockResolvedValue(
      undefined as never,
    );

    const result = await PostActionExecutorService.executePostActions(
      "meeting-1",
      "org-1",
    );

    expect(result.isOk()).toBe(true);
    expect(sendEmailFromTemplate).not.toHaveBeenCalled();
  });

  it("skips sending when no participant emails exist", async () => {
    const meetingNoParticipants = {
      ...mockMeeting,
      participants: [],
    };

    vi.mocked(RecordingsQueries.selectRecordingByMeetingId).mockResolvedValue({
      id: "rec-1",
    } as never);
    vi.mocked(AIInsightsQueries.getInsightByType).mockResolvedValue(null);
    vi.mocked(MeetingShareTokensQueries.insert).mockResolvedValue({} as never);

    const { MeetingPostActionsQueries } =
      await import("@/server/data-access/meeting-post-actions.queries");
    const { MeetingsQueries } =
      await import("@/server/data-access/meetings.queries");

    vi.mocked(MeetingsQueries.findById).mockResolvedValue(
      meetingNoParticipants,
    );
    vi.mocked(
      MeetingPostActionsQueries.findPendingByMeetingId,
    ).mockResolvedValue([mockAction]);
    vi.mocked(MeetingPostActionsQueries.update).mockResolvedValue(
      undefined as never,
    );

    const result = await PostActionExecutorService.executePostActions(
      "meeting-1",
      "org-1",
    );

    expect(result.isOk()).toBe(true);
    expect(sendEmailFromTemplate).not.toHaveBeenCalled();
  });
});
