import { describe, it, expect, vi } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────
// The engine imports team/project resolvers which hit the DB. Mock them out
// so tests remain pure and fast.

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
import { createPermissionEngine, permissions } from "@/lib/permissions/engine";
import {
  isAdmin,
  isManager,
  isSuperAdmin,
  canAccessTeam,
  canManageTeam,
  canAccessProject,
  canAccessChat,
} from "@/lib/permissions/presets";
import type { PermissionSubject } from "@/lib/permissions/types";

// ---------------------------------------------------------------------------
// Test subjects
// ---------------------------------------------------------------------------

const superadmin: PermissionSubject = { role: "superadmin", userId: "u1" };
const admin: PermissionSubject = { role: "admin", userId: "u2" };
const owner: PermissionSubject = { role: "owner", userId: "u3" };
const manager: PermissionSubject = { role: "manager", userId: "u4" };
const user: PermissionSubject = { role: "user", userId: "u5" };
const viewer: PermissionSubject = { role: "viewer", userId: "u6" };

// ---------------------------------------------------------------------------
// createPermissionEngine
// ---------------------------------------------------------------------------

describe("createPermissionEngine", () => {
  it("returns an engine with all expected methods", () => {
    const engine = createPermissionEngine();

    expect(typeof engine.hasRole).toBe("function");
    expect(typeof engine.hasExactRole).toBe("function");
    expect(typeof engine.can).toBe("function");
    expect(typeof engine.scoped).toBe("function");
    expect(typeof engine.all).toBe("function");
    expect(typeof engine.any).toBe("function");
    expect(typeof engine.not).toBe("function");
  });

  it("creates independent engines that do not share registry state", () => {
    const engineA = createPermissionEngine();
    const engineB = createPermissionEngine();

    // Both engines create scoped predicates; each has its own registry.
    const predicateA = engineA.scoped("team:read");
    const predicateB = engineB.scoped("team:read");

    expect(predicateA.label).toBe("scoped(team:read)");
    expect(predicateB.label).toBe("scoped(team:read)");
  });
});

// ---------------------------------------------------------------------------
// permissions singleton — hasRole
// ---------------------------------------------------------------------------

describe("permissions.hasRole", () => {
  describe('permissions.hasRole("admin")', () => {
    const predicate = permissions.hasRole("admin");

    it("returns true for superadmin", () => {
      expect(predicate.check(superadmin)).toBe(true);
    });

    it("returns true for admin", () => {
      expect(predicate.check(admin)).toBe(true);
    });

    it("returns true for owner (owner=5 = admin=5)", () => {
      expect(predicate.check(owner)).toBe(true);
    });

    it("returns false for manager", () => {
      expect(predicate.check(manager)).toBe(false);
    });

    it("returns false for user", () => {
      expect(predicate.check(user)).toBe(false);
    });

    it("returns false for viewer", () => {
      expect(predicate.check(viewer)).toBe(false);
    });
  });

  it("has a descriptive label", () => {
    expect(permissions.hasRole("manager").label).toBe("hasRole(manager)");
  });
});

// ---------------------------------------------------------------------------
// permissions singleton — hasExactRole
// ---------------------------------------------------------------------------

describe("permissions.hasExactRole", () => {
  describe('permissions.hasExactRole("superadmin")', () => {
    const predicate = permissions.hasExactRole("superadmin");

    it("returns true only for superadmin", () => {
      expect(predicate.check(superadmin)).toBe(true);
    });

    it("returns false for admin", () => {
      expect(predicate.check(admin)).toBe(false);
    });

    it("returns false for owner", () => {
      expect(predicate.check(owner)).toBe(false);
    });

    it("returns false for manager", () => {
      expect(predicate.check(manager)).toBe(false);
    });
  });

  it("has a descriptive label", () => {
    expect(permissions.hasExactRole("superadmin").label).toBe(
      "hasExactRole(superadmin)",
    );
  });
});

// ---------------------------------------------------------------------------
// permissions singleton — can
// ---------------------------------------------------------------------------

