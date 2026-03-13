# Data Protection & Privacy Policy

| Field              | Value                          |
| ------------------ | ------------------------------ |
| Document ID        | POL-15                         |
| Version            | 1.0                            |
| Classification     | Internal                       |
| Owner              | Information Security Manager   |
| Approved by        | CEO/CTO                        |
| Effective date     | 2026-03-13                     |
| Review date        | 2027-03-13                     |
| ISO 27001 Controls | A.5.34, A.8.10, A.8.11, A.8.12 |

---

## 1. Purpose

This policy establishes Inovy's requirements for the protection of personal data and privacy throughout the information lifecycle. Inovy processes sensitive personal data as a core part of its AI-powered meeting recording service, including meeting recordings, transcripts, and in some cases special category data such as BSN (Burgerservicenummer) numbers identifiable from meeting content. Inovy is a Dutch company subject to the GDPR, the Dutch Uitvoeringswet AVG (UAVG), and the ePrivacy Directive. This policy ensures Inovy meets its regulatory obligations and maintains customer trust through rigorous data protection practices.

## 2. Scope

This policy applies to:

- All personal data processed by Inovy on behalf of its customers (data processor role for meeting content)
- All personal data processed by Inovy in its own right as a data controller (account data, usage analytics)
- All Inovy personnel involved in processing personal data
- All systems, applications, and third-party integrations that process personal data

## 3. Roles and Responsibilities

| Role                          | Responsibility                                                                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Data Protection Officer (DPO) | Advises on GDPR compliance; handles data subject rights requests escalated from customers; represents Inovy in dealings with the Dutch DPA (Autoriteit Persoonsgegevens) |
| ISM                           | Owns this policy; implements technical controls; coordinates with DPO on incidents; reviews PII detection and redaction efficacy                                         |
| Engineering Lead              | Ensures PII handling requirements are implemented correctly; reviews code for PII leakage                                                                                |
| Customer Success              | First point of contact for data subject rights requests from customers; escalates to DPO                                                                                 |
| All Engineers                 | Implement data minimisation, anonymisation, and deletion according to this policy; never introduce new PII processing without a data protection impact assessment        |

**DPO Contact**: `privacy@inovico.nl`

## 4. Privacy Programme (A.5.34)

### 4.1 GDPR Compliance Framework

Inovy operates a privacy-by-design programme aligned with GDPR requirements. Key principles applied to all processing activities:

| GDPR Principle                         | How Inovy Applies It                                                                                                                                                                                |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Lawfulness, fairness, transparency** | Processing is disclosed in Inovy's Privacy Policy; customers provide consent or processing is based on contract performance                                                                         |
| **Purpose limitation**                 | Meeting data is processed for the purpose of providing the meeting intelligence service; it is not used for advertising, sold to third parties, or used to train AI models without explicit consent |
| **Data minimisation**                  | Inovy collects only the data necessary for the service; unnecessary PII fields are not requested or stored                                                                                          |
| **Accuracy**                           | Users can correct their account data via the web application                                                                                                                                        |
| **Storage limitation**                 | Data is retained according to the retention schedule in Section 5                                                                                                                                   |
| **Integrity and confidentiality**      | Encryption at rest and in transit; access controls; audit logging; PII redaction                                                                                                                    |
| **Accountability**                     | This policy, the ISMS, audit logs, and the Records of Processing Activities (RoPA) demonstrate compliance                                                                                           |

### 4.2 Lawful Basis for Processing

| Processing Activity                 | Controller                     | Lawful Basis                                                       | GDPR Article      |
| ----------------------------------- | ------------------------------ | ------------------------------------------------------------------ | ----------------- |
| Account registration and management | Inovy (controller)             | Contract performance                                               | Art. 6(1)(b)      |
| Meeting recording and transcription | Inovy (processor for customer) | Customer's consent from meeting participants (managed by customer) | Art. 6(1)(a)      |
| AI analysis of meeting content      | Inovy (processor for customer) | Customer's instruction; customer's lawful basis                    | Art. 28           |
| Usage analytics                     | Inovy (controller)             | Legitimate interest                                                | Art. 6(1)(f)      |
| Billing and payment processing      | Inovy (controller)             | Contract performance; legal obligation                             | Art. 6(1)(b), (c) |
| Audit logging                       | Inovy (controller/processor)   | Legal obligation; legitimate interest                              | Art. 6(1)(c), (f) |
| Marketing communications            | Inovy (controller)             | Consent                                                            | Art. 6(1)(a)      |

### 4.3 Data Subject Rights

