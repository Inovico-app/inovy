# TPL-07: Change Request Form

| Document ID       | TPL-07                                                      |
| ----------------- | ----------------------------------------------------------- |
| Version           | 1.0                                                         |
| Last Updated      | 2026-03-13                                                  |
| Owner             | Engineering Lead / ISMS Manager                             |
| Related Documents | Change Management Policy, ISMS-09 Risk Register, SoA A.8.32 |
| Retention         | 2 years minimum                                             |
| Review Cycle      | Completed per change; procedure reviewed annually           |

---

## Instructions

Raise a Change Request Form for all changes to Inovy's production environment, including application deployments, infrastructure changes, configuration changes, database migrations, third-party integrations, and security control modifications.

Assign a sequential ID using **CHG-YYYY-NNN** (e.g., CHG-2026-001). Emergency changes may proceed with retrospective documentation within 24 hours of implementation.

---

## Change Categories

| Category      | Description                                                                                                                                  | Approval Required                        | Lead Time        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------- |
| **Standard**  | Pre-approved, low-risk, routine change with documented procedure (e.g., dependency update with no breaking changes, minor config tweak)      | ISMS Manager or Engineering Lead         | As needed        |
| **Normal**    | Planned change requiring review and approval before implementation (e.g., new feature deployment, infrastructure change, database migration) | Engineering Lead + ISMS Manager          | Minimum 48 hours |
| **Emergency** | Urgent change required to restore service or address a critical security vulnerability; retrospective documentation within 24 hours          | CEO or Engineering Lead (verbal / async) | Immediate        |

---

## Section 1: Change Identification

| Field                                 | Value                                              |
| ------------------------------------- | -------------------------------------------------- |
| **Change ID**                         | CHG-YYYY-NNN                                       |
| **Date Submitted**                    |                                                    |
| **Requester**                         | Name, role                                         |
| **Engineering Lead**                  |                                                    |
| **Change Category**                   | [ ] Standard [ ] Normal [ ] Emergency              |
| **Priority**                          | [ ] Critical [ ] High [ ] Medium [ ] Low           |
| **Planned Implementation Date**       |                                                    |
| **Planned Implementation Time (UTC)** |                                                    |
| **Estimated Duration**                |                                                    |
| **Affected Environment**              | [ ] Production [ ] Staging [ ] Development [ ] All |

---

## Section 2: Change Description

**Title / Summary** _(one line):_

**Detailed Description:**
_What is being changed? Be specific — include component names, version numbers, configuration values, database tables, etc._

**Reason / Justification:**
_Why is this change necessary? Reference any ticket, incident, or business requirement._

**Expected Benefits:**

**Linked Ticket / Issue Reference:** _(GitHub issue, JIRA, Linear, etc.)_

---

## Section 3: Systems Affected

| System / Component               | Affected       | Nature of Change |
| -------------------------------- | -------------- | ---------------- |
| Next.js Web Application (Vercel) | [ ] Yes [ ] No |                  |
| Neon PostgreSQL Database         | [ ] Yes [ ] No |                  |
| Database Migrations              | [ ] Yes [ ] No | Migration file:  |
| Qdrant Vector Database           | [ ] Yes [ ] No |                  |
| BetterAuth Configuration         | [ ] Yes [ ] No |                  |
| AI Pipeline (Deepgram / OpenAI)  | [ ] Yes [ ] No |                  |
| Environment Variables / Secrets  | [ ] Yes [ ] No |                  |
| GitHub Actions / CI/CD Pipeline  | [ ] Yes [ ] No |                  |
| DNS / Cloudflare Configuration   | [ ] Yes [ ] No |                  |
| Third-Party Integrations         | [ ] Yes [ ] No |                  |
| MCP Server Package               | [ ] Yes [ ] No |                  |
| Security Controls / Policies     | [ ] Yes [ ] No |                  |
| ISMS Documents                   | [ ] Yes [ ] No |                  |
| Other:                           | [ ] Yes [ ] No |                  |

---

## Section 4: Security Impact Assessment

_Assess the security implications of this change. Answer all questions — "N/A" is acceptable if genuinely not applicable._

| Security Consideration                                                                      | Assessment                        |
| ------------------------------------------------------------------------------------------- | --------------------------------- |
| Does this change affect authentication or authorisation?                                    | [ ] Yes [ ] No [ ] N/A — details: |
| Does this change expose new data to users or external systems?                              | [ ] Yes [ ] No [ ] N/A — details: |
| Does this change modify how personal data (meeting data, user data) is processed or stored? | [ ] Yes [ ] No [ ] N/A — details: |
| Does this change affect encryption (at rest or in transit)?                                 | [ ] Yes [ ] No [ ] N/A — details: |
| Does this change introduce new third-party code, libraries, or services?                    | [ ] Yes [ ] No [ ] N/A — details: |
| Does this change modify security logging or monitoring?                                     | [ ] Yes [ ] No [ ] N/A — details: |
| Does this change affect API keys, secrets, or credentials?                                  | [ ] Yes [ ] No [ ] N/A — details: |
| Does this change affect GDPR / AVG compliance posture?                                      | [ ] Yes [ ] No [ ] N/A — details: |
| Does this change affect backup or recovery capabilities?                                    | [ ] Yes [ ] No [ ] N/A — details: |
| Does this change affect network security or firewall rules?                                 | [ ] Yes [ ] No [ ] N/A — details: |

