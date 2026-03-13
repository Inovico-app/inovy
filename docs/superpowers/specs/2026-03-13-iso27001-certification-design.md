# ISO 27001:2022 Full Certification — Design Spec

**Date:** 2026-03-13
**Scope:** Inovy SaaS product + engineering team processes
**Standard:** ISO/IEC 27001:2022 (Annex A: 93 controls, 4 themes)
**Target:** Full formal certification via accredited auditor

---

## 1. Context

Inovy is an AI-powered meeting recording and management platform built as a Next.js 16 monorepo deployed on Azure Container Apps. The application already has a mature security posture including:

- Better Auth with RBAC (6 roles, ~50 permission definitions, organization isolation)
- AES-256-GCM encryption at rest with PBKDF2 key derivation
- Tamper-proof audit logging (SHA-256 hash chain)
- GDPR compliance (deletion, anonymization, consent, export)
- PII detection and redaction (Dutch-specific patterns including BSN)
- Structured logging with Pino (automatic sensitive field redaction)
- Rate limiting (Redis token bucket, tiered by plan)
- Zod input validation, AI prompt injection guards
- HMAC-SHA256 webhook signature verification
- Azure IaC via Terraform, OIDC-based CI/CD, non-root Docker containers

The goal is full ISO 27001:2022 certification. Non-code deliverables (policies, ISMS documents, templates) are written to `docs/iso27001/` for the user to reference and implement organizationally.

**Infrastructure:** Inovy is a fully cloud-native, remote-first organization with no physical office. The production database is Neon serverless PostgreSQL (EU-Central-1). Azure Database for PostgreSQL Flexible Server is provisioned via Terraform as infrastructure but Neon is the active production database. Azure Container Apps hosts the application (West Europe). This affects physical security control applicability.

**AI-Specific Security:** The application includes AI middleware for prompt injection detection, PII output guarding, input moderation (OpenAI moderation API), and AI audit logging. These controls are relevant to A.8.7, A.8.25, A.8.28, and should be reflected in the risk register.

---

## 2. Gap Analysis Summary

### Current State vs. ISO 27001:2022

| Category | Partial (code works, doc missing) | Code+Doc Needed | Code Only Needed | Doc Only Needed | N/A |
| -------- | --------------------------------- | --------------- | ---------------- | --------------- | --- |
| Organizational (A.5, 37 controls) | 13 | 1 | 0 | 23 | 0 |
| People (A.6, 8 controls) | 1 | 0 | 0 | 7 | 0 |
| Physical (A.7, 14 controls) | 4 | 0 | 0 | 9 | 1 |
| Technological (A.8, 34 controls) | 21 | 4 | 4 | 5 | 0 |
| **Total (93)** | **39** | **5** | **4** | **44** | **1** |

Key insight: **no control is "fully implemented" until both the technical control AND the policy document exist.** Every control where code works but no policy exists is "partial". This means the documentation workstream is as critical as the code changes.

Note: "Code+Doc Needed" means the technical implementation has gaps AND the policy document is missing. "Code Only Needed" means the code needs changes but the policy can reference the existing implementation once fixed.

### Critical Code Gaps

1. No MFA/TOTP support (A.8.5)
2. No account lockout mechanism (A.8.5)
3. Missing security headers — CSP, HSTS, X-Frame-Options, X-Content-Type-Options (A.8.26)
4. No dependency vulnerability scanning or SBOM generation in CI (A.8.8, A.5.21)
5. Encryption master key in .env, not a vault (A.8.24)
6. Incomplete encryption coverage — transcriptions, chat, embeddings unencrypted (A.8.24)

---

## 3. Deliverables

### 3A. ISMS Core Documents (`docs/iso27001/isms/`)

14 mandatory management system documents required by Clauses 4-10:

