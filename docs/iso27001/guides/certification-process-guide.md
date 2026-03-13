# ISO 27001:2022 Certification Process Guide

| Document ID       | GUIDE-CERT-01                                                                 |
| ----------------- | ----------------------------------------------------------------------------- |
| Version           | 1.0                                                                           |
| Last Updated      | 2026-03-13                                                                    |
| Owner             | ISMS Manager                                                                  |
| Audience          | ISMS Manager, Management Representative, Engineering Lead                     |
| Related Documents | TPL-10 Certification Readiness Checklist, TPL-11 Surveillance Audit Checklist |

---

## Overview

This guide walks Inovy through the full ISO 27001:2022 certification process — from selecting a certification body to maintaining certification through annual surveillance audits and triennial recertification.

ISO 27001:2022 certification demonstrates to Inovy's customers, partners, and regulators that the company operates a mature, independently verified information security management system (ISMS). For a Dutch SaaS company processing meeting recordings and personal data under GDPR, certification provides credible assurance to enterprise customers and materially reduces the risk of data breaches and regulatory enforcement.

The certification process has three core phases:

1. **ISMS implementation** — Establishing the ISMS and operating it for 2–3 months to generate evidence
2. **Initial certification audit** — Stage 1 (documentation review) followed by Stage 2 (implementation audit)
3. **Ongoing certification** — Annual surveillance audits in Years 1–2; full recertification in Year 3

---

## 1. Choosing a Certification Body

### 1.1 Accreditation Requirement

ISO 27001 certificates are only internationally recognised when issued by an accredited certification body (CB). In the Netherlands, the national accreditation body is the **Raad voor Accreditatie (RvA)**, which operates under the European Cooperation for Accreditation (EA) framework.

**Requirement:** The certification body you select must be accredited by the RvA (or an equivalent EA member body) to audit against ISO/IEC 27001. Verify accreditation at: https://www.rva.nl/en

Certificates from non-accredited bodies will not be recognised by enterprise customers or regulators and offer no compliance benefit.

### 1.2 Selecting the Right Certification Body

Not all CBs are equally suited to SaaS and AI companies. Evaluate candidates against these criteria:

| Criterion               | What to Look For                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| RvA accreditation       | Confirmed on RvA register                                                                                                      |
| SaaS / cloud experience | Auditors with experience in cloud-native, AI, or tech SaaS environments                                                        |
| Dutch market presence   | Local auditors reduce travel cost and are familiar with Dutch regulatory context (AVG)                                         |
| Size fit                | Smaller CBs often provide more personal service; larger CBs (Bureau Veritas, DNV, SGS, LRQA, BSI) have global name recognition |
| Audit timeline          | Confirm availability for your target audit window                                                                              |
| Language                | Dutch-language audit option reduces friction for Dutch-language documentation                                                  |

### 1.3 Getting Quotes

Request formal quotes from at least 2–3 certification bodies. A standard RFQ should include:

- Company overview and ISMS scope description
- Number of employees (include contractors with system access)
- Key technologies (Next.js, Vercel, Neon, Qdrant, AI integrations)
- Target audit timeline
- Any specific regulatory requirements (GDPR, NIS2)

**Typical audit duration for Inovy's profile (10–30 employees, SaaS, single-location scope):**

- Stage 1: 1–2 audit days
- Stage 2: 2–4 audit days
- Annual surveillance: 1–2 audit days

**Typical cost range (Netherlands, small-to-mid SaaS):**

- Initial certification (Stage 1 + Stage 2): €5,000–€15,000 depending on CB and scope
- Annual surveillance: €2,500–€6,000
- Recertification (Year 3): €4,000–€10,000

### 1.4 Recommended Certification Bodies (Netherlands)

The following CBs are RvA-accredited for ISO 27001 and have Dutch market presence. Conduct your own due diligence before selection.

