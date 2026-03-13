# ISO 27001:2022 Certification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Achieve ISO 27001:2022 certification for Inovy (SaaS product + engineering team scope) by implementing all 93 Annex A controls through code hardening and documentation.

**Architecture:** 5 workstreams — ISMS foundation docs first (others depend on it), then policies + code hardening in parallel, then templates + guides. Documentation lives in `docs/iso27001/`. Code changes touch auth, middleware, CI/CD, and schema files.

**Tech Stack:** Next.js 16, Better Auth, Drizzle ORM, Pino logging, Azure Container Apps, GitHub Actions, Terraform

**Spec:** `docs/superpowers/specs/2026-03-13-iso27001-certification-design.md`

---

## Chunk 1: ISMS Foundation Documents

These 14 documents form the management system backbone. The Stage 1 auditor reads these first. They must be completed before policies (Chunk 2) can reference them.

All files are created in `docs/iso27001/isms/`.

### Task 1: Context of the Organization (Clause 4.1)

**Files:**
- Create: `docs/iso27001/isms/01-context-of-organization.md`

- [ ] **Step 1: Create the document**

Write the context document covering:
- Internal context: Inovy is an AI-powered meeting recording SaaS. Remote-first engineering team. Cloud-native on Azure. Dutch company.
- External context: GDPR regulatory environment, Dutch DPA (Autoriteit Persoonsgegevens), competitive SaaS landscape, customer data sensitivity (meeting recordings, transcripts, PII including BSN).
- Technology context: Next.js 16 monorepo, Azure Container Apps, Neon PostgreSQL (EU-Central-1), Qdrant vector DB, third-party AI services (OpenAI, Deepgram, Anthropic).
- AI-specific context: Application uses LLMs for summarization, task extraction, and RAG chat. AI middleware for prompt injection detection, PII output guarding, input moderation.

Use this document header format for all ISMS docs:
```markdown
# [Title]

| Field | Value |
| ----- | ----- |
| Document ID | ISMS-01 |
| Version | 1.0 |
| Classification | Internal |
| Owner | [Information Security Manager] |
| Approved by | [CEO/CTO] |
| Effective date | YYYY-MM-DD |
| Review date | YYYY-MM-DD (annual) |
| ISO 27001 Reference | Clause X.X |
```

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/01-context-of-organization.md
git commit -m "docs(iso27001): add context of the organization (Clause 4.1)"
```

### Task 2: Interested Parties Register (Clause 4.2)

**Files:**
- Create: `docs/iso27001/isms/02-interested-parties.md`

- [ ] **Step 1: Create the document**

Include a table of stakeholders with columns: Party | Type (Internal/External) | Expectations | Relevant Requirements

Key parties:
- **Customers** (External): Data protection, service availability, GDPR compliance, confidentiality of recordings
- **Employees/Engineers** (Internal): Clear security policies, training, secure tools
- **Autoriteit Persoonsgegevens (Dutch DPA)** (External): GDPR compliance, breach notification within 72hrs
- **Cloud providers (Azure, Neon, OpenAI, Deepgram)** (External): Contractual security obligations, DPA compliance
- **Certification body** (External): ISO 27001 conformity evidence
- **Investors/shareholders** (Internal): Risk management, business continuity
- **End users (meeting participants)** (External): Consent management, data access rights, PII protection

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/02-interested-parties.md
git commit -m "docs(iso27001): add interested parties register (Clause 4.2)"
```

### Task 3: ISMS Scope Statement (Clause 4.3)

**Files:**
- Create: `docs/iso27001/isms/03-isms-scope.md`

- [ ] **Step 1: Create the document**

Define:
- **In scope:** The Inovy web application (apps/web), its supporting infrastructure (Azure Container Apps, Neon PostgreSQL, Azure Blob Storage, Qdrant, Redis), CI/CD pipelines (GitHub Actions), third-party integrations (OpenAI, Deepgram, Anthropic, Google Workspace, Microsoft, Recall.ai, Stripe, Resend), and the engineering team's development and operational processes.
- **Out of scope:** Customer-side infrastructure, physical office facilities (remote-first — no office), non-engineering business processes (sales, marketing, finance).
- **Boundaries:** Application boundary at the HTTPS edge (Vercel/Azure load balancer). Data boundary includes all data stored in Neon PostgreSQL, Azure Blob Storage, Qdrant, and Redis. Personnel boundary includes the engineering team.
- **Exclusions:** A.7.12 (Cabling security) excluded — fully cloud-hosted. A.7.1-A.7.4, A.7.6 reduced scope — no physical office, addressed via remote working controls.
- **Interfaces:** Customer browsers, third-party API endpoints, OAuth providers.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/03-isms-scope.md
git commit -m "docs(iso27001): add ISMS scope statement (Clause 4.3)"
```

### Task 4: Information Security Policy (Clause 5.1, 5.2)

**Files:**
- Create: `docs/iso27001/isms/04-information-security-policy.md`

- [ ] **Step 1: Create the document**

This is the top-level policy. Include sections:

1. **Leadership & Commitment (Clause 5.1):** Management commitment statement. Top management ensures IS policy aligns with strategic direction, provides adequate resources, and promotes continual improvement.
2. **Purpose and scope:** Applies to all information assets within the ISMS scope.
3. **Principles:** Confidentiality, integrity, availability. Defense in depth. Least privilege. Data minimization.
4. **Roles and responsibilities:** Reference ISMS-05 (RACI matrix).
5. **Policy framework:** This policy is supported by 20 detailed policies (POL-01 through POL-20).
6. **Compliance:** Non-compliance may result in disciplinary action per POL-09.
7. **Review:** Annual review by Information Security Manager, approved by CEO/CTO.
8. **Appendix A — Contact with Authorities (A.5.5):**
   - Autoriteit Persoonsgegevens (Dutch DPA): https://autoriteitpersoonsgegevens.nl, breach notification within 72 hours
   - NCSC-NL (National Cyber Security Centre): https://ncsc.nl, for critical vulnerability coordination
   - Dutch Police Cybercrime Team: For criminal cyber incidents
9. **Appendix B — Contact with Special Interest Groups (A.5.6):**
   - OWASP Netherlands Chapter
   - NCSC-NL mailing lists
   - Better Auth community (security advisories)
   - Dutch Cloud Community

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/04-information-security-policy.md
git commit -m "docs(iso27001): add information security policy (Clause 5.1, 5.2)"
```

### Task 5: Roles & Responsibilities RACI Matrix (Clause 5.2, A.5.2, A.5.3)

**Files:**
- Create: `docs/iso27001/isms/05-roles-and-responsibilities.md`

- [ ] **Step 1: Create the document**

Define roles: CEO/CTO, Information Security Manager (ISM), Engineering Lead, Developer, All Staff.

RACI matrix for key activities: Risk assessment, Policy approval, Incident response, Access reviews, Audit coordination, Vulnerability management, Change management, Training delivery, Supplier assessments.

Include a **Segregation of Duties (A.5.3)** section documenting:
- Code deployers cannot approve their own PRs
- Database admin access requires separate justification from app admin
- Audit log access is read-only for non-ISM roles (enforced by RBAC: only admin+ can read audit logs)
- The person performing internal audits must not audit their own work

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/05-roles-and-responsibilities.md
git commit -m "docs(iso27001): add roles and responsibilities RACI (Clause 5.2, A.5.2-A.5.3)"
```

### Task 6: Information Security Objectives (Clause 6.2)

**Files:**
- Create: `docs/iso27001/isms/06-security-objectives.md`

- [ ] **Step 1: Create the document**

Define SMART objectives:
1. **Achieve zero critical vulnerabilities** in production within 72 hours of detection (measured via dependency scanning + SAST)
2. **100% MFA enrollment** for all team members within 30 days of ISMS launch
3. **<4 hour mean time to detect** security incidents (measured via monitoring + alerting)
4. **100% completion** of annual security awareness training
5. **Quarterly access reviews** completed on schedule
6. **Zero data breaches** involving customer PII per year
7. **Pass ISO 27001 Stage 2 audit** with zero major nonconformities

Each objective includes: What, Who is responsible, Resources needed, Deadline, How measured, How evaluated.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/06-security-objectives.md
git commit -m "docs(iso27001): add security objectives (Clause 6.2)"
```

### Task 7: Document Control Procedure (Clause 7.5)

**Files:**
- Create: `docs/iso27001/isms/07-document-control-procedure.md`

- [ ] **Step 1: Create the document**