| # | Document | Clause |
| --- | -------- | ------ |
| 1 | Context of the Organization | 4.1 |
| 2 | Interested Parties Register | 4.2 |
| 3 | ISMS Scope Statement | 4.3 |
| 4 | Information Security Policy (includes Leadership & Commitment section) | 5.1, 5.2 |
| 5 | Roles & Responsibilities (RACI Matrix) | 5.2, A.5.2 |
| 6 | Information Security Objectives | 6.2 |
| 7 | Document Control Procedure | 7.5 |
| 8 | Risk Assessment Methodology | 6.1.2 |
| 9 | Risk Register & Treatment Plan | 6.1.3, 8.3 |
| 10 | Statement of Applicability (SoA) | 6.1.3d |
| 11 | Monitoring & Measurement Program | 9.1 |
| 12 | Internal Audit Program | 9.2 |
| 13 | Management Review Template | 9.3 |
| 14 | Corrective Action Procedure | 10.1 |

### 3B. Policies & Procedures (`docs/iso27001/policies/`)

20 policy documents, each covering one or more Annex A controls:

| # | Policy | Controls Covered |
| --- | ------ | ---------------- |
| POL-01 | Access Control Policy | A.5.15-A.5.18, A.8.2-A.8.5 |
| POL-02 | Acceptable Use Policy | A.5.10 |
| POL-03 | Asset Management Policy | A.5.9, A.5.11-A.5.13 |
| POL-04 | Information Classification & Handling | A.5.12-A.5.14 |
| POL-05 | Cryptography & Key Management Policy | A.8.24 |
| POL-06 | Supplier Security Policy | A.5.19-A.5.23 |
| POL-07 | Incident Response Plan | A.5.24-A.5.28 |
| POL-08 | Business Continuity & DR Plan | A.5.29-A.5.30, A.8.13-A.8.14 |
| POL-09 | HR Security Policy | A.6.1-A.6.6 |
| POL-10 | Remote Working Policy | A.6.7 |
| POL-11 | Security Awareness & Training Program | A.6.3 (primary), A.6.8 |
| POL-12 | Physical Security Policy | A.7.1-A.7.14 |
| POL-13 | Secure Development Lifecycle Policy | A.8.25-A.8.31 |
| POL-14 | Change Management Policy | A.8.32-A.8.33 |
| POL-15 | Data Protection & Privacy Policy | A.5.34, A.8.10-A.8.12 |
| POL-16 | Logging & Monitoring Policy | A.8.15-A.8.17 |
| POL-17 | Network Security Policy | A.8.20-A.8.23 |
| POL-18 | Vulnerability Management Policy | A.8.7-A.8.8 |
| POL-19 | Endpoint & Capacity Management | A.8.1, A.8.6, A.8.9, A.8.18-A.8.19 |
| POL-20 | Legal & Compliance Register | A.5.31-A.5.33, A.5.35-A.5.37 |

**Control-to-ISMS-document mapping (not covered by policies above):**

- A.5.1, A.5.2 → ISMS doc #4 (Information Security Policy) and #5 (RACI)
- A.5.3 (Segregation of duties) → ISMS doc #5 (Roles & Responsibilities)
- A.5.4 (Management responsibilities) → ISMS doc #4, Section: Leadership & Commitment (Clause 5.1)
- A.5.5 (Contact with authorities) → ISMS doc #4, Appendix: Authority Contacts
- A.5.6 (Contact with special interest groups) → ISMS doc #4, Appendix: Security Community Contacts
- A.5.7 (Threat intelligence) → ISMS doc #8 (Risk Assessment Methodology), Section: Threat Intelligence Sources
- A.5.8 (IS in project management) → POL-13 (SDLC), Section: Security in Project Initiation
- A.8.34 (Audit testing protection) → ISMS doc #12 (Internal Audit Program), Section: Audit Safeguards

Note: A.6.3 is covered by both POL-09 (supplementary, HR onboarding context) and POL-11 (primary, training program details).

### 3C. Code Hardening (application changes)

16 technical changes grouped by priority:

**Critical (blocks certification):**

