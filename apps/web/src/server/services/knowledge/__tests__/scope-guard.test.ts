import type { AuthContext } from "@/lib/auth-context";
import { ScopeGuard } from "../scope-guard";

// ============================================================================
// Mock functions
// ============================================================================

const mockFindById = vi.fn();
const mockSelectTeamById = vi.fn();
const mockSelectUserTeam = vi.fn();
const mockCheckPermission = vi.fn();

vi.mock("@/server/data-access/projects.queries", () => ({
  ProjectQueries: {
    findById: (...args: unknown[]) => mockFindById(...args),
  },
}));

vi.mock("@/server/data-access/teams.queries", () => ({
  TeamQueries: {
    selectTeamById: (...args: unknown[]) => mockSelectTeamById(...args),
  },
  UserTeamQueries: {
    selectUserTeam: (...args: unknown[]) => mockSelectUserTeam(...args),
  },
}));

vi.mock("@/lib/rbac/permissions-server", () => ({
  checkPermission: (...args: unknown[]) => mockCheckPermission(...args),
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
// Test AuthContext
// ============================================================================

const mockAuth: AuthContext = {
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@test.com",
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    emailVerified: true,
    twoFactorEnabled: false,
  },
  organizationId: "org-1",
  userTeamIds: ["team-1"],
};

// ============================================================================
// Tests: ScopeGuard.validate()
// ============================================================================

describe("ScopeGuard.validate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // Project scope
  // --------------------------------------------------------------------------

  it("project scope — valid project returns ok()", async () => {
    mockFindById.mockResolvedValue({ id: "proj-1", organizationId: "org-1" });

    const result = await ScopeGuard.validate(
      "project",
      "proj-1",
      "user-1",
      "read",
      mockAuth,
    );

    expect(result.isOk()).toBe(true);
    expect(mockFindById).toHaveBeenCalledWith("proj-1", "org-1");
  });

  it("project scope — null scopeId returns err with BAD_REQUEST", async () => {
    const result = await ScopeGuard.validate(
      "project",
      null,
      "user-1",
      "read",
      mockAuth,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.message).toContain("Project scope requires scopeId");
    }
  });

  it("project scope — non-existent project returns err with NOT_FOUND", async () => {
    mockFindById.mockResolvedValue(null);

    const result = await ScopeGuard.validate(
      "project",
      "proj-nonexistent",
      "user-1",
      "read",
      mockAuth,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("NOT_FOUND");
      expect(result.error.message).toContain("Project not found");
    }
  });

  // --------------------------------------------------------------------------
  // Team scope
  // --------------------------------------------------------------------------

  it("team scope — write without membership returns err with FORBIDDEN", async () => {
    mockSelectTeamById.mockResolvedValue({ id: "team-1" });
    mockSelectUserTeam.mockResolvedValue(null);

    const result = await ScopeGuard.validate(
      "team",
      "team-1",
      "user-1",
      "write",
      mockAuth,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("FORBIDDEN");
      expect(result.error.message).toContain("not a member of this team");
    }
  });

  it("team scope — write with membership returns ok()", async () => {
    mockSelectTeamById.mockResolvedValue({ id: "team-1" });
    mockSelectUserTeam.mockResolvedValue({
      userId: "user-1",
      teamId: "team-1",
    });

    const result = await ScopeGuard.validate(
      "team",
      "team-1",
      "user-1",
      "write",
      mockAuth,
    );

    expect(result.isOk()).toBe(true);
    expect(mockSelectTeamById).toHaveBeenCalledWith("team-1", "org-1");
    expect(mockSelectUserTeam).toHaveBeenCalledWith("user-1", "team-1");
  });

  // --------------------------------------------------------------------------
  // Organization scope
  // --------------------------------------------------------------------------

  it("organization scope — write without permission returns err with FORBIDDEN", async () => {
    mockCheckPermission.mockResolvedValue(false);

    const result = await ScopeGuard.validate(
      "organization",
      "org-1",
      "user-1",
      "write",
      mockAuth,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("FORBIDDEN");
      expect(result.error.message).toContain("admin or manager permissions");
    }
  });

  it("organization scope — mismatched org returns err with FORBIDDEN", async () => {
    const result = await ScopeGuard.validate(
      "organization",
      "org-other",
      "user-1",
      "read",
      mockAuth,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("FORBIDDEN");
      expect(result.error.message).toContain(
        "Cannot access other organization",
      );
    }
  });

  // --------------------------------------------------------------------------
  // Global scope
  // --------------------------------------------------------------------------

  it("global scope — non-null scopeId returns err with BAD_REQUEST", async () => {
    const result = await ScopeGuard.validate(
      "global",
      "some-id",
      "user-1",
      "read",
      mockAuth,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("BAD_REQUEST");
      expect(result.error.message).toContain(
        "Global scope must have null scopeId",
      );
    }
  });

  it("global scope — write without admin returns err with FORBIDDEN", async () => {
    mockCheckPermission.mockResolvedValue(false);

    const result = await ScopeGuard.validate(
      "global",
      null,
      "user-1",
      "write",
      mockAuth,
    );

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("FORBIDDEN");
      expect(result.error.message).toContain("super admin permissions");
    }
  });

  it("global scope — read returns ok()", async () => {
    const result = await ScopeGuard.validate(
      "global",
      null,
      "user-1",
      "read",
      mockAuth,
    );

    expect(result.isOk()).toBe(true);
  });
});
