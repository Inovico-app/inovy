# Corrective Action Procedure

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Document ID         | ISMS-14                      |
| Version             | 1.0                          |
| Classification      | Internal                     |
| Owner               | Information Security Manager |
| Approved by         | CEO/CTO                      |
| Effective date      | 2026-03-13                   |
| Review date         | 2027-03-13                   |
| ISO 27001 Reference | Clause 10.1                  |

---

## 1. Purpose

This Corrective Action Procedure defines how Inovy identifies, analyses, corrects, and prevents the recurrence of nonconformities within the Information Security Management System (ISMS). It fulfils the requirements of ISO 27001 Clause 10.1 (Nonconformity and corrective action) and Clause 10.2 (Continual improvement).

A nonconformity is any failure to meet a requirement of ISO/IEC 27001:2022 or Inovy's own ISMS policies and procedures. Corrective action addresses the root cause of a nonconformity to prevent recurrence — it is distinct from immediate containment (which addresses consequences) and correction (which fixes the immediate issue).

This procedure applies to all nonconformities identified through:

- Internal audits (ISMS-12)
- Management reviews (ISMS-13)
- Security incident investigations (TPL-05)
- Monitoring and measurement findings (ISMS-11)
- External audit or certification body findings
- Staff-reported observations
- Supplier assessments

---

## 2. Corrective Action Process Flowchart

