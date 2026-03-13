# Data Protection Impact Assessment (DPIA)

## AI Analysis of Meeting Recordings and Transcripts

---

## 1. Document Metadata

| Field                | Value                                                  |
| -------------------- | ------------------------------------------------------ |
| **Document ID**      | DPIA-001                                               |
| **Version**          | 1.0                                                    |
| **Classification**   | Confidential                                           |
| **Status**           | Draft                                                  |
| **Owner**            | Information Security Manager, Inovico B.V.             |
| **DPO Contact**      | privacy@inovico.nl                                     |
| **Effective Date**   | 2026-03-13                                             |
| **Next Review Date** | 2026-09-13                                             |
| **Legal Basis**      | GDPR Article 35(1), Article 35(3)(a), Article 35(3)(b) |
| **Approved By**      | _Pending_                                              |
| **Approval Date**    | _Pending_                                              |

### Revision History

| Version | Date       | Author  | Description             |
| ------- | ---------- | ------- | ----------------------- |
| 1.0     | 2026-03-13 | ISM/DPO | Initial DPIA assessment |

---

## 2. Project Description

### 2.1 Overview

**Inovy** is an AI-powered meeting recording and management platform operated by **Inovico B.V.** The platform enables organizations to record meetings, generate automatic transcriptions, and apply artificial intelligence to extract summaries, action items, and conversational insights from meeting content.

This DPIA assesses the highest-risk processing activity within the Inovy platform: **the AI-based analysis of meeting recordings and transcripts**. This processing involves transmitting transcribed meeting content to third-party AI providers for natural language understanding, which may include content containing personal data or special categories of personal data.

### 2.2 Processing Activities

The AI meeting analysis pipeline comprises the following stages:

1. **Audio recording capture** -- Meeting audio is captured and stored encrypted at rest (AES-256-GCM) in organization-scoped storage.
2. **Transcription** -- Audio files are transmitted to **Deepgram** for speech-to-text transcription. Deepgram returns timestamped utterances with speaker diarization.
3. **PII detection and redaction** -- The `PIIDetectionService` (`pii-detection.service.ts`) scans transcripts for personally identifiable information before further processing. Detected PII types include: email addresses, phone numbers (Dutch formats), BSN (Burger Service Nummer) with elfproef validation, credit card numbers, medical record numbers, dates of birth, addresses (Dutch street patterns), and IP addresses.
4. **AI analysis** -- Redacted transcripts are sent to AI providers (**OpenAI GPT-4** and **Anthropic Claude**) to generate:
   - Meeting summaries
   - Action items with assignee extraction
   - Key decisions and discussion insights
   - Sentiment and topic analysis
5. **Output guardrail scanning** -- AI-generated responses are scanned by the PII output guard middleware (`pii-output-guard.middleware.ts`) to detect and redact any PII the model may hallucinate or reproduce from context.
6. **Storage and presentation** -- Processed outputs are stored in the organization's database scope and presented through the web application.

### 2.3 Data Subjects

| Category              | Examples                                                       |
| --------------------- | -------------------------------------------------------------- |
| Meeting participants  | Employees, contractors, clients, partners                      |
| Mentioned individuals | Persons named or discussed during meetings                     |
| External parties      | Customers, suppliers, candidates referenced in meeting content |

### 2.4 Categories of Personal Data Processed

| Category                    | Examples                                                        | GDPR Classification           |
| --------------------------- | --------------------------------------------------------------- | ----------------------------- |
| Voice recordings            | Audio of meeting participants                                   | Personal data                 |
| Names and roles             | Speaker names, job titles, team affiliations                    | Personal data                 |
| Contact details             | Email addresses, phone numbers spoken during meetings           | Personal data                 |
| BSN (Burger Service Nummer) | Dutch national identification numbers mentioned in meetings     | National identifier (Art. 87) |
| Health information          | Medical conditions, treatments, diagnoses discussed in meetings | Special category (Art. 9)     |
| Financial information       | Credit card numbers, salary details spoken during meetings      | Personal data                 |
| Professional opinions       | Performance assessments, evaluations discussed verbally         | Personal data                 |
| Behavioral data             | Sentiment analysis, participation patterns, speaking time       | Personal data (profiling)     |

### 2.5 Third-Party Processors

