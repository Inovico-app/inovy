import { ChatPipeline } from "../chat-pipeline.service";
import type { ChatCaller, ChatRequest } from "../types";

// ============================================================================
// Mocks — all external dependencies
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

// Chat queries
const mockCreateConversation = vi.fn().mockResolvedValue({ id: "conv-new" });
const mockGetConversationById = vi.fn().mockResolvedValue(null);
const mockCreateMessage = vi.fn().mockResolvedValue(undefined);
const mockUpdateConversationTitle = vi.fn().mockResolvedValue(undefined);

vi.mock("@/server/data-access/chat.queries", () => ({
  ChatQueries: {
    createConversation: (...a: unknown[]) => mockCreateConversation(...a),
    getConversationById: (...a: unknown[]) => mockGetConversationById(...a),
    createMessage: (...a: unknown[]) => mockCreateMessage(...a),
    getMessagesByConversationId: vi.fn().mockResolvedValue([]),
    updateConversationTitle: (...a: unknown[]) =>
      mockUpdateConversationTitle(...a),
  },
}));

const mockAssertOrganizationAccess = vi.fn();
vi.mock("@/lib/rbac/organization-isolation", () => ({
  assertOrganizationAccess: (...a: unknown[]) =>
    mockAssertOrganizationAccess(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockStreamText = vi.fn();
const mockStepCountIs = vi.fn().mockReturnValue(() => false);
vi.mock("ai", () => ({
  streamText: (...a: unknown[]) => mockStreamText(...a),
  stepCountIs: (...a: unknown[]) => mockStepCountIs(...a),
}));

const mockModerateUserInput = vi.fn().mockResolvedValue(undefined);
vi.mock("../../../ai/middleware/input-moderation.middleware", () => ({
  moderateUserInput: (...a: unknown[]) => mockModerateUserInput(...a),
}));

vi.mock("../../../ai/classifiers/grounding.classifier", () => ({
  GroundingClassifier: vi.fn().mockImplementation(() => ({
    evaluate: vi.fn().mockResolvedValue({
      overallGrounded: true,
      groundedRatio: 1.0,
      ungroundedClaims: [],
      reasoning: "test",
    }),
  })),
}));

vi.mock("../../../ai/classifiers/grounding-enforcer", () => ({
  GroundingEnforcer: vi.fn().mockImplementation(() => ({
    enforce: vi.fn().mockResolvedValue({
      action: "pass",
      finalText: "test response",
      retried: false,
      evaluation: {
        overallGrounded: true,
        groundedRatio: 1.0,
        ungroundedClaims: [],
        reasoning: "test",
      },
    }),
  })),
}));

vi.mock("../../../ai/middleware", () => ({
  createGuardedModel: vi.fn().mockReturnValue("mocked-guarded-model"),
  GuardrailError: class GuardrailError extends Error {
    violation: { type: string; severity: string; message: string };
    constructor(v: { type: string; severity: string; message: string }) {
      super(v.message);
      this.name = "GuardrailError";
      this.violation = v;
    }
  },
}));

vi.mock("../../../cache/project-template.cache", () => ({
  getCachedProjectTemplate: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/server/cache/agent-settings.cache", () => ({
  getCachedAgentSettings: vi.fn().mockResolvedValue({
    model: "claude-sonnet-4-6",
    temperature: 0.7,
    topP: 0.9,
  }),
}));

vi.mock("@/server/cache/organization-settings.cache", () => ({
  getCachedOrganizationSettings: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../agent-metrics.service", () => ({
  AgentMetricsService: { trackRequest: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("../../agent-token-budget.service", () => ({
  AgentTokenBudgetService: {
    recordUsage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../../model-provenance.service", () => ({
  ModelProvenanceService: { logInvocation: vi.fn() },
}));

vi.mock("../../connection-pool.service", () => ({
  connectionPool: {
    getAnthropicAISdkClientWithTracking: vi.fn().mockReturnValue({
      client: vi.fn().mockReturnValue("mocked-model"),
      pooled: { activeRequests: 0 },
    }),
  },
}));

vi.mock("../../conversation-context-manager.service", () => ({
  ConversationContextManager: {
    getConversationContext: vi.fn().mockResolvedValue({
      isOk: () => true,
      isErr: () => false,
      value: { messages: [], summary: undefined },
    }),
  },
}));

vi.mock("../../conversation-integrity.service", () => ({
  ConversationIntegrityService: {
    validateContextBounds: vi.fn().mockReturnValue({
      isWithinBounds: true,
      warnings: [],
    }),
  },
}));

vi.mock("../../knowledge", () => ({
  KnowledgeModule: {
    getKnowledge: vi.fn().mockResolvedValue({
      isOk: () => true,
      isErr: () => false,
      value: { glossary: "", entries: [] },
    }),
  },
}));

vi.mock("../../project.service", () => ({
  ProjectService: {
    getProjectById: vi.fn().mockResolvedValue({
      isOk: () => true,
      isErr: () => false,
      value: {
        name: "Test Project",
        description: null,
        organizationId: "org-1",
        teamId: null,
      },
    }),
  },
}));

vi.mock("../../prompt-builder.service", () => ({
  PromptBuilder: {
    Chat: {
      buildPrompt: vi.fn().mockReturnValue({
        systemPrompt: "You are a helpful assistant",
        userPrompt: "Test message",
      }),
    },
  },
}));

vi.mock("../../prompt-integrity.service", () => ({
  PromptIntegrityService: {
    stamp: vi.fn().mockReturnValue({
      systemPrompt: "You are a helpful assistant",
      integrityHash: "test-hash",
    }),
    verifyOrThrow: vi.fn().mockReturnValue("You are a helpful assistant"),
  },
}));

vi.mock("../../tools", () => ({
  createChatTools: vi.fn().mockReturnValue({}),
  extractSourcesFromToolResults: vi.fn().mockReturnValue([]),
  buildPersistedToolCalls: vi.fn().mockReturnValue(undefined),
  resetToolCallCount: vi.fn(),
}));

// ============================================================================
// Helpers
// ============================================================================

const defaultCaller: ChatCaller = {
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    role: "user",
    image: null,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    onboardingCompleted: true,
    twoFactorEnabled: false,
  } satisfies ChatCaller["user"],
  userId: "user-1",
  organizationId: "org-1",
  userRole: "member",
};

const projectRequest: ChatRequest = {
  message: "What were the key decisions?",
  conversationId: "conv-1",
  scope: { kind: "project", projectId: "proj-1", organizationId: "org-1" },
};

const orgRequest: ChatRequest = {
  message: "Search across all projects",
  conversationId: "conv-org",
  scope: { kind: "organization", organizationId: "org-1" },
};

function setupStreamTextMock() {
  const mockResponse = new Response("streamed response", {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });

  mockStreamText.mockReturnValue({
    toUIMessageStreamResponse: () => mockResponse,
    textStream: (async function* () {
      yield "streamed response";
    })(),
  });
}

// ============================================================================
// Tests
// ============================================================================

describe("ChatPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStreamTextMock();
    mockGetConversationById.mockResolvedValue(mockConversation);
    mockAssertOrganizationAccess.mockImplementation(() => {});
    mockModerateUserInput.mockResolvedValue(undefined);
    mockCreateMessage.mockResolvedValue(undefined);
  });

  describe("sendMessage — project scope", () => {
    it("returns a streaming response with conversationId", async () => {
      const result = await ChatPipeline.sendMessage(
        defaultCaller,
        projectRequest,
      );

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.conversationId).toBe("conv-1");
        expect(result.value.response).toBeInstanceOf(Response);
      }
    });

    it("saves user message after moderation passes", async () => {
      await ChatPipeline.sendMessage(defaultCaller, projectRequest);

      expect(mockModerateUserInput).toHaveBeenCalledWith(
        "What were the key decisions?",
      );
      expect(mockCreateMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: "conv-1",
          role: "user",
          content: "What were the key decisions?",
        }),
      );
    });

    it("calls streamText with guarded model", async () => {
      await ChatPipeline.sendMessage(defaultCaller, projectRequest);

      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "mocked-guarded-model",
          system: "You are a helpful assistant",
        }),
      );
    });
  });

  describe("sendMessage — organization scope", () => {
    it("works for organization scope", async () => {
      const orgConversation = {
        ...mockConversation,
        id: "conv-org",
        projectId: null,
        context: "organization" as const,
      };
      mockGetConversationById.mockResolvedValue(orgConversation);

      const result = await ChatPipeline.sendMessage(defaultCaller, orgRequest);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.conversationId).toBe("conv-org");
      }
    });

    it("rejects when conversation has projectId but scope is organization", async () => {
      // mockConversation has projectId="proj-1"
      mockGetConversationById.mockResolvedValue(mockConversation);

      const result = await ChatPipeline.sendMessage(defaultCaller, orgRequest);

      expect(result.isErr()).toBe(true);
    });
  });

  describe("sendMessage — conversation auto-creation", () => {
    it("auto-creates conversation when conversationId is omitted", async () => {
      const newConv = { ...mockConversation, id: "conv-new" };
      mockGetConversationById.mockResolvedValue(newConv);

      const requestWithoutConvId: ChatRequest = {
        message: "Hello",
        scope: {
          kind: "project",
          projectId: "proj-1",
          organizationId: "org-1",
        },
      };

      const result = await ChatPipeline.sendMessage(
        defaultCaller,
        requestWithoutConvId,
      );

      expect(result.isOk()).toBe(true);
      expect(mockCreateConversation).toHaveBeenCalled();
      if (result.isOk()) {
        expect(result.value.conversationId).toBe("conv-new");
      }
    });
  });

  describe("sendMessage — moderation rejection", () => {
    it("returns error and does not save message when moderation fails", async () => {
      mockModerateUserInput.mockRejectedValue(new Error("Content flagged"));

      const result = await ChatPipeline.sendMessage(
        defaultCaller,
        projectRequest,
      );

      expect(result.isErr()).toBe(true);
      expect(mockCreateMessage).not.toHaveBeenCalled();
    });
  });

  describe("sendMessage — access control", () => {
    it("returns error when conversation not found", async () => {
      mockGetConversationById.mockResolvedValue(null);

      const result = await ChatPipeline.sendMessage(
        defaultCaller,
        projectRequest,
      );

      expect(result.isErr()).toBe(true);
    });

    it("returns error when organization access check fails", async () => {
      mockAssertOrganizationAccess.mockImplementation(() => {
        throw new Error("Org access denied");
      });

      const result = await ChatPipeline.sendMessage(
        { ...defaultCaller, organizationId: "wrong-org" },
        projectRequest,
      );

      expect(result.isErr()).toBe(true);
    });
  });

  describe("sendMessage — role-based behavior", () => {
    it("succeeds for viewer role", async () => {
      const result = await ChatPipeline.sendMessage(
        { ...defaultCaller, userRole: "viewer" },
        projectRequest,
      );

      expect(result.isOk()).toBe(true);
    });

    it("succeeds for member role", async () => {
      const result = await ChatPipeline.sendMessage(
        defaultCaller,
        projectRequest,
      );

      expect(result.isOk()).toBe(true);
    });
  });
});
