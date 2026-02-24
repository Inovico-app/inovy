# RBAC System - Authorization Groups

## Overview

This directory contains the Role-Based Access Control (RBAC) system implementation, organized according to **SSD-7.1.01** security requirements. Access rights are structured using **authorization groups** for better manageability and maintainability.

## Architecture

### Core Components

```
rbac/
├── authorization-groups.ts    # Authorization group definitions (SSD-7.1.01)
├── access-control.ts          # Better Auth access control configuration
├── permissions.ts             # Permission presets and types
├── permissions-server.ts      # Server-side permission checks
├── permissions-client.ts      # Client-side permission checks
├── rbac.ts                    # Core RBAC utilities
├── organization-isolation.ts  # Organization-level data isolation
└── permission-helpers.ts      # Legacy policy conversion helpers
```

## Authorization Groups (SSD-7.1.01)

### What are Authorization Groups?

Authorization groups are **logical collections of permissions** that represent functional areas within the application. They provide:

- **Manageability**: Permissions are organized into clear, understandable groups
- **Maintainability**: Changes to permissions are made at the group level
- **Traceability**: Easy to audit which roles have which capabilities
- **Scalability**: New permissions can be added to existing groups

### Authorization Group Categories

The system organizes authorization groups into six main categories:

#### 1. Content Management (`CONTENT`)

Manages access to core content resources (projects, recordings, tasks).

**Groups:**
- `PROJECT_FULL` - Complete project lifecycle management
- `PROJECT_EDITOR` - Create and modify projects (no delete)
- `PROJECT_VIEWER` - Read-only project access
- `RECORDING_FULL` - Complete recording management
- `RECORDING_EDITOR` - Create and modify recordings (no delete)
- `RECORDING_VIEWER` - Read-only recording access
- `TASK_FULL` - Complete task management
- `TASK_EDITOR` - Create and modify tasks (no delete)
- `TASK_VIEWER` - Read-only task access
- `CONTENT_FULL_ACCESS` - All content permissions combined

#### 2. User Management (`USER`)

Controls user account and invitation management.

**Groups:**
- `USER_FULL` - Complete user account management
- `USER_ADMIN` - Modify and delete user accounts
- `USER_VIEWER` - Read-only user information
- `INVITATION_MANAGER` - Create and manage invitations

#### 3. Organization Administration (`ORGANIZATION`)

Manages organization-wide settings and team structure.

**Groups:**
- `ORG_FULL` - Complete organizational control
- `ORG_SETTINGS_MANAGER` - Manage organization settings
- `TEAM_MANAGER` - Full team management
- `TEAM_VIEWER` - Read-only team information
- `ORG_INSTRUCTION_WRITER` - Create/modify org instructions
- `ORG_INSTRUCTION_READER` - Read-only org instructions

#### 4. System Administration (`SYSTEM`)

System-level administrative capabilities.

**Groups:**
- `SUPERADMIN_FULL` - Ultimate system access (cross-organization)
- `ADMIN_FULL` - Full administrative access (org-scoped)
- `AUDIT_LOG_READER` - View audit logs for compliance

#### 5. Integration Management (`INTEGRATION`)

Third-party integration and service management.

**Groups:**
- `INTEGRATION_FULL` - All integration management + service tokens
- `INTEGRATION_MANAGER` - Configure integrations
- `DEEPGRAM_ACCESS` - Access to Deepgram speech-to-text services

#### 6. Communication (`COMMUNICATION`)

Chat and communication features.

**Groups:**
- `CHAT_PROJECT` - Project-level chat access
- `CHAT_ORGANIZATION` - Organization-wide chat access
- `CHAT_FULL` - All chat features

## Role Definitions

### Role Hierarchy

```
superadmin (System-wide)
    ↓
owner/admin (Organization-wide)
    ↓
manager (Limited admin)
    ↓
user (Standard access)
    ↓
viewer (Read-only)
```

