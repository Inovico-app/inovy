# Authorization Definition and Maintenance Process

**Document Version:** 1.0  
**Date:** 2026-02-24  
**Status:** Active  
**SSD Reference:** SSD-7.1.03 - Autorisaties

## Purpose

This document describes the process for defining, assigning, and maintaining authorizations within the Inovy application to ensure systematic and secure access control in compliance with NEN 7510, NEN 7513, and SSD-7 requirements.

## Scope

This process applies to all user roles, permissions, and authorization configurations within the Inovy platform, including:

- Role definitions and hierarchies
- Permission assignments and policies
- Organization-level access control
- Resource-level authorization
- Authorization maintenance and auditing

## Regulatory Requirements

This process satisfies the following compliance requirements:

- **AVG (GDPR)**: Access control and minimal data access principles
- **NEN 7510**: Information security in healthcare (access control)
- **NEN 7513**: Logging and authorization in healthcare
- **SSD-7.1.03**: Process for defining, assigning, and maintaining authorizations

## 1. Authorization Architecture Overview

### 1.1 Authorization Model

Inovy implements a **Role-Based Access Control (RBAC)** system with:

- **Multi-tenant organization structure**: Data isolation per organization
- **Hierarchical roles**: Defined role hierarchy with inheritance
- **Resource-based permissions**: Granular permissions per resource type
- **Action-based access**: Specific actions per resource (create, read, update, delete)
- **Policy-based enforcement**: Centralized authorization policies

### 1.2 Technical Implementation

**Authentication Provider:** Better Auth  
**Authorization Library:** Better Auth Access Control Plugin  
**Database:** PostgreSQL with Drizzle ORM  
**Session Management:** Secure cookies with organization context  
**Audit Logging:** Comprehensive security event logging

**Key Components:**

- `/workspace/apps/web/src/lib/auth/access-control.ts` - RBAC policy definitions
- `/workspace/apps/web/src/server/db/schema/auth.ts` - Role schema and enums
- `/workspace/apps/web/src/lib/rbac/` - Authorization utilities and helpers
- `/workspace/apps/web/src/lib/server-action-client/action-client.ts` - Authorization middleware

## 2. Role Definition Process

### 2.1 Standard Roles

The following roles are defined in the system:

| Role | Level | Description | Use Case |
|------|-------|-------------|----------|
| `superadmin` | System | Full system access across all organizations | Platform administration and support |
| `owner` | Organization | Full organization ownership and management | Organization creator and primary administrator |
| `admin` | Organization | Administrative access within organization | Organization administrators and deputies |
| `manager` | Organization | Limited administrative access | Project/team managers |
| `user` | Organization | Standard user access | Regular application users |
| `viewer` | Organization | Read-only access | Auditors, guests, read-only stakeholders |

### 2.2 Role Hierarchy

```
superadmin (highest privilege)
    ↓
  owner
    ↓
  admin
    ↓
  manager
    ↓
  user
    ↓
  viewer (lowest privilege)
```

**Inheritance Rules:**
- Higher-level roles inherit all permissions from lower-level roles
- Role elevation requires explicit permission checks
- Cross-organization access is strictly prohibited (except superadmin)

### 2.3 Adding New Roles

**Process for defining new roles:**

1. **Requirement Analysis**
   - Document business justification
   - Define required permissions
   - Identify applicable resources and actions
   - Assess security implications
   - Review compliance requirements

2. **Technical Definition**
   
   **Step 2.1:** Add role to database enum
   
   ```sql
   -- Create migration file
   -- Location: apps/web/src/server/db/migrations/XXXX_add_new_role.sql
   
   ALTER TYPE organization_member_role ADD VALUE 'new_role_name';
   ```
   
   **Step 2.2:** Update TypeScript schema
   
   ```typescript
   // Location: apps/web/src/server/db/schema/auth.ts
   
   export const organizationMemberRole = pgEnum('organization_member_role', [
     'owner',
     'admin',
     'superadmin',
     'manager',
     'user',
     'viewer',
     'new_role_name', // Add new role
   ]);
   ```
   
   **Step 2.3:** Define role permissions
   
   ```typescript
   // Location: apps/web/src/lib/auth/access-control.ts
   
   export const accessControl = {
     new_role_name: {
       project: ["create", "read", "update"],
       recording: ["create", "read"],
       // ... define permissions
     },
     // ... existing roles
   };
   ```

