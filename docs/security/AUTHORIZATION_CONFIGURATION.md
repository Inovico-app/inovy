# Authorization Configuration Documentation

**Document Version:** 1.0  
**Date:** 2026-02-24  
**Status:** Active  
**SSD Reference:** SSD-7.1.03 - Autorisaties

## Purpose

This document provides comprehensive configuration documentation for the authorization system in the Inovy application, including role definitions, permission matrices, and technical configuration details.

## Scope

This documentation covers:

- Complete role and permission definitions
- Permission matrices for all roles
- Technical configuration details
- Database schema configuration
- API configuration
- Environment variables

## 1. Role Definitions

### 1.1 Role Hierarchy

```
┌─────────────────────────────────────────┐
│          superadmin (System)            │
│     Full system access, all orgs        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           owner (Organization)           │
│      Organization owner, full control    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           admin (Organization)           │
│     Administrative access in org         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          manager (Organization)          │
│   Limited admin, project management      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│           user (Organization)            │
│      Standard user access in org         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│          viewer (Organization)           │
│       Read-only access in org            │
└─────────────────────────────────────────┘
```

### 1.2 Role Descriptions

#### Superadmin

**Level:** System  
**Scope:** All organizations  
**Purpose:** Platform administration and support

**Capabilities:**
- Access to all organizations
- User management across organizations
- System configuration
- Security incident response
- Compliance auditing

**Restrictions:**
- Requires MFA
- All actions logged
- Production access requires approval
- Subject to monthly access review

**Use Cases:**
- Platform support staff
- Security team
- Compliance auditors
- System administrators

---

#### Owner

**Level:** Organization  
**Scope:** Single organization  
**Purpose:** Organization ownership and ultimate authority

**Capabilities:**
- Full organization control
- Transfer ownership
- Delete organization
- Manage all members and roles
- Configure organization settings
- Access to all organization resources

**Restrictions:**
- Only one owner per organization
- Cannot remove self without transferring ownership
- Cannot downgrade self without appointing new owner

**Use Cases:**
- Organization creator
- Primary decision maker
- Ultimate authority for organization

---

#### Admin

**Level:** Organization  
**Scope:** Single organization  
**Purpose:** Administrative management

**Capabilities:**
- Manage organization members
- Assign roles (except owner)
- Configure organization settings
- Manage teams and projects
- View audit logs
- Manage integrations

**Restrictions:**
- Cannot transfer ownership
- Cannot delete organization
- Cannot assign owner role
- Organization scoped only

**Use Cases:**
- Deputy administrators
- IT administrators
- Department heads

---

#### Manager

**Level:** Organization  
**Scope:** Single organization  
**Purpose:** Project and team management

**Capabilities:**
- Create and manage projects
- Manage recordings and tasks
- Assign tasks to team members
- View organization resources
- Limited team management

**Restrictions:**
- Cannot manage organization settings
- Cannot manage members or roles
- Cannot access audit logs
- Cannot manage integrations

**Use Cases:**
- Project managers
- Team leads
- Department managers

---

#### User

**Level:** Organization  
**Scope:** Single organization  
**Purpose:** Standard application usage

**Capabilities:**
- Create projects
- Upload recordings
- Create and manage own tasks
- Participate in teams
- Use AI features
- Access assigned resources

**Restrictions:**
- Cannot manage organization
- Cannot manage members
- Cannot assign roles
- Limited administrative functions

**Use Cases:**
- Regular employees
- Contractors
- Standard users

---

#### Viewer

**Level:** Organization  
**Scope:** Single organization  
**Purpose:** Read-only access

**Capabilities:**
- View projects
- View recordings
- View tasks
- View organization information
- Read-only access to all resources

**Restrictions:**
- Cannot create resources
- Cannot modify resources
- Cannot delete resources
- No administrative access

**Use Cases:**
- Auditors
- Guests
- External stakeholders
- Read-only consultants

## 2. Permission Matrix

### 2.1 Complete Permission Matrix