Define:
- Document ID scheme: ISMS-XX for core docs, POL-XX for policies, TPL-XX for templates
- Version control: All documents stored in Git (docs/iso27001/). Git history provides version tracking. Semantic versioning (1.0, 1.1, 2.0).
- Approval workflow: Draft → Review (ISM) → Approve (CEO/CTO) → Published. Changes tracked via Git PRs.
- Classification levels: Public, Internal, Confidential, Restricted
- Retention: All ISMS documents retained for minimum 3 years (one certification cycle). Git history provides immutable record.
- Access control: Documents in private Git repository. Access follows existing GitHub RBAC.
- Review cycle: Annual review of all documents. Review date tracked in document header.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/07-document-control-procedure.md
git commit -m "docs(iso27001): add document control procedure (Clause 7.5)"
```

### Task 8: Risk Assessment Methodology (Clause 6.1.2)

**Files:**
- Create: `docs/iso27001/isms/08-risk-assessment-methodology.md`

- [ ] **Step 1: Create the document**

Define:
- **Risk identification:** Asset-based approach. For each information asset, identify threats (what could go wrong) and vulnerabilities (why it could happen).
- **Likelihood scale:** 1 (Rare) to 5 (Almost certain), with criteria for each level
- **Impact scale:** 1 (Negligible) to 5 (Critical), with criteria including financial, reputational, legal/regulatory, operational
- **Risk level:** Likelihood x Impact = Risk score. Matrix: 1-4 Low (accept), 5-9 Medium (monitor), 10-15 High (treat), 16-25 Critical (immediate action)
- **Risk treatment options:** Avoid, Mitigate, Transfer, Accept. Residual risk must be below organizational risk appetite.
- **Risk appetite statement:** Inovy accepts Low risks. Medium risks require documented monitoring. High and Critical risks must be treated.
- **Threat intelligence sources (A.5.7):** NCSC-NL advisories, GitHub Security Advisories, OWASP Top 10, Better Auth security releases, CVE databases, Deepgram/OpenAI security bulletins. Reviewed monthly by ISM.
- **Review frequency:** Full risk assessment annually. Triggered reassessment on: major system changes, security incidents, new threats, organizational changes.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/08-risk-assessment-methodology.md
git commit -m "docs(iso27001): add risk assessment methodology (Clause 6.1.2)"
```

### Task 9: Risk Register & Treatment Plan (Clause 6.1.3, 8.1, 8.2, 8.3)

**Files:**
- Create: `docs/iso27001/isms/09-risk-register.md`

- [ ] **Step 1: Create the document**

Include a **completed risk assessment** (not just a blank template) with at minimum these risks:

| Risk ID | Asset | Threat | Vulnerability | L | I | Score | Treatment | Control Ref | Residual |
| ------- | ----- | ------ | ------------- | - | - | ----- | --------- | ----------- | -------- |

Populate with real risks from the gap analysis:
1. **R-001:** Unauthorized account access — No MFA → L:4, I:5 = 20 (Critical) → Mitigate: Implement TOTP MFA (A.8.5)
2. **R-002:** Brute force password attack — No lockout → L:4, I:4 = 16 (Critical) → Mitigate: Account lockout (A.8.5)
3. **R-003:** Vulnerable dependencies exploited — No automated scanning → L:3, I:4 = 12 (High) → Mitigate: Dependabot + pnpm audit (A.8.8)
4. **R-004:** Clickjacking/XSS attacks — Missing security headers → L:3, I:4 = 12 (High) → Mitigate: CSP + headers (A.8.26)
5. **R-005:** Encryption key compromise — Key in .env file → L:2, I:5 = 10 (High) → Mitigate: Key management procedure + vault migration (A.8.24)
6. **R-006:** Unencrypted sensitive data at rest — Transcripts/chat unencrypted → L:3, I:4 = 12 (High) → Mitigate: Extend encryption (A.8.24)
7. **R-007:** Session hijacking via idle session — No inactivity timeout → L:3, I:4 = 12 (High) → Mitigate: 30min idle timeout (A.8.5)
8. **R-008:** Supply chain attack — No SBOM → L:2, I:4 = 8 (Medium) → Mitigate: CycloneDX SBOM (A.5.21)
9. **R-009:** AI prompt injection — Malicious input to LLM → L:3, I:3 = 9 (Medium) → Existing control: injection guard middleware (A.8.7, A.8.28)
10. **R-010:** AI output leaks PII — LLM generates PII in responses → L:3, I:4 = 12 (High) → Existing control: PII output guard middleware (A.8.11)
11. **R-011:** Cross-organization data leakage — Application logic bypass → L:2, I:5 = 10 (High) → Existing control: Organization isolation at data access layer (A.8.3)
12. **R-012:** Data retained beyond necessity — No automated cleanup → L:3, I:3 = 9 (Medium) → Mitigate: Data retention auto-cleanup (A.8.10)
13. **R-013:** Third-party service breach (OpenAI, Deepgram) — Data shared externally → L:2, I:4 = 8 (Medium) → Mitigate: Supplier security assessments (A.5.19-A.5.22)
14. **R-014:** Insider threat — Over-privileged access → L:2, I:4 = 8 (Medium) → Existing control: RBAC + audit logging (A.5.15, A.8.15)
15. **R-015:** Business continuity — Service outage → L:2, I:4 = 8 (Medium) → Existing control: Multi-replica + managed DB (A.5.30)

Include a **Treatment Plan** table mapping each risk treatment to: responsible person, deadline, status (open/in progress/completed).

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/09-risk-register.md
git commit -m "docs(iso27001): add risk register with completed assessment (Clause 6.1.3, 8.1-8.3)"
```

### Task 10: Statement of Applicability (Clause 6.1.3d)

**Files:**
- Create: `docs/iso27001/isms/10-statement-of-applicability.md`

- [ ] **Step 1: Create the document**

This is the master artifact. Copy the full control map from the design spec (Section 4) and format as the official SoA with columns:

| Control | Name | Applicable | Justification for inclusion/exclusion | Implementation status | Implementation reference | Policy reference |

For each of the 93 controls, fill in all columns. Reference the exact policy (POL-XX) or ISMS document (ISMS-XX) that addresses each control. For code-implemented controls, reference the relevant source file paths.

Only A.7.12 is excluded (N/A). A.7.1-A.7.4, A.7.6 are marked "Reduced" with justification (remote-first, no physical office).

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/10-statement-of-applicability.md
git commit -m "docs(iso27001): add statement of applicability (Clause 6.1.3d)"
```

### Task 11: Monitoring & Measurement Program (Clause 9.1)

**Files:**
- Create: `docs/iso27001/isms/11-monitoring-and-measurement.md`

- [ ] **Step 1: Create the document**

Define KPIs with measurement details:

| KPI | Target | Measurement method | Frequency | Responsible |
| --- | ------ | ------------------ | --------- | ----------- |
| Critical vulnerability remediation time | <72 hours | Dependabot alerts + pnpm audit | Continuous | Engineering Lead |
| MFA enrollment rate | 100% | Better Auth admin dashboard | Monthly | ISM |
| Security training completion | 100% | Training record log (TPL-08) | Annually | ISM |
| Failed login attempts | <50/day per account | Audit log query | Daily (automated) | ISM |
| Access review completion | 100% quarterly | Access review records | Quarterly | ISM |
| Incident response time (detect) | <4 hours | Incident reports (TPL-05) | Per incident | ISM |
| Audit log integrity | 100% | Hash chain verification | Monthly | ISM |
| Backup verification | Pass | Backup verification script output | Monthly | Engineering Lead |
| Security header compliance | A+ rating | securityheaders.com scan | Monthly | Engineering Lead |
| Dependency freshness | <30 days behind latest | Dependabot PR age | Weekly | Engineering Lead |

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/11-monitoring-and-measurement.md
git commit -m "docs(iso27001): add monitoring and measurement program (Clause 9.1)"
```

### Task 12: Internal Audit Program (Clause 9.2)

**Files:**
- Create: `docs/iso27001/isms/12-internal-audit-program.md`

- [ ] **Step 1: Create the document**

Define:
- **Audit frequency:** Annual full ISMS audit. Additional audits triggered by major incidents or changes.
- **Audit scope:** All clauses (4-10) and all applicable Annex A controls.
- **Auditor independence:** Internal auditor must not audit their own work. For small team: rotate audit responsibilities or use external auditor.
- **Audit process:** Plan → Execute → Report → Follow-up on findings
- **Audit criteria:** ISO 27001:2022 requirements + internal policies
- **Audit reporting:** Findings categorized as Major NC / Minor NC / Observation / Opportunity for Improvement
- **Follow-up:** CARs (TPL-04) raised for all nonconformities. Tracked to closure.
- **Audit Safeguards (A.8.34):** During audit/pentest activities: notify all staff, restrict scope to agreed systems, audit data handled as Confidential, findings encrypted in transit, pentest results stored separately with restricted access, clean up test data after completion.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/12-internal-audit-program.md
git commit -m "docs(iso27001): add internal audit program (Clause 9.2)"
```

### Task 13: Management Review Template (Clause 9.3)

**Files:**
- Create: `docs/iso27001/isms/13-management-review-template.md`

- [ ] **Step 1: Create the document**

Template with mandatory inputs (Clause 9.3):
1. Status of actions from previous reviews
2. Changes in external/internal issues relevant to ISMS
3. Feedback on IS performance: nonconformities/CARs, monitoring & measurement results (KPIs from ISMS-11), audit results, IS objectives achievement
4. Feedback from interested parties
5. Risk assessment changes
6. Opportunities for continual improvement

Outputs: Decisions on improvement opportunities, changes to ISMS, resource needs.

Review frequency: Minimum biannually. Recommended quarterly for first year.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/13-management-review-template.md
git commit -m "docs(iso27001): add management review template (Clause 9.3)"
```

### Task 14: Corrective Action Procedure (Clause 10.1)

**Files:**
- Create: `docs/iso27001/isms/14-corrective-action-procedure.md`

- [ ] **Step 1: Create the document**

Process:
1. **Identify nonconformity:** From audit findings, incident reports, management reviews, monitoring
2. **React:** Contain the immediate issue, mitigate consequences
3. **Root cause analysis:** 5-Whys or fishbone diagram. Document in CAR (TPL-04)
4. **Determine corrective action:** Address root cause, not just symptoms
5. **Implement:** Assign owner, set deadline, implement fix
6. **Review effectiveness:** Verify the fix worked after implementation period
7. **Update risk assessment:** If the NC reveals a new risk, update the risk register (ISMS-09)

Track all CARs in a corrective action log. Review open CARs in management reviews.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/isms/14-corrective-action-procedure.md
git commit -m "docs(iso27001): add corrective action procedure (Clause 10.1)"
```

