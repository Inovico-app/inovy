import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

vi.mock("@/server/data-access/recordings.queries", () => ({
  RecordingsQueries: {
    selectRecordingsByOrganization: vi.fn(),
    selectRecordingsByCreator: vi.fn(),
    selectRecordingsByIds: vi.fn(),
    selectRecordingById: vi.fn(),
    deleteRecording: vi.fn(),
    anonymizeTranscriptionText: vi.fn(),
  },
}));

vi.mock("@/server/data-access/tasks.queries", () => ({
  TasksQueries: {
    getTasksByOrganization: vi.fn(),
    getTasksByCreator: vi.fn(),
    deleteByIds: vi.fn(),
    anonymizeAssigneeByUserId: vi.fn(),
  },
}));

vi.mock("@/server/data-access/chat.queries", () => ({
  ChatQueries: {
    getConversationsByOrganizationId: vi.fn(),
    deleteByUserIdAndOrganizationId: vi.fn(),
  },
}));

vi.mock("@/server/data-access/audit-logs.queries", () => ({
  AuditLogsQueries: {
    anonymizeByUserId: vi.fn(),
    getLatestLog: vi.fn(),
    insert: vi.fn(),
  },
}));

vi.mock("@/server/data-access/ai-insights.queries", () => ({
  AIInsightsQueries: {
    getInsightsByRecordingId: vi.fn(),
    getInsightsByRecordingIds: vi.fn(),
    anonymizeSpeakerNames: vi.fn(),
  },
}));

vi.mock("@/server/data-access/user-deletion-requests.queries", () => ({
  UserDeletionRequestsQueries: {
    findByUserId: vi.fn(),
    findById: vi.fn(),
    insert: vi.fn(),
    updateStatus: vi.fn(),
    cancel: vi.fn(),
  },
}));

vi.mock("@/server/data-access/consent.queries", () => ({
  ConsentQueries: {
    findByUserId: vi.fn(),
    anonymizeByRecordingIds: vi.fn(),
  },
}));

vi.mock("@/server/data-access/summary-history.queries", () => ({
  SummaryHistoryQueries: {
    deleteByRecordingIdsAndUserId: vi.fn(),
  },
}));

vi.mock("@/server/data-access/oauth-connections.queries", () => ({
  OAuthConnectionsQueries: {
    deleteByUserId: vi.fn(),
  },
}));

vi.mock("@/server/services/audit-log.service", () => ({
  AuditLogService: {
    createAuditLog: vi.fn().mockResolvedValue({ isOk: () => true }),
  },
}));