| Processor | Role                         | Data Transmitted                          | Location     | DPA in Place |
| --------- | ---------------------------- | ----------------------------------------- | ------------ | ------------ |
| Deepgram  | Speech-to-text transcription | Audio recordings                          | US (SOC 2)   | Yes / _TBC_  |
| OpenAI    | AI analysis (GPT-4)          | Redacted transcript text, prompts         | US (SOC 2)   | Yes / _TBC_  |
| Anthropic | AI analysis (Claude)         | Redacted transcript text, prompts         | US (SOC 2)   | Yes / _TBC_  |
| Neon      | PostgreSQL database hosting  | All structured data including transcripts | EU           | Yes / _TBC_  |
| Vercel    | Application hosting          | Application traffic, session data         | EU preferred | Yes / _TBC_  |

### 2.6 Why a DPIA Is Required

This processing triggers a mandatory DPIA under GDPR Article 35 for the following reasons:

- **Systematic evaluation of personal aspects (Art. 35(3)(a))**: AI analysis evaluates meeting participants' contributions, sentiment, and behavior to generate insights and action items.
- **Processing on a large scale (Art. 35(3)(b))**: The platform is designed for organizational-wide use, processing many meetings across multiple departments.
- **Special categories of data**: Meeting recordings may contain health information (Art. 9) or national identifiers such as BSN (Art. 87).
- **New technologies**: The use of large language models (LLMs) for analyzing personal communications constitutes new technology with inherent unpredictability in output.
- **Automated decision-making elements**: AI-generated action items and assignee suggestions may influence organizational decisions about individuals.
- **EDPB guidelines**: The combination of evaluation/scoring, automated processing, sensitive data, and new technology exceeds the threshold of two criteria from the EDPB blacklist, requiring a DPIA.

---

## 3. Necessity and Proportionality Assessment

### 3.1 Legal Basis for Processing

| Processing Activity   | Legal Basis                                                   | Justification                                                                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Audio recording       | Art. 6(1)(a) -- Consent                                       | Explicit consent is obtained from all participants before recording begins. Only `explicit` consent is accepted; implicit and bot-notification methods are rejected at the application level (`consent.service.ts`). |
| Transcription         | Art. 6(1)(b) -- Contract                                      | Transcription is a core contracted service feature, necessary for performance of the agreement with the customer organization.                                                                                       |
| AI analysis           | Art. 6(1)(f) -- Legitimate interest / Art. 6(1)(a) -- Consent | AI analysis provides the primary value proposition. A legitimate interest assessment (LIA) supports this basis, supplemented by consent for special category data under Art. 9(2)(a).                                |
| Special category data | Art. 9(2)(a) -- Explicit consent                              | Processing of health data or BSN that may appear in meeting content requires explicit consent, which is enforced through the consent management system.                                                              |

### 3.2 Purpose Limitation

The AI analysis is strictly limited to the following purposes:

1. Generating meeting summaries for participant review
2. Extracting action items and assignments
3. Identifying key decisions and discussion topics
4. Providing searchable meeting archives

AI outputs are **not** used for:

- Employee performance evaluation or scoring
- Automated disciplinary decisions
- Surveillance or monitoring of individual behavior
- Profiling for marketing or advertising
- Sale or licensing to third parties

### 3.3 Data Minimization Measures

The platform implements layered data minimization:

1. **Pre-processing PII redaction**: The `PIIDetectionService` scans all transcripts before they are sent to AI providers. Eight PII categories are detected with configurable confidence thresholds (default: 0.5 for automatic detection, 0.7 for AI middleware). Detected PII is replaced with category-tagged placeholders (e.g., `[EMAIL_REDACTED]`, `[BSN_REDACTED]`).

2. **Input guard middleware**: The `createPIIInputGuardMiddleware` (`pii-input-guard.middleware.ts`) intercepts all prompts sent to AI models. It operates in two modes:
   - **Redact mode** (default): Automatically replaces PII in prompts before transmission.
   - **Block mode**: Rejects the entire request if PII is detected, returning a user-facing error.

3. **Output guard middleware**: The `createPIIOutputGuardMiddleware` (`pii-output-guard.middleware.ts`) scans all AI-generated responses -- both streamed and non-streamed -- for PII before they reach the client. Any PII reproduced or hallucinated by the model is redacted before display.

4. **Minimal prompt context**: Only the redacted transcript text and system prompts are sent to AI providers. Raw audio, user account details, and organization metadata are not included in AI requests.

5. **No model training**: Contracts with OpenAI and Anthropic stipulate that customer data is not used for model training. OpenAI API usage with data processing agreements explicitly opts out of training data usage.