| # | Change | Control | Effort |
| --- | ------ | ------- | ------ |
| 3.1 | Implement TOTP/MFA via Better Auth | A.8.5 | Medium |
| 3.2 | Account lockout (5 failed attempts, 15min lock) | A.8.5 | Small |
| 3.3 | Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) | A.8.26 | Small |
| 3.4 | `pnpm audit` + Dependabot in CI | A.8.8 | Small |
| 3.5 | SBOM generation (CycloneDX) in CI | A.5.21 | Small |
| 3.6 | Key management procedure for ENCRYPTION_MASTER_KEY | A.8.24 | Small |
| 3.7 | Session inactivity timeout (30min idle, re-auth) | A.8.5 | Medium |

**High (expected by auditor):**

| # | Change | Control | Effort |
| --- | ------ | ------- | ------ |
| 3.8 | Extend encryption at rest to transcriptions, chat, embeddings | A.8.24 | Large |
| 3.9 | Pre-commit hooks (husky + lint-staged + secret scanning) | A.8.28 | Small |
| 3.10 | SAST scanning in CI (CodeQL or Semgrep) | A.8.29 | Small |
| 3.11 | Data retention auto-cleanup (recordings, audit logs, chat) | A.8.10 | Medium |
| 3.12 | Password minimum 12 chars + complexity rules + breached password check | A.8.5 | Small |

**Medium (strengthens posture):**

| # | Change | Control | Effort |
| --- | ------ | ------- | ------ |
| 3.13 | Audit log retention archival (>90 days, cold storage) | A.8.15 | Medium |
| 3.14 | Request ID propagation across all log entries | A.8.15 | Small |
| 3.15 | Consolidated health check endpoint (`/api/health`) | A.8.16 | Small |
| 3.16 | Backup verification script | A.8.13 | Small |

### 3D. Evidence Templates (`docs/iso27001/templates/`)

11 reusable templates for ongoing compliance:

| # | Template | Purpose |
| --- | ------- | ------- |
| TPL-01 | Risk Assessment Worksheet | Clause 6.1.2 periodic reassessment |
| TPL-02 | Internal Audit Checklist | Clause 9.2 annual audit |
| TPL-03 | Management Review Agenda & Minutes | Clause 9.3 reviews |
| TPL-04 | Corrective Action Record (CAR) | Clause 10.1 nonconformity tracking |
| TPL-05 | Security Incident Report Form | A.5.24-A.5.28 |
| TPL-06 | Supplier Security Assessment Form | A.5.19-A.5.22 |
| TPL-07 | Change Request Form | A.8.32 |
| TPL-08 | Training Record Log | A.6.3 |
| TPL-09 | Security KPI Dashboard | Clause 9.1 metrics |
| TPL-10 | Certification Readiness Checklist | Stage 1 + Stage 2 prep |
| TPL-11 | Surveillance Audit Preparation Checklist | Annual surveillance audit prep |

### 3E. Guidance Documents (`docs/iso27001/guides/`)

| # | Document | Purpose |
| --- | ------- | ------- |
| 1 | Certification Process Guide | Stage 1 (document review), Stage 2 (on-site), surveillance audits, 3-year recertification |

---

## 4. Statement of Applicability (Full Control Map)

### Organizational Controls (A.5.1-A.5.37)