---

## Chunk 2: Policies & Procedures (POL-01 through POL-10)

These policies flesh out the Annex A controls. Each references the ISMS foundation documents and the existing codebase implementation where applicable.

All files created in `docs/iso27001/policies/`. Use this header for all policies:

```markdown
# [Policy Title]

| Field | Value |
| ----- | ----- |
| Document ID | POL-XX |
| Version | 1.0 |
| Classification | Internal |
| Owner | [Information Security Manager] |
| Approved by | [CEO/CTO] |
| Effective date | YYYY-MM-DD |
| Review date | YYYY-MM-DD (annual) |
| ISO 27001 Controls | A.X.X, A.X.X |
```

### Task 15: POL-01 Access Control Policy

**Files:**
- Create: `docs/iso27001/policies/POL-01-access-control.md`

- [ ] **Step 1: Create the document**

Controls covered: A.5.15-A.5.18, A.8.2-A.8.5

Sections:
1. **Access control principles (A.5.15):** Least privilege, need-to-know, deny by default. Reference existing RBAC implementation: 6 roles (superadmin, owner, admin, manager, user, viewer) with ~50 permission definitions in `src/lib/auth/access-control.ts`.
2. **Identity management (A.5.16):** User lifecycle (creation via sign-up with email verification, modification, deactivation, deletion via GDPR service). Reference Better Auth user management.
3. **Authentication (A.5.17):** Password policy (min 12 chars, complexity, breached password check — per code hardening item 3.12). MFA required for all accounts (per item 3.1). scrypt hashing (N:16384, r:16, p:1). Magic link and passkey as alternatives.
4. **Access rights management (A.5.18):** Role assignment during invitation. Quarterly access reviews (who, what, when). Revocation on termination within 24 hours. Reference org isolation in `src/lib/rbac/organization-isolation.ts`.
5. **Privileged access (A.8.2):** superadmin and admin roles require justification. Privileged actions logged in audit trail. Admin endpoint at `/api/admin/agent/kill-switch` restricted to superadmin.
6. **Information access restriction (A.8.3):** Organization isolation enforced at data access layer. Returns 404 (not 403) to prevent information leakage. Reference `assertOrganizationAccess()`.
7. **Source code access (A.8.4):** GitHub private repository. Branch protection on main. PR reviews required. Reference GitHub team RBAC.
8. **Secure authentication (A.8.5):** TOTP MFA (Better Auth two-factor plugin). Account lockout after 5 failed attempts for 15 minutes. Session inactivity timeout of 30 minutes. Session expiry of 7 days.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-01-access-control.md
git commit -m "docs(iso27001): add access control policy (POL-01)"
```

### Task 16: POL-02 Acceptable Use Policy

**Files:**
- Create: `docs/iso27001/policies/POL-02-acceptable-use.md`

- [ ] **Step 1: Create the document**

Controls covered: A.5.10

Sections: Scope (all team members), acceptable use of company devices, email, SaaS tools, source code repositories, cloud services, AI tools. Prohibited activities. Personal use guidelines. Monitoring notice. Consequences of violation (reference POL-09 disciplinary process).

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-02-acceptable-use.md
git commit -m "docs(iso27001): add acceptable use policy (POL-02)"
```

### Task 17: POL-03 Asset Management Policy

**Files:**
- Create: `docs/iso27001/policies/POL-03-asset-management.md`

- [ ] **Step 1: Create the document**

Controls covered: A.5.9, A.5.11-A.5.13

Include an **asset register** table:

| Asset ID | Asset | Type | Owner | Classification | Location | Dependencies |
| -------- | ----- | ---- | ----- | -------------- | -------- | ------------ |

Populate with real assets:
- Neon PostgreSQL database (Confidential, EU-Central-1)
- Azure Blob Storage / recordings (Confidential, West Europe)
- Qdrant vector database (Internal, cloud-hosted)
- Redis cache (Internal, Upstash/Azure)
- GitHub repository (Confidential, cloud-hosted)
- Application secrets (.env, ENCRYPTION_MASTER_KEY, API keys) (Restricted)
- Source code (Confidential)
- Customer recordings and transcripts (Restricted)
- User PII (email, name) (Confidential)
- AI models/API access (OpenAI, Deepgram, Anthropic) (Internal)
- Team laptops/devices (Internal, off-premises)

**Return of assets (A.5.11):** On termination: revoke GitHub, cloud service access within 24hrs. Wipe company data from personal devices. Return any company hardware.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-03-asset-management.md
git commit -m "docs(iso27001): add asset management policy (POL-03)"
```

### Task 18: POL-04 Information Classification & Handling

**Files:**
- Create: `docs/iso27001/policies/POL-04-information-classification.md`

- [ ] **Step 1: Create the document**

Controls covered: A.5.12-A.5.14

Classification scheme:
- **Public:** Marketing materials, public documentation, open-source code
- **Internal:** Internal docs, architecture diagrams, non-sensitive configs
- **Confidential:** Source code, customer data, user PII, database contents, audit logs
- **Restricted:** Encryption keys, API secrets, recordings with medical/BSN data, GDPR export files

Handling rules per classification: storage, transfer, sharing, destruction.

**Labelling (A.5.13):** Document headers include Classification field. Database records classified via schema (e.g., recordings are Restricted when containing PII). Git commits reference classification when touching sensitive files.

**Information transfer (A.5.14):** All data in transit over TLS 1.2+. Database connections use sslmode=require. File uploads via signed SAS tokens over HTTPS. Email notifications via Resend (HTTPS API). No sensitive data in unencrypted email.

Reference existing implementations: PII detection service, log redaction, encryption at rest.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-04-information-classification.md
git commit -m "docs(iso27001): add information classification and handling policy (POL-04)"
```

### Task 19: POL-05 Cryptography & Key Management Policy

**Files:**
- Create: `docs/iso27001/policies/POL-05-cryptography-key-management.md`

- [ ] **Step 1: Create the document**

Controls covered: A.8.24

Sections:
1. **Approved algorithms:** AES-256-GCM for encryption at rest, scrypt for password hashing, HMAC-SHA256 for webhook signatures, PBKDF2-SHA256 for key derivation, SHA-256 for audit log hash chain.
2. **Key management lifecycle:** Generation (cryptographically secure random), storage (currently .env — document migration plan to Azure Key Vault or similar), rotation schedule (annual for master key, immediate on suspected compromise), destruction (secure wipe).
3. **Current implementation:** Reference `src/lib/encryption.ts` — AES-256-GCM with PBKDF2 (100,000 iterations), 64-byte salt, 16-byte IV. OAuth tokens encrypted separately via `OAUTH_ENCRYPTION_KEY`.
4. **Key inventory:**
   - ENCRYPTION_MASTER_KEY: AES-256 master key for data at rest encryption
   - OAUTH_ENCRYPTION_KEY: AES-256 key for OAuth token encryption
   - BETTER_AUTH_SECRET: Session signing
   - CRON_SECRET: Cron job authentication
   - UPLOAD_TOKEN_SECRET: Upload signature verification
5. **Planned improvements:** Migration of master keys to a managed secret store (Azure Key Vault). Document this as a treatment in the risk register.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-05-cryptography-key-management.md
git commit -m "docs(iso27001): add cryptography and key management policy (POL-05)"
```

### Task 20: POL-06 Supplier Security Policy

**Files:**
- Create: `docs/iso27001/policies/POL-06-supplier-security.md`

- [ ] **Step 1: Create the document**

Controls covered: A.5.19-A.5.23

Include a **supplier register** with security assessment:

| Supplier | Service | Data shared | DPA in place | ISO 27001 certified | Last reviewed | Risk level |
| -------- | ------- | ----------- | ------------ | -------------------- | ------------- | ---------- |

Populate with actual suppliers:
- **Azure (Microsoft):** Infrastructure hosting. All application data. DPA via Microsoft OST. ISO 27001 certified. Low risk.
- **Neon:** Database hosting. All structured data. DPA required. SOC 2 Type II. Medium risk.
- **OpenAI:** AI processing. Transcripts, summaries, chat context. DPA required. SOC 2 Type II. High risk (data shared with external LLM).
- **Deepgram:** Speech-to-text. Audio recordings. DPA required. SOC 2 Type II. High risk.
- **Anthropic:** AI processing. Chat context. DPA required. SOC 2 Type II. High risk.
- **Qdrant:** Vector database. Text embeddings. DPA required. Review certification. Medium risk.
- **Stripe:** Payment processing. Payment data. DPA in place. PCI DSS Level 1. Low risk.
- **Resend:** Transactional email. Email addresses, notification content. DPA required. Review certification. Low risk.
- **Recall.ai:** Meeting bot recording. Meeting access. DPA required. Review certification. High risk.
- **Google Workspace:** Calendar, Drive integration. OAuth tokens, calendar data. DPA in place. ISO 27001 certified. Medium risk.
- **Upstash:** Redis cache. Session data, rate limit counters. DPA required. SOC 2 Type II. Low risk.
- **GitHub:** Source code hosting, CI/CD. Source code, secrets (in Actions). DPA in place. SOC 2 Type II. Medium risk.

**Supplier review cadence (A.5.22):** Annual review using TPL-06. High-risk suppliers reviewed biannually.

**Cloud services (A.5.23):** Document shared responsibility model for Azure. Data residency: Azure West Europe, Neon EU-Central-1. Ensure all cloud providers store data within EU/EEA or have adequate safeguards.

**Supply chain (A.5.21):** SBOM generated in CI (CycloneDX format). Dependency updates via Dependabot. License compliance monitoring.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-06-supplier-security.md
git commit -m "docs(iso27001): add supplier security policy (POL-06)"
```

