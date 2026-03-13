# TPL-09: Security KPI Dashboard

| Document ID       | TPL-09                                                                                    |
| ----------------- | ----------------------------------------------------------------------------------------- |
| Version           | 1.0                                                                                       |
| Last Updated      | 2026-03-13                                                                                |
| Owner             | ISMS Manager                                                                              |
| Related Documents | ISMS-06 Security Objectives, ISMS-11 Security Metrics Framework, TPL-03 Management Review |
| Review Cycle      | Monthly (populate); Quarterly (trend review); Management review input                     |

---

## Instructions

Populate this dashboard monthly. Use it as the primary input to the management review (TPL-03 Section 2.3.1) and for tracking against ISMS-06 Security Objectives.

**Status Key:**

- **Green** — Meeting or exceeding target
- **Amber** — Within 10% of target or short-term miss with known remediation plan
- **Red** — Significantly missing target; immediate action required

**Trend Key:**

- **Improving** — Better performance than previous period
- **Stable** — No significant change
- **Declining** — Worse performance than previous period; investigate

---

## Reporting Period: ******\_\_\_******

_Complete one copy per reporting period. Retain as evidence of ISMS monitoring._

| Field                      | Value   |
| -------------------------- | ------- |
| Reporting Period           | MM/YYYY |
| Prepared By                |         |
| Date Prepared              |         |
| Approved By (ISMS Manager) |         |
| Approval Date              |         |

---

## KPI Summary Dashboard

| KPI ID | KPI Name                           | Target | Current Value | Trend | Status | Period | Notes / Actions Required |
| ------ | ---------------------------------- | ------ | ------------- | ----- | ------ | ------ | ------------------------ |
| KPI-01 | Critical vulnerability remediation |        |               |       |        |        |                          |
| KPI-02 | MFA enrolment                      |        |               |       |        |        |                          |
| KPI-03 | Security training completion       |        |               |       |        |        |                          |
| KPI-04 | Failed login attempts              |        |               |       |        |        |                          |
| KPI-05 | Access reviews completed           |        |               |       |        |        |                          |
| KPI-06 | Incident mean time to respond      |        |               |       |        |        |                          |
| KPI-07 | Audit log integrity                |        |               |       |        |        |                          |
| KPI-08 | Backup verification success        |        |               |       |        |        |                          |
| KPI-09 | Security headers score             |        |               |       |        |        |                          |
| KPI-10 | Dependency freshness               |        |               |       |        |        |                          |

---

## Individual KPI Detail

### KPI-01: Critical and High Vulnerability Remediation Rate

| Attribute                 | Value                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Definition**            | Percentage of critical (CVSS ≥ 9.0) vulnerabilities remediated within 7 days, and high (CVSS 7.0–8.9) within 30 days of identification |
| **Target**                | 100% of critical vulnerabilities within 7 days; 95% of high vulnerabilities within 30 days                                             |
| **Measurement Source**    | Dependency audit (npm audit), Snyk/Dependabot alerts, GitHub Security Advisories, infrastructure vulnerability scans                   |
| **Measurement Frequency** | Weekly (critical); Monthly (high)                                                                                                      |
| **Formula**               | (Remediated within SLA / Total identified) × 100                                                                                       |

| Period         | Critical Identified | Critical Remediated on Time | High Identified | High Remediated on Time | KPI Value | Status |
| -------------- | ------------------- | --------------------------- | --------------- | ----------------------- | --------- | ------ |
| Current month  |                     |                             |                 |                         | %         |        |
| Previous month |                     |                             |                 |                         | %         |        |
| 3 months ago   |                     |                             |                 |                         | %         |        |

**Outstanding vulnerabilities (overdue):**

**Notes / Actions:**

---

### KPI-02: MFA Enrolment Rate

