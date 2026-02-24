# Authorization Groups Structure

## SSD-7.1.01 Compliance Document

**Norm:** SSD-7.1.01  
**Category:** Autorisaties  
**Requirement:** De rechten voor toegang tot gegevens en functies in de applicatie zijn op een beheersbare wijze geordend, gebruik makend van autorisatiegroepen.

**Status:** ✅ Implemented

---

## Authorization Groups Matrix

This document provides a comprehensive overview of how access rights are organized using authorization groups.

### Role-to-Authorization-Group Matrix

| Authorization Group | superadmin | admin | owner | manager | user | viewer |
|---------------------|------------|-------|-------|---------|------|--------|
| **System Administration** |
| Super Administrator | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Administrator | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Audit Log Reader | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Organization Administration** |
| Organization Full Access | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Organization Settings Manager | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Team Manager | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Team Viewer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Org Instruction Writer | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Org Instruction Reader | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Content Management** |
| Content Full Access | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Project Full | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Project Editor | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Project Viewer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Recording Full | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Recording Editor | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Recording Viewer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Task Full | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Task Editor | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Task Viewer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **User Management** |
| User Full | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| User Admin | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| User Viewer | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Invitation Manager | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Integration Management** |
| Integration Full | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Integration Manager | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Deepgram Access | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Communication** |
| Chat Full | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Chat Project | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Chat Organization | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Permission Details by Authorization Group

### Content Management

#### Project Full Access
**Group ID:** `content.project.full`  
**Permissions:**
- `project:create` - Create new projects
- `project:read` - View project details
- `project:update` - Modify project settings
- `project:delete` - Delete projects

**Assigned to:** superadmin, admin, owner, manager

---

#### Project Editor
**Group ID:** `content.project.editor`  
**Permissions:**
- `project:create` - Create new projects
- `project:read` - View project details
- `project:update` - Modify project settings

**Assigned to:** user

---

#### Project Viewer
**Group ID:** `content.project.viewer`  
**Permissions:**
- `project:read` - View project details

**Assigned to:** viewer

---

#### Recording Full Access
**Group ID:** `content.recording.full`  
**Permissions:**
- `recording:create` - Upload new recordings
- `recording:read` - View recordings
- `recording:update` - Modify recording metadata
- `recording:delete` - Delete recordings

**Assigned to:** superadmin, admin, owner, manager

---

#### Recording Editor
**Group ID:** `content.recording.editor`  
**Permissions:**
- `recording:create` - Upload new recordings
- `recording:read` - View recordings
- `recording:update` - Modify recording metadata

**Assigned to:** user

---

#### Recording Viewer
**Group ID:** `content.recording.viewer`  
**Permissions:**
- `recording:read` - View recordings

**Assigned to:** viewer

---

#### Task Full Access
**Group ID:** `content.task.full`  
**Permissions:**
- `task:create` - Create new tasks
- `task:read` - View tasks
- `task:update` - Modify tasks
- `task:delete` - Delete tasks

**Assigned to:** superadmin, admin, owner, manager

---

#### Task Editor
**Group ID:** `content.task.editor`  
**Permissions:**
- `task:create` - Create new tasks
- `task:read` - View tasks
- `task:update` - Modify tasks

**Assigned to:** user

---

#### Task Viewer
**Group ID:** `content.task.viewer`  
**Permissions:**
- `task:read` - View tasks

**Assigned to:** viewer

---

### User Management

#### User Full Access
**Group ID:** `user.full`  
**Permissions:**
- `user:create` - Create new user accounts
- `user:read` - View user information
- `user:update` - Modify user accounts
- `user:delete` - Delete user accounts

**Assigned to:** superadmin, admin, owner

---

#### User Administrator
**Group ID:** `user.admin`  
**Permissions:**
- `user:read` - View user information
- `user:update` - Modify user accounts
- `user:delete` - Delete user accounts

**Assigned to:** Currently not directly assigned (can be added for specific use cases)

---

#### User Viewer
**Group ID:** `user.viewer`  
**Permissions:**
- `user:read` - View user information

**Assigned to:** manager, user, viewer

---