Inovy provides mechanisms for data subjects to exercise their GDPR rights. For data processed in the context of customer organisations, data subject requests are directed to the customer (as data controller); Inovy supports the customer in fulfilling these requests.

For data for which Inovy is the controller (account data):

| Right                                   | How to Exercise                                                                   | Inovy's Response                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Right of access (Art. 15)**           | Submit request to `privacy@inovico.nl`                                            | Provide a copy of personal data within 30 days                                                                   |
| **Right to rectification (Art. 16)**    | Update via account settings in the web application, or email `privacy@inovico.nl` | Correct inaccurate data within 30 days                                                                           |
| **Right to erasure (Art. 17)**          | Submit request to `privacy@inovico.nl` or use the in-app account deletion feature | Initiate 30-day soft-delete with anonymisation via `gdpr-deletion.service.ts`; confirm completion within 30 days |
| **Right to data portability (Art. 20)** | Request via `privacy@inovico.nl`                                                  | GDPR export package made available via secure download link; link expires after 7 days                           |
| **Right to restriction (Art. 18)**      | Email `privacy@inovico.nl`                                                        | Processing restricted within 7 days pending investigation                                                        |
| **Right to object (Art. 21)**           | Email `privacy@inovico.nl`                                                        | Object to legitimate interest processing; reviewed by DPO                                                        |

All data subject requests are logged and responded to within **30 calendar days** (one month) as required by GDPR. Complex requests may be extended by a further two months with notification to the data subject.

### 4.4 Data Protection Impact Assessments (DPIA)

A DPIA must be conducted before introducing any new processing activity that is likely to result in a high risk to the rights and freedoms of natural persons. Triggers for a DPIA include:

- Processing special category data (health data, biometric data, data revealing racial or ethnic origin)
- Systematic monitoring of individuals
- Processing BSN numbers from meeting content at scale
- Introducing a new AI model or AI processing capability for meeting content
- Sharing personal data with a new third-party processor

DPIAs are conducted by the ISM in consultation with the DPO and are documented and retained in the ISMS.

## 5. Information Deletion and Retention (A.8.10)

### 5.1 Retention Schedule

| Data Type                              | Retention Period                                                      | Deletion Trigger                     | Deletion Method                                                  |
| -------------------------------------- | --------------------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| Meeting recordings (audio/video)       | Duration of customer subscription + 30 days after account termination | Account deletion or customer request | Deletion from Azure Blob Storage; soft delete then hard delete   |
| Meeting transcripts                    | Duration of customer subscription + 30 days after account termination | Account deletion or customer request | `gdpr-deletion.service.ts`                                       |
| AI-generated summaries and insights    | Duration of customer subscription + 30 days                           | Account deletion or customer request | `gdpr-deletion.service.ts`                                       |
| User account data (name, email)        | Duration of account + 30-day soft delete window                       | Account deletion request             | Anonymisation via `pii-utils.ts`; then hard delete after 30 days |
| Audit logs                             | Minimum **3 years**                                                   | After 3-year retention window        | Archived to cold storage, then deleted                           |
| Chat audit logs                        | Minimum **1 year**                                                    | After 1-year retention window        | Deleted per retention schedule                                   |
| Consent records                        | **5 years** after consent was given or withdrawn                      | After retention window               | Deleted per retention schedule                                   |
| GDPR data export packages              | **7 days** after generation                                           | Automatic expiry                     | Signed Azure Blob Storage URL expires; file deleted              |
| Session tokens                         | **7 days** (inactive session)                                         | Session expiry or explicit sign-out  | Deleted from Redis session store                                 |
| Application logs                       | Per Azure Monitor log retention policy (default 30–90 days)           | After retention window               | Automatic Azure Monitor deletion                                 |
| Financial records (invoices, payments) | **7 years** (Dutch bookkeeping law)                                   | After 7-year retention window        | Archived then deleted                                            |

### 5.2 GDPR Deletion Service

User account deletion is handled by `gdpr-deletion.service.ts`, which implements a **30-day soft delete** followed by full anonymisation:

**Day 0 (deletion request received)**:

- User account flagged as `deletionRequested: true`
- User loses access to the application immediately
- Deletion confirmation email sent via Resend
- 30-day countdown begins

**Day 30 (hard deletion)**:

- All user-identifiable PII replaced with HMAC-SHA256 pseudonyms or null values
- User's personal meeting recordings and transcripts: customer is notified to export data within the 30-day window; after 30 days, recordings are deleted from Azure Blob Storage
- Organisation membership records anonymised
- Audit log entries: user identifier replaced with anonymised identifier; log integrity preserved
- Billing records: name replaced with anonymised identifier; financial transaction amounts retained for 7 years per Dutch law
- Stripe customer record: name and email removed from Stripe