| Attribute                 | Value                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Definition**            | Percentage of all Inovy staff and privileged system accounts with multi-factor authentication enrolled and enforced |
| **Target**                | 100% of all staff and admin/privileged accounts                                                                     |
| **Measurement Source**    | BetterAuth admin panel; GitHub organisation MFA settings; Vercel team MFA; cloud provider IAM                       |
| **Measurement Frequency** | Monthly                                                                                                             |
| **Formula**               | (Accounts with MFA enabled / Total active accounts) × 100                                                           |

| Account Category                      | Total Accounts | MFA Enabled | MFA Compliance % | Status |
| ------------------------------------- | -------------- | ----------- | ---------------- | ------ |
| Inovy employee accounts (application) |                |             |                  |        |
| GitHub organisation members           |                |             |                  |        |
| Vercel team members                   |                |             |                  |        |
| Neon / database access                |                |             |                  |        |
| Cloud provider / infrastructure       |                |             |                  |        |
| **Total**                             |                |             |                  |        |

**Non-compliant accounts (if any):**

**Notes / Actions:**

---

### KPI-03: Security Training Completion Rate

| Attribute                 | Value                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Definition**            | Percentage of all Inovy employees who have completed all mandatory security training topics for the current year |
| **Target**                | 100% of all staff by 31 December each year; 100% of new starters within 30 days of joining                       |
| **Measurement Source**    | TPL-08 Training Record Log                                                                                       |
| **Measurement Frequency** | Quarterly (minimum); monthly during onboarding                                                                   |
| **Formula**               | (Employees with all mandatory topics complete / Total employees) × 100                                           |

| Category                    | Total | Fully Complete | Partially Complete | Not Started | Completion % | Status |
| --------------------------- | ----- | -------------- | ------------------ | ----------- | ------------ | ------ |
| All staff — annual training |       |                |                    |             |              |        |
| New starters (Q1)           |       |                |                    |             |              |        |
| New starters (Q2)           |       |                |                    |             |              |        |
| New starters (Q3)           |       |                |                    |             |              |        |
| New starters (Q4)           |       |                |                    |             |              |        |

**Overdue employees (see TPL-08 Section 3 for detail):**

**Notes / Actions:**

---

### KPI-04: Failed Login Attempts / Authentication Anomalies

| Attribute                 | Value                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Definition**            | Number of failed login attempts and authentication anomalies detected per day, as a proxy for brute-force, credential stuffing, and account takeover attempts |
| **Target**                | Baseline established in Month 1; alert threshold set at 3× baseline; investigate any day exceeding 50 failed attempts                                         |
| **Measurement Source**    | BetterAuth logs; Vercel access logs; application security logs; SIEM (if implemented)                                                                         |
| **Measurement Frequency** | Daily monitoring; monthly reporting                                                                                                                           |
| **Formula**               | Count of failed authentication events per day                                                                                                                 |

| Period         | Daily Average | Peak Day Value | Peak Day Date | Anomalies Investigated | Incidents Raised |
| -------------- | ------------- | -------------- | ------------- | ---------------------- | ---------------- |
| Current month  |               |                |               |                        |                  |
| Previous month |               |                |               |                        |                  |
| 3 months ago   |               |                |               |                        |                  |

**Status:** [ ] Within normal range [ ] Elevated — investigation in progress [ ] Alert threshold exceeded

**Notes / Actions:**

---

### KPI-05: Access Reviews Completed

| Attribute                 | Value                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Definition**            | Percentage of scheduled access reviews completed on time. Inovy conducts quarterly access reviews of all user accounts, privileged access, and API key inventories |
| **Target**                | 100% of scheduled access reviews completed within the quarter                                                                                                      |
| **Measurement Source**    | Access review records; ISMS-09 evidence; Annex A.8.2                                                                                                               |
| **Measurement Frequency** | Quarterly                                                                                                                                                          |
| **Formula**               | (Access reviews completed on time / Total scheduled reviews) × 100                                                                                                 |

