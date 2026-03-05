# Service Control Configuration
## SSD-1.3.02: Service Control Mechanisms

**Last Updated:** 2026-02-24  
**Status:** Active  
**Compliance:** SSD-1.3.02 - Mechanisms to enable/disable services

---

## Overview

This document describes the mechanisms available to control which services are enabled in the Inovy application. Multiple control layers ensure fine-grained control over service availability.

---

## Control Layers

### 1. Environment Variables (Application-Wide)

Environment variables control services at the application level. These settings apply to all organizations.

#### Security & Encryption
```bash
# Enable/disable encryption at rest
ENABLE_ENCRYPTION_AT_REST=true|false

# Encryption master key (required if encryption enabled)
ENCRYPTION_MASTER_KEY=your-256-bit-key-here
```

#### Authentication
```bash
# Better Auth configuration
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=https://your-app.com

# OAuth providers (optional - disable by not setting)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret
```

#### Bot & Meeting Services
```bash
# Recall.ai integration (optional - disable by not setting)
RECALL_API_KEY=your-recall-api-key
RECALL_WEBHOOK_SECRET=your-webhook-secret

# Bot settings
BOT_DEFAULT_TRANSCRIPTION_PROVIDER=deepgram|assemblyai
```

#### AI Services
```bash
# AI providers (at least one required for chat features)
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key

# Vector database (required for RAG features)
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=your-qdrant-api-key

# Reranking service (optional - improves search quality)
HUGGINGFACE_API_KEY=your-huggingface-key
```

#### Transcription Services
```bash
# Deepgram transcription (required for transcription)
DEEPGRAM_API_KEY=your-deepgram-key

# Assembly AI (alternative transcription provider)
ASSEMBLYAI_API_KEY=your-assemblyai-key
```

#### Google Workspace Integration
```bash
# Google integrations (optional - disable by not setting)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://your-app.com/api/integrations/google/callback
```

#### Cron Jobs
```bash
# Cron job authentication
CRON_SECRET=your-cron-secret

# Cron job URLs (for external cron services)
CRON_CALENDAR_MONITOR_URL=/api/cron/monitor-calendar
CRON_DRIVE_WATCH_RENEWAL_URL=/api/cron/renew-drive-watches
CRON_BOT_STATUS_POLL_URL=/api/cron/poll-bot-status
```

#### Rate Limiting
```bash
# Redis for rate limiting
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Rate limit tiers (requests per hour)
RATE_LIMIT_FREE_MAX_REQUESTS=100
RATE_LIMIT_FREE_MAX_COST=10000
RATE_LIMIT_PRO_MAX_REQUESTS=1000
RATE_LIMIT_PRO_MAX_COST=100000
```

#### Monitoring & Observability
```bash
# Sentry error tracking (optional)
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

---

### 2. Per-Organization Settings (Database)

Organizations can control certain features independently through database configuration.

#### Agent Settings

Control AI chat features per organization:

```typescript
// Schema: organization_settings table
interface OrganizationSettings {
  organizationId: string;
  agentEnabled: boolean;              // Enable/disable AI chat
  agentModel: string;                 // Default model (gpt-4, claude-3, etc.)
  agentTemperature: number;           // Response creativity (0-1)
  agentMaxTokens: number;             // Max response length
  agentSystemPrompt: string | null;   // Custom system prompt
  customInstructions: string | null;  // Organization-specific instructions
}
```

**Control via Server Action:**
```typescript
// apps/web/src/features/admin/actions/update-agent-settings.ts
import { updateAgentSettingsAction } from "@/features/admin/actions/update-agent-settings";

// Disable agent for organization
await updateAgentSettingsAction({
  organizationId: "org_xxx",
  agentEnabled: false
});
```

**Control via SQL:**
```sql
-- Disable agent for specific organization
UPDATE organization_settings
SET agent_enabled = false
WHERE organization_id = 'org_xxx';

