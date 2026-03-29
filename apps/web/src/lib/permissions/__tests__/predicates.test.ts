import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hasRole,
  hasExactRole,
  can,
  scoped,
  all,
  any,
  not,
} from "@/lib/permissions/predicates";
import { ScopeResolverRegistry } from "@/lib/permissions/resolvers/types";
import type { ScopeResolver } from "@/lib/permissions/resolvers/types";
import type {
  PermissionSubject,
  PermissionContext,
} from "@/lib/permissions/types";

// ---------------------------------------------------------------------------
// Test subjects
// ---------------------------------------------------------------------------

const superadmin: PermissionSubject = { role: "superadmin", userId: "u1" };
const admin: PermissionSubject = { role: "admin", userId: "u2" };
const manager: PermissionSubject = { role: "manager", userId: "u3" };
const user: PermissionSubject = { role: "user", userId: "u4" };
const viewer: PermissionSubject = { role: "viewer", userId: "u5" };
const owner: PermissionSubject = { role: "owner", userId: "u6" };

// ---------------------------------------------------------------------------
// hasRole
// ---------------------------------------------------------------------------

describe("hasRole", () => {
  describe('hasRole("manager")', () => {
    const predicate = hasRole("manager");

    it("returns true for superadmin", () => {
      expect(predicate.check(superadmin)).toBe(true);
    });

    it("returns true for admin", () => {
      expect(predicate.check(admin)).toBe(true);
    });

    it("returns true for owner", () => {
      expect(predicate.check(owner)).toBe(true);
    });

    it("returns true for manager", () => {
      expect(predicate.check(manager)).toBe(true);
    });

    it("returns false for user", () => {
      expect(predicate.check(user)).toBe(false);
    });

    it("returns false for viewer", () => {
      expect(predicate.check(viewer)).toBe(false);
    });
  });

  describe("resolve returns same result as check", () => {
    const predicate = hasRole("manager");

    it("resolves true for superadmin", async () => {
      await expect(predicate.resolve(superadmin)).resolves.toBe(true);
    });

    it("resolves true for manager", async () => {
      await expect(predicate.resolve(manager)).resolves.toBe(true);
    });

    it("resolves false for user", async () => {
      await expect(predicate.resolve(user)).resolves.toBe(false);
    });

    it("resolves false for viewer", async () => {
      await expect(predicate.resolve(viewer)).resolves.toBe(false);
    });
  });

  it("has a descriptive label", () => {
    expect(hasRole("admin").label).toBe("hasRole(admin)");
  });
});

// ---------------------------------------------------------------------------
// hasExactRole
// ---------------------------------------------------------------------------

