# Logging & Monitoring Policy

| Field              | Value                        |
| ------------------ | ---------------------------- |
| Document ID        | POL-16                       |
| Version            | 1.0                          |
| Classification     | Internal                     |
| Owner              | Information Security Manager |
| Approved by        | CEO/CTO                      |
| Effective date     | 2026-03-13                   |
| Review date        | 2027-03-13                   |
| ISO 27001 Controls | A.8.15, A.8.16, A.8.17       |

---

## 1. Purpose

This policy establishes the requirements for logging, monitoring, and clock synchronisation across Inovy's information systems. Effective logging and monitoring enables Inovy to detect security incidents, investigate anomalies, fulfil regulatory audit requirements, and maintain operational health of its AI-powered meeting recording platform. Logs are critical evidence for both security incident response and GDPR accountability obligations.

## 2. Scope

This policy applies to:

- The Inovy Next.js 16 web application (`apps/web`)
- Azure Container Apps hosting the application
- Neon PostgreSQL database (EU-Central-1)
- Azure Blob Storage (meeting recordings)
- Qdrant vector database
- Redis session/cache store
- GitHub Actions CI/CD pipelines
- All third-party service integrations (OpenAI, Deepgram, Anthropic, Recall.ai, Stripe, Resend, Google, Microsoft)

## 3. Roles and Responsibilities

| Role             | Responsibility                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| ISM              | Owns this policy; reviews security-relevant log events; defines alert thresholds; reviews audit log integrity                                  |
| Engineering Lead | Ensures logging is implemented correctly in application code; reviews log output for sensitive data exposure; maintains health check endpoints |
| On-Call Engineer | Responds to automated health and security alerts; escalates to ISM for security events                                                         |
| All Engineers    | Use structured logging correctly; never log PII; use appropriate log levels                                                                    |

## 4. Logging Requirements (A.8.15)

### 4.1 Logging Framework

Inovy uses **Pino** as its structured logging library, selected for its high performance and JSON-native output. Configuration:

| Environment           | Format                                          | Destination                                              |
| --------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| **Production**        | JSON (machine-readable)                         | stdout → Azure Container Apps log stream → Azure Monitor |
| **Local development** | Pretty-print (human-readable) via `pino-pretty` | stdout                                                   |

All log entries include at minimum: `timestamp`, `level`, `message`, `requestId` (where applicable), `organizationId` (where applicable, pseudonymised), `userId` (where applicable, pseudonymised).

### 4.2 Log Levels

| Level   | Usage                                           | Examples                                                                   |
| ------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| `debug` | Detailed diagnostic information for development | Query execution plans, API response times in dev                           |
| `info`  | Normal operational events                       | Successful request completions, service startup, meeting processing status |
| `warn`  | Abnormal but non-critical conditions            | Rate limit approaching, deprecated API usage, retry attempts               |
| `error` | Errors requiring attention                      | Failed database connections, API errors, uncaught exceptions               |

Debug logging is **disabled in production** to avoid performance impact and accidental PII capture. The log level is set via the `LOG_LEVEL` environment variable (default: `info` in production).

### 4.3 Mandatory Log Field Redaction

The following fields are **automatically redacted** in all log output via Pino's `redact` configuration, regardless of where they appear in the log object hierarchy:

```
password, apiKey, token, accessToken, refreshToken, secret,
authorization, cookie, sessionId, email
```

Redacted values are replaced with `[Redacted]` in log output. This prevents credentials, session tokens, and email addresses from appearing in log aggregation systems, log files, or any downstream log consumers.

Engineers must not log objects that contain PII without first extracting the non-PII fields. The following are **prohibited in log statements**:

- BSN numbers (in any format)
- Meeting transcript content (use identifiers only, e.g., `meetingId`)
- Credit card numbers
- Deepgram or OpenAI API keys
- Stripe secret keys or webhook secrets
- OAuth tokens or refresh tokens
- Plaintext passwords

### 4.4 Audit Logging Subsystems

Inovy maintains three distinct audit logging subsystems with different retention requirements and access controls:

#### 4.4.1 General Audit Log

The general audit log records all security-relevant events in **PostgreSQL** (Neon) using a hash chain for tamper evidence.

**Hash chain mechanism**: Each audit log entry includes a `SHA-256` hash computed over the entry's content concatenated with the previous entry's hash. This creates a chain where any modification to a historical entry would break the chain, making tampering detectable during log review.

**Schema** (simplified):

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  actor_id VARCHAR(64) NOT NULL,          -- pseudonymised user ID
  organization_id UUID,
  resource_type VARCHAR(100),
  resource_id VARCHAR(256),
  metadata JSONB,
  ip_address VARCHAR(45),                 -- last octet masked for IPv4
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hash VARCHAR(64) NOT NULL               -- SHA-256 hash chain entry
);
```

#### 4.4.2 Chat Audit Log

The chat audit log records all AI chat interactions, including prompt content, model responses, PII detection results, and content moderation outcomes. This log supports regulatory accountability for AI-generated content.

**Retention**: Minimum 1 year. Stored in Neon PostgreSQL with the same hash chain mechanism as the general audit log.

#### 4.4.3 Consent Audit Log

The consent audit log records all consent events: when consent was given, what was consented to, when consent was withdrawn, and meeting participant notification events. This log is critical for GDPR Article 7 accountability.

**Retention**: Minimum 5 years (to cover the period for which consent-based processing could be challenged).

### 4.5 Events to Be Logged

The following events must be captured in the audit log system:

#### Authentication Events

| Event                            | Log Level | Log Destination   |
| -------------------------------- | --------- | ----------------- |
| Successful sign-in               | `info`    | General audit log |
| Failed sign-in attempt           | `warn`    | General audit log |
| Sign-out                         | `info`    | General audit log |
| MFA challenge issued             | `info`    | General audit log |
| MFA challenge failed             | `warn`    | General audit log |
| Password changed                 | `info`    | General audit log |
| Password reset requested         | `info`    | General audit log |
| OAuth sign-in (Google/Microsoft) | `info`    | General audit log |
| Session expired                  | `info`    | General audit log |
| Session revoked                  | `info`    | General audit log |

#### Authorisation Events

| Event                                      | Log Level | Log Destination                      |
| ------------------------------------------ | --------- | ------------------------------------ |
| Authorisation failure (insufficient role)  | `warn`    | General audit log                    |
| Organisation isolation violation attempted | `error`   | General audit log + security alert   |
| Permission escalation (role change)        | `warn`    | General audit log                    |
| Admin kill-switch activated                | `error`   | General audit log + ISM notification |

#### Data Access Events

| Event                           | Log Level | Log Destination   |
| ------------------------------- | --------- | ----------------- |
| Meeting recording accessed      | `info`    | General audit log |
| Meeting transcript accessed     | `info`    | General audit log |
| GDPR data export initiated      | `info`    | General audit log |
| GDPR data export downloaded     | `info`    | General audit log |
| Bulk data access (>100 records) | `warn`    | General audit log |

#### Data Modification Events

| Event                              | Log Level | Log Destination   |
| ---------------------------------- | --------- | ----------------- |
| Meeting created/updated/deleted    | `info`    | General audit log |
| User created/updated/deleted       | `info`    | General audit log |
| Organisation settings changed      | `info`    | General audit log |
| Integration connected/disconnected | `info`    | General audit log |
| Role or permission modified        | `warn`    | General audit log |

#### Security Events

| Event                                | Log Level | Log Destination                 |
| ------------------------------------ | --------- | ------------------------------- |
| Rate limit exceeded                  | `warn`    | General audit log               |
| Webhook signature validation failure | `warn`    | General audit log               |
| PII detected in AI output            | `warn`    | Chat audit log                  |
| Prompt injection pattern detected    | `error`   | Chat audit log + security alert |
| Upload token validation failure      | `warn`    | General audit log               |
| Content moderation flag triggered    | `warn`    | Chat audit log                  |

#### Consent Events

| Event                                 | Log Level | Log Destination   |
| ------------------------------------- | --------- | ----------------- |
| Meeting participant consent given     | `info`    | Consent audit log |
| Meeting participant consent withdrawn | `info`    | Consent audit log |
| Recording notification sent           | `info`    | Consent audit log |

### 4.6 Log Retention

| Log Type                         | Retention Period                   | Storage                        |
| -------------------------------- | ---------------------------------- | ------------------------------ |
| Application logs (Azure Monitor) | 30–90 days (Azure Monitor default) | Azure Monitor Log Analytics    |
| General audit log (PostgreSQL)   | Minimum **3 years**                | Neon PostgreSQL (EU-Central-1) |
| Chat audit log (PostgreSQL)      | Minimum **1 year**                 | Neon PostgreSQL (EU-Central-1) |
| Consent audit log (PostgreSQL)   | Minimum **5 years**                | Neon PostgreSQL (EU-Central-1) |
| CI/CD build logs                 | 90 days                            | GitHub Actions                 |

After the retention period, audit logs are deleted via an automated scheduled database job. Deletion is logged in the general audit log.

## 5. Monitoring (A.8.16)

### 5.1 Health Check Monitoring

Inovy exposes the following internal health check endpoints that are monitored continuously:

| Endpoint                      | What It Checks                                                                         | Expected Response                |
| ----------------------------- | -------------------------------------------------------------------------------------- | -------------------------------- |
| `/api/health`                 | Application general health; environment variable presence; service connectivity        | `200 OK` with JSON status report |
| `/api/connection-pool/health` | Neon PostgreSQL connection pool availability; active and idle connections vs. max (15) | `200 OK` with pool metrics       |
| `/api/qdrant/health`          | Qdrant vector database connectivity and collection availability                        | `200 OK` with Qdrant status      |

These endpoints are not publicly advertised but are used by Azure Container Apps health probes and can be monitored by external uptime monitoring services (e.g., Uptime Robot). Health check responses do not include sensitive configuration data.

**Alert thresholds**:

- `/api/health` returns non-200: P1 incident — page on-call engineer immediately
- `/api/connection-pool/health` shows >80% pool utilisation: Warning — notify Engineering Lead
- `/api/qdrant/health` returns non-200: Warning — notify on-call engineer

### 5.2 Security Monitoring

The following security patterns are actively monitored and trigger automated alerts:

| Pattern                                   | Threshold                        | Alert Destination                         |
| ----------------------------------------- | -------------------------------- | ----------------------------------------- |
| Failed sign-in attempts (single user)     | >10 failures in 15 minutes       | ISM Slack notification                    |
| Failed sign-in attempts (entire platform) | >50 failures in 15 minutes       | ISM Slack notification + Engineering Lead |
| Organisation isolation violation          | Any occurrence                   | ISM immediate alert (P1)                  |
| Rate limit violations                     | >100 per minute per IP           | Engineering Lead notification             |
| Prompt injection pattern detected         | Any occurrence                   | ISM notification + logged in chat audit   |
| Webhook signature failures                | >5 in 1 hour from single source  | Engineering Lead notification             |
| Upload token failures                     | >10 in 1 hour from single source | Engineering Lead notification             |
| AI PII output detections                  | >5 in 1 hour                     | ISM notification                          |

Alerts are delivered via:

- **Slack** `#security` channel (primary)
- **Email** `security@inovico.nl` (secondary)
- Azure Monitor alerts (for infrastructure-level events)