| Control | Name | Applicable | Status | Implementation Reference |
| ------- | ---- | --------- | ------ | ----------------------- |
| A.5.1 | Policies for information security | Yes | DOC NEEDED | Write Information Security Policy |
| A.5.2 | IS roles and responsibilities | Yes | DOC NEEDED | RACI matrix |
| A.5.3 | Segregation of duties | Yes | PARTIAL | RBAC (6 roles) exists; document rationale |
| A.5.4 | Management responsibilities | Yes | DOC NEEDED | Management commitment statement |
| A.5.5 | Contact with authorities | Yes | DOC NEEDED | Dutch AP, NCSC-NL, police cybercrime |
| A.5.6 | Contact with special interest groups | Yes | DOC NEEDED | NCSC-NL, OWASP NL chapter |
| A.5.7 | Threat intelligence | Yes | DOC NEEDED | Threat intel sources and review cadence |
| A.5.8 | IS in project management | Yes | DOC NEEDED | Security checklist for features |
| A.5.9 | Inventory of information assets | Yes | DOC NEEDED | Asset register |
| A.5.10 | Acceptable use | Yes | DOC NEEDED | Acceptable use policy |
| A.5.11 | Return of assets | Yes | DOC NEEDED | Offboarding procedure |
| A.5.12 | Classification of information | Yes | PARTIAL | PII detection exists; document scheme |
| A.5.13 | Labelling of information | Yes | DOC NEEDED | Labelling procedure |
| A.5.14 | Information transfer | Yes | PARTIAL | TLS enforced; document transfer rules |
| A.5.15 | Access control | Yes | PARTIAL | RBAC + org isolation in code; write policy |
| A.5.16 | Identity management | Yes | PARTIAL | Better Auth lifecycle; write process doc |
| A.5.17 | Authentication information | Yes | PARTIAL | scrypt, 8-char min; needs MFA + complexity |
| A.5.18 | Access rights | Yes | PARTIAL | Permissions exist; document review cadence |
| A.5.19 | Supplier relationships | Yes | DOC NEEDED | Supplier assessment for all vendors |
| A.5.20 | IS in supplier agreements | Yes | DOC NEEDED | DPA review per supplier |
| A.5.21 | ICT supply chain | Yes | CODE+DOC | Add SBOM; document supply chain risk |
| A.5.22 | Supplier monitoring | Yes | DOC NEEDED | Supplier review schedule |
| A.5.23 | Cloud services security | Yes | PARTIAL | Azure IaC; document cloud controls + data residency |
| A.5.24 | Incident management planning | Yes | DOC NEEDED | Incident response plan |
| A.5.25 | Assessment of security events | Yes | PARTIAL | Security logging exists; document triage |
| A.5.26 | Response to incidents | Yes | DOC NEEDED | Response playbooks |
| A.5.27 | Learning from incidents | Yes | DOC NEEDED | Post-incident review process |
| A.5.28 | Collection of evidence | Yes | PARTIAL | Audit logs with hash chain; document handling |
| A.5.29 | IS during disruption | Yes | DOC NEEDED | Business continuity plan |
| A.5.30 | ICT readiness for BC | Yes | PARTIAL | Azure multi-replica; document RTO/RPO |
| A.5.31 | Legal requirements | Yes | DOC NEEDED | GDPR, Dutch law, AP register |
| A.5.32 | Intellectual property rights | Yes | DOC NEEDED | IP and license compliance |
| A.5.33 | Protection of records | Yes | PARTIAL | Tamper-proof audit logs; document records mgmt |
| A.5.34 | Privacy and PII | Yes | PARTIAL | GDPR deletion/export/consent; document privacy program |
| A.5.35 | Independent review | Yes | DOC NEEDED | Schedule independent security review |
| A.5.36 | Compliance with policies | Yes | DOC NEEDED | Self-assessment monitoring |
| A.5.37 | Documented operating procedures | Yes | DOC NEEDED | Ops runbooks |

### People Controls (A.6.1-A.6.8)

| Control | Name | Applicable | Status | Implementation Reference |
| ------- | ---- | --------- | ------ | ----------------------- |
| A.6.1 | Screening | Yes | DOC NEEDED | Background check procedure |
| A.6.2 | Terms of employment | Yes | DOC NEEDED | Security clauses in contracts |
| A.6.3 | Security awareness & training | Yes | DOC NEEDED | Training program + records |
| A.6.4 | Disciplinary process | Yes | DOC NEEDED | Disciplinary procedure |
| A.6.5 | Post-employment responsibilities | Yes | DOC NEEDED | Offboarding: revoke access, NDA |
| A.6.6 | Confidentiality agreements | Yes | DOC NEEDED | NDA template |
| A.6.7 | Remote working | Yes | DOC NEEDED | Remote security policy |
| A.6.8 | Security event reporting | Yes | PARTIAL | Audit logging exists; document staff reporting |

