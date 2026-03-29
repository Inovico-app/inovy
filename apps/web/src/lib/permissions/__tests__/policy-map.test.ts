import { describe, expect, it } from "vitest";
import {
  POLICY_MAP,
  computePermissionSet,
  roleHasPermission,
} from "@/lib/permissions/policy-map";
import type { RoleName } from "@/lib/auth/access-control";

// ---------------------------------------------------------------------------
// POLICY_MAP shape
// ---------------------------------------------------------------------------

describe("POLICY_MAP", () => {
  const ALL_ROLES: RoleName[] = [
    "superadmin",
    "owner",
    "admin",
    "manager",
    "user",
    "viewer",
  ];

  it("has an entry for every role", () => {
    for (const role of ALL_ROLES) {
      expect(POLICY_MAP).toHaveProperty(role);
      expect(POLICY_MAP[role]).toBeInstanceOf(Set);
    }
  });

  it("never contains permissions with empty actions (resource: only keys)", () => {
    for (const role of ALL_ROLES) {
      for (const key of POLICY_MAP[role]) {
        expect(key).toMatch(/^.+:.+$/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// superadmin — full access
// ---------------------------------------------------------------------------

describe("superadmin permissions", () => {
  it("has project CRUD", () => {
    expect(roleHasPermission("superadmin", "project:create")).toBe(true);
    expect(roleHasPermission("superadmin", "project:read")).toBe(true);
    expect(roleHasPermission("superadmin", "project:update")).toBe(true);
    expect(roleHasPermission("superadmin", "project:delete")).toBe(true);
  });

  it("has superadmin:all", () => {
    expect(roleHasPermission("superadmin", "superadmin:all")).toBe(true);
  });

  it("has admin:all", () => {
    expect(roleHasPermission("superadmin", "admin:all")).toBe(true);
  });

  it("has organization CRUD including list", () => {
    expect(roleHasPermission("superadmin", "organization:create")).toBe(true);
    expect(roleHasPermission("superadmin", "organization:list")).toBe(true);
    expect(roleHasPermission("superadmin", "organization:delete")).toBe(true);
  });

  it("has invitation:create and invitation:cancel", () => {
    expect(roleHasPermission("superadmin", "invitation:create")).toBe(true);
    expect(roleHasPermission("superadmin", "invitation:cancel")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// viewer — read-only
// ---------------------------------------------------------------------------

describe("viewer permissions", () => {
  it("can read projects", () => {
    expect(roleHasPermission("viewer", "project:read")).toBe(true);
  });

  it("cannot create, update, or delete projects", () => {
    expect(roleHasPermission("viewer", "project:create")).toBe(false);
    expect(roleHasPermission("viewer", "project:update")).toBe(false);
    expect(roleHasPermission("viewer", "project:delete")).toBe(false);
  });

  it("cannot perform any organization mutations", () => {
    expect(roleHasPermission("viewer", "organization:create")).toBe(false);
    expect(roleHasPermission("viewer", "organization:update")).toBe(false);
    expect(roleHasPermission("viewer", "organization:delete")).toBe(false);
  });

  it("has no superadmin or admin powers", () => {
    expect(roleHasPermission("viewer", "superadmin:all")).toBe(false);
    expect(roleHasPermission("viewer", "admin:all")).toBe(false);
  });

  it("can read recordings and tasks", () => {
    expect(roleHasPermission("viewer", "recording:read")).toBe(true);
    expect(roleHasPermission("viewer", "task:read")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// user — cannot delete
// ---------------------------------------------------------------------------

describe("user permissions", () => {
  it("can create, read, and update projects but NOT delete", () => {
    expect(roleHasPermission("user", "project:create")).toBe(true);
    expect(roleHasPermission("user", "project:read")).toBe(true);
    expect(roleHasPermission("user", "project:update")).toBe(true);
    expect(roleHasPermission("user", "project:delete")).toBe(false);
  });

  it("cannot delete recordings", () => {
    expect(roleHasPermission("user", "recording:delete")).toBe(false);
  });

  it("has no admin or superadmin powers", () => {
    expect(roleHasPermission("user", "admin:all")).toBe(false);
    expect(roleHasPermission("user", "superadmin:all")).toBe(false);
  });

  it("cannot manage integrations", () => {
    expect(roleHasPermission("user", "integration:manage")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// owner == admin (alias in roles object)
// ---------------------------------------------------------------------------

describe("owner permissions", () => {
  it("has the same permissions as admin", () => {
    const ownerPerms = POLICY_MAP["owner"];
    const adminPerms = POLICY_MAP["admin"];

    // Same size
    expect(ownerPerms.size).toBe(adminPerms.size);

    // Every owner permission exists in admin
    for (const perm of ownerPerms) {
      expect(adminPerms.has(perm)).toBe(true);
    }

    // Every admin permission exists in owner
    for (const perm of adminPerms) {
      expect(ownerPerms.has(perm)).toBe(true);
    }
  });

  it("has admin:all but NOT superadmin:all", () => {
    expect(roleHasPermission("owner", "admin:all")).toBe(true);
    expect(roleHasPermission("owner", "superadmin:all")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// roleHasPermission — type guard behaviour
// ---------------------------------------------------------------------------

describe("roleHasPermission", () => {
  it("returns false for a valid key that the role simply lacks", () => {
    expect(roleHasPermission("viewer", "team:create")).toBe(false);
  });

  it("returns true for a permission the role has", () => {
    expect(roleHasPermission("manager", "setting:update")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computePermissionSet — returns a mutable copy
// ---------------------------------------------------------------------------

describe("computePermissionSet", () => {
  it("returns a Set equal in content to POLICY_MAP entry", () => {
    const set = computePermissionSet("manager");
    expect(set.size).toBe(POLICY_MAP["manager"].size);
    for (const perm of POLICY_MAP["manager"]) {
      expect(set.has(perm)).toBe(true);
    }
  });

  it("returns a copy — mutations do not affect POLICY_MAP", () => {
    const original = POLICY_MAP["manager"].size;
    const copy = computePermissionSet("manager");
    copy.add("superadmin:all");
    expect(POLICY_MAP["manager"].size).toBe(original);
  });
});
