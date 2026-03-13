# ISMS Scope

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Document ID         | ISMS-03                      |
| Version             | 1.0                          |
| Classification      | Internal                     |
| Owner               | Information Security Manager |
| Approved by         | CEO/CTO                      |
| Effective date      | 2026-03-13                   |
| Review date         | 2027-03-13                   |
| ISO 27001 Reference | Clause 4.3                   |

---

## 1. Purpose

This document formally defines the boundaries and applicability of Inovy's Information Security Management System (ISMS). The scope statement is a required output of ISO 27001:2022 Clause 4.3 and forms the basis for the Statement of Applicability (ISMS-10) and all subsequent risk assessment and control implementation activities.

---

## 2. Scope Statement

**The Inovy ISMS covers the design, development, operation, and support of the Inovy AI-powered meeting recording and management SaaS platform, including all cloud infrastructure, engineering processes, and third-party integrations involved in the processing of customer meeting data.**

This scope encompasses the application, its underlying infrastructure, the engineering and operations team, and the external services through which customer data flows.

---

## 3. In-Scope Systems and Assets

### 3.1 Application Systems

| System                               | Description                                                                                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inovy Web Application (apps/web)** | Next.js 16 App Router application providing all user-facing functionality including meeting management, AI features, user administration, and API endpoints |
| **Server Actions and API layer**     | All next-safe-action server actions handling business logic mutations; REST-style API routes for integrations                                               |
| **Authentication system**            | Better Auth implementation including session management, OAuth federation (Google Workspace, Microsoft), and RBAC enforcement                               |
| **AI processing pipelines**          | Workflows orchestrating audio → transcription → summarization → task extraction → RAG indexing                                                              |
| **Background job processing**        | Async processing pipelines for meeting ingestion, AI inference, and notification dispatch                                                                   |

### 3.2 Infrastructure

| Component                   | Platform                     | Region            |
| --------------------------- | ---------------------------- | ----------------- |
| **Container hosting**       | Azure Container Apps         | West Europe       |
| **Primary database**        | Neon PostgreSQL (serverless) | EU-Central-1      |
| **Object storage**          | Azure Blob Storage           | West Europe       |
| **Vector database**         | Qdrant Cloud                 | EU                |
| **Cache and rate limiting** | Upstash Redis / Azure Redis  | EU                |
| **CDN and edge**            | Azure / Vercel Edge Network  | Global (EU-first) |

### 3.3 CI/CD and Development Pipeline

| Component             | Description                                               |
| --------------------- | --------------------------------------------------------- |
| **GitHub repository** | Source code, IaC definitions, ISMS documentation          |
| **GitHub Actions**    | Automated build, test, and deployment pipelines           |
| **Terraform**         | Infrastructure-as-Code for Azure resources                |
| **Dependabot**        | Automated dependency vulnerability monitoring             |
| **OIDC federation**   | Keyless Azure authentication in CI/CD (no static secrets) |

### 3.4 Third-Party Integrations (In Scope as Sub-processors)

| Integration                | Purpose                            | Data Processed                     |
| -------------------------- | ---------------------------------- | ---------------------------------- |
| **OpenAI**                 | LLM summarization, task extraction | Meeting transcript content         |
| **Anthropic**              | LLM AI features                    | Meeting transcript content         |
| **Deepgram**               | Speech-to-text transcription       | Raw meeting audio                  |
| **Recall.ai**              | Meeting recording bot              | Live audio/video capture           |
| **Google Workspace OAuth** | Identity federation                | User identity attributes           |
| **Microsoft OAuth**        | Identity federation                | User identity attributes           |
| **Stripe**                 | Payment processing                 | Billing data (not meeting content) |
| **Resend**                 | Transactional email                | User email addresses               |

### 3.5 Engineering Personnel

All members of the Inovy engineering and operations team are within scope of the ISMS, including their:

- Endpoint devices used for development and access to production systems
- Access credentials and authentication factors (MFA)
- Activities related to code development, infrastructure management, and system operations

---

## 4. Out-of-Scope Items

### 4.1 Customer-Side Infrastructure

Customer organizations' own IT systems, networks, and devices used to access the Inovy platform are not within the scope of this ISMS. Inovy's interface with customers is the HTTPS API and web application boundary. Customers are responsible for their own access control, endpoint security, and compliance obligations on their side.

### 4.2 Physical Office and Facilities

Inovy operates as a fully remote-first organization with no permanent physical office. ISO 27001 Annex A physical security controls (A.7.x) are applied in a reduced form appropriate to the remote-first model:

- **Excluded:** A.7.12 (Cabling security) — fully excluded; Inovy owns no network cabling infrastructure.
- **Reduced applicability:** A.7.1–A.7.4 (Physical security perimeters, entry controls, office securing, physical threat monitoring) — addressed through cloud provider physical security (Azure, Neon, Qdrant) and endpoint security for remote employees rather than through Inovy-owned facilities.
- **Reduced applicability:** A.7.6 (Working in secure areas) — addressed through secure remote working policy rather than defined secure zones.

The physical security of cloud data centers (Azure West Europe, Neon EU-Central-1) is the responsibility of the respective cloud providers, whose ISO 27001, SOC 2 Type II, and physical security controls are verified through supplier assessments.

### 4.3 Non-Engineering Business Functions

The following business functions are outside the ISMS scope in version 1.0:

- Sales and marketing operations (CRM, marketing tools)
- Finance and accounting systems
- External communications (social media, PR)
- Recruiting and HR systems

These functions do not process meeting data or platform-sensitive information and do not have access to production systems. They will be considered for scope expansion in future ISMS iterations.

---

## 5. Scope Boundaries and Interfaces

### 5.1 Logical Boundaries

| Boundary                              | Description                                                                                                                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **HTTPS edge**                        | All inbound traffic enters through HTTPS. TLS 1.2+ is enforced at the Azure Container Apps ingress layer. This is the primary external boundary.                                                                                    |
| **Authentication boundary**           | Better Auth session validation is enforced on all server actions and API routes. Unauthenticated requests are rejected before reaching application logic.                                                                           |
| **Organizational isolation boundary** | RBAC org isolation enforced at the application layer prevents cross-tenant data access. All database queries include organization context filters.                                                                                  |
| **Data persistence boundary**         | Data at rest is stored within Neon PostgreSQL (EU-Central-1), Azure Blob Storage (West Europe), Qdrant, and Redis. All sensitive fields use AES-256-GCM encryption.                                                                 |
| **Outbound API boundary**             | Calls to external AI services (OpenAI, Anthropic, Deepgram) are made from the application backend. No customer credentials or raw recordings are passed to third parties beyond what is required for the stated processing purpose. |

### 5.2 Interfaces with External Systems

| Interface                | Direction                   | Protocol          | Security Control                                   |
| ------------------------ | --------------------------- | ----------------- | -------------------------------------------------- |
| Customer browsers        | Inbound                     | HTTPS / WebSocket | TLS 1.2+, CSP headers, CSRF protection             |
| Google / Microsoft OAuth | Outbound                    | HTTPS / OAuth 2.0 | PKCE, state parameter, token validation            |
| OpenAI / Anthropic APIs  | Outbound                    | HTTPS / REST      | API key rotation, prompt injection guards          |
| Deepgram ASR             | Outbound                    | HTTPS / WebSocket | API key management, data in transit encryption     |
| Recall.ai                | Outbound                    | HTTPS             | HMAC-SHA256 webhook verification                   |
| Stripe                   | Outbound + Inbound webhooks | HTTPS             | HMAC-SHA256 webhook verification                   |
| Resend                   | Outbound                    | HTTPS             | API key management                                 |
| GitHub Actions → Azure   | CI/CD                       | OIDC              | Keyless OIDC authentication, no static credentials |

---

## 6. Justification for Exclusions

The following ISO 27001:2022 Annex A control areas have reduced applicability or are excluded, with justifications documented in the Statement of Applicability (ISMS-10):

| Control                                           | Status   | Justification                                                                                                                                                                         |
| ------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A.7.12 (Cabling security)                         | Excluded | Inovy owns no physical cabling infrastructure. All infrastructure is cloud-hosted. Physical network security is entirely the responsibility of cloud providers.                       |
| A.7.1–A.7.4 (Physical perimeters, entry, offices) | Reduced  | No Inovy-owned facilities. Cloud data center physical security is handled by Azure (ISO 27001 certified) and Neon. Employee endpoints are addressed through endpoint security policy. |
| A.7.6 (Working in secure areas)                   | Reduced  | Remote-first model. Addressed through secure remote working policy and endpoint controls rather than defined physical secure areas.                                                   |

All exclusions are formally documented in ISMS-10 (Statement of Applicability) with justification, residual risk assessment, and compensating controls where applicable.

---

## 7. Scope Maintenance

The ISMS scope is reviewed:

- **Annually** as part of the management review process (ISMS-13)
- **On significant organizational change** (new product lines, new markets, significant new suppliers, change in team structure)
- **Following security incidents** that reveal gaps or inadequacies in the current scope definition
- **Following changes to the regulatory environment** that affect in-scope processing activities

Scope changes require approval from the CEO/CTO and are managed per ISMS-07 (Document Control Procedure).

**Next review:** 2027-03-13
