# Inovy Authorization Matrix

> Last updated: 2026-03-13 | Reflects state after RBAC audit fixes (PR #515)

## Role Hierarchy

```
Superadmin > Admin/Owner > Manager > User > Viewer
```

| Role | Description | Typical Use |
|------|-------------|-------------|
| **Superadmin** | Full platform access including system-level operations | Platform operators, DevOps |
| **Admin** | Full organization access, no system-level features | Organization administrators |
| **Owner** | Maps to Admin privileges | Organization creator/owner |
| **Manager** | Can manage projects, recordings, tasks; limited org access | Team leads, project managers |
| **User** | Standard CRUD (no delete), no org/admin access | Regular team members |
| **Viewer** | Read-only across the board | Stakeholders, external reviewers |

---

## Permission Matrix

Legend: **C** = Create | **R** = Read | **U** = Update | **D** = Delete | **--** = No access

### Core Resources

| Resource | Action | Superadmin | Admin/Owner | Manager | User | Viewer |
|----------|--------|:----------:|:-----------:|:-------:|:----:|:------:|
| **Project** | Create | C | C | C | C | -- |
| | Read | R | R | R | R | R |
| | Update | U | U | U | U | -- |
| | Delete | D | D | D | -- | -- |
| **Recording** | Create | C | C | C | C | -- |
| | Read | R | R | R | R | R |
| | Update | U | U | U | U | -- |
| | Delete | D | D | D | -- | -- |
| **Task** | Create | C | C | C | C | -- |
| | Read | R | R | R | R | R |
| | Update | U | U | U | U | -- |
| | Delete | D | D | D | -- | -- |

### Organization & User Management

| Resource | Action | Superadmin | Admin/Owner | Manager | User | Viewer |
|----------|--------|:----------:|:-----------:|:-------:|:----:|:------:|
| **Organization** | Create | C | C | -- | -- | -- |
| | List | L | -- | -- | -- | -- |
| | Read | R | R | R | -- | -- |
| | Update | U | U | U | -- | -- |
| | Delete | D | D | -- | -- | -- |
| **User** | Create | C | C | -- | -- | -- |
| | Read | R | R | R | R | R |
| | Update | U | U | -- | -- | -- |
| | Delete | D | D | -- | -- | -- |
| **Team** | Create | C | C | -- | -- | -- |
| | Read | R | R | R | R | R |
| | Update | U | U | -- | -- | -- |
| | Delete | D | D | -- | -- | -- |
| **Invitation** | Create | Y | Y | Y | -- | -- |
| | Cancel | Y | Y | Y | -- | -- |

### Chat & Communication

| Resource | Action | Superadmin | Admin/Owner | Manager | User | Viewer |
|----------|--------|:----------:|:-----------:|:-------:|:----:|:------:|
| **Chat** | Project-level | Y | Y | Y | Y | Y |
| | Organization-level | Y | Y | -- | -- | -- |

### Administration & System

| Resource | Action | Superadmin | Admin/Owner | Manager | User | Viewer |
|----------|--------|:----------:|:-----------:|:-------:|:----:|:------:|
| **Superadmin Panel** | Access | Y | -- | -- | -- | -- |
| **Admin Panel** | Access | Y | Y | -- | -- | -- |
| **Audit Logs** | Read | Y | Y | -- | -- | -- |
| **Org Instructions** | Read | Y | Y | Y | Y | Y |
| | Write | Y | Y | -- | -- | -- |

### Settings & Integrations

| Resource | Action | Superadmin | Admin/Owner | Manager | User | Viewer |
|----------|--------|:----------:|:-----------:|:-------:|:----:|:------:|
| **Settings** | Read | Y | Y | Y | Y | Y |
| | Update | Y | Y | Y | Y | -- |
| **Integrations** | Manage | Y | Y | Y | -- | -- |
| **Deepgram** (live recording) | Token | Y | Y | Y | Y | Y |

### Onboarding

| Resource | Action | Superadmin | Admin/Owner | Manager | User | Viewer |
|----------|--------|:----------:|:-----------:|:-------:|:----:|:------:|
| **Onboarding** | Create | Y | Y | Y | Y | -- |
| | Read | Y | Y | Y | Y | -- |
| | Update | Y | Y | Y | Y | -- |
| | Complete | Y | Y | Y | Y | -- |

---

## Page-Level Access Controls

### Public Pages (No auth required)

| Page | Notes |
|------|-------|
| Sign In | `/sign-in` |
| Sign Up | `/sign-up` |
| Accept Invitation | `/accept-invitation/[id]` |
| Privacy Policy | `/privacy-policy` |
| Terms of Service | `/terms-of-service` |

### Authenticated Pages (Any role)

| Page | Additional Checks |
|------|-------------------|
| Dashboard | ProtectedPage wrapper |
| Projects List | ProtectedPage wrapper |
| Project Detail | ProtectedPage + org isolation |
| Recordings | ProtectedPage wrapper |
| Recording Detail | ProtectedPage + org isolation |
| Tasks | ProtectedPage wrapper |
| Meetings | ProtectedPage wrapper |
| Chat | ProtectedPage + role-based (project vs org) |
| Notifications | ProtectedPage wrapper |
| Profile Settings | ProtectedPage wrapper |
| Onboarding | ProtectedPage wrapper |

### Role-Restricted Pages

| Page | Minimum Role | Permission Check |
|------|-------------|------------------|
| Organization Settings | Admin/Owner | `isOrganizationAdmin()` |
| Agent Settings | User+ (with `setting:update`) | `checkPermission(setting.update)` |
| Bot Settings | User+ (with `setting:update`) | `checkPermission(setting.update)` |
| Integrations | Manager+ (with `integration:manage`) | `checkPermission(integration.manage)` |
| Team Settings | Team Manager | `canAccessTeam()` + `isTeamManager()` |
| Team Members | Team Manager | `canAccessTeam()` + `isTeamManager()` |

### Admin Pages

| Page | Minimum Role | Permission Check |
|------|-------------|------------------|
| Admin Layout (all admin pages) | Admin | `checkPermission(admin.all)` |
| Admin Dashboard | Admin | `checkPermission(admin.all)` |
| Admin Users | Admin | `checkPermission(admin.all)` |
| Admin Audit Logs | Admin | `checkPermission(audit-log.read)` |
| Admin Agent Analytics | Admin | `checkPermission(admin.all)` |
| Admin Agent Metrics | Admin | `checkPermission(admin.all)` |
| Admin Agent Config | Superadmin | `checkPermission(superadmin.all)` |
| Admin Organizations | Superadmin | `checkPermission(superadmin.all)` |
| Admin Organization Detail | Superadmin | `checkPermission(superadmin.all)` |
| Admin Create Organization | Superadmin | `checkPermission(organization.create)` |

---

## API Route Access Controls

### Authenticated Routes

| Route | Methods | Auth | RBAC | Additional |
|-------|---------|:----:|:----:|------------|
| `/api/chat` | POST | Y | Role-based | Kill switch, rate limit, moderation |
| `/api/chat/[projectId]` | POST, GET | Y | Role-based | Org isolation |
| `/api/chat/organization` | POST, GET | Y | `canAccessOrganizationChat()` | Admin/Owner/User/Manager only |
| `/api/transcribe/[id]` | POST | Y | `recording:update` | Rate limited, org isolation |
| `/api/transcribe/live` | GET | Y | `recording:create` | WebSocket endpoint |
| `/api/summarize/[id]` | POST | Y | `recording:update` | Rate limited, org isolation |
| `/api/summarize/[id]` | GET | Y | `recording:read` | Org isolation |
| `/api/extract-tasks/[id]` | POST | Y | `recording:update` | Rate limited, org isolation |
| `/api/recordings/upload` | POST | Y | Project access | Rate limited, HMAC signed |
| `/api/notifications/unread-count` | GET | Y | User-scoped | -- |
| `/api/documents/[id]/view` | GET | Y | Delegated to service | Org isolation |
| `/api/agent/knowledge-base` | GET, DELETE | Y | Agent enabled | Org isolation |
| `/api/agent/knowledge-base/reindex` | POST | Y | Agent enabled | Org isolation |
| `/api/integrations/google/*` | Various | Y | User context | OAuth flow |

### Admin Routes

| Route | Methods | Auth | RBAC |
|-------|---------|:----:|:----:|
| `/api/admin/agent/kill-switch` | GET, POST | Y | `superadmin` role |
| `/api/admin/agent/sbom` | GET | Y | `superadmin` role |

### Cron Routes (Bearer Token)

| Route | Auth Method |
|-------|-------------|
| `/api/cron/poll-bot-status` | `CRON_SECRET` bearer token |
| `/api/cron/agenda-check` | `CRON_SECRET` bearer token |
| `/api/cron/monitor-calendar` | `CRON_SECRET` bearer token |
| `/api/cron/renew-drive-watches` | `CRON_SECRET` bearer token |

### Webhook Routes (Signature Verification)

| Route | Verification Method |
|-------|---------------------|
| `/api/webhooks/recall` | HMAC signature verification |
| `/api/webhooks/google-drive` | Channel ID validation |

### Public Routes (Intentional)

| Route | Purpose |
|-------|---------|
| `/api/auth/[...all]` | Better Auth endpoints (sign-in, sign-up, etc.) |
| `/api/connection-pool/health` | Monitoring |
| `/api/qdrant/health` | Monitoring |

---

## Security Features

| Feature | Implementation |
|---------|---------------|
| **Multi-tenancy isolation** | `assertOrganizationAccess()` returns 404 (not 403) to prevent info leakage |
| **Rate limiting** | Tier-based (free/pro) on upload, transcribe, summarize, chat |
| **Audit logging** | Security violations logged with user context |
| **Webhook verification** | HMAC signatures for Recall.ai; channel ID for Google Drive |
| **OAuth security** | Redirect URLs validated to same-origin |
| **Session management** | Better Auth with org context, team context |
| **Permission enforcement** | Dual-layer: middleware (server actions) + route-level (API routes) |
