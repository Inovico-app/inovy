# SSD Configuration Guide

**Document ID**: SEC-CONFIG-001
**Version**: 1.0
**Date**: 2026-03-13
**Classification**: Internal
**Owner**: Information Security Manager (ISM)
**Review Cycle**: Annual or upon significant change

## 1. Purpose

This document provides the security configuration guidelines required by the SSD (Secure Software Development) norms for the Inovy web application. It covers areas not addressed by existing ISO 27001 policies and serves as the software maker's configuration description for deployment and hosting parties.

## 2. Scope

This guide covers the Inovy web application (`apps/web`) deployed on Vercel (production) and Azure Container Apps (alternative). It addresses SSD norms: 1.2.01, 1.3.05, 13.1.01, 13.1.02, 15.1.03, 20.1.02, 22.1.04, 23.1.03, 24.1.01-1.03, 26.1.02, 27.1.02, 29.1.03, 31.1.03.

---

## 3. Application Architecture and Zone Placement (SSD-15.1.03)

### 3.1 Zone Architecture

The application follows a three-tier architecture deployed across separate security zones:

| Zone                                                            | Components                                                                 | Security Controls                                                           |
| --------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Edge / CDN** (Vercel Edge Network)                            | Static assets, middleware, TLS termination                                 | HSTS, CSP headers, DDoS protection, WAF                                     |
| **Application Zone** (Vercel Serverless / Azure Container Apps) | Next.js server, API routes, server actions, session management             | Authentication, authorization (RBAC), rate limiting, input validation       |
| **Data Zone** (Managed services, private network)               | PostgreSQL (Neon/Azure), Redis (Upstash/Azure), Qdrant, Azure Blob Storage | SSL/TLS required, connection pooling, network isolation, encryption at rest |

### 3.2 Data Flow

```
Client (Browser)
  │
  │ HTTPS (TLS 1.2+, HSTS enforced)
  ▼
Edge / CDN Layer
  │ Security headers injected (CSP, X-Frame-Options, COOP, CORP)
  │ Rate limiting (token bucket)
  ▼
Application Layer (Serverless)
  │ Authentication (Better Auth)
  │ Authorization (RBAC, organization isolation)
  │ Input validation (Zod schemas)
  │ Audit logging (Pino + PostgreSQL)
  ▼
Data Layer (Managed Services)
  │ SSL required on all connections
  │ Parameterized queries (Drizzle ORM)
  │ Encryption at rest (AES-256-GCM)
  └ Network isolation (private endpoints)
```

### 3.3 Separation Enforcement

- **Presentation layer**: React components in `src/app/` and `src/features/*/components/`. Client bundles exclude server-only code via `server-only` imports and Next.js RSC architecture.
- **Application logic**: Server actions in `src/features/*/actions/`, services in `src/server/services/`. All business logic executes server-side only.
- **Data layer**: Drizzle ORM queries in `src/server/data-access/` (47 query files). Database schemas in `src/server/db/schema/`. No direct database access from client code.

---

## 4. Required Protocols, Services, and Accounts (SSD-1.2.01)

### 4.1 Required Protocols

| Protocol         | Purpose                         | Minimum Version             | Configuration                                          |
| ---------------- | ------------------------------- | --------------------------- | ------------------------------------------------------ |
| HTTPS/TLS        | All client-server communication | TLS 1.2 (TLS 1.3 preferred) | HSTS enforced, `max-age=31536000; includeSubDomains`   |
| PostgreSQL (SSL) | Database connections            | PostgreSQL 15+              | `sslmode=require` on all connection strings            |
| Redis (TLS)      | Rate limiting, session cache    | Redis 7+                    | TLS connection via Upstash/Azure Redis                 |
| HTTPS            | Third-party API communication   | TLS 1.2                     | OpenAI, Deepgram, Anthropic, Stripe, Resend, Recall.ai |
| WSS              | WebSocket (Deepgram streaming)  | TLS 1.2                     | `wss://*.deepgram.com`                                 |
| SMTP/TLS         | Email delivery                  | TLS 1.2                     | Via Resend API (HTTPS)                                 |

### 4.2 Required Services