### 3.4 Storage Limitation

- **Active recordings**: Retained for the duration specified in the organization's data retention policy.
- **Archived recordings**: Automatically purged after a 90-day retention period by the automated `DataRetentionService` (`data-retention.service.ts`), executed via scheduled cron job (`/api/cron/data-retention`).
- **AI-generated outputs**: Retained alongside and deleted together with their parent recording.
- **Audit logs**: Retained per regulatory requirements (minimum 12 months) with tamper-proof hash chain integrity.

### 3.5 Accuracy

- Transcription accuracy is dependent on Deepgram's speech-to-text model quality. Users can review and correct transcripts.
- AI-generated summaries and action items are presented as suggestions, not authoritative records. Users can edit, reject, or regenerate outputs.
- PII detection uses pattern-based matching with elfproef validation for BSN numbers, reducing false positives for Dutch national identifiers.

### 3.6 Data Subject Rights

| Right                               | Implementation                                                                                                  |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Right of access (Art. 15)           | Users can access all their recordings, transcripts, and AI outputs through the application.                     |
| Right to rectification (Art. 16)    | Users can edit transcripts and correct AI-generated outputs.                                                    |
| Right to erasure (Art. 17)          | Recording deletion cascades to all associated data: audio, transcript, redactions, AI outputs.                  |
| Right to restriction (Art. 18)      | Recordings can be archived, restricting processing while retaining data.                                        |
| Right to data portability (Art. 20) | Export functionality allows download of recordings and transcripts.                                             |
| Right to object (Art. 21)           | Consent can be revoked per-participant via the consent management system; revocation triggers data restriction. |
| Automated decision-making (Art. 22) | AI outputs are advisory only; no solely automated decisions are made about individuals.                         |

---

## 4. Risk Assessment

### 4.1 Risk Matrix Methodology

Risks are assessed on two axes:

- **Likelihood**: Unlikely (1), Possible (2), Likely (3), Almost Certain (4)
- **Impact**: Negligible (1), Minor (2), Significant (3), Severe (4)

**Risk Score** = Likelihood x Impact

| Score Range | Risk Level |
| ----------- | ---------- |
| 1--4        | Low        |
| 5--8        | Medium     |
| 9--12       | High       |
| 13--16      | Critical   |

### 4.2 Identified Risks

#### RISK-01: Unauthorized Access to Meeting Content

| Attribute               | Assessment                                                                                                                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**         | An unauthorized user gains access to meeting recordings, transcripts, or AI-generated outputs belonging to another organization or team.                                                                                                                                                    |
| **Data affected**       | Voice recordings, transcripts, summaries, action items, any PII or special category data within.                                                                                                                                                                                            |
| **Likelihood**          | Possible (2)                                                                                                                                                                                                                                                                                |
| **Impact**              | Severe (4)                                                                                                                                                                                                                                                                                  |
| **Inherent risk score** | **8 -- Medium**                                                                                                                                                                                                                                                                             |
| **Existing controls**   | Organization isolation enforced at data access layer (`assertOrganizationAccess`); RBAC with role hierarchy (superadmin, owner, admin, manager, user, viewer); team-level access controls (`canAccessTeam`); encrypted storage (AES-256-GCM); session-based authentication via Better Auth. |
| **Residual risk**       | **4 -- Low**                                                                                                                                                                                                                                                                                |

#### RISK-02: PII Leakage in AI-Generated Outputs

| Attribute               | Assessment                                                                                                                                                                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**         | The AI model reproduces, infers, or hallucinates PII in its generated summaries, action items, or insights despite input redaction.                                                                                               |
| **Data affected**       | Names, email addresses, phone numbers, addresses, and other personal data.                                                                                                                                                        |
| **Likelihood**          | Possible (2)                                                                                                                                                                                                                      |
| **Impact**              | Significant (3)                                                                                                                                                                                                                   |
| **Inherent risk score** | **6 -- Medium**                                                                                                                                                                                                                   |
| **Existing controls**   | PII input guard middleware redacts PII before AI transmission; PII output guard middleware scans and redacts all AI responses (both streamed and non-streamed); 8-category PII detection with configurable confidence thresholds. |
| **Residual risk**       | **3 -- Low**                                                                                                                                                                                                                      |

#### RISK-03: BSN or Health Data Exposure

