# Context of the Organization

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Document ID         | ISMS-01                      |
| Version             | 1.0                          |
| Classification      | Internal                     |
| Owner               | Information Security Manager |
| Approved by         | CEO/CTO                      |
| Effective date      | 2026-03-13                   |
| Review date         | 2027-03-13                   |
| ISO 27001 Reference | Clause 4.1                   |

---

## 1. Purpose

This document establishes the internal and external context of Inovy's Information Security Management System (ISMS). It defines the factors that influence Inovy's ability to achieve the intended outcomes of its ISMS and forms the foundational basis for scope definition, risk assessment, and strategic security alignment.

---

## 2. Internal Context

### 2.1 Organization Overview

Inovy is a Dutch-registered B2B SaaS company delivering an AI-powered meeting recording and management platform. The product enables organizations to record, transcribe, summarize, and extract structured insights from meetings. Inovy operates as a fully remote-first engineering organization with no permanent physical office. All operations are conducted via cloud-hosted infrastructure and collaborative digital tooling.

### 2.2 Organizational Structure

- **Leadership:** CEO and CTO form executive management and bear ultimate accountability for information security governance.
- **Engineering team:** Distributed across the Netherlands and the EU; responsible for platform development, infrastructure management, and operational security.
- **Information Security Manager (ISM):** Designated role with delegated authority for ISMS operation, policy enforcement, and audit coordination.
- **No physical facilities:** The remote-first model means physical security controls are scoped to employee endpoints rather than centralized premises.

### 2.3 Strategic Goals and Security Alignment

Inovy's business objectives that directly influence information security posture include:

- **Customer trust:** B2B customers entrust Inovy with sensitive organizational data including meeting recordings, transcripts, and PII of meeting participants. Breach of this trust would be commercially fatal.
- **Regulatory compliance:** Operating in the EU with Dutch registration mandates GDPR compliance as a baseline. ISO 27001 certification is pursued to demonstrate systematic controls to enterprise customers and procurement teams.
- **Scalability:** The platform is architected to support multi-tenant SaaS at scale; the multi-tenancy model creates inherent data isolation requirements.
- **AI differentiation:** Core value is delivered through LLM-based AI features. Security of AI pipelines and AI-generated outputs is a distinctive operational concern.

### 2.4 Internal Capabilities Relevant to Information Security

The following internal capabilities shape the ISMS:

| Capability         | Description                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| RBAC system        | Six-role hierarchy (superadmin, owner, admin, manager, user, viewer) with ~50 granular permissions, enforced at server-action and API layer |
| Encryption at rest | AES-256-GCM with PBKDF2 key derivation (100,000 iterations) applied to sensitive data including transcripts and recordings                  |
| Audit logging      | Tamper-proof SHA-256 hash chain audit log capturing all security-relevant events                                                            |
| GDPR tooling       | Automated data deletion, anonymization, consent management, data export, and PII detection/redaction (Dutch BSN, medical terms)             |
| Rate limiting      | Redis-backed token bucket algorithm applied to all sensitive API endpoints                                                                  |
| Input validation   | Zod schema validation on all server actions; AI prompt injection detection middleware                                                       |
| Webhook security   | HMAC-SHA256 verification for all inbound webhook payloads                                                                                   |
| CI/CD security     | GitHub Actions with OIDC-based Azure authentication; no long-lived credentials in pipeline secrets                                          |
| IaC                | Terraform-managed Azure infrastructure enabling reproducible and auditable configuration                                                    |

---

## 3. External Context

### 3.1 Regulatory and Legal Environment

| Regulation / Authority               | Relevance                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **GDPR (EU 2016/679)**               | Primary data protection regulation. Inovy processes personal data of EU data subjects including meeting participants. Obligations include lawful basis, data subject rights, breach notification (72-hour to supervisory authority), data minimization, and DPA agreements with sub-processors. |
| **Autoriteit Persoonsgegevens (AP)** | Dutch Data Protection Authority. Supervisory authority for Inovy's GDPR compliance. Can impose fines up to €20M or 4% global annual turnover.                                                                                                                                                   |
| **Dutch Civil Code (BW)**            | Governs contractual obligations including supplier and customer contracts.                                                                                                                                                                                                                      |
| **NIS2 Directive**                   | EU network and information security directive; Inovy may be classified as an essential or important entity depending on scale and sector classification of customers.                                                                                                                           |
| **AI Act (EU 2024/1689)**            | Emerging regulation on AI systems; Inovy's use of LLMs for processing personal data in meeting contexts warrants monitoring.                                                                                                                                                                    |

### 3.2 Market and Competitive Context

- Inovy operates in a competitive SaaS market alongside established players (Otter.ai, Fireflies.ai, Gong, Chorus). Enterprise customers increasingly evaluate vendors on security posture and certifications during procurement.
- ISO 27001 certification is a competitive differentiator and procurement prerequisite for enterprise contracts, particularly in regulated industries (legal, healthcare, financial services) which represent target market segments.
- Customer sensitivity to data sovereignty is high; data residency in the EU (Azure West Europe, Neon EU-Central-1) is a deliberate commercial and compliance decision.

### 3.3 Supply Chain and Third-Party Context

Inovy's platform depends on a network of external service providers that process customer data. The security posture of these suppliers directly impacts Inovy's risk exposure:

| Supplier                           | Role                                                 | Data Processed                                 |
| ---------------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| Microsoft Azure (West Europe)      | Cloud hosting, container orchestration, blob storage | All platform data                              |
| Neon (EU-Central-1)                | Managed PostgreSQL database                          | All structured data including PII, transcripts |
| Qdrant                             | Vector database                                      | Meeting embeddings, semantic search indexes    |
| Upstash / Azure Redis              | Rate limiting, session caching                       | Session tokens, rate limit counters            |
| OpenAI                             | LLM inference (summarization, task extraction)       | Meeting transcript content                     |
| Anthropic                          | LLM inference (AI features)                          | Meeting transcript content                     |
| Deepgram                           | Speech-to-text transcription                         | Raw meeting audio                              |
| Recall.ai                          | Meeting recording bot                                | Live meeting audio/video                       |
| Google Workspace / Microsoft OAuth | Identity federation (OAuth)                          | User identity attributes                       |
| Stripe                             | Payment processing                                   | Billing and payment data                       |
| Resend                             | Transactional email                                  | User email addresses, notification content     |

---

## 4. Technology Context

### 4.1 Application Stack

| Component          | Technology                         | Security Relevance                                                      |
| ------------------ | ---------------------------------- | ----------------------------------------------------------------------- |
| Frontend / Backend | Next.js 16 App Router (TypeScript) | Server Components, Server Actions with next-safe-action; Zod validation |
| Authentication     | Better Auth (RBAC)                 | Session management, OAuth federation, role enforcement                  |
| ORM                | Drizzle ORM                        | Type-safe queries, migration management                                 |
| Logging            | Pino                               | Structured JSON logging; basis for security event correlation           |
| Validation         | Zod                                | Schema-level input validation on all entry points                       |

### 4.2 Infrastructure

| Component             | Platform                    | Region       | Security Relevance                             |
| --------------------- | --------------------------- | ------------ | ---------------------------------------------- |
| Application runtime   | Azure Container Apps        | West Europe  | Managed container scaling, network isolation   |
| Primary database      | Neon PostgreSQL             | EU-Central-1 | Serverless managed Postgres; EU data residency |
| Object storage        | Azure Blob Storage          | West Europe  | Recording files; AES-256-GCM encrypted at rest |
| Vector database       | Qdrant                      | Cloud        | Semantic search for RAG; meeting embeddings    |
| Cache / Rate limiting | Upstash Redis / Azure Redis | EU           | Token bucket rate limiting, session data       |

### 4.3 CI/CD and Developer Tooling

- **GitHub Actions:** All deployments pass through GitHub Actions pipelines with OIDC federation to Azure (no static credentials).
- **Terraform:** Infrastructure provisioned as code; changes require PR review before apply.
- **Dependabot:** Automated dependency vulnerability scanning and PR creation.
- **GitHub Environments:** Production deployments gated on environment protection rules.

---

## 5. AI-Specific Context

### 5.1 AI Features in Scope

Inovy's core value proposition is AI-powered meeting intelligence. The following AI capabilities are operationally active and in scope for the ISMS:

| Feature                       | AI Component            | Data Flow                                        |
| ----------------------------- | ----------------------- | ------------------------------------------------ |
| Meeting transcription         | Deepgram ASR            | Audio → Deepgram API → transcript stored in Neon |
| Summarization                 | OpenAI / Anthropic LLM  | Transcript → LLM API → summary stored in Neon    |
| Task / action item extraction | OpenAI / Anthropic LLM  | Transcript → LLM API → structured tasks          |
| RAG-based meeting chat        | Qdrant + LLM            | User query → vector search → LLM synthesis       |
| PII detection and redaction   | Custom middleware + LLM | Transcript → PII scan → redacted output          |

### 5.2 AI-Specific Security Controls

The following AI-specific risks are addressed by existing controls:

| Risk                             | Control Implemented                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Prompt injection**             | AI middleware intercepts and evaluates all user-provided inputs before inclusion in LLM prompts; malicious injection patterns are detected and blocked       |
| **PII leakage in AI outputs**    | Post-generation PII guard scans LLM outputs for Dutch BSN numbers, medical terms, and other sensitive patterns before returning to users                     |
| **Input moderation**             | Content moderation layer applied to user-submitted meeting content before processing                                                                         |
| **AI output trust**              | LLM outputs are treated as untrusted data; all structured data extracted from LLMs is validated against Zod schemas before persistence                       |
| **Third-party LLM data sharing** | OpenAI and Anthropic DPAs are in place; API calls do not include persistent identifiers beyond session context; data processing agreements reviewed annually |

### 5.3 AI Governance Considerations

- Inovy monitors the EU AI Act for applicability as the regulation comes into force.
- AI model versions are pinned in configuration to prevent unexpected behavioral changes from model updates.
- Human review processes exist for high-stakes AI outputs (e.g., PII redaction decisions in sensitive meeting contexts).
- AI-generated content is clearly marked in the product UI as AI-generated.

---

## 6. Document Control

This document is reviewed annually by the ISM and updated whenever significant changes occur to Inovy's organizational structure, technology stack, regulatory environment, or strategic direction. Changes are managed per ISMS-07 (Document Control Procedure).

**Next review:** 2027-03-13
