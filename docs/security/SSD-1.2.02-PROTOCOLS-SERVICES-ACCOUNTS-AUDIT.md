# SSD-1.2.02: Protocols, Services, and Accounts Audit

**Compliance Reference:** SSD-1.2.02 - Deactivate unnecessary protocols, services and accounts  
**Category:** hardeningsrichtlijn  
**Last Updated:** 2026-02-22  
**Status:** ✅ COMPLIANT

## Executive Summary

This document provides a comprehensive audit of all active protocols, services, and accounts in the Inovy application to ensure compliance with SSD-1.2.02. All active components have been verified as necessary for application functionality.

## Compliance Statement

**Requirement (Dutch):** Tijdens de hosting zijn alleen de noodzakelijke protocollen, services en accounts actief; andere protocollen, services en accounts zijn gedeactiveerd of verwijderd.

**Requirement (English):** During hosting, only necessary protocols, services, and accounts are active; other protocols, services, and accounts are deactivated or removed.

### Compliance Status: ✅ COMPLIANT

- ✅ Only necessary protocols active during hosting
- ✅ Unused services deactivated
- ✅ Unused accounts removed or disabled
- ✅ Infrastructure managed by Vercel with security defaults
- ✅ No unnecessary API routes or endpoints exposed
- ✅ All services have documented business justification

---

## 1. Active Network Protocols

### 1.1 HTTP/HTTPS
- **Status:** ACTIVE (Required)
- **Purpose:** Primary application protocol for web traffic
- **Configuration:** 
  - HTTPS enforced by Vercel platform
  - Automatic HTTP to HTTPS redirect
  - TLS 1.3 support
- **Justification:** Essential for web application delivery
- **Security Controls:**
  - TLS encryption enforced
  - Modern cipher suites only
  - HSTS headers configured (via Vercel)

### 1.2 WebSocket (WSS)
- **Status:** ACTIVE (Required)
- **Purpose:** Real-time transcription streaming
- **Endpoints:** 
  - `/api/transcribe/live`
- **Justification:** Required for live transcription feature
- **Security Controls:**
  - WSS (WebSocket Secure) with TLS encryption
  - Authentication required via Better Auth session
  - Rate limiting applied
  - Connection timeout enforced

### 1.3 OAuth 2.0
- **Status:** ACTIVE (Required)
- **Purpose:** Third-party authentication and authorization
- **Providers:**
  - Google Workspace (OAuth 2.0)
  - Microsoft 365 (OAuth 2.0)
- **Justification:** Required for social authentication and workspace integrations
- **Security Controls:**
  - Authorization code flow with PKCE
  - State parameter for CSRF protection
  - Token refresh with rotation
  - Secure token storage in database

### 1.4 Webhook Protocol (HTTPS POST)
- **Status:** ACTIVE (Required)
- **Purpose:** Receive events from external services
- **Endpoints:**
  - `/api/webhooks/google-drive` - Google Drive file change notifications
  - `/api/webhooks/recall` - Recall.ai meeting bot events
- **Justification:** Required for real-time integration updates
- **Security Controls:**
  - Signature verification (HMAC)
  - Request origin validation
  - Replay attack prevention
  - Rate limiting per source

### 1.5 Deactivated/Not Used Protocols

The following protocols are explicitly NOT used:
- ❌ FTP/FTPS - No file transfer protocol exposed
- ❌ SSH - No direct server access (managed by Vercel)
- ❌ Telnet - Insecure protocol, not used
- ❌ SMTP direct - Email via Resend API only
- ❌ RDP - No remote desktop protocol
- ❌ SNMP - No network management protocol
- ❌ LDAP - No directory service protocol
- ❌ Custom proprietary protocols - None implemented

---

## 2. Active Services and APIs

### 2.1 API Route Inventory

All API routes are documented and justified below:

#### Authentication Services
| Route | Method | Purpose | Justification |
|-------|--------|---------|---------------|
| `/api/auth/[...all]` | GET, POST | Better Auth endpoints | Required for authentication |

#### AI Processing Services
| Route | Method | Purpose | Justification |
|-------|--------|---------|---------------|
| `/api/transcribe/[recordingId]` | POST | Recording transcription | Core AI feature |
| `/api/transcribe/live` | WebSocket | Live transcription | Real-time feature |
| `/api/summarize/[recordingId]` | POST | AI summarization | Core AI feature |
| `/api/extract-tasks/[recordingId]` | POST | Task extraction | Core AI feature |

#### Chat Services
| Route | Method | Purpose | Justification |
|-------|--------|---------|---------------|
| `/api/chat` | POST | AI chat interface | Core AI feature |
| `/api/chat/[projectId]` | POST | Project-scoped chat | Core AI feature |
| `/api/chat/organization` | POST | Organization chat | Core AI feature |
| `/api/chat/export/[conversationId]` | GET | Chat export | GDPR compliance |

