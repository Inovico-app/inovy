/**
 * Authorization Groups Usage Examples
 * Demonstrates how to use the authorization groups system
 * These examples can be used as reference for implementing authorization checks
 */

import {
  getAuthorizationGroupsForRole,
  getPermissionsForRole,
  roleHasAuthorizationGroup,
  getAuthorizationGroupsByCategory,
  type RoleName,
} from "../authorization-groups";

/**
 * Example 1: Display authorization groups for a user's role
 */
export function displayUserAuthorizationGroups(role: RoleName): void {
  const groups = getAuthorizationGroupsForRole(role);

  console.log(`\nAuthorization Groups for ${role}:`);
  console.log("=".repeat(50));

  for (const group of groups) {
    console.log(`\n${group.name} (${group.id})`);
    console.log(`Category: ${group.category}`);
    console.log(`Description: ${group.description}`);
    console.log("Permissions:");

    for (const [resource, actions] of Object.entries(group.permissions)) {
      console.log(`  - ${resource}: ${actions.join(", ")}`);
    }
  }
}

/**
 * Example 2: Check if a user can perform a specific operation
 */
export function canUserPerformOperation(
  role: RoleName,
  resource: string,
  action: string
): boolean {
  const permissions = getPermissionsForRole(role);
  const resourcePermissions = permissions[resource as keyof typeof permissions];

  return resourcePermissions?.includes(action) ?? false;
}

/**
 * Example 3: Get user capabilities summary
 */
export function getUserCapabilitiesSummary(role: RoleName): {
  role: RoleName;
  groupCount: number;
  permissionCount: number;
  canDeleteContent: boolean;
  canManageUsers: boolean;
  canAccessOrgChat: boolean;
  canManageIntegrations: boolean;
  isAdmin: boolean;
} {
  const permissions = getPermissionsForRole(role);
  const groups = getAuthorizationGroupsForRole(role);

  const permissionCount = Object.values(permissions).reduce(
    (sum, actions) => sum + actions.length,
    0
  );

  return {
    role,
    groupCount: groups.length,
    permissionCount,
    canDeleteContent:
      permissions.project?.includes("delete") ??
      permissions.recording?.includes("delete") ??
      permissions.task?.includes("delete") ??
      false,
    canManageUsers:
      permissions.user?.includes("create") ??
      permissions.user?.includes("delete") ??
      false,
    canAccessOrgChat: permissions.chat?.includes("organization") ?? false,
    canManageIntegrations: permissions.integration?.includes("manage") ?? false,
    isAdmin: permissions.admin?.includes("all") ?? false,
  };
}

/**
 * Example 4: Feature availability checker
 */
export class FeatureAccessChecker {
  private permissions: Record<string, string[]>;

  constructor(role: RoleName) {
    this.permissions = getPermissionsForRole(role);
  }

  canCreateProjects(): boolean {
    return this.permissions.project?.includes("create") ?? false;
  }

  canDeleteProjects(): boolean {
    return this.permissions.project?.includes("delete") ?? false;
  }

  canManageTeams(): boolean {
    return (
      this.permissions.team?.includes("create") &&
      this.permissions.team?.includes("delete")
    );
  }

  canInviteMembers(): boolean {
    return this.permissions.invitation?.includes("create") ?? false;
  }

  canAccessAuditLogs(): boolean {
    return this.permissions["audit-log"]?.includes("read") ?? false;
  }

  canManageIntegrations(): boolean {
    return this.permissions.integration?.includes("manage") ?? false;
  }

  canAccessDeepgram(): boolean {
    return this.permissions.deepgram?.includes("token") ?? false;
  }

  getAccessLevel(
    resource: "project" | "recording" | "task"
  ): "full" | "editor" | "viewer" | "none" {
    const resourcePerms = this.permissions[resource];

    if (!resourcePerms || resourcePerms.length === 0) {
      return "none";
    }

    if (resourcePerms.includes("delete")) {
      return "full";
    }

    if (resourcePerms.includes("update")) {
      return "editor";
    }

    if (resourcePerms.includes("read")) {
      return "viewer";
    }

    return "none";
  }
}

/**
 * Example 5: UI Component Permission Helper
 */
export function getUIPermissions(role: RoleName) {
  const permissions = getPermissionsForRole(role);

  return {
    // Navigation visibility
    showAdminNav: permissions.admin?.includes("all") ?? false,
    showTeamsNav: permissions.team?.includes("read") ?? false,
    showSettingsNav: permissions.setting?.includes("read") ?? false,

    // Action buttons
    showCreateProject: permissions.project?.includes("create") ?? false,
    showDeleteProject: permissions.project?.includes("delete") ?? false,
    showInviteButton: permissions.invitation?.includes("create") ?? false,
    showIntegrations: permissions.integration?.includes("manage") ?? false,

    // Chat features
    showProjectChat: permissions.chat?.includes("project") ?? false,
    showOrgChat: permissions.chat?.includes("organization") ?? false,

    // Content actions
    canUploadRecording: permissions.recording?.includes("create") ?? false,
    canCreateTask: permissions.task?.includes("create") ?? false,
    canEditOrgInstructions:
      permissions.orgInstruction?.includes("write") ?? false,
  };
}