### Task 21: POL-07 Incident Response Plan

**Files:**
- Create: `docs/iso27001/policies/POL-07-incident-response.md`

- [ ] **Step 1: Create the document**

Controls covered: A.5.24-A.5.28

**Incident classification:**
- **P1 Critical:** Data breach, system compromise, ransomware, complete service outage
- **P2 High:** Partial service outage, unauthorized access attempt (successful), vulnerability actively exploited
- **P3 Medium:** Failed attack detected, minor vulnerability, degraded performance
- **P4 Low:** Policy violation, suspicious activity, failed login spikes

**Response process:**
1. **Detection (A.5.25):** Via audit logs (hash chain verified), security logging (organization violations, unauthorized access, rate limit violations), health check failures, external reports, team member reports (A.6.8 — all staff report via ISM email/Slack).
2. **Triage:** ISM classifies severity using matrix above. Reference existing security logging: `logger.security.organizationViolation()`, `logger.security.unauthorizedAccess()`, `logger.security.suspiciousActivity()`.
3. **Containment (A.5.26):** Isolate affected systems, revoke compromised credentials, block attacking IPs. For code-level response: admin kill-switch at `/api/admin/agent/kill-switch`.
4. **Eradication:** Remove root cause, patch vulnerabilities, rotate compromised keys.
5. **Recovery:** Restore from backups if needed, verify system integrity (audit log hash chain verification), gradually restore service.
6. **Evidence collection (A.5.28):** Preserve audit logs (tamper-proof hash chain), session records (IP, user agent), server logs. Chain of custody documented.
7. **Post-incident review (A.5.27):** Conducted within 5 business days. Document: what happened, timeline, root cause, what worked, what to improve. Update risk register. Create CARs for any process failures.

**Breach notification:**
- Dutch DPA (Autoriteit Persoonsgegevens): Within 72 hours per GDPR Article 33
- Affected data subjects: Without undue delay per GDPR Article 34
- Management: Immediately upon classification as P1/P2

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-07-incident-response.md
git commit -m "docs(iso27001): add incident response plan (POL-07)"
```

### Task 22: POL-08 Business Continuity & DR Plan

**Files:**
- Create: `docs/iso27001/policies/POL-08-business-continuity.md`

- [ ] **Step 1: Create the document**

Controls covered: A.5.29-A.5.30, A.8.13-A.8.14

**Recovery objectives:**
- RTO (Recovery Time Objective): 4 hours for application, 8 hours for full data restoration
- RPO (Recovery Point Objective): 1 hour (Neon continuous backups), 24 hours (Azure Blob snapshots)

**Redundancy (A.8.14):**
- Application: Azure Container Apps with 1-3 replicas, automatic scaling
- Database: Neon managed PostgreSQL with point-in-time recovery
- Blob storage: Azure LRS (locally redundant) with versioning (7-day retention) and soft delete
- Network: Azure VNET with NSGs, dedicated subnets

**Backup strategy (A.8.13):**
- **Database:** Neon automated backups (continuous WAL archiving, point-in-time recovery). Azure PostgreSQL Flexible Server backup also configured via Terraform (Backup Vault, daily, 30-day retention).
- **Blob storage:** Azure versioning enabled, soft delete (7 days), restore policy (6 days).
- **Source code:** GitHub (distributed Git, all developers have local clones).
- **Infrastructure:** Terraform state in Azure Storage (versioned, locked).
- **Verification:** Monthly backup restoration test (reference code hardening item 3.16).

**Continuity scenarios:**
1. Azure region failure → Failover documentation, Neon cross-region if available
2. Database corruption → Point-in-time recovery via Neon
3. Application compromise → Redeploy from last known good container image
4. Key compromise → Rotate all keys, revoke sessions, redeploy

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-08-business-continuity.md
git commit -m "docs(iso27001): add business continuity and DR plan (POL-08)"
```

### Task 23: POL-09 HR Security Policy

**Files:**
- Create: `docs/iso27001/policies/POL-09-hr-security.md`

- [ ] **Step 1: Create the document**

Controls covered: A.6.1-A.6.6

Sections:
1. **Pre-employment screening (A.6.1):** Background verification for all engineering hires. Reference checks. Identity verification. Criminal record check for roles with access to Restricted data.
2. **Employment terms (A.6.2):** Employment contracts include: IS responsibilities, confidentiality obligations, acceptable use reference, consequence of violation, post-employment obligations.
3. **Security awareness (A.6.3):** Onboarding security training within first week. Annual refresher training. Phishing simulation exercises. Reference POL-11 for program details.
4. **Disciplinary process (A.6.4):** Verbal warning → Written warning → Suspension → Termination. Immediate termination for intentional data breach or malicious activity.
5. **Termination/change (A.6.5):** Exit checklist: revoke all system access (GitHub, cloud services, application admin) within 24 hours. Remind of ongoing NDA obligations. Return any company equipment. Remove from communication channels.
6. **Confidentiality agreements (A.6.6):** NDA required for all team members before access to Confidential or Restricted data. NDA covers: source code, customer data, security architecture, API keys, business information. Survives employment termination.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-09-hr-security.md
git commit -m "docs(iso27001): add HR security policy (POL-09)"
```

### Task 24: POL-10 Remote Working Policy

**Files:**
- Create: `docs/iso27001/policies/POL-10-remote-working.md`

- [ ] **Step 1: Create the document**

Controls covered: A.6.7

Sections:
- **Workspace requirements:** Dedicated work area, privacy screen or private room for sensitive calls, no shoulder surfing risk.
- **Device security:** Full disk encryption required (FileVault/BitLocker). OS auto-updates enabled. Screen lock after 5 minutes idle. Antivirus/endpoint protection.
- **Network security:** Avoid public Wi-Fi for sensitive work. Home network with WPA3/WPA2. VPN for accessing internal tools if applicable.
- **Data handling:** No customer data on local storage beyond transient development data. No printing of Confidential/Restricted documents. Clean screen policy — close sensitive tabs/applications when leaving workstation.
- **Communication:** Use approved tools (Slack, email). No sensitive data in personal messaging apps. Video calls with screen sharing — verify attendees before sharing sensitive content.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-10-remote-working.md
git commit -m "docs(iso27001): add remote working policy (POL-10)"
```

---

## Chunk 3: Policies & Procedures (POL-11 through POL-20)

Continuation of policy documents.

### Task 25: POL-11 Security Awareness & Training Program

**Files:**
- Create: `docs/iso27001/policies/POL-11-security-awareness-training.md`

- [ ] **Step 1: Create the document**

Controls covered: A.6.3 (primary), A.6.8

Sections:
- **Training program:** Onboarding (within first week), annual refresher, ad-hoc (after incidents or major changes).
- **Topics:** Password hygiene, phishing recognition, social engineering, data classification, incident reporting, GDPR basics, secure coding practices (for engineers), remote work security.
- **Security event reporting (A.6.8):** All staff must report suspected security events to ISM via designated channel (email/Slack) immediately. No penalty for good-faith reporting. Report: what happened, when, what systems affected, any actions taken.
- **Measurement:** Training completion tracked in TPL-08. Target: 100% annual completion. Phishing simulation results tracked and trended.
- **Delivery methods:** Online modules, team sessions, documentation (this docs/iso27001/ folder as reference).

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-11-security-awareness-training.md
git commit -m "docs(iso27001): add security awareness and training program (POL-11)"
```

### Task 26: POL-12 Physical Security Policy

**Files:**
- Create: `docs/iso27001/policies/POL-12-physical-security.md`

- [ ] **Step 1: Create the document**

Controls covered: A.7.1-A.7.14

This policy documents the reduced physical security scope for a remote-first, cloud-native organization with no physical office.

Sections:
1. **Scope reduction justification:** Inovy is fully remote-first with no physical office. All infrastructure is cloud-hosted (Azure, Neon, Qdrant). Controls A.7.1-A.7.4 and A.7.6 are addressed through remote working equivalents rather than traditional physical security.
2. **Environmental threats (A.7.5):** Cloud providers (Azure, Neon) manage physical environmental protection for data centers. Azure provides: fire suppression, flood protection, seismic design, power redundancy.
3. **Clear desk & screen (A.7.7):** Screen lock after 5 minutes. No sensitive documents left visible. Reference POL-10 (Remote Working).
4. **Equipment siting (A.7.8):** Cloud servers managed by Azure. Team laptops positioned to prevent unauthorized viewing.
5. **Off-premises assets (A.7.9):** Team laptops with full disk encryption. Device inventory maintained. Loss/theft reported immediately to ISM.
6. **Storage media (A.7.10):** Minimal local storage of sensitive data. USB drives prohibited for sensitive data transfer.
7. **Supporting utilities (A.7.11):** Azure manages power, cooling, connectivity for cloud infrastructure.
8. **Cabling (A.7.12):** N/A — excluded from ISMS scope (fully cloud-hosted).
9. **Equipment maintenance (A.7.13):** Laptops maintained with OS updates, annual hardware review. Cloud infrastructure maintained by providers.
10. **Secure disposal (A.7.14):** Devices wiped (factory reset or NIST 800-88 compliant erasure) before disposal. SSDs cryptographically erased. Disposal documented.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-12-physical-security.md
git commit -m "docs(iso27001): add physical security policy (POL-12)"
```