### Physical Controls (A.7.1-A.7.14)

| Control | Name | Applicable | Status | Implementation Reference |
| ------- | ---- | --------- | ------ | ----------------------- |
| A.7.1 | Physical security perimeters | Reduced | DOC NEEDED | No physical office; document exclusion rationale + home workspace requirements |
| A.7.2 | Physical entry | Reduced | DOC NEEDED | No physical office; document exclusion rationale |
| A.7.3 | Securing offices | Reduced | DOC NEEDED | No physical office; document home workspace guidelines |
| A.7.4 | Physical security monitoring | Reduced | DOC NEEDED | No physical office; document exclusion rationale |
| A.7.5 | Environmental threats | Yes | PARTIAL | Cloud-hosted; document justification |
| A.7.6 | Working in secure areas | Reduced | DOC NEEDED | No physical office; document exclusion rationale + remote equivalents |
| A.7.7 | Clear desk and clear screen | Yes | DOC NEEDED | Remote worker policy |
| A.7.8 | Equipment siting | Yes | PARTIAL | Cloud-hosted; document |
| A.7.9 | Security of assets off-premises | Yes | DOC NEEDED | Laptop/device policy |
| A.7.10 | Storage media | Yes | DOC NEEDED | Media handling/disposal |
| A.7.11 | Supporting utilities | Yes | PARTIAL | Azure manages; document |
| A.7.12 | Cabling security | No | N/A | Cloud-hosted; excluded in SoA |
| A.7.13 | Equipment maintenance | Yes | PARTIAL | Cloud servers managed; laptop maintenance |
| A.7.14 | Secure disposal | Yes | DOC NEEDED | Device decommissioning |

### Technological Controls (A.8.1-A.8.34)

| Control | Name | Applicable | Status | Implementation Reference |
| ------- | ---- | --------- | ------ | ----------------------- |
| A.8.1 | User endpoint devices | Yes | DOC NEEDED | Endpoint policy |
| A.8.2 | Privileged access rights | Yes | PARTIAL | superadmin/admin roles; document review cadence |
| A.8.3 | Information access restriction | Yes | PARTIAL | Org isolation; write policy |
| A.8.4 | Access to source code | Yes | PARTIAL | GitHub private repo; document access controls |
| A.8.5 | Secure authentication | Yes | CODE NEEDED | MFA, lockout, inactivity timeout, password complexity |
| A.8.6 | Capacity management | Yes | PARTIAL | Azure auto-scaling; document planning |
| A.8.7 | Protection against malware | Yes | PARTIAL | Input validation, injection guard; document endpoint protection |
| A.8.8 | Technical vulnerability management | Yes | CODE NEEDED | Add pnpm audit + Dependabot to CI |
| A.8.9 | Configuration management | Yes | PARTIAL | Terraform IaC; document config baselines |
| A.8.10 | Information deletion | Yes | CODE+DOC | GDPR deletion exists; add retention enforcement |
| A.8.11 | Data masking | Yes | PARTIAL | PII detection/redaction, log sanitization; write policy in POL-15 |
| A.8.12 | Data leakage prevention | Yes | PARTIAL | Log redaction, org isolation; document DLP |
| A.8.13 | Information backup | Yes | PARTIAL | Neon + Azure managed; document policy with RTO/RPO |
| A.8.14 | Redundancy | Yes | PARTIAL | Multi-replica, managed DB; document architecture |
| A.8.15 | Logging | Yes | PARTIAL | Pino structured logging, audit hash chain; write policy in POL-16 |
| A.8.16 | Monitoring activities | Yes | CODE+DOC | Health checks exist; consolidate + document alerting |
| A.8.17 | Clock synchronization | Yes | PARTIAL | Cloud NTP; document sources |
| A.8.18 | Privileged utility programs | Yes | DOC NEEDED | Document restricted tools |
| A.8.19 | Software installation | Yes | PARTIAL | Docker standalone; document controls |
| A.8.20 | Networks security | Yes | PARTIAL | Azure VNET, NSGs; write policy in POL-17 |
| A.8.21 | Security of network services | Yes | PARTIAL | TLS, sslmode=require; write policy in POL-17 |
| A.8.22 | Segregation of networks | Yes | PARTIAL | Dedicated subnets; write policy in POL-17 |
| A.8.23 | Web filtering | Yes | PARTIAL | Input moderation; document |
| A.8.24 | Use of cryptography | Yes | CODE+DOC | AES-256-GCM exists; extend coverage, write crypto policy |
| A.8.25 | Secure development life cycle | Yes | PARTIAL | ESLint, TypeScript strict; formalize SDLC |
| A.8.26 | Application security requirements | Yes | CODE NEEDED | Add security headers |
| A.8.27 | Secure architecture | Yes | PARTIAL | RSC, org isolation; document principles |
| A.8.28 | Secure coding | Yes | CODE+DOC | Zod, parameterized queries; add pre-commit hooks |
| A.8.29 | Security testing | Yes | CODE NEEDED | Add SAST to CI |
| A.8.30 | Outsourced development | Yes | DOC NEEDED | Policy for contractors |
| A.8.31 | Separation of environments | Yes | PARTIAL | Dev/prod via env vars; document strategy |
| A.8.32 | Change management | Yes | PARTIAL | PR workflow, auto-migration; formalize |
| A.8.33 | Test information | Yes | DOC NEEDED | No production PII in test policy |
| A.8.34 | Audit testing protection | Yes | DOC NEEDED | Controls during audit/pentest |