3. **Testing**
   - Unit tests for permission checks
   - Integration tests for role assignment
   - Security testing for privilege escalation
   - User acceptance testing

4. **Documentation**
   - Update this document
   - Update configuration documentation
   - Update API documentation
   - Update user documentation

5. **Approval and Deployment**
   - Security review
   - Compliance review
   - Technical review
   - Production deployment

### 2.4 Role Modification

**Process for modifying existing roles:**

1. **Change Request**
   - Document requested changes
   - Justify business need
   - Assess impact on existing users
   - Identify affected resources

2. **Impact Analysis**
   - Identify affected users
   - Review existing permission assignments
   - Assess security implications
   - Check compliance requirements

3. **Implementation**
   - Update permission definitions
   - Modify authorization policies
   - Update documentation
   - Create migration plan

4. **Communication**
   - Notify affected users
   - Update training materials
   - Announce changes to administrators

5. **Deployment**
   - Stage changes in test environment
   - Execute deployment
   - Monitor for issues
   - Rollback plan if needed

## 3. Permission Structure

### 3.1 Resource Types

The following resource types are defined:

- `project` - Project management
- `recording` - Recording management
- `task` - Task management
- `organization` - Organization settings
- `user` - User management
- `team` - Team management
- `chat` - AI chat functionality
- `audit-log` - Audit log access
- `invitation` - Member invitations
- `integration` - External integrations
- `setting` - Application settings
- `onboarding` - Onboarding process

### 3.2 Action Types

Standard actions per resource:

- `create` - Create new resource
- `read` - View resource
- `update` - Modify resource
- `delete` - Remove resource
- `list` - List resources
- `manage` - Full management (create, read, update, delete)

### 3.3 Permission Matrix

See [AUTHORIZATION_CONFIGURATION.md](./AUTHORIZATION_CONFIGURATION.md) for the complete permission matrix.

### 3.4 Adding New Permissions

**Process for defining new permissions:**

1. **Permission Design**
   - Define resource type
   - Define action types
   - Document permission purpose
   - Map to user roles

2. **Implementation**
   
   ```typescript
   // Location: apps/web/src/lib/auth/access-control.ts
   
   export const accessControl = {
     superadmin: {
       // ... existing permissions
       new_resource: ["*"], // All actions
     },
     admin: {
       // ... existing permissions
       new_resource: ["create", "read", "update", "delete"],
     },
     user: {
       // ... existing permissions
       new_resource: ["read"],
     },
   };
   ```

3. **Enforcement**
   
   ```typescript
   // In server actions
   const result = await authorizedActionClient
     .metadata({
       actionName: "actionName",
       resource: "new_resource",
       action: "create",
     })
     .action(async ({ ctx }) => {
       // Action implementation
     });
   ```

4. **Testing and Documentation**
   - Test permission checks
   - Document in configuration
   - Update user documentation

## 4. Authorization Enforcement

### 4.1 Server-Side Enforcement

**Primary enforcement mechanism:** `authorizedActionClient` middleware

```typescript
// Location: apps/web/src/lib/server-action-client/action-client.ts

export const authorizedActionClient = actionClient
  .use(async ({ next, metadata }) => {
    const { resource, action } = metadata;
    
    // Authenticate user
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      throw new Error("Unauthorized");
    }
    
    // Check permissions
    const hasPermission = await auth.api.hasPermission({
      headers: await headers(),
      body: { resource, action },
    });
    
    if (!hasPermission) {
      throw new Error("Forbidden: Insufficient permissions");
    }
    
    return next({ ctx: { user: session.user, organizationId: session.organization.id } });
  });
```

