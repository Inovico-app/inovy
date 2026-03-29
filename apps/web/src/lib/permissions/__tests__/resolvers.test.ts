import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

const { mockWhere, mockFrom, mockSelect } = vi.hoisted(() => {
  const mockWhere = vi.fn();
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return { mockWhere, mockFrom, mockSelect };
});

vi.mock("@/server/db", () => ({
  db: { select: mockSelect },
}));

vi.mock("@/server/db/schema/auth", () => ({
  teamMembers: { id: "id", teamId: "team_id", userId: "user_id" },
}));

vi.mock("@/server/db/schema/projects", () => ({
  projects: { id: "id", teamId: "team_id" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  eq: vi.fn((col: unknown, val: unknown) => ({ type: "eq", col, val })),
}));

// Import after mocks
import { teamScopeResolver } from "../resolvers/team-resolver";
import { projectScopeResolver } from "../resolvers/project-resolver";
import { ScopeResolverRegistry } from "../resolvers/types";
import type { PermissionSubject, PermissionContext } from "../types";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSubject(
  overrides: Partial<PermissionSubject> = {},
): PermissionSubject {
  return { role: "user", userId: "user-1", ...overrides };
}

function makeContext(
  overrides: Partial<PermissionContext> = {},
): PermissionContext {
  return { organizationId: "org-1", ...overrides };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("teamScopeResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("returns false when no teamId in context", async () => {
    const result = await teamScopeResolver.resolve(
      makeSubject(),
      makeContext(),
    );

    expect(result).toBe(false);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("returns true when user is a team member", async () => {
    mockWhere.mockResolvedValue([{ id: "member-1" }]);

    const result = await teamScopeResolver.resolve(
      makeSubject({ userId: "user-1" }),
      makeContext({ teamId: "team-1" }),
    );

    expect(result).toBe(true);
    expect(mockSelect).toHaveBeenCalledOnce();
  });

  it("returns false when user is not a team member", async () => {
    mockWhere.mockResolvedValue([]);

    const result = await teamScopeResolver.resolve(
      makeSubject({ userId: "user-99" }),
      makeContext({ teamId: "team-1" }),
    );

    expect(result).toBe(false);
    expect(mockSelect).toHaveBeenCalledOnce();
  });

  it("has scope 'team'", () => {
    expect(teamScopeResolver.scope).toBe("team");
  });
});

describe("projectScopeResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
  });

  it("returns false when no projectId in context", async () => {
    const result = await projectScopeResolver.resolve(
      makeSubject(),
      makeContext(),
    );

    expect(result).toBe(false);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("returns false when project has no teamId", async () => {
    // First call: project lookup returns project with null teamId
    mockWhere.mockResolvedValueOnce([{ teamId: null }]);

    const result = await projectScopeResolver.resolve(
      makeSubject(),
      makeContext({ projectId: "proj-1" }),
    );

    expect(result).toBe(false);
    expect(mockSelect).toHaveBeenCalledOnce();
  });

  it("returns false when project is not found", async () => {
    mockWhere.mockResolvedValueOnce([]);

    const result = await projectScopeResolver.resolve(
      makeSubject(),
      makeContext({ projectId: "proj-missing" }),
    );

    expect(result).toBe(false);
    expect(mockSelect).toHaveBeenCalledOnce();
  });

  it("returns true when user is a member of the project's team", async () => {
    // First call: project lookup
    mockWhere.mockResolvedValueOnce([{ teamId: "team-1" }]);
    // Second call: team member lookup
    mockWhere.mockResolvedValueOnce([{ id: "member-1" }]);

    const result = await projectScopeResolver.resolve(
      makeSubject({ userId: "user-1" }),
      makeContext({ projectId: "proj-1" }),
    );

    expect(result).toBe(true);
    expect(mockSelect).toHaveBeenCalledTimes(2);
  });

  it("returns false when user is not a member of the project's team", async () => {
    mockWhere.mockResolvedValueOnce([{ teamId: "team-1" }]);
    mockWhere.mockResolvedValueOnce([]);

    const result = await projectScopeResolver.resolve(
      makeSubject({ userId: "user-99" }),
      makeContext({ projectId: "proj-1" }),
    );

    expect(result).toBe(false);
    expect(mockSelect).toHaveBeenCalledTimes(2);
  });

  it("has scope 'project'", () => {
    expect(projectScopeResolver.scope).toBe("project");
  });
});

describe("ScopeResolverRegistry", () => {
  it("register and get a resolver", () => {
    const registry = new ScopeResolverRegistry();
    registry.register(teamScopeResolver);

    expect(registry.get("team")).toBe(teamScopeResolver);
  });

  it("returns undefined for an unregistered scope", () => {
    const registry = new ScopeResolverRegistry();

    expect(registry.get("unknown")).toBeUndefined();
  });

  it("has returns true for a registered scope", () => {
    const registry = new ScopeResolverRegistry();
    registry.register(projectScopeResolver);

    expect(registry.has("project")).toBe(true);
  });

  it("has returns false for an unregistered scope", () => {
    const registry = new ScopeResolverRegistry();

    expect(registry.has("team")).toBe(false);
  });

  it("overwrites an existing resolver on re-register", () => {
    const registry = new ScopeResolverRegistry();
    const customResolver = { scope: "team", resolve: vi.fn() };

    registry.register(teamScopeResolver);
    registry.register(customResolver);

    expect(registry.get("team")).toBe(customResolver);
  });

  it("supports multiple resolvers independently", () => {
    const registry = new ScopeResolverRegistry();
    registry.register(teamScopeResolver);
    registry.register(projectScopeResolver);

    expect(registry.get("team")).toBe(teamScopeResolver);
    expect(registry.get("project")).toBe(projectScopeResolver);
    expect(registry.has("team")).toBe(true);
    expect(registry.has("project")).toBe(true);
  });
});