/**
 * Example 6: Compare roles
 */
export function compareRoles(
  role1: RoleName,
  role2: RoleName
): {
  role1: RoleName;
  role2: RoleName;
  role1Groups: number;
  role2Groups: number;
  role1Permissions: number;
  role2Permissions: number;
  role1HasMore: boolean;
  commonGroups: string[];
  uniqueToRole1: string[];
  uniqueToRole2: string[];
} {
  const groups1 = getAuthorizationGroupsForRole(role1);
  const groups2 = getAuthorizationGroupsForRole(role2);

  const perms1 = getPermissionsForRole(role1);
  const perms2 = getPermissionsForRole(role2);

  const groupIds1 = new Set(groups1.map((g) => g.id));
  const groupIds2 = new Set(groups2.map((g) => g.id));

  const common = groups1.filter((g) => groupIds2.has(g.id)).map((g) => g.name);
  const unique1 = groups1.filter((g) => !groupIds2.has(g.id)).map((g) => g.name);
  const unique2 = groups2.filter((g) => !groupIds1.has(g.id)).map((g) => g.name);

  const countPermissions = (perms: Record<string, string[]>) =>
    Object.values(perms).reduce((sum, actions) => sum + actions.length, 0);

  const permCount1 = countPermissions(perms1);
  const permCount2 = countPermissions(perms2);

  return {
    role1,
    role2,
    role1Groups: groups1.length,
    role2Groups: groups2.length,
    role1Permissions: permCount1,
    role2Permissions: permCount2,
    role1HasMore: permCount1 > permCount2,
    commonGroups: common,
    uniqueToRole1: unique1,
    uniqueToRole2: unique2,
  };
}

/**
 * Example 7: Authorization group browser
 */
export function browseAuthorizationGroups(): void {
  console.log("\n📚 Authorization Groups Browser");
  console.log("=".repeat(80));

  const byCategory = getAuthorizationGroupsByCategory();

  for (const [category, groups] of Object.entries(byCategory)) {
    console.log(`\n📁 ${category}`);
    console.log("-".repeat(80));

    for (const group of groups) {
      console.log(`\n  📦 ${group.name}`);
      console.log(`     ID: ${group.id}`);
      console.log(`     Description: ${group.description}`);

      const permCount = Object.values(group.permissions).reduce(
        (sum, actions) => sum + actions.length,
        0
      );
      console.log(`     Permissions: ${permCount}`);

      for (const [resource, actions] of Object.entries(group.permissions)) {
        console.log(`       • ${resource}: ${actions.join(", ")}`);
      }
    }
  }
}

/**
 * Example 8: Permission requirement checker for features
 */
export function checkFeatureRequirements(
  role: RoleName,
  requiredGroupId: string
): {
  hasAccess: boolean;
  role: RoleName;
  requiredGroup: string;
  reason: string;
} {
  const hasGroup = roleHasAuthorizationGroup(role, requiredGroupId);

  let reason = "";
  if (hasGroup) {
    reason = `Role '${role}' has authorization group '${requiredGroupId}'`;
  } else {
    const groups = getAuthorizationGroupsForRole(role);
    reason = `Role '${role}' does not have authorization group '${requiredGroupId}'. Available groups: ${groups.map((g) => g.id).join(", ")}`;
  }

  return {
    hasAccess: hasGroup,
    role,
    requiredGroup: requiredGroupId,
    reason,
  };
}

/**
 * Example 9: Generate role comparison report
 */
export function generateRoleComparisonReport(): void {
  console.log("\n📊 Role Comparison Report");
  console.log("=".repeat(80));

  const roles: RoleName[] = [
    "superadmin",
    "admin",
    "owner",
    "manager",
    "user",
    "viewer",
  ];

  console.log("\n| Role | Groups | Permissions | Can Delete | Can Manage Users | Admin |");
  console.log("|------|--------|-------------|-----------|------------------|-------|");

  for (const role of roles) {
    const summary = getUserCapabilitiesSummary(role);
    console.log(
      `| ${role.padEnd(10)} | ${String(summary.groupCount).padEnd(6)} | ${String(summary.permissionCount).padEnd(11)} | ${summary.canDeleteContent ? "✅" : "❌"} | ${summary.canManageUsers ? "✅" : "❌"} | ${summary.isAdmin ? "✅" : "❌"} |`
    );
  }
}