| Service            | Purpose                         | Required | Configuration Reference                              |
| ------------------ | ------------------------------- | -------- | ---------------------------------------------------- |
| Neon PostgreSQL    | Primary database                | Yes      | `DATABASE_URL` environment variable                  |
| Upstash Redis      | Rate limiting, account lockout  | Yes      | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
| Qdrant             | Vector database for AI features | Yes      | `QDRANT_URL`, `QDRANT_API_KEY`                       |
| Azure Blob Storage | Recording file storage          | Yes      | `AZURE_STORAGE_*` environment variables              |
| Resend             | Transactional email             | Yes      | `RESEND_API_KEY`                                     |
| OpenAI             | AI processing                   | Yes      | `OPENAI_API_KEY`                                     |
| Deepgram           | Speech-to-text                  | Yes      | `DEEPGRAM_API_KEY`                                   |
| Stripe             | Payment processing              | Optional | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`         |
| Recall.ai          | Meeting bot                     | Optional | `RECALL_API_KEY`, `RECALL_WEBHOOK_SECRET`            |

### 4.3 Required Service Accounts

| Account       | Purpose                                     | Permissions Required                        |
| ------------- | ------------------------------------------- | ------------------------------------------- |
| Database user | Application database access                 | Read/write on application tables only       |
| Redis client  | Rate limiting, cache                        | Key read/write with TTL                     |
| Blob storage  | Recording file upload/download              | Container-scoped read/write                 |
| Cron service  | Scheduled jobs (data retention, monitoring) | Bearer token authentication (`CRON_SECRET`) |

No administrative or root-level accounts are required by the application.

---

## 5. HTTP Security Headers Configuration (SSD-24.1.01, 24.1.02, 24.1.03)

### 5.1 Application Headers (set by Next.js in `next.config.ts`)

| Header                         | Value                                          | Purpose                                        |
| ------------------------------ | ---------------------------------------------- | ---------------------------------------------- |
| `Content-Security-Policy`      | See Section 5.2                                | Prevent XSS, clickjacking                      |
| `Strict-Transport-Security`    | `max-age=31536000; includeSubDomains`          | Force HTTPS                                    |
| `X-Content-Type-Options`       | `nosniff`                                      | Prevent MIME sniffing                          |
| `X-Frame-Options`              | `DENY`                                         | Prevent framing (clickjacking)                 |
| `X-XSS-Protection`             | `0`                                            | Disable legacy XSS filter (CSP is replacement) |
| `Referrer-Policy`              | `strict-origin-when-cross-origin`              | Limit referrer leakage                         |
| `Permissions-Policy`           | `geolocation=(), microphone=(self), camera=()` | Restrict browser features                      |
| `Cross-Origin-Opener-Policy`   | `same-origin`                                  | Cross-origin isolation                         |
| `Cross-Origin-Resource-Policy` | `same-origin`                                  | Cross-origin isolation                         |

### 5.2 Content Security Policy Details

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:;
font-src 'self' data:;
connect-src 'self' [trusted API domains];
media-src 'self' blob: https://*.blob.core.windows.net;
frame-ancestors 'none';
base-uri 'self';
form-action 'self'
```

### 5.3 Documented Deviations from Strict Configuration

| Deviation                         | Reason                                                                       | Compensating Control                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `'unsafe-inline'` in `script-src` | Required by Next.js runtime for inline script injection during SSR/hydration | CSP `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'` restrict attack surface |
| `'unsafe-eval'` in `script-src`   | Required by Next.js development and some runtime evaluations                 | Production builds are pre-compiled; CSP `default-src 'self'` limits scope                     |
| `'unsafe-inline'` in `style-src`  | Required by Tailwind CSS runtime style injection and React component styling | No user-generated CSS; all styles from trusted source code                                    |

**Risk acceptance**: These deviations are accepted by the ISM as necessary for Next.js framework operation. The comprehensive CSP policy with `default-src 'self'`, `frame-ancestors 'none'`, and `base-uri 'self'` provides sufficient protection against XSS vectors that `unsafe-inline` would otherwise enable.

### 5.4 Cache Control Headers

| Route Pattern                             | Cache-Control                                           | Purpose                                    |
| ----------------------------------------- | ------------------------------------------------------- | ------------------------------------------ |
| Auth pages (`/sign-in`, `/sign-up`, etc.) | `no-store, no-cache, must-revalidate, proxy-revalidate` | Prevent caching of authentication forms    |
| API routes (`/api/*`)                     | `no-store, no-cache, must-revalidate`                   | Prevent caching of sensitive API responses |

### 5.5 Headers NOT Sent

The following headers are explicitly suppressed:

- `X-Powered-By`: Disabled via `poweredByHeader: false` (prevents server technology disclosure)
- `Server`: Not set by application (platform-managed)

---

## 6. HTTP Methods Configuration (SSD-26.1.02)

### 6.1 Allowed Methods

| Scope             | Methods                  | Configuration               |
| ----------------- | ------------------------ | --------------------------- |
| CORS (API routes) | `GET`, `POST`, `OPTIONS` | `src/proxy.ts` line 44      |
| Auth API          | `GET`, `POST`            | Better Auth handler exports |
| Health check      | `GET` only               | Route exports only `GET`    |
| Recording upload  | `POST` only              | Route exports only `POST`   |
| Webhook endpoints | `POST` only              | Route exports only `POST`   |
| Cron endpoints    | `GET` only               | Route exports only `GET`    |

