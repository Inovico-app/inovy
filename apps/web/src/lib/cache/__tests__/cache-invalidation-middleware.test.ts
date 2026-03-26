import { describe, it, expect, vi, beforeEach } from "vitest";

import type {
  ActionContext,
  Metadata,
} from "@/lib/server-action-client/action-client";
import type { CachePolicy, InvalidationContext } from "../types";

// ── Mocks ──────────────────────────────────────────────────────────────────
vi.mock("@/lib/cache-utils", () => ({
  invalidateCache: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../cache-policies", () => ({
  CACHE_POLICIES: {} as Record<string, CachePolicy>,
}));

// Import after mocks are declared
import { invalidateCache } from "@/lib/cache-utils";
import { logger } from "@/lib/logger";
import { CACHE_POLICIES } from "../cache-policies";
import { cacheInvalidationMiddleware } from "../cache-invalidation-middleware";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<ActionContext> = {}): ActionContext {
  return {
    logger: logger as unknown as ActionContext["logger"],
    user: { id: "user-1" } as ActionContext["user"],
    organizationId: "org-1",
    userTeamIds: ["team-1"],
    ...overrides,
  };
}

function makeMutationMetadata(
  overrides: Partial<Metadata> & { invalidate?: CachePolicy | false } = {},
): Metadata & { invalidate?: CachePolicy | false } {
  return {
    name: "testAction",
    permissions: {},
    audit: {
      resourceType: "project",
      action: "create",
      category: "mutation",
    },
    ...overrides,
  };
}

/**
 * Creates a `next` stub that resolves with a MiddlewareResult-like shape.
 * The middleware only needs `parsedInput` and `data` from the result.
 */
function makeNext(
  parsedInput: Record<string, unknown> = {},
  data: unknown = { id: "result-1" },
) {
  return vi.fn().mockResolvedValue({
    parsedInput,
    data,
    success: true,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("cacheInvalidationMiddleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear all policies between tests
    for (const key of Object.keys(CACHE_POLICIES)) {
      delete CACHE_POLICIES[key];
    }
  });

  it("calls invalidateCache with correct tags when audit.category === 'mutation' and policy exists", async () => {
    const expectedTags = ["projects:org:org-1", "project-count:org:org-1"];
    CACHE_POLICIES["project:create"] = vi
      .fn<(ctx: InvalidationContext) => string[]>()
      .mockReturnValue(expectedTags);

    const next = makeNext({ projectId: "proj-1" });
    const ctx = makeCtx();
    const metadata = makeMutationMetadata();

    await cacheInvalidationMiddleware({ next, ctx, metadata });

    expect(invalidateCache).toHaveBeenCalledWith(...expectedTags);
    expect(CACHE_POLICIES["project:create"]).toHaveBeenCalledTimes(1);
  });

  it("skips invalidation when audit is missing", async () => {
    const next = makeNext();
    const ctx = makeCtx();
    const metadata: Metadata = {
      name: "testAction",
      permissions: {},
    };

    await cacheInvalidationMiddleware({ next, ctx, metadata });

    expect(invalidateCache).not.toHaveBeenCalled();
  });

  it("skips invalidation when audit.category !== 'mutation'", async () => {
    const next = makeNext();
    const ctx = makeCtx();
    const metadata = makeMutationMetadata({
      audit: {
        resourceType: "project",
        action: "read",
        category: "read",
      },
    });

    await cacheInvalidationMiddleware({ next, ctx, metadata });

    expect(invalidateCache).not.toHaveBeenCalled();
  });

  it("skips invalidation when metadata.invalidate === false", async () => {
    CACHE_POLICIES["project:create"] = vi
      .fn<(ctx: InvalidationContext) => string[]>()
      .mockReturnValue(["tag-1"]);

    const next = makeNext();
    const ctx = makeCtx();
    const metadata = makeMutationMetadata({ invalidate: false });

    await cacheInvalidationMiddleware({ next, ctx, metadata });

    expect(invalidateCache).not.toHaveBeenCalled();
    expect(CACHE_POLICIES["project:create"]).not.toHaveBeenCalled();
  });

  it("uses metadata.invalidate function when provided (explicit override)", async () => {
    const overrideTags = ["custom-tag-1", "custom-tag-2"];
    const overrideFn = vi
      .fn<(ctx: InvalidationContext) => string[]>()
      .mockReturnValue(overrideTags);

    // Also register a default policy that should NOT be called
    CACHE_POLICIES["project:create"] = vi
      .fn<(ctx: InvalidationContext) => string[]>()
      .mockReturnValue(["default-tag"]);

    const next = makeNext({ projectId: "proj-1" });
    const ctx = makeCtx();
    const metadata = makeMutationMetadata({ invalidate: overrideFn });

    await cacheInvalidationMiddleware({ next, ctx, metadata });

    expect(overrideFn).toHaveBeenCalledTimes(1);
    expect(invalidateCache).toHaveBeenCalledWith(...overrideTags);
    expect(CACHE_POLICIES["project:create"]).not.toHaveBeenCalled();
  });

  it("logs dev-mode warning when no policy found for a mutation", async () => {
    // Do NOT register a policy for "project:create"

    const next = makeNext();
    const ctx = makeCtx();
    const metadata = makeMutationMetadata();

    await cacheInvalidationMiddleware({ next, ctx, metadata });

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("project:create"),
      expect.objectContaining({ component: "cache-invalidation-middleware" }),
    );
    expect(invalidateCache).not.toHaveBeenCalled();
  });

  it("catches policy errors and still returns result", async () => {
    CACHE_POLICIES["project:create"] = vi
      .fn<(ctx: InvalidationContext) => string[]>()
      .mockImplementation(() => {
        throw new Error("Policy kaboom");
      });

    const next = makeNext();
    const ctx = makeCtx();
    const metadata = makeMutationMetadata();

    const result = await cacheInvalidationMiddleware({ next, ctx, metadata });

    // Should NOT throw — error is caught and logged
    expect(result).toBeDefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("Cache invalidation failed"),
      expect.objectContaining({ component: "cache-invalidation-middleware" }),
    );
    expect(invalidateCache).not.toHaveBeenCalled();
  });

  it("does NOT call invalidateCache when the action body throws an error", async () => {
    CACHE_POLICIES["project:create"] = vi
      .fn<(ctx: InvalidationContext) => string[]>()
      .mockReturnValue(["tag-1"]);

    const next = vi.fn().mockRejectedValue(new Error("Action body failed"));
    const ctx = makeCtx();
    const metadata = makeMutationMetadata();

    await expect(
      cacheInvalidationMiddleware({ next, ctx, metadata }),
    ).rejects.toThrow("Action body failed");

    expect(invalidateCache).not.toHaveBeenCalled();
    expect(CACHE_POLICIES["project:create"]).not.toHaveBeenCalled();
  });
});