### Role-to-Authorization-Group Mapping

#### Superadmin

**Scope:** Cross-organization system access

**Authorization Groups:**
- All System Administration groups
- All Organization Administration groups
- All Content Management groups
- All User Management groups
- All Integration Management groups
- All Communication groups

**Use Cases:**
- Platform administration
- Cross-organization operations
- System configuration
- Deepgram token management

#### Admin / Owner

**Scope:** Full access within their organization

**Authorization Groups:**
- Admin Full (org-scoped)
- Audit Log Reader
- Organization Full Access
- Content Full Access
- User Full Access
- Integration Manager
- Chat Full Access

**Use Cases:**
- Organization management
- User administration
- Content oversight
- Integration configuration

#### Manager

**Scope:** Content and team management

**Authorization Groups:**
- Organization Settings Manager
- Team Viewer
- Content Full Access
- User Viewer
- Invitation Manager
- Integration Manager
- Project Chat

**Use Cases:**
- Project management
- Team coordination
- Content creation
- Member invitations

#### User

**Scope:** Content contribution

**Authorization Groups:**
- Project Editor
- Recording Editor
- Task Editor
- User Viewer
- Team Viewer
- Organization Instruction Reader
- Project Chat

**Use Cases:**
- Create and edit content
- Participate in projects
- Collaborate with team

#### Viewer

**Scope:** Read-only access

**Authorization Groups:**
- Project Viewer
- Recording Viewer
- Task Viewer
- User Viewer
- Team Viewer
- Organization Instruction Reader
- Project Chat

**Use Cases:**
- Review content
- Observe projects
- Read-only collaboration

## Usage Examples

### Check Authorization Groups for a Role

```typescript
import {
  getAuthorizationGroupsForRole,
  getPermissionsForRole,
} from "@/lib/rbac/authorization-groups";

const managerGroups = getAuthorizationGroupsForRole("manager");

managerGroups.forEach((group) => {
  console.log(`${group.name}: ${group.description}`);
});

const managerPermissions = getPermissionsForRole("manager");
```

### Check if Role Has Specific Authorization Group

```typescript
import { roleHasAuthorizationGroup } from "@/lib/rbac/authorization-groups";

const canManageIntegrations = roleHasAuthorizationGroup(
  "manager",
  "integration.manager"
);
```

### View Authorization Groups by Category

```typescript
import { getAuthorizationGroupsByCategory } from "@/lib/rbac/authorization-groups";

const groupsByCategory = getAuthorizationGroupsByCategory();

for (const [category, groups] of Object.entries(groupsByCategory)) {
  console.log(`\n${category}:`);
  groups.forEach((group) => {
    console.log(`  - ${group.name}`);
  });
}
```

### Using Permissions in Server Actions

```typescript
import { authorizedActionClient } from "@/lib/server-action-client/action-client";
import { Permissions } from "@/lib/rbac/permissions";

export const updateProjectAction = authorizedActionClient
  .metadata({
    name: "updateProject",
    permissions: Permissions.project.update,
  })
  .schema(updateProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Action implementation
  });
```

## Permission Resolution

### How Permissions are Resolved

1. **User Authentication**: User authenticates and establishes a session
2. **Role Assignment**: User has a role within their organization (from `users.role` or `members.role`)
3. **Authorization Groups**: Role is mapped to authorization groups via `RoleAuthorizationGroups`
4. **Permission Aggregation**: All permissions from assigned groups are combined
5. **Permission Check**: Action-specific permissions are verified against user's aggregated permissions

### Resolution Flow

```
User Request → Authentication → Role Lookup → Authorization Groups → Permissions → Access Decision
```

## Security Features

### Organization Isolation

All roles (except superadmin) are organization-scoped:

- Users can only access resources within their organization
- Cross-organization access attempts return 404 (not 403) to prevent information leakage
- Organization isolation is enforced at multiple layers (middleware, service, data access)

### Audit Logging

