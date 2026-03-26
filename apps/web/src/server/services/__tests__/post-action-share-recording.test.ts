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

vi.mock("@/server/data-access/tasks.queries", () => ({
  TasksQueries: {
    createTask: vi.fn(),
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

vi.mock("@/server/services/notification.service", () => ({
  NotificationService: {
    createNotification: vi.fn(),
  },
}));

vi.mock("@/emails/client", () => ({
  sendEmailFromTemplate: vi.fn(),
}));

import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { MeetingShareTokensQueries } from "@/server/data-access/meeting-share-tokens.queries";
import { NotificationService } from "@/server/services/notification.service";
import { PostActionExecutorService } from "../post-action-executor.service";
import type { Meeting } from "@/server/db/schema/meetings";
import type { MeetingPostAction } from "@/server/db/schema/meeting-post-actions";
import { ok } from "neverthrow";

const mockMeeting: Meeting = {
  id: "meeting-1",
  organizationId: "org-1",
  projectId: "project-1",
  teamId: null,
  createdById: "user-1",
  calendarEventId: null,
  externalCalendarId: null,
  title: "Sprint Review",
  description: null,
  scheduledStartAt: new Date("2026-04-01T09:00:00Z"),
  scheduledEndAt: new Date("2026-04-01T10:00:00Z"),
  actualStartAt: null,
  actualEndAt: null,
  status: "completed",
  meetingUrl: null,
  participants: [],
  lastAgendaCheckAt: null,
  lastTranscriptLength: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAction: MeetingPostAction = {
  id: "action-3",
  meetingId: "meeting-1",
  type: "share_recording",
  config: {},
  status: "pending",
  result: null,
  executedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("PostActionExecutorService.executeShareRecording", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://app.inovy.nl";
  });

  it("creates share token and sends notification", async () => {
    vi.mocked(RecordingsQueries.selectRecordingByMeetingId).mockResolvedValue({
      id: "rec-1",
    } as never);
    vi.mocked(MeetingShareTokensQueries.insert).mockResolvedValue({} as never);
    vi.mocked(NotificationService.createNotification).mockResolvedValue(
      ok({}) as never,
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

    // Verify share token was created with correct params
    expect(MeetingShareTokensQueries.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meetingId: "meeting-1",
        createdById: "user-1",
        requiresAuth: true,
        requiresOrgMembership: true,
      }),
    );

    // Verify notification was sent to meeting creator
    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        organizationId: "org-1",
        recordingId: "rec-1",
        type: "recording_processed",
        title: "Opname beschikbaar",
      }),
    );
  });

  it("works even without a recording (share token still created)", async () => {
    vi.mocked(RecordingsQueries.selectRecordingByMeetingId).mockResolvedValue(
      null,
    );
    vi.mocked(MeetingShareTokensQueries.insert).mockResolvedValue({} as never);
    vi.mocked(NotificationService.createNotification).mockResolvedValue(
      ok({}) as never,
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
    expect(MeetingShareTokensQueries.insert).toHaveBeenCalled();
    expect(NotificationService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recordingId: null,
      }),
    );
  });
});