---

## 5. Execution Workstreams

### Workstream 1: ISMS Foundation (Week 1-2)

Must complete first. Stage 1 auditor reads these before anything else.

| # | Document | Clause | Dependencies |
| --- | -------- | ------ | ----------- |
| 1.1 | Context of the Organization | 4.1 | None |
| 1.2 | Interested Parties Register | 4.2 | None |
| 1.3 | ISMS Scope Statement | 4.3 | 1.1, 1.2 |
| 1.4 | Information Security Policy | 5.2 | 1.3 |
| 1.5 | Roles & Responsibilities (RACI) | 5.2, A.5.2 | 1.4 |
| 1.6 | Information Security Objectives | 6.2 | 1.4 |
| 1.7 | Document Control Procedure | 7.5 | 1.4 |
| 1.8 | Risk Assessment Methodology | 6.1.2 | 1.3 |
| 1.9 | Risk Register & Treatment Plan (must include at least one completed risk assessment per Clause 8.1/8.2) | 6.1.3, 8.1, 8.2, 8.3 | 1.8 |
| 1.10 | Statement of Applicability (SoA) | 6.1.3d | 1.9 |
| 1.11 | Monitoring & Measurement Program | 9.1 | 1.6 |
| 1.12 | Internal Audit Program | 9.2 | 1.4 |
| 1.13 | Management Review Template | 9.3 | 1.4 |
| 1.14 | Corrective Action Procedure | 10.1 | 1.4 |

### Workstream 2: Policies & Procedures (Week 2-5)

20 policy documents in `docs/iso27001/policies/`. Can run in parallel with Workstream 3.

POL-01 through POL-20 as specified in Section 3B.

### Workstream 3: Code Hardening (Week 2-5)

16 technical changes in priority order. Can run in parallel with Workstream 2.

Items 3.1-3.16 as specified in Section 3C.

### Workstream 4: Evidence Templates (Week 4-5)

11 templates in `docs/iso27001/templates/`. Can run in parallel with Workstream 5.

TPL-01 through TPL-11 as specified in Section 3D.

### Workstream 5: Guidance Documents (Week 4-5)

1 certification process guide in `docs/iso27001/guides/`.

### Execution Sequence