All authorization decisions are logged:

- Successful access logged for audit trail
- Failed access attempts logged with security severity
- Organization isolation violations logged for security monitoring

### Least Privilege Principle

Role assignments follow the principle of least privilege:

- Each role has only the permissions necessary for their function
- Granular authorization groups enable precise access control
- Viewers have minimal read-only access
- Administrative access is clearly separated from user access

## Compliance

### SSD-7.1.01 Compliance

✅ **Access rights organized in manageable authorization groups**
- Authorization groups defined in `authorization-groups.ts`
- Clear categorization (Content, User, Organization, System, Integration, Communication)
- Systematic mapping from roles to groups

✅ **RBAC implemented**
- Roles: superadmin, admin, owner, manager, user, viewer
- Better Auth access control plugin integration
- Type-safe permission system

✅ **Permissions mapped to roles systematically**
- `RoleAuthorizationGroups` provides clear role-to-group mapping
- Each role has documented authorization groups
- Permissions can be queried and audited

### Related SSD Requirements

This RBAC system also supports:

- **SSD-7.1.02**: Role-based access control implementation
- **SSD-7.1.03**: Permission granularity for resources
- **SSD-7.2.01**: Organization-level data isolation
- **SSD-17**: Separate admin interface with elevated permissions

## Maintenance

### Adding a New Permission

1. Add action to resource in `access-control.ts`
2. Create or update authorization group in `authorization-groups.ts`
3. Update role assignments if needed
4. Update documentation

### Adding a New Role

1. Add role to `organizationMemberRoles` in `schema/auth.ts`
2. Define role permissions in `access-control.ts`
3. Assign authorization groups in `authorization-groups.ts`
4. Update `RoleAuthorizationGroups` mapping
5. Update documentation

### Adding a New Authorization Group

1. Define group in appropriate category in `authorization-groups.ts`
2. Document the group's purpose and permissions
3. Assign to appropriate roles in `RoleAuthorizationGroups`
4. Update tests

## Testing

### Test Authorization Groups

```typescript
import {
  getAuthorizationGroupsForRole,
  roleHasAuthorizationGroup,
} from "@/lib/rbac/authorization-groups";

describe("Authorization Groups", () => {
  it("should assign correct groups to manager role", () => {
    const groups = getAuthorizationGroupsForRole("manager");
    expect(groups).toContainEqual(
      expect.objectContaining({
        id: "content.full",
        name: "Content Full Access",
      })
    );
  });

  it("should not give viewer role delete permissions", () => {
    const hasDeleteAccess = roleHasAuthorizationGroup(
      "viewer",
      "content.full"
    );
    expect(hasDeleteAccess).toBe(false);
  });
});
```

## Best Practices

1. **Use Authorization Groups for Role Design**
   - Don't assign individual permissions to roles
   - Use authorization groups to maintain consistency
   - Document the reasoning for group assignments

2. **Follow Principle of Least Privilege**
   - Start with minimal permissions
   - Add authorization groups only when needed
   - Regularly review role assignments

3. **Document Changes**
   - Update this README when adding groups
   - Document the business reasoning
   - Update role descriptions

4. **Test Permission Changes**
   - Test both positive and negative cases
   - Verify organization isolation
   - Check audit logging

## References

- **SSD-7.1.01**: Organize access rights using authorization groups
- **Better Auth Access Control**: https://www.better-auth.com/docs/plugins/access
- **Better Auth Organization Plugin**: https://www.better-auth.com/docs/plugins/organization

## Migration from Legacy System

If you're migrating from the old policy-based system:

1. Use `policyToPermissions()` helper for backward compatibility
2. Replace policy strings with `Permissions.*` constants
3. Update to use authorization group approach
4. Remove legacy policy code once migration is complete

Example:

```typescript
// Old approach
.metadata({ permissions: policyToPermissions("projects:create") })

// New approach
.metadata({ permissions: Permissions.project.create })
```