| Quarter | System / Scope              | Scheduled Date | Completed Date | Users Reviewed | Accounts Removed | Access Amended | Status |
| ------- | --------------------------- | -------------- | -------------- | -------------- | ---------------- | -------------- | ------ |
|         | Application user accounts   |                |                |                |                  |                |        |
|         | GitHub repository access    |                |                |                |                  |                |        |
|         | Privileged / admin accounts |                |                |                |                  |                |        |
|         | API keys and tokens         |                |                |                |                  |                |        |
|         | Supplier access             |                |                |                |                  |                |        |

**Notes / Actions:**

---

### KPI-06: Incident Mean Time to Respond (MTTR)

| Attribute                 | Value                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Definition**            | Average time from incident detection to initial response (acknowledgement and containment initiated) by severity level |
| **Target**                | P1: initial response within 1 hour; P2: within 4 hours; P3: within 24 hours; P4: within 5 business days                |
| **Measurement Source**    | TPL-05 Incident Reports (detection time vs. response time)                                                             |
| **Measurement Frequency** | Per incident; monthly summary                                                                                          |
| **Formula**               | Average (Response Time − Detection Time) per severity level                                                            |

| Severity          | Target MTTR       | Incidents (Period) | Average MTTR | Min MTTR | Max MTTR | SLA Compliance % | Status |
| ----------------- | ----------------- | ------------------ | ------------ | -------- | -------- | ---------------- | ------ |
| P1 – Critical     | < 1 hour          |                    |              |          |          |                  |        |
| P2 – High         | < 4 hours         |                    |              |          |          |                  |        |
| P3 – Medium       | < 24 hours        |                    |              |          |          |                  |        |
| P4 – Low          | < 5 business days |                    |              |          |          |                  |        |
| **All incidents** |                   |                    |              |          |          |                  |        |

**Notes / Actions:**

---

### KPI-07: Audit Log Integrity

| Attribute                 | Value                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Definition**            | Percentage of audit log checks confirming log completeness and integrity (no gaps, tampering, or unexpected deletions)       |
| **Target**                | 100% of monthly log integrity checks passed                                                                                  |
| **Measurement Source**    | Application security logs (Vercel); database audit logs (Neon); authentication logs (BetterAuth); log integrity verification |
| **Measurement Frequency** | Monthly                                                                                                                      |
| **Formula**               | (Log integrity checks passed / Total checks conducted) × 100                                                                 |

| Period         | Checks Conducted | Checks Passed | Gaps Detected | Tampering Suspected | Incidents Raised | KPI Value | Status |
| -------------- | ---------------- | ------------- | ------------- | ------------------- | ---------------- | --------- | ------ |
| Current month  |                  |               |               |                     |                  | %         |        |
| Previous month |                  |               |               |                     |                  | %         |        |
| 3 months ago   |                  |               |               |                     |                  | %         |        |

**Notes / Actions:**

---

### KPI-08: Backup Verification Success Rate

| Attribute                 | Value                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Definition**            | Percentage of monthly backup restoration tests that complete successfully, confirming data can be recovered from backups |
| **Target**                | 100% of monthly backup tests successful                                                                                  |
| **Measurement Source**    | Neon PostgreSQL backup restoration tests; Qdrant vector DB backup tests; source code backup verification                 |
| **Measurement Frequency** | Monthly                                                                                                                  |
| **Formula**               | (Successful restoration tests / Total restoration tests conducted) × 100                                                 |

| Period         | Backups Tested | Successful | Failed | Data Verified  | RTO Met?       | RPO Met?       | Status |
| -------------- | -------------- | ---------- | ------ | -------------- | -------------- | -------------- | ------ |
| Current month  |                |            |        | [ ] Yes [ ] No | [ ] Yes [ ] No | [ ] Yes [ ] No |        |
| Previous month |                |            |        |                |                |                |        |
| 3 months ago   |                |            |        |                |                |                |        |

**Backup Coverage:**