### 5.3 Operational Monitoring

In addition to security monitoring, the following operational metrics are monitored:

- **Azure Container Apps**: CPU utilisation, memory utilisation, request count, request latency (P50/P95/P99), error rate, scaling events
- **Neon PostgreSQL**: Connection pool utilisation, query latency, active connections, lock waits
- **Azure Blob Storage**: Storage capacity, request rates, error rates
- **Qdrant**: Collection size, indexing latency, query latency
- **Redis**: Memory utilisation, eviction rate, key count
- **Deepgram / OpenAI / Anthropic**: API error rates, latency, cost per call (via API metadata)
- **Stripe**: Failed payment rates, dispute rates

Dashboards are maintained in Azure Monitor for infrastructure metrics and a custom Inovy operations dashboard for application-level metrics.

### 5.4 Log Review

The ISM reviews security-relevant audit log entries on a **weekly** basis, with immediate review triggered by:

- Any security alert from the monitoring system
- Post-incident investigation
- Prior to management reviews

Log reviews focus on:

- Unusual authorisation failure patterns
- Suspicious data access volumes
- New IP addresses or user agents associated with administrative actions
- Any organisation isolation violation events
- AI moderation events

The ISM documents findings from log reviews in the security operations log maintained in the ISMS.

## 6. Clock Synchronisation (A.8.17)

