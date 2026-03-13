# Security Objectives

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Document ID         | ISMS-06                      |
| Version             | 1.0                          |
| Classification      | Internal                     |
| Owner               | Information Security Manager |
| Approved by         | CEO/CTO                      |
| Effective date      | 2026-03-13                   |
| Review date         | 2027-03-13                   |
| ISO 27001 Reference | Clause 6.2                   |

---

## 1. Purpose

This document defines Inovy's information security objectives for the current ISMS cycle. In accordance with ISO 27001:2022 Clause 6.2, these objectives are specific, measurable, achievable, relevant, and time-bound (SMART). They are aligned with the Information Security Policy (ISMS-04), derived from the risk assessment (ISMS-08, ISMS-09), and consistent with Inovy's business goals.

---

## 2. Objectives Framework

Security objectives are reviewed biannually at management reviews (ISMS-13) and updated annually as part of the ISMS planning cycle. Progress is tracked monthly against KPIs defined in ISMS-11 (Monitoring and Measurement).

---

## 3. Security Objectives

### Objective 1: Eliminate Critical Vulnerability Exposure Within 72 Hours

| Attribute         | Detail                                                                                                                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**          | Ensure that no critical (CVSS ≥ 9.0) vulnerability in Inovy's application dependencies, container images, or infrastructure remains unmitigated for more than 72 hours after identification. High severity (CVSS 7.0–8.9) vulnerabilities must be mitigated within 7 days. |
| **Why**           | Exploited vulnerabilities in dependencies represent a top risk (R-003 in ISMS-09). Inovy's platform processes sensitive PII and meeting recordings, making timely remediation operationally critical and contractually expected by enterprise customers.                   |
| **Who**           | Engineering Lead (primary); Developers (remediation); ISM (monitoring and escalation)                                                                                                                                                                                      |
| **Resources**     | Dependabot automated scanning (existing); SAST tooling in CI pipeline (GitHub CodeQL — to be enabled); monthly manual Snyk/npm audit review                                                                                                                                |
| **Deadline**      | Continuous operation; reporting cycle monthly. Full SAST implementation by 2026-06-30.                                                                                                                                                                                     |
| **Measured how**  | Time from Dependabot/SAST alert to merged remediation PR; tracked in GitHub issues. Mean Time to Remediate (MTTR) by severity level.                                                                                                                                       |
| **Evaluated how** | Monthly KPI report (ISMS-11, KPI-1 and KPI-2); reviewed at management review; ISM escalates any breach of SLA                                                                                                                                                              |

---

### Objective 2: Achieve 100% MFA Enrollment for All Engineering and Admin Accounts

| Attribute         | Detail                                                                                                                                                                                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**          | All Inovy engineering team members and any individual with administrative access to production systems, GitHub, Azure, Neon, Qdrant, Stripe, or other in-scope services must have multi-factor authentication (MFA) enabled within 30 days of account creation. Total population MFA coverage target: 100%. |
| **Why**           | Unauthorized account access is the highest-scoring risk in the risk register (R-001, Score 20 Critical). MFA is the single most effective control against credential-based attacks.                                                                                                                         |
| **Who**           | ISM (enrollment tracking, policy enforcement); Engineering Lead (technical implementation); All Staff (enrollment compliance)                                                                                                                                                                               |
| **Resources**     | TOTP MFA configured in each platform (GitHub, Azure AD/Entra ID, Neon console); Better Auth TOTP implementation for Inovy application admin accounts; MFA enforcement policies in provider admin consoles                                                                                                   |
| **Deadline**      | Existing accounts: 2026-04-13 (30 days from ISMS effective date). New accounts: 30 days from provisioning.                                                                                                                                                                                                  |
| **Measured how**  | MFA enrollment percentage = (accounts with MFA enabled) / (total accounts) × 100. Measured via admin console reports for each platform.                                                                                                                                                                     |
| **Evaluated how** | Monthly KPI report (ISMS-11, KPI-3); quarterly access review verification; any non-enrolled account triggers immediate notification to ISM                                                                                                                                                                  |

---

### Objective 3: Achieve Mean Time to Detect (MTTD) of Less Than 4 Hours for Security Incidents