-- Disable agent for all organizations
UPDATE organization_settings
SET agent_enabled = false;
```

#### Bot Settings

Control meeting bot features per organization:

```typescript
// Schema: bot_settings table
interface BotSettings {
  organizationId: string;
  botEnabled: boolean;                // Enable/disable bot
  autoJoinMeetings: boolean;          // Auto-join calendar meetings
  transcriptionProvider: string;      // deepgram, assemblyai
  summarizationEnabled: boolean;      // Auto-generate summaries
  taskExtractionEnabled: boolean;     // Auto-extract tasks
}
```

**Control via SQL:**
```sql
-- Disable bot for specific organization
UPDATE bot_settings
SET bot_enabled = false
WHERE organization_id = 'org_xxx';

-- Disable auto-join for all organizations
UPDATE bot_settings
SET auto_join_meetings = false;
```

#### Integration Settings

Control third-party integrations per organization:

```typescript
// Schema: integration_settings table
interface IntegrationSettings {
  organizationId: string;
  googleDriveEnabled: boolean;
  googleCalendarEnabled: boolean;
  gmailEnabled: boolean;
}
```

**Control via SQL:**
```sql
-- Disable Google Drive for organization
UPDATE integration_settings
SET google_drive_enabled = false
WHERE organization_id = 'org_xxx';
```

---

### 3. User-Level Controls (OAuth Connections)

Users must explicitly connect their accounts to enable integrations.

#### OAuth Connection Flow
1. User clicks "Connect Google" in settings
2. OAuth flow redirects to Google
3. User grants permissions
4. Connection stored in `oauth_connections` table
5. Services only work for users with active connections

**Control Mechanism:**
- Users control their own OAuth connections
- Disconnecting removes integration access
- Organization settings can override user connections

**Check Connection:**
```typescript
// Check if user has Google connection
const connection = await db.query.oauthConnections.findFirst({
  where: and(
    eq(oauthConnections.userId, userId),
    eq(oauthConnections.provider, 'google'),
    eq(oauthConnections.status, 'active')
  )
});
```

---

### 4. Role-Based Access Control (RBAC)

Certain services are restricted based on user roles.

#### Role Hierarchy
```
Super Admin (internal)
├── Organization Owner
│   ├── Organization Admin
│   │   ├── Organization Member
│   │   └── Organization Guest
```

#### Permission Matrix

| Service/Feature | Guest | Member | Admin | Owner | Super Admin |
|-----------------|-------|--------|-------|-------|-------------|
| View own recordings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload recordings | ❌ | ✅ | ✅ | ✅ | ✅ |
| View all recordings | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete recordings | ❌ | Own only | ✅ | ✅ | ✅ |
| Chat with agent | ❌ | ✅ | ✅ | ✅ | ✅ |
| Organization chat | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage projects | ❌ | ✅ | ✅ | ✅ | ✅ |
| Manage members | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage settings | ❌ | ❌ | ✅ | ✅ | ✅ |
| Manage billing | ❌ | ❌ | ❌ | ✅ | ✅ |
| Bot management | ❌ | ❌ | ✅ | ✅ | ✅ |
| Integration management | ❌ | ❌ | ✅ | ✅ | ✅ |
| Export data | ❌ | Own only | All data | All data | All data |
| View audit logs | ❌ | ❌ | ✅ | ✅ | ✅ |
| System administration | ❌ | ❌ | ❌ | ❌ | ✅ |

**Implementation:**
```typescript
// Server action with permission check
export const deleteRecordingAction = authorizedActionClient
  .metadata({ actionName: "deleteRecording", requiredPermission: "recording.delete" })
  .schema(deleteRecordingSchema)
  .action(async ({ parsedInput, ctx }) => {
    // Permission check happens in middleware
    // Organization isolation enforced automatically
  });
```

---

### 5. Feature Flags (Code-Level)

Feature flags in code control experimental or beta features.

#### Implementation Pattern
```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS = {
  ENABLE_MCP_ENDPOINT: process.env.ENABLE_MCP_ENDPOINT === 'true',
  ENABLE_EXPERIMENTAL_CHAT: process.env.ENABLE_EXPERIMENTAL_CHAT === 'true',
  ENABLE_ADVANCED_ANALYTICS: process.env.ENABLE_ADVANCED_ANALYTICS === 'true',
  ENABLE_AI_INSIGHTS: process.env.ENABLE_AI_INSIGHTS === 'true',
} as const;
```

#### Usage in Routes
```typescript
// app/api/mcp/[transport]/route.ts
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export async function POST(req: Request) {
  if (!FEATURE_FLAGS.ENABLE_MCP_ENDPOINT) {
    return NextResponse.json(
      { error: "MCP endpoint is disabled" },
      { status: 403 }
    );
  }
  // ... rest of handler
}
```

#### Usage in Components
```typescript
// components/experimental-feature.tsx
import { FEATURE_FLAGS } from "@/lib/feature-flags";