### Task 27: POL-13 Secure Development Lifecycle Policy

**Files:**
- Create: `docs/iso27001/policies/POL-13-secure-development-lifecycle.md`

- [ ] **Step 1: Create the document**

Controls covered: A.8.25-A.8.31, A.5.8

Sections:
1. **Security in project management (A.5.8):** All new features assessed for security impact during design. Security checklist: authentication impact, data classification of new data, third-party integrations, input validation requirements, encryption needs.
2. **SDLC phases (A.8.25):** Requirements (security requirements captured) → Design (threat modeling for high-risk features) → Implementation (secure coding standards) → Testing (SAST, code review) → Deployment (automated CI/CD) → Operations (monitoring, incident response).
3. **Application security requirements (A.8.26):** Security headers enforced (CSP, HSTS, X-Frame-Options). Input validation with Zod. Output encoding via React. CSRF protection via Better Auth.
4. **Secure architecture (A.8.27):** React Server Components for data isolation. Organization isolation at data access layer. Layered architecture (UI → Actions → Services → Data Access → Database). Defense in depth.
5. **Secure coding (A.8.28):** Zod schema validation for all inputs. Parameterized queries via Drizzle ORM. No raw SQL. AI prompt injection guards. PII output guards. Pre-commit hooks with secret scanning. TypeScript strict mode.
6. **Security testing (A.8.29):** SAST scanning in CI (CodeQL/Semgrep). Dependency vulnerability scanning (pnpm audit + Dependabot). Pre-commit secret scanning. Annual penetration test (external).
7. **Outsourced development (A.8.30):** External contributors must sign NDA. Code reviewed by internal team before merge. No direct production access for external developers. Security requirements communicated upfront.
8. **Environment separation (A.8.31):** Development (local + .env.local), Production (Azure Container Apps + environment secrets). No production data in development. Test data generated or anonymized. Database migrations tested in dev before production (auto-triggered on PR merge).

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-13-secure-development-lifecycle.md
git commit -m "docs(iso27001): add secure development lifecycle policy (POL-13)"
```

### Task 28: POL-14 Change Management Policy

**Files:**
- Create: `docs/iso27001/policies/POL-14-change-management.md`

- [ ] **Step 1: Create the document**

Controls covered: A.8.32-A.8.33

Sections:
1. **Change management process (A.8.32):** All changes via Pull Requests on GitHub. PR must include: description of change, testing evidence, security impact assessment (for significant changes). Code review required before merge. Database migrations auto-triggered on merge to main (`migrate-prod-db.yml`). Application deployment via GitHub Actions (`azure-container-deploy.yml`). Emergency changes: same process but expedited review, documented post-hoc.
2. **Change categories:** Standard (routine, pre-approved patterns), Normal (requires review), Emergency (immediate fix, post-hoc documentation).
3. **Rollback:** Container image tags allow instant rollback to previous version. Database migrations include down migrations where possible.
4. **Test information (A.8.33):** No production data used in testing. Test data must be synthetic or anonymized. If production data is needed for debugging, it must be anonymized before use and deleted after. Reference GDPR deletion service for anonymization patterns.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-14-change-management.md
git commit -m "docs(iso27001): add change management policy (POL-14)"
```

### Task 29: POL-15 Data Protection & Privacy Policy

**Files:**
- Create: `docs/iso27001/policies/POL-15-data-protection-privacy.md`

- [ ] **Step 1: Create the document**

Controls covered: A.5.34, A.8.10-A.8.12

Sections:
1. **Privacy program (A.5.34):** GDPR compliance. Data minimization. Purpose limitation. Lawful basis for processing (consent for recordings, legitimate interest for account management). Data subject rights: access, rectification, erasure (GDPR deletion service), portability (GDPR export service), restriction, objection. DPO contact information.
2. **Information deletion (A.8.10):** Automated retention policies: GDPR exports expire after 7 days. Session data expires per Better Auth config (7 days). Recording retention policy [to be defined — configurable TTL]. Audit logs retained for 3 years minimum. User deletion: 30-day soft delete with anonymization via `gdpr-deletion.service.ts`.
3. **Data masking (A.8.11):** PII detection service (`pii-detection.service.ts`) detects: email, phone, BSN, credit card, medical records, DOB, address, IP. Automatic redaction in transcriptions. Log sanitization via Pino redaction (passwords, tokens, emails censored as `[Redacted]`). PII anonymization in logs via HMAC-SHA256 hashing (`pii-utils.ts`).
4. **Data leakage prevention (A.8.12):** Log redaction prevents PII in stdout. Organization isolation prevents cross-tenant data access. AI PII output guard middleware prevents LLM from exposing PII. No sensitive data in client-side JavaScript bundles (server components, server-external packages). Webpack fallbacks block `fs`, `path`, `os` on client.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-15-data-protection-privacy.md
git commit -m "docs(iso27001): add data protection and privacy policy (POL-15)"
```

### Task 30: POL-16 Logging & Monitoring Policy

**Files:**
- Create: `docs/iso27001/policies/POL-16-logging-monitoring.md`

- [ ] **Step 1: Create the document**

Controls covered: A.8.15-A.8.17

Sections:
1. **Logging (A.8.15):** Pino structured logging (JSON in production). Log levels: debug/info/warn/error. Sensitive field redaction: password, apiKey, token, accessToken, refreshToken, secret, authorization, cookie, sessionId, email. Audit logs stored in PostgreSQL with SHA-256 hash chain for tamper detection. Three audit subsystems: general audit logs, chat audit logs, consent audit logs.
2. **Events logged:** Authentication (login/logout attempts), authorization failures, organization isolation violations, rate limit violations, resource CRUD operations, permission changes, data exports, integration events, consent changes.
3. **Log retention:** Application logs (stdout): retained per cloud provider log management. Audit logs (database): minimum 3 years. Chat audit logs: minimum 1 year.
4. **Monitoring (A.8.16):** Health check endpoints: `/api/connection-pool/health` (OpenAI/Anthropic pools), `/api/qdrant/health` (vector DB). Consolidated endpoint `/api/health` [to be implemented — item 3.15]. Security monitoring: failed login spikes, organization violation patterns, rate limit abuse.
5. **Clock synchronization (A.8.17):** All cloud services (Azure, Neon, Qdrant) use NTP-synchronized clocks. Application servers inherit Azure host NTP. All timestamps stored with timezone (UTC). Audit log `createdAt` uses `timestamp with timezone`.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-16-logging-monitoring.md
git commit -m "docs(iso27001): add logging and monitoring policy (POL-16)"
```

### Task 31: POL-17 Network Security Policy

**Files:**
- Create: `docs/iso27001/policies/POL-17-network-security.md`

- [ ] **Step 1: Create the document**

Controls covered: A.8.20-A.8.23

Sections:
1. **Network security (A.8.20):** Azure Virtual Network (`vnet-inovy-<env>`) with Network Security Groups. All inbound traffic filtered. Application exposed only via Azure Container Apps ingress (HTTPS). Database accessible only from application subnet.
2. **Network services security (A.8.21):** All connections use TLS 1.2+. Database: `sslmode=require`. HTTPS enforced for all external endpoints. OAuth callbacks over HTTPS only. Webhook endpoints validate signatures (HMAC-SHA256 with timing-safe comparison).
3. **Network segregation (A.8.22):** Three dedicated subnets: `snet-container-apps` (application), `snet-postgresql` (database), `snet-redis` (cache). NSGs restrict traffic between subnets. Database subnet delegated to PostgreSQL Flexible Server.
4. **Web filtering (A.8.23):** AI input moderation via OpenAI moderation API (`omni-moderation-latest`). Prompt injection detection middleware (18+ patterns including Dutch variants). Content flagging in chat audit logs.

Reference Terraform configuration: `infrastructure/modules/networking/main.tf`.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-17-network-security.md
git commit -m "docs(iso27001): add network security policy (POL-17)"
```

### Task 32: POL-18 Vulnerability Management Policy

**Files:**
- Create: `docs/iso27001/policies/POL-18-vulnerability-management.md`

- [ ] **Step 1: Create the document**

Controls covered: A.8.7-A.8.8

Sections:
1. **Protection against malware (A.8.7):** Input validation (Zod schemas) prevents malicious payloads. AI injection guard middleware detects prompt injection. File upload validation (MIME type whitelist, size limits). HMAC-SHA256 upload token verification with timing-safe comparison. DOMPurify for HTML sanitization. Team devices must have endpoint protection (reference POL-19).
2. **Vulnerability management (A.8.8):** Automated dependency scanning via `pnpm audit` in CI [to be implemented — item 3.4]. Dependabot for automated update PRs [to be implemented — item 3.4]. SAST scanning via CodeQL/Semgrep [to be implemented — item 3.10]. SBOM generation via CycloneDX [to be implemented — item 3.5].
3. **Vulnerability response SLA:**
   - Critical (CVSS 9.0+): Patch within 24 hours
   - High (CVSS 7.0-8.9): Patch within 72 hours
   - Medium (CVSS 4.0-6.9): Patch within 30 days
   - Low (CVSS 0.1-3.9): Patch in next release cycle
4. **Responsible disclosure:** Security issues reported to security@inovico.nl. Acknowledged within 48 hours. Resolved per SLA above.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-18-vulnerability-management.md
git commit -m "docs(iso27001): add vulnerability management policy (POL-18)"
```