#### Recording Management
| Route | Method | Purpose | Justification |
|-------|--------|---------|---------------|
| `/api/recordings/upload` | POST | Recording upload | Core functionality |
| `/api/recordings/[recordingId]/playback` | GET | Audio playback | Core functionality |

#### Integration Services
| Route | Method | Purpose | Justification |
|-------|--------|---------|---------------|
| `/api/integrations/google/authorize` | GET | Google OAuth | Workspace integration |
| `/api/integrations/google/callback` | GET | OAuth callback | OAuth flow completion |
| `/api/integrations/google/drive/watch/start` | POST | Drive monitoring | File sync feature |
| `/api/integrations/google/drive/watch/stop` | POST | Stop monitoring | Resource cleanup |
| `/api/integrations/google/drive/watch/list` | GET | List watches | Drive management |

#### Webhook Handlers
| Route | Method | Purpose | Justification |
|-------|--------|---------|---------------|
| `/api/webhooks/google-drive` | POST | Drive notifications | Real-time file sync |
| `/api/webhooks/recall` | POST | Meeting bot events | Recall.ai integration |

#### Knowledge Base Services
| Route | Method | Purpose | Justification |
|-------|--------|---------|---------------|
| `/api/agent/knowledge-base` | GET, POST | KB management | AI context retrieval |
| `/api/agent/knowledge-base/preview` | POST | Content preview | KB content display |
| `/api/agent/knowledge-base/reindex` | POST | Reindex content | Vector DB updates |
| `/api/embeddings/index` | POST | Generate embeddings | Vector search feature |

#### Scheduled Tasks (Cron Jobs)
| Route | Schedule | Purpose | Justification |
|-------|----------|---------|---------------|
| `/api/cron/renew-drive-watches` | Daily 00:00 | Renew Drive watches | Maintain integrations |
| `/api/cron/monitor-calendar` | Daily 00:00 | Calendar monitoring | Calendar sync feature |
| `/api/cron/poll-bot-status` | Daily 00:00 | Bot status check | Recall.ai monitoring |

#### Health Check and Monitoring
| Route | Method | Purpose | Justification |
|-------|--------|---------|---------------|
| `/api/qdrant/health` | GET | Vector DB health | System monitoring |
| `/api/connection-pool/health` | GET | Database health | System monitoring |

#### Notification Services
| Route | Method | Purpose | Justification |
|-------|--------|---------|---------------|
| `/api/notifications/unread-count` | GET | Notification count | User notifications |

#### GDPR Compliance
| Route | Method | Purpose | Justification |
|-------|--------|---------|---------------|
| `/api/gdpr-export/[exportId]` | GET | Data export | GDPR compliance |

#### MCP (Model Context Protocol)
| Route | Method | Purpose | Justification |
|-------|--------|---------|---------------|
| `/api/mcp/[transport]` | GET, POST | MCP server | AI agent integration |

#### OAuth Protected Resource
| Route | Method | Purpose | Justification |
|-------|--------|---------|---------------|
| `/api/.well-known/oauth-protected-resource` | GET | OAuth discovery | OAuth 2.0 spec |

**Total API Routes:** 31  
**Unnecessary Routes:** 0  
**Justification Coverage:** 100%

### 2.2 Deactivated/Removed Services

The following services are explicitly NOT enabled:
- ❌ Database direct access - All access via application layer
- ❌ File system access - Cloud storage (Vercel Blob) only
- ❌ Shell access - Serverless platform (no shell)
- ❌ Admin database tools - Drizzle Studio local only
- ❌ Debug endpoints - Development only, removed in production
- ❌ Test endpoints - Not deployed to production
- ❌ Sample/demo endpoints - Not created
- ❌ GraphQL endpoint - REST API only
- ❌ SOAP services - Not used
- ❌ RPC services - Not used

---

## 3. Active Accounts and Roles

### 3.1 User Account Types

#### Application User Accounts
- **Type:** Better Auth managed user accounts
- **Purpose:** End-user authentication and authorization
- **Management:** Self-service registration and authentication
- **Security Controls:**
  - Email verification required
  - Password complexity enforced
  - MFA available (Passkey/WebAuthn)
  - Account lockout after failed attempts
  - Session timeout configured (7 days)

#### User Roles (RBAC)
| Role | Purpose | Permissions | Justification |
|------|---------|-------------|---------------|
| `owner` | Organization creator | Full organization control | Required for org management |
| `admin` | Organization administrator | User management, settings | Required for delegation |
| `superadmin` | System administrator | Global admin features | Required for platform ops |
| `manager` | Project manager | Project/team management | Required for team leads |
| `user` | Standard user | Basic functionality | Default user access |
| `viewer` | Read-only access | View-only permissions | Limited access use case |

