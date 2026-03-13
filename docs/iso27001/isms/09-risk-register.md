# Risk Register

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Document ID         | ISMS-09                      |
| Version             | 1.0                          |
| Classification      | Confidential                 |
| Owner               | Information Security Manager |
| Approved by         | CEO/CTO                      |
| Effective date      | 2026-03-13                   |
| Review date         | 2027-03-13                   |
| ISO 27001 Reference | Clause 6.1.3, 8.1, 8.2, 8.3  |

---

## 1. Purpose

This register records the results of Inovy's information security risk assessment, conducted in accordance with the methodology defined in ISMS-08 (Risk Assessment Methodology). It documents identified risks, their assessed scores, selected treatments, control references, and residual risk levels. It serves as the primary evidence of risk assessment (Clause 6.1.2), risk treatment planning (Clause 6.1.3), and risk treatment implementation (Clause 8.3).

---

## 2. Risk Assessment Summary

**Assessment date:** 2026-03-13
**Conducted by:** Information Security Manager
**Reviewed by:** CTO
**Next full reassessment:** 2027-03-13
**Methodology:** ISMS-08 (Likelihood × Impact, 5×5 matrix)

**Score bands:** Low 1–4 | Medium 5–9 | High 10–15 | Critical 16–25

---

## 3. Risk Register