The 30-day window allows users to reconsider deletion (right to retract a deletion request within the window) and provides time for data export.

### 5.3 GDPR Data Export

When a data subject exercises their right to data portability, Inovy generates a GDPR export package containing:

- Account information (name, email, registration date)
- Meeting recordings metadata (not the audio files, which are too large for export packages; separate download links provided)
- Transcripts in plain text format
- AI-generated summaries
- Integration connection history (not OAuth tokens)

The export package is made available via a **signed Azure Blob Storage URL** that expires after **7 days**. The package is automatically deleted from Azure Blob Storage after expiry. The signed URL is transmitted to the data subject's registered email address via Resend.

## 6. Data Masking and Pseudonymisation (A.8.11)

### 6.1 PII Detection

Inovy's PII detection service (`pii-detection.service.ts`) scans text content for the following categories of personal data:

| PII Category              | Detection Method                                      | Action                              |
| ------------------------- | ----------------------------------------------------- | ----------------------------------- |
| Email addresses           | Regex pattern                                         | Redact / anonymise                  |
| Phone numbers             | Regex (international formats including Dutch)         | Redact / anonymise                  |
| BSN (Burgerservicenummer) | Regex (Dutch 9-digit format with checksum validation) | Redact — never stored in plain text |
| Credit card numbers       | Luhn algorithm + regex                                | Redact — never stored               |
| Medical record references | Pattern matching                                      | Flag for review                     |
| Date of birth             | Pattern matching in context                           | Redact / anonymise                  |
| Physical addresses        | NLP-assisted pattern matching                         | Flag / redact                       |
| IP addresses              | Regex pattern                                         | Anonymise (last octet masked)       |

### 6.2 Redaction in Transcriptions

When the PII detection service identifies PII in a meeting transcript, the following actions are taken:

- **In stored transcripts**: PII is replaced with a category placeholder (e.g., `[EMAIL]`, `[BSN]`, `[PHONE]`) in the "safe" version of the transcript stored for AI processing
- **In the original transcript**: The raw transcript is stored with access restricted to the organisation's owner/admin roles
- **In AI-generated summaries**: Summaries are generated from the redacted transcript; PII is not included in AI-generated content

Transcript redaction is applied automatically as part of the transcription pipeline (post-Deepgram processing).

### 6.3 Log Sanitisation

Application logs are sanitised at the logging layer using **Pino's built-in `redact` configuration**. The following fields are automatically redacted (replaced with `[Redacted]`) in all log output:

```
password, apiKey, token, accessToken, refreshToken, secret,
authorization, cookie, sessionId, email
```

This redaction applies to all log levels and all log sinks (stdout, Azure Monitor). Engineers must not log PII-containing objects directly; they must extract and log only the non-PII fields or pseudonymised identifiers.

Additionally, Pino's `redact` configuration uses path-based redaction with wildcard support to catch nested occurrences (e.g., `*.password`, `*.apiKey`).

### 6.4 PII Anonymisation in Code

For non-operational contexts where a reference to a person must be maintained without storing the actual PII (e.g., audit log attribution, analytics), Inovy uses **HMAC-SHA256 pseudonymisation** implemented in `pii-utils.ts`:

```typescript
// pseudonymiseEmail("user@example.com") → "hmac_sha256_of_email"
export function pseudonymiseEmail(email: string): string {
  return createHmac("sha256", PII_SECRET_KEY).update(email).digest("hex");
}
```

The `PII_SECRET_KEY` is a secret key stored in Azure Container Apps environment variables, not in source code. Pseudonymisation is one-way (not reversible without the key) and consistent (same email always produces the same pseudonym), enabling analytics without exposing PII.

## 7. Data Leakage Prevention (A.8.12)

### 7.1 Log Redaction

As described in Section 6.3, Pino's `redact` configuration prevents PII from appearing in application logs. This is enforced at the application level and applies to all log output. Log review tooling (Azure Monitor Log Analytics) does not receive PII-containing log entries.

### 7.2 Organisation Isolation

Inovy's multi-tenant architecture enforces strict organisation isolation at the data access layer. Every database query that accesses organisation-scoped data (meetings, transcripts, users, integrations) includes a mandatory `organizationId` filter enforced by Drizzle ORM. Cross-organisation data access is prevented at the application layer.

Organisation isolation violations — any query returning data from a different organisation than the requesting user's — are treated as critical security incidents. These events are:

- Blocked immediately (query is rejected)
- Logged as a high-priority security event with the requesting user's identifier and the requested `organizationId`
- Alerted to the ISM via the security monitoring system