**All roles are necessary and actively used.**

### 3.2 Service Accounts

#### OAuth Service Accounts (Application Credentials)
| Service | Purpose | Credential Type | Justification |
|---------|---------|----------------|---------------|
| Google OAuth | Workspace integration | OAuth 2.0 Client ID/Secret | Google sign-in and APIs |
| Microsoft OAuth | Microsoft 365 integration | OAuth 2.0 Client ID/Secret | Microsoft sign-in and APIs |
| Stripe | Payment processing | API Key | Subscription management |

#### API Service Keys
| Service | Purpose | Key Type | Justification |
|---------|---------|----------|---------------|
| OpenAI | AI model access | API Key | GPT models for AI features |
| Anthropic | Claude model access | API Key | Claude models for AI features |
| Deepgram | Transcription service | API Key | Audio transcription |
| Resend | Email delivery | API Key | Transactional emails |
| Upstash Redis | Cache service | REST URL + Token | Caching layer |
| Qdrant | Vector database | URL + API Key | Semantic search |
| Vercel Blob | File storage | Read/Write Token | File uploads |

**All service accounts are necessary and actively used.**

### 3.3 Database Accounts

- **Primary Database:** PostgreSQL (Neon serverless)
  - **Account:** Application database user
  - **Purpose:** Application data access
  - **Permissions:** Read/Write on application schema only
  - **Security:** Connection string with TLS, no direct access
  
- **No additional database accounts exist**
  - No test accounts
  - No legacy accounts
  - No shared accounts
  - No default accounts (postgres, admin, etc.)

### 3.4 Deactivated/Removed Accounts

The following account types are explicitly NOT present:
- ❌ Default system accounts - All removed
- ❌ Test accounts - Not created in production
- ❌ Demo accounts - Not created
- ❌ Shared accounts - Not permitted
- ❌ Service accounts without purpose - None exist
- ❌ Legacy accounts - All removed
- ❌ Guest accounts - Not implemented
- ❌ Anonymous accounts - Not permitted (authentication required)

---

## 4. External Dependencies and Integrations

### 4.1 Required External Services

| Service | Purpose | Security Controls | Justification |
|---------|---------|-------------------|---------------|
| Vercel | Hosting platform | Managed infrastructure, DDoS protection | Application hosting |
| Neon | PostgreSQL database | Encryption at rest/transit, connection pooling | Data persistence |
| Upstash Redis | Caching layer | TLS encryption, password auth | Performance optimization |
| Qdrant Cloud | Vector database | API key auth, TLS encryption | Semantic search |
| Vercel Blob | File storage | Signed URLs, access control | File management |
| Resend | Email delivery | API key auth, DKIM/SPF | Email functionality |
| OpenAI | AI models | API key auth, rate limiting | AI processing |
| Anthropic | AI models | API key auth, rate limiting | AI processing |
| Deepgram | Transcription | API key auth, secure streaming | Audio transcription |
| Google Workspace | Integration | OAuth 2.0, token refresh | Calendar/Drive features |
| Microsoft 365 | Integration | OAuth 2.0, token refresh | Outlook integration |
| Stripe | Payments | Webhook signatures, API keys | Subscription billing |
| Recall.ai | Meeting bot | Webhook signatures, API keys | Meeting ingestion |

**All external dependencies are necessary and actively used.**

### 4.2 Removed/Not Used Services

- ❌ AWS Services - Using Vercel ecosystem instead
- ❌ Firebase - Not used
- ❌ MongoDB - Using PostgreSQL
- ❌ Elasticsearch - Using Qdrant + PostgreSQL full-text search
- ❌ RabbitMQ/Kafka - Using Vercel Workflow instead
- ❌ Redis pub/sub - Not needed
- ❌ Twilio - No SMS functionality
- ❌ SendGrid - Using Resend instead

---

## 5. Infrastructure Security

### 5.1 Vercel Platform Security

Vercel manages the following infrastructure components with security defaults:
- **Edge Network:** Global CDN with DDoS protection
- **Serverless Functions:** Isolated execution environments
- **Automatic HTTPS:** TLS certificates managed automatically
- **Firewall:** Application-level firewall with rate limiting
- **Network Segmentation:** Isolated function execution
- **Zero Trust:** No permanent infrastructure to attack

### 5.2 Network Security Controls

- **Firewall:** Vercel-managed application firewall
- **Rate Limiting:** Implemented per endpoint and user tier
- **IP Restrictions:** Available via Vercel (not currently configured)
- **DDoS Protection:** Vercel Edge Network protection
- **Network Isolation:** Serverless functions are isolated

### 5.3 Disabled Infrastructure Services

- ❌ SSH access - Not available (serverless platform)
- ❌ FTP services - Not used
- ❌ Database direct access - Application layer only
- ❌ File system access - Cloud storage only
- ❌ Management interfaces - Local development only