#### Invitation Manager
**Group ID:** `user.invitation`  
**Permissions:**
- `invitation:create` - Send invitations
- `invitation:cancel` - Cancel pending invitations

**Assigned to:** superadmin, admin, owner, manager

---

### Organization Administration

#### Organization Full Access
**Group ID:** `org.full`  
**Permissions:**
- `organization:create` - Create organizations
- `organization:list` - List organizations
- `organization:read` - View organization details
- `organization:update` - Modify organization settings
- `organization:delete` - Delete organizations
- `team:create` - Create teams
- `team:read` - View teams
- `team:update` - Modify teams
- `team:delete` - Delete teams
- `setting:read` - View settings
- `setting:update` - Modify settings

**Assigned to:** superadmin, admin, owner

---

#### Organization Settings Manager
**Group ID:** `org.settings`  
**Permissions:**
- `organization:read` - View organization details
- `organization:update` - Modify organization settings
- `setting:read` - View settings
- `setting:update` - Modify settings

**Assigned to:** manager

---

#### Team Manager
**Group ID:** `org.team_manager`  
**Permissions:**
- `team:create` - Create teams
- `team:read` - View teams
- `team:update` - Modify teams
- `team:delete` - Delete teams

**Assigned to:** superadmin, admin, owner

---

#### Team Viewer
**Group ID:** `org.team_viewer`  
**Permissions:**
- `team:read` - View teams

**Assigned to:** manager, user, viewer

---

#### Organization Instruction Writer
**Group ID:** `org.instruction_writer`  
**Permissions:**
- `orgInstruction:read` - View organization instructions
- `orgInstruction:write` - Create/modify organization instructions

**Assigned to:** superadmin, admin, owner

---

#### Organization Instruction Reader
**Group ID:** `org.instruction_reader`  
**Permissions:**
- `orgInstruction:read` - View organization instructions

**Assigned to:** manager, user, viewer

---

### System Administration

#### Super Administrator
**Group ID:** `system.superadmin`  
**Permissions:**
- `superadmin:all` - All superadmin operations
- `admin:all` - All admin operations

**Scope:** Cross-organization (can access all organizations)  
**Assigned to:** superadmin

---

#### Administrator
**Group ID:** `system.admin`  
**Permissions:**
- `admin:all` - All admin operations

**Scope:** Organization-scoped  
**Assigned to:** admin, owner

---

#### Audit Log Reader
**Group ID:** `system.audit_reader`  
**Permissions:**
- `audit-log:read` - View audit logs

**Assigned to:** superadmin, admin, owner

---

### Integration Management

#### Integration Full Access
**Group ID:** `integration.full`  
**Permissions:**
- `integration:manage` - Configure integrations
- `deepgram:token` - Access Deepgram tokens

**Assigned to:** superadmin (only role with Deepgram access)

---

#### Integration Manager
**Group ID:** `integration.manager`  
**Permissions:**
- `integration:manage` - Configure integrations

**Assigned to:** admin, owner, manager

---

#### Deepgram Access
**Group ID:** `integration.deepgram`  
**Permissions:**
- `deepgram:token` - Access Deepgram tokens

**Assigned to:** superadmin (restricted due to cost implications)

---

### Communication

#### Chat Full Access
**Group ID:** `communication.chat_full`  
**Permissions:**
- `chat:project` - Access project-level chat
- `chat:organization` - Access organization-wide chat

**Assigned to:** superadmin, admin, owner

---

#### Project Chat Access
**Group ID:** `communication.chat_project`  
**Permissions:**
- `chat:project` - Access project-level chat

**Assigned to:** manager, user, viewer

---

#### Organization Chat Access
**Group ID:** `communication.chat_org`  
**Permissions:**
- `chat:organization` - Access organization-wide chat

**Assigned to:** Available for assignment (currently part of Chat Full)

---

### Onboarding

#### Onboarding Full Access
**Group ID:** `onboarding.full`  
**Permissions:**
- `onboarding:create` - Start onboarding process
- `onboarding:read` - View onboarding status
- `onboarding:update` - Update onboarding progress
- `onboarding:complete` - Mark onboarding complete