```
┌─────────────────────────────────────────────────────────────────┐
│                  NONCONFORMITY IDENTIFIED                        │
│  (audit / incident / monitoring / management review / staff)    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: LOG THE NONCONFORMITY                                  │
│  - ISM logs in CAR Register (Section 9)                         │
│  - Assign unique CAR reference (CAR-YYYY-NNN)                   │
│  - Categorise: Major NC / Minor NC                              │
│  - Notify affected control owner within 24 hours                │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: REACT — CONTAIN AND MITIGATE                           │
│  - Implement immediate containment actions                      │
│  - Mitigate consequences to prevent further harm                │
│  - Document containment actions in CAR (TPL-04)                 │
│  - Major NC: containment within 24 hours                        │
│  - Minor NC: containment within 72 hours                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: ROOT CAUSE ANALYSIS                                    │
│  - Apply 5-Whys or fishbone diagram                             │
│  - Identify systemic root cause (not just symptom)              │
│  - Document RCA in CAR (TPL-04)                                 │
│  - Major NC: RCA complete within 7 days                         │
│  - Minor NC: RCA complete within 14 days                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: DETERMINE CORRECTIVE ACTION                            │
│  - Design action that addresses the root cause                  │
│  - Assign owner and set deadline                                │
│  - Assess if risk register needs updating (ISMS-09)             │
│  - ISM approves proposed corrective action                      │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: IMPLEMENT                                              │
│  - Owner implements the corrective action                       │
│  - Evidence of implementation documented in CAR                 │
│  - Major NC: implemented within 30 days                         │
│  - Minor NC: implemented within 60 days                         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: REVIEW EFFECTIVENESS                                   │
│  - ISM verifies the fix worked (re-test, re-audit, evidence)    │
│  - Was root cause eliminated? Did recurrence occur?             │
│  - Ineffective? → Return to Step 3 (revised RCA)               │
│  - Effective? → Proceed to Step 7                               │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: UPDATE RISK REGISTER AND CLOSE                         │
│  - If NC reveals new risk: update ISMS-09                       │
│  - Close CAR in register, document closure evidence             │
│  - Lessons learned shared with team if applicable               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Procedure

### Step 1: Identify and Log the Nonconformity

**Trigger:** A nonconformity is identified from any source listed in Section 1.

**Action:**

1. The person identifying the nonconformity notifies the Information Security Manager immediately (or no later than the end of the next business day for Minor NCs).
2. The ISM logs the nonconformity in the CAR Register (Section 9) and creates a Corrective Action Request using the CAR template (TPL-04).
3. Assign a unique CAR reference: `CAR-[YEAR]-[sequential number]`. Example: `CAR-2026-007`.
4. Categorise the nonconformity:
   - **Major Nonconformity:** Complete failure of a required control; systematic failure; creates direct risk of data breach or certification non-compliance. Example: No MFA enforced on any account despite documented policy requirement.
   - **Minor Nonconformity:** Isolated or partial failure; isolated instance of non-compliance; does not represent a systemic failure. Example: One access review overdue by 2 weeks; no evidence of security training completion for one staff member.
5. The ISM notifies the affected control owner and any relevant stakeholders within 24 hours of logging.

**Inovy-specific examples of nonconformity sources:**

| Source                     | Example nonconformity                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| Internal audit finding     | Dependabot alerts older than 72 hours not remediated; no documented procedure for secret rotation   |
| Monitoring alert (ISMS-11) | MFA enrollment rate drops below 100% — contractor account discovered without MFA                    |
| Security incident (TPL-05) | Incident investigation reveals production Deepgram API key was in a public GitHub commit for 3 days |
| Management review          | Access reviews were not completed for Q1 despite documented quarterly requirement                   |
| Certification body Stage 1 | CB identified missing documented procedure for backup restoration testing                           |
| Staff report               | Developer reports they have never received security awareness training and were never asked to      |

---

### Step 2: React — Contain and Mitigate

**Purpose:** Prevent the nonconformity from causing further harm while root cause analysis is conducted.

**Containment is not the corrective action.** Containment fixes the immediate symptom; corrective action eliminates the root cause.

| Category | Containment timeline | Escalation if timeline missed       |
| -------- | -------------------- | ----------------------------------- |
| Major NC | Within 24 hours      | Escalate to CTO and CEO immediately |
| Minor NC | Within 72 hours      | Escalate to CTO                     |

**Containment examples for Inovy:**

| Nonconformity                                     | Immediate containment action                                                                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Exposed Deepgram API key in GitHub                | Revoke the exposed key immediately; generate new key; rotate in Vercel environment variables; audit all calls made with the exposed key via Deepgram dashboard |
| MFA not enabled for a contractor account          | Suspend account access until MFA is configured; notify contractor; do not restore access until MFA confirmed                                                   |
| Dependabot critical alert not actioned for 5 days | Assess exploitability; if exploitable in production, deploy hotfix immediately; block production deploy of affected package version                            |
| Backup verification failed (backup unrestorable)  | Identify cause; re-run backup; verify restoration from a known-good backup; escalate to Engineering Lead                                                       |
| Access review overdue                             | Conduct emergency access review immediately; revoke any stale access found                                                                                     |

**Documentation:** All containment actions must be documented in the CAR (TPL-04), including: date/time, action taken, by whom, and evidence of completion.

---

### Step 3: Root Cause Analysis

**Purpose:** Determine why the nonconformity occurred so that corrective action can address the systemic cause.

The ISM selects and applies the most appropriate RCA technique:

#### 3a. 5-Whys Method

Suitable for: Most minor NCs; process failures; human error situations.

**Example application:**

| Why                                                    | Answer                                                                                                         |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Why did the Dependabot alert go unactioned for 5 days? | The Engineering Lead was on leave and no one else was assigned to review Dependabot alerts                     |
| Why was no one else assigned?                          | The alert monitoring procedure assumes the Engineering Lead is always available; no backup is defined          |
| Why is there no backup assignment?                     | The monitoring procedure (ISMS-11) was written with a single responsible role and no cover arrangement         |
| Why wasn't a cover arrangement included?               | The procedure was drafted without considering leave or absence scenarios                                       |
| Why wasn't that identified in review?                  | The procedure review was done solely by the Engineering Lead who didn't consider their own absence             |
| **Root cause**                                         | **Single-point-of-failure in alert monitoring assignment; no documented cover arrangement for key ISMS roles** |

#### 3b. Fishbone (Ishikawa) Diagram

Suitable for: Major NCs; complex failures with multiple contributing factors; systemic failures.

Categories to examine: People, Process, Technology, Environment, Measurement, Management.

**Example: No MFA enforcement for contractor account**

- **People:** Onboarding checklist (TPL-06) not followed; contractor self-provisioned account without ISM oversight
- **Process:** Contractor onboarding process not documented; ISM not notified of new contractor
- **Technology:** Better Auth does not enforce MFA at tenant level (only recommended); no automated check for accounts without MFA
- **Management:** No owner assigned for contractor access lifecycle management
- **Root cause:** Contractor onboarding process is undocumented and untested; Better Auth MFA enforcement is advisory not mandatory

**RCA timelines:**

| Category | RCA completion deadline                      |
| -------- | -------------------------------------------- |
| Major NC | Within 7 business days of NC identification  |
| Minor NC | Within 14 business days of NC identification |

RCA findings must be documented in the CAR (TPL-04).

---

### Step 4: Determine Corrective Action

**Purpose:** Design an action that addresses the identified root cause, not just the symptom.

**Criteria for a good corrective action:**

- Directly addresses the identified root cause
- Is specific, measurable, and time-bound
- Has a single named owner
- Is proportionate to the severity and likelihood of recurrence
- Does not create new risks

**Corrective action examples (continuing from RCA examples above):**

| Root cause                                     | Corrective action                                                                                                                                            | Owner            | Deadline |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | -------- |
| No cover arrangement for Dependabot monitoring | Update ISMS-11 and internal runbook to designate a named backup reviewer for all monitoring roles; add to onboarding checklist                               | ISM              | 14 days  |
| Contractor onboarding process undocumented     | Create documented contractor onboarding procedure referencing TPL-06; add ISM approval step before contractor account creation                               | ISM              | 21 days  |
| Better Auth MFA not enforced at tenant level   | Implement Better Auth MFA enforcement policy in code: require MFA before any authenticated API call; add automated monitoring alert for accounts without MFA | Engineering Lead | 14 days  |

**ISM approval:** The ISM must review and approve all proposed corrective actions before implementation begins. For Major NCs, CTO approval is also required.

**Risk register check:** After determining the corrective action, the ISM assesses whether the nonconformity reveals a previously unidentified risk or changes the score of an existing risk in ISMS-09. If so, update the risk register before Step 5.

---

### Step 5: Implement

**Action:** The assigned owner implements the approved corrective action within the agreed deadline.

**Implementation timelines:**

| Category                                  | Implementation deadline                         |
| ----------------------------------------- | ----------------------------------------------- |
| Major NC                                  | Within 30 days of NC identification             |
| Minor NC                                  | Within 60 days of NC identification             |
| Extended deadline (with ISM/CTO approval) | Document justification in CAR; maximum +30 days |

**For code-level corrective actions on the Inovy platform:**

- Implement fix on a feature branch
- Code review by a second engineer
- Merge via pull request — PR description must reference the CAR number (e.g., `Fixes CAR-2026-007`)
- Deployment to production via Vercel CI/CD pipeline
- Screenshot or log evidence of deployment must be attached to the CAR

**For policy/procedure corrective actions:**

- Draft the new or updated document
- Review by ISM and relevant stakeholder
- Approve via management review or ad-hoc sign-off (document in CAR)
- Publish in ISMS Google Drive per ISMS-07

**Evidence of implementation must be documented in TPL-04**, including: date completed, by whom, and a reference to the specific evidence (PR link, document version, screenshot).

---

### Step 6: Review Effectiveness

**Purpose:** Verify that the implemented corrective action eliminated the root cause and prevented recurrence.

**Effectiveness review timeline:** Minimum 30 days after implementation (allow sufficient time for the fix to be tested in practice). For Major NCs: effectiveness review is conducted within 60 days of implementation.

**Effectiveness review methods:**

| Control type                                    | Effectiveness review method                                                                                |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Code-level fix (e.g., MFA enforcement)          | Re-run the specific test or audit procedure; check Better Auth logs confirm MFA required for new accounts  |
| Process fix (e.g., access review procedure)     | Review next scheduled access review; confirm it was completed on time with evidence                        |
| Training fix (e.g., security awareness)         | Check training completion records; confirm all affected staff have completed updated training              |
| Configuration fix (e.g., secret rotation)       | Review Vercel environment variable logs; confirm new key is active; confirm old key is revoked in Deepgram |
| Monitoring fix (e.g., backup cover arrangement) | Review next monitoring report; confirm backup reviewer completed review during Engineering Lead absence    |

**If the corrective action is ineffective:**

- Return to Step 3 (Root Cause Analysis) with new information
- Revise the RCA and design a new corrective action
- Document the failed attempt in the CAR and reset the implementation deadline

**If the corrective action is effective:**

- Document effectiveness evidence in TPL-04
- Proceed to Step 7

---

### Step 7: Update Risk Register and Close

**Risk register update (ISMS-09):**

If the nonconformity reveals a risk that was not previously identified or scored, the ISM updates the risk register before closing the CAR:

- Add the new risk to ISMS-09 with the corrective action noted as the implemented treatment
- Re-score existing risks if the NC changes the likelihood or impact assessment
- Record the update in the risk register's change history

**CAR closure:**

1. The ISM updates the CAR status to "Closed" in the CAR Register (Section 9)
2. Record the closure date and link to effectiveness evidence
3. File the completed CAR (TPL-04) in the ISMS Google Drive (ISMS/Corrective Actions/)
4. Update the CAR Register summary statistics

**Lessons learned:** For Major NCs and for any NC arising from a recurring issue, the ISM prepares a brief lessons-learned note (1–2 paragraphs). This is shared with the full team in the next team meeting and filed with the closed CAR.

---

## 4. CAR Reference Format

All Corrective Action Requests use the following reference format:

**`CAR-[YYYY]-[NNN]`**

- `YYYY` = 4-digit year in which the CAR was raised
- `NNN` = 3-digit sequential number, starting at 001 each calendar year

Examples: `CAR-2026-001`, `CAR-2026-002`, `CAR-2026-015`

---

## 5. Timelines Summary

| Step                                      | Major NC                          | Minor NC                          |
| ----------------------------------------- | --------------------------------- | --------------------------------- |
| Log and notify                            | Within 24 hours                   | Within 1 business day             |
| Containment                               | Within 24 hours                   | Within 72 hours                   |
| Root cause analysis                       | Within 7 days                     | Within 14 days                    |
| Corrective action determined and approved | Within 10 days                    | Within 21 days                    |
| Implementation complete                   | Within 30 days                    | Within 60 days                    |
| Effectiveness review                      | Within 60 days of implementation  | Within 90 days of implementation  |
| CAR closure                               | After effective; no hard deadline | After effective; no hard deadline |

Deadlines may be extended with documented ISM/CTO approval and justification recorded in the CAR. Extensions must not be used routinely; repeated extensions indicate a systemic resource or prioritisation problem and must be escalated to the management review.

---

## 6. Roles and Responsibilities

| Role                             | Responsibilities                                                                                                                                                                                                                                    |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Information Security Manager** | Owns the corrective action procedure; logs all CARs; assigns control owners; approves corrective action plans; reviews effectiveness; maintains the CAR Register; reports open CARs to management reviews; closes CARs after effective verification |
| **CTO**                          | Co-approves corrective actions for Major NCs; allocates engineering resource for technical corrective actions; receives escalation for overdue Major NCs                                                                                            |
| **CEO**                          | Receives escalation for Major NCs not contained within 24 hours; approves significant budget for corrective actions                                                                                                                                 |
| **Engineering Lead**             | Implements technical corrective actions (code, configuration); provides evidence of implementation; participates in RCA for technical failures                                                                                                      |
| **Control owner**                | Notified by ISM within 24 hours of NC identification; implements corrective action within agreed timeline; provides evidence to ISM                                                                                                                 |
| **All staff**                    | Report suspected nonconformities to ISM; cooperate with RCA interviews and evidence requests                                                                                                                                                        |

---

## 7. Integration with Other ISMS Processes

| Process                              | Integration point                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Internal audit (ISMS-12)             | Audit findings generate CARs; CAR status is reviewed as part of audit follow-up phase                         |
| Management review (ISMS-13)          | Open CAR log is a mandatory Input 3a to every management review; closed CARs are reviewed for lessons learned |
| Risk register (ISMS-09)              | CAR Step 7 triggers risk register update if NC reveals new or changed risk                                    |
| Incident management (TPL-05)         | Security incidents with ISMS root causes generate CARs in addition to incident reports                        |
| Monitoring and measurement (ISMS-11) | KPI breaches (e.g., MFA rate <100%) trigger CAR creation                                                      |
| Document control (ISMS-07)           | Policy/procedure corrective actions follow document control procedure for version control                     |

---

## 8. CAR Register — Log Template

The CAR Register is maintained as a live spreadsheet in ISMS Google Drive (ISMS/Corrective Actions/CAR-Register.xlsx). The ISM updates it whenever a CAR is created, progressed, or closed. The register is reviewed at every management review.

| CAR ref      | Date raised | Source                    | Nonconformity description                     | Category | Control / clause | Containment date | RCA complete date | Corrective action                                         | Owner | Implementation deadline | Implementation date | Effectiveness review date | Status | Closure date | Notes |
| ------------ | ----------- | ------------------------- | --------------------------------------------- | -------- | ---------------- | ---------------- | ----------------- | --------------------------------------------------------- | ----- | ----------------------- | ------------------- | ------------------------- | ------ | ------------ | ----- |
| CAR-2026-001 | 2026-03-13  | Initial ISMS gap analysis | No documented contractor onboarding procedure | Minor NC | A.6.2, A.8.3     | 2026-03-13       | 2026-03-20        | Create contractor onboarding procedure referencing TPL-06 | ISM   | 2026-04-12              | —                   | —                         | Open   | —            | —     |

**CAR Register summary statistics (updated each management review):**

| Metric                              | Value |
| ----------------------------------- | ----- |
| Total CARs raised (all time)        | —     |
| Open CARs                           | —     |
| Overdue CARs                        | —     |
| CARs opened this period             | —     |
| CARs closed this period             | —     |
| Average days to close (this period) | —     |
| Major NCs open                      | —     |
| Minor NCs open                      | —     |

---

## 9. Corrective Action Request Template Reference

The Corrective Action Request (CAR) form is documented in TPL-04. Each CAR captures:

1. CAR reference, date, and source
2. Nonconformity description and evidence
3. Category (Major / Minor)
4. Affected clause / control / policy
5. Immediate containment actions and date
6. Root cause analysis (5-Whys or fishbone)
7. Proposed corrective action (description, owner, deadline)
8. ISM and CTO approval signatures / date
9. Evidence of implementation
10. Effectiveness review notes and date
11. Risk register update (if applicable)
12. Closure date and ISM sign-off

---

## 10. Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