### Task 33: POL-19 Endpoint & Capacity Management

**Files:**
- Create: `docs/iso27001/policies/POL-19-endpoint-capacity-management.md`

- [ ] **Step 1: Create the document**

Controls covered: A.8.1, A.8.6, A.8.9, A.8.18-A.8.19

Sections:
1. **Endpoint devices (A.8.1):** All team devices must have: full disk encryption, OS auto-updates, screen lock (5 min), antivirus/endpoint protection, firewall enabled. Device inventory maintained in asset register (POL-03). Lost/stolen devices reported immediately.
2. **Capacity management (A.8.6):** Azure Container Apps auto-scaling: 1-3 replicas based on load. Database connection pool: max 15 connections. Neon auto-scaling for compute. Redis: Basic B10 (1GB). Monitoring via health check endpoints. Capacity reviewed quarterly.
3. **Configuration management (A.8.9):** Infrastructure as Code via Terraform (all Azure resources). Application config via environment variables (no config files in production). Docker images built from locked Dockerfile (multi-stage, Alpine base). `pnpm install --frozen-lockfile` ensures reproducible builds. Terraform state locked in Azure Storage.
4. **Privileged utilities (A.8.18):** `pnpm db:push` prohibited in production (documented in AGENTS.md). Admin kill-switch (`/api/admin/agent/kill-switch`) restricted to superadmin role. Database migration only via CI/CD pipeline (`migrate-prod-db.yml`). Direct database access requires documented justification.
5. **Software installation (A.8.19):** Production runs standalone Next.js output (no dev dependencies). Docker image contains only necessary runtime files. New dependencies require PR review. `pnpm.onlyBuiltDependencies` allowlist controls which packages can run postinstall scripts.

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-19-endpoint-capacity-management.md
git commit -m "docs(iso27001): add endpoint and capacity management policy (POL-19)"
```

### Task 34: POL-20 Legal & Compliance Register

**Files:**
- Create: `docs/iso27001/policies/POL-20-legal-compliance-register.md`

- [ ] **Step 1: Create the document**

Controls covered: A.5.31-A.5.33, A.5.35-A.5.37

Sections:
1. **Legal register (A.5.31):**

| Requirement | Jurisdiction | Applicability | Compliance mechanism |
| ----------- | ------------ | ------------- | -------------------- |
| GDPR (EU 2016/679) | EU/NL | All personal data processing | GDPR deletion, consent, DPIAs |
| Dutch UAVG (implementing GDPR) | NL | Dutch-specific GDPR implementation | DPA notification, DPO appointment |
| ePrivacy Directive | EU | Cookies, electronic communications | Cookie consent (if applicable) |
| NEN 7510 | NL | Healthcare info security (advisory) | Noted in risk register — BSN/medical data handling |
| Computer Crime Act (Wet computercriminaliteit) | NL | Criminal cyber law | Incident response, evidence preservation |

2. **Intellectual property (A.5.32):** All code owned by Inovy. Open-source dependencies tracked via SBOM. License compliance: no GPL-licensed code in proprietary codebase without review.
3. **Protection of records (A.5.33):** Audit logs tamper-proof (hash chain). ISMS documents version-controlled in Git. Retention periods per document type (reference POL-16 for logs, this document for legal records: 7 years).
4. **Independent review (A.5.35):** Annual independent security review. Can be: external penetration test, external ISMS audit, or certification surveillance audit.
5. **Compliance monitoring (A.5.36):** ISM conducts quarterly self-assessment against this register. Results reported in management review.
6. **Operating procedures (A.5.37):** Key operational procedures documented: Deployment (CI/CD pipelines in `.github/workflows/`), Database migration (`migrate-prod-db.yml`), Incident response (POL-07), Backup verification (item 3.16), Access provisioning (POL-01).

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/policies/POL-20-legal-compliance-register.md
git commit -m "docs(iso27001): add legal and compliance register (POL-20)"
```

---

## Chunk 4: Code Hardening — Critical & High Priority

These are the technical changes to close security gaps. Each task includes the exact files, code patterns, and commands.

**Base path:** `apps/web/src/` (relative paths below are from the monorepo root)

### Task 35: Security Headers in next.config.ts (Item 3.3)

**Files:**
- Modify: `apps/web/next.config.ts` (add `headers()` export before line 81)

- [ ] **Step 1: Add security headers configuration**

Add a `headers()` async function to `nextConfig` in `apps/web/next.config.ts`, following the same pattern as the existing `redirects()` function. Add headers for all routes (`/:path*`):

```typescript
async headers() {
  return [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "Permissions-Policy",
          value:
            "geolocation=(), microphone=(self), camera=()",
        },
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: blob: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://*.neon.tech https://*.qdrant.io https://*.openai.com https://*.deepgram.com wss://*.deepgram.com https://*.anthropic.com https://*.azure.com https://*.stripe.com https://*.resend.com https://*.recall.ai",
            "media-src 'self' blob: https://*.blob.core.windows.net",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join("; "),
        },
      ],
    },
  ];
},
```

Note: CSP `connect-src` must include all third-party API domains. `microphone=(self)` allows recording functionality. Adjust CSP as needed after testing — start permissive, tighten iteratively.

- [ ] **Step 2: Verify build succeeds**
```bash
cd apps/web && pnpm run build
```

- [ ] **Step 3: Commit**
```bash
git add apps/web/next.config.ts
git commit -m "feat(security): add security headers — CSP, HSTS, X-Frame-Options, Permissions-Policy (A.8.26)"
```

### Task 36: Password Policy Enhancement (Item 3.12)

**Files:**
- Modify: `apps/web/src/features/auth/validation/auth.schema.ts` (lines 7-12, 28-31)

- [ ] **Step 1: Create a strong password validation schema**

In `auth.schema.ts`, replace the password field in `signUpSchema` and `resetPasswordSchema` with enhanced validation. The sign-in schema should remain `min(1)` (validation happens server-side during auth):

```typescript
const strongPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );
```

Use `strongPasswordSchema` in both `signUpSchema.password` and `resetPasswordSchema.newPassword`.

- [ ] **Step 2: Verify typecheck passes**
```bash
cd apps/web && pnpm run typecheck
```

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/features/auth/validation/auth.schema.ts
git commit -m "feat(security): enforce 12-char password with complexity rules (A.8.5)"
```

### Task 37: Dependabot + pnpm audit in CI (Item 3.4)

**Files:**
- Create: `.github/dependabot.yml`
- Create: `.github/workflows/security-scan.yml`

- [ ] **Step 1: Create Dependabot config**

Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "security"
    groups:
      minor-and-patch:
        update-types:
          - "minor"
          - "patch"
  - package-ecosystem: "docker"
    directory: "/apps/web"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "docker"
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "ci"
```

- [ ] **Step 2: Create security scanning workflow**

Create `.github/workflows/security-scan.yml`:
```yaml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: "0 6 * * 1" # Weekly Monday 6am UTC

jobs:
  dependency-audit:
    name: Dependency Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - name: Run pnpm audit
        run: pnpm audit --audit-level=high
        continue-on-error: true
      - name: Run pnpm audit (strict - critical only)
        run: pnpm audit --audit-level=critical
```

- [ ] **Step 3: Commit**
```bash
git add .github/dependabot.yml .github/workflows/security-scan.yml
git commit -m "feat(ci): add Dependabot config and pnpm audit workflow (A.8.8)"
```

### Task 38: SBOM Generation in CI (Item 3.5)

**Files:**
- Modify: `.github/workflows/security-scan.yml` (add SBOM job)

- [ ] **Step 1: Add SBOM generation job**

Add to the `security-scan.yml` workflow:
```yaml
  sbom:
    name: Generate SBOM
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "24"
          cache: "pnpm"
      - run: pnpm install --frozen-lockfile
      - name: Generate CycloneDX SBOM
        uses: CycloneDX/gh-node-module-generatebom@v2
        with:
          output: "sbom.json"
      - name: Upload SBOM artifact
        uses: actions/upload-artifact@v4
        with:
          name: sbom-cyclonedx
          path: sbom.json
          retention-days: 90
```

- [ ] **Step 2: Commit**
```bash
git add .github/workflows/security-scan.yml
git commit -m "feat(ci): add CycloneDX SBOM generation (A.5.21)"
```

### Task 39: SAST Scanning in CI (Item 3.10)

**Files:**
- Modify: `.github/workflows/security-scan.yml` (add SAST job)

- [ ] **Step 1: Add CodeQL SAST job**

Add to the `security-scan.yml` workflow:
```yaml
  sast:
    name: SAST (CodeQL)
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
        with:
          category: "/language:javascript-typescript"
```

- [ ] **Step 2: Commit**
```bash
git add .github/workflows/security-scan.yml
git commit -m "feat(ci): add CodeQL SAST scanning (A.8.29)"
```

### Task 40: Pre-commit Hooks (Item 3.9)

**Files:**
- Modify: `package.json` (root — add prepare script and devDependencies)
- Create: `.husky/pre-commit`

- [ ] **Step 1: Install husky and lint-staged**
```bash
cd /Users/nigeljanssens/Documents/projects/inovy && pnpm add -Dw husky lint-staged
```

