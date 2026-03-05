# Service Inventory
## SSD-1.3.02: Support Only Design-Required Services

**Last Updated:** 2026-02-24  
**Status:** Active  
**Compliance:** SSD-1.3.02 - ICT components should only support services required by design

---

## Executive Summary

This document provides a comprehensive inventory of all services, APIs, and functionality exposed by the Inovy application. Each service is mapped to its design requirement and business justification to ensure compliance with SSD-1.3.02.

### Current Service Status
- **Total API Routes:** 31
- **Total Server Actions:** 100+
- **Total Service Classes:** 72
- **Database Models:** 38
- **Service Control Mechanisms:** Environment variables, feature flags, per-organization settings

---

## 1. Core Business Services

### 1.1 Authentication & Authorization Services
**Design Requirement:** Secure user access and identity management  
**Status:** ✅ Required

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| User Authentication | `/api/auth/[...all]/route.ts` | Required for secure access control |
| Session Management | Better Auth session handling | Required for maintaining user state |
| OAuth Integration | Google, Microsoft OAuth | Required for enterprise SSO |
| Magic Links | Better Auth magic links | Required for passwordless authentication |
| Passkeys/WebAuthn | Better Auth passkeys | Required for modern authentication |
| Organization Management | Better Auth organizations | Required for multi-tenant architecture |

**Control Mechanism:** Environment variables (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)  
**Risk if Disabled:** Application becomes inaccessible

---

### 1.2 Recording Management Services
**Design Requirement:** Core functionality for recording medical/dental consultations  
**Status:** ✅ Required

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| Recording Upload | `/api/recordings/upload/route.ts` | Required for core product functionality |
| Recording Playback | `/api/recordings/[recordingId]/playback/route.ts` | Required for viewing recordings |
| Recording Management | `RecordingService` | Required for CRUD operations |
| Transcription | `/api/transcribe/[recordingId]/route.ts` | Required for generating transcripts |
| Live Transcription | `/api/transcribe/live/route.ts` | Required for real-time transcription |
| Summarization | `/api/summarize/[recordingId]/route.ts` | Required for generating summaries |
| Task Extraction | `/api/extract-tasks/[recordingId]/route.ts` | Required for extracting action items |

**Control Mechanism:** Core services always enabled  
**Risk if Disabled:** Core product functionality lost

---

### 1.3 Chat & AI Assistant Services
**Design Requirement:** AI-powered assistance for medical professionals  
**Status:** ✅ Required (with per-organization control)

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| Project Chat | `/api/chat/[projectId]/route.ts` | Required for project-specific assistance |
| Organization Chat | `/api/chat/organization/route.ts` | Required for admin-level assistance |
| Unified Chat API | `/api/chat/route.ts` | Required for chat orchestration |
| Chat Export | `/api/chat/export/[conversationId]/route.ts` | Required for data portability |
| RAG Service | `RAGService` | Required for context-aware responses |
| Knowledge Base | `KnowledgeBaseService` | Required for custom knowledge integration |

**Control Mechanism:** 
- Per-organization agent config (`AgentConfigService`)
- Environment variables (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)

**Risk if Disabled:** AI assistance unavailable, reduced product value

---

### 1.4 Project Management Services
**Design Requirement:** Organize recordings and data by project/patient  
**Status:** ✅ Required

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| Project CRUD | `ProjectService` + server actions | Required for organizing recordings |
| Project Templates | `ProjectTemplateService` | Required for efficiency and standardization |
| Project Access Control | Authorization middleware | Required for data isolation |

**Control Mechanism:** Core services always enabled  
**Risk if Disabled:** Data organization lost

---

## 2. Integration Services

### 2.1 Bot & Meeting Services
**Design Requirement:** Automated meeting recording and transcription  
**Status:** ✅ Required (optional per deployment)

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| Bot Orchestration | `BotOrchestrationService` | Required for automated meeting capture |
| Bot Status Polling | `/api/cron/poll-bot-status/route.ts` | Required for bot health monitoring |
| Calendar Monitoring | `/api/cron/monitor-calendar/route.ts` | Required for automatic meeting detection |
| Recall.ai Integration | `RecallApiService` | Required for bot functionality |
| Bot Webhooks | `/api/webhooks/recall/route.ts` | Required for bot event processing |

**Control Mechanism:** 
- Environment variables (`RECALL_API_KEY`, `RECALL_WEBHOOK_SECRET`)
- Per-organization bot settings

**Risk if Disabled:** Automated meeting recording unavailable (manual upload still works)

---

### 2.2 Google Workspace Integration
**Design Requirement:** Integration with Google Drive, Calendar, Gmail for healthcare workflows  
**Status:** ⚠️ Optional (enable only if required)

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| Google OAuth | `/api/integrations/google/authorize/route.ts` | Required for Google integration |
| Google Drive | `GoogleDriveService` | Optional: Document storage integration |
| Drive Watch | `/api/integrations/google/drive/watch/start/route.ts` | Optional: Auto-sync functionality |
| Drive Webhooks | `/api/webhooks/google-drive/route.ts` | Optional: Change notifications |
| Watch Renewal | `/api/cron/renew-drive-watches/route.ts` | Optional: Maintain active watches |
| Google Calendar | `GoogleCalendarService` | Optional: Calendar integration |
| Gmail | `GoogleGmailService` | Optional: Email integration |