**Overall Security Impact:** [ ] None [ ] Low [ ] Medium [ ] High — ISMS Manager review required

**Security Impact Summary:**

---

## Section 5: Risk Assessment

| Risk                                          | Likelihood (1–3) | Impact (1–3) | Risk Score | Mitigation |
| --------------------------------------------- | ---------------- | ------------ | ---------- | ---------- |
| Change causes production outage               |                  |              |            |            |
| Change introduces security vulnerability      |                  |              |            |            |
| Change causes data loss or corruption         |                  |              |            |            |
| Change breaks authentication / access control |                  |              |            |            |
| Change cannot be rolled back                  |                  |              |            |            |
| Change violates GDPR / AVG requirements       |                  |              |            |            |

_Scoring: 1=Low, 2=Medium, 3=High. Risk Score = Likelihood × Impact._

**Residual Risk Level:** [ ] Low (1–3) [ ] Medium (4–6) [ ] High (7–9)

**Risk Acceptance:** [ ] Accepted by Engineering Lead [ ] Accepted by ISMS Manager [ ] Risk too high — change rejected

---

## Section 6: Rollback Plan

**Rollback Procedure:**
_Describe step-by-step how to reverse this change if it fails or causes issues. This must be completed before implementation._

**Rollback Triggers** _(conditions that require rollback):_

**Rollback Time Estimate:**

**Rollback Tested?** [ ] Yes — Date: ******\_\_\_****** [ ] No — rationale:

**Data Backup Before Change:** [ ] Completed — Date/Time: ******\_\_\_****** [ ] Not required — rationale:

---

## Section 7: Testing Evidence

**Testing Completed:**

| Test Type                  | Completed?             | Environment | Date | Result            | Evidence Reference |
| -------------------------- | ---------------------- | ----------- | ---- | ----------------- | ------------------ |
| Unit / integration tests   | [ ] Yes [ ] No [ ] N/A |             |      | [ ] Pass [ ] Fail |                    |
| End-to-end tests           | [ ] Yes [ ] No [ ] N/A |             |      | [ ] Pass [ ] Fail |                    |
| Staging environment test   | [ ] Yes [ ] No [ ] N/A |             |      | [ ] Pass [ ] Fail |                    |
| Security / dependency scan | [ ] Yes [ ] No [ ] N/A |             |      | [ ] Pass [ ] Fail |                    |
| Performance test           | [ ] Yes [ ] No [ ] N/A |             |      | [ ] Pass [ ] Fail |                    |
| Accessibility check        | [ ] Yes [ ] No [ ] N/A |             |      | [ ] Pass [ ] Fail |                    |
| Database migration dry-run | [ ] Yes [ ] No [ ] N/A |             |      | [ ] Pass [ ] Fail |                    |

**CI/CD Pipeline Status:** [ ] All checks passing [ ] Checks failing — see notes [ ] Pipeline not applicable

**Pull Request / Deployment Reference:**

---

## Section 8: Approval

| Approver | Role                 | Decision                         | Signature | Date |
| -------- | -------------------- | -------------------------------- | --------- | ---- |
|          | Engineering Lead     | [ ] Approve [ ] Reject [ ] Defer |           |      |
|          | ISMS Manager         | [ ] Approve [ ] Reject [ ] Defer |           |      |
|          | CEO (Emergency only) | [ ] Approve [ ] Reject           |           |      |

**Approval Notes:**

---

## Section 9: Implementation Record

| Field                                | Value                                                                                  |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| **Implemented By**                   |                                                                                        |
| **Actual Implementation Date**       |                                                                                        |
| **Actual Implementation Time (UTC)** |                                                                                        |
| **Implementation Outcome**           | [ ] Successful [ ] Partially successful [ ] Failed — rollback executed [ ] Rolled back |
| **Issues Encountered**               |                                                                                        |
| **Deployment / Commit Reference**    |                                                                                        |

---

## Section 10: Post-Implementation Review

| Field                                         | Value                                                  |
| --------------------------------------------- | ------------------------------------------------------ |
| **Post-Implementation Review Date**           |                                                        |
| **Review Conducted By**                       |                                                        |
| **Service / Functionality Confirmed Working** | [ ] Yes [ ] No — issues:                               |
| **Security Controls Verified**                | [ ] Yes [ ] No [ ] N/A                                 |
| **Monitoring Confirmed Normal**               | [ ] Yes [ ] No — alerts raised:                        |
| **KPIs / Metrics Affected**                   |                                                        |
| **Change Closure**                            | [ ] Closed successfully [ ] CAR raised: CHG reference: |

**Review Notes:**

---

## Change Log (Summary Index)

| CHG ID       | Date | Category | Description Summary | Requester | Status | Outcome |
| ------------ | ---- | -------- | ------------------- | --------- | ------ | ------- |
| CHG-2026-001 |      |          |                     |           |        |         |
| CHG-2026-002 |      |          |                     |           |        |         |