**Usage in server actions:**

```typescript
export const createProjectAction = authorizedActionClient
  .metadata({
    actionName: "createProject",
    resource: "project",
    action: "create",
  })
  .schema(createProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    // ctx.user and ctx.organizationId are guaranteed
    // Permission is already checked
    const result = await projectService.create(parsedInput, ctx.organizationId);
    return result;
  });
```

### 4.2 Client-Side Enforcement

**Purpose:** UI/UX optimization (not security boundary)

```typescript
// Location: apps/web/src/lib/rbac/permissions-client.ts

export async function checkPermissionClient(
  resource: string,
  action: string
): Promise<boolean> {
  const { data: permission } = await fetch("/api/auth/has-permission", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resource, action }),
  }).then((res) => res.json());
  
  return permission?.hasPermission ?? false;
}
```

**Usage in components:**

```typescript
import { checkPermissionClient } from "@/lib/rbac/permissions-client";

export async function ProjectActions() {
  const canCreate = await checkPermissionClient("project", "create");
  const canDelete = await checkPermissionClient("project", "delete");
  
  return (
    <div>
      {canCreate && <CreateProjectButton />}
      {canDelete && <DeleteProjectButton />}
    </div>
  );
}
```

### 4.3 Organization Isolation

**Enforcement mechanism:** Organization context validation

```typescript
// Location: apps/web/src/lib/rbac/organization-isolation.ts

export async function assertOrganizationAccess(
  resourceOrganizationId: string,
  userOrganizationId: string
): Promise<void> {
  if (resourceOrganizationId !== userOrganizationId) {
    logger.security("Organization isolation violation detected", {
      resourceOrg: resourceOrganizationId,
      userOrg: userOrganizationId,
    });
    
    // Return 404 to prevent information leakage
    throw new Error("Resource not found");
  }
}
```

**Usage:**

```typescript
export const getProjectAction = authorizedActionClient
  .metadata({
    actionName: "getProject",
    resource: "project",
    action: "read",
  })
  .schema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const project = await projectQueries.getById(parsedInput.id);
    
    // Verify organization access
    await assertOrganizationAccess(
      project.organizationId,
      ctx.organizationId
    );
    
    return project;
  });
```

## 5. Authorization Auditing

### 5.1 Audit Logging

**All authorization events are logged:**

```typescript
// Location: apps/web/src/lib/logger.ts

logger.security("Authorization check", {
  userId: user.id,
  organizationId: org.id,
  resource: "project",
  action: "create",
  result: "granted",
  timestamp: new Date().toISOString(),
});
```

**Logged events:**
- Authentication attempts (success/failure)
- Authorization checks (granted/denied)
- Role assignments and changes
- Permission violations
- Organization isolation violations
- Privilege escalation attempts

### 5.2 Audit Log Retention

**Retention policy:**
- Audit logs retained for minimum 12 months
- Critical security events retained for 7 years
- Logs stored in database with organization context
- Access to audit logs restricted to admin roles

### 5.3 Audit Log Access

```typescript
// Only admins can access audit logs
export const getAuditLogsAction = authorizedActionClient
  .metadata({
    actionName: "getAuditLogs",
    resource: "audit-log",
    action: "read",
  })
  .action(async ({ ctx }) => {
    // Only organization admins can access
    return await auditLogQueries.getForOrganization(ctx.organizationId);
  });
```

## 6. Security Best Practices

### 6.1 Principle of Least Privilege

- Assign minimum necessary permissions
- Default to most restrictive role (viewer)
- Require explicit permission grants
- Regular permission audits

### 6.2 Defense in Depth

- Multiple layers of authorization checks
- Server-side enforcement (primary)
- Database-level organization filtering
- Network-level access controls
- Application-level validation

### 6.3 Fail-Safe Defaults