**Control Mechanism:** 
- OAuth connection required (user opt-in)
- Environment variables for credentials

**Risk if Disabled:** Google integrations unavailable (core product still functional)

**Recommendation:** ⚠️ **Audit Required** - Evaluate if Google integrations are essential for target use cases. If not required for MVP, consider disabling.

---

## 3. Security & Compliance Services

### 3.1 Privacy & Data Protection
**Design Requirement:** GDPR, AVG, NEN 7510 compliance  
**Status:** ✅ Required (Legal obligation)

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| PII Detection | `PIIDetectionService` | Required for privacy protection |
| PII Redaction | `RedactionService` | Required for data minimization |
| Consent Management | `ConsentService` | Required for AVG compliance |
| Consent Audit | `ConsentAuditService` | Required for audit trail |
| GDPR Export | `/api/gdpr-export/[exportId]/route.ts` | Required for data portability rights |
| GDPR Deletion | `GdprDeletionService` | Required for right to erasure |
| Audit Logging | `AuditLogService` | Required for NEN 7510 compliance |
| Chat Audit | `ChatAuditService` | Required for access tracking |

**Control Mechanism:** Always enabled (legal requirement)  
**Risk if Disabled:** Legal non-compliance, potential fines

---

### 3.2 Encryption & Data Security
**Design Requirement:** NEN 7510 data security requirements  
**Status:** ✅ Required (Legal obligation)

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| Encryption at Rest | `ENABLE_ENCRYPTION_AT_REST` env var | Required for NEN 7510 compliance |
| Rate Limiting | `RateLimiterService` | Required for DoS protection |
| Session Security | Better Auth session management | Required for access control |
| API Authentication | Authorization middleware | Required for secure API access |

**Control Mechanism:** Environment variables, middleware  
**Risk if Disabled:** Security vulnerabilities, legal non-compliance

---

## 4. Supporting Services

### 4.1 AI & Vector Search Services
**Design Requirement:** Enable RAG and semantic search  
**Status:** ✅ Required (for AI features)

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| Vector Database | `QdrantClientService` | Required for RAG functionality |
| Embeddings | `EmbeddingService` | Required for semantic search |
| Reranking | `RerankerService` | Required for search quality |
| Qdrant Health Check | `/api/qdrant/health/route.ts` | Required for monitoring |

**Control Mechanism:** 
- Environment variables (`QDRANT_URL`, `QDRANT_API_KEY`)
- Disabled if agent disabled

**Risk if Disabled:** AI chat functionality unavailable

---

### 4.2 Knowledge Base Services
**Design Requirement:** Custom knowledge integration for medical protocols  
**Status:** ✅ Required (for AI features)

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| Knowledge Base CRUD | `/api/agent/knowledge-base/route.ts` | Required for custom knowledge |
| Document Indexing | `/api/agent/knowledge-base/reindex/route.ts` | Required for search functionality |
| Document Preview | `/api/agent/knowledge-base/preview/route.ts` | Required for content review |
| Document Processing | `DocumentService` | Required for file parsing |

**Control Mechanism:** 
- Per-organization agent settings
- Disabled if agent disabled

**Risk if Disabled:** Custom knowledge unavailable (generic AI still works)

---

### 4.3 Notification Services
**Design Requirement:** User notifications for important events  
**Status:** ✅ Required

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| Notification Management | `NotificationService` | Required for user notifications |
| Unread Count | `/api/notifications/unread-count/route.ts` | Required for UI indicators |
| Notification Actions | Server actions (mark read, etc.) | Required for notification management |

**Control Mechanism:** Core service always enabled  
**Risk if Disabled:** Users miss important updates

---

### 4.4 Monitoring & Health Check Services
**Design Requirement:** System monitoring and reliability  
**Status:** ✅ Required

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| Connection Pool Health | `/api/connection-pool/health/route.ts` | Required for monitoring AI providers |
| Qdrant Health | `/api/qdrant/health/route.ts` | Required for monitoring vector DB |
| Cron Jobs | Various `/api/cron/*` routes | Required for background processing |

**Control Mechanism:** 
- Cron secret (`CRON_SECRET`) for authentication
- Health checks always enabled

**Risk if Disabled:** Reduced observability, potential reliability issues

---

### 4.5 Analytics & Metrics Services
**Design Requirement:** Product analytics and usage monitoring  
**Status:** ⚠️ Optional (evaluate necessity)

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| Agent Metrics | `AgentMetricsService` | Optional: Performance monitoring |
| Agent Analytics | `AgentAnalyticsService` | Optional: Usage analytics |
| Metrics Export | Server actions | Optional: Data export |

**Control Mechanism:** Per-organization settings  
**Risk if Disabled:** Reduced visibility into usage patterns

**Recommendation:** ⚠️ **Audit Required** - Evaluate if analytics are essential or can be replaced with privacy-focused alternatives.

