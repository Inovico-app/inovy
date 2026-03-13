# Management Review Template

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Document ID         | ISMS-13                      |
| Version             | 1.0                          |
| Classification      | Internal                     |
| Owner               | Information Security Manager |
| Approved by         | CEO/CTO                      |
| Effective date      | 2026-03-13                   |
| Review date         | 2027-03-13                   |
| ISO 27001 Reference | Clause 9.3                   |

---

## 1. Purpose

This document defines the structure, mandatory inputs, required outputs, and frequency for Inovy's ISMS management review. It fulfils ISO 27001:2022 Clause 9.3 requirements and provides a reusable template that the ISM completes for each management review session. Completed management review records are stored as `MGR-YYYY-XX` per ISMS-07.

---

## 2. Frequency

| Year                       | Schedule                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Year 1 (2026)**          | Quarterly — Q2 (June), Q3 (September), Q4 (December); initial review may be combined with ISMS launch               |
| **Year 2+ (2027 onwards)** | Biannual minimum — H1 (June) and H2 (December); additional reviews triggered by material incidents or scope changes |

Quarterly frequency in Year 1 reflects the rapid ISMS build-out phase and the proximity of the Stage 2 certification audit. The ISM may schedule additional extraordinary reviews at any time in response to significant security events.

---

## 3. Management Review Record Template

---

### MANAGEMENT REVIEW RECORD

**Record ID:** MGR-\_\_\_\_-\_\_  
**Review date:** \_\_\_\_\_\_\_\_\_\_  
**Location / Format:** Remote (video call) / In person at \_\_\_\_\_  
**Chaired by:** CEO / CTO (name): \_\_\_\_\_\_\_\_\_\_  
**Prepared by:** Information Security Manager (name): \_\_\_\_\_\_\_\_\_\_

**Attendees:**

| Name | Role                         | Present (Y/N) |
| ---- | ---------------------------- | ------------- |
|      | CEO                          |               |
|      | CTO                          |               |
|      | Information Security Manager |               |
|      | Engineering Lead             |               |
|      | Other (specify):             |               |

---

### Section A: Status of Actions from Previous Management Review (Clause 9.3.2a)

_List all actions from the previous management review record. For each action, record the current status and any update._

| Action Ref           | Action Description | Owner | Due Date | Status                  | Notes |
| -------------------- | ------------------ | ----- | -------- | ----------------------- | ----- |
| MGR-PREV-01          |                    |       |          | Open / Closed / Overdue |       |
| MGR-PREV-02          |                    |       |          |                         |       |
| _Add rows as needed_ |                    |       |          |                         |       |

**Summary:** Total open actions: \_\_\_ | Total closed since last review: \_\_\_ | Overdue: \_\_\_

---

### Section B: Changes in External and Internal Context (Clause 9.3.2b)

_Review any changes in the internal or external context of Inovy that may affect the ISMS. Consider: organizational changes, new products or features, changes to the technology stack, new or departed team members, regulatory changes, changes to the threat landscape, changes in the competitive or supplier landscape._

| Area                     | Change Description | Impact on ISMS | Action Required |
| ------------------------ | ------------------ | -------------- | --------------- |
| Organizational           |                    |                |                 |
| Technology               |                    |                |                 |
| Regulatory / Legal       |                    |                |                 |
| Threat landscape         |                    |                |                 |
| Supplier / Sub-processor |                    |                |                 |
| Other                    |                    |                |                 |

**Conclusion:** Does any change require an update to ISMS scope (ISMS-03), risk register (ISMS-09), or policy? \_\_Yes / No\_\_

If yes, describe required updates: \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### Section C: Information Security Performance (Clause 9.3.2c)

#### C1: KPI Review (ISMS-11)

_Summarize KPI performance for the review period. ISM to complete before the meeting._

| KPI                                  | Target                  | Actual (Period Avg) | Trend     | Assessment                    |
| ------------------------------------ | ----------------------- | ------------------- | --------- | ----------------------------- |
| KPI-1: Critical vuln MTTR            | ≤ 72 hrs                |                     | ↑ / → / ↓ | On track / At risk / Breached |
| KPI-2: High vuln MTTR                | ≤ 7 days                |                     |           |                               |
| KPI-3: MFA enrollment rate           | 100%                    |                     |           |                               |
| KPI-4: MTTD (incidents)              | ≤ 4 hrs                 |                     |           |                               |
| KPI-5: Training completion           | 100%                    |                     |           |                               |
| KPI-6: Access review on-time         | 100%                    |                     |           |                               |
| KPI-7: PII breach count              | 0                       |                     |           |                               |
| KPI-8: Policy review currency        | 100%                    |                     |           |                               |
| KPI-9: Open risk treatment (overdue) | 0 overdue High/Critical |                     |           |                               |
| KPI-10: CAR closure rate             | ≥ 90% on time           |                     |           |                               |

**KPI summary narrative:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

#### C2: Security Objectives Progress (ISMS-06)

| Objective                         | Target     | Progress | Status                        |
| --------------------------------- | ---------- | -------- | ----------------------------- |
| OBJ-01: Critical vuln MTTR        | Continuous |          | On track / Delayed / Complete |
| OBJ-02: 100% MFA enrollment       | 2026-04-13 |          |                               |
| OBJ-03: MTTD ≤ 4hr                | 2026-06-30 |          |                               |
| OBJ-04: 100% training             | 2026-12-31 |          |                               |
| OBJ-05: Quarterly access reviews  | Quarterly  |          |                               |
| OBJ-06: Zero PII breaches         | Continuous |          |                               |
| OBJ-07: Zero Major NCs at Stage 2 | Q4 2026    |          |                               |

