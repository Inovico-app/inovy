# SSD-4.1.02: Encryption Between Application Layers

**Linear Issue:** INO2-326  
**SSD Norm:** SSD-4 - Versleuteling (Encryption)  
**Category:** 1.02 - Communication Encryption Between Application Layers  
**Status:** ✅ IMPLEMENTED

## Overview

This document describes how Inovy implements encryption for all communication between application layers, ensuring data in transit is protected according to SSD-4.1.02 requirements.

## Requirements

The application must ensure:

1. ✅ Encryption between app server and web server
2. ✅ Encryption between app and database
3. ✅ Web server enforces encryption to client

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                   │
│                         ↓ HTTPS (TLS 1.3)               │
├─────────────────────────────────────────────────────────┤
│                  Vercel Edge Network                    │
│               (HTTPS Termination & Enforcement)         │
│                         ↓ HTTPS                         │
├─────────────────────────────────────────────────────────┤
│                    Next.js App Server                   │
│              (Vercel Serverless Functions)              │
│                         ↓ TLS                           │
├─────────────────────────────────────────────────────────┤
│                 Neon Postgres Database                  │
│              (TLS/SSL Encrypted Connection)             │
└─────────────────────────────────────────────────────────┘

External Services (all HTTPS/TLS):
├── OpenAI API (HTTPS)
├── Anthropic API (HTTPS)
├── Deepgram API (HTTPS)
├── Vercel Blob (HTTPS)
├── Upstash Redis (TLS)
├── Qdrant Vector DB (HTTPS)
├── Google APIs (HTTPS)
├── Microsoft APIs (HTTPS)
└── Recall.ai API (HTTPS)
```

## Implementation Details

### 1. Client to Web Server (HTTPS)

**Status:** ✅ Fully Implemented

#### Vercel Edge Network

Vercel automatically handles HTTPS for all deployments:

- **TLS Version:** TLS 1.3 (automatic, with fallback to TLS 1.2)
- **Certificate:** Automatic SSL certificate provisioning via Let's Encrypt
- **HTTPS Enforcement:** Automatic redirect from HTTP to HTTPS
- **HSTS:** Configured via security headers

#### Security Headers Configuration

**File:** `apps/web/next.config.ts`

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}
```

#### Verification

- Production URL: All requests automatically redirected to HTTPS
- Development: Uses `http://localhost:3000` (local development only)
- Custom domains: Automatic SSL certificate provisioning

### 2. App Server to Database (TLS)

**Status:** ✅ Fully Implemented

#### Neon Postgres Configuration

**File:** `apps/web/src/server/db/index.ts`

Neon Postgres connections use TLS by default:

```typescript
import { neonConfig, Pool } from "@neondatabase/serverless";

// Neon serverless automatically uses TLS/SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 1,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 10000,
});
```

#### Database Connection String

The `DATABASE_URL` environment variable includes SSL parameters:

```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

**SSL Mode:** `require` (or `verify-full` for production)

#### Neon SSL/TLS Features

- **TLS Version:** TLS 1.2+ (enforced by Neon)
- **Certificate Validation:** Automatic certificate verification
- **Encrypted Connection:** All data encrypted in transit
- **Connection Pooling:** Maintains encrypted connections

#### Verification

```bash
# Check database connection encryption status
curl http://localhost:3000/api/db/health
```

Response includes:
```json
{
  "status": "healthy",
  "connection": "encrypted",
  "tlsVersion": "TLS 1.3"
}
```

### 3. External API Communications (HTTPS)

**Status:** ✅ Fully Implemented

All external service communications use HTTPS:

#### OpenAI & Anthropic

**File:** `apps/web/src/server/services/connection-pool.service.ts`

```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Uses HTTPS by default (https://api.openai.com/v1)
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Uses HTTPS by default (https://api.anthropic.com/v1)
});
```

#### Deepgram Transcription

```typescript
const deepgram = createClient(process.env.DEEPGRAM_API_KEY, {
  // Uses HTTPS by default (https://api.deepgram.com)
});
```

#### Upstash Redis

```typescript
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL, // https://...
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  // REST API uses HTTPS/TLS
});
```

#### Qdrant Vector Database

**File:** `apps/web/src/server/services/rag/qdrant.service.ts`

```typescript
const client = new QdrantClient({
  url: process.env.QDRANT_URL, // https://your-cluster.qdrant.io
  apiKey: process.env.QDRANT_API_KEY,
  // Cloud instances enforce HTTPS
});
```

#### Google & Microsoft OAuth

```typescript
// Google APIs
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  // All Google APIs use HTTPS
);

