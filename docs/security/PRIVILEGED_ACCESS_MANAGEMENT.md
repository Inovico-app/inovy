# Privileged Access Management Documentation

**Document Version:** 1.0  
**Last Updated:** February 24, 2026  
**Compliance:** SSD-7.1.02 - Extra attention for high-privilege accounts  
**Status:** Active

---

## Table of Contents

1. [Overview](#overview)
2. [Privileged Account Types](#privileged-account-types)
3. [Access Control Model](#access-control-model)
4. [Account Management Procedures](#account-management-procedures)
5. [Monitoring and Audit](#monitoring-and-audit)
6. [Review Process](#review-process)
7. [Security Controls](#security-controls)
8. [Incident Response](#incident-response)

---

## Overview

This document defines the policies and procedures for managing high-privilege accounts within the system. It ensures proper control, monitoring, and review of privileged access in compliance with SSD-7.1.02 (Autorisaties - Extra aandacht voor accounts met hoge privileges).

### Purpose

- Document all privileged account types and their capabilities
- Define procedures for creating, managing, and revoking privileged access
- Establish monitoring and audit requirements for privileged actions
- Implement regular review processes for privilege assignments

### Scope

This policy applies to:
- All superadmin accounts (system-wide privileges)
- All admin accounts (organization-wide privileges)
- All manager accounts (elevated permissions within organizations)
- Any account with elevated permissions beyond standard user access

---

## Privileged Account Types

### 1. Superadmin Role

**Description:** Highest privilege level with full system access across all organizations.

**Capabilities:**
- Full access to all organizations and their data
- User management across all organizations
- Organization creation, modification, and deletion
- Access to system-wide settings and configurations
- Deepgram token management
- Agent configuration management (superadmin-only features)
- Full audit log access across all organizations
- Ability to assign any role to any user

**Authorization Matrix:**
```
Resource              | Permissions
---------------------|----------------------------------
project              | create, read, update, delete
recording            | create, read, update, delete
task                 | create, read, update, delete
organization         | create, list, read, update, delete
user                 | create, read, update, delete
chat                 | project, organization
superadmin           | all
admin                | all
orgInstruction       | read, write
deepgram             | token
setting              | read, update
integration          | manage
team                 | create, read, update, delete
audit-log            | read
onboarding           | create, read, update, complete
invitation           | create, cancel
```

**Assignment Criteria:**
- Reserved for platform administrators only
- Requires explicit approval from CTO or Security Officer
- Maximum of 3-5 superadmin accounts recommended
- Must have completed security training
- Must use MFA (Multi-Factor Authentication)

**Current Superadmins:**
> **Action Required:** Maintain a list of current superadmin accounts here
> 
> Example format:
> - Name: John Doe
>   - Email: john.doe@company.com
>   - Assigned: 2025-01-15
>   - Approved by: CTO
>   - Last reviewed: 2025-12-01
>   - Review due: 2026-03-01

### 2. Admin Role

**Description:** Full organization access for managing organization-level resources and users.

**Capabilities:**
- Full access to organization data and resources
- User management within the organization
- Organization settings management
- Team management
- Integration management
- Audit log access for the organization
- Cannot access other organizations' data
- Cannot access superadmin-only features (e.g., Deepgram token management)

**Authorization Matrix:**
```
Resource              | Permissions
---------------------|----------------------------------
project              | create, read, update, delete
recording            | create, read, update, delete
task                 | create, read, update, delete
organization         | create, read, update, delete
user                 | create, read, update, delete
chat                 | project, organization
admin                | all
orgInstruction       | read, write
deepgram             | (none - superadmin only)
setting              | read, update
integration          | manage
team                 | create, read, update, delete
audit-log            | read
onboarding           | create, read, update, complete
invitation           | create, cancel
```

**Assignment Criteria:**
- Assigned to organization owners or designated administrators
- Requires approval from organization owner or superadmin
- Must have completed onboarding process
- Should have MFA enabled (recommended)

### 3. Manager Role

**Description:** Limited administrative access for team and project management.

**Capabilities:**
- Project, recording, and task management
- Organization settings updates
- Read-only access to users and teams
- Integration management
- Cannot assign roles or manage users
- Cannot delete organization

**Assignment Criteria:**
- Assigned by admin or superadmin
- Suitable for team leads and project managers
- Regular review required

### Comparison Table

| Capability | Superadmin | Admin | Manager | User |
|-----------|-----------|-------|---------|------|
| Cross-organization access | ✓ | ✗ | ✗ | ✗ |
| Organization creation/deletion | ✓ | ✓/✗ | ✗ | ✗ |
| User management | ✓ | ✓ | ✗ | ✗ |
| Role assignment | ✓ | ✓ | ✗ | ✗ |
| Project management | ✓ | ✓ | ✓ | Limited |
| Audit log access | ✓ (all) | ✓ (org) | ✗ | ✗ |
| System configuration | ✓ | ✗ | ✗ | ✗ |

---

## Access Control Model

### Role-Based Access Control (RBAC)

The system implements RBAC using Better Auth's access control plugin with the following components:

1. **Resources:** System entities that can be accessed (projects, recordings, users, etc.)
2. **Actions:** Operations that can be performed on resources (create, read, update, delete, etc.)
3. **Roles:** Collections of permissions assigned to users
4. **Policies:** Rules that map roles to resource-action combinations

### Implementation Details

**Location:** `apps/web/src/lib/auth/access-control.ts`

**Role Definitions:**
- Roles are defined using `ac.newRole()` from Better Auth
- Each role specifies permissions for each resource type
- Roles are immutable and defined at compile-time

**Permission Checking:**
- Server-side: `checkPermission()` in `lib/rbac/permissions-server.ts`
- Middleware: `authorizedActionClient` in `lib/server-action-client/action-client.ts`
- Helper functions: `isSuperAdmin()`, `isAdmin()` in `lib/rbac/rbac.ts`

### Organization Isolation

- All data access is scoped to the user's active organization
- Organization context is validated before any data operation
- Cross-organization access is restricted to superadmins only
- Middleware enforces organization isolation automatically

---

## Account Management Procedures

### Creating Privileged Accounts

#### Superadmin Account Creation

1. **Request Process:**
   - Written request submitted to CTO or Security Officer
   - Business justification required
   - Time-bound access period specified (if applicable)

2. **Approval Process:**
   - CTO or Security Officer review and approval required
   - Security team verification
   - Documentation of approval in audit system

3. **Technical Implementation:**
   - Database update to set `users.role = 'superadmin'`
   - Manual database operation logged in audit trail
   - User notified via email of privilege elevation

4. **Post-Creation:**
   - User must complete security training
   - MFA must be enabled before first use
   - Initial actions monitored for 30 days

#### Admin Account Creation

1. **Request Process:**
   - Request from organization owner or superadmin
   - Role: admin, manager, or user specified
   - Business justification documented

2. **Approval Process:**
   - Organization owner or superadmin approval
   - Automated via admin interface

3. **Technical Implementation:**
   - Use admin interface at `/admin/users` or `/admin/privileged-access`
   - Server action: `assignPrivilegedRole` (with audit logging)
   - Role assignment via Better Auth organization API

4. **Post-Creation:**
   - User receives email notification
   - First login triggers additional verification
   - Actions logged for review

### Modifying Privileged Accounts

#### Role Changes

1. **Elevation (e.g., user → admin):**
   - Requires admin or superadmin approval
   - Documented justification required
   - Audit log created automatically
   - User notified of change

2. **Demotion (e.g., admin → user):**
   - Can be initiated by admin, superadmin, or user (self-demotion)
   - Immediate effect with audit trail
   - User notified of change

3. **Technical Implementation:**
   - Server action: `updateMemberRole` in `features/admin/actions/member-management.ts`
   - Better Auth API: `auth.api.updateMemberRole()`
   - Audit log created for all role changes
   - Cache invalidation triggered

### Removing Privileged Access

#### Account Deactivation

1. **Process:**
   - Admin or superadmin initiates removal
   - Sessions terminated immediately
   - User marked as deactivated in database
   - Audit log created

2. **Technical Implementation:**
   - Server action: `removeMember` in `features/admin/actions/member-management.ts`
   - Better Auth API: `auth.api.removeMember()`
   - Organization membership removed
   - Cache invalidation triggered

#### Emergency Revocation

1. **Process:**
   - Immediate revocation by superadmin or security team
   - No waiting period required
   - Incident documented in audit system
   - Post-incident review required

2. **Technical Implementation:**
   - Direct database update if necessary
   - Session invalidation via Better Auth
   - Security log entry created

---

## Monitoring and Audit

### Audit Logging System

**Location:** `apps/web/src/server/services/audit-log.service.ts`

**Audit Log Features:**
- **Hash Chain Integrity:** Each log entry contains a hash of the previous entry, creating a tamper-proof chain
- **Organization Isolation:** Logs are scoped to organizations
- **Comprehensive Metadata:** IP address, user agent, and custom metadata stored
- **SOC 2 Compliance:** Supports compliance requirements for audit trails

### Logged Privileged Events

The following privileged actions are automatically logged:

1. **Role Management:**
   - `role_assigned` - When a user is assigned a privileged role
   - `role_removed` - When a privileged role is revoked
   - Event type: `role_assigned`, `role_removed`
   - Resource type: `role`
   - Metadata includes: previous role, new role, assigned by

2. **Permission Changes:**
   - `permission_granted` - When explicit permissions are granted
   - `permission_revoked` - When permissions are revoked
   - Event type: `permission_granted`, `permission_revoked`
   - Resource type: `permission`

3. **User Management by Privileged Accounts:**
   - `user_created` - New user account creation
   - `user_updated` - User account modifications
   - `user_deleted` - User account deletion
   - `user_activated` / `user_deactivated` - Account status changes

4. **Administrative Access:**
   - Admin page access logged via middleware
   - Sensitive operations (e.g., organization deletion) logged
   - Failed authorization attempts logged

5. **Data Export by Privileged Accounts:**
   - `export_created` - Data export initiated
   - `export_downloaded` - Data export downloaded
   - `audit_log_exported` - Audit logs exported

### Monitoring Dashboard

**Location:** `/admin/audit-logs` and `/admin/privileged-access`

**Features:**
- Real-time view of privileged account activity
- Filter by event type, user, date range
- Anomaly detection and alerts
- Export capabilities for compliance reporting

### Security Logging

**Location:** `apps/web/src/lib/logger.ts`

**Security Events Logged:**
- Unauthorized access attempts
- Failed authentication attempts
- Permission check failures
- Session anomalies

---

## Review Process

### Quarterly Privilege Review

**Frequency:** Every 3 months (quarterly)

**Process:**

1. **Preparation Phase:**
   - Generate list of all privileged accounts (superadmin, admin, manager)
   - Extract activity logs for each privileged account
   - Identify inactive accounts (no activity in 90 days)

2. **Review Phase:**
   - Security officer reviews each privileged account
   - Verify business justification still valid
   - Check for excessive privileges (principle of least privilege)
   - Review activity logs for anomalies

3. **Decision Phase:**
   - Confirm continued need for privileges
   - Revoke unnecessary privileges
   - Document review results

4. **Documentation:**
   - Review date and reviewer name
   - Accounts reviewed
   - Actions taken (confirmed, revoked, modified)
   - Next review date

**Review Checklist:**
- [ ] List all current superadmin accounts
- [ ] List all admin accounts per organization
- [ ] Check last activity date for each privileged account
- [ ] Verify MFA status for all privileged accounts
- [ ] Review recent audit logs for suspicious patterns
- [ ] Confirm business justification for each account
- [ ] Update documentation with review results
- [ ] Schedule next review

### Automated Review Triggers

**Implemented in:** `/admin/privileged-access` dashboard

**Automatic Alerts:**
- Privileged account inactive for 90+ days
- Multiple failed access attempts (5+ in 1 hour)
- Unusual access patterns (e.g., access from new locations)
- Role changes to privileged roles
- Superadmin actions outside business hours

### Activity Monitoring

**Daily:**
- Review privileged account activity logs
- Check for failed authorization attempts
- Monitor audit log integrity

**Weekly:**
- Generate privileged access activity report
- Review new privileged account assignments
- Check for dormant accounts

**Monthly:**
- Comprehensive review of all privileged accounts
- Activity trend analysis
- Security incident correlation

---

## Security Controls

### Authentication Requirements

**All Privileged Accounts Must:**
- Use strong passwords (minimum 12 characters, complexity requirements)
- Enable Multi-Factor Authentication (MFA)
- Use passkey/WebAuthn when available
- Avoid password sharing

**Superadmin Accounts Must Also:**
- Use hardware security keys (YubiKey or similar)
- Log in from approved IP addresses only (if configured)
- Complete annual security training

### Authorization Enforcement

**Server-Side:**
- All privileged operations protected by `authorizedActionClient` middleware
- Permission checks executed before every protected action
- Organization isolation enforced at data access layer

**Client-Side:**
- Role-based UI rendering (hide privileged features from non-privileged users)
- Route protection via middleware
- Graceful degradation for unauthorized access attempts

### Session Management

**Session Security:**
- Cookie-based sessions via Better Auth
- Secure, HttpOnly, SameSite=Lax cookies
- Session timeout: 30 days (configurable)
- Automatic session invalidation on privilege revocation

**Active Organization Context:**
- Users can belong to multiple organizations
- Active organization stored in session
- Permission checks scoped to active organization
- Superadmins can access all organizations

### Data Protection

**Encryption:**
- All data encrypted at rest
- TLS for all data in transit
- Database credentials stored securely
- API keys managed via environment variables

**Audit Trail Protection:**
- Hash chain prevents audit log tampering
- Cryptographic verification of log integrity
- Immutable audit logs (no deletion)
- Regular integrity checks via `/admin/audit-logs`

---

## Incident Response

### Suspicious Activity Detection

**Indicators:**
- Multiple failed login attempts
- Access from unusual locations or devices
- Privilege escalation attempts
- Unusual data export volumes
- Off-hours access to sensitive resources

**Response Actions:**
1. Alert security team immediately
2. Review audit logs for the account
3. Temporarily suspend account if necessary
4. Investigate root cause
5. Document incident in security log
6. Remediate and restore access if appropriate

### Compromise Response

**If Privileged Account Compromised:**

1. **Immediate Actions (0-1 hour):**
   - Revoke account access immediately
   - Terminate all active sessions
   - Reset account credentials
   - Notify security team

2. **Investigation (1-24 hours):**
   - Review complete audit trail
   - Identify scope of unauthorized access
   - Determine data/systems accessed
   - Assess potential data breach

3. **Remediation (1-7 days):**
   - Revoke and rotate affected credentials
   - Review and restore system integrity
   - Notify affected parties if required
   - Implement additional controls

4. **Post-Incident (7-30 days):**
   - Complete incident report
   - Update security procedures
   - Conduct security training
   - Re-enable access with enhanced monitoring

### Reporting Requirements

**Internal Reporting:**
- Security incidents reported to security team immediately
- Privileged access violations escalated to management
- Monthly security report includes privileged access metrics

**External Reporting:**
- Data breaches reported per AVG/GDPR requirements
- Compliance violations reported to relevant authorities
- Customer notification if their data accessed

---

## Implementation References

### Key Files

1. **Access Control Configuration:**
   - `apps/web/src/lib/auth/access-control.ts` - Role definitions and permissions

2. **Permission Checking:**
   - `apps/web/src/lib/rbac/permissions-server.ts` - Server-side permission validation
   - `apps/web/src/lib/rbac/rbac.ts` - Helper functions for role checking

3. **Audit Logging:**
   - `apps/web/src/server/services/audit-log.service.ts` - Audit log service
   - `apps/web/src/server/db/schema/audit-logs.ts` - Audit log schema

4. **Member Management:**
   - `apps/web/src/features/admin/actions/member-management.ts` - Role assignment actions

5. **Admin Interface:**
   - `apps/web/src/app/(main)/admin/users/page.tsx` - User management page
   - `apps/web/src/app/(main)/admin/audit-logs/page.tsx` - Audit log viewer
   - `apps/web/src/app/(main)/admin/privileged-access/page.tsx` - Privileged access dashboard

### Database Schema

**Users Table:**
```sql
users {
  id: text (primary key)
  name: text
  email: text (unique)
  emailVerified: boolean
  role: organization_member_role (enum: owner, admin, superadmin, manager, user, viewer)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Members Table (Organization Membership):**
```sql
members {
  id: text (primary key)
  organizationId: text (FK to organizations)
  userId: text (FK to users)
  role: organization_member_role (default: "user")
  createdAt: timestamp
}
```

**Audit Logs Table:**
```sql
audit_logs {
  id: uuid (primary key)
  eventType: audit_event_type (enum)
  resourceType: audit_resource_type (enum)
  resourceId: uuid (nullable)
  userId: text (not null)
  organizationId: text (not null)
  action: audit_action (enum)
  ipAddress: text (nullable)
  userAgent: text (nullable)
  metadata: jsonb (nullable)
  previousHash: text (nullable)
  hash: text (not null)
  createdAt: timestamp (not null)
}
```

---

## Compliance Mapping

### SSD-7.1.02 Requirements

| Requirement | Implementation | Status |
|------------|----------------|--------|
| Admin accounts documented | This documentation file + privileged access dashboard | ✅ Implemented |
| Privileged access monitored | Audit logging + privileged access dashboard + alerts | ✅ Implemented |
| Regular privilege review | Quarterly review process + automated triggers | ✅ Implemented |

### Related Standards

- **NEN 7510:** Informatiebeveiliging in de zorg
- **AVG/GDPR:** Privacy and data protection
- **NEN 7513:** Toegangsbeheer (access control)
- **ISO 27001:** Information security management
- **SOC 2:** Audit and compliance framework

---

## Appendices

### A. Review Log Template

```markdown
# Privileged Access Review - [Date]

**Reviewer:** [Name]
**Date:** [YYYY-MM-DD]
**Review Period:** [Start Date] to [End Date]

## Superadmin Accounts Reviewed
- [x] Account 1: [Email] - Status: Active, Justified
- [ ] Account 2: [Email] - Status: Revoked, No longer needed

## Admin Accounts by Organization
### Organization: [Name]
- [x] Account 1: [Email] - Status: Active, Justified
- [x] Account 2: [Email] - Status: Active, Justified

## Findings
- [List any issues or concerns]

## Actions Taken
- [List any privilege revocations or modifications]

## Next Review Date
[YYYY-MM-DD]
```

### B. Privilege Request Form

```markdown
# Privileged Access Request

**Requestor:** [Name]
**Email:** [Email]
**Date:** [YYYY-MM-DD]

**Requested Privilege Level:**
- [ ] Superadmin
- [ ] Admin
- [ ] Manager

**Organization (if applicable):** [Organization Name]

**Business Justification:**
[Explain why elevated privileges are needed]

**Duration:**
- [ ] Permanent
- [ ] Temporary (specify end date): [YYYY-MM-DD]

**Approver Signature:** _______________________
**Date Approved:** [YYYY-MM-DD]
```

### C. Quick Reference Guide

**Check if user is superadmin:**
```typescript
import { isSuperAdmin } from "@/lib/rbac/rbac";

const user = await getUser();
if (await isSuperAdmin(user.id)) {
  // User is superadmin
}
```

**Check specific permission:**
```typescript
import { checkPermission } from "@/lib/rbac/permissions-server";
import { Permissions } from "@/lib/rbac/permissions";

const hasPermission = await checkPermission(Permissions.user.delete);
if (hasPermission) {
  // User has permission to delete users
}
```

**Create audit log:**
```typescript
import { AuditLogService } from "@/server/services/audit-log.service";

await AuditLogService.createAuditLog({
  eventType: "role_assigned",
  resourceType: "role",
  resourceId: memberId,
  userId: currentUser.id,
  organizationId: organizationId,
  action: "assign",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  metadata: {
    previousRole: "user",
    newRole: "admin",
    assignedBy: currentUser.email,
  },
});
```

---

## Contact Information

**Security Team:**
- Email: security@company.com
- Incident Hotline: [Phone Number]

**Compliance Officer:**
- Name: [Name]
- Email: compliance@company.com

**CTO:**
- Name: [Name]
- Email: cto@company.com

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-24 | System | Initial documentation for SSD-7.1.02 compliance |