- [ ] **Step 2: Initialize husky**
```bash
cd /Users/nigeljanssens/Documents/projects/inovy && npx husky init
```

- [ ] **Step 3: Configure pre-commit hook**

Write `.husky/pre-commit`:
```bash
pnpm exec lint-staged
```

- [ ] **Step 4: Add lint-staged config to root package.json**

Add to root `package.json`:
```json
"lint-staged": {
  "*.{ts,tsx,js,jsx}": [
    "eslint --fix --max-warnings 0"
  ],
  "*.{ts,tsx,js,jsx,json,md}": [
    "prettier --write"
  ]
}
```

Note: The `--max-warnings 0` may fail on pre-existing warnings. If so, scope lint-staged to only check staged files (which it does by default). The existing ~99 warnings are in files that won't be staged unless modified.

- [ ] **Step 5: Commit**
```bash
git add package.json .husky/pre-commit pnpm-lock.yaml
git commit -m "feat(dx): add husky pre-commit hooks with lint-staged (A.8.28)"
```

### Task 41: Account Lockout Mechanism (Item 3.2)

**Files:**
- Create: `apps/web/src/server/services/account-lockout.service.ts`
- Modify: `apps/web/src/features/auth/actions/sign-in.ts` (lines 33-56)

- [ ] **Step 1: Create account lockout service using Redis**

Create `apps/web/src/server/services/account-lockout.service.ts`:

Use the existing Redis client pattern from `rate-limiter.service.ts`. Track failed attempts per email using Redis keys: `lockout:{email}:attempts` (integer, TTL 15min) and `lockout:{email}:locked` (boolean, TTL 15min).

Methods:
- `recordFailedAttempt(email: string): Promise<{ locked: boolean; attemptsRemaining: number }>`
- `isLocked(email: string): Promise<boolean>`
- `resetAttempts(email: string): Promise<void>`

After 5 failed attempts, set `locked` key with 15-minute TTL. On successful login, call `resetAttempts()`.

- [ ] **Step 2: Integrate into sign-in action**

Modify `apps/web/src/features/auth/actions/sign-in.ts`:
- Before the Better Auth API call (line 33): check `isLocked(email)`. If locked, return error with time remaining.
- After failed auth (line 40-56): call `recordFailedAttempt(email)`. Log via `logger.security.suspiciousActivity()` if locked.
- After successful auth: call `resetAttempts(email)`.

- [ ] **Step 3: Verify typecheck**
```bash
cd apps/web && pnpm run typecheck
```

- [ ] **Step 4: Commit**
```bash
git add apps/web/src/server/services/account-lockout.service.ts apps/web/src/features/auth/actions/sign-in.ts
git commit -m "feat(security): add account lockout after 5 failed attempts (A.8.5)"
```

### Task 42: Consolidated Health Check Endpoint (Item 3.15)

**Files:**
- Create: `apps/web/src/app/api/health/route.ts`

- [ ] **Step 1: Create consolidated health endpoint**

Follow the pattern of existing health check routes. Create `/api/health` that aggregates:
- Database connectivity (simple SELECT 1 query via Drizzle)
- Qdrant connectivity (reuse existing health check service)
- Redis connectivity (PING via Redis client)
- Connection pool status (reuse existing metrics)

Return JSON:
```json
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "ISO-8601",
  "checks": {
    "database": { "status": "up", "latencyMs": 12 },
    "qdrant": { "status": "up", "latencyMs": 45 },
    "redis": { "status": "up", "latencyMs": 3 },
    "connectionPool": { "status": "ok", "utilization": 0.2 }
  }
}
```

HTTP 200 if all healthy, 503 if any critical service is down.

- [ ] **Step 2: Verify it builds**
```bash
cd apps/web && pnpm run typecheck
```

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/app/api/health/route.ts
git commit -m "feat(monitoring): add consolidated health check endpoint (A.8.16)"
```

### Task 43: Request ID Propagation (Item 3.14)

**Files:**
- Create: `apps/web/src/server/middleware/request-id.ts`
- Modify: `apps/web/src/proxy.ts` (add request ID generation to middleware)

- [ ] **Step 1: Create request ID utility**

Create `apps/web/src/server/middleware/request-id.ts`:
- Generate UUID v4 for each request
- Check for existing `x-request-id` header (forwarded by load balancer)
- Export `getRequestId(headers: Headers): string`

- [ ] **Step 2: Integrate into proxy middleware**

In `apps/web/src/proxy.ts`, add request ID to response headers and make it available for logging context. Use the existing `LogContext.requestId` field that's already defined in `src/lib/logger.ts:12`.

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/server/middleware/request-id.ts apps/web/src/proxy.ts
git commit -m "feat(observability): add request ID propagation to all log entries (A.8.15)"
```

---

## Chunk 5: Evidence Templates & Guidance

### Task 44: Evidence Templates (TPL-01 through TPL-11)

**Files:**
- Create: `docs/iso27001/templates/TPL-01-risk-assessment-worksheet.md`
- Create: `docs/iso27001/templates/TPL-02-internal-audit-checklist.md`
- Create: `docs/iso27001/templates/TPL-03-management-review-minutes.md`
- Create: `docs/iso27001/templates/TPL-04-corrective-action-record.md`
- Create: `docs/iso27001/templates/TPL-05-security-incident-report.md`
- Create: `docs/iso27001/templates/TPL-06-supplier-security-assessment.md`
- Create: `docs/iso27001/templates/TPL-07-change-request-form.md`
- Create: `docs/iso27001/templates/TPL-08-training-record-log.md`
- Create: `docs/iso27001/templates/TPL-09-security-kpi-dashboard.md`
- Create: `docs/iso27001/templates/TPL-10-certification-readiness-checklist.md`
- Create: `docs/iso27001/templates/TPL-11-surveillance-audit-checklist.md`

- [ ] **Step 1: Create TPL-01 Risk Assessment Worksheet**

Fillable worksheet with columns: Asset, Threat, Vulnerability, Existing controls, Likelihood (1-5), Impact (1-5), Risk score, Risk level, Treatment option, Treatment description, Residual risk, Owner, Deadline.

Include scoring guidance from ISMS-08.

- [ ] **Step 2: Create TPL-02 Internal Audit Checklist**

Checklist organized by ISO 27001 clause (4-10) and Annex A theme. For each control: Question, Evidence required, Conformity (Conform/Minor NC/Major NC/Observation), Notes.

- [ ] **Step 3: Create TPL-03 Management Review Minutes**

Template with: Date, Attendees, Previous action items review, each Clause 9.3 mandatory input item, Decisions taken, Action items (owner, deadline), Next review date.

- [ ] **Step 4: Create TPL-04 Corrective Action Record**

Fields: CAR ID, Date raised, Source (audit/incident/review), Nonconformity description, Root cause analysis, Corrective action, Owner, Deadline, Implementation date, Effectiveness review date, Status (open/in progress/closed), Verified by.

- [ ] **Step 5: Create TPL-05 Security Incident Report**

Fields: Incident ID, Date/time detected, Reported by, Severity (P1-P4), Description, Systems affected, Data affected, Timeline of events, Containment actions, Root cause, Recovery actions, Lessons learned, CARs raised, DPA notification required (Y/N), Data subjects notified (Y/N).

- [ ] **Step 6: Create TPL-06 Supplier Security Assessment**

Assessment form with sections: Supplier name, Service provided, Data shared, Security certifications, DPA status, Access controls, Encryption, Incident response capability, Business continuity, Compliance, Overall risk rating, Reviewer, Date, Next review.

- [ ] **Step 7: Create TPL-07 Change Request Form**

Fields: Change ID, Requester, Date, Change category (Standard/Normal/Emergency), Description, Reason, Systems affected, Risk assessment, Rollback plan, Testing evidence, Approver, Implementation date, Post-implementation review.

- [ ] **Step 8: Create TPL-08 Training Record Log**

Table: Employee name, Role, Training topic, Training type (onboarding/annual/ad-hoc), Date completed, Trainer/provider, Score/pass (if applicable), Next due date.

- [ ] **Step 9: Create TPL-09 Security KPI Dashboard**

Table mirroring ISMS-11 KPIs with columns: KPI, Target, Current value, Trend (improving/stable/declining), Status (green/amber/red), Period, Notes.

- [ ] **Step 10: Create TPL-10 Certification Readiness Checklist**

**Stage 1 checklist:** All ISMS docs exist, all policies exist, SoA complete, risk assessment completed, management review conducted, internal audit conducted.

**Stage 2 checklist:** All code hardening items implemented, evidence of operating ISMS (filled templates, meeting minutes), staff trained, access reviews conducted, incident response tested, backup verified.

- [ ] **Step 11: Create TPL-11 Surveillance Audit Preparation**

Annual checklist: CARs from previous audit closed, management reviews conducted, risk register updated, KPIs reported, training completed, access reviews done, supplier reviews done, policy reviews done (annual review dates checked), any changes to ISMS scope documented.

- [ ] **Step 12: Commit all templates**
```bash
git add docs/iso27001/templates/
git commit -m "docs(iso27001): add all 11 evidence templates (TPL-01 through TPL-11)"
```

### Task 45: Certification Process Guide

**Files:**
- Create: `docs/iso27001/guides/certification-process-guide.md`

- [ ] **Step 1: Create the guide**

