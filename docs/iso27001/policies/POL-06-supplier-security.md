# Supplier Security Policy

| Field              | Value                                  |
| ------------------ | -------------------------------------- |
| Document ID        | POL-06                                 |
| Version            | 1.0                                    |
| Classification     | Internal                               |
| Owner              | Information Security Manager           |
| Approved by        | CEO/CTO                                |
| Effective date     | 2026-03-13                             |
| Review date        | 2027-03-13                             |
| ISO 27001 Controls | A.5.19, A.5.20, A.5.21, A.5.22, A.5.23 |

---

## 1. Purpose

This policy defines how Inovy B.V. manages information security risks arising from its relationships with suppliers, vendors, and third-party service providers. As an AI-powered SaaS platform, Inovy relies on a range of cloud services, AI APIs, and infrastructure providers that have access to or process customer data. This policy ensures that supplier relationships are governed with appropriate security controls commensurate with the sensitivity of the data and services involved.

## 2. Scope

This policy applies to:

- All third-party suppliers, vendors, and cloud service providers used by Inovy
- All Inovy employees involved in procuring, managing, or reviewing supplier relationships
- All services that process, store, or transmit Inovy data classified as Internal, Confidential, or Restricted
- All contracts, sub-processors, and supply chain components

## 3. Reference Documents

- POL-03 Asset Management Policy (supplier assets in the asset register)
- POL-04 Information Classification and Handling Policy
- POL-07 Incident Response Plan (supplier-caused incidents)
- GDPR Article 28 (processor requirements)
- AVG (Dutch implementation of GDPR)

---

## 4. Supplier Risk Classification

Suppliers are classified by the risk they represent to Inovy based on data access, criticality of service, and security posture:

| Risk level | Criteria                                                                                                     | Review cadence                          |
| ---------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------- |
| Low        | No direct access to customer personal data; service interruption has minimal business impact                 | Annual                                  |
| Medium     | Access to metadata or internal data; service interruption causes operational disruption                      | Annual, with ad-hoc review on incidents |
| High       | Direct access to customer personal data (recordings, transcripts, PII); or critical to platform availability | Bi-annual                               |

---

## 5. Supplier Register (A.5.19)

The following table is Inovy's current supplier register. The Information Security Manager is responsible for maintaining this register. Suppliers are reviewed on the cadence indicated by their risk level.

| Supplier         | Service                                                           | Data shared                                                        | DPA in place                        | ISO 27001 / SOC 2 certified | Last reviewed | Risk level |
| ---------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------- | --------------------------- | ------------- | ---------- |
| Microsoft Azure  | Container Apps, Blob Storage (recordings), infrastructure hosting | Customer recordings, application data, logs                        | Yes (Microsoft Online Services DPA) | ISO 27001, SOC 2 Type II    | 2026-03-13    | Low        |
| Neon             | Serverless PostgreSQL (primary database)                          | All customer data, PII, transcripts                                | Yes                                 | SOC 2 Type II               | 2026-03-13    | Medium     |
| OpenAI           | GPT-4o API for meeting summaries and analysis                     | Meeting transcripts, user queries                                  | Yes                                 | SOC 2 Type II               | 2026-03-13    | High       |
| Deepgram         | Speech-to-text transcription                                      | Customer meeting audio recordings                                  | Yes                                 | SOC 2 Type II               | 2026-03-13    | High       |
| Anthropic        | Claude API for AI features                                        | Meeting transcripts, user queries                                  | Yes                                 | In progress (SOC 2)         | 2026-03-13    | High       |
| Qdrant           | Vector database for semantic search                               | Embedding vectors derived from transcripts                         | Yes                                 | SOC 2 Type II               | 2026-03-13    | Medium     |
| Stripe           | Payment processing                                                | Billing information (name, email, payment method metadata; no PAN) | Yes (Stripe DPA)                    | PCI DSS Level 1, ISO 27001  | 2026-03-13    | Low        |
| Resend           | Transactional email delivery                                      | Email addresses, email content                                     | Yes                                 | SOC 2 Type II               | 2026-03-13    | Low        |
| Recall.ai        | Bot API for joining meetings and capturing recordings             | Meeting audio/video, participant data                              | Yes                                 | In progress                 | 2026-03-13    | High       |
| Google Workspace | Email, calendar, document storage                                 | Employee personal data, internal communications                    | Yes (Google Workspace DPA)          | ISO 27001, SOC 2 Type II    | 2026-03-13    | Medium     |
| Upstash          | Managed Redis for caching                                         | Session data, rate-limit counters, temporary tokens                | Yes                                 | SOC 2 Type II               | 2026-03-13    | Low        |
| GitHub           | Source code hosting, CI/CD (GitHub Actions)                       | Source code, deployment secrets                                    | Yes (GitHub DPA)                    | ISO 27001, SOC 2 Type II    | 2026-03-13    | Medium     |

