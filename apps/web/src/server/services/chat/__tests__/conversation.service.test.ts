import { ConversationService } from "../conversation.service";

// ============================================================================
// Mocks
// ============================================================================

const mockConversation = {
  id: "conv-1",
  projectId: "proj-1",
  userId: "user-1",
  organizationId: "org-1",
  context: "project" as const,
  title: null,
  summary: null,
  deletedAt: null,
  archivedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMessages = [
  {
    id: "msg-1",
    conversationId: "conv-1",
    role: "user" as const,
    content: "Hello",
    sources: null,
    toolCalls: null,
    tokenCount: null,
    createdAt: new Date(),
  },
  {
    id: "msg-2",
    conversationId: "conv-1",
    role: "assistant" as const,
    content: "Hi there",
    sources: null,
    toolCalls: null,
    tokenCount: null,
    createdAt: new Date(),
  },
];

const mockCreateConversation = vi.fn().mockResolvedValue({ id: "conv-new" });
const mockGetConversationById = vi.fn().mockResolvedValue(null);
const mockGetMessagesByConversationId = vi.fn().mockResolvedValue([]);
const mockDeleteConversation = vi.fn().mockResolvedValue(undefined);
const mockSoftDeleteConversation = vi.fn().mockResolvedValue(undefined);
const mockRestoreConversation = vi.fn().mockResolvedValue(true);
const mockArchiveConversation = vi.fn().mockResolvedValue(undefined);
const mockUnarchiveConversation = vi.fn().mockResolvedValue(undefined);
const mockGetConversationsWithPagination = vi
  .fn()
  .mockResolvedValue({ conversations: [], total: 0 });
const mockSearchConversations = vi.fn().mockResolvedValue([]);
const mockGetConversationStats = vi
  .fn()
  .mockResolvedValue({ active: 0, archived: 0, deleted: 0, total: 0 });

vi.mock("@/server/data-access/chat.queries", () => ({
  ChatQueries: {
    createConversation: (...args: unknown[]) => mockCreateConversation(...args),
    getConversationById: (...args: unknown[]) =>
      mockGetConversationById(...args),
    getMessagesByConversationId: (...args: unknown[]) =>
      mockGetMessagesByConversationId(...args),
    deleteConversation: (...args: unknown[]) => mockDeleteConversation(...args),
    softDeleteConversation: (...args: unknown[]) =>
      mockSoftDeleteConversation(...args),
    restoreConversation: (...args: unknown[]) =>
      mockRestoreConversation(...args),
    archiveConversation: (...args: unknown[]) =>
      mockArchiveConversation(...args),
    unarchiveConversation: (...args: unknown[]) =>
      mockUnarchiveConversation(...args),
    getConversationsWithPagination: (...args: unknown[]) =>
      mockGetConversationsWithPagination(...args),
    searchConversations: (...args: unknown[]) =>
      mockSearchConversations(...args),
    getConversationStats: (...args: unknown[]) =>
      mockGetConversationStats(...args),
  },
}));

const mockAssertOrganizationAccess = vi.fn();
vi.mock("@/lib/rbac/organization-isolation", () => ({
  assertOrganizationAccess: (...args: unknown[]) =>
    mockAssertOrganizationAccess(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// ============================================================================
// Tests: ConversationService
// ============================================================================

describe("ConversationService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCreateConversation.mockResolvedValue({ id: "conv-new" });
    mockGetConversationById.mockResolvedValue(null);
    mockGetMessagesByConversationId.mockResolvedValue([]);
    mockDeleteConversation.mockResolvedValue(undefined);
    mockSoftDeleteConversation.mockResolvedValue(undefined);
    mockRestoreConversation.mockResolvedValue(true);
    mockArchiveConversation.mockResolvedValue(undefined);
    mockUnarchiveConversation.mockResolvedValue(undefined);
    mockGetConversationsWithPagination.mockResolvedValue({
      conversations: [],
      total: 0,
    });
    mockSearchConversations.mockResolvedValue([]);
    mockGetConversationStats.mockResolvedValue({
      active: 0,
      archived: 0,
      deleted: 0,
      total: 0,
    });
    mockAssertOrganizationAccess.mockImplementation(() => {});
  });

  describe("createConversation", () => {
    it("creates a project-scoped conversation", async () => {
      const result = await ConversationService.createConversation(
        "proj-1",
        "user-1",
        "org-1",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.conversationId).toBe("conv-new");
      }
      expect(mockCreateConversation).toHaveBeenCalledWith({
        projectId: "proj-1",
        userId: "user-1",
        organizationId: "org-1",
        context: "project",
      });
    });
  });

  describe("createOrganizationConversation", () => {
    it("creates an organization-scoped conversation with null projectId", async () => {
      const result = await ConversationService.createOrganizationConversation(
        "user-1",
        "org-1",
      );

      expect(result.isOk()).toBe(true);
      expect(mockCreateConversation).toHaveBeenCalledWith({
        projectId: null,
        userId: "user-1",
        organizationId: "org-1",
        context: "organization",
      });
    });
  });

  describe("getConversationHistory", () => {
    it("returns messages without access check when no identity provided", async () => {
      mockGetMessagesByConversationId.mockResolvedValue(mockMessages);

      const result = await ConversationService.getConversationHistory("conv-1");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toHaveLength(2);
      }
      expect(mockGetConversationById).not.toHaveBeenCalled();
    });

    it("verifies ownership when userId and organizationId provided", async () => {
      mockGetConversationById.mockResolvedValue(mockConversation);
      mockGetMessagesByConversationId.mockResolvedValue(mockMessages);

      const result = await ConversationService.getConversationHistory(
        "conv-1",
        "user-1",
        "org-1",
      );

      expect(result.isOk()).toBe(true);
      expect(mockGetConversationById).toHaveBeenCalledWith("conv-1");
      expect(mockAssertOrganizationAccess).toHaveBeenCalledWith(
        "org-1",
        "org-1",
        "ConversationService.getConversationHistory",
      );
    });

    it("returns NOT_FOUND when conversation does not exist", async () => {
      mockGetConversationById.mockResolvedValue(null);

      const result = await ConversationService.getConversationHistory(
        "conv-nonexistent",
        "user-1",
        "org-1",
      );

      expect(result.isErr()).toBe(true);
    });

    it("returns FORBIDDEN when user does not own the conversation", async () => {
      mockGetConversationById.mockResolvedValue(mockConversation);

      const result = await ConversationService.getConversationHistory(
        "conv-1",
        "wrong-user",
        "org-1",
      );

      expect(result.isErr()).toBe(true);
    });

    it("returns NOT_FOUND when org access check fails", async () => {
      mockGetConversationById.mockResolvedValue(mockConversation);
      mockAssertOrganizationAccess.mockImplementation(() => {
        throw new Error("Org access denied");
      });

      const result = await ConversationService.getConversationHistory(
        "conv-1",
        "user-1",
        "wrong-org",
      );

      expect(result.isErr()).toBe(true);
    });
  });

  describe("softDeleteConversation", () => {
    it("soft deletes when user owns conversation and has org access", async () => {
      mockGetConversationById.mockResolvedValue(mockConversation);

      const result = await ConversationService.softDeleteConversation(
        "conv-1",
        "user-1",
        "org-1",
      );

      expect(result.isOk()).toBe(true);
      expect(mockSoftDeleteConversation).toHaveBeenCalledWith("conv-1");
    });

    it("returns NOT_FOUND for nonexistent conversation", async () => {
      mockGetConversationById.mockResolvedValue(null);

      const result = await ConversationService.softDeleteConversation(
        "conv-nonexistent",
        "user-1",
        "org-1",
      );

      expect(result.isErr()).toBe(true);
    });

    it("returns FORBIDDEN for wrong user", async () => {
      mockGetConversationById.mockResolvedValue(mockConversation);

      const result = await ConversationService.softDeleteConversation(
        "conv-1",
        "wrong-user",
        "org-1",
      );

      expect(result.isErr()).toBe(true);
      expect(mockSoftDeleteConversation).not.toHaveBeenCalled();
    });

    it("returns NOT_FOUND for wrong organization", async () => {
      mockGetConversationById.mockResolvedValue(mockConversation);
      mockAssertOrganizationAccess.mockImplementation(() => {
        throw new Error("Org access denied");
      });

      const result = await ConversationService.softDeleteConversation(
        "conv-1",
        "user-1",
        "wrong-org",
      );

      expect(result.isErr()).toBe(true);
      expect(mockSoftDeleteConversation).not.toHaveBeenCalled();
    });
  });

  describe("deleteConversation", () => {
    it("hard deletes when user owns conversation and has org access", async () => {
      mockGetConversationById.mockResolvedValue(mockConversation);

      const result = await ConversationService.deleteConversation(
        "conv-1",
        "user-1",
        "org-1",
      );

      expect(result.isOk()).toBe(true);
      expect(mockDeleteConversation).toHaveBeenCalledWith("conv-1");
    });

    it("returns FORBIDDEN for wrong user", async () => {
      mockGetConversationById.mockResolvedValue(mockConversation);

      const result = await ConversationService.deleteConversation(
        "conv-1",
        "wrong-user",
        "org-1",
      );

      expect(result.isErr()).toBe(true);
      expect(mockDeleteConversation).not.toHaveBeenCalled();
    });
  });

  describe("archiveConversation", () => {
    it("archives when user owns conversation", async () => {
      mockGetConversationById.mockResolvedValue(mockConversation);

      const result = await ConversationService.archiveConversation(
        "conv-1",
        "user-1",
        "org-1",
      );

      expect(result.isOk()).toBe(true);
      expect(mockArchiveConversation).toHaveBeenCalledWith("conv-1");
    });
  });

  describe("restoreConversation", () => {
    it("restores a soft-deleted conversation", async () => {
      mockGetConversationById.mockResolvedValue({
        ...mockConversation,
        deletedAt: new Date(),
      });

      const result = await ConversationService.restoreConversation(
        "conv-1",
        "user-1",
        "org-1",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });
  });

  describe("getConversationStats", () => {
    it("returns stats for user", async () => {
      mockGetConversationStats.mockResolvedValue({
        active: 3,
        archived: 1,
        deleted: 0,
        total: 4,
      });

      const result = await ConversationService.getConversationStats(
        "user-1",
        "org-1",
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.active).toBe(3);
        expect(result.value.total).toBe(4);
      }
    });
  });
});
