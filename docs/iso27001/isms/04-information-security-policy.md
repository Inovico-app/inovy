# Information Security Policy

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Document ID         | ISMS-04                      |
| Version             | 1.0                          |
| Classification      | Internal                     |
| Owner               | Information Security Manager |
| Approved by         | CEO/CTO                      |
| Effective date      | 2026-03-13                   |
| Review date         | 2027-03-13                   |
| ISO 27001 Reference | Clause 5.1, 5.2              |

---

## 1. Leadership Commitment and Management Direction (Clause 5.1)

Inovy's executive leadership — the CEO and CTO — are fully committed to the establishment, implementation, operation, monitoring, review, maintenance, and continual improvement of the Information Security Management System (ISMS).

This commitment is demonstrated through:

- **Strategic alignment:** Information security is embedded as a core business objective. The protection of customer meeting data, transcripts, and PII is inseparable from Inovy's commercial proposition and long-term viability.
- **Resource allocation:** Adequate human, technical, and financial resources are allocated to the ISMS, including designating an Information Security Manager, funding security tooling, and allocating engineering time for security improvements.
- **Accountability:** The CEO and CTO personally approve all top-level ISMS policies and are responsible for ensuring that information security objectives are met and integrated into business planning.
- **Tone at the top:** Security awareness and a security-first culture are actively promoted throughout the organization. All staff are expected to understand and apply their security responsibilities.
- **Continual improvement:** Management commits to reviewing ISMS performance biannually (minimum), acting on audit findings, addressing non-conformities through documented corrective actions, and driving measurable improvement in security posture.

---

## 2. Purpose and Scope

This Information Security Policy establishes Inovy's commitment to protecting the confidentiality, integrity, and availability of information assets under its stewardship. It applies to:

- All information systems, applications, and infrastructure within the ISMS scope as defined in ISMS-03
- All employees, contractors, and third parties who access Inovy systems or process Inovy information
- All information assets processed, stored, or transmitted by the Inovy platform, including customer meeting recordings, transcripts, PII, and AI-generated outputs

This policy is the apex document of Inovy's information security policy framework. All subordinate policies (POL-01 through POL-20) derive their authority from and must be consistent with this document.

---

## 3. Information Security Principles

Inovy's information security program is founded on the following principles:

### 3.1 Confidentiality, Integrity, Availability (CIA)

- **Confidentiality:** Customer meeting data, transcripts, and PII are accessible only to authorized users within the correct organizational context. AES-256-GCM encryption protects sensitive data at rest. TLS 1.2+ protects data in transit.
- **Integrity:** The accuracy and completeness of information is protected from unauthorized modification. Tamper-proof SHA-256 hash chain audit logging ensures that security events cannot be altered or deleted. Input validation (Zod) and output validation prevent data corruption.
- **Availability:** The platform is designed for resilience using Azure Container Apps multi-replica deployment and managed database services (Neon PostgreSQL). Service availability targets are defined in SLAs and monitored continuously.

### 3.2 Defense in Depth

No single security control is relied upon in isolation. Inovy implements multiple overlapping layers of defense including: network-layer TLS, application-layer authentication and RBAC, data-layer encryption, AI-layer prompt injection guards and PII output filtering, and audit logging at all layers.

### 3.3 Least Privilege

Access to information and systems is granted only to the extent necessary for a user or process to perform their legitimate function. Inovy's six-role RBAC hierarchy (superadmin, owner, admin, manager, user, viewer) with approximately 50 granular permissions implements least privilege at the application layer. Infrastructure access is restricted to engineers with operational need.

### 3.4 Data Minimization and Privacy by Design

Only data necessary for the stated processing purpose is collected and retained. PII is detected, redacted, or anonymized where possible (Dutch BSN, medical terms). Data retention periods are defined and enforced automatically. Privacy considerations are integrated into system design from inception, not retrofitted.

### 3.5 Accountability and Non-Repudiation

All security-relevant actions are logged with user identity, timestamp, and action detail. The tamper-proof audit log provides a reliable record for incident investigation, compliance demonstration, and forensic analysis.

