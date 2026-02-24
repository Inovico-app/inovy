# Configuration Guidelines

This document provides comprehensive configuration guidelines for the Inovy application to ensure secure and reliable deployment.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Configuration Files](#configuration-files)
- [Security Configuration](#security-configuration)
- [Service Configuration](#service-configuration)
- [Environment-Specific Configuration](#environment-specific-configuration)
- [Configuration Validation](#configuration-validation)

---

## Environment Variables

All environment variables should be set in `.env.local` for development and configured in your deployment platform (Vercel) for production.

### Required Environment Variables

#### Database Configuration

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `DATABASE_URL` | PostgreSQL connection string with pgvector support | `postgresql://user:pass@host:5432/db` | **Critical** - Contains credentials |

**Security Guidelines:**
- Use SSL/TLS connection strings in production (`?sslmode=require`)
- Store in secure environment variable storage (Vercel Environment Variables)
- Use connection pooling for optimal performance
- Restrict database user permissions to minimum required
- For Neon Postgres: Use connection pooling URL for serverless functions

**Production Considerations:**
- Enable connection pooling (Neon provides pooled connection strings)
- Set appropriate connection timeouts
- Use read replicas for read-heavy operations if needed
- Monitor connection usage and adjust pool size

---

#### Redis Configuration (Upstash)

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `UPSTASH_REDIS_REST_URL` | Redis REST API URL | `https://your-redis.upstash.io` | Medium |
| `UPSTASH_REDIS_REST_TOKEN` | Redis authentication token | `AX...` | **Critical** |

**Security Guidelines:**
- Use Upstash Redis serverless for automatic scaling
- Tokens are secrets - never commit to version control
- Rotate tokens periodically (quarterly recommended)
- Enable TLS for all Redis connections (Upstash default)
- Monitor Redis usage and set appropriate limits

**Cache Configuration:**
- Default TTL: 5 minutes (API responses)
- User cache: 1 hour
- Organization cache: 1 hour
- Project cache: 15 minutes
- Cache invalidation: Pattern-based with cascade

---

#### Authentication Configuration (Better Auth)

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `BETTER_AUTH_SECRET` | Secret key for session encryption | Generate with `openssl rand -base64 32` | **Critical** |
| `BETTER_AUTH_URL` | Base URL for authentication callbacks | `https://yourdomain.com` | Low |
| `NEXT_PUBLIC_APP_URL` | Public application URL | `https://yourdomain.com` | Low |

**Security Guidelines:**
- Generate `BETTER_AUTH_SECRET` with cryptographically secure random generator
- Minimum 32 bytes (256 bits) entropy required
- Never reuse secrets across environments
- Rotate secrets on suspected compromise
- Use HTTPS URLs only in production

**Session Configuration:**
- Session duration: 30 days default
- Refresh token enabled
- Secure cookie attributes enforced
- SameSite=Lax for CSRF protection
- HTTPOnly cookies enabled

---

#### OAuth Providers (Optional)

##### Google Workspace

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxx.apps.googleusercontent.com` | Medium |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-...` | **Critical** |

**Security Guidelines:**
- Register application in Google Cloud Console
- Enable only required OAuth scopes:
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`
  - `https://www.googleapis.com/auth/calendar` (for calendar integration)
  - `https://www.googleapis.com/auth/gmail.compose` (for email drafts)
  - `https://www.googleapis.com/auth/drive.readonly` (for Drive integration)
- Configure authorized redirect URIs:
  - Development: `http://localhost:3000/api/auth/callback/google`
  - Production: `https://yourdomain.com/api/auth/callback/google`
- Restrict API key usage by domain
- Enable audit logging in Google Cloud Console
- Review and minimize requested scopes

##### Microsoft 365

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `MICROSOFT_CLIENT_ID` | Azure AD application client ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` | Medium |
| `MICROSOFT_CLIENT_SECRET` | Azure AD application secret | `xxx~...` | **Critical** |
| `MICROSOFT_TENANT_ID` | Azure AD tenant ID (use "common" for multi-tenant) | `common` or specific tenant ID | Low |

**Security Guidelines:**
- Register application in Azure Portal (Azure Active Directory)
- Enable only required Microsoft Graph API permissions:
  - `User.Read` (basic profile)
  - `Calendars.ReadWrite` (calendar integration)
  - `Mail.Send` (email drafts)
  - `offline_access` (refresh tokens)
- Configure redirect URIs in Azure AD:
  - Development: `http://localhost:3000/api/auth/callback/microsoft`
  - Production: `https://yourdomain.com/api/auth/callback/microsoft`
- Use "common" tenant for multi-organization support
- Enable conditional access policies where appropriate
- Monitor application consent grants

---

#### AI Services

##### OpenAI

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `OPENAI_API_KEY` | OpenAI API key for GPT models | `sk-proj-...` | **Critical** |

**Security Guidelines:**
- Use project-scoped API keys (not user keys)
- Set usage limits in OpenAI dashboard
- Monitor usage and costs regularly
- Enable usage tracking and alerts
- Never expose in client-side code

**Model Configuration:**
- Default model: `gpt-4o` (summaries, task extraction)
- Embeddings: `text-embedding-3-small` (1536 dimensions)
- Temperature: 0.3 for summaries, 0.7 for chat
- Max tokens: 4096 for summaries, 2048 for tasks

##### Anthropic (Optional)

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude models | `sk-ant-...` | **Critical** |

**Security Guidelines:**
- Use project-specific API keys
- Set spending limits in Anthropic Console
- Monitor usage patterns
- Enable rate limiting
- Prefer OpenAI as primary, Anthropic as fallback

**Model Configuration:**
- Model: `claude-3-5-sonnet-20241022` for advanced reasoning
- Temperature: 0.3 for analytical tasks
- Max tokens: 4096

##### Deepgram (Transcription)

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `DEEPGRAM_API_KEY` | Deepgram API key for transcription | `xxx` | **Critical** |

**Security Guidelines:**
- Use project-specific API keys
- Enable usage monitoring in Deepgram dashboard
- Set rate limits appropriate for your usage
- Monitor transcription accuracy and costs

**Transcription Configuration:**
- Model: `nova-3` (highest accuracy)
- Language: Auto-detection or explicit language code
- Diarization: Enabled for speaker separation
- Punctuation: Enabled
- Profanity filter: Configurable
- Smart formatting: Enabled

---

#### Vector Database (Qdrant)

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `QDRANT_URL` | Qdrant instance URL | `https://xxx.qdrant.io` or `http://localhost:6333` | Low |
| `QDRANT_API_KEY` | Qdrant API key (required for cloud) | `xxx` | **Critical** |

**Security Guidelines:**
- Use Qdrant Cloud for production (managed service)
- Enable API key authentication
- Use HTTPS URLs in production
- Restrict API key by IP if possible
- Monitor collection sizes and query performance

**Collection Configuration:**
- Collection name: `knowledge_base`
- Vector dimensions: 1536 (matches OpenAI embeddings)
- Distance metric: Cosine similarity
- Quantization: Scalar for storage efficiency
- Index: HNSW for fast search

**Local Development (Optional):**
- Use Docker Compose for local Qdrant instance
- No API key required for localhost
- Data stored in `./data/qdrant_storage`
- Access dashboard at `http://localhost:6333/dashboard`

---

#### File Storage (Vercel Blob)

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token | `vercel_blob_rw_...` | **Critical** |

**Security Guidelines:**
- Use separate tokens for development and production
- Enable token rotation (Vercel supports this)
- Monitor storage usage and costs
- Set appropriate file size limits (500MB max configured)
- Enable automatic cleanup of old files if needed

**Storage Configuration:**
- Max file size: 500MB (configured in `next.config.ts`)
- Allowed file types: audio/video files, documents (PDF, DOCX)
- Public access: Disabled (use signed URLs)
- Retention: Configurable per use case
- Lifecycle policies: Consider implementing for cost optimization

---

#### Email Service (Resend)

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `RESEND_API_KEY` | Resend API key for email delivery | `re_...` | **Critical** |
| `RESEND_FROM_EMAIL` | From email address for transactional emails | `noreply@yourdomain.com` | Low |

**Security Guidelines:**
- Use API keys with minimal required permissions
- Verify domain ownership in Resend dashboard
- Enable SPF, DKIM, and DMARC for email authentication
- Monitor email delivery rates and bounces
- Set up webhook for delivery status

**Email Configuration:**
- From address: Use verified domain
- Reply-to: Configure support email
- Templates: React Email components
- Rate limits: Monitor and adjust
- Bounce handling: Implement webhook listener

---

#### Payment Processing (Stripe) - Optional

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `STRIPE_SECRET_KEY` | Stripe secret key | `sk_live_...` or `sk_test_...` | **Critical** |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | `whsec_...` | **Critical** |

**Security Guidelines:**
- Use test keys in development (`sk_test_`)
- Use live keys only in production (`sk_live_`)
- Verify webhook signatures to prevent tampering
- Enable webhook endpoint authentication
- Monitor payment events and anomalies
- Use Stripe Customer Portal for self-service
- Enable 3D Secure for card payments (SCA compliance)

**Stripe Configuration:**
- Subscription tiers: Free, Pro, Enterprise
- Webhook events: Subscribe to payment and subscription events
- Customer portal: Enable for plan management
- Tax calculation: Configure if needed (Stripe Tax)
- Payment methods: Cards, SEPA, iDEAL (EU compliance)

---

#### Integration Services

##### Recall.ai Meeting Bot (Optional)

| Variable | Description | Example | Security Level |
|----------|-------------|---------|----------------|
| `RECALL_WEBHOOK_SECRET` | Recall.ai webhook signing secret | `xxx` | **Critical** |

**Security Guidelines:**
- Verify webhook signatures before processing
- Use HTTPS endpoints only
- Implement rate limiting on webhook endpoint
- Log all webhook events for audit trail
- Handle duplicate events gracefully

---

### Optional Environment Variables

#### Development Configuration

| Variable | Description | Default | Security Level |
|----------|-------------|---------|----------------|
| `NODE_ENV` | Node environment | `development` | Low |
| `LOG_LEVEL` | Logging verbosity | `info` | Low |
| `PORT` | Development server port | `3000` | Low |

**Development Guidelines:**
- Set `NODE_ENV=production` for production deployments
- Use `LOG_LEVEL=debug` for troubleshooting
- Set `LOG_LEVEL=info` or `warn` in production
- Custom port: Use `PORT=3001` if 3000 is occupied

---

## Configuration Files

### Next.js Configuration (`next.config.ts`)

The Next.js configuration file controls application behavior and optimization settings.

**Key Configuration Options:**

```typescript
{
  // Enable typed routes for type-safe navigation
  typedRoutes: true,
  
  // Enable Next.js 16 cache components
  cacheComponents: true,
  
  // Enable React 19 compiler for automatic optimizations
  reactCompiler: true,
  
  // Exclude server-only packages from client bundle
  serverExternalPackages: ["pino", "pino-pretty", ...],
  
  // Increase body size limit for large file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "500mb"
    },
    proxyClientMaxBodySize: "500mb"
  }
}
```

**Security Considerations:**
- Server-only packages are excluded from client bundle
- Body size limits prevent memory exhaustion
- Typed routes prevent runtime routing errors
- React Compiler reduces XSS attack surface

**Performance Optimizations:**
- Cache Components enabled for intelligent caching
- React Compiler for automatic optimizations
- Turbopack for faster development builds

---

### Database Configuration (`drizzle.config.ts`)

Drizzle ORM configuration for database operations.

**Configuration Structure:**

```typescript
{
  dialect: "postgresql",
  schema: "./src/server/db/schema/*.ts",
  out: "./src/server/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
}
```

**Security Considerations:**
- Use environment variable for connection string
- Enable SSL/TLS in production
- Use connection pooling
- Set appropriate timeouts

**Migration Guidelines:**
- Generate migrations: `pnpm db:generate --name <migration-name>`
- Review migrations before applying
- Test migrations in staging environment
- **Never run `pnpm db:push` or `pnpm db:migrate` manually in production**
- Use GitHub Actions workflow for production migrations
- Keep migrations in version control

---

### Vercel Configuration (`vercel.json`)

Deployment configuration for Vercel platform.

**Current Configuration:**

```json
{
  "crons": [
    {
      "path": "/api/cron/renew-drive-watches",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/monitor-calendar",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/poll-bot-status",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Security Considerations:**
- Cron jobs run on secure serverless infrastructure
- Implement authentication in cron endpoints
- Monitor cron execution logs
- Set appropriate timeouts

**Recommended Additions for Production:**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/admin",
      "has": [
        {
          "type": "header",
          "key": "x-forwarded-proto",
          "value": "http"
        }
      ],
      "destination": "https://yourdomain.com/admin",
      "permanent": true
    }
  ]
}
```

---

## Security Configuration

### Content Security Policy (CSP)

Configure CSP in `next.config.ts` middleware or response headers:

```typescript
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self' data:;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`;
```

**CSP Directives Explained:**
- `default-src 'self'`: Only load resources from same origin by default
- `script-src`: Allow scripts from self and Vercel Live (for analytics)
- `style-src 'unsafe-inline'`: Required for Tailwind CSS
- `img-src`: Allow images from various sources (blob for uploads, data for inline)
- `frame-ancestors 'none'`: Prevent clickjacking
- `upgrade-insecure-requests`: Automatically upgrade HTTP to HTTPS

**Testing CSP:**
- Test in report-only mode first: `Content-Security-Policy-Report-Only`
- Monitor violation reports
- Gradually tighten policy
- Use CSP evaluator tools (e.g., CSP Evaluator by Google)

---

### HTTPS and TLS Configuration

Vercel automatically provides TLS certificates and enforces HTTPS.

**Required Headers:**

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Configuration:**
- HSTS max-age: 1 year (31536000 seconds)
- Include subdomains: Yes
- Preload: Consider submitting to HSTS preload list

**Certificate Management:**
- Vercel manages certificate renewal automatically
- TLS 1.3 enabled by default
- Perfect Forward Secrecy (PFS) enabled
- Strong cipher suites configured

---

### CORS Configuration

CORS is configured in API routes for cross-origin requests.

**Default CORS Policy:**

```typescript
headers: {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL,
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}
```

**Security Guidelines:**
- Never use `Access-Control-Allow-Origin: *` in production
- Specify exact allowed origins
- Limit allowed methods to required ones only
- Set appropriate max-age for preflight caching
- Validate Origin header in API routes

---

### Rate Limiting Configuration

Rate limiting is implemented per subscription tier.

**Rate Limits by Tier:**

| Tier | Requests/Hour | Requests/Day | Burst |
|------|---------------|--------------|-------|
| Free | 100 | 1,000 | 10 |
| Pro | 1,000 | 10,000 | 50 |
| Enterprise | Unlimited | Unlimited | 100 |

**Configuration:**
- Storage: Upstash Redis
- Algorithm: Token bucket
- Scope: Per user + per organization
- Endpoints: All API routes and server actions
- Response: 429 Too Many Requests with Retry-After header

**Security Guidelines:**
- Implement rate limiting on all public endpoints
- Use sliding window for accurate limits
- Log rate limit violations for abuse detection
- Whitelist internal services if needed
- Adjust limits based on observed usage patterns

---

## Service Configuration

### PostgreSQL (Neon)

**Recommended Configuration:**

```
Connection pooling: Enabled (use pooled connection string)
SSL mode: Require
Statement timeout: 60000ms
Idle in transaction timeout: 60000ms
Max connections: Auto (Neon manages)
```

**Security Settings:**
- Enable SSL/TLS: Required for all connections
- Use strong passwords: 32+ characters, random generated
- Restrict user permissions: Grant only required privileges
- Enable audit logging: Track all DDL and sensitive operations
- IP allowlist: Configure if static IPs available
- Regular backups: Daily automated backups (Neon default)

**Performance Settings:**
- Enable connection pooling (critical for serverless)
- Use prepared statements (Drizzle default)
- Configure indexes for common queries
- Monitor query performance with EXPLAIN
- Set appropriate work_mem and shared_buffers

---

### Redis (Upstash)

**Recommended Configuration:**

```
Max memory policy: allkeys-lru
Max connections: Auto (Upstash manages)
Persistence: Enabled (Upstash default)
Eviction policy: LRU (Least Recently Used)
```

**Security Settings:**
- Enable TLS: Required (Upstash default)
- Use strong auth tokens: Rotate quarterly
- Enable command rename: Disable dangerous commands
- Monitor access patterns: Alert on unusual activity
- Set memory limits: Prevent excessive usage

**Performance Settings:**
- Use pipelining for bulk operations
- Set appropriate TTL values per data type
- Monitor hit/miss ratios
- Use key expiration for automatic cleanup
- Implement cache warming for critical data

---

### Qdrant (Vector Database)

**Cloud Configuration (Recommended):**

```
Cluster type: Production (HA)
Region: Same as primary database
Replication: Enabled (3 replicas)
Backup: Daily automated
API key authentication: Enabled
```

**Local Development Configuration:**

```yaml
# docker-compose.yml
qdrant:
  image: qdrant/qdrant:latest
  ports:
    - "6333:6333"  # HTTP API
    - "6334:6334"  # gRPC
  volumes:
    - ./data/qdrant_storage:/qdrant/storage
```

**Security Settings:**
- Enable API key authentication in cloud
- Use HTTPS for all connections
- Restrict network access to application servers only
- Enable audit logging
- Regular backups (Qdrant Cloud automatic)

**Performance Settings:**
- Optimize HNSW index parameters (m=16, ef_construct=100)
- Enable quantization for large collections
- Use batch operations for indexing
- Monitor query latency and throughput
- Set appropriate timeouts

---

## Environment-Specific Configuration

### Development Environment

**Configuration Priority:**
1. `.env.local` (git-ignored, for local development)
2. `.env.development` (optional, for shared dev config)
3. Environment defaults

**Development Settings:**
- `NODE_ENV=development`
- `LOG_LEVEL=debug`
- Use test/sandbox API keys
- Connect to development databases
- Enable source maps
- Disable caching (or use short TTL)
- Use local Qdrant (optional)

**Development Best Practices:**
- Never commit `.env.local` to version control
- Use `.env.example` template for team onboarding
- Document all required environment variables
- Use separate services for dev/staging/production
- Test with production-like data when possible

---

### Staging/Preview Environment

**Configuration Priority:**
1. Vercel Environment Variables (staging-specific)
2. Vercel Preview deployments
3. Branch-specific configuration

**Staging Settings:**
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- Use staging/sandbox API keys
- Connect to staging databases
- Enable source maps for debugging
- Use production-like caching
- Use staging Qdrant collection

**Staging Best Practices:**
- Mirror production configuration as closely as possible
- Use separate API keys/credentials from production
- Test with realistic data volumes
- Run automated tests on every preview deployment
- Enable detailed logging for debugging

---

### Production Environment

**Configuration Priority:**
1. Vercel Environment Variables (production-specific)
2. Encrypted secrets storage
3. Production defaults

**Production Settings:**
- `NODE_ENV=production`
- `LOG_LEVEL=warn` or `info`
- Use production API keys only
- Connect to production databases
- Disable source maps (or restrict access)
- Enable full caching
- Use production Qdrant cluster

**Production Best Practices:**
- Encrypt all secrets at rest
- Use secret management service (Vercel Environment Variables)
- Enable audit logging for all configuration changes
- Implement secret rotation schedule
- Monitor all service health and performance
- Set up alerting for errors and anomalies
- Use read replicas for database reads
- Enable CDN for static assets

---

## Configuration Validation

### Pre-Deployment Checklist

**Environment Variables:**
- [ ] All required variables are set
- [ ] No placeholder values remain
- [ ] Credentials are production-appropriate
- [ ] URLs use HTTPS (not HTTP)
- [ ] Secrets are properly encrypted

**Service Connectivity:**
- [ ] Database connection successful
- [ ] Redis cache accessible
- [ ] Qdrant vector database accessible
- [ ] External APIs reachable
- [ ] Email service configured

**Security Headers:**
- [ ] CSP configured and tested
- [ ] HSTS enabled with appropriate max-age
- [ ] X-Frame-Options set to DENY
- [ ] X-Content-Type-Options set to nosniff
- [ ] Referrer-Policy configured

**SSL/TLS:**
- [ ] Certificate valid and not expired
- [ ] TLS 1.2+ enforced (TLS 1.0/1.1 disabled)
- [ ] Strong cipher suites enabled
- [ ] HTTP redirects to HTTPS

**Authentication:**
- [ ] OAuth redirect URIs configured correctly
- [ ] Session secret is cryptographically secure
- [ ] Token expiration configured appropriately
- [ ] Refresh token rotation enabled

---

### Configuration Testing

#### Automated Validation Script

Create a configuration validation script to check all settings:

```typescript
// scripts/validate-config.ts
import { z } from "zod";

const configSchema = z.object({
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  UPSTASH_REDIS_REST_URL: z.string().url(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(32),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().startsWith("https://"),
  OPENAI_API_KEY: z.string().startsWith("sk-"),
  DEEPGRAM_API_KEY: z.string().min(32),
  QDRANT_URL: z.string().url(),
  QDRANT_API_KEY: z.string().min(32),
  BLOB_READ_WRITE_TOKEN: z.string().startsWith("vercel_blob_"),
  RESEND_API_KEY: z.string().startsWith("re_"),
  // ... other variables
});

try {
  configSchema.parse(process.env);
  console.log("✅ Configuration valid");
} catch (error) {
  console.error("❌ Configuration errors:", error);
  process.exit(1);
}
```

**Run before deployment:**

```bash
npx tsx scripts/validate-config.ts
```

---

#### Manual Testing Checklist

**Database Connectivity:**

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT version();"

# Test pgvector extension
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

**Redis Connectivity:**

```bash
# Test Redis connection via API
curl http://localhost:3000/api/cache/health
```

**Qdrant Connectivity:**

```bash
# Test Qdrant connection
curl http://localhost:3000/api/qdrant/health

# List collections
curl http://localhost:3000/api/qdrant/collections
```

**OAuth Configuration:**

```bash
# Test OAuth redirect URLs (should return 200 or redirect)
curl -I https://yourdomain.com/api/auth/callback/google
curl -I https://yourdomain.com/api/auth/callback/microsoft
```

**Security Headers:**

```bash
# Test security headers
curl -I https://yourdomain.com | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security"
```

---

## Configuration Management Best Practices

### Secret Management

1. **Never Commit Secrets**
   - Add `.env*` to `.gitignore` (already configured)
   - Use `.env.example` as template with placeholder values
   - Store secrets in encrypted secret management system

2. **Secret Rotation**
   - Rotate secrets quarterly or after personnel changes
   - Update secrets in all environments simultaneously
   - Test after rotation to prevent outages
   - Document rotation procedures

3. **Access Control**
   - Limit who can access production secrets
   - Use role-based access for secret management
   - Enable audit logging for secret access
   - Implement approval workflow for secret changes

---

### Configuration as Code

1. **Version Control**
   - Store configuration structure in version control
   - Use `.env.example` as documentation
   - Track configuration changes in git
   - Review configuration changes in pull requests

2. **Documentation**
   - Document all configuration variables
   - Explain the purpose and security implications
   - Provide examples (with fake values)
   - Keep documentation up-to-date

3. **Validation**
   - Validate configuration on application startup
   - Use schema validation (Zod)
   - Fail fast on misconfiguration
   - Provide clear error messages

---

### Monitoring and Alerting

1. **Configuration Drift Detection**
   - Monitor for unauthorized configuration changes
   - Alert on secret access or modifications
   - Track configuration version in deployments
   - Regular configuration audits

2. **Service Health Monitoring**
   - Monitor all service connectivity
   - Alert on service degradation
   - Track API usage and limits
   - Monitor error rates by service

3. **Security Monitoring**
   - Monitor for suspicious authentication attempts
   - Track rate limit violations
   - Alert on security header changes
   - Monitor for unusual API usage patterns

---

## Compliance and Audit

### Configuration Audit Trail

**Logged Events:**
- Configuration changes (what, when, who)
- Secret access and rotation
- Service connection changes
- Security header modifications
- OAuth scope changes

**Audit Requirements:**
- Immutable audit logs (append-only)
- Tamper-proof logging with hash chains
- Retention: Minimum 1 year
- Regular audit reviews (quarterly)
- Compliance with NEN 7510 and GDPR

---

### Compliance Checklist

**NEN 7510 (Healthcare Information Security):**
- [ ] All secrets encrypted at rest
- [ ] TLS 1.3 for data in transit
- [ ] Access control enforced
- [ ] Audit logging enabled
- [ ] Incident response procedures documented

**GDPR (Data Protection):**
- [ ] Data retention policies configured
- [ ] Right to erasure supported
- [ ] Data portability enabled
- [ ] Consent management implemented
- [ ] Privacy by design principles followed

**BIO (Baseline Information Security Government):**
- [ ] Security baseline documented
- [ ] Configuration hardening applied
- [ ] Regular security assessments
- [ ] Incident response plan in place
- [ ] Business continuity planning

---

## Configuration Template

### `.env.example` Template

Create this file for team onboarding:

```env
# =============================================================================
# DATABASE CONFIGURATION
# =============================================================================
DATABASE_URL="postgresql://username:password@host:5432/database?sslmode=require"

# =============================================================================
# REDIS CACHE (UPSTASH)
# =============================================================================
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# =============================================================================
# AUTHENTICATION (BETTER AUTH)
# =============================================================================
# Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET="your-secret-here"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# =============================================================================
# OAUTH PROVIDERS (OPTIONAL)
# =============================================================================

# Google Workspace
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-your-secret"

# Microsoft 365
MICROSOFT_CLIENT_ID="your-client-id"
MICROSOFT_CLIENT_SECRET="your-secret"
MICROSOFT_TENANT_ID="common"

# =============================================================================
# AI SERVICES
# =============================================================================

# OpenAI (Required)
OPENAI_API_KEY="sk-proj-your-key"

# Anthropic (Optional)
ANTHROPIC_API_KEY="sk-ant-your-key"

# Deepgram Transcription (Required)
DEEPGRAM_API_KEY="your-deepgram-key"

# =============================================================================
# VECTOR DATABASE (QDRANT)
# =============================================================================
QDRANT_URL="https://your-cluster.qdrant.io"
QDRANT_API_KEY="your-qdrant-api-key"

# =============================================================================
# FILE STORAGE (VERCEL BLOB)
# =============================================================================
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_your-token"

# =============================================================================
# EMAIL SERVICE (RESEND)
# =============================================================================
RESEND_API_KEY="re_your-key"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# =============================================================================
# PAYMENT PROCESSING (STRIPE - OPTIONAL)
# =============================================================================
STRIPE_SECRET_KEY="sk_test_your-key"
STRIPE_WEBHOOK_SECRET="whsec_your-secret"

# =============================================================================
# INTEGRATIONS (OPTIONAL)
# =============================================================================

# Recall.ai Meeting Bot
RECALL_WEBHOOK_SECRET="your-webhook-secret"

# =============================================================================
# DEVELOPMENT SETTINGS
# =============================================================================
NODE_ENV="development"
LOG_LEVEL="debug"
```

---

## Support and Troubleshooting

### Common Configuration Issues

**Issue: Database connection fails**
- **Cause**: Incorrect connection string or network restrictions
- **Solution**: Verify `DATABASE_URL`, check IP allowlist, enable SSL
- **Test**: `psql $DATABASE_URL -c "SELECT 1;"`

**Issue: Redis connection timeout**
- **Cause**: Invalid credentials or network issues
- **Solution**: Verify Upstash Redis URL and token
- **Test**: Use health check endpoint

**Issue: OAuth redirects fail**
- **Cause**: Incorrect redirect URI configuration
- **Solution**: Verify redirect URIs match in OAuth provider console
- **Test**: Attempt OAuth login and check browser network tab

**Issue: API rate limits hit unexpectedly**
- **Cause**: Usage exceeds configured limits
- **Solution**: Review rate limit configuration, upgrade tier, or optimize requests
- **Test**: Monitor rate limit headers in API responses

---

### Getting Help

**Documentation:**
- This configuration guide
- [SECURITY.md](./SECURITY.md) for security guidelines
- [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment procedures
- [README.md](./README.md) for general setup

**Support Channels:**
- Development team contact
- Issue tracker for bugs
- Internal documentation wiki
- Emergency contact for critical issues

**External Documentation:**
- [Next.js Documentation](https://nextjs.org/docs)
- [Vercel Platform Documentation](https://vercel.com/docs)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Drizzle ORM Documentation](https://orm.drizzle.team/docs)
- [Qdrant Documentation](https://qdrant.tech/documentation/)

---

## Configuration Change Log

Maintain a log of major configuration changes:

| Date | Change | Author | Reason |
|------|--------|--------|--------|
| 2026-02-24 | Initial configuration documentation | System | SSD-4.1.05 compliance |
| - | - | - | - |

---

**Document Version:** 1.0  
**Last Updated:** 2026-02-24  
**Next Review:** 2026-05-24 (Quarterly review recommended)
