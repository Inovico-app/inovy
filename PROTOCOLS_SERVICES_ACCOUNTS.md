# Protocols, Services and Accounts Overview

**Document Version:** 1.0  
**Last Updated:** 2026-02-22  
**SSD Reference:** SSD-1.2.01 - Hardening van technische componenten  
**Status:** ✅ Active

This document provides a comprehensive overview of all network protocols, external services, and required accounts for the Inovy application. This documentation fulfills the requirement: *"De softwaremaker stelt de software beschikbaar met een actueel overzicht van de noodzakelijke protocollen, services en accounts."*

---

## Table of Contents

1. [Network Protocols](#network-protocols)
2. [External Services](#external-services)
3. [Service Accounts & API Keys](#service-accounts--api-keys)
4. [Authentication & Authorization](#authentication--authorization)
5. [Data Flow & Security](#data-flow--security)
6. [Infrastructure](#infrastructure)
7. [Maintenance & Updates](#maintenance--updates)

---

## Network Protocols

### Application Layer Protocols

#### 1. HTTPS (TLS 1.2+)
- **Purpose:** All external communication, API endpoints, web application
- **Port:** 443
- **Implementation:** Automatic via Vercel deployment
- **Security:** Enforced TLS 1.2 minimum, automatic certificate management
- **Endpoints:**
  - Web application (`https://<domain>`)
  - API routes (`https://<domain>/api/*`)
  - Authentication endpoints (`https://<domain>/api/auth/*`)
  - Webhook receivers (`https://<domain>/api/webhooks/*`)

#### 2. WebSocket (WSS)
- **Purpose:** Real-time live transcription streaming
- **Port:** 443 (over HTTPS)
- **Implementation:** Deepgram live transcription API
- **Security:** Encrypted WebSocket Secure (WSS) connections
- **Endpoints:**
  - `/api/transcribe/live` - Live transcription streaming

#### 3. HTTP/2
- **Purpose:** Optimized communication for web assets and API calls
- **Implementation:** Automatic via Vercel Edge Network
- **Benefits:** Multiplexing, header compression, server push

### Database Protocols

#### 4. PostgreSQL Wire Protocol
- **Purpose:** Primary database communication
- **Port:** 5432 (typical)
- **Implementation:** Neon Serverless PostgreSQL
- **Connection:** Encrypted TCP connection via TLS
- **Library:** `@neondatabase/serverless` with Drizzle ORM

#### 5. Redis Protocol (RESP)
- **Purpose:** Cache layer, session storage, rate limiting
- **Implementation:** Upstash Redis REST API over HTTPS
- **Security:** TLS-encrypted REST API
- **Library:** `@upstash/redis`

#### 6. gRPC (Optional)
- **Purpose:** Qdrant vector database communication
- **Port:** 6334 (local development only)
- **Implementation:** REST API preferred for production
- **Security:** TLS-encrypted in cloud deployments

---

## External Services

### Core Infrastructure Services

#### 1. Vercel
- **Purpose:** Hosting, deployment, edge network, serverless functions
- **Services Used:**
  - Next.js hosting
  - Edge Functions
  - Serverless Functions
  - Vercel Blob (file storage)
  - Vercel Workflow (async processing)
  - Edge Network (CDN)
  - Cron Jobs (scheduled tasks)
- **Protocol:** HTTPS
- **Region:** Configurable (default: closest to user)
- **SLA:** 99.99% uptime guarantee

#### 2. Neon (PostgreSQL)
- **Purpose:** Primary relational database
- **Type:** Serverless PostgreSQL
- **Version:** PostgreSQL 15+
- **Features Used:**
  - Serverless driver for edge compatibility
  - Connection pooling
  - Automatic scaling
  - Point-in-time recovery
- **Protocol:** PostgreSQL wire protocol over TLS
- **Backup:** Automatic continuous backups

#### 3. Upstash Redis
- **Purpose:** Distributed caching, session storage, rate limiting
- **Type:** Serverless Redis
- **Features Used:**
  - REST API
  - Automatic scaling
  - Global replication
  - TTL-based cache invalidation
- **Protocol:** HTTPS REST API
- **Persistence:** Configurable (default: enabled)

#### 4. Qdrant
- **Purpose:** Vector database for semantic search and RAG
- **Type:** Cloud-hosted vector database
- **Features Used:**
  - Vector similarity search
  - Hybrid search (vector + keyword)
  - Collection management
  - Metadata filtering
- **Protocol:** HTTPS REST API (production), gRPC (optional local)
- **Collections:**
  - `recordings` - Meeting transcription vectors
  - `documents` - Knowledge base document vectors
  - `chat_messages` - Conversation history vectors

### AI & Machine Learning Services

#### 5. OpenAI
- **Purpose:** Language models, embeddings, chat completions
- **API Version:** v1
- **Models Used:**
  - `gpt-4-turbo-preview` - Advanced reasoning and generation
  - `gpt-3.5-turbo` - Fast general-purpose tasks
  - `text-embedding-3-small` - Embeddings for semantic search
- **Protocol:** HTTPS REST API
- **SDK:** `openai@^6.7.0`
- **Rate Limits:** Tier-based (managed per account)

#### 6. Anthropic
- **Purpose:** Alternative LLM provider for advanced reasoning
- **API Version:** 2023-06-01
- **Models Used:**
  - `claude-3-opus` - Complex analysis
  - `claude-3-sonnet` - Balanced performance
- **Protocol:** HTTPS REST API
- **SDK:** `@anthropic-ai/sdk@^0.32.1`
- **Usage:** Optional (fallback provider)

#### 7. Deepgram
- **Purpose:** Audio transcription with speaker diarization
- **API Version:** v1
- **Features Used:**
  - Nova-3 model (highest accuracy)
  - Speaker diarization
  - Real-time streaming transcription
  - Multi-language support
- **Protocol:** HTTPS REST API, WebSocket (streaming)
- **SDK:** `@deepgram/sdk@^4.11.2`

### Communication Services

#### 8. Resend
- **Purpose:** Transactional email delivery
- **Features Used:**
  - Email sending API
  - React Email templates
  - Delivery tracking
  - Webhook notifications
- **Protocol:** HTTPS REST API
- **SDK:** `resend@^6.5.2`
- **Email Types:**
  - Email verification
  - Password reset
  - Magic link authentication
  - Organization invitations
  - Notifications

### Integration Services

#### 9. Google Workspace APIs
- **Purpose:** Calendar, Gmail, and Drive integration
- **APIs Used:**
  - Google Calendar API v3
  - Gmail API v1
  - Google Drive API v3
  - Google OAuth 2.0
- **Protocol:** HTTPS REST API
- **SDK:** `googleapis@^164.1.0`
- **Scopes Required:**
  - `https://www.googleapis.com/auth/calendar` - Calendar read/write
  - `https://www.googleapis.com/auth/gmail.compose` - Email drafting
  - `https://www.googleapis.com/auth/drive.readonly` - Drive file access
  - `https://www.googleapis.com/auth/drive.metadata.readonly` - Drive metadata

#### 10. Microsoft 365 APIs
- **Purpose:** Outlook calendar and email integration
- **APIs Used:**
  - Microsoft Graph API v1.0
  - Azure AD OAuth 2.0
- **Protocol:** HTTPS REST API
- **Endpoints:**
  - `https://graph.microsoft.com/v1.0` - Graph API
  - `https://login.microsoftonline.com` - OAuth
- **Permissions Required:**
  - `Calendars.ReadWrite` - Calendar management
  - `Mail.Send` - Email sending

#### 11. Recall.ai
- **Purpose:** Meeting bot webhook integration
- **Type:** Webhook receiver
- **Features Used:**
  - Meeting recording ingestion
  - Automatic transcription trigger
  - Participant metadata extraction
- **Protocol:** HTTPS (incoming webhooks)
- **Authentication:** Webhook signature verification

### Payment Services

#### 12. Stripe
- **Purpose:** Payment processing and subscription management
- **API Version:** Latest (compatible with `stripe@^20.0.0`)
- **Features Used:**
  - Subscription management
  - Payment intent creation
  - Customer management
  - Webhook events
- **Protocol:** HTTPS REST API
- **SDK:** `stripe@^20.0.0`
- **Integration:** Via Better Auth Stripe plugin
- **Usage:** Optional (for paid tiers)

---

## Service Accounts & API Keys

### Required Environment Variables

All sensitive credentials are stored as environment variables and **MUST** be kept secure. Never commit these to version control.

#### Core Application

```bash
# Application URLs
BETTER_AUTH_URL="https://your-domain.com"              # Production URL
NEXT_PUBLIC_APP_URL="https://your-domain.com"          # Public-facing URL
BETTER_AUTH_SECRET="<generated-secret>"                 # Auth encryption key
```

**Generation:**
```bash
openssl rand -base64 32
```

#### Database Services

```bash
# PostgreSQL (Neon)
DATABASE_URL="postgresql://user:pass@host/db"          # Primary database connection

# Redis (Upstash)
UPSTASH_REDIS_REST_URL="https://region.upstash.io"    # Redis REST endpoint
UPSTASH_REDIS_REST_TOKEN="<token>"                     # Redis authentication token
```

**Accounts Required:**
- **Neon Account:** https://neon.tech (database hosting)
- **Upstash Account:** https://upstash.com (Redis hosting)

#### AI Services

```bash
# OpenAI
OPENAI_API_KEY="sk-..."                                 # OpenAI API key

# Anthropic (Optional)
ANTHROPIC_API_KEY="sk-ant-..."                          # Anthropic API key

# Deepgram
DEEPGRAM_API_KEY="..."                                  # Deepgram API key

# Qdrant Vector Database
QDRANT_URL="https://cluster.qdrant.io"                 # Qdrant cloud URL
QDRANT_API_KEY="..."                                    # Qdrant API key
```

**Accounts Required:**
- **OpenAI Account:** https://platform.openai.com (required)
- **Anthropic Account:** https://console.anthropic.com (optional)
- **Deepgram Account:** https://console.deepgram.com (required)
- **Qdrant Account:** https://cloud.qdrant.io (required)

#### File Storage

```bash
# Vercel Blob
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."             # Blob storage token
```

**Account Required:**
- **Vercel Account:** https://vercel.com (automatic with deployment)

#### Email Service

```bash
# Resend
RESEND_API_KEY="re_..."                                 # Resend API key
RESEND_FROM_EMAIL="noreply@yourdomain.com"             # Sender email address
```

**Account Required:**
- **Resend Account:** https://resend.com
- **Domain Verification:** DNS records for sending domain

#### OAuth Providers

```bash
# Google OAuth
GOOGLE_CLIENT_ID="*.apps.googleusercontent.com"        # Google OAuth client ID
GOOGLE_CLIENT_SECRET="..."                              # Google OAuth secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID="..."                               # Azure AD application ID
MICROSOFT_CLIENT_SECRET="..."                           # Azure AD client secret
MICROSOFT_TENANT_ID="common"                            # Tenant ID or 'common'
```

**Accounts Required:**
- **Google Cloud Console:** https://console.cloud.google.com
  - OAuth 2.0 credentials
  - Enabled APIs: Calendar, Gmail, Drive
- **Microsoft Azure Portal:** https://portal.azure.com
  - App registration
  - API permissions: Microsoft Graph

#### Payment Processing

```bash
# Stripe (Optional)
STRIPE_SECRET_KEY="sk_..."                              # Stripe secret key
STRIPE_WEBHOOK_SECRET="whsec_..."                       # Webhook signing secret
```

**Account Required:**
- **Stripe Account:** https://dashboard.stripe.com (optional, for paid features)

#### Webhook Integration

```bash
# Recall.ai (Optional)
RECALL_WEBHOOK_SECRET="..."                             # Webhook verification secret
```

**Account Required:**
- **Recall.ai Account:** https://recall.ai (optional, for meeting bot integration)

### Service Account Permissions

Each service account should be configured with **minimum required permissions** (principle of least privilege):

#### Google Service Account
- **Calendar API:** Read/write access
- **Gmail API:** Compose and send only (no read access)
- **Drive API:** Read-only access to shared files

#### Microsoft Application
- **Delegated Permissions:** User-consented access only
- **Application Permissions:** None (all operations are user-delegated)

#### Stripe
- **Restricted Keys:** Limit to subscription and customer management only
- **Webhook Events:** Subscribe only to necessary events

---

## Authentication & Authorization

### Authentication Methods

#### 1. Better Auth Framework
- **Library:** `better-auth@^1.4.6`
- **Database Adapter:** Drizzle + PostgreSQL
- **Session Storage:** Cookie-based with Redis caching
- **Session Duration:** 7 days (configurable)

#### 2. Supported Authentication Methods

**Primary Methods:**
- **Email/Password:** With email verification
- **OAuth 2.0 Providers:**
  - Google (Workspace)
  - Microsoft (365)
- **Magic Link:** Passwordless email authentication
- **Passkey/WebAuthn:** Biometric and security key authentication

#### 3. Multi-Factor Authentication
- **Passkey Support:** FIDO2/WebAuthn standard
- **Device Registration:** Per-user passkey management
- **Recovery Options:** Email-based recovery flows

### Authorization Model

#### Role-Based Access Control (RBAC)

**Organization Roles:**
- `owner` - Full organizational control
- `admin` - Administrative privileges
- `manager` - Team and project management
- `user` - Standard access
- `viewer` - Read-only access

**Permission Hierarchy:**
```
owner > admin > manager > user > viewer
```

#### Resource-Level Permissions
- **Projects:** Organization-scoped with creator privileges
- **Recordings:** Project-scoped with RBAC checks
- **Tasks:** Project-scoped with assignee permissions
- **Teams:** Organization-scoped with role-based access

#### Organization Isolation
- **Data Scoping:** All queries filtered by organization ID
- **Multi-Tenancy:** Strict isolation between organizations
- **Access Verification:** Middleware enforcement on all routes

---

## Data Flow & Security

### Data Processing Pipeline

```
User Upload (HTTPS/TLS)
    ↓
Vercel Edge Function
    ↓
Vercel Blob Storage (encrypted at rest)
    ↓
Vercel Workflow (async processing)
    ↓
┌──────────────────────────────────┐
│  AI Processing Services          │
│  ├─ Deepgram (transcription)     │ ← WSS/HTTPS
│  ├─ OpenAI (summarization)       │ ← HTTPS
│  └─ Qdrant (vector indexing)     │ ← HTTPS
└──────────────────────────────────┘
    ↓
PostgreSQL (Neon) - Encrypted storage
    ↓
Redis Cache (Upstash) - Encrypted cache
    ↓
Client (HTTPS/TLS)
```

### Security Layers

#### 1. Transport Security
- **TLS 1.2+:** All external communication
- **Certificate Pinning:** Vercel automatic certificate management
- **HTTPS Enforcement:** Automatic redirects from HTTP

#### 2. Data Encryption

**In Transit:**
- TLS 1.2+ for all API calls
- WSS for WebSocket connections
- Encrypted PostgreSQL connections

**At Rest:**
- Vercel Blob: AES-256 encryption
- Neon PostgreSQL: Encrypted storage
- Upstash Redis: Encrypted persistence

#### 3. Authentication Security
- **Password Hashing:** Argon2id (Better Auth default)
- **Session Tokens:** Cryptographically secure random generation
- **Cookie Security:** HttpOnly, Secure, SameSite flags
- **CSRF Protection:** Built-in token validation

#### 4. API Security
- **Rate Limiting:** Tier-based with Redis
- **Webhook Verification:** Signature-based validation
- **CORS:** Restricted origin policy
- **Input Validation:** Zod schema validation on all inputs

#### 5. Access Control
- **RBAC Enforcement:** Server-side validation on all operations
- **Organization Isolation:** Database-level filtering
- **Audit Logging:** Comprehensive activity tracking

---

## Infrastructure

### Deployment Architecture

```
Internet
    ↓
Vercel Edge Network (Global CDN)
    ↓
┌─────────────────────────────────────────┐
│  Vercel Serverless Functions            │
│  ├─ Next.js API Routes                  │
│  ├─ Server Actions                      │
│  ├─ Cron Jobs                           │
│  └─ Vercel Workflow Engine              │
└─────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────┐
│  External Services                      │
│  ├─ Neon PostgreSQL                     │
│  ├─ Upstash Redis                       │
│  ├─ Qdrant Vector DB                    │
│  ├─ OpenAI API                          │
│  ├─ Deepgram API                        │
│  └─ Resend Email                        │
└─────────────────────────────────────────┘
```

### Deployment Regions

**Vercel Edge Network:**
- Multi-region deployment
- Automatic geographic routing
- Edge caching for static assets

**Database Regions:**
- **Neon:** Configurable region (recommend: EU for GDPR)
- **Upstash:** Global replication available
- **Qdrant:** Region selection on cluster creation

### Backup & Recovery

**Database Backups:**
- **Neon:** Automatic continuous backups, 7-day retention
- **Upstash:** Automatic persistence with configurable snapshots
- **Qdrant:** Manual snapshots via API

**Disaster Recovery:**
- **RTO (Recovery Time Objective):** < 1 hour
- **RPO (Recovery Point Objective):** < 15 minutes
- **Backup Testing:** Quarterly verification recommended

---

## Maintenance & Updates

### Version Management

#### Application Dependencies
- **Node.js:** >=20.9.0 (LTS)
- **pnpm:** 10.27.0+
- **Next.js:** 16.1.1
- **React:** 19.2.3

#### Update Schedule
- **Security Updates:** Immediate (within 24-48 hours)
- **Minor Updates:** Monthly review
- **Major Updates:** Quarterly assessment

### Service Monitoring

#### Health Check Endpoints
```bash
# Application health
GET /api/health

# Cache layer health
GET /api/cache/health

# Vector database health
GET /api/qdrant/health

# Connection pool health
GET /api/connection-pool/health
```

#### Automated Monitoring
- **Vercel Analytics:** Performance monitoring
- **Uptime Monitoring:** Third-party service recommended
- **Error Tracking:** Console logging and Vercel log drains

### Scheduled Maintenance

**Cron Jobs (Vercel Cron):**
- **Daily 00:00 UTC:**
  - `/api/cron/renew-drive-watches` - Refresh Google Drive webhooks
  - `/api/cron/monitor-calendar` - Check calendar events
  - `/api/cron/poll-bot-status` - Update meeting bot status

**Maintenance Windows:**
- **Database Maintenance:** Automatic during low-traffic periods (Neon managed)
- **Application Updates:** Zero-downtime deployments via Vercel
- **Service Updates:** Coordinated with service providers

### Security Updates

**Dependency Scanning:**
```bash
# Check for vulnerabilities
pnpm audit

# Update dependencies
pnpm update
```

**Security Advisories:**
- Monitor GitHub Security Advisories
- Subscribe to service provider security bulletins
- Review CVE databases for critical vulnerabilities

### Documentation Updates

**When to Update This Document:**
1. Adding new external service or API
2. Changing authentication methods
3. Updating protocol requirements
4. Modifying network architecture
5. Adding new required accounts
6. Changes to security practices
7. Version upgrades affecting integrations

**Review Schedule:**
- **Quarterly Review:** Verify all information is current
- **Release Updates:** Update with each major release
- **Incident Review:** Update after security incidents

**Change Log:**
| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-22 | 1.0 | Initial documentation for SSD-1.2.01 compliance | System |

---

## Compliance & Audit

### SSD-1.2.01 Compliance

This document fulfills the requirement:
> **SSD-1.2.01:** De softwaremaker stelt de software beschikbaar met een actueel overzicht van de noodzakelijke protocollen, services en accounts.

**Compliance Checklist:**
- ✅ All network protocols documented
- ✅ All external services enumerated
- ✅ Required accounts listed with purposes
- ✅ Security measures documented
- ✅ Update procedures defined
- ✅ Maintenance schedule established

### Audit Trail

**For Security Audits:**
1. Review this document
2. Verify all listed services are necessary
3. Confirm minimum privilege principles
4. Check encryption requirements
5. Validate access control implementation
6. Review backup and recovery procedures

**Access Log:**
- All API calls logged via Vercel
- Authentication events logged via Better Auth
- Database queries logged via Drizzle ORM
- Audit log table in database for compliance events

---

## Contact & Support

**Security Issues:**
- Report security vulnerabilities immediately to the development team
- Do not disclose publicly until patched

**Service Provider Support:**
- Maintain active support contracts with critical service providers
- Document emergency contact procedures
- Keep escalation paths updated

**Documentation Feedback:**
- Suggest improvements via project issues
- Report inaccuracies immediately
- Contribute updates via pull requests

---

**Document Status:** ✅ Active and Maintained  
**Next Review Date:** 2026-05-22 (Quarterly)  
**Compliance Status:** ✅ SSD-1.2.01 Compliant