describe("hasExactRole", () => {
  describe('hasExactRole("superadmin")', () => {
    const predicate = hasExactRole("superadmin");

    it("returns true for superadmin", () => {
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

    it("returns false for user", () => {
      expect(predicate.check(user)).toBe(false);
    });

    it("returns false for viewer", () => {
      expect(predicate.check(viewer)).toBe(false);
    });
  });

  describe('hasExactRole("admin", "owner")', () => {
    const predicate = hasExactRole("admin", "owner");

    it("returns true for admin", () => {
      expect(predicate.check(admin)).toBe(true);
    });

    it("returns true for owner", () => {
      expect(predicate.check(owner)).toBe(true);
    });

    it("returns false for superadmin", () => {
      expect(predicate.check(superadmin)).toBe(false);
    });

    it("returns false for manager", () => {
      expect(predicate.check(manager)).toBe(false);
    });

    it("returns false for user", () => {
      expect(predicate.check(user)).toBe(false);
    });
  });

  describe("resolve returns same result as check", () => {
    const predicate = hasExactRole("superadmin");

    it("resolves true for superadmin", async () => {
      await expect(predicate.resolve(superadmin)).resolves.toBe(true);
    });

    it("resolves false for admin", async () => {
      await expect(predicate.resolve(admin)).resolves.toBe(false);
    });
  });

  it("has a descriptive label", () => {
    expect(hasExactRole("admin", "owner").label).toBe(
      "hasExactRole(admin, owner)",
    );
  });
});

// ---------------------------------------------------------------------------
// can
// ---------------------------------------------------------------------------

describe("can", () => {
  describe('can("project:create")', () => {
    const predicate = can("project:create");

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

  describe('can("superadmin:all")', () => {
    const predicate = can("superadmin:all");

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

    it("returns false for user", () => {
      expect(predicate.check(user)).toBe(false);
    });

    it("returns false for viewer", () => {
      expect(predicate.check(viewer)).toBe(false);
    });
  });

  describe("resolve returns same result as check", () => {
    const predicate = can("project:create");

    it("resolves true for superadmin", async () => {
      await expect(predicate.resolve(superadmin)).resolves.toBe(true);
    });

    it("resolves false for viewer", async () => {
      await expect(predicate.resolve(viewer)).resolves.toBe(false);
    });
  });

  it("has a descriptive label", () => {
    expect(can("project:create").label).toBe("can(project:create)");
  });
});

// ---------------------------------------------------------------------------
// scoped
// ---------------------------------------------------------------------------

describe("scoped", () => {
  let registry: ScopeResolverRegistry;
  let mockResolver: ScopeResolver;
  const context: PermissionContext = {
    organizationId: "org-1",
    teamId: "team-1",
  };

  beforeEach(() => {
    registry = new ScopeResolverRegistry();
    mockResolver = {
      scope: "team",
      resolve: vi.fn(),
    };
  });

  describe("check() — role-only fallback", () => {
    const predicate = scoped("team:read");

    it("returns true for user (hasRole('user') threshold)", () => {
      expect(predicate.check(user)).toBe(true);
    });

    it("returns true for manager", () => {
      expect(predicate.check(manager)).toBe(true);
    });

    it("returns true for admin", () => {
      expect(predicate.check(admin)).toBe(true);
    });

    it("returns true for superadmin", () => {
      expect(predicate.check(superadmin)).toBe(true);
    });

    it("returns false for viewer", () => {
      expect(predicate.check(viewer)).toBe(false);
    });
  });

  describe("resolve() — scope resolver delegation", () => {
    it("calls the registered resolver and returns its result", async () => {
      (mockResolver.resolve as ReturnType<typeof vi.fn>).mockResolvedValue(
        true,
      );
      registry.register(mockResolver);

      const predicate = scoped("team:read", registry);
      const result = await predicate.resolve(user, context);

      expect(result).toBe(true);
      expect(mockResolver.resolve).toHaveBeenCalledOnce();
      expect(mockResolver.resolve).toHaveBeenCalledWith(user, context);
    });

    it("returns false when the resolver returns false", async () => {
      (mockResolver.resolve as ReturnType<typeof vi.fn>).mockResolvedValue(
        false,
      );
      registry.register(mockResolver);

      const predicate = scoped("team:read", registry);
      const result = await predicate.resolve(user, context);

      expect(result).toBe(false);
    });

    it("returns false when no resolver is registered for the scope", async () => {
      // registry is empty — no resolver for "team"
      const predicate = scoped("team:read", registry);
      const result = await predicate.resolve(user, context);

      expect(result).toBe(false);
    });

    it("returns false when no registry is provided", async () => {
      const predicate = scoped("team:read");
      const result = await predicate.resolve(user, context);

      expect(result).toBe(false);
    });

    it("uses empty context object when none is provided", async () => {
      (mockResolver.resolve as ReturnType<typeof vi.fn>).mockResolvedValue(
        true,
      );
      registry.register(mockResolver);

      const predicate = scoped("team:read", registry);
      await predicate.resolve(user);

      expect(mockResolver.resolve).toHaveBeenCalledWith(user, {});
    });
  });

  it("extracts the correct scope from the permission key", async () => {
    const projectResolver: ScopeResolver = {
      scope: "project",
      resolve: vi.fn().mockResolvedValue(true),
    };
    registry.register(projectResolver);

    const predicate = scoped("project:read", registry);
    await predicate.resolve(user, { projectId: "proj-1" });

    expect(projectResolver.resolve).toHaveBeenCalledOnce();
  });

  it("has a descriptive label", () => {
    expect(scoped("team:read").label).toBe("scoped(team:read)");
  });
});

// ---------------------------------------------------------------------------
// all combinator
// ---------------------------------------------------------------------------

describe("all", () => {
  it("returns true when all predicates pass", () => {
    const predicate = all(hasRole("user"), can("project:read"));
    expect(predicate.check(user)).toBe(true);
  });

  it("returns false when any predicate fails", () => {
    const predicate = all(hasRole("user"), can("superadmin:all"));
    expect(predicate.check(user)).toBe(false);
  });

  it("returns false when the first predicate fails (short-circuits)", () => {
    const neverCalled = {
      label: "neverCalled",
      check: vi.fn().mockReturnValue(true),
      resolve: vi.fn().mockResolvedValue(true),
    };
    const alwaysFalse = {
      label: "alwaysFalse",
      check: vi.fn().mockReturnValue(false),
      resolve: vi.fn().mockResolvedValue(false),
    };

    const predicate = all(alwaysFalse, neverCalled);
    const result = predicate.check(user);

    expect(result).toBe(false);
    expect(neverCalled.check).not.toHaveBeenCalled();
  });

  it("resolve returns false and short-circuits on first failure", async () => {
    const neverCalled = {
      label: "neverCalled",
      check: vi.fn().mockReturnValue(true),
      resolve: vi.fn().mockResolvedValue(true),
    };
    const alwaysFalse = {
      label: "alwaysFalse",
      check: vi.fn().mockReturnValue(false),
      resolve: vi.fn().mockResolvedValue(false),
    };

    const predicate = all(alwaysFalse, neverCalled);
    const result = await predicate.resolve(user);

    expect(result).toBe(false);
    expect(neverCalled.resolve).not.toHaveBeenCalled();
  });

  it("returns true when predicate list is empty", () => {
    expect(all().check(user)).toBe(true);
  });

  it("has a descriptive label", () => {
    const predicate = all(hasRole("user"), can("project:read"));
    expect(predicate.label).toBe("all(hasRole(user), can(project:read))");
  });
});

// ---------------------------------------------------------------------------
// any combinator
// ---------------------------------------------------------------------------

describe("any", () => {
  it("returns true when any predicate passes", () => {
    const predicate = any(can("superadmin:all"), can("project:read"));
    expect(predicate.check(viewer)).toBe(true);
  });

  it("returns false when all predicates fail", () => {
    const predicate = any(can("superadmin:all"), hasExactRole("admin"));
    expect(predicate.check(user)).toBe(false);
  });

  it("short-circuits on first passing predicate", () => {
    const neverCalled = {
      label: "neverCalled",
      check: vi.fn().mockReturnValue(false),
      resolve: vi.fn().mockResolvedValue(false),
    };
    const alwaysTrue = {
      label: "alwaysTrue",
      check: vi.fn().mockReturnValue(true),
      resolve: vi.fn().mockResolvedValue(true),
    };

    const predicate = any(alwaysTrue, neverCalled);
    const result = predicate.check(user);

    expect(result).toBe(true);
    expect(neverCalled.check).not.toHaveBeenCalled();
  });

  it("resolve returns true and short-circuits on first success", async () => {
    const neverCalled = {
      label: "neverCalled",
      check: vi.fn().mockReturnValue(false),
      resolve: vi.fn().mockResolvedValue(false),
    };
    const alwaysTrue = {
      label: "alwaysTrue",
      check: vi.fn().mockReturnValue(true),
      resolve: vi.fn().mockResolvedValue(true),
    };

    const predicate = any(alwaysTrue, neverCalled);
    const result = await predicate.resolve(user);

    expect(result).toBe(true);
    expect(neverCalled.resolve).not.toHaveBeenCalled();
  });

  it("returns false when predicate list is empty", () => {
    expect(any().check(user)).toBe(false);
  });

  it("has a descriptive label", () => {
    const predicate = any(hasRole("admin"), can("superadmin:all"));
    expect(predicate.label).toBe("any(hasRole(admin), can(superadmin:all))");
  });
});

// ---------------------------------------------------------------------------
// not combinator
// ---------------------------------------------------------------------------

describe("not", () => {
  it("inverts a true result to false", () => {
    const predicate = not(hasRole("user"));
    expect(predicate.check(user)).toBe(false);
  });

  it("inverts a false result to true", () => {
    const predicate = not(hasRole("user"));
    expect(predicate.check(viewer)).toBe(true);
  });

  it("resolve inverts a true result to false", async () => {
    const predicate = not(hasRole("admin"));
    await expect(predicate.resolve(admin)).resolves.toBe(false);
  });

  it("resolve inverts a false result to true", async () => {
    const predicate = not(hasRole("admin"));
    await expect(predicate.resolve(user)).resolves.toBe(true);
  });

  it("has a descriptive label", () => {
    expect(not(hasRole("user")).label).toBe("not(hasRole(user))");
  });

  it("double not returns original result", () => {
    const predicate = not(not(hasRole("user")));
    expect(predicate.check(user)).toBe(true);
    expect(predicate.check(viewer)).toBe(false);
  });
});