### 6.2 Method Restriction Mechanism

Next.js App Router only responds to HTTP methods that are explicitly exported from route files. Methods not exported return 405 Method Not Allowed automatically.

### 6.3 Deviations

No HTTP methods beyond `GET`, `POST`, and `OPTIONS` are used. `DELETE` and `PATCH` operations are implemented via server actions (which use `POST` internally), not as separate HTTP methods.

---

## 7. Error Display Configuration (SSD-27.1.02)

### 7.1 Error Handling Strategy

| Environment     | Error Detail Level                             | Implementation                                                   |
| --------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| **Production**  | Generic messages only ("Something went wrong") | `global-error.tsx`: error message hidden behind `NODE_ENV` check |
| **Development** | Full error messages, stack traces              | Detailed errors shown for debugging                              |

### 7.2 API Error Responses

All server action errors are processed through `action-errors.ts`:

- Internal errors return generic message: "An unexpected error occurred"
- Validation errors return field-specific messages without technical details
- Authentication errors return "Invalid email or password" (no username enumeration)
- Authorization errors return 404 (not 403) to prevent information leakage

### 7.3 Web Server / Platform Configuration

- **Vercel**: Returns generic 500 pages for unhandled errors. Custom error pages configured in Next.js.
- **Azure Container Apps**: Container health checks via `/api/health`. Failed containers are restarted automatically.
- The hosting party must NOT enable detailed error pages or debug modes in production.

---

## 8. Output Sanitization Controls (SSD-20.1.02)

### 8.1 Application-Level Controls

| Control             | Implementation                                            | File Reference                                          |
| ------------------- | --------------------------------------------------------- | ------------------------------------------------------- |
| React auto-escaping | All JSX output is automatically escaped by React          | Framework default                                       |
| DOMPurify           | Used for rendering user-provided HTML (task descriptions) | `src/features/tasks/components/task-card-with-edit.tsx` |
| CSP headers         | `script-src` and `style-src` policies prevent injection   | `next.config.ts`                                        |
| PII redaction       | Automatic PII detection and redaction in transcriptions   | `src/server/services/pii-detection.service.ts`          |

### 8.2 Web Server Controls

The hosting party should ensure:

- No additional script injection in response pages (e.g., analytics scripts must comply with CSP)
- Response compression (gzip/brotli) does not interfere with security headers
- No server-side includes (SSI) are enabled

---

## 9. Input Validation and Rejection (SSD-22.1.04)

### 9.1 Application-Level Input Validation

All user input is validated server-side using Zod schemas via next-safe-action:

- 137 validation schema files in `src/server/validation/`
- Body size limit: 500MB (`next.config.ts` `serverActions.bodySizeLimit`)

### 9.2 Web Server Configuration Requirements

The hosting party should configure:

- **Request body size limit**: Maximum 500MB (for recording uploads). All other routes should be limited to platform defaults (typically 1-4MB).
- **Request timeout**: 60 seconds for standard routes, up to 300 seconds for upload routes
- **Rate limiting**: Application-level rate limiting is implemented; platform-level rate limiting is a recommended additional layer

---

## 10. File Upload Controls (SSD-23.1.03)

### 10.1 Upload Restrictions

| Control            | Value                                                                                                         | Configuration                                          |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Allowed MIME types | `audio/mpeg`, `audio/mp4`, `audio/wav`, `audio/x-wav`, `audio/webm`, `video/webm`, `video/mp4`, `audio/x-m4a` | `src/server/validation/recordings/upload-recording.ts` |
| Maximum file size  | 500 MB                                                                                                        | `MAX_FILE_SIZE` constant                               |
| Authentication     | Required (signed token with HMAC-SHA256, timing-safe comparison)                                              | Upload route handler                                   |
| Storage            | Azure Blob Storage or Vercel Blob (based on deployment)                                                       | Environment configuration                              |

### 10.2 Web Server Configuration

- The hosting party must not allow file uploads to paths outside the designated upload endpoint (`/api/recordings/upload`)
- Directory traversal must be prevented (handled by Azure Blob Storage / Vercel Blob)
- No file execution permissions on uploaded content

---

## 11. Directory Listing Prevention (SSD-29.1.03)

### 11.1 Configuration

Directory listing is disabled for all paths. Next.js does not serve directory listings by default.

### 11.2 Exceptions

**None.** No directory listings are intentionally enabled. There are no exceptions to this rule.

---

## 12. Standard Stack and Deviations (SSD-31.1.03)

### 12.1 Standard Stack Components