| Resource | Action | Superadmin | Owner | Admin | Manager | User | Viewer |
|----------|--------|------------|-------|-------|---------|------|--------|
| **Project** |
| | create | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| | read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | update | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| | delete | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Recording** |
| | create | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| | read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | update | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| | delete | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Task** |
| | create | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| | read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | update | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| | delete | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Organization** |
| | create | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | update | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| | list | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **User** |
| | create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | update | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | delete | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Team** |
| | create | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| | read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | update | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| | delete | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Chat** |
| | organization | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| | project | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Audit Log** |
| | read | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Invitation** |
| | create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | cancel | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Integration** |
| | create | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | update | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| | delete | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Setting** |
| | read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | update | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Onboarding** |
| | create | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| | read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | update | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| | complete | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

### 2.2 Special Permissions

#### Resource Ownership

Users have additional permissions for resources they own:

- **Own Projects:** Full control (even as viewer role)
- **Own Tasks:** Can update and complete
- **Own Profile:** Can always update own profile

#### Team Membership

Team members have additional permissions for team resources:

- **Team Projects:** Team members can access team projects
- **Team Tasks:** Team members can view and update team tasks
- **Team Chat:** Team members can participate in team chat

## 3. Technical Configuration

### 3.1 Database Schema

#### Role Enum Definition

**Location:** `/workspace/apps/web/src/server/db/schema/auth.ts`

```typescript
export const organizationMemberRole = pgEnum('organization_member_role', [
  'owner',
  'admin',
  'superadmin',
  'manager',
  'user',
  'viewer',
]);
```

#### Member Table