**Assigned to:** superadmin, admin, owner, manager, user

---

## Permission Granularity Levels

### Full Access Level
Complete CRUD operations (Create, Read, Update, Delete) on a resource.

**Groups:**
- Project Full Access
- Recording Full Access
- Task Full Access
- User Full Access
- Organization Full Access

---

### Editor Level
Can create, read, and update but cannot delete.

**Groups:**
- Project Editor
- Recording Editor
- Task Editor

**Purpose:** Allows content contribution without destructive operations

---

### Viewer Level
Read-only access to resources.

**Groups:**
- Project Viewer
- Recording Viewer
- Task Viewer
- User Viewer
- Team Viewer

**Purpose:** Observation and review without modification rights

---

### Manager Level
Administrative operations for coordination.

**Groups:**
- Team Manager
- Invitation Manager
- Integration Manager
- Organization Settings Manager

**Purpose:** Coordination and configuration without full admin rights

---

## Authorization Group Benefits

### 1. Manageability
- Clear categorization by functional area
- Easy to understand what each group controls
- Simplified role assignment process

### 2. Maintainability
- Changes to permissions happen at group level
- Consistent permission sets across roles
- Easy to audit and review

### 3. Scalability
- New permissions can be added to existing groups
- New groups can be created for new features
- Roles can be adjusted by modifying group assignments

### 4. Security
- Principle of least privilege enforced
- Clear separation of concerns
- Audit trail for permission changes

### 5. Compliance
- Meets SSD-7.1.01 requirements
- Systematic permission organization
- Traceable access control decisions

---

## Usage in Code

### Checking Authorization Groups

```typescript
import {
  getAuthorizationGroupsForRole,
  roleHasAuthorizationGroup,
} from "@/lib/rbac/authorization-groups";

const managerGroups = getAuthorizationGroupsForRole("manager");
console.log("Manager has access to:");
managerGroups.forEach((group) => {
  console.log(`- ${group.name}: ${group.description}`);
});

const hasIntegrationAccess = roleHasAuthorizationGroup(
  "manager",
  "integration.manager"
);
console.log(`Can manage integrations: ${hasIntegrationAccess}`);
```

### Server Action Authorization

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
    // Automatically verified:
    // 1. User is authenticated
    // 2. User has project:update permission (from their authorization groups)
    // 3. User belongs to an organization
    // Implementation here
  });
```

### Client-side Permission Check

```typescript
import { checkPermissionClient } from "@/lib/rbac/permissions-client";
import { Permissions } from "@/lib/rbac/permissions";

const canCreateProject = await checkPermissionClient(
  Permissions.project.create
);

