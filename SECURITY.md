# Security Guidelines

This document outlines comprehensive security guidelines and best practices for the Inovy application, ensuring compliance with NEN 7510, GDPR, BIO, and other relevant healthcare security standards.

## Table of Contents

- [Security Overview](#security-overview)
- [Authentication and Authorization](#authentication-and-authorization)
- [Data Protection](#data-protection)
- [Network Security](#network-security)
- [Application Security](#application-security)
- [Secure Development Practices](#secure-development-practices)
- [Incident Response](#incident-response)
- [Compliance and Audit](#compliance-and-audit)
- [Security Monitoring](#security-monitoring)

---

## Security Overview

### Security Architecture

Inovy implements defense-in-depth security with multiple layers:

```
┌─────────────────────────────────────────────────────────┐
│              Edge Network Layer                         │
│    (Vercel Edge, DDoS Protection, WAF)                  │
├─────────────────────────────────────────────────────────┤
│              Application Layer                          │
│    (Next.js, Authentication, Authorization)             │
├─────────────────────────────────────────────────────────┤
│                 API Layer                               │
│    (Rate Limiting, Input Validation, CORS)              │
├─────────────────────────────────────────────────────────┤
│              Service Layer                              │
│    (Business Logic, RBAC, Audit Logging)                │
├─────────────────────────────────────────────────────────┤
│            Data Access Layer                            │
│    (Parameterized Queries, Access Control)              │
├─────────────────────────────────────────────────────────┤
│              Storage Layer                              │
│    (Encrypted at Rest, Backup, Recovery)                │
└─────────────────────────────────────────────────────────┘
```

### Security Principles

1. **Defense in Depth**: Multiple security layers
2. **Least Privilege**: Minimal access rights by default
3. **Secure by Default**: Secure configuration out-of-the-box
4. **Zero Trust**: Verify all requests regardless of source
5. **Privacy by Design**: Data protection built into architecture
6. **Security Transparency**: Clear documentation and audit trails

---

## Authentication and Authorization

### Authentication Methods

Inovy supports multiple secure authentication methods via Better Auth:

#### 1. Email/Password Authentication

**Security Features:**
- Passwords hashed with Argon2id (memory-hard, OWASP recommended)
- Minimum password requirements enforced:
  - Length: 12+ characters recommended (8 minimum)
  - Complexity: Mix of uppercase, lowercase, numbers, symbols
  - Common password detection (HaveIBeenPwned API)
- Email verification required before account activation
- Account lockout after failed attempts (5 attempts, 15-minute lockout)
- Password reset with time-limited tokens (1-hour expiration)

**Configuration:**
```typescript
// Better Auth configuration
password: {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
}
```

**Best Practices:**
- Encourage passkey/MFA for additional security
- Implement password expiration for high-security accounts (90 days)
- Monitor for credential stuffing attacks
- Rate limit password attempts per IP

---

#### 2. OAuth Providers

**Supported Providers:**
- Google Workspace (OAuth 2.0)
- Microsoft 365 (Azure AD)

**Security Features:**
- State parameter for CSRF protection
- PKCE (Proof Key for Code Exchange) enabled
- Token stored encrypted in database
- Automatic token refresh
- Scope limitation (principle of least privilege)

**OAuth Security Guidelines:**

**Google OAuth:**
- Required scopes only:
  - `openid` - Basic authentication
  - `email` - User email
  - `profile` - User profile
  - `calendar` - Calendar access (optional, user consent required)
  - `gmail.compose` - Email drafts (optional, user consent required)
- Configure OAuth consent screen in Google Cloud Console
- Enable OAuth audit logging
- Review permissions quarterly
- Implement scope escalation (request additional scopes only when needed)

**Microsoft OAuth:**
- Required Graph API permissions:
  - `User.Read` - Basic profile
  - `Calendars.ReadWrite` - Calendar access (optional)
  - `Mail.Send` - Email sending (optional)
  - `offline_access` - Refresh tokens
- Configure in Azure AD App Registration
- Enable conditional access policies if available
- Monitor consent grants
- Use least-privilege permissions

---

#### 3. Magic Link Authentication

**Security Features:**
- One-time use tokens
- Time-limited validity (15 minutes)
- Cryptographically secure random tokens (32 bytes)
- Invalidation after use
- Rate limiting on magic link requests

**Best Practices:**
- Send via encrypted email (TLS)
- Include IP address and location in email
- Log all magic link generation and usage
- Alert user on suspicious requests

---

#### 4. Passkey/WebAuthn

**Security Features:**
- Phishing-resistant authentication
- Biometric or PIN-based verification
- Public key cryptography (no shared secrets)
- Device-bound credentials
- FIDO2/WebAuthn standard compliant

**Configuration:**
```typescript
passkey: {
  rpName: "Inovy",
  rpID: "yourdomain.com",
  timeout: 60000,
  userVerification: "required",
}
```

**Best Practices:**
- Encourage passkey adoption (most secure method)
- Allow multiple passkeys per user (backup devices)
- Provide fallback authentication method
- Test across browsers and devices

---

### Session Management

**Session Security:**
- Session tokens: Cryptographically secure random (32 bytes)
- Storage: Encrypted cookies (HTTPOnly, Secure, SameSite)
- Duration: 30 days with automatic extension
- Refresh tokens: Enabled with rotation
- Concurrent sessions: Limited to 5 per user
- Session invalidation: On logout, password change, or security events

**Cookie Configuration:**
```typescript
cookie: {
  httpOnly: true,        // Prevent XSS access
  secure: true,          // HTTPS only (production)
  sameSite: "lax",       // CSRF protection
  maxAge: 30 * 24 * 3600, // 30 days
  path: "/",
}
```

**Session Best Practices:**
- Regenerate session ID after authentication
- Implement absolute timeout (30 days)
- Implement idle timeout (24 hours)
- Log all session creation and termination
- Monitor for session hijacking attempts

---

### Role-Based Access Control (RBAC)

**Organization Roles:**

| Role | Permissions | Use Case |
|------|-------------|----------|
| Owner | Full control, billing, delete organization | Organization creator |
| Admin | Manage members, projects, settings | IT administrators |
| Manager | Create projects, manage team resources | Team leads |
| User | Create recordings, tasks, participate | Regular users |
| Viewer | Read-only access to assigned resources | Auditors, stakeholders |

**Permission Model:**

```typescript
{
  organizations: {
    create: ["owner"],
    read: ["owner", "admin", "manager", "user", "viewer"],
    update: ["owner", "admin"],
    delete: ["owner"],
  },
  projects: {
    create: ["owner", "admin", "manager"],
    read: ["owner", "admin", "manager", "user", "viewer"],
    update: ["owner", "admin", "manager"],
    delete: ["owner", "admin"],
  },
  recordings: {
    create: ["owner", "admin", "manager", "user"],
    read: ["owner", "admin", "manager", "user", "viewer"],
    update: ["owner", "admin", "manager", "user"],
    delete: ["owner", "admin", "manager"],
  },
}
```

**RBAC Implementation:**
- Policy-based access control
- Organization-level isolation (multi-tenancy)
- Project-level access control
- Resource ownership tracking
- Audit logging for all access decisions

**Best Practices:**
- Follow principle of least privilege
- Regular permission audits (quarterly)
- Remove unnecessary permissions promptly
- Implement separation of duties for critical operations
- Log all permission changes

---

### Admin Interface Security

**Access Control:**
- Separate admin route (`/admin`)
- Requires `superadmin` or `admin` role
- Additional authentication recommended (MFA)
- IP restrictions configurable via Vercel
- Time-based access (business hours only for high-security)

**Admin Security Features:**
- All admin actions audited
- Tamper-proof audit logs (hash chain)
- Session timeout: 1 hour (shorter than regular users)
- Re-authentication required for destructive operations
- Change approval workflow for critical settings

**Admin Security Checklist:**
- [ ] Admin access restricted to authorized personnel
- [ ] MFA enabled for all admin accounts
- [ ] Admin sessions have shorter timeout
- [ ] All admin actions logged with user ID, timestamp, action
- [ ] Regular review of admin access logs
- [ ] Separation of admin and user accounts (no shared accounts)

---

## Data Protection

### Data Encryption

#### Data at Rest

**Database Encryption:**
- PostgreSQL: Transparent Data Encryption (TDE) via Neon
- Encryption algorithm: AES-256
- Key management: Platform-managed (Neon)
- Backup encryption: Enabled by default

**File Storage Encryption:**
- Vercel Blob: AES-256 encryption at rest
- Key management: Platform-managed
- Access control: Token-based authentication
- Signed URLs for temporary access

**Redis Encryption:**
- Upstash: Encryption at rest enabled
- TLS for data in transit
- Token-based authentication

**Vector Database Encryption:**
- Qdrant Cloud: Encryption at rest available
- TLS for API connections
- API key authentication

---

#### Data in Transit

**TLS Configuration:**
- Minimum version: TLS 1.3 (TLS 1.2 acceptable, TLS 1.0/1.1 disabled)
- Cipher suites: Modern, strong ciphers only
- Perfect Forward Secrecy (PFS): Enabled
- Certificate: Automatic via Vercel (Let's Encrypt)
- HSTS: Enabled with 1-year max-age

**TLS Best Practices:**
- Enforce HTTPS for all connections
- HTTP automatically redirects to HTTPS
- No mixed content (all resources over HTTPS)
- Certificate pinning not required (Vercel manages certificates)
- Monitor certificate expiration (automated by Vercel)

---

### Data Classification

**Data Sensitivity Levels:**

| Level | Data Types | Protection Measures |
|-------|------------|---------------------|
| **Critical** | Authentication credentials, API keys, payment data | Encrypted at rest and in transit, strict access control, audit logging |
| **High** | Meeting recordings, transcriptions, personal data | Encrypted, RBAC, organization isolation, GDPR compliance |
| **Medium** | Projects, tasks, summaries, chat history | RBAC, organization isolation, audit logging |
| **Low** | Public user profiles, non-sensitive metadata | Basic access control |

**Data Handling Requirements:**

**Critical Data:**
- Never log in plain text
- Encrypt before storage
- Mask in UI and logs
- Strict access control
- Audit all access

**High Sensitivity Data:**
- GDPR compliance required
- Data minimization principle
- Right to erasure supported
- Data portability enabled
- Consent management

**Medium Sensitivity Data:**
- Standard access control
- Audit logging for modifications
- Backup and recovery procedures

---

### Data Retention and Disposal

**Retention Policies:**

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| Meeting recordings | User-defined (default: indefinite) | Secure deletion from Blob storage |
| Transcriptions | Tied to recording lifecycle | Database hard delete |
| User data | Active account + 30 days after deletion request | Cascade delete with verification |
| Audit logs | 1 year minimum (7 years for healthcare compliance) | Archival then secure deletion |
| Session data | 30 days + 7 days grace period | Automatic expiration |
| Cache data | TTL-based (minutes to hours) | Automatic eviction |

**GDPR Right to Erasure:**
- User can request data deletion via settings
- 30-day processing period
- All user data deleted from all systems
- Vector embeddings removed from Qdrant
- Confirmation email sent upon completion
- Audit log entry created (retained for compliance)

**Secure Deletion Procedures:**
- Database: Hard delete with verification
- Blob storage: Permanent deletion (not soft delete)
- Vector database: Delete by metadata filter
- Cache: Immediate invalidation
- Backups: Excluded from future backups (overwrite policy)

---

## Network Security

### HTTP Security Headers

**Required Headers (SSD-24 Compliance):**

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: [see detailed policy below]
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

**Content Security Policy (CSP):**

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data: https:;
font-src 'self' data:;
connect-src 'self' https://*.vercel.app https://*.qdrant.io;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

**CSP Rationale:**
- `default-src 'self'`: Only load resources from same origin
- `unsafe-inline`: Required for Tailwind CSS and React inline styles
- `unsafe-eval`: Required for some AI SDK features
- `frame-ancestors 'none'`: Prevent clickjacking (equivalent to X-Frame-Options: DENY)
- `upgrade-insecure-requests`: Automatically upgrade HTTP to HTTPS

**Header Testing:**
- Use [securityheaders.com](https://securityheaders.com) for validation
- Test CSP with browser developer tools
- Monitor CSP violation reports
- Gradually tighten policy over time

---

### CORS (Cross-Origin Resource Sharing)

**CORS Policy:**
- Default: Same-origin only
- API endpoints: Configured per endpoint
- Allowed origins: `NEXT_PUBLIC_APP_URL` only
- Credentials: Allowed for same-origin
- Preflight caching: 24 hours

**CORS Configuration Example:**

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};
```

**CORS Security Guidelines:**
- Never use `Access-Control-Allow-Origin: *` in production
- Validate Origin header in API routes
- Reject requests from unknown origins
- Log CORS violations for security monitoring
- Use credentials only when necessary

---

### Firewall and Network Rules

**Recommended Firewall Rules:**

**Inbound Rules:**
- Allow HTTPS (443) from all sources
- Allow HTTP (80) only for redirect to HTTPS
- Deny all other inbound traffic

**Outbound Rules:**
- Allow HTTPS (443) to known service endpoints:
  - PostgreSQL (Neon): `*.neon.tech:5432`
  - Redis (Upstash): `*.upstash.io:443`
  - Qdrant: `*.qdrant.io:443` or `*.qdrant.io:6333`
  - OpenAI API: `api.openai.com:443`
  - Deepgram API: `api.deepgram.com:443`
  - Vercel Blob: `*.vercel-storage.com:443`
  - Resend API: `api.resend.com:443`
- Deny all other outbound traffic

**IP Allowlisting (Optional):**
- Admin interface: Restrict to office/VPN IPs
- API endpoints: Consider allowlisting for B2B integrations
- Database: Enable IP restrictions in Neon (if static IPs available)
- Redis: Upstash supports IP restrictions

---

## Application Security

### Input Validation (SSD-22 Compliance)

**Validation Strategy:**
- **Server-side validation**: All input validated on server (never trust client)
- **Allowlist approach**: Define allowed values explicitly (not denylist)
- **Type safety**: TypeScript + Zod for runtime validation
- **Sanitization**: HTML and SQL injection prevention

**Validation Implementation:**

```typescript
// Example: Project creation validation
const createProjectSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  status: z.enum(["active", "archived", "completed"]), // Allowlist
  organizationId: z.string().uuid(),
});

// Server action with validation
export const createProject = actionClient
  .schema(createProjectSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Input automatically validated by Zod
    // Proceed with business logic
  });
```

**Input Validation Rules:**

| Input Type | Validation Rules | Sanitization |
|------------|------------------|--------------|
| Text fields | Length limits, regex patterns, trim | HTML escape, remove control characters |
| Emails | RFC 5322 format, domain validation | Lowercase, trim |
| URLs | Valid URL format, allowed protocols (https/http) | Remove query parameters if not needed |
| Enums | Allowlist of values | Type-safe enums |
| IDs | UUID v4 format | N/A (strict format) |
| File uploads | MIME type, size limit, extension | Virus scanning (if needed) |
| JSON payloads | Schema validation | Reject unknown properties |

**File Upload Security (SSD-22.1.05 Compliance):**
- Validate MIME type against file content (not just extension)
- Enforce file size limits (500MB max)
- Restrict allowed file types:
  - Audio: `audio/mpeg`, `audio/wav`, `audio/webm`, `audio/ogg`
  - Video: `video/mp4`, `video/webm`, `video/quicktime`
  - Documents: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- Generate random filenames (prevent path traversal)
- Scan files for malware in high-security deployments
- Store files in isolated storage (Vercel Blob)

**Implementation:**

```typescript
// File upload validation
const uploadSchema = z.object({
  file: z.instanceof(File)
    .refine(file => file.size <= 500 * 1024 * 1024, "File too large (500MB max)")
    .refine(file => ALLOWED_MIME_TYPES.includes(file.type), "Invalid file type"),
});
```

---

### SQL Injection Prevention (SSD-21 Compliance)

**Protection Mechanisms:**
- **Parameterized queries**: All queries use Drizzle ORM (never string concatenation)
- **ORM usage**: Type-safe query builder prevents SQL injection
- **Input validation**: All user input validated before queries
- **Least privilege**: Database user has minimal required permissions

**Safe Query Example:**

```typescript
// ✅ Safe: Parameterized query with Drizzle
const project = await db
  .select()
  .from(projects)
  .where(eq(projects.id, projectId))
  .limit(1);

// ❌ Unsafe: Never do this
const query = `SELECT * FROM projects WHERE id = '${projectId}'`;
```

**Database Security Configuration:**
- Database user permissions: SELECT, INSERT, UPDATE, DELETE only (no DROP, ALTER)
- Read-only user for reporting queries
- Prepared statements enabled (Drizzle default)
- Query timeout: 60 seconds maximum
- Statement logging: Enabled for audit

---

### Cross-Site Scripting (XSS) Prevention

**Protection Mechanisms:**
- **React automatic escaping**: All dynamic content escaped by default
- **Content Security Policy**: Restricts script sources
- **Input sanitization**: HTML tags removed from user input
- **Output encoding**: Context-aware encoding (HTML, JS, URL)
- **No `dangerouslySetInnerHTML`**: Avoided unless absolutely necessary

**XSS Prevention Checklist:**
- [ ] No user input directly rendered in HTML without escaping
- [ ] No `eval()` or `Function()` with user input
- [ ] No `dangerouslySetInnerHTML` with user content
- [ ] CSP configured to restrict inline scripts
- [ ] User-generated URLs validated and sanitized
- [ ] Rich text editor (TipTap) configured with safe defaults

**Rich Text Handling:**
```typescript
// TipTap configuration (safe defaults)
const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder,
    // No dangerous extensions (e.g., no raw HTML)
  ],
});
```

---

### Cross-Site Request Forgery (CSRF) Prevention

**Protection Mechanisms:**
- **SameSite cookies**: `SameSite=Lax` prevents CSRF
- **Better Auth protection**: Built-in CSRF tokens
- **State parameter**: Used in OAuth flows
- **Origin validation**: Verify Origin and Referer headers

**CSRF Protection in Forms:**
```typescript
// Better Auth automatically includes CSRF tokens
// No additional implementation needed for standard forms

// For API requests, verify origin:
const origin = request.headers.get('origin');
if (origin !== process.env.NEXT_PUBLIC_APP_URL) {
  return new Response('Forbidden', { status: 403 });
}
```

---

### Server-Side Request Forgery (SSRF) Prevention

**Protection Mechanisms:**
- **URL validation**: Validate all user-provided URLs
- **Allowlist domains**: Only allow known external services
- **No user-controlled URLs**: User cannot specify arbitrary URLs to fetch
- **Internal network isolation**: Serverless functions isolated from internal networks

**URL Validation Example:**

```typescript
const ALLOWED_DOMAINS = [
  'api.openai.com',
  'api.anthropic.com',
  'api.deepgram.com',
  // ... other allowed domains
];

function isAllowedUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}
```

---

### Path Traversal Prevention (SSD-23 Compliance)

**Protection Mechanisms:**
- **No user-controlled paths**: File paths are system-generated
- **Cloud storage**: Vercel Blob isolates files (no direct file system access)
- **Path validation**: Any file operations validate paths
- **Sandboxed access**: Serverless functions have restricted file system access

**Path Security Guidelines:**
- Generate filenames: Use UUIDs or secure random strings
- Validate paths: Canonicalize and check against allowed directories
- No symbolic links: Cloud storage doesn't support symlinks
- Restrict extensions: Allowlist of allowed file extensions
- Separate user content: Use separate storage buckets/folders per organization

**File Naming:**
```typescript
// Generate safe filename
const filename = `${nanoid()}-${sanitizeFilename(originalName)}`;
const path = `recordings/${organizationId}/${filename}`;
```

---

### API Security

#### API Authentication

**Authentication Methods:**
- Session cookies (primary, for web app)
- API keys (for programmatic access, future)
- OAuth tokens (for integration endpoints)

**Implementation:**
```typescript
// API route authentication
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Proceed with authenticated request
}
```

---

#### API Rate Limiting

**Rate Limit Configuration:**

| Endpoint Type | Free Tier | Pro Tier | Enterprise |
|---------------|-----------|----------|------------|
| Auth endpoints | 10/min | 20/min | 50/min |
| API routes | 100/hour | 1000/hour | Unlimited |
| Server actions | 100/hour | 1000/hour | Unlimited |
| AI processing | 10/hour | 100/hour | 500/hour |
| File uploads | 10/hour | 50/hour | 200/hour |

**Rate Limiting Implementation:**
- Storage: Upstash Redis
- Algorithm: Token bucket with sliding window
- Scope: Per user + per organization
- Response: `429 Too Many Requests` with `Retry-After` header
- Logging: All rate limit violations logged

**Rate Limit Bypass:**
- Authenticated admin requests
- Internal service-to-service calls
- Health check endpoints
- Webhook endpoints (separate rate limits)

---

#### API Versioning

**Current Version:** v1 (implicit)

**Future Versioning Strategy:**
- URL-based versioning: `/api/v2/...`
- Header-based versioning: `Accept: application/vnd.inovy.v2+json`
- Maintain backward compatibility for 1 major version
- Deprecation notices: 3 months minimum
- Documentation: Version-specific API docs

---

#### API Error Handling (SSD-27 Compliance)

**Error Response Format:**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": {} // Optional, never include sensitive data
  }
}
```

**Error Handling Principles:**
- **Generic messages to users**: No technical details exposed
- **Detailed logs server-side**: Full error context logged
- **No stack traces**: Never send stack traces to client
- **Error codes**: Use consistent error codes for client handling
- **Correlation IDs**: Include trace ID for debugging

**Error Logging:**
```typescript
// Log detailed error server-side
logger.error({
  error: err,
  userId: session?.user?.id,
  action: 'createProject',
  timestamp: new Date().toISOString(),
}, 'Project creation failed');

// Return generic error to client
return { error: 'Failed to create project. Please try again.' };
```

---

### Webhook Security

**Webhook Authentication:**
- Signature verification (HMAC-SHA256)
- Timestamp validation (prevent replay attacks)
- IP allowlisting (optional, for known services)
- Rate limiting per webhook source

**Webhook Implementation:**

```typescript
// Example: Stripe webhook verification
import { stripe } from '@/lib/stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  
  if (!signature) {
    return new Response('Missing signature', { status: 401 });
  }
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    // Process verified webhook event
  } catch (err) {
    return new Response('Invalid signature', { status: 401 });
  }
}
```

**Webhook Security Checklist:**
- [ ] Signature verification implemented
- [ ] HTTPS endpoint only
- [ ] Rate limiting configured
- [ ] Idempotency handling (duplicate events)
- [ ] Timeout configured (30 seconds max)
- [ ] Retry logic for failures
- [ ] Monitoring and alerting enabled

---

## Secure Development Practices

### Code Security

#### Dependency Security

**Dependency Management:**
- Use `pnpm` with lockfile (`pnpm-lock.yaml`)
- Audit dependencies regularly: `pnpm audit`
- Update dependencies promptly for security patches
- Use Dependabot for automated security updates
- Review dependencies before adding (license, maintenance, security history)

**Security Scanning:**
```bash
# Check for known vulnerabilities
pnpm audit

# Fix automatically where possible
pnpm audit --fix

# Check for outdated packages
pnpm outdated
```

**Dependency Security Checklist:**
- [ ] All dependencies from trusted sources (npm registry)
- [ ] No deprecated packages in use
- [ ] Regular security audits (weekly automated, monthly manual)
- [ ] Lock file committed to version control
- [ ] Dependency versions pinned (not using `^` or `~` for critical packages)

---

#### Secrets Management

**Secrets Handling:**
- **Never commit secrets** to version control
- **Use environment variables** for all secrets
- **Encrypt secrets** at rest in deployment platform
- **Rotate secrets** regularly (quarterly or on compromise)
- **Audit secret access** (who accessed what, when)

**`.gitignore` Configuration:**
```gitignore
# Environment files
.env
.env*.local
.env.development.local
.env.production.local

# Secrets and credentials
*.key
*.pem
secrets/
```

**Secret Detection:**
- Use git hooks to prevent committing secrets
- Implement pre-commit secret scanning (e.g., detect-secrets, GitGuardian)
- Scan repository history for leaked secrets
- Revoke and rotate immediately if secret found in commit history

---

#### Secure Coding Guidelines

**General Principles:**
1. **Input Validation**: Validate all input from users and external systems
2. **Output Encoding**: Encode output based on context (HTML, JS, SQL, URL)
3. **Error Handling**: Use neverthrow for type-safe error handling
4. **Logging**: Never log sensitive data (passwords, tokens, PII)
5. **Comments**: No sensitive information in code comments (SSD-28 compliance)

**Code Review Checklist:**
- [ ] All user input validated
- [ ] No hardcoded credentials or secrets
- [ ] Error messages don't leak sensitive information
- [ ] Logging doesn't include PII or secrets
- [ ] SQL queries use parameterization
- [ ] Authentication and authorization checked
- [ ] Rate limiting implemented
- [ ] Input size limits enforced

---

### Authentication Implementation

**Session Handling:**

```typescript
// Get session in Server Component
import { auth } from "@/lib/auth/auth";

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  
  if (!session?.user) {
    redirect("/sign-in");
  }
  
  // Proceed with authenticated user
}
```

**Authorization Checks:**

```typescript
// Check user permissions
import { requireAuth } from "@/lib/auth/require-auth";
import { can } from "@/lib/rbac/policies";

const session = await requireAuth();

if (!can(session.user, "project.create", { organizationId })) {
  throw new UnauthorizedError("Insufficient permissions");
}
```

**Security Guidelines:**
- Check authentication on every request
- Verify authorization before data access
- Use organization context for multi-tenancy
- Log all access control decisions
- Implement defense in depth (check at multiple layers)

---

### Data Access Security (SSD-15 Compliance)

**Architecture Separation:**
- **Presentation Layer**: React Server Components, Client Components
- **Application Layer**: Server Actions, API Routes
- **Data Layer**: Query classes, Drizzle ORM

**Data Access Rules:**
- **No client-side database access**: Never expose database credentials to client
- **No direct queries in components**: Use data access layer
- **Organization isolation**: All queries filtered by organization ID
- **Audit logging**: Log all data access

**Secure Data Access Pattern:**

```typescript
// ✅ Correct: Data access through query class
import { ProjectQueries } from "@/server/data-access/projects.queries";

const projects = await ProjectQueries.getProjectsByOrganization(organizationId);

// ❌ Incorrect: Direct database access in component
import { db } from "@/server/db";
const projects = await db.select().from(projectsTable); // Missing org filter!
```

**Organization Isolation:**
```typescript
// All queries must include organization filter
const projects = await db
  .select()
  .from(projectsTable)
  .where(
    and(
      eq(projectsTable.organizationId, organizationId),
      // ... other conditions
    )
  );
```

---

## Security Monitoring

### Logging and Audit

**Logging Strategy:**
- **Structured logging**: JSON format with Pino
- **Log levels**: DEBUG, INFO, WARN, ERROR
- **Production level**: INFO (WARNING in high-security mode)
- **Sensitive data**: Never logged (masked or excluded)

**Audit Events:**

| Event Type | Logged Information | Retention |
|------------|-------------------|-----------|
| Authentication | User ID, method, IP, timestamp, success/failure | 1 year |
| Authorization | User ID, resource, action, decision, timestamp | 1 year |
| Data access | User ID, resource type, operation, timestamp | 1 year |
| Admin actions | Admin ID, action, target, before/after state | 7 years |
| Security events | Event type, severity, details, timestamp | 7 years |
| Configuration changes | User ID, config key, old/new value, timestamp | 7 years |

**Audit Log Implementation:**

```typescript
// Audit log entry
await auditLog.create({
  userId: session.user.id,
  organizationId: session.user.organizationId,
  action: "project.delete",
  resourceType: "project",
  resourceId: projectId,
  metadata: { projectName: project.name },
  ipAddress: request.ip,
  userAgent: request.headers.get("user-agent"),
  timestamp: new Date(),
});
```

**Log Security:**
- Tamper-proof logging with hash chains
- Centralized log storage (Vercel Logs)
- Access restricted to authorized personnel
- Regular log reviews (weekly for critical events)
- Automated anomaly detection

---

### Security Monitoring

**Monitoring Checklist:**

**Authentication Monitoring:**
- [ ] Failed login attempts (alert on 5+ failures in 5 minutes)
- [ ] Successful logins from new locations/devices
- [ ] Multiple concurrent sessions
- [ ] Password reset requests
- [ ] MFA disable attempts

**Authorization Monitoring:**
- [ ] Access denied events (alert on repeated denials)
- [ ] Permission escalation attempts
- [ ] Cross-organization access attempts
- [ ] Admin action anomalies

**Application Monitoring:**
- [ ] Error rates by endpoint
- [ ] Response time degradation
- [ ] Rate limit violations (alert on abuse patterns)
- [ ] Unusual API usage patterns
- [ ] Large file uploads

**Infrastructure Monitoring:**
- [ ] Database connection issues
- [ ] Redis cache misses (high miss rate)
- [ ] External API failures
- [ ] Certificate expiration (automated by Vercel)
- [ ] Resource usage (CPU, memory, storage)

**Alerting Thresholds:**
- Critical: Immediate alert (PagerDuty, phone)
- High: Alert within 15 minutes (Slack, email)
- Medium: Daily digest
- Low: Weekly report

---

### Anomaly Detection

**Behavioral Analysis:**
- Baseline user behavior patterns
- Detect anomalies:
  - Unusual login times
  - Abnormal data access volumes
  - Unexpected API usage
  - Geographic anomalies (travel impossible between requests)
- Machine learning for pattern recognition (future enhancement)

**Automated Responses:**
- Temporary account lock on suspicious activity
- Additional authentication challenge
- Alert security team
- Log event for investigation

---

## Incident Response

### Incident Response Plan

**Preparation:**
1. **Incident Response Team**: Define roles and responsibilities
2. **Communication Plan**: Contact list, escalation procedures
3. **Tools and Access**: Ensure team has necessary access
4. **Runbooks**: Document common incident procedures

**Detection:**
1. **Monitoring Alerts**: Automated detection via monitoring
2. **User Reports**: Users report suspicious activity
3. **Security Scans**: Regular vulnerability scans
4. **Log Analysis**: Regular log reviews

**Containment:**
1. **Isolate affected systems**: Disable compromised accounts, revoke tokens
2. **Preserve evidence**: Take snapshots, preserve logs
3. **Assess scope**: Determine extent of compromise
4. **Notify stakeholders**: Internal team, affected users (if required)

**Eradication:**
1. **Remove threat**: Delete malicious code, close vulnerabilities
2. **Change credentials**: Rotate all potentially compromised secrets
3. **Patch vulnerabilities**: Apply security updates
4. **Verify clean state**: Scan for remaining threats

**Recovery:**
1. **Restore services**: Bring systems back online
2. **Verify integrity**: Confirm systems are secure
3. **Monitor closely**: Enhanced monitoring for 48 hours
4. **Communicate**: Update stakeholders on resolution

**Post-Incident:**
1. **Document incident**: Full incident report
2. **Root cause analysis**: Identify how breach occurred
3. **Update procedures**: Improve security based on lessons learned
4. **Training**: Share learnings with team

---

### Security Incident Types

**Incident Classification:**

| Severity | Examples | Response Time |
|----------|----------|---------------|
| **Critical** | Data breach, unauthorized admin access, ransomware | Immediate (< 15 min) |
| **High** | SQL injection attempt, XSS exploit, DDoS | < 1 hour |
| **Medium** | Account takeover, brute force attempts | < 4 hours |
| **Low** | Minor config issues, failed login spikes | < 24 hours |

**Notification Requirements:**
- **Critical/High**: Notify CISO and management immediately
- **Data breach**: GDPR requires notification within 72 hours
- **Healthcare data**: NEN 7510 requires immediate notification
- **User notification**: Required if personal data compromised

---

### Security Contacts

**Internal Contacts:**
- Security Team: [security@yourdomain.com](mailto:security@yourdomain.com)
- On-Call Engineer: [See PagerDuty schedule]
- Management: [management@yourdomain.com](mailto:management@yourdomain.com)

**External Contacts:**
- Hosting Provider (Vercel): [Vercel Support](https://vercel.com/support)
- Database Provider (Neon): [Neon Support](https://neon.tech/docs/introduction/support)
- DPO (Data Protection Officer): [dpo@yourdomain.com](mailto:dpo@yourdomain.com)
- Dutch Data Protection Authority: [autoriteitpersoonsgegevens.nl](https://autoriteitpersoonsgegevens.nl)

---

## Compliance and Audit

### Regulatory Compliance

#### GDPR (General Data Protection Regulation)

**Compliance Measures:**
- **Lawful basis**: Consent and legitimate interest documented
- **Data minimization**: Collect only necessary data
- **Purpose limitation**: Use data only for stated purposes
- **Storage limitation**: Retention policies implemented
- **Data subject rights**: Tools for access, rectification, erasure
- **Data Protection Impact Assessment (DPIA)**: Completed for high-risk processing
- **Privacy by design**: Built into architecture
- **Privacy by default**: Secure settings out-of-the-box

**User Rights Implementation:**
- Right to access: Data export in JSON format
- Right to rectification: User settings page
- Right to erasure: Account deletion with 30-day processing
- Right to data portability: Data export in machine-readable format
- Right to object: Opt-out of certain processing

---

#### NEN 7510 (Healthcare Information Security)

**Compliance Measures:**
- **Access control**: RBAC with organization isolation
- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Audit logging**: Comprehensive audit trail (7-year retention)
- **Incident management**: Documented procedures
- **Risk assessment**: Regular security assessments
- **Business continuity**: Backup and recovery procedures

**NEN 7510 Specific Requirements:**
- Medical data classification: Implement if processing medical data
- Access logging: All access to sensitive data logged
- Session timeout: 15 minutes idle timeout for high-security mode
- Strong authentication: Passkey/MFA recommended for healthcare users
- Data segregation: Organization-level isolation ensures data separation

---

#### BIO (Baseline Information Security Government)

**Compliance Measures:**
- **Security baseline**: Documented minimum security requirements
- **Configuration hardening**: Secure defaults applied
- **Patch management**: Regular updates (automated via Dependabot)
- **Access control**: Role-based with audit trails
- **Cryptography**: Modern algorithms (AES-256, TLS 1.3)
- **Monitoring**: Continuous security monitoring
- **Awareness**: Security training for development team

**BIO Control Mapping:**
- Identification and authentication: Better Auth with MFA
- Access control: RBAC with organization isolation
- Encryption: At rest and in transit
- Logging and monitoring: Comprehensive audit logging
- Physical security: Managed by Vercel (SOC 2 compliant)

---

### Security Certifications

**Platform Certifications (Vercel):**
- SOC 2 Type II
- ISO 27001
- GDPR compliant
- CCPA compliant

**Service Provider Certifications:**
- **Neon (Database)**: SOC 2, ISO 27001
- **Upstash (Redis)**: SOC 2, GDPR compliant
- **Qdrant (Vector DB)**: Cloud infrastructure security
- **OpenAI**: SOC 2, ISO 27001
- **Deepgram**: SOC 2, GDPR compliant
- **Vercel Blob**: Same as Vercel platform

**Third-Party Assessments:**
- Annual security audit (recommended)
- Penetration testing (annual)
- Vulnerability scanning (continuous)
- Code review by security experts

---

### Security Audit Procedures

**Regular Audits:**

| Audit Type | Frequency | Scope |
|------------|-----------|-------|
| Configuration audit | Quarterly | All environment variables, headers, settings |
| Access control audit | Quarterly | User roles, permissions, admin access |
| Code security audit | Per release | New code, dependency changes |
| Infrastructure audit | Semi-annual | Network, firewall, certificates |
| Penetration testing | Annual | Full application, API endpoints |
| Compliance audit | Annual | GDPR, NEN 7510, BIO requirements |

**Audit Checklist:**
- [ ] Review all user accounts and roles
- [ ] Verify authentication methods configured correctly
- [ ] Check encryption settings (at rest and in transit)
- [ ] Review audit logs for anomalies
- [ ] Verify backup and recovery procedures
- [ ] Test incident response procedures
- [ ] Review and update security documentation
- [ ] Check compliance with regulatory requirements

---

## Security Testing

### Automated Security Testing

**CI/CD Security Checks:**

```yaml
# .github/workflows/security.yml (example)
name: Security Checks

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Dependency Audit
        run: pnpm audit
      
      - name: Static Analysis
        run: pnpm lint
      
      - name: Type Check
        run: pnpm typecheck
      
      - name: Secret Scan
        uses: trufflesecurity/trufflehog@main
```

**Security Testing Tools:**
- **SAST** (Static Application Security Testing): ESLint security rules
- **Dependency scanning**: `pnpm audit`, Dependabot
- **Secret detection**: TruffleHog, detect-secrets
- **Container scanning**: Snyk (if using Docker)

---

### Manual Security Testing

**Penetration Testing Scope:**
1. **Authentication**: Test bypass, brute force, session hijacking
2. **Authorization**: Test privilege escalation, access control bypass
3. **Input validation**: SQL injection, XSS, command injection
4. **Session management**: Session fixation, CSRF
5. **Business logic**: Workflow bypass, race conditions
6. **API security**: Mass assignment, insecure endpoints
7. **File upload**: Malicious files, path traversal
8. **Information disclosure**: Error messages, comments, debug info

**Testing Tools:**
- Burp Suite (web application testing)
- OWASP ZAP (automated scanning)
- SQLMap (SQL injection testing)
- Nikto (web server scanning)

**Test Frequency:**
- Automated scans: Daily (CI/CD)
- Manual testing: Before major releases
- Penetration testing: Annual (by third-party)

---

## Security Best Practices Summary

### Development Phase

1. **Secure Coding**
   - Follow OWASP Top 10 guidelines
   - Use TypeScript for type safety
   - Implement input validation everywhere
   - Use parameterized queries (Drizzle ORM)
   - Avoid dangerous functions (`eval`, `innerHTML`)

2. **Code Review**
   - Security-focused code reviews
   - Use automated tools (ESLint security rules)
   - Check for hardcoded secrets
   - Verify authentication and authorization

3. **Testing**
   - Unit tests for security functions
   - Integration tests for authentication flows
   - End-to-end tests for critical workflows
   - Security regression tests

---

### Deployment Phase

1. **Pre-Deployment**
   - Run security scans (SAST, dependency audit)
   - Validate configuration (automated script)
   - Test in staging environment
   - Review deployment checklist

2. **Deployment**
   - Use CI/CD pipeline (GitHub Actions)
   - Blue-green deployment (Vercel automatic)
   - Smoke tests post-deployment
   - Monitor for errors

3. **Post-Deployment**
   - Verify security headers
   - Test authentication flows
   - Check monitoring and alerting
   - Review initial logs for issues

---

### Operational Phase

1. **Monitoring**
   - Continuous security monitoring
   - Real-time alerting
   - Log analysis for threats
   - Performance monitoring

2. **Maintenance**
   - Regular dependency updates
   - Patch security vulnerabilities promptly
   - Secret rotation (quarterly)
   - Certificate renewal (automated)

3. **Incident Response**
   - 24/7 incident response capability
   - Follow incident response plan
   - Document all incidents
   - Learn and improve

---

## Security Resources

### Internal Resources
- [CONFIGURATION.md](./CONFIGURATION.md) - Configuration guidelines
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment procedures
- [README.md](./README.md) - General documentation

### External Resources

**Security Standards:**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [CWE Top 25](https://cwe.mitre.org/top25/)

**Compliance:**
- [GDPR Official Text](https://gdpr-info.eu/)
- [NEN 7510](https://www.nen.nl/en/nen-7510-2017-nl-250258) (Healthcare Information Security)
- [BIO](https://www.bio-overheid.nl/) (Dutch Government Baseline Information Security)

**Framework Documentation:**
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Better Auth Security](https://www.better-auth.com/docs/security)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)

**Security Tools:**
- [Security Headers Checker](https://securityheaders.com/)
- [SSL Labs](https://www.ssllabs.com/ssltest/)
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

---

## Security Contact

**Report Security Vulnerabilities:**
- Email: [security@yourdomain.com](mailto:security@yourdomain.com)
- Subject line: "SECURITY: [Brief description]"
- Expected response: Within 24 hours
- Responsible disclosure policy: 90 days

**Bug Bounty Program:**
- Status: To be determined
- Scope: Production environment only
- Rules: Responsible disclosure, no disruption
- Rewards: Based on severity and impact

---

## Document Maintenance

**Review Schedule:**
- **Security guidelines**: Quarterly review
- **Compliance requirements**: Annual review (or when regulations change)
- **Incident procedures**: After each incident, minimum annual
- **Security controls**: Semi-annual assessment

**Change Management:**
- Document changes in git commit messages
- Major changes require security team approval
- Communicate changes to development team
- Update related documentation (CONFIGURATION.md, DEPLOYMENT.md)

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-24  
**Next Review:** 2026-05-24  
**Owner:** Security Team  
**Compliance:** SSD-4, NEN 7510, GDPR, BIO