- Default deny for unknown permissions
- Explicit permission grants required
- Authorization failures return 403/404
- No permission inheritance by default

### 6.4 Separation of Duties

- Role assignments require admin privileges
- Superadmin role restricted to platform team
- Owner role limited to organization creators
- Permission changes require approval

## 7. Maintenance Procedures

### 7.1 Regular Reviews

**Quarterly authorization review:**
- Review role definitions
- Audit permission assignments
- Verify least privilege compliance
- Check for orphaned permissions
- Review audit logs for anomalies

**Annual security audit:**
- Comprehensive authorization review
- Compliance verification
- Penetration testing
- Policy updates

### 7.2 User Access Reviews

**Monthly organization review:**
- Organization administrators review members
- Verify role assignments
- Remove inactive users
- Update permissions as needed

**Process:**
1. Generate member report
2. Review with organization owner
3. Document changes
4. Execute updates
5. Notify affected users

### 7.3 Incident Response

**Authorization violation response:**
1. Detect violation (automated logging)
2. Alert security team
3. Investigate incident
4. Contain threat (suspend user if needed)
5. Remediate issue
6. Document incident
7. Update policies if needed

## 8. Compliance and Documentation

### 8.1 Compliance Mapping

| Requirement | Implementation | Evidence |
|-------------|----------------|----------|
| NEN 7510 - Access Control | RBAC with organization isolation | This document + code |
| NEN 7513 - Logging | Comprehensive audit logging | Audit logs + retention policy |
| AVG - Minimal Access | Least privilege + role hierarchy | Permission matrix |
| SSD-7.1.03 | This process document | This document |

### 8.2 Required Documentation

- ✅ Authorization Process (this document)
- ✅ Assignment Procedures (see [AUTHORIZATION_ASSIGNMENT.md](./AUTHORIZATION_ASSIGNMENT.md))
- ✅ Configuration Documentation (see [AUTHORIZATION_CONFIGURATION.md](./AUTHORIZATION_CONFIGURATION.md))
- ✅ Audit Procedures
- ✅ Incident Response Plan

### 8.3 Training Requirements

**Required training for:**
- **Developers:** Authorization implementation and testing
- **Administrators:** Role assignment and user management
- **Security Team:** Audit log review and incident response
- **Compliance Team:** Regular compliance reviews

## 9. References

### 9.1 Internal Documentation

- [Authorization Assignment Procedures](./AUTHORIZATION_ASSIGNMENT.md)
- [Authorization Configuration](./AUTHORIZATION_CONFIGURATION.md)
- [Technical Implementation Guide](/workspace/apps/web/src/lib/README.md)

### 9.2 Code References

- Access Control Policies: `/workspace/apps/web/src/lib/auth/access-control.ts`
- Role Schema: `/workspace/apps/web/src/server/db/schema/auth.ts`
- RBAC Utilities: `/workspace/apps/web/src/lib/rbac/`
- Authorization Middleware: `/workspace/apps/web/src/lib/server-action-client/action-client.ts`

### 9.3 External Standards

- [NEN 7510:2017 - Information Security in Healthcare](https://www.nen.nl/en/nen-7510-2017-nl-244879)
- [NEN 7513:2018 - Logging in Healthcare](https://www.nen.nl/en/nen-7513-2018-nl-267352)
- [AVG (GDPR)](https://gdpr-info.eu/)
- [ISO 27001 - Information Security Management](https://www.iso.org/isoiec-27001-information-security.html)

## 10. Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-24 | Development Team | Initial version for SSD-7.1.03 compliance |

**Review Schedule:**
- Next review: 2026-05-24 (quarterly)
- Annual review: 2027-02-24

**Document Owner:** Security & Compliance Team  
**Approvers:** CTO, Security Officer, Compliance Officer

---

*This document satisfies SSD-7.1.03: "Er bestaat een proces voor het definiëren, toekennen en onderhouden van de autorisaties"*
