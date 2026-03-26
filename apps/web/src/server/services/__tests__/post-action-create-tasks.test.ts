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

vi.mock("@/emails/client", () => ({
  sendEmailFromTemplate: vi.fn(),
}));

import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { TasksQueries } from "@/server/data-access/tasks.queries";
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
  title: "Sprint Planning",
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
  id: "action-2",
  meetingId: "meeting-1",
  type: "create_tasks",
  config: {},
  status: "pending",
  result: null,
  executedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("PostActionExecutorService.executeCreateTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates tasks from AI action items with assignee matching", async () => {
    vi.mocked(RecordingsQueries.selectRecordingByMeetingId).mockResolvedValue({
      id: "rec-1",
    } as never);

    vi.mocked(AIInsightsQueries.getInsightByType).mockResolvedValue({
      content: {
        items: [
          { text: "Rapport afronden", assignee: "Jan", confidence: 0.92 },
          {
            text: "Budget indienen",
            assignee: "Maria",
            priority: "high",
            confidence: 0.87,
          },
        ],
      },
    } as never);

    vi.mocked(TasksQueries.createTask).mockResolvedValue({} as never);

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

    // Verify 2 tasks were created
    expect(TasksQueries.createTask).toHaveBeenCalledTimes(2);

    // First task: assignee matched to "Jan de Vries"
    expect(TasksQueries.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        recordingId: "rec-1",
        projectId: "project-1",
        organizationId: "org-1",
        title: "Rapport afronden",
        assigneeName: "Jan de Vries",
        priority: "medium",
        confidenceScore: 0.92,
        status: "pending",
      }),
    );

    // Second task: high priority preserved, assignee matched
    expect(TasksQueries.createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Budget indienen",
        assigneeName: "Maria Bakker",
        priority: "high",
        confidenceScore: 0.87,
      }),
    );
  });

  it("skips when no recording exists", async () => {
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

    await PostActionExecutorService.executePostActions("meeting-1", "org-1");

    expect(TasksQueries.createTask).not.toHaveBeenCalled();
  });

  it("skips when meeting has no project", async () => {
    const meetingNoProject = { ...mockMeeting, projectId: null };

    vi.mocked(RecordingsQueries.selectRecordingByMeetingId).mockResolvedValue({
      id: "rec-1",
    } as never);

    const { MeetingPostActionsQueries } =
      await import("@/server/data-access/meeting-post-actions.queries");
    const { MeetingsQueries } =
      await import("@/server/data-access/meetings.queries");

    vi.mocked(MeetingsQueries.findById).mockResolvedValue(meetingNoProject);
    vi.mocked(
      MeetingPostActionsQueries.findPendingByMeetingId,
    ).mockResolvedValue([mockAction]);
    vi.mocked(MeetingPostActionsQueries.update).mockResolvedValue(
      undefined as never,
    );

    await PostActionExecutorService.executePostActions("meeting-1", "org-1");

    expect(TasksQueries.createTask).not.toHaveBeenCalled();
  });
});