---

## 6. Security Verification Procedures

### 6.1 Regular Audits

**Frequency:** Quarterly

**Audit Checklist:**
- [ ] Review all active API endpoints
- [ ] Verify necessity of each service
- [ ] Check for unused accounts
- [ ] Review external dependencies
- [ ] Validate security configurations
- [ ] Check for deprecated protocols
- [ ] Verify rate limiting configurations
- [ ] Review authentication mechanisms

### 6.2 Monitoring and Alerting

**Active Monitoring:**
- API endpoint usage tracking
- Unusual traffic pattern detection
- Failed authentication attempts
- Service health checks
- Integration status monitoring

**Alerting:**
- Unauthorized access attempts
- Service downtime
- API rate limit violations
- Failed webhook deliveries
- Database connection issues

### 6.3 Deactivation Procedures

**Process for deactivating services:**
1. Identify service for deactivation
2. Assess impact on application functionality
3. Document deactivation reason
4. Remove from codebase and configuration
5. Update this audit document
6. Deploy changes
7. Verify deactivation
8. Monitor for issues

---

## 7. Compliance Evidence

### 7.1 Documentation Evidence

- ✅ All API routes documented with justification
- ✅ All services have business purpose
- ✅ All accounts have clear ownership
- ✅ Configuration files reviewed (next.config.ts, vercel.json)
- ✅ Authentication system documented (Better Auth)
- ✅ Integration list maintained
- ✅ This audit document

### 7.2 Technical Evidence

**Code Locations:**
- API routes: `apps/web/src/app/api/`
- Configuration: `apps/web/next.config.ts`, `apps/web/vercel.json`
- Authentication: `apps/web/src/lib/auth.ts`
- Database schema: `apps/web/src/server/db/schema/`

**Version Control:**
- Git repository maintains history of all changes
- No hidden or undocumented endpoints
- All services defined in code

### 7.3 Verification Commands

```bash
# List all API routes
find apps/web/src/app/api -name "route.ts" | wc -l

# Check for unauthorized network services
# (Run on local Docker if applicable)
netstat -tuln | grep LISTEN

# Verify no debug endpoints in production
grep -r "debug\|test" apps/web/src/app/api/

# Check for unused dependencies
pnpm audit
npm outdated
```

---

## 8. Risk Assessment

### 8.1 Current Risk Level: LOW

**Rationale:**
- All protocols are necessary and secure
- No unnecessary services exposed
- All accounts are required and monitored
- Infrastructure managed by secure platform (Vercel)
- Regular security updates applied

### 8.2 Potential Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Unused API route created during development | Low | Medium | Code review process, regular audits |
| Service account credentials exposed | Low | High | Environment variables, secret rotation |
| Unnecessary integration added | Low | Low | Architecture review, documentation |
| Legacy account not removed | Very Low | Low | Account lifecycle management |
| Protocol vulnerability discovered | Low | Medium | Dependency updates, security advisories |

---

## 9. Action Items and Recommendations

### 9.1 Current Action Items

✅ **COMPLETED:**
- All unnecessary protocols deactivated
- All unnecessary services removed
- All unnecessary accounts removed
- Documentation completed
- Audit procedures established

### 9.2 Ongoing Maintenance

**Quarterly Tasks:**
- [ ] Review this audit document
- [ ] Verify all services still necessary
- [ ] Check for new unnecessary services
- [ ] Review external dependencies
- [ ] Update security configurations

**Monthly Tasks:**
- [ ] Review new API endpoints
- [ ] Check service account usage
- [ ] Verify rate limiting effectiveness
- [ ] Monitor integration health

---

## 10. Conclusion

The Inovy application is **fully compliant** with SSD-1.2.02 requirements:

1. ✅ **Only necessary protocols are active:** HTTP/HTTPS, WebSocket, OAuth 2.0, and webhooks
2. ✅ **Only necessary services are running:** All 31 API routes have documented justification
3. ✅ **Only necessary accounts exist:** User accounts, service accounts, and database accounts are all required
4. ✅ **Infrastructure is hardened:** Vercel platform provides secure defaults
5. ✅ **Regular audits scheduled:** Quarterly review process established
6. ✅ **Monitoring in place:** Service health and security monitoring active

**No action required** - system is operating securely with minimal attack surface.

---

## Document Control

- **Document Owner:** Security Team
- **Last Reviewed:** 2026-02-22
- **Next Review:** 2026-05-22 (Quarterly)
- **Version:** 1.0
- **Classification:** Internal Use

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Lead | [To be assigned] | 2026-02-22 | |
| Technical Lead | [To be assigned] | 2026-02-22 | |
| Compliance Officer | [To be assigned] | 2026-02-22 | |