| Layer               | Component             | Version               |
| ------------------- | --------------------- | --------------------- |
| Runtime             | Node.js               | 20 LTS                |
| Framework           | Next.js               | 16                    |
| Language            | TypeScript            | 5.x (strict mode)     |
| UI                  | React                 | 19                    |
| Styling             | Tailwind CSS          | 4                     |
| Database            | PostgreSQL            | 15+ (Neon serverless) |
| ORM                 | Drizzle ORM           | 0.44.x                |
| Authentication      | Better Auth           | 1.5.x                 |
| Cache/Rate limiting | Redis                 | 7+ (Upstash)          |
| Vector database     | Qdrant                | Latest                |
| Email               | Resend                | Latest API            |
| Container           | Docker (Alpine-based) | Node 20-alpine        |

### 12.2 Documented Deviations

| Deviation                                | Reason                                                          | Approved By   | Date       |
| ---------------------------------------- | --------------------------------------------------------------- | ------------- | ---------- |
| `pnpm.overrides` for 6 packages          | Patch known CVEs in transitive dependencies before upstream fix | ISM           | 2026-03-12 |
| `'unsafe-inline'`/`'unsafe-eval'` in CSP | Required by Next.js SSR/hydration runtime                       | ISM           | 2026-03-13 |
| 500MB upload body size limit             | Required for recording file uploads (audio/video)               | Product Owner | 2026-01-15 |

### 12.3 Deviation Approval Process

Any deviation from the standard stack must be:

1. Documented with reason and compensating controls
2. Approved by the ISM (security deviations) or Product Owner (functional deviations)
3. Recorded in this section
4. Reviewed during annual security review

---

## 13. Non-Repudiation Transaction Designations (SSD-13.1.01, 13.1.02)

### 13.1 Designated Transactions Requiring Non-Repudiation

Based on risk assessment (see `docs/iso27001/isms/08-risk-assessment-methodology.md`), the following transactions require non-repudiation:

| Transaction Category     | Specific Actions                                         | Non-Repudiation Method                         |
| ------------------------ | -------------------------------------------------------- | ---------------------------------------------- |
| **Recording access**     | View, download, stream, upload, delete, archive, restore | SHA-256 hash chain audit log                   |
| **Data export**          | Export recordings, transcripts, audit logs               | SHA-256 hash chain audit log                   |
| **Permission changes**   | Role grant, revoke, assignment, removal                  | SHA-256 hash chain audit log                   |
| **User lifecycle**       | Create, deactivate, delete user accounts                 | SHA-256 hash chain audit log                   |
| **Consent management**   | Grant, revoke, expire participant consent                | Separate consent audit log with IP, user agent |
| **GDPR requests**        | Data deletion, data export requests                      | SHA-256 hash chain audit log                   |
| **Organization changes** | Create, update, delete organizations                     | SHA-256 hash chain audit log                   |
| **Settings changes**     | Update organization/user settings                        | SHA-256 hash chain audit log                   |

### 13.2 Non-Repudiation Implementation

All designated transactions are logged in the `audit_logs` table with:

- **Hash chain**: Each entry contains SHA-256 hash of previous entry, creating a tamper-evident chain
- **Actor identification**: User ID, IP address, user agent
- **Timestamp**: UTC with timezone
- **Action details**: Event type, resource type, resource ID, action, metadata
- **Organization scoping**: Logs are scoped per organization with isolation enforcement

See `src/server/services/audit-log.service.ts` for implementation.

### 13.3 Verification

Hash chain integrity can be verified using `AuditLogService.verifyHashChain(organizationId)`, which detects any entries with broken hash references indicating tampering.

---

## 14. Hardening Deviation Documentation (SSD-1.3.05)

### 14.1 Current Deviations from Hardening Guidelines

| Component              | Deviation                              | Reason                                                          | Compensating Control                                  | Approved        |
| ---------------------- | -------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------- | --------------- |
| CSP headers            | `unsafe-inline`, `unsafe-eval` allowed | Next.js framework requirement                                   | Strict `default-src`, `frame-ancestors`, `base-uri`   | ISM, 2026-03-13 |
| Upload body size       | 500MB vs typical 1-4MB                 | Recording upload requirement                                    | MIME type whitelist, auth token, file size validation | Product Owner   |
| No staging environment | Cost constraint (startup phase)        | Documented as accepted risk in risk register (see POL-13 §11.1) | Manual testing, CI/CD gates                           | ISM             |

### 14.2 Deviation Review Process

All deviations are reviewed:

- During quarterly access reviews
- During annual security review
- Upon any security incident that may relate to the deviation
- When the underlying constraint changes (e.g., framework update removes need for `unsafe-inline`)

---

## Document History

| Version | Date       | Author | Changes                                               |
| ------- | ---------- | ------ | ----------------------------------------------------- |
| 1.0     | 2026-03-13 | ISM    | Initial creation covering all SSD configuration norms |