if (canCreateProject) {
  // Show create project UI
}
```

---

## Authorization Group Design Principles

### 1. Functional Grouping
Groups are organized by functional area (Content, User, Organization, etc.) rather than by technical implementation.

### 2. Hierarchical Structure
Groups follow a hierarchy:
- Full Access > Editor > Viewer
- Manager > Standard operations

### 3. Composability
Multiple groups can be combined for a role to create the exact permission set needed.

### 4. Explicit Over Implicit
Every permission is explicitly assigned through a group. No implicit permissions.

### 5. Principle of Least Privilege
Roles start with minimal access and groups are added only as needed.

---

## Systematic Permission Mapping

### Mapping Process

1. **Identify Functional Area**: Determine which category (Content, User, Organization, etc.)
2. **Select Authorization Group**: Choose appropriate group based on access level needed
3. **Assign to Role**: Add group to role's authorization group list
4. **Verify Permissions**: Check that resulting permissions match requirements
5. **Document**: Update role documentation with reasoning

### Example: Adding a New Resource

Suppose we add a new resource called "Report":

1. **Define Actions in access-control.ts**
   ```typescript
   report: ["create", "read", "update", "delete", "export"]
   ```

2. **Create Authorization Groups**
   ```typescript
   REPORT_FULL: {
     id: "content.report.full",
     name: "Report Full Access",
     description: "Complete report management including export",
     category: AuthorizationGroupCategories.CONTENT,
     permissions: {
       report: ["create", "read", "update", "delete", "export"],
     },
   },
   REPORT_EDITOR: {
     id: "content.report.editor",
     name: "Report Editor",
     description: "Create and modify reports",
     category: AuthorizationGroupCategories.CONTENT,
     permissions: {
       report: ["create", "read", "update"],
     },
   },
   REPORT_VIEWER: {
     id: "content.report.viewer",
     name: "Report Viewer",
     description: "Read-only report access",
     category: AuthorizationGroupCategories.CONTENT,
     permissions: {
       report: ["read"],
     },
   },
   ```

3. **Assign to Roles**
   - superadmin, admin, owner, manager → REPORT_FULL
   - user → REPORT_EDITOR
   - viewer → REPORT_VIEWER

4. **Update Documentation**
   - Add to matrix table
   - Document in README
   - Update tests

---

## Security Considerations

### Organization Isolation
All authorization groups (except superadmin) respect organization boundaries:

- Permissions are organization-scoped
- Cross-organization access is prevented
- Isolation enforced at multiple layers

### Audit Trail
All permission checks are logged:

```typescript
logger.security.unauthorizedAccess({
  userId: user.id,
  resource: "project",
  action: "delete",
  reason: "User lacks project:delete permission",
});
```

### Information Disclosure Prevention
Failed authorization returns 404 instead of 403 to prevent:

- Resource existence disclosure
- Permission structure revelation
- Organization enumeration

---

## Compliance Checklist

### SSD-7.1.01 Requirements

- [x] **RBAC implemented**
  - ✅ Six roles defined: superadmin, admin, owner, manager, user, viewer
  - ✅ Better Auth access control integration
  - ✅ Type-safe permission system

- [x] **Authorization groups clearly defined**
  - ✅ 30+ authorization groups organized by category
  - ✅ Each group has clear name, description, and permissions
  - ✅ Groups categorized into 6 functional areas

- [x] **Permissions mapped to roles systematically**
  - ✅ `RoleAuthorizationGroups` provides explicit role-to-group mapping
  - ✅ Matrix documentation shows all assignments
  - ✅ Permissions can be queried programmatically

### Additional Compliance

- [x] **Principle of Least Privilege** (SSD-7.1.02)
  - Roles have minimal necessary permissions
  - Clear hierarchy from viewer to superadmin
  
- [x] **Audit Capability** (SSD-17.1.04)
  - All permission checks logged
  - Security violations tracked
  - Organization isolation logged

- [x] **Separation of Duties** (SSD-7.1.03)
  - Admin operations separated from user operations
  - Content management separated from user management
  - System administration isolated from organization administration

---

## Future Enhancements

### Potential Additions

1. **Custom Authorization Groups**
   - Allow organizations to define custom groups
   - Map custom groups to built-in permissions

2. **Time-Based Access**
   - Temporary authorization group assignments
   - Scheduled permission changes

3. **Attribute-Based Access Control (ABAC)**
   - Extend groups with attribute conditions
   - Context-aware permissions

4. **Permission Delegation**
   - Allow managers to delegate specific groups
   - Temporary elevated access

5. **Fine-Grained Resource Permissions**
   - Project-level permissions (beyond org-level)
   - Resource-specific authorization groups

---

## Maintenance Guidelines

### When to Create a New Authorization Group

Create a new group when:

1. A new functional area is introduced
2. A new access level is needed (e.g., "approver" between editor and full)
3. A combination of permissions is commonly needed together
4. Security requirements demand separation

### When to Modify an Existing Group

Modify a group when:

1. The functional area's capabilities change
2. Security audit recommends changes
3. Compliance requirements change
4. User role definitions evolve

### When to Deprecate a Group

Deprecate a group when:

1. The feature is removed
2. Groups are consolidated
3. Security requirements make it obsolete

Always maintain backward compatibility during deprecation.

---

## References

- **Implementation:** `apps/web/src/lib/rbac/authorization-groups.ts`
- **Configuration:** `apps/web/src/lib/auth/access-control.ts`
- **SSD Norm:** SSD-7.1.01
- **Better Auth Docs:** https://www.better-auth.com/docs/plugins/access