Accurate and consistent timestamps are essential for audit log integrity, incident investigation, and compliance with GDPR accountability requirements. Inovy ensures clock synchronisation as follows:

### 6.1 Infrastructure

| Component              | NTP Source                            | Synchronisation Method                                |
| ---------------------- | ------------------------------------- | ----------------------------------------------------- |
| Azure Container Apps   | Azure Platform NTP (time.windows.com) | Inherited from Azure host — no configuration required |
| Neon PostgreSQL        | Neon-managed NTP                      | Managed by Neon; timestamps accurate to milliseconds  |
| Azure Blob Storage     | Azure Platform NTP                    | Managed by Microsoft Azure                            |
| Qdrant (cloud)         | Qdrant cloud-managed NTP              | Managed by Qdrant; UTC timestamps                     |
| Redis (Azure Cache)    | Azure Platform NTP                    | Managed by Microsoft Azure                            |
| GitHub Actions runners | GitHub-managed NTP                    | Managed by GitHub                                     |

All infrastructure components inherit accurate time from their cloud providers' NTP infrastructure. Inovy does not operate any on-premises servers that require independent NTP configuration.

### 6.2 Application Timestamp Standards

All timestamps within the Inovy application must:

- Be stored in **UTC** (Coordinated Universal Time)
- Use the PostgreSQL `TIMESTAMPTZ` (timestamp with time zone) data type, which always stores UTC regardless of session timezone
- Be formatted as ISO 8601 in API responses and log output (e.g., `2026-03-13T14:30:00.000Z`)
- The audit log `createdAt` column uses `TIMESTAMPTZ NOT NULL DEFAULT NOW()` to ensure database-generated timestamps are used, preventing client-supplied timestamp manipulation

**Prohibition on client-supplied timestamps for audit records**: Audit log entries must use server-generated timestamps (`NOW()` or equivalent). Client-supplied timestamps must never be used as the authoritative `createdAt` value for audit log entries.

### 6.3 Maximum Permissible Clock Skew

For audit log integrity and incident correlation, the maximum permissible clock skew between any two Inovy system components is **1 second**. In practice, Azure and Neon NTP synchronisation maintains skew well below 100 milliseconds.

If a system is found to have clock skew exceeding 1 second, this is treated as an operational issue to be resolved immediately, as it may compromise the integrity of audit log event ordering.

## 7. Log Integrity

The hash chain mechanism in the general audit log and chat audit log provides tamper evidence. The ISM verifies hash chain integrity on a **quarterly** basis using the hash chain verification utility. Any detected break in the chain is treated as a P1 security incident.

Log entries in Neon PostgreSQL are protected from unauthorised modification by:

- Database-level access controls (application service account has INSERT only on audit tables; no UPDATE or DELETE)
- Neon's managed backup and point-in-time recovery (provides evidence of original log state)
- The hash chain (detects any modification to historical entries)

## 8. Related Documents

| Document                            | Reference |
| ----------------------------------- | --------- |
| Information Security Policy         | POL-01    |
| Incident Management Policy          | POL-07    |
| Data Protection & Privacy Policy    | POL-15    |
| Network Security Policy             | POL-17    |
| Secure Development Lifecycle Policy | POL-13    |

## 9. Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