| Attribute               | Assessment                                                                                                                                                                                                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**         | BSN (Burger Service Nummer) or health information spoken during meetings passes through to AI providers or is stored unredacted.                                                                                                                                                         |
| **Data affected**       | National identifiers (BSN), health/medical information -- special category data under Art. 9.                                                                                                                                                                                            |
| **Likelihood**          | Possible (2)                                                                                                                                                                                                                                                                             |
| **Impact**              | Severe (4)                                                                                                                                                                                                                                                                               |
| **Inherent risk score** | **8 -- Medium**                                                                                                                                                                                                                                                                          |
| **Existing controls**   | BSN detection with elfproef validation in `PIIDetectionService`; medical record number detection; automatic redaction before AI processing; input guard middleware as secondary defense; output guard middleware as tertiary defense; explicit consent enforcement for all participants. |
| **Residual risk**       | **4 -- Low**                                                                                                                                                                                                                                                                             |

#### RISK-04: Cross-Organization Data Leakage

| Attribute               | Assessment                                                                                                                                                                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**         | Data from one organization becomes accessible to users of another organization due to a multi-tenancy isolation failure.                                                                                                                                                                                            |
| **Data affected**       | All recording data, transcripts, AI outputs, participant information.                                                                                                                                                                                                                                               |
| **Likelihood**          | Unlikely (1)                                                                                                                                                                                                                                                                                                        |
| **Impact**              | Severe (4)                                                                                                                                                                                                                                                                                                          |
| **Inherent risk score** | **4 -- Low**                                                                                                                                                                                                                                                                                                        |
| **Existing controls**   | `assertOrganizationAccess` enforced at the data access layer across all queries and mutations; `verifyOrganizationAccess` utility validates organization context; every service method (recordings, redactions, consent, audit) includes organization boundary checks; database queries scoped to `organizationId`. |
| **Residual risk**       | **2 -- Low**                                                                                                                                                                                                                                                                                                        |

#### RISK-05: Third-Party Processor Security Breach

| Attribute               | Assessment                                                                                                                                                                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**         | A security breach at a third-party processor (Deepgram, OpenAI, Anthropic) exposes meeting data transmitted for processing.                                                                                                                                                                                          |
| **Data affected**       | Audio recordings (Deepgram), redacted transcript text and prompts (OpenAI, Anthropic).                                                                                                                                                                                                                               |
| **Likelihood**          | Possible (2)                                                                                                                                                                                                                                                                                                         |
| **Impact**              | Significant (3)                                                                                                                                                                                                                                                                                                      |
| **Inherent risk score** | **6 -- Medium**                                                                                                                                                                                                                                                                                                      |
| **Existing controls**   | Data processing agreements (DPAs) with all processors; SOC 2 Type II compliance required for all AI providers; PII redaction before transmission reduces the sensitivity of data in transit; API-level encryption (TLS 1.2+) for all data transmission; contractual prohibition on data retention beyond processing. |
| **Residual risk**       | **4 -- Low**                                                                                                                                                                                                                                                                                                         |

#### RISK-06: AI Model Training on Customer Data

| Attribute               | Assessment                                                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**         | Third-party AI providers use Inovy customer meeting data to train or fine-tune their models, resulting in potential data memorization and cross-customer data leakage.                                                                  |
| **Data affected**       | Redacted transcript text, prompts, AI interaction patterns.                                                                                                                                                                             |
| **Likelihood**          | Unlikely (1)                                                                                                                                                                                                                            |
| **Impact**              | Severe (4)                                                                                                                                                                                                                              |
| **Inherent risk score** | **4 -- Low**                                                                                                                                                                                                                            |
| **Existing controls**   | DPA with OpenAI includes explicit opt-out from training data usage; Anthropic API terms prohibit training on API customer data; contractual review and vendor assessment process; regular verification of provider data handling terms. |
| **Residual risk**       | **2 -- Low**                                                                                                                                                                                                                            |

#### RISK-07: Insufficient Consent for Recording and AI Processing

| Attribute               | Assessment                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**         | Meeting participants are recorded or their data is processed by AI without valid explicit consent, violating Art. 6(1)(a) and Art. 9(2)(a).                                                                                                                                                                                                                                 |
| **Data affected**       | All personal data of non-consenting participants.                                                                                                                                                                                                                                                                                                                           |
| **Likelihood**          | Possible (2)                                                                                                                                                                                                                                                                                                                                                                |
| **Impact**              | Significant (3)                                                                                                                                                                                                                                                                                                                                                             |
| **Inherent risk score** | **6 -- Medium**                                                                                                                                                                                                                                                                                                                                                             |
| **Existing controls**   | `ConsentService` enforces explicit-only consent; implicit and bot-notification consent methods are programmatically rejected; consent status tracked per participant per recording; consent audit trail with IP address and user agent; consent revocation triggers data restriction; UI consent manager component (`consent-manager.tsx`) with clear participant tracking. |
| **Residual risk**       | **3 -- Low**                                                                                                                                                                                                                                                                                                                                                                |