---

## 6. Supplier Security Requirements (A.5.19)

Before onboarding a new supplier that will have access to Inovy data classified as Internal, Confidential, or Restricted, the following requirements must be assessed:

### 6.1 Minimum Security Requirements for All Suppliers

- Documented information security policy
- Access controls limiting data to authorised personnel
- Encryption of data in transit (TLS 1.2+) and at rest (AES-128 minimum)
- Incident reporting obligations: Supplier must notify Inovy within 72 hours of discovering a security incident that may affect Inovy data
- Right to audit or review security posture on reasonable notice

### 6.2 Additional Requirements for Confidential/Restricted Data Processors

Suppliers that process customer personal data (Confidential or Restricted classification) must additionally:

- Sign a Data Processing Agreement (DPA) compliant with GDPR Article 28
- Demonstrate an independent security certification (ISO 27001, SOC 2 Type II, or equivalent) or provide evidence of equivalent controls
- Maintain sub-processor lists and notify Inovy of changes
- Agree to data residency requirements (EU where required)
- Not use Inovy customer data for their own model training or product improvement without explicit consent from Inovy and the data subjects
- Delete or return all Inovy data upon contract termination within a defined timeframe (maximum 90 days)

### 6.3 AI Processor Requirements

For OpenAI, Deepgram, Anthropic, and similar AI API providers:

- **No training data opt-in:** Inovy configures all AI service accounts to opt out of data being used for model training
- **Data minimisation:** Only the minimum necessary data (e.g., transcripts already generated, not raw audio) is sent to text-based AI APIs
- **EU transfer mechanism:** All data transferred to USA-based AI providers is covered by Standard Contractual Clauses (SCCs) or an equivalent GDPR transfer mechanism

---

## 7. Supplier Agreements (A.5.20)

All supplier agreements involving Inovy data must include:

- Description of the services provided and the data processed
- Security obligations (minimum controls, encryption requirements, access restrictions)
- Incident notification obligations (72-hour notification to Inovy)
- Audit rights (right to audit or receive third-party audit reports)
- Sub-processor controls (prior notification or approval required for sub-processors)
- Data return/deletion obligations upon contract termination
- Liability and indemnification clauses for data breaches caused by the supplier
- Governing law (Dutch law / EU law where applicable)
- GDPR DPA terms (for personal data processors)

The Engineering Lead and Information Security Manager are jointly responsible for reviewing supplier agreements before signature. Legal review is required for contracts involving Restricted data.

---

## 8. Supply Chain Security (A.5.21)

### 8.1 Software Dependencies

Inovy's application depends on a significant number of open-source packages managed through the pnpm monorepo. Supply chain security controls include:

- **Dependabot:** GitHub Dependabot is enabled for automated dependency vulnerability scanning and pull request generation for security updates. Security updates are prioritised and applied within 14 days of a Dependabot alert
- **SBOM (Software Bill of Materials):** A CycloneDX-format SBOM is generated as part of the CI/CD pipeline using the `@cyclonedx/bom` tooling. The SBOM is stored as a build artefact and reviewed quarterly
- **Licence compliance:** Dependency licences are reviewed as part of the quarterly SBOM review. Copyleft licences (GPL, AGPL) require approval from the Engineering Lead before adoption. The FOSSA or equivalent tool is used for licence scanning
- **Lock file integrity:** The `pnpm-lock.yaml` file is committed to the repository and must not be manually edited. CI pipelines verify lock file integrity. This ensures that the exact dependency versions used in development are deployed to production
- **Package signing:** Where package registries support it (npm provenance), signed packages are preferred

### 8.2 Container Image Supply Chain

Inovy's application is deployed as a container on Azure Container Apps:

- Base images are pinned to specific digest hashes, not floating tags
- Base images are scanned for vulnerabilities using Microsoft Defender for Containers or equivalent
- Images are rebuilt on a weekly schedule regardless of code changes, to incorporate OS-level security patches
- The CI/CD pipeline (GitHub Actions) builds images in an isolated environment; no external build services have access to Inovy secrets during the build process