- **Bureau Veritas** (NL presence; strong tech sector experience)
- **DNV** (global leader; tech/SaaS experience)
- **SGS** (broad accreditation portfolio)
- **LRQA** (formerly Lloyd's Register Quality Assurance; strong ISMS practice)
- **BSI Group** (UK-headquartered; strong ISO 27001 reputation)
- **Dekra** (Dutch presence; competitive pricing for SMEs)
- **TÜV Rheinland** (strong tech sector; European presence)

---

## 2. Stage 1 Audit — Documentation Review

### 2.1 Purpose and Scope

The Stage 1 audit is a desk-based review of Inovy's ISMS documentation. Its purpose is to confirm that the foundations of the ISMS are properly documented before the auditor assesses implementation.

The Stage 1 audit typically takes 1–2 days, conducted remotely or on-site. The auditor will not assess whether controls are operating — that is the Stage 2 scope.

### 2.2 What the Auditor Reviews

The Stage 1 auditor will review:

**Mandatory documented information (ISO 27001:2022 Clause 7.5):**

- ISMS scope (ISMS-01) — Is the scope clearly defined? Are boundaries and exclusions justified?
- Information security policy (ISMS-02) — Is it approved by top management and communicated?
- Risk assessment results (ISMS-09, TPL-01) — Has a risk assessment been conducted?
- Statement of Applicability (ISMS-10) — Does it cover all 93 Annex A controls with justifications?
- Risk treatment plan (ISMS-09) — Are treatment decisions made and owners assigned?
- Security objectives (ISMS-06) — Are objectives measurable and aligned with the policy?
- Management review results (TPL-03) — Has at least one management review been conducted?
- Internal audit results (TPL-02) — Has at least one internal audit been conducted?
- Evidence of competence (TPL-08) — Are training records in place?

**Policy and procedure coverage:**
The auditor will check that documented policies exist for the key Annex A areas applicable to Inovy's scope (access control, cryptography, incident management, supplier relations, secure development, etc.).

**SoA completeness:**
Every one of the 93 ISO 27001:2022 Annex A controls must appear in the SoA. Excluded controls must have written justification. Included controls must reference the implementing document or practice.

### 2.3 Common Stage 1 Findings

- SoA does not cover all 93 controls, or justifications are insufficient
- Risk assessment results are too superficial (no threat/vulnerability analysis, no scoring)
- No documented management review
- Security objectives are vague or unmeasurable
- Document control is inconsistent (no version numbers, missing approval dates)
- Scope statement does not clearly define what is included and excluded

### 2.4 Stage 1 Outcome

The Stage 1 audit produces a written report including:

- A readiness assessment for Stage 2
- A list of any findings (major/minor nonconformities, observations)
- Confirmation of the Stage 2 audit date

**Possible outcomes:**

- **Ready for Stage 2** — No major issues; Stage 2 can proceed as planned
- **Ready for Stage 2 with conditions** — Minor issues to address before or during Stage 2
- **Not ready** — Major gaps require resolution before Stage 2 can be scheduled

The gap between Stage 1 and Stage 2 is typically 4–8 weeks, allowing time to address any Stage 1 findings.

### 2.5 Preparation Checklist

Use TPL-10 (Stage 1 section) to verify readiness. Key actions:

- Ensure all mandatory documented information is complete and approved
- Conduct and document at least one management review
- Conduct and document at least one internal audit
- Ensure the SoA covers all 93 controls
- Organise evidence files for easy retrieval during the audit

---

## 3. Stage 2 Audit — Implementation Audit

### 3.1 Purpose and Scope

The Stage 2 audit verifies that the documented ISMS is actually implemented and operating effectively. This is the main certification audit. The auditor will:

- Interview key personnel (CEO, ISMS Manager, engineers, all-staff sample)
- Request evidence that controls are operating (logs, reports, completed templates)
- Test controls where possible (e.g., check MFA configuration, review access lists)
- Verify that the risk treatment plan has been implemented

### 3.2 Duration and Format

**Typical Stage 2 duration for Inovy:** 2–4 audit days, conducted remotely or on-site.

For a remote-first company like Inovy, remote audits are well-supported by most CBs. Prepare a shared evidence repository (organised folder in Notion, SharePoint, or Google Drive) for the auditor to review documents asynchronously between interview sessions.

### 3.3 What the Auditor Will Check

The Stage 2 auditor samples across all clauses and Annex A controls. For a SaaS company, common focus areas include:

**Clause checks:**

- Clause 6 (Planning): Is the risk assessment current? Are all high/critical risks being treated?
- Clause 7 (Support): Are all staff trained? Is documentation controlled?
- Clause 8 (Operation): Is change management operating? Are supplier assessments completed?
- Clause 9 (Performance): Are KPIs being measured? Has a management review been conducted?
- Clause 10 (Improvement): Have nonconformities been identified and addressed?

**Annex A control focus areas for SaaS/AI:**

- A.5.15 Access control — RBAC implementation; least privilege; user provisioning/deprovisioning
- A.5.19–A.5.22 Supplier management — Supplier assessments (TPL-06); DPAs; contractual security
- A.5.23 Cloud services security — Cloud security governance for Vercel, Neon, Qdrant
- A.6.3 Security awareness training — TPL-08 completion records; phishing simulations
- A.8.2 Privileged access — Admin accounts; MFA; privileged access reviews
- A.8.5 Secure authentication — MFA; password policy; session management
- A.8.8 Vulnerability management — Dependency scanning; patch records; TPL-09 KPI-01
- A.8.15 Logging — Audit log configuration; retention; integrity (TPL-09 KPI-07)
- A.8.24 Cryptography — Encryption at rest and in transit; key management
- A.8.29 Security testing — SAST/DAST in CI/CD; pen testing
- A.8.32 Change management — TPL-07 change requests; deployment records

### 3.4 Interview Tips

Auditors typically interview 3–6 people across different roles. Prepare interviewees with these points:

- Know the information security policy and their role in it
- Know how to report a security incident (TPL-05 procedure)
- Know their data classification responsibilities
- Know the acceptable use policy
- Be honest — auditors are experienced; attempting to hide gaps backfires

The ISMS Manager should be available throughout both audit days to answer process questions and retrieve evidence quickly.

### 3.5 Evidence Organisation

Organise your evidence folder before the Stage 2 audit. Suggested structure:

```
ISMS-Evidence/
├── 01-Scope-and-Context/        ISMS-01, stakeholder analysis
├── 02-Policies/                 All 20 policy documents
├── 03-Risk-Register/            ISMS-09, TPL-01 worksheets
├── 04-SoA/                      ISMS-10 Statement of Applicability
├── 05-Management-Review/        TPL-03 completed copies
├── 06-Internal-Audit/           TPL-02 completed copies, ISMS-12
├── 07-Training-Records/         TPL-08 completed log
├── 08-KPI-Reports/              TPL-09 monthly copies
├── 09-Incident-Records/         TPL-05 completed copies (anonymised if needed)
├── 10-CARs/                     TPL-04 completed copies
├── 11-Supplier-Assessments/     TPL-06 completed copies
├── 12-Change-Records/           TPL-07 completed copies
└── 13-Technical-Evidence/       Screenshots, config exports, scan results
```

### 3.6 Stage 2 Outcome

**Possible outcomes:**

| Outcome                          | Definition                                            | Next Steps                                                      |
| -------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| Recommendation for certification | No major NCs; minor NCs and observations addressed    | Certification issued within 2–4 weeks                           |
| Conditional recommendation       | Minor NCs requiring documented action plan            | Submit corrective action plan; certificate issued on acceptance |
| Not recommended                  | Major NCs identified; significant implementation gaps | Address major NCs; re-audit of affected areas                   |

---

## 4. Addressing Nonconformities

### 4.1 Major Nonconformities

A major nonconformity (Major NC) means a significant failure to meet an ISO 27001 requirement. Major NCs prevent certification from being issued.

**Definition of a Major NC (typical criteria):**

- Complete absence of a required process or documented information
- Systematic failure across multiple instances
- A single critical failure with significant risk to information security
- A repeat major NC from a previous audit

**Timeline:** The certification body typically allows **90 days** to resolve major NCs. A written corrective action plan with root cause analysis must be submitted, and the CB will either conduct a follow-up audit or review evidence remotely before issuing the certificate.

**Action:** Raise a TPL-04 CAR for every major NC immediately after the audit. Complete the 5-Whys root cause analysis. Implement corrective actions and obtain evidence before submitting to the CB.

### 4.2 Minor Nonconformities

A minor NC is an isolated lapse or partial implementation that does not constitute a systemic failure.

**Timeline:** Minor NCs must be addressed within **6 months** (by the next surveillance audit), though most CBs expect a documented corrective action plan within 30–60 days.

**Action:** Raise a TPL-04 CAR. A written corrective action plan is usually sufficient to satisfy the CB; the closure is verified at the next surveillance audit.

### 4.3 Observations

Observations are not nonconformities but highlight opportunities for improvement or risks that could become nonconformities if not addressed.

**Action:** Log in the improvement register. Review at the next management review (TPL-03). Address before the next surveillance audit.

### 4.4 Responding to the Certification Body

When submitting corrective action plans:

- Use TPL-04 format or equivalent
- Include: clear description of the nonconformity, root cause analysis, corrective actions taken, evidence of implementation, and effectiveness review plan
- Respond within the CB's stated deadline
- Designate the ISMS Manager as the single point of contact for NC responses

---

## 5. Surveillance Audits

### 5.1 Purpose and Frequency

After initial certification, ISO 27001:2022 requires annual surveillance audits to maintain the certificate. These occur:

- **Year 1 Surveillance (SA-1):** Approximately 12 months after certification date
- **Year 2 Surveillance (SA-2):** Approximately 24 months after certification date
- **Year 3 Recertification:** Approximately 36 months after certification date (see Section 6)

### 5.2 What to Expect

Surveillance audits are shorter than the initial audit (typically 1–2 days). The auditor samples a subset of controls — they do not re-audit the entire ISMS. Focus areas rotate annually based on:

- Findings from the previous audit
- Changes to Inovy's scope, technology, or risk profile
- Mandatory areas that must be covered every cycle (management review, risk assessment, continual improvement, internal audit, Clause 10)

### 5.3 Preparation

Use TPL-11 (Surveillance Audit Preparation Checklist) 8 weeks before each surveillance audit. Key preparation activities:

1. **Close all outstanding CARs** from the previous audit, with evidence of effectiveness review
2. **Conduct at least 2 management reviews** (TPL-03) in the period since certification
3. **Review and update the risk register** (ISMS-09); reassess risks for any new product features or infrastructure changes
4. **Ensure KPI dashboard (TPL-09)** is populated for the full period
5. **Verify 100% training completion** (TPL-08) for the year
6. **Conduct all scheduled access reviews** (quarterly, per KPI-05)
7. **Complete annual supplier assessments** (TPL-06) for critical suppliers
8. **Review all policies** for currency; re-approve and communicate any changes
9. **Document continual improvement actions** undertaken since the last audit
10. **Run the internal audit programme** (ISMS-12); conduct at least one internal audit per year

### 5.4 Surveillance Audit Pitfalls

Common reasons surveillance audits result in findings:

- **Drift in practice:** ISMS processes implemented for the initial audit but not maintained (e.g., access reviews skipped, training not conducted)
- **Undocumented changes:** Significant product or infrastructure changes that were not assessed for risk or reflected in the SoA
- **Stale documentation:** Policies not reviewed; risk register not updated; KPIs not reported
- **Incomplete CAR closure:** Previous findings not fully resolved or effectiveness reviews not conducted
- **Missing management reviews:** Fewer than 2 per year, or reviews that did not address all mandatory inputs

---

## 6. Recertification (Year 3)

### 6.1 Overview

Every 3 years, the full certification audit cycle repeats. The recertification audit is similar in scope to the initial Stage 2 audit — the auditor reviews the entire ISMS, not just a sample.

Recertification audits typically take 2–3 days for a company of Inovy's size.

### 6.2 Preparation

Prepare for recertification as you would for a Stage 2 audit:

- Complete TPL-10 (Certification Readiness Checklist), both Stage 1 and Stage 2 sections
- Ensure all documentation is current and evidence covers the full 3-year period
- Demonstrate continual improvement over the certification cycle
- All CARs from Year 1 and Year 2 surveillance audits must be closed

### 6.3 Certificate Transition

During recertification, your current certificate remains valid until the recertification audit is complete and the new certificate is issued. Confirm the timeline with your CB to avoid a certificate lapse.

---

## 7. Preparation Timeline

The following timeline assumes Inovy has completed ISMS implementation and is ready to begin generating evidence.

### Recommended Preparation Period: 3 Months Before Stage 1

A minimum of **2–3 months of ISMS operation** is required before the Stage 1 audit. This generates the evidence trail that demonstrates the ISMS is operating — not just documented. Attempting Stage 1 with less than 6 weeks of operation is high risk.

```
Month -3 (T-12 weeks):
  - Finalise all ISMS documentation (policies, ISMS-09, ISMS-10 SoA)
  - Conduct initial risk assessment; populate TPL-01 and ISMS-09
  - Conduct first management review (TPL-03)
  - Conduct first internal audit (TPL-02)
  - Begin training programme; complete all onboarding training (TPL-08)
  - Begin KPI tracking (TPL-09)
  - Raise any CARs from internal audit; begin corrective actions (TPL-04)
  - Complete supplier assessments for critical suppliers (TPL-06)
  - Contact 2–3 certification bodies; request quotes

Month -2 (T-8 weeks):
  - Select certification body; agree Stage 1 audit date
  - Second month of KPI reporting (TPL-09)
  - Complete any outstanding corrective actions from internal audit
  - Ensure 100% training completion (TPL-08)
  - Conduct first quarterly access review
  - Verify backup test (TPL-09 KPI-08)
  - Complete TPL-10 Stage 1 readiness checklist; address any gaps

Month -1 (T-4 weeks):
  - Third month of KPI reporting
  - Final review of all documentation for completeness and accuracy
  - Staff briefing on Stage 1 audit process
  - Organise evidence repository for auditor access
  - Resolve any minor gaps identified in TPL-10 check

Stage 1 Audit (T=0):
  - 1–2 days documentation review
  - Receive Stage 1 report and findings

T+1 to T+6 weeks (between Stage 1 and Stage 2):
  - Address any Stage 1 findings (raise TPL-04 CARs if needed)
  - Continue KPI reporting; conduct second management review if not yet done
  - Complete TPL-10 Stage 2 readiness check
  - Confirm Stage 2 audit date

Stage 2 Audit (T+4 to T+8 weeks):
  - 2–4 days implementation audit
  - Receive Stage 2 report

T+2 to T+4 weeks post-Stage 2:
  - Address any minor NCs with corrective action plans
  - Certificate issued by certification body
```

### First Year Post-Certification

```
Month 1–12 post-certification:
  - Maintain all ISMS processes continuously
  - Monthly KPI reporting (TPL-09)
  - Quarterly access reviews
  - Annual training completion by 31 December
  - Minimum 2 management reviews
  - Annual internal audit (ISMS-12)
  - Annual supplier reviews (TPL-06)
  - Annual policy reviews

Month 10 (T+10 months post-certification):
  - Begin surveillance audit preparation (TPL-11)
  - Confirm surveillance audit date with CB

Month 12:
  - Surveillance Audit 1
```

---

## 8. Evidence Management Best Practices

### 8.1 Evidence Repository

Maintain a single, well-organised evidence repository. Options well-suited to Inovy's remote-first setup:

- **Notion** — Native to Inovy's likely toolset; link directly to filled templates
- **Google Drive / SharePoint** — Familiar; good version history
- **GitHub (private repo)** — Keeps documentation close to code; suitable for technical evidence

Organise by template/document ID. Use descriptive file names including the date (e.g., `TPL-03_Management-Review_2026-03-01.md`).

### 8.2 Retention Requirements

| Evidence Type                             | Minimum Retention                           |
| ----------------------------------------- | ------------------------------------------- |
| Management review minutes (TPL-03)        | 3 years                                     |
| Internal audit reports (TPL-02)           | 3 years                                     |
| Corrective action records (TPL-04)        | 3 years                                     |
| Security incident reports (TPL-05)        | 5 years (DPA notification records: 6 years) |
| Supplier assessments (TPL-06)             | Relationship duration + 1 year              |
| Training records (TPL-08)                 | Employment duration + 2 years               |
| KPI reports (TPL-09)                      | 3 years                                     |
| Change records (TPL-07)                   | 2 years                                     |
| Risk assessment records (TPL-01, ISMS-09) | 3 years                                     |

### 8.3 Document Control

All ISMS documents must comply with ISMS-07 Document Control Procedure:

- Unique document ID
- Version number and date
- Approval signature (or digital equivalent)
- Change history / revision notes
- Clear owner
- Next review date

---

## 9. Key Contacts and Resources

### Dutch Regulatory Context

| Organisation                            | Role                                                        | URL                                       |
| --------------------------------------- | ----------------------------------------------------------- | ----------------------------------------- |
| Raad voor Accreditatie (RvA)            | Dutch national accreditation body; verify CB accreditation  | https://www.rva.nl                        |
| Autoriteit Persoonsgegevens (AP)        | Dutch data protection authority; GDPR enforcement           | https://www.autoriteitpersoonsgegevens.nl |
| Nationaal Cyber Security Centrum (NCSC) | Dutch national cybersecurity authority; threat intelligence | https://www.ncsc.nl                       |

### ISO Standards References

| Standard           | Title                                              | Relevance                               |
| ------------------ | -------------------------------------------------- | --------------------------------------- |
| ISO/IEC 27001:2022 | Requirements for an ISMS                           | Certification standard                  |
| ISO/IEC 27002:2022 | Code of practice for information security controls | Implementation guidance for Annex A     |
| ISO/IEC 27005:2022 | Information security risk management               | Risk assessment guidance                |
| ISO/IEC 27017:2015 | Cloud services security controls                   | Guidance for Vercel/Neon/cloud controls |
| ISO/IEC 27018:2019 | Protection of PII in public clouds                 | Guidance for GDPR/meeting data in cloud |

### Useful Tools

| Tool                           | Purpose                                           |
| ------------------------------ | ------------------------------------------------- |
| securityheaders.com            | Verify HTTP security headers (TPL-09 KPI-09)      |
| SSL Labs (ssllabs.com/ssltest) | Verify TLS configuration                          |
| `npm audit` / `pnpm audit`     | Dependency vulnerability scanning (TPL-09 KPI-10) |
| GitHub Dependabot              | Automated dependency security alerts              |
| OWASP ZAP / Burp Suite         | Web application security testing                  |
| Have I Been Pwned API          | Monitor for credential breach exposure            |

---

## 10. Frequently Asked Questions

**Q: How long does the full certification process take?**
A: From starting ISMS implementation to certificate issuance, expect 6–12 months. The minimum realistic timeline is 4 months (3 months evidence + Stage 1 + Stage 2 + certificate issuance), but rushing increases audit risk.

**Q: Do we need a consultant?**
A: Not mandatory. Inovy's existing ISMS documentation set provides the framework. A consultant can accelerate gap analysis and preparation but adds cost. For a company with an engaged ISMS Manager and engineering team, self-driven certification is achievable.

**Q: Can we certify our entire company or just part of it?**
A: ISO 27001 scope can be limited (e.g., "The Inovy SaaS platform and supporting infrastructure"). Audit cost is partly driven by scope. Define scope carefully — too narrow risks looking artificial; too broad increases audit complexity.

**Q: What happens if we fail the Stage 2 audit?**
A: Failure typically means major NCs were found. The CB will not issue the certificate until NCs are resolved. This may require a partial re-audit. Use the time between Stage 1 and Stage 2 to ensure readiness — do not proceed to Stage 2 without completing TPL-10 Stage 2 checks.

**Q: How do we handle a significant product change (e.g., new AI features) during the certification period?**
A: Document the change, conduct a risk assessment update (TPL-01, ISMS-09), update the SoA if new controls are needed, and reflect the change in the next management review (TPL-03). Inform the CB of any significant scope changes before the next audit.

**Q: What is the cost of losing certification?**
A: Certificate suspension or withdrawal is rare but serious. It triggers customer notifications, potential regulatory scrutiny, and reputational damage. The best protection is operating the ISMS continuously — not just before audits.

---

_End of Certification Process Guide_