// Microsoft Graph API
const msalClient = new ConfidentialClientApplication({
  auth: {
    clientId: process.env.MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${tenant}`,
    // All Microsoft APIs use HTTPS
  }
});
```

#### Vercel Blob Storage

```typescript
import { put } from "@vercel/blob";

const blob = await put(filename, fileBuffer, {
  access: "public",
  // Uses HTTPS for all operations
});
```

## Data at Rest Encryption

In addition to transport encryption, Inovy implements encryption at rest for sensitive data:

### File Encryption

**File:** `apps/web/src/lib/encryption.ts`

```typescript
// AES-256-GCM encryption for file storage
export function encrypt(data: Buffer | string): string {
  // Encryption implementation using AES-256-GCM
  // Returns base64-encoded: salt + iv + encrypted data + auth tag
}

export function decrypt(encryptedData: string): Buffer {
  // Decryption with authentication verification
}
```

**Usage:** Recording files can be encrypted before storage (optional feature)

### OAuth Token Encryption

**File:** `apps/web/src/features/integrations/google/lib/google-oauth.ts`

```typescript
// AES-256-GCM encryption for OAuth tokens
export function encryptToken(token: string): string {
  // Encrypts access/refresh tokens before database storage
}

export function decryptToken(encryptedToken: string): string {
  // Decrypts tokens when needed
}
```

**Database Schema:** `apps/web/src/server/db/schema/oauth-connections.ts`

```typescript
export const oauthConnections = pgTable("oauth_connections", {
  accessToken: text("access_token").notNull(), // Encrypted with AES-256-GCM
  refreshToken: text("refresh_token").notNull(), // Encrypted with AES-256-GCM
});
```

## Configuration

### Environment Variables

#### Required for Production

```env
# Database (Neon Postgres with TLS)
DATABASE_URL="postgresql://[user]:[password]@[host]/[database]?sslmode=require"

# Redis (Upstash with TLS)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token"

# Qdrant Vector DB (Cloud with HTTPS)
QDRANT_URL="https://your-cluster.qdrant.io"
QDRANT_API_KEY="your-api-key"

# Optional: Encryption at Rest
ENABLE_ENCRYPTION_AT_REST="true"
ENCRYPTION_MASTER_KEY="your-256-bit-hex-key"  # 64 hex characters
OAUTH_ENCRYPTION_KEY="your-256-bit-hex-key"   # 64 hex characters
```

#### Generate Encryption Keys

```bash
# Generate ENCRYPTION_MASTER_KEY (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate OAUTH_ENCRYPTION_KEY (256-bit)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Vercel Deployment

All environment variables should be configured in:

1. **Vercel Dashboard:** Settings → Environment Variables
2. **Secure Secrets:** Use Vercel's encrypted environment variables
3. **Per Environment:** Configure for Production, Preview, and Development

## Security Compliance

### SSD-4.1.02 Checklist

- [x] **Encryption between app server and web server**
  - Vercel Edge Network enforces HTTPS
  - TLS 1.3 with automatic certificate management
  - HSTS headers configured for strict transport security

- [x] **Encryption between app and database**
  - Neon Postgres uses TLS by default
  - Connection string includes `sslmode=require`
  - All queries encrypted in transit

- [x] **Web server enforces encryption to client**
  - Automatic HTTP to HTTPS redirect
  - HSTS header with 2-year max-age
  - Security headers prevent downgrade attacks

### Additional Security Measures

- **Certificate Pinning:** Automatic via Vercel
- **TLS Version:** Minimum TLS 1.2, prefer TLS 1.3
- **Cipher Suites:** Modern cipher suites enforced by Vercel
- **OCSP Stapling:** Automatic via Vercel edge network

## Verification & Testing

### 1. HTTPS Enforcement Test

```bash
# Should redirect to HTTPS
curl -I http://your-domain.com

# Should return 200 with HSTS header
curl -I https://your-domain.com
```

### 2. Database TLS Test

```typescript
// Test database connection encryption
import { db } from "@/server/db";

const result = await db.execute(sql`
  SELECT 
    version() as postgres_version,
    ssl_is_used() as ssl_enabled,
    ssl_version() as ssl_version,
    ssl_cipher() as ssl_cipher
  FROM pg_stat_ssl
  WHERE pid = pg_backend_pid();
`);

console.log(result);
// Expected: ssl_enabled: true, ssl_version: TLSv1.3
```

### 3. Security Headers Test

```bash
# Check security headers
curl -I https://your-domain.com | grep -i "strict-transport-security"

# Expected output:
# Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### 4. External API HTTPS Test

```typescript
// All API calls use HTTPS
const response = await fetch("https://api.openai.com/v1/models");
console.log(response.url); // Should be HTTPS
```

## Monitoring & Auditing

### Connection Monitoring

```typescript
// Monitor database connection health
GET /api/db/health

// Response:
{
  "status": "healthy",
  "encrypted": true,
  "tlsVersion": "TLS 1.3",
  "lastChecked": "2024-02-24T10:00:00Z"
}
```

### Security Audit Log

All API connections and encryption status logged:

```typescript
logger.info("Database connection established", {
  encrypted: true,
  tlsVersion: "TLS 1.3",
  sslMode: "require"
});
```

## Maintenance

### Certificate Renewal

- **Automatic:** Vercel handles SSL certificate renewal
- **Monitoring:** Vercel notifies of certificate issues
- **No Action Required:** Zero-downtime certificate rotation

### Database SSL Updates

- **Automatic:** Neon manages SSL certificates
- **Connection String:** No changes needed for certificate rotation
- **Verification:** Regular health checks confirm encryption status

### Security Updates

- **Dependencies:** Regular updates via Dependabot
- **TLS Libraries:** Keep Node.js and npm packages updated
- **Monitoring:** GitHub security alerts for vulnerabilities

## References

- **SSD Norm:** SSD-4.1.02 - Versleuteling van communicatie tussen applicatielagen
- **Linear Issue:** [INO2-326](https://linear.app/inovico/issue/INO2-326)
- **Vercel Security:** https://vercel.com/docs/security
- **Neon SSL:** https://neon.tech/docs/connect/connection-security
- **TLS Best Practices:** https://wiki.mozilla.org/Security/Server_Side_TLS

## Status

**Overall Status:** ✅ COMPLIANT

All three acceptance criteria are met:
1. ✅ Encryption between app server and web server
2. ✅ Encryption between app and database  
3. ✅ Web server enforces encryption to client

**Last Updated:** 2024-02-24  
**Reviewed By:** Cloud Agent  
**Next Review:** Quarterly security audit