### 3.6 Continual Improvement

The ISMS is not a static compliance exercise. Security performance is measured against defined objectives (ISMS-06), reviewed in management reviews (ISMS-13), and improved through corrective actions (ISMS-14).

---

## 4. Roles and Responsibilities

Roles and responsibilities for information security are formally defined in ISMS-05 (Roles and Responsibilities). A summary of the authority structure:

| Role                         | Security Authority                                                      |
| ---------------------------- | ----------------------------------------------------------------------- |
| CEO / CTO                    | Ultimate accountability; policy approval; resource allocation           |
| Information Security Manager | ISMS operation; policy maintenance; risk management; audit coordination |
| Engineering Lead             | Technical security implementation; secure SDLC; change management       |
| Developers                   | Secure coding; vulnerability remediation; policy adherence              |
| All Staff                    | Compliance with policies; incident reporting; security awareness        |

---

## 5. Policy Framework

The Inovy ISMS policy framework consists of 20 subordinate policies:

| Policy ID | Policy Name                           | Key Controls                                              |
| --------- | ------------------------------------- | --------------------------------------------------------- |
| POL-01    | Access Control Policy                 | A.5.15-A.5.18, A.8.2-A.8.5 — RBAC, least privilege, MFA   |
| POL-02    | Acceptable Use Policy                 | A.5.10 — Authorized use of company systems and data       |
| POL-03    | Asset Management Policy               | A.5.9, A.5.11-A.5.13 — Asset inventory, classification    |
| POL-04    | Information Classification & Handling | A.5.12-A.5.14 — Data sensitivity levels, handling rules   |
| POL-05    | Cryptography & Key Management Policy  | A.8.24 — Encryption standards, key lifecycle              |
| POL-06    | Supplier Security Policy              | A.5.19-A.5.23 — Third-party assessment, DPA management    |
| POL-07    | Incident Response Plan                | A.5.24-A.5.28 — Detection, response, reporting, review    |
| POL-08    | Business Continuity & DR Plan         | A.5.29-A.5.30, A.8.13-A.8.14 — RTO/RPO, backup, DR        |
| POL-09    | HR Security Policy                    | A.6.1-A.6.6 — Screening, terms, disciplinary, offboarding |
| POL-10    | Remote Working Policy                 | A.6.7 — Secure remote access, device security             |
| POL-11    | Security Awareness & Training Program | A.6.3, A.6.8 — Training, security event reporting         |
| POL-12    | Physical Security Policy              | A.7.1-A.7.14 — Reduced scope, remote-first controls       |
| POL-13    | Secure Development Lifecycle Policy   | A.8.25-A.8.31, A.5.8 — SSDLC, code review, SAST           |
| POL-14    | Change Management Policy              | A.8.32-A.8.33 — Change approval, testing, rollback        |
| POL-15    | Data Protection & Privacy Policy      | A.5.34, A.8.10-A.8.12 — GDPR, data subject rights         |
| POL-16    | Logging & Monitoring Policy           | A.8.15-A.8.17 — Log retention, monitoring, clock sync     |
| POL-17    | Network Security Policy               | A.8.20-A.8.23 — Network controls, TLS, segmentation       |
| POL-18    | Vulnerability Management Policy       | A.8.7-A.8.8 — Scanning, patch SLAs, malware protection    |
| POL-19    | Endpoint & Capacity Management Policy | A.8.1, A.8.6, A.8.9, A.8.18-A.8.19 — Device, capacity     |
| POL-20    | Legal & Compliance Register           | A.5.31-A.5.37 — Legal requirements, IP, compliance        |

All policies are stored in the `docs/iso27001/policies/` directory, version-controlled in Git, and managed per ISMS-07 (Document Control Procedure).

---

## 6. Compliance

### 6.1 Mandatory Compliance

Compliance with this policy and all subordinate policies is mandatory for all persons within scope. By accessing Inovy systems or handling Inovy information, individuals accept their obligations under the ISMS policy framework.

### 6.2 Disciplinary Consequences