export function ExperimentalFeature() {
  if (!FEATURE_FLAGS.ENABLE_EXPERIMENTAL_CHAT) {
    return null;
  }
  return <div>Experimental feature</div>;
}
```

---

### 6. Rate Limiting (Abuse Prevention)

Rate limiting controls prevent abuse and manage costs.

#### Rate Limit Tiers

**Free Tier:**
- 100 requests per hour
- 10,000 cost units per hour
- Chat: 20 messages per hour
- Upload: 5 recordings per hour

**Pro Tier:**
- 1,000 requests per hour
- 100,000 cost units per hour
- Chat: 200 messages per hour
- Upload: 50 recordings per hour

#### Implementation
```typescript
// Rate limiting middleware
import { RateLimiterService } from "@/server/services/rate-limiter-service";

export async function rateLimit(userId: string, endpoint: string) {
  const limiter = new RateLimiterService();
  const result = await limiter.checkLimit(userId, endpoint);
  
  if (!result.allowed) {
    throw new Error(`Rate limit exceeded. Reset at ${result.resetAt}`);
  }
}
```

---

## Service Control Reference

### Quick Reference: How to Disable Services

| Service | Control Method | Action |
|---------|----------------|--------|
| AI Chat (All Orgs) | Environment Variable | Remove `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` |
| AI Chat (One Org) | Database | Set `agent_enabled = false` in `organization_settings` |
| Meeting Bot | Environment Variable | Remove `RECALL_API_KEY` |
| Meeting Bot (One Org) | Database | Set `bot_enabled = false` in `bot_settings` |
| Google Integrations | Environment Variable | Remove `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` |
| Google Drive (One Org) | Database | Set `google_drive_enabled = false` in `integration_settings` |
| Transcription | Environment Variable | Remove `DEEPGRAM_API_KEY` |
| Vector Search | Environment Variable | Remove `QDRANT_URL` and `QDRANT_API_KEY` |
| Encryption at Rest | Environment Variable | Set `ENABLE_ENCRYPTION_AT_REST=false` |
| MCP Endpoint | Environment Variable | Set `ENABLE_MCP_ENDPOINT=false` or remove variable |
| Analytics | Environment Variable | Remove `NEXT_PUBLIC_POSTHOG_KEY` |
| Error Tracking | Environment Variable | Remove `NEXT_PUBLIC_SENTRY_DSN` |
| Cron Jobs | Environment Variable | Remove `CRON_SECRET` |
| Rate Limiting | Environment Variable | Remove `UPSTASH_REDIS_REST_URL` (not recommended) |

---

## Emergency Disable Procedures

### Critical Service Disable

If a service must be disabled immediately:

#### Method 1: Environment Variable (Requires Restart)
```bash
# Update environment variable in hosting platform
# Example: Vercel, Railway, AWS, etc.

# Redeploy application
# Service disabled on next request
```

#### Method 2: Database (Immediate Effect)
```sql
-- Disable AI chat for all organizations
UPDATE organization_settings SET agent_enabled = false;

-- Disable bot for all organizations
UPDATE bot_settings SET bot_enabled = false;