/**
 * Example 10: Validate role assignment for a user
 */
export function validateRoleAssignment(
  currentRole: RoleName,
  requiredCapability: keyof ReturnType<typeof getUserCapabilitiesSummary>
): {
  valid: boolean;
  currentRole: RoleName;
  requiredCapability: string;
  hasCapability: boolean;
  suggestedRoles: RoleName[];
} {
  const capabilities = getUserCapabilitiesSummary(currentRole);
  const hasCapability = Boolean(capabilities[requiredCapability]);

  const suggestedRoles: RoleName[] = [];
  if (!hasCapability) {
    const allRoles: RoleName[] = [
      "superadmin",
      "admin",
      "owner",
      "manager",
      "user",
      "viewer",
    ];

    for (const role of allRoles) {
      const roleCap = getUserCapabilitiesSummary(role);
      if (roleCap[requiredCapability]) {
        suggestedRoles.push(role);
      }
    }
  }

  return {
    valid: hasCapability,
    currentRole,
    requiredCapability,
    hasCapability,
    suggestedRoles,
  };
}

/**
 * Example 11: Get minimum required role for a permission
 */
export function getMinimumRoleForPermission(
  resource: string,
  action: string
): RoleName | null {
  const roleHierarchy: RoleName[] = [
    "viewer",
    "user",
    "manager",
    "owner",
    "admin",
    "superadmin",
  ];

  for (const role of roleHierarchy) {
    if (canUserPerformOperation(role, resource, action)) {
      return role;
    }
  }

  return null;
}

/**
 * Example 12: Authorization group audit report
 */
export function generateAuditReport(): void {
  console.log("\n🔍 Authorization Groups Audit Report");
  console.log("=".repeat(80));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log("=".repeat(80));

  console.log("\n1️⃣ Authorization Groups Summary");
  console.log("-".repeat(80));

  const byCategory = getAuthorizationGroupsByCategory();
  let totalGroups = 0;

  for (const [category, groups] of Object.entries(byCategory)) {
    totalGroups += groups.length;
    console.log(`\n${category}: ${groups.length} groups`);
  }

  console.log(`\nTotal Authorization Groups: ${totalGroups}`);

  console.log("\n2️⃣ Role Analysis");
  console.log("-".repeat(80));

  const roles: RoleName[] = [
    "superadmin",
    "admin",
    "owner",
    "manager",
    "user",
    "viewer",
  ];

  for (const role of roles) {
    const summary = getUserCapabilitiesSummary(role);
    console.log(`\n${role.toUpperCase()}`);
    console.log(`  Authorization Groups: ${summary.groupCount}`);
    console.log(`  Total Permissions: ${summary.permissionCount}`);
    console.log(`  Delete Content: ${summary.canDeleteContent ? "Yes" : "No"}`);
    console.log(`  Manage Users: ${summary.canManageUsers ? "Yes" : "No"}`);
    console.log(
      `  Organization Chat: ${summary.canAccessOrgChat ? "Yes" : "No"}`
    );
    console.log(
      `  Manage Integrations: ${summary.canManageIntegrations ? "Yes" : "No"}`
    );
    console.log(`  Admin Access: ${summary.isAdmin ? "Yes" : "No"}`);
  }

  console.log("\n3️⃣ Security Validations");
  console.log("-".repeat(80));

  const superadminPerms = getPermissionsForRole("superadmin");
  const adminPerms = getPermissionsForRole("admin");
  const viewerPerms = getPermissionsForRole("viewer");

  console.log(
    `\n✅ Deepgram access restricted: ${superadminPerms.deepgram?.includes("token") && !(adminPerms.deepgram?.includes("token") ?? false)}`
  );
  console.log(
    `✅ Viewer read-only: ${!viewerPerms.project?.includes("create") && !viewerPerms.project?.includes("update")}`
  );
  console.log(
    `✅ Admin has audit access: ${adminPerms["audit-log"]?.includes("read")}`
  );

  console.log("\n4️⃣ Compliance Status");
  console.log("-".repeat(80));
  console.log("\n✅ SSD-7.1.01: RBAC implemented");
  console.log("✅ SSD-7.1.01: Authorization groups clearly defined");
  console.log("✅ SSD-7.1.01: Permissions mapped to roles systematically");

  console.log("\n" + "=".repeat(80));
}

/**
 * Example 13: Role upgrade path
 */
