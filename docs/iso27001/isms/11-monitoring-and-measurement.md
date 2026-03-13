# Monitoring and Measurement

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Document ID         | ISMS-11                      |
| Version             | 1.0                          |
| Classification      | Internal                     |
| Owner               | Information Security Manager |
| Approved by         | CEO/CTO                      |
| Effective date      | 2026-03-13                   |
| Review date         | 2027-03-13                   |
| ISO 27001 Reference | Clause 9.1                   |

---

## 1. Purpose

This document defines Inovy's approach to monitoring and measuring the performance and effectiveness of the ISMS. It fulfils ISO 27001:2022 Clause 9.1 requirements by identifying what needs to be monitored and measured, the methods to be used, when monitoring and measurement occurs, who is responsible, and when results are analyzed and evaluated.

---

## 2. Approach

Inovy uses a KPI-based framework to provide quantitative evidence of ISMS performance. KPIs are:

- Reported monthly by the ISM in a concise security metrics report
- Reviewed at biannual management reviews (ISMS-13)
- Used as input to the annual risk assessment (ISMS-08) and security objectives review (ISMS-06)
- Escalated immediately to the CEO/CTO when a KPI breaches its critical threshold

KPI data is recorded in the internal security metrics register maintained by the ISM.

---

## 3. KPI Register

### KPI-1: Critical Vulnerability Remediation Time

| Attribute                | Detail                                                                                                                                                                                  |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What is measured**     | Mean Time to Remediate (MTTR) for critical (CVSS ≥ 9.0) vulnerabilities in dependencies, container images, or infrastructure, from identification (Dependabot/SAST alert) to merged fix |
| **Target**               | ≤ 72 hours for Critical (CVSS ≥ 9.0)                                                                                                                                                    |
| **Measurement method**   | GitHub: time from Dependabot/SAST alert creation to PR merged; tracked in GitHub Issues or security advisory tracking                                                                   |
| **Frequency**            | Per event; aggregated monthly                                                                                                                                                           |
| **Responsible**          | Engineering Lead (remediation); ISM (KPI tracking)                                                                                                                                      |
| **Linked objective**     | OBJ-01                                                                                                                                                                                  |
| **Escalation threshold** | Any Critical vulnerability unmitigated beyond 72 hours triggers immediate ISM escalation to CTO                                                                                         |

---

### KPI-2: High Vulnerability Remediation Time

| Attribute                | Detail                                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **What is measured**     | Mean Time to Remediate (MTTR) for high severity (CVSS 7.0–8.9) vulnerabilities from identification to merged fix |
| **Target**               | ≤ 7 calendar days                                                                                                |
| **Measurement method**   | GitHub: time from Dependabot/SAST alert to PR merged                                                             |
| **Frequency**            | Per event; aggregated monthly                                                                                    |
| **Responsible**          | Engineering Lead (remediation); ISM (tracking)                                                                   |
| **Linked objective**     | OBJ-01                                                                                                           |
| **Escalation threshold** | High vulnerabilities unmitigated beyond 14 days trigger ISM review and management notification                   |

---

### KPI-3: MFA Enrollment Rate

| Attribute                | Detail                                                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What is measured**     | Percentage of in-scope accounts (engineering team GitHub, Azure, Neon, Qdrant, Stripe, Resend, Inovy admin) with MFA enabled                                  |
| **Target**               | 100%                                                                                                                                                          |
| **Measurement method**   | Admin console reports for each platform: GitHub Organization Security settings (MFA enforcement report), Azure Entra ID MFA report, per-platform admin review |
| **Frequency**            | Monthly                                                                                                                                                       |
| **Responsible**          | ISM                                                                                                                                                           |
| **Linked objective**     | OBJ-02                                                                                                                                                        |
| **Escalation threshold** | Any account without MFA beyond 30 days of provisioning triggers immediate ISM notification and access suspension                                              |

---

### KPI-4: Mean Time to Detect (MTTD) Security Incidents

| Attribute                | Detail                                                                                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What is measured**     | Average time from a security event occurring (as established from audit logs) to the point of first detection/alert by Inovy's monitoring systems or staff                                    |
| **Target**               | ≤ 4 hours                                                                                                                                                                                     |
| **Measurement method**   | For each confirmed incident: calculate time delta between triggering event timestamp (audit log) and first detection timestamp (alert or staff notification). Rolling average over 12 months. |
| **Frequency**            | Per incident; reviewed monthly (or reported as N/A if no incidents in period)                                                                                                                 |
| **Responsible**          | ISM                                                                                                                                                                                           |
| **Linked objective**     | OBJ-03                                                                                                                                                                                        |
| **Escalation threshold** | Any incident with MTTD > 24 hours triggers a monitoring effectiveness review and corrective action                                                                                            |

---

### KPI-5: Security Awareness Training Completion Rate

| Attribute                | Detail                                                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What is measured**     | Percentage of all Inovy staff and contractors with access to in-scope systems who have completed the mandatory annual security awareness training within the required timeframe |
| **Target**               | 100% by annual deadline; new starters within 14 days of joining                                                                                                                 |
| **Measurement method**   | Training platform completion records; ISM maintains manual register until platform is selected (OBJ-04 deadline: 2026-05-01 for platform selection)                             |
| **Frequency**            | Monthly tracking of outstanding completions; annual reporting of full-cycle completion rate                                                                                     |
| **Responsible**          | ISM                                                                                                                                                                             |
| **Linked objective**     | OBJ-04                                                                                                                                                                          |
| **Escalation threshold** | Non-completion after 30-day grace period triggers ISM notification to individual's manager and Engineering Lead; continued non-completion may result in access suspension       |