| Attribute         | Detail                                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**          | Establish and maintain monitoring and alerting capabilities such that security incidents are detected and an alert is generated within 4 hours of the triggering event occurring.                       |
| **Why**           | Early detection is critical to limiting the blast radius of security incidents. Meeting recordings and PII in Inovy's database represent high-value targets; rapid detection enables rapid containment. |
| **Who**           | ISM (monitoring policy and KPI tracking); Engineering Lead (alerting implementation); Developers (log instrumentation)                                                                                  |
| **Resources**     | Pino structured logging (existing); Azure Monitor / Log Analytics (to be configured for security alerting); Uptime monitoring (to be implemented); anomaly detection on audit log access patterns       |
| **Deadline**      | Monitoring baseline configuration: 2026-06-30. KPI tracking begins from monitoring go-live.                                                                                                             |
| **Measured how**  | For each confirmed security incident: time from triggering event (established via audit log) to first alert/detection. Calculated as rolling average over trailing 12 months.                           |
| **Evaluated how** | Reviewed at each management review (ISMS-13); ISM tracks in incident register; security incidents without detection event are classified as monitoring gaps requiring corrective action                 |

---

### Objective 4: Achieve 100% Annual Security Awareness Training Completion

| Attribute         | Detail                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What**          | All Inovy employees and contractors with access to in-scope systems must complete the mandatory annual security awareness training program within the required timeframe. New starters must complete onboarding security training within 14 days of joining. |
| **Why**           | Human error and social engineering are significant attack vectors. A well-trained team reduces phishing susceptibility, improves incident reporting rates, and ensures policy compliance. ISO 27001 Clause 7.2 and A.6.3 mandate competence and awareness.   |
| **Who**           | ISM (program design, delivery, tracking); All Staff (completion)                                                                                                                                                                                             |
| **Resources**     | Security awareness training platform (to be selected by 2026-05-01); annual training content covering: phishing, social engineering, password hygiene, incident reporting, AI security risks, GDPR obligations, physical security                            |
| **Deadline**      | Annual training: completion by 2026-12-31 for current cycle. New starters: within 14 days of start date.                                                                                                                                                     |
| **Measured how**  | Training completion percentage = (completions) / (enrolled staff) × 100. Records maintained by ISM.                                                                                                                                                          |
| **Evaluated how** | Monthly completion tracking; reported at management review; ISM notifies Engineering Lead and CEO/CTO of any non-completion after grace period                                                                                                               |

---

### Objective 5: Conduct Access Reviews on Schedule (Quarterly Compliance ≥ 100%)

| Attribute         | Detail                                                                                                                                                                                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**          | Conduct formal quarterly access reviews covering all production system access (Azure, Neon, GitHub, Qdrant, Stripe, Resend) and application RBAC assignments. All reviews must be completed within the scheduled quarter with documented findings and actions. |
| **Why**           | Accumulation of excessive access rights (privilege creep) increases insider threat and lateral movement risk. Quarterly reviews ensure timely remediation of unnecessary access per least privilege principle.                                                 |
| **Who**           | Engineering Lead (access review execution); ISM (oversight, scheduling, evidence collection); CEO/CTO (review of findings)                                                                                                                                     |
| **Resources**     | Access review checklist (to be created as TPL-XX); admin console access for each platform; review documented in ISMS-controlled document                                                                                                                       |
| **Deadline**      | First quarterly review: 2026-06-30. Subsequent reviews: every calendar quarter thereafter.                                                                                                                                                                     |
| **Measured how**  | On-time completion rate = (quarterly reviews completed on schedule) / (scheduled quarterly reviews) × 100. Remediation completion: access changes identified in review implemented within 14 days.                                                             |
| **Evaluated how** | ISM tracks scheduled vs. completed reviews; evidence provided to internal auditor; reported at management review                                                                                                                                               |

---

### Objective 6: Zero Personal Data Breaches Resulting in Unauthorized External Disclosure