Sections:
1. **Choosing a certification body:** Must be accredited (e.g., by RvA in Netherlands). Look for experience with SaaS/tech companies. Request quotes from 2-3 bodies.
2. **Stage 1 Audit (Document Review):** 1-2 days. Auditor reviews all ISMS documentation (Chunk 1 + 2 outputs). Checks: scope adequacy, policy completeness, risk assessment performed, SoA complete, management review conducted. Outcome: readiness assessment + findings to address before Stage 2.
3. **Stage 2 Audit (Implementation Assessment):** 3-5 days, 4-8 weeks after Stage 1. Auditor verifies implementation matches documentation. Interviews staff. Reviews evidence (logs, records, meeting minutes). Tests controls. Outcome: certification recommendation or nonconformities to address.
4. **Addressing nonconformities:** Major NC: must be resolved before certification (typically 90 days). Minor NC: corrective action plan accepted, verified at surveillance. Observations: noted for improvement, not blocking.
5. **Surveillance Audits:** Annual, 1-2 days. Auditor samples controls and checks ISMS is operating. Reviews CARs, changes, improvement actions.
6. **Recertification:** Every 3 years, full audit similar to Stage 1 + Stage 2 combined.
7. **Preparation timeline:** Recommend 2-3 months of ISMS operation before Stage 1 to generate evidence (meeting minutes, completed risk assessments, training records, incident logs).

- [ ] **Step 2: Commit**
```bash
git add docs/iso27001/guides/certification-process-guide.md
git commit -m "docs(iso27001): add certification process guide"
```

---

## Chunk 6: Remaining Code Hardening (High & Medium Priority)

These items are important but less urgent than the critical items in Chunk 4. They can be implemented after the documentation workstreams are complete.

### Task 46: TOTP/MFA via Better Auth (Item 3.1)

**Files:**
- Modify: `apps/web/package.json` (add `@better-auth/two-factor`)
- Modify: `apps/web/src/lib/auth.ts` (add twoFactor plugin at line ~565)
- Modify: `apps/web/src/lib/auth-client.ts` (add twoFactorClient plugin at line ~40)
- Create: `apps/web/src/features/auth/components/mfa-setup.tsx` (MFA enrollment UI)
- Create: `apps/web/src/features/auth/components/mfa-verify.tsx` (MFA verification UI)
- Create: `apps/web/src/features/auth/hooks/use-mfa-setup.ts`

- [ ] **Step 1: Install the package**
```bash
cd apps/web && pnpm add @better-auth/two-factor
```

- [ ] **Step 2: Check Better Auth two-factor docs**

Read the Better Auth two-factor plugin documentation to understand the exact API. Check `node_modules/@better-auth/two-factor` for types and configuration options.

- [ ] **Step 3: Add server-side plugin**

In `apps/web/src/lib/auth.ts`, add the `twoFactor` plugin to the plugins array (before `nextCookies()` which must remain last):

```typescript
import { twoFactor } from "@better-auth/two-factor";

// In plugins array:
twoFactor({
  issuer: "Inovy",
  // Configure TOTP settings
}),
```

- [ ] **Step 4: Add client-side plugin**

In `apps/web/src/lib/auth-client.ts`:
```typescript
import { twoFactorClient } from "@better-auth/two-factor/client";

// In plugins array:
twoFactorClient(),
```

- [ ] **Step 5: Create MFA setup component and hook**

Create the enrollment UI that shows a QR code and accepts a verification code. Create a hook `use-mfa-setup.ts` that wraps the Better Auth two-factor client methods.

- [ ] **Step 6: Create MFA verification component**

Create the verification UI shown during login when MFA is enabled.

- [ ] **Step 7: Integrate into sign-in flow**

Modify the sign-in flow to redirect to MFA verification when the user has MFA enabled.

- [ ] **Step 8: Verify build**
```bash
cd apps/web && pnpm run typecheck && pnpm run build
```

- [ ] **Step 9: Commit**
```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/lib/auth.ts apps/web/src/lib/auth-client.ts apps/web/src/features/auth/components/mfa-setup.tsx apps/web/src/features/auth/components/mfa-verify.tsx apps/web/src/features/auth/hooks/use-mfa-setup.ts
git commit -m "feat(auth): implement TOTP MFA via Better Auth two-factor plugin (A.8.5)"
```

### Task 47: Session Inactivity Timeout (Item 3.7)

**Files:**
- Create: `apps/web/src/features/auth/hooks/use-session-timeout.ts`
- Create: `apps/web/src/features/auth/components/session-timeout-provider.tsx`
- Modify: `apps/web/src/app/(main)/layout.tsx` (wrap with timeout provider)

- [ ] **Step 1: Create idle detection hook**

Create `use-session-timeout.ts`:
- Track mouse/keyboard/touch events
- After 30 minutes of inactivity, call `authClient.signOut()` and redirect to sign-in
- Show a warning dialog at 25 minutes with option to extend

- [ ] **Step 2: Create provider component**

Create `session-timeout-provider.tsx` as a client component that wraps the app layout and provides the idle detection.

- [ ] **Step 3: Integrate into main layout**

Add `<SessionTimeoutProvider>` to the main authenticated layout.

- [ ] **Step 4: Verify build**
```bash
cd apps/web && pnpm run typecheck
```

- [ ] **Step 5: Commit**
```bash
git add apps/web/src/features/auth/hooks/use-session-timeout.ts apps/web/src/features/auth/components/session-timeout-provider.tsx apps/web/src/app/\(main\)/layout.tsx
git commit -m "feat(auth): add 30-minute session inactivity timeout (A.8.5)"
```

### Task 48: Key Management Procedure Documentation (Item 3.6)

**Files:**
- Create: `docs/iso27001/procedures/key-management-procedure.md`

- [ ] **Step 1: Document the procedure**

Create a step-by-step procedure for:
- How to generate a new ENCRYPTION_MASTER_KEY (`openssl rand -base64 32`)
- Where it's currently stored (environment variables, Vercel/Azure secrets)
- Rotation procedure: generate new key → update env var → re-encrypt data → verify → remove old key
- Emergency rotation (suspected compromise): immediate rotation + session revocation + incident report
- Key escrow/backup: who has access to key backups
- Migration plan to Azure Key Vault (future improvement)

- [ ] **Step 2: Commit**
```bash
mkdir -p docs/iso27001/procedures && git add docs/iso27001/procedures/key-management-procedure.md
git commit -m "docs(iso27001): add key management procedure (A.8.24)"
```

### Task 49: Data Retention Auto-Cleanup (Item 3.11)

**Files:**
- Create: `apps/web/src/app/api/cron/data-retention/route.ts`
- Create: `apps/web/src/server/services/data-retention.service.ts`
- Modify: `apps/web/vercel.json` (add cron schedule if using Vercel cron)

- [ ] **Step 1: Create data retention service**

Create `data-retention.service.ts` with methods:
- `cleanupExpiredExports()`: Delete GDPR exports older than 7 days (existing `expiresAt` field)
- `cleanupExpiredSessions()`: Delete sessions past `expiresAt`
- `archiveOldAuditLogs()`: Mark audit logs older than 90 days for archival (add `archived` flag or move to separate table)
- `cleanupOrphanedRecordings()`: Delete recordings marked for deletion past retention period

Follow the existing cron route pattern with CRON_SECRET Bearer token auth.

- [ ] **Step 2: Create cron route**

Create `apps/web/src/app/api/cron/data-retention/route.ts` following the exact pattern from `renew-drive-watches/route.ts`: Bearer token auth, structured logging, JSON response with results.

- [ ] **Step 3: Verify typecheck**
```bash
cd apps/web && pnpm run typecheck
```

- [ ] **Step 4: Commit**
```bash
git add apps/web/src/server/services/data-retention.service.ts apps/web/src/app/api/cron/data-retention/route.ts
git commit -m "feat(security): add data retention auto-cleanup cron job (A.8.10)"
```

### Task 50: Backup Verification Script (Item 3.16)

**Files:**
- Create: `apps/web/src/app/api/cron/backup-verification/route.ts`

- [ ] **Step 1: Create backup verification endpoint**

Create a cron-triggered endpoint that:
1. Verifies Neon database connectivity and checks recent backup status (query `pg_stat_archiver` or use Neon API if available)
2. Verifies Azure Blob Storage accessibility (list recent blobs in recordings container)
3. Logs results with structured logging
4. Returns verification report

Follow the CRON_SECRET auth pattern.

- [ ] **Step 2: Commit**
```bash
git add apps/web/src/app/api/cron/backup-verification/route.ts
git commit -m "feat(monitoring): add backup verification cron endpoint (A.8.13)"
```

---

## Execution Notes

**Workstream dependencies:**
- Chunk 1 (ISMS Foundation) → must complete first
- Chunk 2-3 (Policies) + Chunk 4-6 (Code) → can run in parallel after Chunk 1
- Chunk 5 (Templates + Guide) → can run after Chunk 1, parallel with others

**Items NOT included in this plan (deferred to future work):**
- Item 3.8 (Extend encryption to transcriptions/chat/embeddings) — Large effort, requires schema migration and service-level changes across multiple features. Should be a separate plan.
- Item 3.13 (Audit log archival to cold storage) — Requires Azure archival tier integration. Can be done post-certification as improvement.
- MFA enforcement (making MFA mandatory vs optional) — Implement MFA first (Task 46), then enforce via policy after team enrollment.
- Vault migration for ENCRYPTION_MASTER_KEY — Document procedure now (Task 48), implement Azure Key Vault integration as separate project.

**Commit convention:** All commits use conventional commit format with `(iso27001)` or `(security)` scope.