Violations of information security policies are addressed through the disciplinary procedure defined in POL-09 (Disciplinary Policy). Consequences may range from retraining and formal warning to contract termination and, where applicable, legal action. The severity of consequence is proportionate to the nature, intent, and impact of the violation.

### 6.3 Exceptions

Exceptions to policy requirements may be granted by the ISM with documented justification and an accepted residual risk. Exceptions are time-limited (maximum 90 days, renewable with re-approval) and recorded in the risk register (ISMS-09).

---

## 7. Review

This policy is reviewed annually by the ISM and approved by the CEO/CTO. Reviews are also triggered by:

- Significant changes to Inovy's systems, infrastructure, or business model
- Material security incidents
- Changes to the regulatory environment (GDPR, NIS2, AI Act)
- ISO 27001 surveillance or recertification audit findings

Changes are managed per ISMS-07 (Document Control Procedure).

---

## Appendix A: Contact with Authorities (A.5.5)

Inovy maintains active contacts with the following authorities. The ISM is responsible for maintaining these relationships and ensuring timely notification in the event of incidents within the scope of their remit.

| Authority                                               | Contact Details                                            | Trigger for Contact                                                          | Timeframe                                       |
| ------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| **Autoriteit Persoonsgegevens (AP)**                    | autoriteitpersoonsgegevens.nl — Breach notification portal | Personal data breach affecting EU data subjects (GDPR Art. 33)               | Within 72 hours of becoming aware of the breach |
| **NCSC-NL** (National Cyber Security Centre)            | ncsc.nl — Incident reporting                               | Significant cybersecurity incidents; critical vulnerability exploitation     | As soon as practicable; NCSC-NL guidelines      |
| **Dutch Police Cybercrime Unit** (Team High Tech Crime) | politie.nl/thema/cybercrime                                | Criminal cybersecurity incidents (ransomware, data theft, system compromise) | Following internal incident assessment          |
| **Certification Body**                                  | Per contractual arrangement                                | Material changes to ISMS scope or non-conformities discovered between audits | Per certification body agreement                |

The ISM maintains a current copy of contact information in the incident response runbook and tests these contact procedures annually.

---

## Appendix B: Contact with Special Interest Groups (A.5.6)

Inovy maintains participation in the following security communities and information-sharing groups to remain current with threat intelligence, vulnerability disclosures, and security best practices:

| Group / Source                                       | Purpose                                                                               | Monitoring Frequency                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **OWASP Netherlands Chapter**                        | Web application security best practices; Top 10 updates; community events             | Quarterly (events); continuous (publications)    |
| **NCSC-NL Advisories and Alerts**                    | Dutch national cyber threat intelligence; vulnerability advisories                    | Weekly review; immediate for critical advisories |
| **NCSC-NL Factsheets**                               | Technical guidance on specific threats and technologies                               | As published                                     |
| **Better Auth Community**                            | Security disclosures, updates, and patches for the Better Auth authentication library | Continuous (GitHub watch; release notes)         |
| **Dutch Cloud Community**                            | Cloud security practices; Azure-specific guidance; Dutch tech ecosystem               | Quarterly                                        |
| **GitHub Security Advisories**                       | Vulnerability disclosures for npm packages and GitHub-hosted dependencies             | Automated (Dependabot alerts) + weekly review    |
| **OWASP Top 10 (Web + API + LLM)**                   | Baseline application security reference; LLM-specific threats (OWASP LLM Top 10)      | Annual review; immediate on new release          |
| **CVE / NVD Database**                               | National Vulnerability Database; CVE feeds for relevant technologies                  | Automated scanning + weekly manual review        |
| **Deepgram / OpenAI / Anthropic Security Bulletins** | Security updates from AI service providers                                            | Continuous (provider release notes)              |

The ISM is responsible for ensuring relevant intelligence from these sources is acted upon and, where applicable, feeds into the risk assessment process (ISMS-08) and vulnerability management (POL-19).

---

**Approved by:** CEO / CTO
**Date of approval:** 2026-03-13
**Next review:** 2027-03-13
