/**
 * Authorization Groups Validation Script
 * Validates the authorization groups structure for SSD-7.1.01 compliance
 *
 * Run with: npx tsx src/lib/rbac/validate-authorization-groups.ts
 */

import {
  AuthorizationGroups,
  RoleAuthorizationGroups,
  getAuthorizationGroupsForRole,
  getPermissionsForRole,
  getAuthorizationGroupsByCategory,
} from "./authorization-groups";

/**
 * Validation results
 */
interface ValidationResult {
  passed: boolean;
  message: string;
  details?: string;
}

const results: ValidationResult[] = [];

function validate(test: boolean, message: string, details?: string): void {
  results.push({ passed: test, message, details });
  if (test) {
    console.log(`✅ ${message}`);
  } else {
    console.error(`❌ ${message}`);
    if (details) {
      console.error(`   ${details}`);
    }
  }
}

console.log("=".repeat(80));
console.log("Authorization Groups Validation (SSD-7.1.01)");
console.log("=".repeat(80));
console.log();

console.log("📋 Validating Authorization Groups Structure...");
console.log();

validate(
  AuthorizationGroups.CONTENT_MANAGEMENT !== undefined,
  "Content Management groups defined"
);
validate(
  AuthorizationGroups.USER_MANAGEMENT !== undefined,
  "User Management groups defined"
);
validate(
  AuthorizationGroups.ORGANIZATION_ADMIN !== undefined,
  "Organization Administration groups defined"
);
validate(
  AuthorizationGroups.SYSTEM_ADMIN !== undefined,
  "System Administration groups defined"
);
validate(
  AuthorizationGroups.INTEGRATION_ADMIN !== undefined,
  "Integration Management groups defined"
);
validate(
  AuthorizationGroups.COMMUNICATION !== undefined,
  "Communication groups defined"
);

console.log();
console.log("🎭 Validating Role Assignments...");
console.log();

const roles = ["superadmin", "admin", "owner", "manager", "user", "viewer"] as const;

for (const role of roles) {
  const groups = getAuthorizationGroupsForRole(role);
  validate(
    groups.length > 0,
    `Role '${role}' has authorization groups assigned`,
    `${groups.length} groups assigned`
  );
}

console.log();
console.log("🔐 Validating Permission Hierarchy...");
console.log();

const superadminPerms = getPermissionsForRole("superadmin");
const adminPerms = getPermissionsForRole("admin");
const managerPerms = getPermissionsForRole("manager");
const userPerms = getPermissionsForRole("user");
const viewerPerms = getPermissionsForRole("viewer");

function countPermissions(perms: Record<string, string[]>): number {
  return Object.values(perms).reduce((sum, actions) => sum + actions.length, 0);
}

const superadminCount = countPermissions(superadminPerms);
const adminCount = countPermissions(adminPerms);
const managerCount = countPermissions(managerPerms);
const userCount = countPermissions(userPerms);
const viewerCount = countPermissions(viewerPerms);

validate(
  superadminCount > adminCount,
  "Superadmin has more permissions than admin",
  `${superadminCount} vs ${adminCount}`
);
validate(
  adminCount >= managerCount,
  "Admin has at least as many permissions as manager",
  `${adminCount} vs ${managerCount}`
);
validate(
  managerCount > userCount,
  "Manager has more permissions than user",
  `${managerCount} vs ${userCount}`
);
validate(
  userCount > viewerCount,
  "User has more permissions than viewer",
  `${userCount} vs ${viewerCount}`
);

console.log();
console.log("🛡️ Validating Security Constraints...");
console.log();

validate(
  superadminPerms.deepgram?.includes("token"),
  "Deepgram access restricted to superadmin"
);

validate(
  !(adminPerms.deepgram?.includes("token") ?? false),
  "Admin does not have Deepgram access"
);

validate(
  !(managerPerms.deepgram?.includes("token") ?? false),
  "Manager does not have Deepgram access"
);

validate(
  viewerPerms.project?.every((action) => action === "read") ?? false,
  "Viewer has only read access to projects"
);

const viewerGroups = getAuthorizationGroupsForRole("viewer");
const viewerHasWriteAccess = viewerGroups.some((group) => {
  const allActions = Object.values(group.permissions).flat();
  return allActions.some((action) =>
    ["create", "update", "delete", "write", "manage", "cancel"].includes(action)
  );
});

validate(!viewerHasWriteAccess, "Viewer has no write permissions");

console.log();
console.log("📊 Authorization Groups Summary");
console.log("=".repeat(80));
console.log();

const byCategory = getAuthorizationGroupsByCategory();

for (const [category, groups] of Object.entries(byCategory)) {
  console.log(`${category}:`);
  console.log(`  ${groups.length} authorization groups`);

  for (const group of groups) {
    const permCount = Object.values(group.permissions).reduce(
      (sum, actions) => sum + actions.length,
      0
    );
    console.log(`  - ${group.name} (${permCount} permissions)`);
  }
  console.log();
}

console.log("📈 Role Permission Counts");
console.log("=".repeat(80));
console.log();

for (const role of roles) {
  const groups = getAuthorizationGroupsForRole(role);
  const permissions = getPermissionsForRole(role);
  const permCount = countPermissions(permissions);

  console.log(`${role}:`);
  console.log(`  Authorization Groups: ${groups.length}`);
  console.log(`  Total Permissions: ${permCount}`);
  console.log();
}

console.log("=".repeat(80));
console.log();

const passed = results.filter((r) => r.passed).length;
const failed = results.filter((r) => !r.passed).length;
const total = results.length;

console.log(`Validation Results: ${passed}/${total} passed, ${failed} failed`);
console.log();

if (failed === 0) {
  console.log("✅ All validation checks passed!");
  console.log("✅ SSD-7.1.01 compliance validated");
  process.exit(0);
} else {
  console.error("❌ Some validation checks failed!");
  console.error("❌ Please review the errors above");
  process.exit(1);
}