#### RISK-08: Audit Trail Tampering

| Attribute               | Assessment                                                                                                                                                                                                                                                                                                                                           |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**         | An attacker or malicious insider tampers with audit logs to conceal unauthorized access or data exfiltration.                                                                                                                                                                                                                                        |
| **Data affected**       | Audit records covering all system events.                                                                                                                                                                                                                                                                                                            |
| **Likelihood**          | Unlikely (1)                                                                                                                                                                                                                                                                                                                                         |
| **Impact**              | Significant (3)                                                                                                                                                                                                                                                                                                                                      |
| **Inherent risk score** | **3 -- Low**                                                                                                                                                                                                                                                                                                                                         |
| **Existing controls**   | SHA-256 hash chain integrity verification (`computeHash` in `audit-log.service.ts`); each audit log entry includes `previousHash` creating a tamper-evident chain; comprehensive event type coverage (recording, task, user, permission, export, integration, project events); structured logging via Pino with automatic sensitive field redaction. |
| **Residual risk**       | **2 -- Low**                                                                                                                                                                                                                                                                                                                                         |

#### RISK-09: Log and Error Message PII Exposure

| Attribute               | Assessment                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Description**         | Personal data is inadvertently written to application logs, error tracking systems, or monitoring dashboards.                                                                                                                                                                                                                                                                                  |
| **Data affected**       | Email addresses, names, tokens, session identifiers, BSN.                                                                                                                                                                                                                                                                                                                                      |
| **Likelihood**          | Possible (2)                                                                                                                                                                                                                                                                                                                                                                                   |
| **Impact**              | Minor (2)                                                                                                                                                                                                                                                                                                                                                                                      |
| **Inherent risk score** | **4 -- Low**                                                                                                                                                                                                                                                                                                                                                                                   |
| **Existing controls**   | Pino `redact` configuration automatically strips sensitive fields (password, apiKey, token, accessToken, refreshToken, secret, authorization, cookie, sessionId, email) with wildcard path support; PII anonymization via HMAC-SHA256 hashing in `pii-utils.ts`; log statements use UUIDs (e.g., `participantId`) instead of PII (e.g., email); consent service explicitly avoids logging PII. |
| **Residual risk**       | **2 -- Low**                                                                                                                                                                                                                                                                                                                                                                                   |

### 4.3 Risk Assessment Summary

| Risk ID | Risk Description                       | Inherent Score | Risk Level | Residual Score | Residual Level |
| ------- | -------------------------------------- | -------------- | ---------- | -------------- | -------------- |
| RISK-01 | Unauthorized access to meeting content | 8              | Medium     | 4              | Low            |
| RISK-02 | PII leakage in AI-generated outputs    | 6              | Medium     | 3              | Low            |
| RISK-03 | BSN/health data exposure               | 8              | Medium     | 4              | Low            |
| RISK-04 | Cross-organization data leakage        | 4              | Low        | 2              | Low            |
| RISK-05 | Third-party processor security breach  | 6              | Medium     | 4              | Low            |
| RISK-06 | Model training on customer data        | 4              | Low        | 2              | Low            |
| RISK-07 | Insufficient consent                   | 6              | Medium     | 3              | Low            |
| RISK-08 | Audit trail tampering                  | 3              | Low        | 2              | Low            |
| RISK-09 | Log/error message PII exposure         | 4              | Low        | 2              | Low            |

---

## 5. Existing Mitigation Measures (Detailed)

### 5.1 Encryption at Rest

All meeting recordings, transcripts, and AI-generated outputs are encrypted using **AES-256-GCM** before storage. Encryption keys are managed through a dedicated key management procedure aligned with ISO 27001 A.10 controls.

### 5.2 PII Detection and Redaction Pipeline

The `PIIDetectionService` (`apps/web/src/server/services/pii-detection.service.ts`) implements pattern-based detection for eight categories of PII:

| PII Type       | Detection Method                                    | Confidence |
| -------------- | --------------------------------------------------- | ---------- |
| Email          | RFC-compliant regex pattern                         | 0.95       |
| Phone          | Dutch phone number format patterns                  | Varies     |
| BSN            | 9-digit pattern with elfproef (11-check) validation | High       |
| Credit card    | Standard card number patterns with Luhn validation  | High       |
| Medical record | Medical record number patterns                      | Varies     |
| Date of birth  | Dutch date format patterns                          | Varies     |
| Address        | Dutch street name patterns                          | Varies     |
| IP address     | IPv4 pattern matching                               | Varies     |

Detections above the configured confidence threshold are automatically replaced with category-tagged placeholders. The `RedactionService` (`apps/web/src/server/services/redaction.service.ts`) manages the lifecycle of redactions, supporting both automatic and manual redaction with full undo capability.

### 5.3 AI Middleware Guardrails

Two AI middleware layers provide defense-in-depth:

1. **PII Input Guard** (`pii-input-guard.middleware.ts`): Intercepts all user messages before transmission to AI providers. Operates in `redact` (default) or `block` mode. Scans each text part of multi-part messages independently.

2. **PII Output Guard** (`pii-output-guard.middleware.ts`): Intercepts all AI responses. For non-streamed responses, scans each content block. For streamed responses, accumulates text blocks and applies redaction at block boundaries. Logs all detections with organization context for monitoring.

### 5.4 Organization Isolation

Every data access operation enforces organization boundaries through `assertOrganizationAccess` (from `apps/web/src/lib/rbac/organization-isolation.ts`). This is applied at the service layer, meaning all query and mutation paths -- recordings, redactions, consent, audit logs -- validate that the requesting user's organization matches the target resource's organization. This prevents cross-tenant data access at the application level.

### 5.5 Role-Based Access Control (RBAC)

The platform implements a six-level role hierarchy:

| Role       | Scope        | Capabilities                                        |
| ---------- | ------------ | --------------------------------------------------- |
| superadmin | System-wide  | Full system administration across all organizations |
| owner      | Organization | Full organization management, all permissions       |
| admin      | Organization | Organization administration, user management        |
| manager    | Team/Project | Team and project management, all team resources     |
| user       | Organization | Standard access to assigned resources               |
| viewer     | Organization | Read-only access to permitted resources             |

Role checks are enforced through utility functions (`isOwner`, `isAdmin`, `isOrganizationAdmin`, `isTeamManager`, `canAccessTeam`, `isSuperAdmin`) defined in `apps/web/src/lib/rbac/rbac.ts`.

### 5.6 Audit Logging with Hash Chain Integrity

The `AuditLogService` (`apps/web/src/server/services/audit-log.service.ts`) implements tamper-evident audit logging:

- Every audit log entry includes a SHA-256 hash computed from the previous entry's hash plus the current entry's fields (eventType, resourceType, resourceId, userId, organizationId, action, createdAt, metadata).
- The resulting hash chain allows detection of any insertion, deletion, or modification of audit records.
- Comprehensive event coverage spans recording, task, user, permission, export, integration, and project lifecycle events.
- Three audit subsystems operate independently: general audit logs, chat audit logs, and consent audit logs.

### 5.7 Consent Management

The `ConsentService` (`apps/web/src/server/services/consent.service.ts`) enforces strict consent rules:

- **Explicit-only consent**: The service programmatically rejects `implicit` and `bot-notification` consent methods, returning a validation error. Only `explicit` consent is accepted for GDPR and HIPAA compliance.
- **Per-participant tracking**: Consent is tracked individually for each participant in each recording.
- **Consent audit trail**: The `ConsentAuditService` logs every consent grant and revocation with timestamp, IP address, and user agent.
- **Revocation support**: Participants can revoke consent at any time, triggering data restriction.
- **UI components**: `consent-manager.tsx` and `consent-banner.tsx` provide clear, accessible consent interfaces.

### 5.8 Data Retention Automation

The `DataRetentionService` (`apps/web/src/server/services/data-retention.service.ts`) runs on a scheduled cron job (`/api/cron/data-retention`) and enforces:

- Automatic purge of archived recordings past the 90-day retention period.
- Cascading deletion of all associated data (transcripts, redactions, AI outputs, consent records).
- Execution logging for compliance auditability.

### 5.9 Log Sanitization

Pino's `redact` configuration automatically strips sensitive fields from all log output:

- **Redacted fields**: `password`, `apiKey`, `token`, `accessToken`, `refreshToken`, `secret`, `authorization`, `cookie`, `sessionId`, `email`
- **Wildcard path support**: Catches nested occurrences (e.g., `*.password`, `*.apiKey`).
- **PII anonymization**: The `pii-utils.ts` module provides HMAC-SHA256 hashing for PII values that must be correlated across log entries without exposing the original value.
- **Service-level discipline**: Services such as `ConsentService` explicitly log only UUIDs (e.g., `participantId`) rather than PII (e.g., email addresses).

---

## 6. Residual Risk Assessment

### 6.1 Overall Residual Risk Profile

After applying all existing mitigation measures, the residual risk profile for AI meeting analysis is assessed as **Low**.

| Metric                                   | Value |
| ---------------------------------------- | ----- |
| Total risks identified                   | 9     |
| Risks at Low residual level              | 9     |
| Risks at Medium residual level           | 0     |
| Risks at High or Critical residual level | 0     |
| Highest residual risk score              | 4     |
| Average residual risk score              | 2.9   |

### 6.2 Residual Risk Acceptance Rationale

All identified risks have been mitigated to Low residual levels through a combination of technical controls (encryption, PII detection/redaction, organization isolation, RBAC), procedural controls (consent management, data retention policies, audit logging), and contractual controls (DPAs, training opt-out clauses). The remaining residual risks reflect the inherent impossibility of guaranteeing zero risk in any data processing operation.

### 6.3 Recommended Additional Measures

While all residual risks are currently assessed as Low, the following measures are recommended to further strengthen the risk posture:

| #   | Recommendation                                                                                                                                                                                                            | Priority | Target Date |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------- |
| 1   | Implement dedicated NLP-based PII detection (e.g., Microsoft Presidio or spaCy) to supplement pattern-based detection for names, contextual references, and unstructured PII that regex patterns cannot reliably capture. | High     | _TBD_       |
| 2   | Conduct penetration testing of the organization isolation layer specifically targeting cross-tenant access vectors.                                                                                                       | High     | _TBD_       |
| 3   | Implement EU-based AI processing option (when available from providers) to eliminate international data transfers for AI analysis.                                                                                        | Medium   | _TBD_       |
| 4   | Add real-time monitoring dashboards for PII detection rates across the input/output guard middleware to detect anomalies in redaction patterns.                                                                           | Medium   | _TBD_       |
| 5   | Implement data subject notification workflow for cases where PII redaction fails and data is transmitted to a third-party processor.                                                                                      | Medium   | _TBD_       |
| 6   | Conduct regular (quarterly) review of AI provider DPAs and data handling terms to ensure continued compliance with no-training commitments.                                                                               | Low      | Ongoing     |
| 7   | Implement transcript content classification to automatically flag recordings containing special category data for enhanced handling.                                                                                      | Medium   | _TBD_       |

---

## 7. DPO Consultation Outcome

### 7.1 Consultation Details

| Field                   | Value                      |
| ----------------------- | -------------------------- |
| **DPO Name**            | _To be completed_          |
| **DPO Contact**         | privacy@inovico.nl         |
| **Consultation Date**   | _To be completed_          |
| **Consultation Method** | _Meeting / Written review_ |

### 7.2 DPO Opinion

_To be completed by the DPO after review._

The DPO should assess:

- [ ] Whether the processing purposes are clearly defined and limited
- [ ] Whether the legal basis is appropriate for each processing activity
- [ ] Whether data minimization measures are sufficient given the sensitivity of meeting content
- [ ] Whether the PII detection coverage is adequate for Dutch-specific identifiers (BSN, address formats)
- [ ] Whether consent mechanisms meet the requirements for special category data under Art. 9(2)(a)
- [ ] Whether the international data transfer safeguards (SCCs, DPAs) are adequate for US-based AI providers
- [ ] Whether the residual risk levels are acceptable
- [ ] Whether the recommended additional measures have appropriate priority and timelines
- [ ] Whether supervisory authority consultation under Art. 36 is required

### 7.3 DPO Recommendations

_To be completed by the DPO._

### 7.4 Supervisory Authority Consultation (Art. 36)

| Field           | Assessment                                                                                                                                                                                                                              |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Required?**   | _To be determined by DPO_                                                                                                                                                                                                               |
| **Rationale**   | If residual risks remain High after mitigation, consultation with the Autoriteit Persoonsgegevens (AP) is mandatory under Art. 36(1). Current assessment indicates all residual risks are Low, suggesting consultation is not required. |
| **If required** | Contact: Autoriteit Persoonsgegevens, Bezuidenhoutseweg 30, 2594 AV Den Haag                                                                                                                                                            |