```typescript
export const members = pgTable('members', {
  id: text('id').primaryKey(),
  organizationId: text('organization_id')
    .references(() => organization.id, { onDelete: 'cascade' })
    .notNull(),
  userId: text('user_id')
    .references(() => user.id, { onDelete: 'cascade' })
    .notNull(),
  role: organizationMemberRole('role').default('user').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### User Table

```typescript
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  role: organizationMemberRole('role').default('user'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### 3.2 Access Control Configuration

**Location:** `/workspace/apps/web/src/lib/auth/access-control.ts`

```typescript
export const accessControl = {
  superadmin: {
    project: ["*"],
    recording: ["*"],
    task: ["*"],
    organization: ["*"],
    user: ["*"],
    team: ["*"],
    chat: ["*"],
    "audit-log": ["*"],
    invitation: ["*"],
    integration: ["*"],
    setting: ["*"],
    onboarding: ["*"],
  },
  owner: {
    project: ["create", "read", "update", "delete"],
    recording: ["create", "read", "update", "delete"],
    task: ["create", "read", "update", "delete"],
    organization: ["read", "update", "delete"],
    user: ["create", "read", "update", "delete"],
    team: ["create", "read", "update", "delete"],
    chat: ["organization", "project"],
    "audit-log": ["read"],
    invitation: ["create", "cancel"],
    integration: ["create", "read", "update", "delete"],
    setting: ["read", "update"],
    onboarding: ["create", "read", "update", "complete"],
  },
  admin: {
    project: ["create", "read", "update", "delete"],
    recording: ["create", "read", "update", "delete"],
    task: ["create", "read", "update", "delete"],
    organization: ["read", "update"],
    user: ["create", "read", "update", "delete"],
    team: ["create", "read", "update", "delete"],
    chat: ["organization", "project"],
    "audit-log": ["read"],
    invitation: ["create", "cancel"],
    integration: ["create", "read", "update", "delete"],
    setting: ["read", "update"],
    onboarding: ["create", "read", "update", "complete"],
  },
  manager: {
    project: ["create", "read", "update", "delete"],
    recording: ["create", "read", "update", "delete"],
    task: ["create", "read", "update", "delete"],
    organization: ["read"],
    user: ["read"],
    team: ["create", "read", "update", "delete"],
    chat: ["organization", "project"],
    "audit-log": [],
    invitation: [],
    integration: ["read"],
    setting: ["read"],
    onboarding: ["create", "read", "update", "complete"],
  },
  user: {
    project: ["create", "read", "update", "delete"],
    recording: ["create", "read", "update", "delete"],
    task: ["create", "read", "update", "delete"],
    organization: ["read"],
    user: ["read"],
    team: ["read"],
    chat: ["organization", "project"],
    "audit-log": [],
    invitation: [],
    integration: ["read"],
    setting: ["read"],
    onboarding: ["create", "read", "update", "complete"],
  },
  viewer: {
    project: ["read"],
    recording: ["read"],
    task: ["read"],
    organization: ["read"],
    user: ["read"],
    team: ["read"],
    chat: [],
    "audit-log": [],
    invitation: [],
    integration: ["read"],
    setting: ["read"],
    onboarding: ["read"],
  },
} as const satisfies Record<
  (typeof organizationMemberRole.enumValues)[number],
  Record<string, string[]>
>;
```

### 3.3 Better Auth Configuration

**Location:** `/workspace/apps/web/src/lib/auth/auth.ts`

```typescript
export const auth = betterAuth({
  database: {
    // Database configuration
    provider: "pg",
    url: process.env.DATABASE_URL!,
  },
  
  plugins: [
    // Organization plugin for multi-tenancy
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 10,
    }),
    
    // Access control plugin for RBAC
    accessControl({
      ac: accessControl,
    }),
  ],
  
  // ... other configuration
});
```

### 3.4 Authorization Middleware

**Location:** `/workspace/apps/web/src/lib/server-action-client/action-client.ts`

```typescript
export const authorizedActionClient = actionClient
  .metadata<{
    actionName: string;
    resource: string;
    action: string;
  }>()
  .use(async ({ next, metadata }) => {
    const { resource, action, actionName } = metadata;
    
    // Get session
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    if (!session?.user) {
      logger.error("Unauthorized action attempt", {
        actionName,
        resource,
        action,
      });
      throw new Error("Unauthorized: Please sign in");
    }
    
    // Check permission
    const hasPermission = await auth.api.hasPermission({
      headers: await headers(),
      body: { resource, action },
    });
    
    if (!hasPermission) {
      logger.security("Permission denied", {
        userId: session.user.id,
        organizationId: session.organization.id,
        resource,
        action,
        actionName,
      });
      throw new Error("Forbidden: Insufficient permissions");
    }
    
    logger.info("Authorized action", {
      userId: session.user.id,
      organizationId: session.organization.id,
      resource,
      action,
      actionName,
    });
    
    return next({
      ctx: {
        user: session.user,
        organizationId: session.organization.id,
        organization: session.organization,
        member: session.member,
      },
    });
  });
```

## 4. Environment Configuration

### 4.1 Required Environment Variables

```env
# Better Auth Configuration
BETTER_AUTH_SECRET="<random-secret>"  # Generate with: openssl rand -base64 32
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Redis (Session & Cache)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-redis-token"
```

### 4.2 Optional Configuration

```env
# OAuth Providers (for SSO)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

MICROSOFT_CLIENT_ID="your-microsoft-client-id"
MICROSOFT_CLIENT_SECRET="your-microsoft-client-secret"

# Email (for invitations)
RESEND_API_KEY="your-resend-api-key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"
```

## 5. API Endpoints

### 5.1 Better Auth Endpoints

**Base URL:** `/api/auth`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/sign-in` | POST | User sign in |
| `/api/auth/sign-up` | POST | User registration |
| `/api/auth/sign-out` | POST | User sign out |
| `/api/auth/session` | GET | Get current session |
| `/api/auth/has-permission` | POST | Check permission |
| `/api/auth/organization/create` | POST | Create organization |
| `/api/auth/organization/list-members` | POST | List organization members |
| `/api/auth/organization/invite-member` | POST | Invite member |
| `/api/auth/organization/remove-member` | POST | Remove member |
| `/api/auth/organization/update-member-role` | POST | Update member role |

### 5.2 Authorization Check API

```typescript
// Check permission (client-side)
POST /api/auth/has-permission
Content-Type: application/json

{
  "resource": "project",
  "action": "create"
}

// Response
{
  "hasPermission": true
}
```

## 6. Cache Configuration

### 6.1 Authorization Cache

**Cache Keys:**

```typescript
// User permissions cache
`auth:user:${userId}:permissions`

// Organization members cache
`auth:org:${orgId}:members`

// Role cache
`auth:user:${userId}:org:${orgId}:role`
```

**Cache TTL:**
- User permissions: 5 minutes
- Organization members: 15 minutes
- User role: 15 minutes

**Invalidation:**
- On role change
- On member addition/removal
- On organization update

## 7. Migration Scripts

### 7.1 Initial Authorization Schema

**File:** `/workspace/apps/web/src/server/db/migrations/0039_add_auth_schema.sql`

```sql
-- Create role enum
CREATE TYPE organization_member_role AS ENUM (
  'owner',
  'admin',
  'superadmin',
  'manager',
  'user',
  'viewer'
);

-- Add role to user table
ALTER TABLE "user"
ADD COLUMN "role" organization_member_role DEFAULT 'user';

-- Add role to members table
ALTER TABLE "members"
ADD COLUMN "role" organization_member_role DEFAULT 'user' NOT NULL;

-- Add role to invitations table
ALTER TABLE "invitations"
ADD COLUMN "role" organization_member_role DEFAULT 'user' NOT NULL;
```

### 7.2 Adding New Role

```sql
-- Add new role to enum
ALTER TYPE organization_member_role ADD VALUE 'new_role';

-- Update default permissions in application code
-- (No SQL changes needed, permissions are code-based)
```

## 8. Testing Configuration

### 8.1 Test Users

**Test environment should include:**

```typescript
const testUsers = {
  superadmin: {
    email: "superadmin@test.com",
    role: "superadmin",
  },
  owner: {
    email: "owner@test.com",
    role: "owner",
  },
  admin: {
    email: "admin@test.com",
    role: "admin",
  },
  manager: {
    email: "manager@test.com",
    role: "manager",
  },
  user: {
    email: "user@test.com",
    role: "user",
  },
  viewer: {
    email: "viewer@test.com",
    role: "viewer",
  },
};
```

### 8.2 Permission Test Suite

```typescript
// Test all role permissions
describe("Authorization", () => {
  describe("Project Permissions", () => {
    test("superadmin can create project", async () => {
      // Test implementation
    });
    
    test("viewer cannot create project", async () => {
      // Test implementation
    });
    
    // ... more tests
  });
});
```

## 9. Monitoring and Alerts

### 9.1 Authorization Metrics

**Monitored Metrics:**
- Permission checks per minute
- Failed authorization attempts
- Role changes per day
- Emergency access grants
- Superadmin actions

### 9.2 Security Alerts

**Alert Triggers:**
- Multiple failed authorization attempts (> 5 in 1 minute)
- Emergency access grant
- Superadmin action in production
- Ownership transfer
- Mass member removal (> 5 in 10 minutes)

## 10. Compliance Checklist

### 10.1 SSD-7.1.03 Compliance

- ✅ Authorization definition process documented
- ✅ Role hierarchy defined
- ✅ Permission matrix documented
- ✅ Assignment procedures in place
- ✅ Technical configuration documented
- ✅ Audit logging implemented
- ✅ Regular review process defined

### 10.2 NEN 7510 Compliance

- ✅ Access control implemented
- ✅ Role-based authorization
- ✅ Principle of least privilege
- ✅ Audit trail maintained
- ✅ Regular access reviews

### 10.3 AVG (GDPR) Compliance

- ✅ Minimal data access
- ✅ Purpose limitation
- ✅ Access logging
- ✅ Data isolation
- ✅ User rights respected

## 11. References

### 11.1 Related Documentation

- [Authorization Process](./AUTHORIZATION_PROCESS.md)
- [Authorization Assignment Procedures](./AUTHORIZATION_ASSIGNMENT.md)
- [Technical Implementation Guide](/workspace/apps/web/src/lib/README.md)

### 11.2 Code References

- Access Control: `/workspace/apps/web/src/lib/auth/access-control.ts`
- Auth Schema: `/workspace/apps/web/src/server/db/schema/auth.ts`
- RBAC Utilities: `/workspace/apps/web/src/lib/rbac/`
- Authorization Middleware: `/workspace/apps/web/src/lib/server-action-client/action-client.ts`
- Organization Isolation: `/workspace/apps/web/src/lib/rbac/organization-isolation.ts`

### 11.3 External Standards

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [NEN 7510:2017](https://www.nen.nl/en/nen-7510-2017-nl-244879)
- [NEN 7513:2018](https://www.nen.nl/en/nen-7513-2018-nl-267352)
- [AVG (GDPR)](https://gdpr-info.eu/)

## Document Control

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

*This document satisfies SSD-7.1.03: "bij de oplevering de applicatie wordt in de configuratiebeschrijving hiervan gebruik gemaakt of naar verwezen"*