---

## 9. Cloud Services Security (A.5.23)

### 9.1 Shared Responsibility Model

Inovy uses a cloud-hosted infrastructure model. The shared responsibility model applies:

| Layer                                   | Inovy responsibility                | Azure / supplier responsibility |
| --------------------------------------- | ----------------------------------- | ------------------------------- |
| Data classification and encryption keys | Inovy                               | —                               |
| Application code security               | Inovy                               | —                               |
| Identity and access management          | Inovy (RBAC within the application) | Azure (IAM for infrastructure)  |
| Network security groups, firewall rules | Inovy configures; Azure enforces    | Azure enforces                  |
| Physical security of data centres       | —                                   | Azure (ISO 27001 certified)     |
| Hypervisor and host OS                  | —                                   | Azure                           |
| TLS termination                         | Inovy configures                    | Azure provides managed service  |

### 9.2 Data Residency

Customer data must remain within the European Union. Inovy's data residency commitments:

- **Neon PostgreSQL:** EU-Central-1 (Frankfurt) region
- **Azure Blob Storage (recordings):** West Europe (Amsterdam) region
- **Azure Container Apps:** West Europe region
- **Qdrant:** EU-hosted region (configured at account level)

Transfers of customer data outside the EU (to OpenAI, Anthropic, Deepgram which are USA-based) are made under Standard Contractual Clauses (SCCs) incorporated into the respective DPAs.

### 9.3 Azure Security Configuration

The following Azure security controls are implemented:

- Azure Active Directory (Entra ID) is used for all Azure resource access; no shared credentials
- Multi-factor authentication is enforced for all Azure AD accounts
- Resource locks are applied to production resources to prevent accidental deletion
- Azure Defender for Containers is enabled for container image scanning
- Azure Monitor and Application Insights are configured for security event logging
- Network Security Groups restrict traffic between Azure services to only necessary ports and protocols

---

## 10. Monitoring of Supplier Security (A.5.22)

### 10.1 Review Cadence

- **Low risk suppliers:** Annual review. Confirm DPA is current, service is still in use, no significant security incidents reported.
- **Medium risk suppliers:** Annual review with ad-hoc review within 30 days of any reported security incident involving Inovy data.
- **High risk suppliers:** Bi-annual review (every 6 months). Review includes: security certification status, incident history, sub-processor changes, and DPA compliance.

### 10.2 Review Process

Each supplier review includes:

1. Confirming the DPA is still valid and covers current data processing activities
2. Checking for new security certifications or certification lapses
3. Reviewing any security incidents reported by the supplier since the last review
4. Reviewing any sub-processor changes and assessing their security posture
5. Confirming data residency commitments are still met
6. Updating the supplier register with the review date and any findings
7. Escalating material concerns to the CTO for contract renegotiation or supplier change

### 10.3 Supplier Incident Notification

Suppliers that discover a security incident affecting Inovy data must notify Inovy's Information Security Manager within 72 hours. The notification must include:

- Nature of the incident
- Data affected (categories, approximate volume)
- Current status of containment
- Steps being taken to investigate and remediate

Receipt of a supplier incident notification triggers Inovy's own incident response process (POL-07) and, where personal data is affected, the GDPR breach notification assessment.

---

## 11. Supplier Termination

When a supplier relationship is terminated:

1. All Inovy data held by the supplier is requested for deletion within 30 days
2. Written confirmation of deletion is obtained from the supplier and retained for 3 years
3. Access credentials issued to the supplier are revoked
4. The supplier is removed from the supplier register (marked as terminated with the termination date)
5. Any sub-processors engaged by the supplier are also assessed for residual data holdings

---

## 12. Roles and Responsibilities

| Role                         | Responsibility                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------- |
| Information Security Manager | Supplier register maintenance, DPA compliance, supplier review oversight         |
| Engineering Lead             | Technical due diligence, dependency management, container supply chain           |
| CEO/CTO                      | Contract approval for High risk suppliers, budget for supplier security controls |
| Legal (external)             | Reviewing DPAs and supplier agreements for High risk suppliers                   |

---

## 13. Policy Review

This policy is reviewed annually or when a new high-risk supplier is onboarded, a supplier security incident occurs, or a significant change in data processing activities takes place.

| Revision | Date       | Author                       | Summary of Changes |
| -------- | ---------- | ---------------------------- | ------------------ |
| 1.0      | 2026-03-13 | Information Security Manager | Initial release    |