| Risk ID | Asset                                              | Threat                                                      | Vulnerability                                                                                                                                                         | Likelihood (L) | Impact (I) | Score | Level    | Treatment                                                                                                                                                                                                          | Control Ref                                                    | Residual Score |
| ------- | -------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------- | ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- | -------------- |
| R-001   | User accounts (all roles)                          | Unauthorized account takeover                               | No MFA enforced on engineering and admin accounts; credential theft via phishing or credential stuffing would grant full access                                       | 4              | 5          | 20    | Critical | Mitigate: Implement TOTP MFA for all engineering/admin accounts; enforce via admin console policies                                                                                                                | A.8.5 (Secure authentication)                                  | 4              |
| R-002   | Authentication system (Better Auth)                | Brute force / credential stuffing attack                    | Lack of account lockout or progressive delays on failed authentication attempts                                                                                       | 4              | 4          | 16    | Critical | Mitigate: Implement account lockout (5 failed attempts → 15-min lockout); integrate with rate limiting (existing Redis token bucket)                                                                               | A.8.5 (Secure authentication)                                  | 4              |
| R-003   | npm/Node.js dependencies                           | Exploited known vulnerability in a dependency               | No automated SAST or comprehensive dependency vulnerability scanning in CI pipeline                                                                                   | 3              | 4          | 12    | High     | Mitigate: Enable GitHub Dependabot (configure for npm); add npm audit to CI pipeline; implement SAST via GitHub CodeQL                                                                                             | A.8.8 (Management of technical vulnerabilities)                | 4              |
| R-004   | Web application (Next.js app)                      | Cross-site scripting (XSS), clickjacking, MIME sniffing     | Missing or insufficiently configured HTTP security headers (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options)                                         | 3              | 4          | 12    | High     | Code change: Implement comprehensive HTTP security headers in Next.js middleware; configure CSP with nonces; add X-Frame-Options, HSTS, X-Content-Type-Options                                                     | A.8.26 (Web application security)                              | 3              |
| R-005   | Encryption keys and secrets                        | Key compromise enabling decryption of all encrypted data    | Encryption keys and API credentials managed via environment variables without a dedicated secret management vault                                                     | 2              | 5          | 10    | High     | Mitigate: Implement Azure Key Vault for encryption key storage; rotate all long-lived API keys; document key rotation procedure in POL-05                                                                          | A.8.24 (Use of cryptography)                                   | 4              |
| R-006   | Sensitive data at rest (transcripts, AI summaries) | Unauthorized access to unencrypted sensitive content        | Existing AES-256-GCM encryption applied to primary transcript fields but not uniformly to all sensitive database columns (AI summaries, task content, search indexes) | 3              | 4          | 12    | High     | Mitigate: Extend AES-256-GCM encryption to all sensitive database columns; audit Drizzle ORM schema for unencrypted PII-adjacent fields                                                                            | A.8.24 (Use of cryptography)                                   | 3              |
| R-007   | User sessions                                      | Session hijacking after credential compromise               | No enforced idle session timeout; compromised session tokens remain valid indefinitely after inactivity                                                               | 3              | 4          | 12    | High     | Code change: Implement 30-minute idle session timeout in Better Auth; ensure absolute session expiry; add session invalidation on password change                                                                  | A.8.5 (Secure authentication)                                  | 3              |
| R-008   | Software supply chain                              | Supply chain attack via compromised npm package             | No Software Bill of Materials (SBOM) generation or integrity verification for deployed artifacts; dependency integrity not tracked beyond lockfile                    | 2              | 4          | 8     | Medium   | Mitigate: Generate CycloneDX SBOM in CI pipeline; implement npm provenance verification; configure Sigstore/cosign for container image signing                                                                     | A.5.21 (Managing information security in the ICT supply chain) | 3              |
| R-009   | AI inference pipeline                              | Prompt injection attack via malicious user input            | Existing AI middleware prompt injection guard reduces but does not eliminate risk; sophisticated injection techniques evolve rapidly                                  | 3              | 3          | 9     | Medium   | Mitigate: Maintain and enhance existing prompt injection middleware; implement output validation (Zod schema on all LLM outputs); document AI security controls in policy                                          | A.8.7 (Protection against malware)                             | 4              |
| R-010   | AI-generated outputs                               | PII leakage via LLM output containing sensitive data        | Existing PII output guard reduces risk; LLM may generate Dutch BSN, medical terms, or financial data not caught by current patterns                                   | 3              | 4          | 12    | High     | Mitigate: Maintain existing PII guard; expand regex/ML detection patterns; implement structured output mode (JSON schema enforcement) to reduce free-form PII generation; quarterly review of PII pattern coverage | A.8.11 (Data masking)                                          | 4              |
| R-011   | Multi-tenant data (all organization data)          | Cross-organization data leakage                             | Application-layer org isolation logic could be bypassed by logic error in query construction or RBAC enforcement                                                      | 2              | 5          | 10    | High     | Mitigate: Existing org isolation in RBAC enforced at server action layer; implement automated penetration testing of multi-tenancy boundary; add integration tests for org isolation                               | A.8.3 (Information access restriction)                         | 3              |
| R-012   | Stored personal data                               | GDPR non-compliance from data over-retention                | No automated enforcement of data retention schedules; user data may be retained beyond stated retention period                                                        | 3              | 3          | 9     | Medium   | Code change: Implement automated retention cleanup job; define retention periods per data category in POL-07; test deletion/anonymization pipeline                                                                 | A.8.10 (Information deletion)                                  | 3              |
| R-013   | Third-party service integrations                   | Data breach at a sub-processor exposing Inovy customer data | Inovy shares transcript content with OpenAI, Anthropic, Deepgram; a breach at these providers would expose customer meeting content                                   | 2              | 4          | 8     | Medium   | Mitigate: Annual sub-processor security assessments; DPAs with all sub-processors; data minimization (send only required context to LLMs); monitor provider security advisories                                    | A.5.19, A.5.20, A.5.21, A.5.22 (Supplier relationships)        | 4              |
| R-014   | Internal production systems                        | Insider threat via excessive privilege                      | Engineers with production access could exfiltrate data or make unauthorized changes; no documented quarterly access reviews                                           | 2              | 4          | 8     | Medium   | Mitigate: Existing RBAC and audit logging reduce risk; implement quarterly access reviews (OBJ-05); review least privilege assignments for all production system access                                            | A.5.15 (Access control)                                        | 4              |
| R-015   | Platform availability                              | Service outage disrupting customer operations               | Platform depends on availability of external services (Neon, Azure Container Apps, OpenAI, Deepgram); no documented RTO/RPO targets or DR testing                     | 2              | 4          | 8     | Medium   | Mitigate: Azure Container Apps multi-replica deployment (existing); Neon managed database with automated failover (existing); document RTO/RPO in POL-08; schedule annual DR test                                  | A.5.30 (ICT readiness for business continuity)                 | 4              |

---

## 4. Risk Treatment Plan