**Objectives narrative:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### Section D: Monitoring and Audit Results (Clause 9.3.2d)

#### D1: Internal Audit Findings

_Summarize findings from internal audits conducted since the previous management review._

| Audit Reference | Audit Date | Scope | Major NCs | Minor NCs | Observations | Status of CARs |
| --------------- | ---------- | ----- | --------- | --------- | ------------ | -------------- |
|                 |            |       |           |           |              |                |

**Audit narrative:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

#### D2: Monitoring Results

_Summarize outputs from continuous monitoring activities (Azure Monitor, audit log reviews, Dependabot, access reviews)._

Notable monitoring findings in the period:

- \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_
- \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### Section E: Incident and Non-Conformity Review (Clause 9.3.2e)

_Review all security incidents, near-misses, and non-conformities from the review period._

| Incident / NC Reference | Date | Description | Severity | Root Cause | CAR Raised | Status |
| ----------------------- | ---- | ----------- | -------- | ---------- | ---------- | ------ |
|                         |      |             |          |            |            |        |

**Total incidents in period:** \_\_\_ | **Total NCs:** \_\_\_ | **GDPR breach notifications to AP:** \_\_\_

---

### Section F: Risk Register Status (Clause 9.3.2c, 9.3.2e)

_Review risk register (ISMS-09) for material changes since last review._

**Risks with status change since last review:**

| Risk ID | Previous Score | Current Score | Change | Reason |
| ------- | -------------- | ------------- | ------ | ------ |
|         |                |               |        |        |

**New risks identified since last review:**

| Risk ID | Description | Score | Treatment |
| ------- | ----------- | ----- | --------- |
|         |             |       |           |

**Risk treatment plan adherence:** Percentage of actions on schedule: \_\_\_% | Overdue Critical/High actions: \_\_\_

---

### Section G: Supplier and External Context (Clause 9.3.2b, 9.3.2c)

_Review sub-processor security assessments and any supplier-related security events._

**Supplier assessments completed since last review:**

| Supplier | Assessment Date | Outcome | Actions Required |
| -------- | --------------- | ------- | ---------------- |
|          |                 |         |                  |

**Sub-processor security events (breaches, advisories notified to Inovy):**

\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

### Section H: Feedback and Continual Improvement Opportunities (Clause 9.3.2f)

_Record any feedback from customers, certification body, staff, or other interested parties on ISMS performance. Document opportunities for improvement identified._

| Source             | Feedback / OFI | Proposed Response |
| ------------------ | -------------- | ----------------- |
| Customers          |                |                   |
| Engineering team   |                |                   |
| Internal audit     |                |                   |
| Certification body |                |                   |
| Staff suggestion   |                |                   |

---

### Section I: Required Outputs — Decisions and Actions (Clause 9.3.3)

_The management review must produce documented decisions on the following required outputs:_

#### I1: Opportunities for Improvement

_List improvement opportunities identified during this review and the decision made:_

| Opportunity | Decision | Owner | Target Date |
| ----------- | -------- | ----- | ----------- |
|             |          |       |             |

#### I2: Any Changes Needed to the ISMS

_Document any decisions to change the ISMS (scope, policies, controls, objectives):_

| Change | Justification | Owner | Target Date | Document(s) to Update |
| ------ | ------------- | ----- | ----------- | --------------------- |
|        |               |       |             |                       |

#### I3: Resource Needs

_Document any resource decisions made during the review:_

| Resource Required | Justification | Decision | Budget / FTE Allocation | Owner |
| ----------------- | ------------- | -------- | ----------------------- | ----- |
|                   |               |          |                         |       |

---

### Section J: Action Log — This Review

_All actions arising from this management review:_

| Action Ref           | Action Description | Owner | Due Date |
| -------------------- | ------------------ | ----- | -------- |
| MGR-YYYY-XX-01       |                    |       |          |
| MGR-YYYY-XX-02       |                    |       |          |
| _Add rows as needed_ |                    |       |          |

---

### Section K: Review Sign-Off

**Review conclusion:**

> _The management review has been conducted in accordance with ISO 27001:2022 Clause 9.3. The ISMS is considered [fit for purpose / requiring improvement in the following areas: \_\_\_\_]. The decisions and actions recorded in Section I and Section J are approved._

**Signed:**

| Role                         | Name | Signature | Date |
| ---------------------------- | ---- | --------- | ---- |
| CEO / CTO (Chair)            |      |           |      |
| Information Security Manager |      |           |      |

**Next management review scheduled:** \_\_\_\_\_\_\_\_\_\_

---

## 4. Record Storage

Completed management review records are stored as `MGR-YYYY-XX` in `docs/iso27001/records/management-reviews/` per ISMS-07. Classification: **Internal**. Retention: 5 years.

The ISM circulates the draft record within 5 business days of the review meeting. Final signed record is stored within 10 business days.

---

## 5. Document Control

This template is reviewed annually by the ISM and updated to reflect changes in ISO 27001 requirements or ISMS structure. Updates follow ISMS-07.

**Next review:** 2027-03-13