vi.mock("@/server/services/storage", () => ({
  getStorageProvider: vi.fn().mockResolvedValue({
    del: vi.fn(),
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { GdprDeletionService } from "../gdpr-deletion.service";
import { RecordingsQueries } from "@/server/data-access/recordings.queries";
import { TasksQueries } from "@/server/data-access/tasks.queries";
import { ChatQueries } from "@/server/data-access/chat.queries";
import { AuditLogsQueries } from "@/server/data-access/audit-logs.queries";
import { AIInsightsQueries } from "@/server/data-access/ai-insights.queries";
import { UserDeletionRequestsQueries } from "@/server/data-access/user-deletion-requests.queries";
import { ConsentQueries } from "@/server/data-access/consent.queries";
import { SummaryHistoryQueries } from "@/server/data-access/summary-history.queries";
import { OAuthConnectionsQueries } from "@/server/data-access/oauth-connections.queries";
import { AuditLogService } from "@/server/services/audit-log.service";

const USER_ID = "user-abc-123";
const ORG_ID = "org-xyz-456";
const REQUEST_ID = "req-111";

function makeRequest(overrides: Record<string, unknown> = {}) {
  return {
    id: REQUEST_ID,
    userId: USER_ID,
    organizationId: ORG_ID,
    status: "pending" as const,
    requestedAt: new Date(),
    scheduledDeletionAt: new Date(),
    processedAt: null,
    cancelledBy: null,
    cancelledAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeRecording(overrides: Record<string, unknown> = {}) {
  return {
    id: "rec-1",
    createdById: USER_ID,
    organizationId: ORG_ID,
    fileUrl: "https://storage/file.mp4",
    transcriptionText: null,
    title: "Test Recording",
    status: "active" as const,
    projectId: "proj-1",
    ...overrides,
  };
}

describe("GdprDeletionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default happy-path stubs for processDeletionRequest dependencies
    vi.mocked(UserDeletionRequestsQueries.findById).mockResolvedValue(
      makeRequest(),
    );
    vi.mocked(UserDeletionRequestsQueries.updateStatus).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(
      RecordingsQueries.selectRecordingsByOrganization,
    ).mockResolvedValue([]);
    vi.mocked(RecordingsQueries.selectRecordingsByCreator).mockResolvedValue(
      [],
    );
    vi.mocked(RecordingsQueries.selectRecordingsByIds).mockResolvedValue([]);
    vi.mocked(ConsentQueries.findByUserId).mockResolvedValue([]);
    vi.mocked(TasksQueries.getTasksByOrganization).mockResolvedValue([]);
    vi.mocked(TasksQueries.getTasksByCreator).mockResolvedValue([]);
    vi.mocked(TasksQueries.anonymizeAssigneeByUserId).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(ChatQueries.getConversationsByOrganizationId).mockResolvedValue(
      [],
    );
    vi.mocked(ChatQueries.deleteByUserIdAndOrganizationId).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(AuditLogsQueries.anonymizeByUserId).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(OAuthConnectionsQueries.deleteByUserId).mockResolvedValue(
      undefined as never,
    );
    vi.mocked(AIInsightsQueries.getInsightsByRecordingId).mockResolvedValue([]);
    vi.mocked(AIInsightsQueries.getInsightsByRecordingIds).mockResolvedValue(
      [],
    );
  });

  // -------------------------------------------------------------------------
  // createDeletionRequest
  // -------------------------------------------------------------------------
  describe("createDeletionRequest", () => {
    it("returns an ok result with the new request ID when no prior request exists", async () => {
      vi.mocked(UserDeletionRequestsQueries.findByUserId).mockResolvedValue(
        null,
      );
      vi.mocked(UserDeletionRequestsQueries.insert).mockResolvedValue(
        makeRequest({ id: "new-req" }),
      );

      const result = await GdprDeletionService.createDeletionRequest(
        USER_ID,
        ORG_ID,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("new-req");
      }
    });

    it("returns an error if an active deletion request already exists", async () => {
      vi.mocked(UserDeletionRequestsQueries.findByUserId).mockResolvedValue(
        makeRequest({ status: "pending" }),
      );

      const result = await GdprDeletionService.createDeletionRequest(
        USER_ID,
        ORG_ID,
      );

      expect(result.isErr()).toBe(true);
      vi.mocked(UserDeletionRequestsQueries.insert).mockResolvedValue(
        undefined as never,
      );
      expect(UserDeletionRequestsQueries.insert).not.toHaveBeenCalled();
    });

    it("allows a new request when the prior request was cancelled", async () => {
      vi.mocked(UserDeletionRequestsQueries.findByUserId).mockResolvedValue(
        makeRequest({ status: "cancelled" }),
      );
      vi.mocked(UserDeletionRequestsQueries.insert).mockResolvedValue(
        makeRequest({ id: "new-req-2" }),
      );

      const result = await GdprDeletionService.createDeletionRequest(
        USER_ID,
        ORG_ID,
      );

      expect(result.isOk()).toBe(true);
    });

    it("returns an error result when the database throws", async () => {
      vi.mocked(UserDeletionRequestsQueries.findByUserId).mockRejectedValue(
        new Error("DB connection lost"),
      );

      const result = await GdprDeletionService.createDeletionRequest(
        USER_ID,
        ORG_ID,
      );

      expect(result.isErr()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // processDeletionRequest — orchestration
  // -------------------------------------------------------------------------
  describe("processDeletionRequest", () => {
    it("returns ok(undefined) on a successful deletion run", async () => {
      const result = await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        "user@example.com",
        "Alice Smith",
      );

      expect(result.isOk()).toBe(true);
    });

    it("marks the request as processing and then completed", async () => {
      await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        null,
        null,
      );

      const updateCalls = vi.mocked(UserDeletionRequestsQueries.updateStatus)
        .mock.calls;
      expect(updateCalls[0]?.[0]).toBe(REQUEST_ID);
      expect(updateCalls[0]?.[1]).toBe("processing");
      expect(updateCalls[1]?.[0]).toBe(REQUEST_ID);
      expect(updateCalls[1]?.[1]).toBe("completed");
    });

    it("calls all 7 deletion/anonymization steps", async () => {
      const recording = makeRecording();
      vi.mocked(RecordingsQueries.selectRecordingsByCreator).mockResolvedValue([
        recording,
      ] as never);
      vi.mocked(TasksQueries.getTasksByCreator).mockResolvedValue([
        { id: "task-1", createdById: USER_ID },
      ] as never);
      vi.mocked(TasksQueries.deleteByIds).mockResolvedValue(undefined as never);
      vi.mocked(ChatQueries.getConversationsByOrganizationId).mockResolvedValue(
        [{ id: "conv-1" }] as never,
      );

      await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        null,
        null,
      );

      // Step 1 & 4 & summary: recordings queries used (now creator-scoped)
      expect(RecordingsQueries.selectRecordingsByCreator).toHaveBeenCalledWith(
        ORG_ID,
        USER_ID,
      );

      // Step 2: participant anonymization via consent queries
      expect(ConsentQueries.findByUserId).toHaveBeenCalledWith(USER_ID);

      // Step 3: tasks (anonymize runs unconditionally, then delete created tasks)
      expect(TasksQueries.anonymizeAssigneeByUserId).toHaveBeenCalledWith(
        USER_ID,
        ORG_ID,
      );

      // Step 5: chat
      expect(ChatQueries.deleteByUserIdAndOrganizationId).toHaveBeenCalledWith(
        USER_ID,
        ORG_ID,
      );

      // Step 6: audit logs anonymized (not deleted)
      expect(AuditLogsQueries.anonymizeByUserId).toHaveBeenCalledWith(
        USER_ID,
        ORG_ID,
        expect.stringMatching(/^user_[a-f0-9]{16}$/),
      );

      // Step 7: OAuth connections deleted
      expect(OAuthConnectionsQueries.deleteByUserId).toHaveBeenCalledWith(
        USER_ID,
      );
    });

    it("returns not-found error when request does not exist", async () => {
      vi.mocked(UserDeletionRequestsQueries.findById).mockResolvedValue(null);

      const result = await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        null,
        null,
      );

      expect(result.isErr()).toBe(true);
    });

    it("returns not-found error when userId does not match the request", async () => {
      vi.mocked(UserDeletionRequestsQueries.findById).mockResolvedValue(
        makeRequest({ userId: "other-user" }),
      );

      const result = await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        null,
        null,
      );

      expect(result.isErr()).toBe(true);
    });

    it("short-circuits and returns ok when request is already completed", async () => {
      vi.mocked(UserDeletionRequestsQueries.findById).mockResolvedValue(
        makeRequest({ status: "completed" }),
      );

      const result = await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        null,
        null,
      );

      expect(result.isOk()).toBe(true);
      expect(UserDeletionRequestsQueries.updateStatus).not.toHaveBeenCalled();
    });

    it("returns an error result when a step throws unexpectedly", async () => {
      vi.mocked(RecordingsQueries.selectRecordingsByCreator).mockRejectedValue(
        new Error("Storage failure"),
      );

      const result = await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        null,
        null,
      );

      expect(result.isErr()).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Anonymization strategy
  // -------------------------------------------------------------------------
  describe("anonymized user ID (generateAnonymizedId)", () => {
    it("produces consistent output for the same input across calls", async () => {
      // Capture the anonymized ID passed to AuditLogsQueries.anonymizeByUserId
      const capturedIds: string[] = [];
      vi.mocked(AuditLogsQueries.anonymizeByUserId).mockImplementation(
        async (_userId, _orgId, anonId) => {
          capturedIds.push(anonId);
        },
      );

      await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        null,
        null,
      );
      await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        null,
        null,
      );

      expect(capturedIds).toHaveLength(2);
      expect(capturedIds[0]).toBe(capturedIds[1]);
    });

    it("produces a different anonymized ID for a different userId", async () => {
      const OTHER_USER = "user-other-999";
      vi.mocked(UserDeletionRequestsQueries.findById)
        .mockResolvedValueOnce(makeRequest())
        .mockResolvedValueOnce(makeRequest({ userId: OTHER_USER }));

      const capturedIds: string[] = [];
      vi.mocked(AuditLogsQueries.anonymizeByUserId).mockImplementation(
        async (_userId, _orgId, anonId) => {
          capturedIds.push(anonId);
        },
      );

      await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        null,
        null,
      );
      await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        OTHER_USER,
        ORG_ID,
        null,
        null,
      );

      expect(capturedIds[0]).not.toBe(capturedIds[1]);
    });

    it("anonymized ID matches the expected sha256-based format", async () => {
      const capturedIds: string[] = [];
      vi.mocked(AuditLogsQueries.anonymizeByUserId).mockImplementation(
        async (_userId, _orgId, anonId) => {
          capturedIds.push(anonId);
        },
      );

      await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        null,
        null,
      );

      const expectedHash = createHash("sha256")
        .update(USER_ID)
        .digest("hex")
        .substring(0, 16);
      expect(capturedIds[0]).toBe(`user_${expectedHash}`);
    });
  });

  // -------------------------------------------------------------------------
  // Audit log anonymization (not deletion)
  // -------------------------------------------------------------------------
  describe("audit log handling", () => {
    it("anonymizes audit logs instead of deleting them", async () => {
      await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        null,
        null,
      );

      expect(AuditLogsQueries.anonymizeByUserId).toHaveBeenCalledTimes(1);
      // No delete call should exist on the audit logs module
      expect(
        vi.mocked(AuditLogsQueries).anonymizeByUserId,
      ).toHaveBeenCalledWith(USER_ID, ORG_ID, expect.any(String));
    });

    it("uses the anonymized ID (not the real userId) when logging completion", async () => {
      const auditLogCalls = vi.mocked(AuditLogService.createAuditLog).mock
        .calls;

      await GdprDeletionService.processDeletionRequest(
        REQUEST_ID,
        USER_ID,
        ORG_ID,
        null,
        null,
      );

      // The completion audit log (last call) should use the anonymized ID, not the real one
      const completionCall = auditLogCalls[auditLogCalls.length - 1]?.[0];
      expect(completionCall?.userId).not.toBe(USER_ID);
      expect(completionCall?.userId).toMatch(/^user_[a-f0-9]{16}$/);
    });
  });

  // -------------------------------------------------------------------------
  // cancelDeletionRequest
  // -------------------------------------------------------------------------
  describe("cancelDeletionRequest", () => {
    it("returns ok(undefined) when cancellation succeeds", async () => {
      vi.mocked(UserDeletionRequestsQueries.findById).mockResolvedValue(
        makeRequest({ status: "pending" }),
      );
      vi.mocked(UserDeletionRequestsQueries.cancel).mockResolvedValue(
        undefined as never,
      );

      const result = await GdprDeletionService.cancelDeletionRequest(
        REQUEST_ID,
        USER_ID,
        "admin-1",
      );

      expect(result.isOk()).toBe(true);
      expect(UserDeletionRequestsQueries.cancel).toHaveBeenCalledWith(
        REQUEST_ID,
        "admin-1",
      );
    });

    it("returns not-found error when request does not exist", async () => {
      vi.mocked(UserDeletionRequestsQueries.findById).mockResolvedValue(null);

      const result = await GdprDeletionService.cancelDeletionRequest(
        REQUEST_ID,
        USER_ID,
        "admin-1",
      );

      expect(result.isErr()).toBe(true);
    });

    it("returns a validation error when trying to cancel a completed request", async () => {
      vi.mocked(UserDeletionRequestsQueries.findById).mockResolvedValue(
        makeRequest({ status: "completed" }),
      );

      const result = await GdprDeletionService.cancelDeletionRequest(
        REQUEST_ID,
        USER_ID,
        "admin-1",
      );

      expect(result.isErr()).toBe(true);
      expect(UserDeletionRequestsQueries.cancel).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getDeletionRequestStatus
  // -------------------------------------------------------------------------
  describe("getDeletionRequestStatus", () => {
    it("returns the deletion request for the authenticated user", async () => {
      const request = makeRequest();
      vi.mocked(UserDeletionRequestsQueries.findByUserId).mockResolvedValue(
        request,
      );

      const auth = {
        user: { id: USER_ID },
        session: {},
      } as never;

      const result = await GdprDeletionService.getDeletionRequestStatus(auth);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value?.id).toBe(REQUEST_ID);
      }
    });

    it("returns null when no request exists for the user", async () => {
      vi.mocked(UserDeletionRequestsQueries.findByUserId).mockResolvedValue(
        null,
      );

      const auth = { user: { id: USER_ID }, session: {} } as never;
      const result = await GdprDeletionService.getDeletionRequestStatus(auth);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBeNull();
      }
    });

    it("returns an error result when the query throws", async () => {
      vi.mocked(UserDeletionRequestsQueries.findByUserId).mockRejectedValue(
        new Error("Timeout"),
      );

      const auth = { user: { id: USER_ID }, session: {} } as never;
      const result = await GdprDeletionService.getDeletionRequestStatus(auth);

      expect(result.isErr()).toBe(true);
    });
  });
});