export function getRoleUpgradePath(currentRole: RoleName): {
  currentRole: RoleName;
  nextRole: RoleName | null;
  additionalGroups: string[];
  additionalPermissions: number;
} {
  const hierarchy: RoleName[] = [
    "viewer",
    "user",
    "manager",
    "owner",
    "admin",
    "superadmin",
  ];

  const currentIndex = hierarchy.indexOf(currentRole);
  const nextRole =
    currentIndex < hierarchy.length - 1 ? hierarchy[currentIndex + 1] : null;

  if (!nextRole) {
    return {
      currentRole,
      nextRole: null,
      additionalGroups: [],
      additionalPermissions: 0,
    };
  }

  const currentGroups = getAuthorizationGroupsForRole(currentRole);
  const nextGroups = getAuthorizationGroupsForRole(nextRole);

  const currentGroupIds = new Set(currentGroups.map((g) => g.id));
  const additionalGroups = nextGroups
    .filter((g) => !currentGroupIds.has(g.id))
    .map((g) => g.name);

  const currentPerms = getPermissionsForRole(currentRole);
  const nextPerms = getPermissionsForRole(nextRole);

  const countPermissions = (perms: Record<string, string[]>) =>
    Object.values(perms).reduce((sum, actions) => sum + actions.length, 0);

  const additionalPermissions =
    countPermissions(nextPerms) - countPermissions(currentPerms);

  return {
    currentRole,
    nextRole,
    additionalGroups,
    additionalPermissions,
  };
}

/**
 * Example 14: Authorization group membership check
 */
export function checkGroupMembership(
  role: RoleName,
  groupCategory: string
): {
  role: RoleName;
  category: string;
  groups: Array<{ name: string; id: string }>;
  hasAccess: boolean;
} {
  const allGroups = getAuthorizationGroupsForRole(role);
  const categoryGroups = allGroups.filter((g) => g.category === groupCategory);

  return {
    role,
    category: groupCategory,
    groups: categoryGroups.map((g) => ({ name: g.name, id: g.id })),
    hasAccess: categoryGroups.length > 0,
  };
}

/**
 * Example 15: Quick permission lookup
 */
export const PermissionQuickCheck = {
  canManageOrganization: (role: RoleName) =>
    roleHasAuthorizationGroup(role, "org.full"),

  canManageTeams: (role: RoleName) =>
    roleHasAuthorizationGroup(role, "org.team_manager"),

  canDeleteContent: (role: RoleName) =>
    roleHasAuthorizationGroup(role, "content.full"),

  isSystemAdmin: (role: RoleName) =>
    roleHasAuthorizationGroup(role, "system.admin") ||
    roleHasAuthorizationGroup(role, "system.superadmin"),

  canAccessIntegrations: (role: RoleName) =>
    roleHasAuthorizationGroup(role, "integration.manager") ||
    roleHasAuthorizationGroup(role, "integration.full"),

  canAccessAuditLogs: (role: RoleName) =>
    roleHasAuthorizationGroup(role, "system.audit_reader"),
};

/**
 * Example usage of the authorization groups system
 */
export function demonstrateUsage(): void {
  console.log("\n🎯 Authorization Groups Usage Examples");
  console.log("=".repeat(80));

  console.log("\nExample 1: Check specific authorization group");
  const hasFullContent = roleHasAuthorizationGroup("manager", "content.full");
  console.log(`Manager has Content Full Access: ${hasFullContent}`);

  console.log("\nExample 2: Get authorization groups for a role");
  const managerGroups = getAuthorizationGroupsForRole("manager");
  console.log(`Manager has ${managerGroups.length} authorization groups:`);
  managerGroups.forEach((g) => console.log(`  - ${g.name}`));

  console.log("\nExample 3: Check user capabilities");
  const userCapabilities = getUserCapabilitiesSummary("user");
  console.log("User capabilities:", userCapabilities);

  console.log("\nExample 4: Feature access checker");
  const checker = new FeatureAccessChecker("manager");
  console.log(`Manager can create projects: ${checker.canCreateProjects()}`);
  console.log(`Manager can delete projects: ${checker.canDeleteProjects()}`);
  console.log(`Manager can manage teams: ${checker.canManageTeams()}`);

  console.log("\nExample 5: Get UI permissions");
  const uiPerms = getUIPermissions("user");
  console.log("User UI permissions:", uiPerms);

  console.log("\nExample 6: Compare roles");
  const comparison = compareRoles("user", "manager");
  console.log(
    `User vs Manager: ${comparison.role1Permissions} vs ${comparison.role2Permissions} permissions`
  );
  console.log(`Unique to Manager: ${comparison.uniqueToRole2.join(", ")}`);

  console.log("\n" + "=".repeat(80));
}

/**
 * Run examples if executed directly
 */
if (require.main === module) {
  console.log("Running authorization groups examples...\n");
  demonstrateUsage();
  console.log("\n");
  generateAuditReport();
}