- [ ] Neon PostgreSQL — automated daily backup verified
- [ ] Qdrant Vector DB — snapshot verified
- [ ] Application configuration — environment variables and infrastructure-as-code backed up
- [ ] Source code — GitHub repository confirmed healthy

**Notes / Actions:**

---

### KPI-09: Security Headers Score

| Attribute                 | Value                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Definition**            | HTTP security headers grade for the Inovy web application (app.inovy.ai) as measured by securityheaders.com or equivalent                         |
| **Target**                | Grade A or A+ (all critical headers present and correctly configured)                                                                             |
| **Measurement Source**    | securityheaders.com scan; manual verification                                                                                                     |
| **Measurement Frequency** | Monthly (or after any deployment affecting HTTP headers)                                                                                          |
| **Headers Checked**       | Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Cross-Origin-\* |

| Period         | Scan Date | Grade | Missing Headers | Issues Found | Status |
| -------------- | --------- | ----- | --------------- | ------------ | ------ |
| Current month  |           |       |                 |              |        |
| Previous month |           |       |                 |              |        |
| 3 months ago   |           |       |                 |              |        |

**Known issues / accepted deviations:**

**Notes / Actions:**

---

### KPI-10: Dependency Freshness / Known CVE Exposure

| Attribute                 | Value                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Definition**            | Number of known critical CVEs in Inovy's production dependencies (npm packages, Docker images) that are older than 7 days without a remediation plan |
| **Target**                | Zero critical CVEs (CVSS ≥ 9.0) older than 7 days without an active remediation plan                                                                 |
| **Measurement Source**    | `npm audit`; Dependabot alerts; Snyk dashboard; GitHub Security Advisories; `pnpm audit`                                                             |
| **Measurement Frequency** | Weekly scan; monthly reporting                                                                                                                       |
| **Formula**               | Count of critical CVEs present > 7 days with no remediation plan                                                                                     |

| Period         | Total CVEs (Critical) | CVEs > 7 days | CVEs with Active Plan | Target Met?    | Status |
| -------------- | --------------------- | ------------- | --------------------- | -------------- | ------ |
| Current month  |                       |               |                       | [ ] Yes [ ] No |        |
| Previous month |                       |               |                       |                |        |
| 3 months ago   |                       |               |                       |                |        |

**Outstanding CVEs requiring action:**

| CVE ID | Severity | Package | Introduced | Remediation Plan | Target Date | Owner |
| ------ | -------- | ------- | ---------- | ---------------- | ----------- | ----- |
|        |          |         |            |                  |             |       |

**Notes / Actions:**

---

## Trend Summary (Quarter View)

| KPI                              | Q1 Value | Q2 Value | Q3 Value | Q4 Value | Annual Trend |
| -------------------------------- | -------- | -------- | -------- | -------- | ------------ |
| KPI-01 Vulnerability remediation |          |          |          |          |              |
| KPI-02 MFA enrolment             |          |          |          |          |              |
| KPI-03 Training completion       |          |          |          |          |              |
| KPI-04 Failed login anomalies    |          |          |          |          |              |
| KPI-05 Access reviews            |          |          |          |          |              |
| KPI-06 Incident MTTR (P1/P2)     |          |          |          |          |              |
| KPI-07 Audit log integrity       |          |          |          |          |              |
| KPI-08 Backup verification       |          |          |          |          |              |
| KPI-09 Security headers grade    |          |          |          |          |              |
| KPI-10 Dependency CVE exposure   |          |          |          |          |              |

---

## Management Review Summary

_Pre-populated summary for inclusion in TPL-03 management review minutes._

**Overall ISMS security posture this period:** [ ] Green (≥ 8 KPIs Green) [ ] Amber (5–7 KPIs Green) [ ] Red (< 5 KPIs Green)

**KPIs off-target this period:**

**Actions required:**

**Approved for management review by ISMS Manager:** ******\_\_\_****** Date: ******\_\_\_******
