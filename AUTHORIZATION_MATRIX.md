# Authorization Matrix - Function Separation

**Document Version:** 1.0.0  
**Last Updated:** 2026-02-24  
**Compliance Requirement:** SSD-7.3.02 - Scheiding van niet verenigbare autorisaties  
**Status:** Active

## Executive Summary

This authorization matrix documents the role-based access control (RBAC) system implemented in the Inovy application. It expresses function separation to ensure that conflicting authorizations are properly segregated, meeting security compliance requirements for healthcare applications under Dutch and European regulations (AVG, NEN 7510).

## Table of Contents

1. [Organization Roles](#organization-roles)
2. [Team Roles](#team-roles)
3. [Authorization Matrix](#authorization-matrix)
4. [Function Separation Analysis](#function-separation-analysis)
5. [Implementation Details](#implementation-details)
6. [Maintenance Procedures](#maintenance-procedures)
7. [Compliance Mapping](#compliance-mapping)

## Organization Roles

The system implements six organization-level roles with hierarchical permissions:

| Role | Description | Primary Use Case |
|------|-------------|------------------|
| **Superadmin** | System-wide administrator with full access | Platform management, system configuration |
| **Owner** | Organization creator (mapped to Admin) | Organization founding and ownership |
| **Admin** | Organization administrator | Organization management, user administration |
| **Manager** | Limited administrative access | Team and project management |
| **User** | Standard user with creation rights | Daily operations, content creation |
| **Viewer** | Read-only access | Observers, auditors, limited stakeholders |

### Role Hierarchy

```
Superadmin (highest privileges)
    │
    ├─ Owner (organization level)
    │   │
    │   ├─ Admin (organization level)
    │   │   │
    │   │   ├─ Manager (limited admin)
    │   │   │   │
    │   │   │   ├─ User (standard access)
    │   │   │   │   │
    │   │   │   │   └─ Viewer (read-only)
```

## Team Roles

Teams within organizations have separate role assignments:

| Team Role | Description | Team-Level Access |
|-----------|-------------|-------------------|
| **Admin** | Team administrator | Full team management |
| **Lead** | Team leader | Team coordination |
| **Member** | Team member | Team participation |

**Note:** Team roles are independent of organization roles. A user with Viewer role at organization level can be a Team Admin for specific teams.

## Authorization Matrix

### Resource Access Matrix

| Resource | Superadmin | Admin | Manager | User | Viewer |
|----------|------------|-------|---------|------|--------|
| **Projects** |
| - Create | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Read | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Update | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Delete | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Recordings** |
| - Create | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Read | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Update | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Delete | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Tasks** |
| - Create | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Read | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Update | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Delete | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Organization** |
| - Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| - List | ✅ | ❌ | ❌ | ❌ | ❌ |
| - Read | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Update | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Users** |
| - Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Read | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Update | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Teams** |
| - Create | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Read | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Update | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Delete | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Chat** |
| - Project Chat | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Organization Chat | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Settings** |
| - Read | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Update | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Integrations** |
| - Manage | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Organization Instructions** |
| - Read | ✅ | ✅ | ✅ | ✅ | ✅ |
| - Write | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Audit Logs** |
| - Read | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Invitations** |
| - Create | ✅ | ✅ | ✅ | ❌ | ❌ |
| - Cancel | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Onboarding** |
| - Create | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Read | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Update | ✅ | ✅ | ✅ | ✅ | ❌ |
| - Complete | ✅ | ✅ | ✅ | ✅ | ❌ |
| **System Administration** |
| - Superadmin Actions | ✅ | ❌ | ❌ | ❌ | ❌ |
| - Admin Dashboard | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Deepgram Token | ✅ | ❌ | ❌ | ❌ | ❌ |

### Permission Symbols

- ✅ **Granted** - Role has explicit permission for this action
- ❌ **Denied** - Role does not have permission for this action

## Function Separation Analysis

Function separation (scheiding van functies) is a security principle that prevents incompatible authorizations from being assigned to the same role. This matrix implements the following separations:

### 1. Administration vs. Operation

**Principle:** Administrative functions are separated from operational functions.

| Administrative Functions | Roles |
|-------------------------|-------|
| Organization management (create, delete) | Superadmin, Admin |
| User management (create, update, delete) | Superadmin, Admin |
| Team management (create, update, delete) | Superadmin, Admin |
| Integration management | Superadmin, Admin, Manager |
| Audit log access | Superadmin, Admin |

| Operational Functions | Roles |
|----------------------|-------|
| Project operations | All roles (read varies by role) |
| Recording operations | All roles (read varies by role) |
| Task operations | All roles (read varies by role) |
| Chat usage | User+ |

**Separation Achieved:** Users and Viewers cannot perform administrative functions. This prevents operational users from modifying system configuration, user accounts, or accessing audit logs.

### 2. Write vs. Read

**Principle:** Read-only roles are separated from write-capable roles.

| Write Permissions | Roles |
|-------------------|-------|
| Create/Update/Delete any resource | Superadmin, Admin, Manager, User |
| Read-only access | Viewer |

**Separation Achieved:** The Viewer role has no write permissions, ensuring separation of duties for audit and compliance scenarios.

### 3. Organization Management vs. System Management

**Principle:** Organization-level administration is separated from system-wide administration.

| System-Wide Functions | Role |
|-----------------------|------|
| Superadmin actions | Superadmin only |
| Cross-organization access | Superadmin only |
| Deepgram token management | Superadmin only |

| Organization-Level Functions | Roles |
|------------------------------|-------|
| Organization CRUD | Admin, (limited: Manager) |
| User management | Admin |
| Team management | Admin |

**Separation Achieved:** Superadmin role is distinct from Admin role. Admins can only manage their own organization, while Superadmin has system-wide access.

### 4. Sensitive Data Access

**Principle:** Access to sensitive audit information is restricted.

| Sensitive Function | Roles |
|-------------------|-------|
| Audit log access | Superadmin, Admin |
| Consent audit logs | Superadmin, Admin |
| Chat audit logs | Superadmin, Admin |

**Separation Achieved:** Only Superadmin and Admin roles can access audit logs, ensuring that operational users cannot tamper with or view compliance records.

### 5. Delegation and Invitation

**Principle:** User invitation/creation is separated from general operations.

| Function | Roles |
|----------|-------|
| Invite users | Superadmin, Admin, Manager |
| Create users directly | Superadmin, Admin |
| Accept invitations | All |

**Separation Achieved:** Only administrative roles can invite or create users, preventing privilege escalation through self-registration.

### 6. Configuration Management

**Principle:** System configuration is separated from data operations.

| Configuration Function | Roles |
|-----------------------|-------|
| Integration management | Superadmin, Admin, Manager |
| Settings (update) | Superadmin, Admin, Manager, User |
| Organization instructions (write) | Superadmin, Admin |

**Separation Achieved:** Viewers cannot modify any configuration. Users can modify personal settings but not organization-wide instructions.

## Implementation Details

### Code References

The authorization matrix is implemented in code at:

**Primary Configuration:**
- `apps/web/src/lib/auth/access-control.ts` - Role and permission definitions using Better Auth access control plugin

**Supporting Files:**
- `apps/web/src/lib/rbac/permissions.ts` - Type-safe permission objects
- `apps/web/src/lib/rbac/permissions-server.ts` - Server-side permission checks
- `apps/web/src/lib/rbac/permissions-client.ts` - Client-side permission checks
- `apps/web/src/lib/rbac/rbac.ts` - RBAC utility functions
- `apps/web/src/lib/rbac/organization-isolation.ts` - Organization isolation enforcement

**Database Schema:**
- `apps/web/src/server/db/schema/auth.ts` - Role enums and user/organization tables

**Middleware:**
- `apps/web/src/lib/server-action-client/action-client.ts` - Authorization middleware for server actions

### Enforcement Layers

The authorization matrix is enforced at multiple layers:

1. **Database Layer**
   - Role enum constraints (`organization_member_role`)
   - Foreign key relationships ensure data integrity

2. **Application Layer**
   - Server actions validate permissions before execution
   - Organization isolation prevents cross-organization access
   - Action client middleware (`authorizedActionClient`)

3. **API Layer**
   - Better Auth access control plugin enforces permissions
   - Session-based role verification
   - Resource-level authorization checks

4. **Presentation Layer**
   - UI conditionally renders based on user permissions
   - Client-side hooks (`useUserRole`, `useActiveMemberRole`)
   - Route protection for admin interfaces

### Organization Isolation

**Critical Security Feature:** All resources are scoped to organizations.

- Users can only access resources within their organization
- Superadmin is the only role with cross-organization access
- Enforced via database queries and middleware checks

**Implementation:**
```typescript
// apps/web/src/lib/rbac/organization-isolation.ts
- assertOrganizationAccess() - Verifies resource belongs to user's org
- filterByOrganization() - Drizzle query helper
- verifyResourceOrganization() - Validates resource ownership
- batchVerifyOrganization() - Batch validation
```

### Audit Trail

All authorization-related events are logged:

- Permission granted/revoked
- Role assigned/removed
- User created/updated/deleted
- Admin actions
- Audit logs use hash chain for tamper-proofing (SOC 2 compliance)

**Implementation:**
- `apps/web/src/server/db/schema/audit-logs.ts` - Audit log schema
- `apps/web/src/server/services/audit-log.service.ts` - Audit service

## Permission Details by Role

### Superadmin

**Purpose:** System-wide platform management and support

**Full Permissions:**
- All Admin permissions, plus:
- Superadmin actions (system-wide operations)
- Cross-organization access
- Deepgram API token management
- Organization listing (all organizations)

**Function Separation Rationale:** Superadmin is reserved for platform operators and should be assigned only to trusted system administrators. This role should never be assigned to organization members for regular operations.

**Risk Level:** Critical - Full system access

### Admin

**Purpose:** Organization administration and user management

**Full Permissions:**
- Organization: create, read, update, delete
- Users: create, read, update, delete
- Teams: create, read, update, delete
- Projects: create, read, update, delete
- Recordings: create, read, update, delete
- Tasks: create, read, update, delete
- Integrations: manage
- Settings: read, update
- Organization Instructions: read, write
- Audit Logs: read
- Invitations: create, cancel
- Chat: project and organization
- Onboarding: full access

**Limitations:**
- Cannot perform superadmin actions
- Cannot access Deepgram tokens
- Cannot access other organizations

**Function Separation Rationale:** Admin role is for organization management. Admins can manage users and configuration but cannot perform system-wide operations.

**Risk Level:** High - Full organization access

### Manager

**Purpose:** Team and project management with limited administrative rights

**Permissions:**
- Projects: create, read, update, delete
- Recordings: create, read, update, delete
- Tasks: create, read, update, delete
- Organization: read, update (no create/delete)
- Users: read (no create/update/delete)
- Teams: read (no create/update/delete)
- Integrations: manage
- Settings: read, update
- Organization Instructions: read (no write)
- Invitations: create, cancel
- Chat: project only
- Onboarding: full access

**Limitations:**
- Cannot create or delete organization
- Cannot manage users (create/update/delete)
- Cannot manage teams (create/update/delete)
- Cannot access audit logs
- Cannot access organization chat
- No superadmin or admin actions
- No deepgram access

**Function Separation Rationale:** Manager role bridges operational and administrative functions for team leads who need project management capabilities without full user administration rights.

**Risk Level:** Medium - Project and content management

### User

**Purpose:** Standard daily operations and content creation

**Permissions:**
- Projects: create, read, update (no delete)
- Recordings: create, read, update (no delete)
- Tasks: create, read, update (no delete)
- Users: read
- Teams: read
- Settings: read, update
- Organization Instructions: read
- Chat: project only
- Onboarding: full access

**Limitations:**
- Cannot delete projects, recordings, or tasks
- Cannot manage organization
- Cannot manage users or teams
- Cannot manage integrations
- Cannot access audit logs
- No admin or superadmin actions

**Function Separation Rationale:** Users can create and modify their own content but cannot delete resources or perform administrative functions. This prevents accidental or malicious data loss while allowing productivity.

**Risk Level:** Low - Content creation and modification

### Viewer

**Purpose:** Read-only access for observers, auditors, or limited stakeholders

**Permissions:**
- Projects: read
- Recordings: read
- Tasks: read
- Users: read
- Teams: read
- Settings: read
- Organization Instructions: read
- Chat: project (read-only context)

**Limitations:**
- No write permissions on any resource
- Cannot create, update, or delete anything
- Cannot manage any aspect of the system
- Cannot access audit logs
- No admin actions

**Function Separation Rationale:** Complete separation of read and write functions. Viewers cannot modify any data, making this role suitable for compliance observers, external auditors, or trainees.

**Risk Level:** Minimal - Read-only access

## Function Separation Analysis

### Incompatible Function Combinations

The following function combinations are **prohibited** and enforced by the authorization matrix:

#### 1. User Management + Regular Operations (High Risk)

**Prohibited:** Assigning user management permissions to operational roles.

- ❌ Users cannot manage user accounts
- ❌ Viewers cannot manage user accounts
- ✅ Only Admin role can create/modify/delete users

**Justification:** Prevents privilege escalation where operational users could grant themselves or others administrative access.

#### 2. Audit Log Access + Subject of Auditing (High Risk)

**Prohibited:** Users being audited cannot access their own audit logs.

- ❌ Users, Managers, and Viewers cannot read audit logs
- ✅ Only Admin and Superadmin can access audit logs

**Justification:** Maintains integrity of audit trail. Subjects of auditing cannot tamper with or be aware of monitoring.

#### 3. Configuration Management + Limited Access (Medium Risk)

**Prohibited:** Read-only roles cannot modify configuration.

- ❌ Viewers cannot update settings
- ❌ Viewers cannot manage integrations
- ✅ Only User+ roles can update settings

**Justification:** Prevents unauthorized system configuration changes that could affect security or operations.

#### 4. Resource Deletion + Standard Operations (Medium Risk)

**Prohibited:** Standard users cannot delete resources.

- ❌ Users cannot delete projects, recordings, or tasks
- ❌ Viewers cannot delete anything
- ✅ Only Manager+ can delete operational resources
- ✅ Only Admin+ can delete organizational resources (users, teams, organization)

**Justification:** Prevents accidental or malicious data loss. Deletion requires elevated privileges.

#### 5. System-Wide Access + Organization-Level Access (Critical Risk)

**Prohibited:** Organization admins cannot access other organizations or system-wide functions.

- ❌ Admin cannot list all organizations
- ❌ Admin cannot perform superadmin actions
- ❌ Admin cannot access Deepgram tokens
- ✅ Only Superadmin has system-wide access

**Justification:** Enforces multi-tenant isolation. Organization administrators are restricted to their own organization's data.

#### 6. Invitation + User Creation (Low Risk - Controlled)

**Controlled:** User invitation and direct user creation are separate permissions.

- ✅ Admin and Manager can invite users
- ✅ Only Admin can create users directly
- ❌ Users and Viewers cannot invite

**Justification:** Invitation is a lighter form of user management. Managers can expand their teams through invitations, but only Admins can directly create accounts.

### Segregation of Duties Matrix

| Function Category | Create | Read | Update | Delete | Manage |
|------------------|--------|------|--------|--------|---------|
| **Organization** | A | A, M | A, M | A | A |
| **Users** | A | ALL | A | A | A |
| **Teams** | A | ALL | A | A | A |
| **Projects** | A, M, U | ALL | A, M, U | A, M | N/A |
| **Recordings** | A, M, U | ALL | A, M, U | A, M | N/A |
| **Tasks** | A, M, U | ALL | A, M, U | A, M | N/A |
| **Integrations** | N/A | A, M | N/A | N/A | A, M |
| **Audit Logs** | N/A | A | N/A | N/A | N/A |

**Legend:**
- A = Admin (includes Superadmin)
- M = Manager
- U = User
- V = Viewer
- ALL = All roles
- N/A = Not applicable

### Critical Separation Points

1. **Admin vs. Operational Users**
   - Admins: Can manage users, teams, organization
   - Users: Can only create/modify content
   - **Separation enforced:** User management is administrative-only

2. **Manager vs. User**
   - Managers: Can delete content, manage integrations, invite users
   - Users: Can create/update but not delete
   - **Separation enforced:** Deletion requires management role

3. **Admin vs. Superadmin**
   - Admins: Organization-scoped access
   - Superadmin: System-wide access, platform management
   - **Separation enforced:** Multi-tenant isolation prevents cross-organization access

4. **Write vs. Read-Only**
   - Active roles: Can create and modify data
   - Viewer: Can only read data
   - **Separation enforced:** No write permissions for Viewer role

5. **Audit Access vs. Audited Subjects**
   - Admin/Superadmin: Can read audit logs
   - Manager/User/Viewer: Cannot access audit logs
   - **Separation enforced:** Subjects cannot access their own audit trail

## Maintenance Procedures

### When to Update This Matrix

This authorization matrix must be updated when:

1. **New Roles Are Added**
   - Update role definitions in `apps/web/src/server/db/schema/auth.ts`
   - Add role to `access-control.ts`
   - Update this document with new role row

2. **New Resources/Features Are Added**
   - Define resource in `access-control.ts` statement object
   - Assign permissions to roles
   - Add new resource row to matrix
   - Document any new function separations

3. **Permissions Are Modified**
   - Update role definitions in `access-control.ts`
   - Update matrix cells
   - Document rationale for changes
   - Review function separation implications

4. **Compliance Requirements Change**
   - Review against new requirements
   - Adjust role assignments if needed
   - Update compliance mapping

5. **Security Audits Recommend Changes**
   - Implement audit recommendations
   - Update documentation
   - Document audit findings

### Update Process

1. **Identify Change Requirement**
   - Security audit finding
   - New feature requirement
   - Compliance requirement update
   - Bug or security vulnerability

2. **Review Function Separation**
   - Analyze if change introduces incompatible function combinations
   - Verify separation of duties is maintained
   - Document any new separations

3. **Update Code**
   - Modify `apps/web/src/lib/auth/access-control.ts`
   - Update role definitions
   - Add/modify permission checks in relevant features
   - Update database schema if needed

4. **Update Documentation**
   - Update this authorization matrix
   - Update version number and last updated date
   - Add changelog entry
   - Update function separation analysis if needed

5. **Test Changes**
   - Verify permission checks work correctly
   - Test each role can/cannot perform expected actions
   - Verify organization isolation is maintained
   - Check audit logging captures changes

6. **Review and Approve**
   - Security team review
   - Compliance review if needed
   - Approval from project lead

7. **Deploy**
   - Deploy code changes
   - Communicate changes to stakeholders
   - Update training materials if needed

### Automated Validation

The authorization matrix is validated through:

1. **Type Safety**
   - TypeScript enforces permission types
   - Better Auth provides compile-time checks

2. **Runtime Checks**
   - `checkPermission()` validates permissions server-side
   - `authorizedActionClient` middleware enforces permissions
   - Organization isolation checks prevent cross-org access

3. **Testing**
   - Unit tests for permission checks
   - Integration tests for server actions
   - E2E tests for critical flows

4. **Audit Logging**
   - Permission violations logged
   - Unauthorized access attempts tracked
   - Regular audit log review

## Compliance Mapping

### SSD-7.3.02 Requirements

**Requirement:** "Er is een ingevulde autorisatiematrix, waarin de functiescheiding tot uitdrukking komt."

**Translation:** "There is a completed authorization matrix that expresses function separation."

**Compliance Status:** ✅ **COMPLIANT**

| Requirement Component | Implementation | Status |
|----------------------|----------------|--------|
| Authorization matrix exists | This document + code implementation | ✅ Complete |
| Function separation expressed | Section: Function Separation Analysis | ✅ Complete |
| Matrix is maintained | Maintenance Procedures section | ✅ Complete |
| Incompatible functions separated | Incompatible Function Combinations | ✅ Complete |
| Documentation is current | Version tracking and update process | ✅ Complete |

### Related Compliance Requirements

| Requirement | Relation | Implementation |
|------------|----------|----------------|
| **SSD-7.1.01** - Authentication required | Prerequisite | Better Auth, session management |
| **SSD-7.2.01** - Authorization checks | Implementation | Permission checks in all layers |
| **SSD-7.3.01** - Least privilege principle | Design principle | Role hierarchy with minimal permissions |
| **SSD-7.3.03** - Regular access reviews | Process | Update procedures documented |
| **AVG Art. 32** - Security measures | Compliance | Access control as security measure |
| **NEN 7510** - Access control | Compliance | RBAC system, audit logging |
| **NEN 7513** - Authorization management | Compliance | Better Auth plugin, role management |

### NEN 7510 Mapping

NEN 7510 (Dutch healthcare security standard) requires:

| NEN 7510 Control | Implementation |
|-----------------|----------------|
| **A.9.1** - Access control policy | This authorization matrix serves as the policy |
| **A.9.2** - User access management | Role assignment and invitation process |
| **A.9.3** - User responsibilities | Role descriptions define responsibilities |
| **A.9.4** - System access control | Multi-layer enforcement, org isolation |

### AVG/GDPR Mapping

| AVG/GDPR Article | Requirement | Implementation |
|-----------------|-------------|----------------|
| **Art. 5(1)(f)** | Integrity and confidentiality | Access control prevents unauthorized access |
| **Art. 32(1)(b)** | Access control measures | RBAC system with function separation |
| **Art. 32(2)** | Regular testing and assessment | Update and maintenance procedures |

## Changelog

### Version 1.0.0 (2026-02-24)

- Initial authorization matrix creation
- Documented 6 organization roles
- Documented 3 team roles
- Documented 17+ resource types
- Analyzed 6 critical function separations
- Established maintenance procedures
- Mapped compliance requirements

---

## Approval and Review

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Engineer | TBD | TBD | __________ |
| Compliance Officer | TBD | TBD | __________ |
| Project Lead | TBD | TBD | __________ |

**Next Review Date:** TBD (recommend quarterly reviews)

---

## References

1. **SSD-7 Gebruikersrechtenbeheer** - Dutch security baseline for web applications
2. **NEN 7510** - Dutch standard for information security in healthcare
3. **NEN 7513** - Logging and monitoring in healthcare IT
4. **AVG (GDPR)** - European data protection regulation
5. **Better Auth Documentation** - Access control plugin: https://better-auth.com/docs/plugins/access-control

## Contact

For questions or updates to this authorization matrix:
- Security team: [TBD]
- Compliance team: [TBD]
- GitHub: File issues under "Security & Privacy Compliance" project

---

*This document is part of the Inovy Security & Privacy Compliance program and must be kept current as the system evolves.*