```
Week 1-2:  Workstream 1 (ISMS Foundation)
              SoA must exist before policies reference it
Week 2-5:  Workstream 2 (Policies)  |parallel|  Workstream 3 (Code Hardening)
Week 4-5:  Workstream 4 (Templates) |parallel|  Workstream 5 (Guides)
Week 5-6:  Internal self-audit against SoA
Week 6+:   Engage certification body for Stage 1
```

---

## 6. Directory Structure

```
docs/iso27001/
├── isms/
│   ├── 01-context-of-organization.md
│   ├── 02-interested-parties.md
│   ├── 03-isms-scope.md
│   ├── 04-information-security-policy.md
│   ├── 05-roles-and-responsibilities.md
│   ├── 06-security-objectives.md
│   ├── 07-document-control-procedure.md
│   ├── 08-risk-assessment-methodology.md
│   ├── 09-risk-register.md
│   ├── 10-statement-of-applicability.md
│   ├── 11-monitoring-and-measurement.md
│   ├── 12-internal-audit-program.md
│   ├── 13-management-review-template.md
│   └── 14-corrective-action-procedure.md
├── policies/
│   ├── POL-01-access-control.md
│   ├── POL-02-acceptable-use.md
│   ├── POL-03-asset-management.md
│   ├── POL-04-information-classification.md
│   ├── POL-05-cryptography-key-management.md
│   ├── POL-06-supplier-security.md
│   ├── POL-07-incident-response.md
│   ├── POL-08-business-continuity.md
│   ├── POL-09-hr-security.md
│   ├── POL-10-remote-working.md
│   ├── POL-11-security-awareness-training.md
│   ├── POL-12-physical-security.md
│   ├── POL-13-secure-development-lifecycle.md
│   ├── POL-14-change-management.md
│   ├── POL-15-data-protection-privacy.md
│   ├── POL-16-logging-monitoring.md
│   ├── POL-17-network-security.md
│   ├── POL-18-vulnerability-management.md
│   ├── POL-19-endpoint-capacity-management.md
│   └── POL-20-legal-compliance-register.md
├── templates/
│   ├── TPL-01-risk-assessment-worksheet.md
│   ├── TPL-02-internal-audit-checklist.md
│   ├── TPL-03-management-review-minutes.md
│   ├── TPL-04-corrective-action-record.md
│   ├── TPL-05-security-incident-report.md
│   ├── TPL-06-supplier-security-assessment.md
│   ├── TPL-07-change-request-form.md
│   ├── TPL-08-training-record-log.md
│   ├── TPL-09-security-kpi-dashboard.md
│   ├── TPL-10-certification-readiness-checklist.md
│   └── TPL-11-surveillance-audit-checklist.md
└── guides/
    └── certification-process-guide.md
```

---

## 7. Dutch/EU-Specific Considerations

- **Supervisory Authority:** Autoriteit Persoonsgegevens (AP) — documented in A.5.5
- **Data Residency:** Azure West Europe + Neon EU-Central-1 — documented in A.5.23
- **NEN 7510:** Not required for ISO 27001 but worth noting in legal register since PII detection handles BSN and medical records
- **GDPR:** Existing deletion/export/consent mechanisms; documented in A.5.34 and POL-15
- **AI Risks:** The risk register (ISMS doc #9) must include AI-specific risks: model hallucination, prompt injection, training data leakage, PII exposure in AI outputs. Existing code controls (injection guard middleware, PII output guard, input moderation, AI audit middleware) should be referenced in the SoA under A.8.7 and A.8.28.

---

## 8. Certification Process

1. **Stage 1 Audit (Document Review):** Auditor reviews ISMS documentation for adequacy. Typically 1-2 days. Focuses on Workstream 1 + 2 outputs.
2. **Stage 2 Audit (Implementation Assessment):** Auditor verifies implementation matches documentation. Typically 3-5 days, 4-8 weeks after Stage 1. Tests all workstream outputs.
3. **Surveillance Audits:** Annual follow-up audits (1-2 days) to verify ongoing compliance.
4. **Recertification:** Full audit every 3 years.