---

## 5. Experimental/Development Services

### 5.1 Model Context Protocol (MCP)
**Design Requirement:** None (experimental feature)  
**Status:** ⚠️ Under Review

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| MCP Endpoint | `/api/mcp/[transport]/route.ts` | Experimental: Not required for production |

**Control Mechanism:** Can be disabled via routing  
**Risk if Disabled:** None (experimental feature)

**Recommendation:** 🔴 **Remove or Disable** - Not required for production. Should be disabled in production environments unless explicitly needed.

---

### 5.2 Development Utilities
**Design Requirement:** Development and debugging  
**Status:** 🔴 Must be disabled in production

| Service | Endpoint/Component | Justification |
|---------|-------------------|---------------|
| Embedding Index | `/api/embeddings/index/route.ts` | Development only: Manual indexing |
| Cache Invalidation | Server actions | Admin only: Cache management |

**Control Mechanism:** Environment checks, admin-only access  
**Risk if Disabled:** Development workflow affected (production unaffected)

**Recommendation:** 🔴 **Ensure Production Safeguards** - These should be admin-only or disabled in production.

---

## 6. Database Services

### 6.1 Data Access Layer
**Design Requirement:** All data access must go through controlled services  
**Status:** ✅ Required

All database access is controlled through:
- Drizzle ORM for type-safe queries
- Data access layer in `/server/data-access/`
- Row-level security via organization isolation
- Audit logging for sensitive operations

**Control Mechanism:** Architecture enforces controlled access  
**Risk if Disabled:** Application non-functional

---

## Service Control Matrix

### Environment-Based Controls

| Control Type | Mechanism | Services Affected |
|--------------|-----------|-------------------|
| Feature Flags | Environment variables | Bot, integrations, encryption, analytics |
| Organization Settings | Database configuration | Agent, bot, notifications |
| User Opt-in | OAuth connections | Google integrations |
| Role-Based Access | Authorization middleware | Admin functions, sensitive operations |
| Rate Limiting | Redis-based limits | All API endpoints |

---

## Recommendations for Compliance

### ✅ Currently Compliant

1. **Minimal API Surface:** Only 31 API routes for comprehensive functionality
2. **Feature Flags:** Environment variables control optional services
3. **Per-Organization Control:** Agent and bot can be disabled per org
4. **Role-Based Access:** Admin functions restricted appropriately
5. **Audit Logging:** Comprehensive audit trails for compliance

### ⚠️ Requires Audit

1. **Google Integrations:** Evaluate necessity for target healthcare use cases
   - If not essential, disable Drive/Calendar/Gmail integrations
   - Consider privacy implications of third-party data storage

2. **Analytics Services:** Review if metrics collection aligns with privacy requirements
   - Consider anonymization or aggregation
   - Evaluate alternatives to detailed usage tracking

3. **MCP Endpoint:** Experimental feature with unclear security posture
   - Remove or disable in production
   - If needed, add authentication and authorization

### 🔴 Action Required

1. **Create Service Audit Process:** Implement quarterly service inventory review
2. **Automate Service Discovery:** Build tooling to detect new services
3. **Document Service Decisions:** Maintain decision log for each service
4. **Implement Kill Switches:** Add emergency disable capability for non-essential services
5. **Production Environment Hardening:** Ensure development utilities are disabled

---

## Service Audit Schedule

### Quarterly Audit (Every 3 Months)
- Review service inventory
- Identify new services added
- Evaluate continued necessity of optional services
- Update this document

### Annual Audit (Yearly)
- Comprehensive security review
- Third-party integration risk assessment
- Compliance verification (AVG, NEN 7510, GDPR)
- Architecture review for minimal surface area

### Triggered Audit (As Needed)
- Before major releases
- After security incidents
- When adding new integrations
- When entering new markets or use cases

---

## Audit Trail

| Date | Auditor | Changes | Reason |
|------|---------|---------|--------|
| 2026-02-24 | System | Initial inventory created | SSD-1.3.02 compliance |

---

## Appendix: Service Dependencies

### Critical Path Services (Must Always Be Enabled)
1. Authentication (`/api/auth/*`)
2. Recording Management (`RecordingService`, transcription, upload)
3. Project Management (`ProjectService`)
4. Database Access Layer
5. Security Services (encryption, audit logging, PII detection)

### Optional Services (Can Be Disabled)
1. Bot & Meeting Services (manual upload alternative)
2. Google Integrations (not required for core functionality)
3. Analytics & Metrics (monitoring alternative available)
4. Knowledge Base (generic AI still works)

### Development-Only Services (Must Be Disabled in Production)
1. MCP Endpoint
2. Manual embedding indexing
3. Development utilities

---

## Related Documents
- [Service Audit Process](./SERVICE_AUDIT_PROCESS.md)
- [Service Control Configuration](./SERVICE_CONTROL_CONFIG.md)
- [Security Compliance Checklist](./SECURITY_COMPLIANCE_CHECKLIST.md)

---

**Document Classification:** Internal - Security  
**Review Frequency:** Quarterly  
**Next Review Date:** 2026-05-24