-- Disable specific integration for all organizations
UPDATE integration_settings 
SET google_drive_enabled = false;
```

#### Method 3: Code-Level Feature Flag (Requires Deployment)
```typescript
// lib/feature-flags.ts
export const FEATURE_FLAGS = {
  ENABLE_MCP_ENDPOINT: false, // Force disabled
  // ...
};
```

**Deployment Time:**
- Environment variable: 30 seconds - 5 minutes
- Database update: Immediate
- Code change: 5-15 minutes (build + deploy)

---

## Production Hardening Checklist

Before deploying to production, ensure:

### Required Security Controls
- [ ] `ENABLE_ENCRYPTION_AT_REST=true`
- [ ] Strong `BETTER_AUTH_SECRET` (32+ characters)
- [ ] `CRON_SECRET` set and secure
- [ ] Rate limiting configured (`UPSTASH_REDIS_REST_URL` set)
- [ ] All API keys rotated and unique per environment
- [ ] No default/example credentials in use

### Optional Services (Enable Only If Required)
- [ ] Bot services (`RECALL_API_KEY`) - Only if automated recording needed
- [ ] Google integrations - Only if Drive/Calendar integration needed
- [ ] Analytics (`NEXT_PUBLIC_POSTHOG_KEY`) - Only if analytics required
- [ ] Error tracking (`NEXT_PUBLIC_SENTRY_DSN`) - Recommended but optional

### Disabled in Production
- [ ] `ENABLE_MCP_ENDPOINT=false` or not set
- [ ] `ENABLE_EXPERIMENTAL_CHAT=false` or not set
- [ ] No development/debug endpoints exposed
- [ ] No test/demo accounts with elevated privileges

### Database Security
- [ ] Organization isolation enforced in all queries
- [ ] Row-level security policies active
- [ ] Sensitive data encrypted (if encryption enabled)
- [ ] Audit logging enabled for sensitive operations

---

## Monitoring Service Status

### Health Check Endpoints

```bash
# Check vector database status
curl https://your-app.com/api/qdrant/health

# Check connection pool status
curl https://your-app.com/api/connection-pool/health
```

### Service Status Dashboard

Create a monitoring dashboard that shows:
- [ ] Active services count
- [ ] Disabled services count
- [ ] Per-organization service usage
- [ ] Rate limit status
- [ ] Error rates per service
- [ ] Service dependency status

### Automated Alerts

Set up alerts for:
- Service failures (5xx errors)
- Rate limit violations
- Unauthorized access attempts
- Missing required environment variables
- Database connection failures
- Third-party API failures

---

## Configuration Management

### Environment-Specific Configuration

**Development:**
```bash
# Relaxed controls for development
ENABLE_MCP_ENDPOINT=true
ENABLE_EXPERIMENTAL_CHAT=true
RATE_LIMIT_FREE_MAX_REQUESTS=1000
```

**Staging:**
```bash
# Production-like with some debug features
ENABLE_MCP_ENDPOINT=false
ENABLE_EXPERIMENTAL_CHAT=true
RATE_LIMIT_FREE_MAX_REQUESTS=100
```

**Production:**
```bash
# Strict production settings
ENABLE_MCP_ENDPOINT=false
ENABLE_EXPERIMENTAL_CHAT=false
ENABLE_ENCRYPTION_AT_REST=true
RATE_LIMIT_FREE_MAX_REQUESTS=100
```

### Configuration Validation

Create a startup check to validate configuration:

```typescript
// lib/validate-config.ts
export function validateProductionConfig() {
  const errors: string[] = [];
  
  // Required for production
  if (!process.env.BETTER_AUTH_SECRET) {
    errors.push("BETTER_AUTH_SECRET is required");
  }
  
  if (!process.env.ENCRYPTION_MASTER_KEY && process.env.ENABLE_ENCRYPTION_AT_REST === 'true') {
    errors.push("ENCRYPTION_MASTER_KEY required when encryption is enabled");
  }
  
  // Should be disabled in production
  if (process.env.ENABLE_MCP_ENDPOINT === 'true') {
    console.warn("WARNING: MCP endpoint is enabled in production");
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors: ${errors.join(', ')}`);
  }
}
```

---

## Related Documents
- [Service Inventory](./SERVICE_INVENTORY.md)
- [Service Audit Process](./SERVICE_AUDIT_PROCESS.md)
- [Security Compliance Checklist](./SECURITY_COMPLIANCE_CHECKLIST.md)

---

**Document Classification:** Internal - Security  
**Review Frequency:** Quarterly  
**Next Review Date:** 2026-05-24