---

## 8. Approval and Sign-Off

### 8.1 DPIA Review and Approval

| Role                             | Name           | Signature      | Date                   |
| -------------------------------- | -------------- | -------------- | ---------------------- |
| **Data Protection Officer**      | ******\_****** | ******\_****** | \_**\_/\_\_**/\_\_\_\_ |
| **Information Security Manager** | ******\_****** | ******\_****** | \_**\_/\_\_**/\_\_\_\_ |
| **Chief Technology Officer**     | ******\_****** | ******\_****** | \_**\_/\_\_**/\_\_\_\_ |
| **Managing Director**            | ******\_****** | ******\_****** | \_**\_/\_\_**/\_\_\_\_ |

### 8.2 Approval Decision

- [ ] **Approved** -- Processing may proceed under the conditions described in this DPIA.
- [ ] **Approved with conditions** -- Processing may proceed subject to implementation of the additional measures listed in Section 6.3.
- [ ] **Rejected** -- Processing may not proceed. Reasons: ************\_************
- [ ] **Referred to supervisory authority** -- Residual risks require consultation under Art. 36.

### 8.3 Review Schedule

This DPIA shall be reviewed:

- **Periodically**: At least every 6 months (next review: 2026-09-13).
- **Upon change**: Whenever there is a material change to the processing activities, including but not limited to:
  - Addition of new AI providers or models
  - Changes to PII detection or redaction logic
  - Changes to data retention policies
  - New categories of personal data processed
  - Changes to international data transfer mechanisms
  - Security incidents affecting meeting data
  - Changes in applicable legislation or regulatory guidance

---

## Appendix A: Related Documents

| Document                                       | Location                                                        |
| ---------------------------------------------- | --------------------------------------------------------------- |
| ISO 27001 Data Protection & Privacy Policy     | `docs/iso27001/policies/POL-15-data-protection-privacy.md`      |
| ISO 27001 Logging & Monitoring Policy          | `docs/iso27001/policies/POL-16-logging-monitoring.md`           |
| ISO 27001 Access Control Policy                | `docs/iso27001/policies/POL-01-access-control.md`               |
| ISO 27001 Cryptography & Key Management Policy | `docs/iso27001/policies/POL-05-cryptography-key-management.md`  |
| ISO 27001 Secure Development Lifecycle Policy  | `docs/iso27001/policies/POL-13-secure-development-lifecycle.md` |
| ISO 27001 Supplier Security Policy             | `docs/iso27001/policies/POL-06-supplier-security.md`            |
| ISO 27001 Risk Register                        | `docs/iso27001/isms/09-risk-register.md`                        |
| SSD Compliance Report                          | `docs/security/ssd-compliance-report.md`                        |
| Key Management Procedure                       | `docs/iso27001/procedures/key-management-procedure.md`          |

## Appendix B: Codebase References

| Component                   | File Path                                                          |
| --------------------------- | ------------------------------------------------------------------ |
| PII Detection Service       | `apps/web/src/server/services/pii-detection.service.ts`            |
| Redaction Service           | `apps/web/src/server/services/redaction.service.ts`                |
| PII Input Guard Middleware  | `apps/web/src/server/ai/middleware/pii-input-guard.middleware.ts`  |
| PII Output Guard Middleware | `apps/web/src/server/ai/middleware/pii-output-guard.middleware.ts` |
| Consent Service             | `apps/web/src/server/services/consent.service.ts`                  |
| Consent Audit Service       | `apps/web/src/server/services/consent-audit.service.ts`            |
| Audit Log Service           | `apps/web/src/server/services/audit-log.service.ts`                |
| Data Retention Service      | `apps/web/src/server/services/data-retention.service.ts`           |
| Data Retention Cron         | `apps/web/src/app/api/cron/data-retention/route.ts`                |
| RBAC Utilities              | `apps/web/src/lib/rbac/rbac.ts`                                    |
| Organization Isolation      | `apps/web/src/lib/rbac/organization-isolation.ts`                  |
| PII Anonymization Utilities | `apps/web/src/lib/pii-utils.ts`                                    |
| Consent Manager UI          | `apps/web/src/features/recordings/components/consent-manager.tsx`  |
| Consent Banner UI           | `apps/web/src/features/recordings/components/consent-banner.tsx`   |
| PII Redaction UI            | `apps/web/src/features/recordings/components/pii-redaction.tsx`    |