---

### KPI-6: Quarterly Access Review On-Time Completion Rate

| Attribute                | Detail                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What is measured**     | Percentage of scheduled quarterly access reviews completed within the scheduled quarter, with documented findings                                     |
| **Target**               | 100% (all scheduled reviews completed on time)                                                                                                        |
| **Measurement method**   | ISM tracking against access review schedule; review evidence stored in `docs/iso27001/records/access-reviews/`                                        |
| **Frequency**            | Quarterly                                                                                                                                             |
| **Responsible**          | Engineering Lead (execution); ISM (oversight and KPI tracking)                                                                                        |
| **Linked objective**     | OBJ-05                                                                                                                                                |
| **Escalation threshold** | Overdue review beyond 4 weeks triggers escalation to CEO/CTO; access review findings with unresolved access removal > 14 days triggers ISM escalation |

---

### KPI-7: Personal Data Breach Count

| Attribute                | Detail                                                                                                                                                                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What is measured**     | Number of confirmed personal data breaches in a rolling 12-month period that resulted or could have resulted in unauthorized external disclosure of personal data, requiring or potentially requiring notification to the Autoriteit Persoonsgegevens under GDPR Art. 33 |
| **Target**               | 0 per rolling 12 months                                                                                                                                                                                                                                                  |
| **Measurement method**   | Incident register review; any incident involving personal data assessed against GDPR Art. 33 criteria by ISM; confirmed breaches reported to AP within 72 hours                                                                                                          |
| **Frequency**            | Continuous monitoring; monthly reporting; annual trend                                                                                                                                                                                                                   |
| **Responsible**          | ISM                                                                                                                                                                                                                                                                      |
| **Linked objective**     | OBJ-06                                                                                                                                                                                                                                                                   |
| **Escalation threshold** | Any confirmed breach triggers immediate escalation to CEO/CTO; AP notification within 72 hours; ISMS-14 corrective action mandatory                                                                                                                                      |

---

### KPI-8: Policy Review Currency

| Attribute                | Detail                                                                                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What is measured**     | Percentage of controlled ISMS documents (ISMS-XX and POL-XX) that have been reviewed within their scheduled review date (12 months from effective or last review date) |
| **Target**               | 100% of documents reviewed by their review date                                                                                                                        |
| **Measurement method**   | ISM review of all document headers against current date; documents flagged as overdue if review date has passed without evidence of review                             |
| **Frequency**            | Monthly check; reported at management review                                                                                                                           |
| **Responsible**          | ISM                                                                                                                                                                    |
| **Linked objective**     | Supports OBJ-07 (certification readiness)                                                                                                                              |
| **Escalation threshold** | Any document overdue by > 3 months triggers management review discussion                                                                                               |

---

### KPI-9: Open Risk Treatment Actions

| Attribute                | Detail                                                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What is measured**     | Number of open risk treatment actions from the risk register (ISMS-09) that are: (a) overdue (past target deadline) and (b) in progress (on track) |
| **Target**               | Zero overdue High or Critical risk treatment actions; all Critical treatments completed within defined deadlines                                   |
| **Measurement method**   | ISM review of ISMS-09 Treatment Plan table; compare target deadline against current date and status                                                |
| **Frequency**            | Monthly                                                                                                                                            |
| **Responsible**          | ISM                                                                                                                                                |
| **Linked objective**     | Supports all security objectives                                                                                                                   |
| **Escalation threshold** | Any overdue Critical or High risk treatment action triggers immediate ISM escalation to CTO; unresolved after 30 days escalates to CEO             |

---

### KPI-10: Corrective Action Closure Rate

| Attribute                | Detail                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What is measured**     | Percentage of Corrective Action Records (CARs) raised in a rolling 12-month period that have been closed (effectiveness verified) within their target completion date |
| **Target**               | ≥ 90% of CARs closed on time; 0 Major NC CARs open beyond 90 days                                                                                                     |
| **Measurement method**   | ISM review of CAR register; compare target dates against closure dates                                                                                                |
| **Frequency**            | Monthly tracking; reported at management review                                                                                                                       |
| **Responsible**          | ISM                                                                                                                                                                   |
| **Linked objective**     | Supports OBJ-07; ISMS-14 (Corrective Action Procedure)                                                                                                                |
| **Escalation threshold** | Major NC CARs open beyond 60 days trigger escalation to CTO; open beyond 90 days escalate to CEO/CTO with re-audit risk assessment                                    |

---

## 4. Reporting

### 4.1 Monthly Security Metrics Report

The ISM produces a monthly security metrics report containing:

- Current value for each KPI vs. target
- Trend indicator (improving / stable / deteriorating) vs. prior month
- Commentary on any KPI breaching threshold or approaching threshold
- Open risk treatment actions status summary
- Notable security events or intelligence in the period

The monthly report is distributed to the Engineering Lead and CEO/CTO. It is stored in `docs/iso27001/records/monthly-metrics/`.

### 4.2 Management Review Input

Aggregated KPI data for the preceding 6 months is presented at each biannual management review (ISMS-13) as part of the Clause 9.3 mandatory inputs. The ISM prepares a management review pack including KPI trend analysis, objective progress, and recommendations.

---

## 5. Document Control

This document is reviewed annually by the ISM. KPI targets may be adjusted following management review if evidence shows targets are consistently met (raise target) or are systematically unachievable (investigate root cause, then adjust if justified). All changes follow ISMS-07.

**Next review:** 2027-03-13