| Attribute         | Detail                                                                                                                                                                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**          | Maintain zero incidents in which personal data (meeting content, transcripts, PII including Dutch BSN or medical data) is disclosed to unauthorized external parties as a result of an Inovy system failure, misconfiguration, or security incident.                                               |
| **Why**           | A personal data breach involving sensitive meeting content or PII would trigger GDPR notification obligations to the AP, cause severe reputational damage, and potentially expose Inovy to regulatory fines and customer churn. This objective targets the risk with the highest potential impact. |
| **Who**           | All roles contributing to the ISMS risk treatment plan; ISM (objective ownership and tracking)                                                                                                                                                                                                     |
| **Resources**     | AES-256-GCM encryption (existing); RBAC org isolation (existing); PII detection/redaction (existing); access controls (existing); risk treatment actions from ISMS-09                                                                                                                              |
| **Deadline**      | Continuous; tracked annually                                                                                                                                                                                                                                                                       |
| **Measured how**  | Count of confirmed personal data breaches requiring notification to the AP under GDPR Art. 33 in a rolling 12-month period. Target: 0.                                                                                                                                                             |
| **Evaluated how** | ISM maintains incident register; any breach event triggers immediate corrective action (ISMS-14) and post-incident root cause analysis; reported at management review                                                                                                                              |

---

### Objective 7: Pass ISO 27001:2022 Stage 2 Audit with Zero Major Non-Conformities

| Attribute         | Detail                                                                                                                                                                                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What**          | Successfully complete the ISO 27001:2022 Stage 2 certification audit with no major non-conformities (findings that indicate complete failure of an ISMS requirement or absence of required documentation/implementation). Minor non-conformities and observations are acceptable and will be addressed through the corrective action process. |
| **Why**           | ISO 27001 certification is a strategic business objective and procurement requirement for enterprise customers. Major non-conformities prevent certification and require a re-audit, incurring cost and delay.                                                                                                                                |
| **Who**           | ISM (audit readiness coordination); Engineering Lead (technical evidence); All Staff (cooperation with auditor); CEO/CTO (management review evidence)                                                                                                                                                                                         |
| **Resources**     | Complete ISMS documentation suite (ISMS-01 to ISMS-14 + POL-01 to POL-20); internal audit program (ISMS-12); corrective action process (ISMS-14); risk register and risk treatment evidence (ISMS-09)                                                                                                                                         |
| **Deadline**      | Stage 2 audit target: Q4 2026 (October–December 2026). Internal pre-audit: Q3 2026 (July–September 2026).                                                                                                                                                                                                                                     |
| **Measured how**  | Audit outcome: number of major non-conformities raised by certification body during Stage 2 audit. Target: 0 major NCs.                                                                                                                                                                                                                       |
| **Evaluated how** | Internal audit (ISMS-12) performed in Q3 2026 serves as pre-assessment; findings addressed via ISMS-14 before Stage 2; certification body audit report reviewed at subsequent management review                                                                                                                                               |

---

## 4. Objectives Tracking Summary

| Obj.   | Description                      | Owner            | Target Date | KPI Reference | Status   |
| ------ | -------------------------------- | ---------------- | ----------- | ------------- | -------- |
| OBJ-01 | Critical vuln mitigation ≤72hr   | Engineering Lead | Continuous  | KPI-1, KPI-2  | Active   |
| OBJ-02 | 100% MFA enrollment              | ISM              | 2026-04-13  | KPI-3         | Active   |
| OBJ-03 | MTTD ≤4hr                        | ISM / Eng Lead   | 2026-06-30  | KPI-4         | Planning |
| OBJ-04 | 100% training completion         | ISM              | 2026-12-31  | KPI-5         | Active   |
| OBJ-05 | Quarterly access reviews on time | Engineering Lead | Quarterly   | KPI-6         | Active   |
| OBJ-06 | Zero PII breaches                | ISM              | Continuous  | KPI-7         | Active   |
| OBJ-07 | Zero major NCs at Stage 2        | ISM              | Q4 2026     | N/A           | Active   |

---

## 5. Document Control

Security objectives are reviewed at every management review (ISMS-13) and updated at least annually to reflect changes in the risk register, organizational priorities, and lessons learned from the preceding cycle.

**Next review:** 2027-03-13