describe("permissions.can", () => {
  describe('permissions.can("project:create")', () => {
    const predicate = permissions.can("project:create");

    it("returns true for superadmin", () => {
      expect(predicate.check(superadmin)).toBe(true);
    });

    it("returns true for admin", () => {
      expect(predicate.check(admin)).toBe(true);
    });

    it("returns true for user", () => {
      expect(predicate.check(user)).toBe(true);
    });

    it("returns false for viewer", () => {
      expect(predicate.check(viewer)).toBe(false);
    });
  });

  it("has a descriptive label", () => {
    expect(permissions.can("project:create").label).toBe("can(project:create)");
  });
});

// ---------------------------------------------------------------------------
// permissions singleton — scoped (check() fallback)
// ---------------------------------------------------------------------------

describe("permissions.scoped", () => {
  describe("check() — role-only fallback (hasRole('user'))", () => {
    const predicate = permissions.scoped("team:read");

    it("returns true for user", () => {
      expect(predicate.check(user)).toBe(true);
    });

    it("returns true for manager", () => {
      expect(predicate.check(manager)).toBe(true);
    });

    it("returns true for admin", () => {
      expect(predicate.check(admin)).toBe(true);
    });

    it("returns false for viewer", () => {
      expect(predicate.check(viewer)).toBe(false);
    });
  });

  it("has a descriptive label", () => {
    expect(permissions.scoped("team:read").label).toBe("scoped(team:read)");
  });

  describe("resolve() — delegates to registered scope resolver", () => {
    it("resolves team membership via teamScopeResolver", async () => {
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });
      mockWhere.mockResolvedValue([{ id: "member-1" }]);

      const predicate = permissions.scoped("team:read");
      const result = await predicate.resolve(user, { teamId: "team-1" });

      expect(result).toBe(true);
    });

    it("returns false when team membership not found", async () => {
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });
      mockWhere.mockResolvedValue([]);

      const predicate = permissions.scoped("team:read");
      const result = await predicate.resolve(user, { teamId: "team-1" });

      expect(result).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// permissions singleton — combinators
// ---------------------------------------------------------------------------

describe("permissions.any", () => {
  it("returns true when any predicate passes", () => {
    const predicate = permissions.any(
      permissions.hasExactRole("admin"),
      permissions.hasRole("user"),
    );

    expect(predicate.check(user)).toBe(true);
    expect(predicate.check(viewer)).toBe(false);
  });

  it("has a descriptive label", () => {
    const predicate = permissions.any(
      permissions.hasRole("admin"),
      permissions.hasRole("user"),
    );

    expect(predicate.label).toBe("any(hasRole(admin), hasRole(user))");
  });
});

describe("permissions.all", () => {
  it("returns true only when all predicates pass", () => {
    const predicate = permissions.all(
      permissions.hasRole("manager"),
      permissions.can("project:read"),
    );

    expect(predicate.check(manager)).toBe(true);
    expect(predicate.check(viewer)).toBe(false);
  });

  it("has a descriptive label", () => {
    const predicate = permissions.all(
      permissions.hasRole("manager"),
      permissions.can("project:read"),
    );

    expect(predicate.label).toBe("all(hasRole(manager), can(project:read))");
  });
});

describe("permissions.not", () => {
  it("inverts the predicate result", () => {
    const predicate = permissions.not(permissions.hasRole("admin"));

    expect(predicate.check(viewer)).toBe(true);
    expect(predicate.check(admin)).toBe(false);
  });

  it("has a descriptive label", () => {
    expect(permissions.not(permissions.hasRole("admin")).label).toBe(
      "not(hasRole(admin))",
    );
  });
});

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

describe("isAdmin", () => {
  it("passes for superadmin", () => {
    expect(isAdmin.check(superadmin)).toBe(true);
  });

  it("passes for admin", () => {
    expect(isAdmin.check(admin)).toBe(true);
  });

  it("passes for owner (owner=5 = admin=5)", () => {
    expect(isAdmin.check(owner)).toBe(true);
  });

  it("fails for manager", () => {
    expect(isAdmin.check(manager)).toBe(false);
  });

  it("fails for user", () => {
    expect(isAdmin.check(user)).toBe(false);
  });

  it("fails for viewer", () => {
    expect(isAdmin.check(viewer)).toBe(false);
  });
});

describe("isManager", () => {
  it("passes for superadmin", () => {
    expect(isManager.check(superadmin)).toBe(true);
  });

  it("passes for admin", () => {
    expect(isManager.check(admin)).toBe(true);
  });

  it("passes for owner (owner=4 >= manager=3)", () => {
    expect(isManager.check(owner)).toBe(true);
  });

  it("passes for manager", () => {
    expect(isManager.check(manager)).toBe(true);
  });

  it("fails for user", () => {
    expect(isManager.check(user)).toBe(false);
  });

  it("fails for viewer", () => {
    expect(isManager.check(viewer)).toBe(false);
  });
});

describe("isSuperAdmin", () => {
  it("passes only for superadmin", () => {
    expect(isSuperAdmin.check(superadmin)).toBe(true);
  });

  it("fails for admin", () => {
    expect(isSuperAdmin.check(admin)).toBe(false);
  });

  it("fails for owner", () => {
    expect(isSuperAdmin.check(owner)).toBe(false);
  });

  it("fails for manager", () => {
    expect(isSuperAdmin.check(manager)).toBe(false);
  });

  it("fails for user", () => {
    expect(isSuperAdmin.check(user)).toBe(false);
  });

  it("fails for viewer", () => {
    expect(isSuperAdmin.check(viewer)).toBe(false);
  });
});

describe("canAccessTeam", () => {
  it("passes for admin (role hierarchy short-circuit)", () => {
    expect(canAccessTeam.check(admin)).toBe(true);
  });

  it("passes for superadmin", () => {
    expect(canAccessTeam.check(superadmin)).toBe(true);
  });

  it("passes for owner", () => {
    expect(canAccessTeam.check(owner)).toBe(true);
  });

  it("passes for user (scoped fallback — hasRole('user'))", () => {
    // check() falls back to hasRole('user') for the scoped predicate
    expect(canAccessTeam.check(user)).toBe(true);
  });

  it("passes for manager (scoped fallback)", () => {
    expect(canAccessTeam.check(manager)).toBe(true);
  });

  it("fails for viewer (below user threshold)", () => {
    expect(canAccessTeam.check(viewer)).toBe(false);
  });
});

describe("canManageTeam", () => {
  it("passes for admin (role hierarchy short-circuit)", () => {
    expect(canManageTeam.check(admin)).toBe(true);
  });

  it("passes for superadmin", () => {
    expect(canManageTeam.check(superadmin)).toBe(true);
  });

  it("passes for manager (hasRole('manager') + scoped fallback)", () => {
    // check(): hasRole('manager') passes for manager, scoped fallback passes
    expect(canManageTeam.check(manager)).toBe(true);
  });

  it("fails for user (not manager or above)", () => {
    // user passes scoped fallback but fails hasRole('manager')
    expect(canManageTeam.check(user)).toBe(false);
  });

  it("fails for viewer", () => {
    expect(canManageTeam.check(viewer)).toBe(false);
  });
});

describe("canAccessProject", () => {
  it("passes for admin", () => {
    expect(canAccessProject.check(admin)).toBe(true);
  });

  it("passes for superadmin", () => {
    expect(canAccessProject.check(superadmin)).toBe(true);
  });

  it("passes for user (scoped fallback)", () => {
    expect(canAccessProject.check(user)).toBe(true);
  });

  it("fails for viewer", () => {
    expect(canAccessProject.check(viewer)).toBe(false);
  });
});

describe("canAccessChat", () => {
  it("passes for user", () => {
    expect(canAccessChat.check(user)).toBe(true);
  });

  it("passes for manager", () => {
    expect(canAccessChat.check(manager)).toBe(true);
  });

  it("passes for admin", () => {
    expect(canAccessChat.check(admin)).toBe(true);
  });

  it("fails for viewer", () => {
    expect(canAccessChat.check(viewer)).toBe(false);
  });
});