| Risk ID | Treatment Action                                                                                           | Responsible            | Target Deadline | Status      | Notes                                                 |
| ------- | ---------------------------------------------------------------------------------------------------------- | ---------------------- | --------------- | ----------- | ----------------------------------------------------- |
| R-001   | Implement TOTP MFA on all engineering/admin accounts; enforce via platform admin console policies          | ISM / Engineering Lead | 2026-04-13      | In Progress | OBJ-02 tracks completion                              |
| R-002   | Implement account lockout after 5 failed attempts (15-min lockout); integrate with Redis rate limiting     | Engineering Lead       | 2026-05-31      | Planned     | Better Auth configuration + custom lockout middleware |
| R-003   | Enable Dependabot for npm; add `npm audit --audit-level=high` to CI; enable GitHub CodeQL SAST             | Engineering Lead       | 2026-06-30      | Planned     | CodeQL workflow configuration required                |
| R-004   | Implement HTTP security headers middleware in Next.js (CSP with nonces, X-Frame-Options, HSTS, etc.)       | Engineering Lead       | 2026-05-31      | Planned     | next.config.ts and middleware.ts changes              |
| R-005   | Migrate encryption key storage to Azure Key Vault; rotate all long-lived API keys; document procedure      | ISM / Engineering Lead | 2026-07-31      | Planned     | Requires Azure Key Vault provisioning via Terraform   |
| R-006   | Audit Drizzle schema for unencrypted sensitive fields; extend AES-256-GCM to AI summaries and task content | Engineering Lead       | 2026-06-30      | Planned     | Schema audit first; migration required                |
| R-007   | Implement 30-min idle session timeout in Better Auth; absolute expiry; invalidation on password change     | Engineering Lead       | 2026-05-31      | Planned     | Better Auth session configuration                     |
| R-008   | Generate CycloneDX SBOM in CI; implement npm provenance; evaluate container image signing                  | Engineering Lead       | 2026-08-31      | Planned     | GitHub Actions workflow addition                      |
| R-009   | Maintain prompt injection middleware; add Zod validation on all LLM outputs; document controls             | Engineering Lead / ISM | 2026-06-30      | Ongoing     | Existing controls to be enhanced and documented       |
| R-010   | Expand PII detection patterns; implement structured JSON output mode for LLM calls; quarterly review       | Engineering Lead / ISM | 2026-06-30      | Ongoing     | Existing PII guard to be enhanced                     |
| R-011   | Multi-tenancy penetration test; add integration tests for org isolation boundaries                         | Engineering Lead       | 2026-09-30      | Planned     | Annual pentest to include multi-tenancy boundary      |
| R-012   | Implement automated data retention cleanup job; define retention periods per POL-07                        | Engineering Lead / ISM | 2026-07-31      | Planned     | Cron job + Drizzle ORM scheduled deletions            |
| R-013   | Complete sub-processor security assessments; ensure DPAs current; implement data minimization in LLM calls | ISM                    | 2026-06-30      | In Progress | Annual review cycle                                   |
| R-014   | Implement quarterly access reviews (Q2 2026 as first); document findings; remove unnecessary access        | Engineering Lead / ISM | 2026-06-30      | Planned     | OBJ-05 tracks completion                              |
| R-015   | Document RTO/RPO in POL-08; schedule annual DR test; test Neon failover                                    | ISM / Engineering Lead | 2026-08-31      | Planned     | DR test to be conducted as tabletop + technical test  |

---

## 5. Risk Acceptance Register

The following risks have been formally accepted by the ISM and/or CEO/CTO at their current treatment or residual level. Accepted risks are reviewed quarterly.

| Risk ID | Risk Level                             | Accepted By | Acceptance Date | Rationale                                                                                                                               | Review Date |
| ------- | -------------------------------------- | ----------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| R-008   | Medium (residual after treatment: Low) | ISM         | 2026-03-13      | Residual supply chain risk after SBOM and provenance controls is within appetite. Full elimination is not achievable.                   | 2026-09-13  |
| R-013   | Medium (residual after treatment: Low) | ISM         | 2026-03-13      | Residual sub-processor breach risk is accepted given contractual DPAs and data minimization. Cannot fully control third-party security. | 2026-09-13  |

---

## 6. Document Control

This risk register is reviewed monthly by the ISM and updated following any triggered assessment event (per ISMS-08 Section 11.3). A full reassessment is conducted annually. Updates follow the procedure in ISMS-07.

This document is classified **Confidential** and access is restricted to the ISM, Engineering Lead, and CEO/CTO.

**Next full review:** 2027-03-13