### 7.3 AI PII Output Guard

Inovy's AI pipeline includes a **PII output guard middleware** that intercepts responses from AI models (OpenAI GPT-4, Anthropic Claude) before they are returned to users or stored. The guard:

- Runs the PII detection service against AI-generated text
- If PII is detected in AI output, the response is flagged, the PII is redacted, and the event is logged
- Blocks responses that contain BSN numbers, credit card numbers, or other high-sensitivity PII from reaching the user interface

This prevents AI models from "leaking" PII from meeting content into summary or chat responses where it is not expected.

### 7.4 Client-Side Bundle Security

Sensitive data (API keys, database credentials, PII) must never appear in the client-side JavaScript bundle served to browsers. This is enforced by:

- **Next.js Server Components**: Database queries and API calls to sensitive services are executed server-side only
- **Webpack client-side fallbacks**: `next.config.ts` includes `webpack.resolve.fallback` configuration that blocks `fs`, `path`, `os`, `child_process`, and other Node.js modules from being bundled for the browser
- **Environment variable naming**: Only environment variables prefixed with `NEXT_PUBLIC_` are exposed to the client bundle. All sensitive configuration uses non-prefixed variable names
- **Bundle analysis**: Engineers periodically run `@next/bundle-analyzer` to verify that no sensitive modules are included in the client bundle

### 7.5 Third-Party Data Sharing Controls

Personal data is shared with the following third-party processors under data processing agreements (DPAs):

| Processor                      | Data Shared                                    | DPA in Place        | Purpose                      |
| ------------------------------ | ---------------------------------------------- | ------------------- | ---------------------------- |
| Microsoft Azure (EU-Central-1) | All application data (infrastructure provider) | Yes (Microsoft DPA) | Hosting, storage, networking |
| Neon                           | Database content including PII                 | Yes                 | PostgreSQL hosting           |
| OpenAI                         | Meeting transcript segments for AI analysis    | Yes                 | AI insights generation       |
| Anthropic                      | Meeting transcript segments for AI analysis    | Yes                 | AI insights generation       |
| Deepgram                       | Audio recordings for transcription             | Yes                 | Speech-to-text transcription |
| Recall.ai                      | Meeting bot integration                        | Yes                 | Meeting recording ingestion  |
| Stripe                         | Billing name, email, payment method            | Yes (Stripe DPA)    | Payment processing           |
| Resend                         | Email addresses for transactional email        | Yes                 | Email delivery               |
| Google                         | OAuth identity data                            | Yes                 | Google Workspace SSO         |
| Microsoft                      | OAuth identity data                            | Yes                 | Microsoft SSO                |

No personal data is shared with any third party not listed above without explicit ISM approval and, where required, a DPIA. Data processing agreements are reviewed annually.

## 8. Data Classification

Inovy classifies information into four tiers:

| Classification   | Examples                                                                                   | Access                           |
| ---------------- | ------------------------------------------------------------------------------------------ | -------------------------------- |
| **Public**       | Marketing materials, public documentation                                                  | No restriction                   |
| **Internal**     | Internal policies, meeting notes, architecture diagrams                                    | All Inovy staff                  |
| **Confidential** | Customer account data, usage metrics, contracts                                            | Role-based; need-to-know         |
| **Restricted**   | Meeting recordings, transcripts, BSN numbers, API keys, OAuth tokens, database credentials | Strict role-based; logged access |

Restricted data must be handled according to the controls in this policy and POL-13 (Secure Development Lifecycle Policy).

## 9. Data Breach Notification

In the event of a personal data breach, Inovy must notify:

- **Dutch DPA (Autoriteit Persoonsgegevens)**: Within **72 hours** of becoming aware of the breach, if the breach is likely to result in a risk to the rights and freedoms of natural persons (GDPR Article 33)
- **Affected data subjects**: Without undue delay if the breach is likely to result in a high risk to their rights and freedoms (GDPR Article 34)
- **Affected customers** (for breaches of their customers' data): As soon as reasonably practicable, to allow them to fulfil their own notification obligations

Breach response is coordinated under POL-07 (Incident Management Policy). The DPO is involved in all breach notification decisions.

## 10. Related Documents

| Document                                | Reference |
| --------------------------------------- | --------- |
| Information Security Policy             | POL-01    |
| Incident Management Policy              | POL-07    |
| Secure Development Lifecycle Policy     | POL-13    |
| Logging & Monitoring Policy             | POL-16    |
| Legal & Compliance Register             | POL-20    |
| Records of Processing Activities (RoPA) | ISMS-RoPA |

## 11. Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
