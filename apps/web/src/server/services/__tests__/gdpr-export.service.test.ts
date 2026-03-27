import { describe, it, expect, vi, beforeEach } from "vitest";
import { ok, err } from "neverthrow";

// ---------------------------------------------------------------------------
// Mocks — must be hoisted before any imports that pull in the real modules
// ---------------------------------------------------------------------------

vi.mock("@/server/services/storage", () => ({
  getStorageProvider: vi.fn().mockResolvedValue({
    put: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/emails/client", () => ({
  sendEmailFromTemplate: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("archiver", () => {
  const EventEmitter = require("events");
  const createFakeArchive = () => {
    const emitter = new EventEmitter();
    let endCallback: (() => void) | undefined;
    const archive = {
      on: (event: string, cb: (...args: unknown[]) => void) => {
        if (event === "end") {
          endCallback = cb as () => void;
        } else {
          emitter.on(event, cb);
        }
        return archive;
      },
      append: vi.fn().mockImplementation(() => {
        // Emit data so the buffer is non-empty
        emitter.emit("data", Buffer.from("mock-zip-data"));
      }),
      finalize: vi.fn().mockImplementation(() => {
        endCallback?.();
      }),
    };
    return archive;
  };

  return {
    default: vi.fn().mockImplementation(() => createFakeArchive()),
  };
});

vi.mock("@/server/data-access/data-exports.queries", () => ({
  DataExportsQueries: {
    createExport: vi.fn(),
    getExportById: vi.fn(),
    getExportsByUserId: vi.fn(),
    updateExportStatus: vi.fn(),
    getExportFileData: vi.fn(),
  },
}));

vi.mock("@/server/data-access/recordings.queries", () => ({
  RecordingsQueries: {
    selectRecordingsByOrganization: vi.fn(),
  },
}));

vi.mock("@/server/data-access/tasks.queries", () => ({
  TasksQueries: {
    getTasksByOrganization: vi.fn(),
  },
}));

vi.mock("@/server/data-access/chat.queries", () => ({
  ChatQueries: {
    getConversationsByOrganizationId: vi.fn(),
    getMessagesByConversationIds: vi.fn(),
  },
}));

vi.mock("@/server/data-access/ai-insights.queries", () => ({
  AIInsightsQueries: {
    getInsightsByRecordingIds: vi.fn(),
  },
}));

vi.mock("@/server/services/user.service", () => ({
  UserService: {
    getUserById: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { GdprExportService } from "../gdpr-export.service";
import { DataExportsQueries } from "@/server/data-access/data-exports.queries";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { TasksQueries } from "@/server/data-access/tasks.queries";
import { ChatQueries } from "@/server/data-access/chat.queries";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { UserService } from "@/server/services/user.service";
import { getStorageProvider } from "@/server/services/storage";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const USER_ID = "user-abc-123";
const ORG_ID = "org-xyz-456";
const EXPORT_ID = "export-111";

function makeExport(overrides: Record<string, unknown> = {}) {
  return {
    id: EXPORT_ID,
    userId: USER_ID,
    organizationId: ORG_ID,
    status: "pending" as const,
    fileData: null,
    blobPath: null,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    fileSize: null,
    recordingsCount: 0,
    tasksCount: 0,
    conversationsCount: 0,
    errorMessage: null,
    createdAt: new Date(),
    completedAt: null,
    ...overrides,
  };
}

function makeUserDto(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: "user@example.com",
    given_name: "Alice",
    family_name: "Smith",
    picture: null,
    emailVerified: true,
    created_on: new Date().toISOString(),
    last_signed_in: undefined,
    ...overrides,
  };
}

function makeRecording(overrides: Record<string, unknown> = {}) {
  return {
    id: "rec-1",
    createdById: USER_ID,
    organizationId: ORG_ID,
    title: "Test Recording",
    description: "A test meeting",
    transcriptionText: "Hello world",
    fileName: "recording.mp4",
    fileSize: 1024,
    fileMimeType: "video/mp4",
    duration: 300,
    recordingDate: new Date("2024-01-15"),
    recordingMode: "remote",
    language: "en",
    status: "active" as const,
    projectId: "proj-1",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    ...overrides,
  };
}

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    title: "Follow up on action items",
    description: "Review the meeting notes",
    priority: "medium",
    status: "open",
    assigneeId: USER_ID,
    createdById: USER_ID,
    organizationId: ORG_ID,
    dueDate: new Date("2024-02-01"),
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    ...overrides,
  };
}

function makeConversation(overrides: Record<string, unknown> = {}) {
  return {
    id: "conv-1",
    title: "Q1 Planning chat",
    context: "recording",
    projectId: null,
    organizationId: ORG_ID,
    userId: USER_ID,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    ...overrides,
  };
}

function makeMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-1",
    conversationId: "conv-1",
    role: "user",
    content: "What were the action items?",
    sources: null,
    createdAt: new Date("2024-01-15"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("GdprExportService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default happy-path stubs
    vi.mocked(UserService.getUserById).mockResolvedValue(ok(makeUserDto()));
    vi.mocked(
      RecordingsQueries.selectRecordingsByOrganization,
    ).mockResolvedValue([]);
    vi.mocked(TasksQueries.getTasksByOrganization).mockResolvedValue([]);
    vi.mocked(ChatQueries.getConversationsByOrganizationId).mockResolvedValue(
      [],
    );
    vi.mocked(ChatQueries.getMessagesByConversationIds).mockResolvedValue([]);
    vi.mocked(AIInsightsQueries.getInsightsByRecordingIds).mockResolvedValue(
      [],
    );
    vi.mocked(DataExportsQueries.updateExportStatus).mockResolvedValue(
      makeExport() as never,
    );
  });

  // -------------------------------------------------------------------------
  // createExportRequest
  // -------------------------------------------------------------------------
  describe("createExportRequest", () => {
    it("creates a pending export record with a 7-day expiry", async () => {
      const now = Date.now();
      vi.mocked(DataExportsQueries.createExport).mockResolvedValue(
        makeExport(),
      );

      const result = await GdprExportService.createExportRequest(
        USER_ID,
        ORG_ID,
      );

      expect(result.isOk()).toBe(true);
      expect(DataExportsQueries.createExport).toHaveBeenCalledTimes(1);

      const callArg = vi.mocked(DataExportsQueries.createExport).mock
        .calls[0]?.[0];
      expect(callArg?.userId).toBe(USER_ID);
      expect(callArg?.organizationId).toBe(ORG_ID);
      expect(callArg?.status).toBe("pending");

      // expiresAt should be approximately 7 days in the future.
      // date-fns addDays uses calendar days (DST-aware), so we allow a ±2 h window.
      const expiresAt = callArg?.expiresAt as Date;
      const diffMs = expiresAt.getTime() - now;
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const twoHoursMs = 2 * 60 * 60 * 1000;
      expect(diffMs).toBeGreaterThanOrEqual(sevenDaysMs - twoHoursMs);
      expect(diffMs).toBeLessThanOrEqual(sevenDaysMs + twoHoursMs);
    });

    it("initialises counts to zero on the new record", async () => {
      vi.mocked(DataExportsQueries.createExport).mockResolvedValue(
        makeExport(),
      );

      await GdprExportService.createExportRequest(USER_ID, ORG_ID);

      const callArg = vi.mocked(DataExportsQueries.createExport).mock
        .calls[0]?.[0];
      expect(callArg?.recordingsCount).toBe(0);
      expect(callArg?.tasksCount).toBe(0);
      expect(callArg?.conversationsCount).toBe(0);
    });

    it("returns the created export record in ok result", async () => {
      const export_ = makeExport({ id: "new-export-999" });
      vi.mocked(DataExportsQueries.createExport).mockResolvedValue(export_);

      const result = await GdprExportService.createExportRequest(
        USER_ID,
        ORG_ID,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe("new-export-999");
      }
    });

    it("returns an err result when the database throws", async () => {
      vi.mocked(DataExportsQueries.createExport).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await GdprExportService.createExportRequest(
        USER_ID,
        ORG_ID,
      );

      expect(result.isErr()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getExportById
  // -------------------------------------------------------------------------
  describe("getExportById", () => {
    it("returns the export when found and not expired", async () => {
      vi.mocked(DataExportsQueries.getExportById).mockResolvedValue(
        makeExport(),
      );

      const result = await GdprExportService.getExportById(
        EXPORT_ID,
        USER_ID,
        ORG_ID,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.id).toBe(EXPORT_ID);
      }
    });

    it("returns not-found error when export does not exist", async () => {
      vi.mocked(DataExportsQueries.getExportById).mockResolvedValue(null);

      const result = await GdprExportService.getExportById(
        EXPORT_ID,
        USER_ID,
        ORG_ID,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("NOT_FOUND");
      }
    });

    it("rejects expired exports with a BAD_REQUEST error", async () => {
      const expired = makeExport({
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });
      vi.mocked(DataExportsQueries.getExportById).mockResolvedValue(expired);

      const result = await GdprExportService.getExportById(
        EXPORT_ID,
        USER_ID,
        ORG_ID,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("BAD_REQUEST");
      }
    });

    it("enforces organization isolation — different org returns forbidden error", async () => {
      const export_ = makeExport({ organizationId: "other-org" });
      vi.mocked(DataExportsQueries.getExportById).mockResolvedValue(export_);

      const result = await GdprExportService.getExportById(
        EXPORT_ID,
        USER_ID,
        ORG_ID,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    });

    it("enforces user isolation — different userId returns forbidden error", async () => {
      const export_ = makeExport({ userId: "other-user" });
      vi.mocked(DataExportsQueries.getExportById).mockResolvedValue(export_);

      const result = await GdprExportService.getExportById(
        EXPORT_ID,
        USER_ID,
        ORG_ID,
      );

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.code).toBe("FORBIDDEN");
      }
    });

    it("returns an err result when the query throws", async () => {
      vi.mocked(DataExportsQueries.getExportById).mockRejectedValue(
        new Error("DB timeout"),
      );

      const result = await GdprExportService.getExportById(
        EXPORT_ID,
        USER_ID,
        ORG_ID,
      );

      expect(result.isErr()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // getExportsByUserId
  // -------------------------------------------------------------------------
  describe("getExportsByUserId", () => {
    it("returns an array of exports for the user", async () => {
      const exports = [makeExport({ id: "e1" }), makeExport({ id: "e2" })];
      vi.mocked(DataExportsQueries.getExportsByUserId).mockResolvedValue(
        exports,
      );

      const result = await GdprExportService.getExportsByUserId(
        USER_ID,
        ORG_ID,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
      }
    });

    it("returns an empty array when there are no exports", async () => {
      vi.mocked(DataExportsQueries.getExportsByUserId).mockResolvedValue([]);

      const result = await GdprExportService.getExportsByUserId(
        USER_ID,
        ORG_ID,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(0);
      }
    });

    it("returns an err result when the query throws", async () => {
      vi.mocked(DataExportsQueries.getExportsByUserId).mockRejectedValue(
        new Error("DB error"),
      );

      const result = await GdprExportService.getExportsByUserId(
        USER_ID,
        ORG_ID,
      );

      expect(result.isErr()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // aggregateUserData
  // -------------------------------------------------------------------------
  describe("aggregateUserData", () => {
    it("returns user profile data from UserService", async () => {
      const user = makeUserDto({
        email: "test@company.com",
        given_name: "Bob",
      });
      vi.mocked(UserService.getUserById).mockResolvedValue(ok(user));

      const result = await GdprExportService.aggregateUserData(USER_ID, ORG_ID);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user.email).toBe("test@company.com");
        expect(result.value.user.given_name).toBe("Bob");
        expect(result.value.user.id).toBe(USER_ID);
      }
    });

    it("falls back to minimal profile when UserService returns an error", async () => {
      vi.mocked(UserService.getUserById).mockResolvedValue(
        err({ code: "NOT_FOUND", message: "Not found" } as never),
      );

      const result = await GdprExportService.aggregateUserData(USER_ID, ORG_ID);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.user.id).toBe(USER_ID);
        expect(result.value.user.email).toBeNull();
      }
    });

    it("aggregates recordings belonging to the requesting user only", async () => {
      const otherUserRecording = makeRecording({
        createdById: "other-user",
        id: "rec-other",
      });
      const userRecording = makeRecording({
        createdById: USER_ID,
        id: "rec-mine",
      });
      vi.mocked(
        RecordingsQueries.selectRecordingsByOrganization,
      ).mockResolvedValue([otherUserRecording, userRecording] as never);

      const result = await GdprExportService.aggregateUserData(USER_ID, ORG_ID);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.recordings).toHaveLength(1);
        expect(result.value.recordings[0]?.id).toBe("rec-mine");
      }
    });

    it("aggregates tasks assigned to the requesting user", async () => {
      const task = makeTask({ id: "t-1", title: "Important task" });
      vi.mocked(TasksQueries.getTasksByOrganization).mockResolvedValue([
        task,
      ] as never);

      const result = await GdprExportService.aggregateUserData(USER_ID, ORG_ID);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tasks).toHaveLength(1);
        expect(result.value.tasks[0]?.id).toBe("t-1");
        expect(result.value.tasks[0]?.title).toBe("Important task");
      }
    });

    it("aggregates chat conversations and their messages", async () => {
      const conv = makeConversation();
      const msg = makeMessage({ conversationId: "conv-1" });
      vi.mocked(ChatQueries.getConversationsByOrganizationId).mockResolvedValue(
        [conv] as never,
      );
      vi.mocked(ChatQueries.getMessagesByConversationIds).mockResolvedValue([
        msg,
      ] as never);

      const result = await GdprExportService.aggregateUserData(USER_ID, ORG_ID);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.chatHistory).toHaveLength(1);
        expect(result.value.chatHistory[0]?.conversation.id).toBe("conv-1");
        expect(result.value.chatHistory[0]?.messages).toHaveLength(1);
        expect(result.value.chatHistory[0]?.messages[0]?.content).toBe(
          "What were the action items?",
        );
      }
    });

    it("includes summary AI insights for user recordings", async () => {
      const recording = makeRecording({ createdById: USER_ID, id: "rec-sum" });
      vi.mocked(
        RecordingsQueries.selectRecordingsByOrganization,
      ).mockResolvedValue([recording] as never);
      vi.mocked(AIInsightsQueries.getInsightsByRecordingIds).mockResolvedValue([
        {
          id: "insight-1",
          recordingId: "rec-sum",
          insightType: "summary",
          content: { text: "Meeting summary" },
          createdAt: new Date("2024-01-15"),
          updatedAt: new Date("2024-01-15"),
        },
      ] as never);

      const result = await GdprExportService.aggregateUserData(USER_ID, ORG_ID);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.summaries).toHaveLength(1);
        expect(result.value.summaries[0]?.recordingId).toBe("rec-sum");
      }
    });

    it("does not include non-summary insight types", async () => {
      const recording = makeRecording({ createdById: USER_ID, id: "rec-2" });
      vi.mocked(
        RecordingsQueries.selectRecordingsByOrganization,
      ).mockResolvedValue([recording] as never);
      vi.mocked(AIInsightsQueries.getInsightsByRecordingIds).mockResolvedValue([
        {
          id: "insight-action",
          recordingId: "rec-2",
          insightType: "action_items",
          content: { items: [] },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as never);

      const result = await GdprExportService.aggregateUserData(USER_ID, ORG_ID);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.summaries).toHaveLength(0);
      }
    });

    it("includes exportDate and exportMetadata version/format fields", async () => {
      const result = await GdprExportService.aggregateUserData(USER_ID, ORG_ID);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.exportDate).toBeDefined();
        expect(result.value.exportMetadata.version).toBe("1.0");
        expect(result.value.exportMetadata.format).toBe("json");
      }
    });

    it("filters recordings by dateRange when provided", async () => {
      const inRange = makeRecording({
        id: "rec-in",
        createdById: USER_ID,
        recordingDate: new Date("2024-06-15"),
      });
      const outOfRange = makeRecording({
        id: "rec-out",
        createdById: USER_ID,
        recordingDate: new Date("2023-01-01"),
      });
      vi.mocked(
        RecordingsQueries.selectRecordingsByOrganization,
      ).mockResolvedValue([inRange, outOfRange] as never);

      const result = await GdprExportService.aggregateUserData(
        USER_ID,
        ORG_ID,
        {
          dateRange: {
            startDate: new Date("2024-01-01"),
            endDate: new Date("2024-12-31"),
          },
        },
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.recordings).toHaveLength(1);
        expect(result.value.recordings[0]?.id).toBe("rec-in");
      }
    });

    it("filters tasks by dateRange when provided", async () => {
      const inRangeTask = makeTask({
        id: "t-in",
        createdAt: new Date("2024-06-15"),
      });
      const outOfRangeTask = makeTask({
        id: "t-out",
        createdAt: new Date("2022-03-01"),
      });
      vi.mocked(TasksQueries.getTasksByOrganization).mockResolvedValue([
        inRangeTask,
        outOfRangeTask,
      ] as never);

      const result = await GdprExportService.aggregateUserData(
        USER_ID,
        ORG_ID,
        {
          dateRange: {
            startDate: new Date("2024-01-01"),
            endDate: new Date("2024-12-31"),
          },
        },
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.tasks).toHaveLength(1);
        expect(result.value.tasks[0]?.id).toBe("t-in");
      }
    });

    it("returns an err result when a query throws unexpectedly", async () => {
      vi.mocked(
        RecordingsQueries.selectRecordingsByOrganization,
      ).mockRejectedValue(new Error("Storage unavailable"));

      const result = await GdprExportService.aggregateUserData(USER_ID, ORG_ID);

      expect(result.isErr()).toBe(true);
    });

    it("passes projectId filter to recordings and tasks queries", async () => {
      await GdprExportService.aggregateUserData(USER_ID, ORG_ID, {
        projectId: "proj-abc",
      });

      expect(
        RecordingsQueries.selectRecordingsByOrganization,
      ).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({ projectIds: ["proj-abc"] }),
      );
      expect(TasksQueries.getTasksByOrganization).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({ projectIds: ["proj-abc"] }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // generateExport
  // -------------------------------------------------------------------------
  describe("generateExport", () => {
    it("transitions status from processing to completed on success", async () => {
      await GdprExportService.generateExport(USER_ID, ORG_ID, EXPORT_ID);

      const statusCalls = vi.mocked(DataExportsQueries.updateExportStatus).mock
        .calls;
      // First call: processing
      expect(statusCalls[0]?.[0]).toBe(EXPORT_ID);
      expect(statusCalls[0]?.[1]).toBe("processing");
      // Last call: completed
      const lastCall = statusCalls[statusCalls.length - 1];
      expect(lastCall?.[0]).toBe(EXPORT_ID);
      expect(lastCall?.[1]).toBe("completed");
    });

    it("updates completed record with blobPath, fileSize, and counts", async () => {
      const recording = makeRecording({ createdById: USER_ID });
      vi.mocked(
        RecordingsQueries.selectRecordingsByOrganization,
      ).mockResolvedValue([recording] as never);
      const task = makeTask();
      vi.mocked(TasksQueries.getTasksByOrganization).mockResolvedValue([
        task,
      ] as never);

      await GdprExportService.generateExport(USER_ID, ORG_ID, EXPORT_ID);

      const completionCall = vi
        .mocked(DataExportsQueries.updateExportStatus)
        .mock.calls.at(-1);
      expect(completionCall?.[1]).toBe("completed");
      expect(completionCall?.[2]).toMatchObject({
        blobPath: `gdpr-exports/${ORG_ID}/${EXPORT_ID}.zip`,
        fileSize: expect.any(Number),
        recordingsCount: 1,
        tasksCount: 1,
        completedAt: expect.any(Date),
      });
    });

    it("marks export as failed when the storage provider rejects", async () => {
      vi.mocked(getStorageProvider).mockRejectedValueOnce(
        new Error("Storage provider unavailable"),
      );

      const result = await GdprExportService.generateExport(
        USER_ID,
        ORG_ID,
        EXPORT_ID,
      );

      expect(result.isErr()).toBe(true);

      const statusCalls = vi.mocked(DataExportsQueries.updateExportStatus).mock
        .calls;
      const failedCall = statusCalls.find((c) => c[1] === "failed");
      expect(failedCall).toBeDefined();
    });

    it("marks export as failed when data aggregation fails", async () => {
      vi.mocked(
        RecordingsQueries.selectRecordingsByOrganization,
      ).mockRejectedValue(new Error("DB down"));

      const result = await GdprExportService.generateExport(
        USER_ID,
        ORG_ID,
        EXPORT_ID,
      );

      expect(result.isErr()).toBe(true);

      const statusCalls = vi.mocked(DataExportsQueries.updateExportStatus).mock
        .calls;
      const failedCall = statusCalls.find((c) => c[1] === "failed");
      expect(failedCall).toBeDefined();
    });

    it("returns ok(undefined) on successful generation", async () => {
      const result = await GdprExportService.generateExport(
        USER_ID,
        ORG_ID,
        EXPORT_ID,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeUndefined();
      }
    });
  });
});
