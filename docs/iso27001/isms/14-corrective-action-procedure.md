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

This procedure defines how Inovy identifies, evaluates, and corrects non-conformities with ISMS requirements and responds to security incidents, in order to prevent recurrence and drive continual improvement. It fulfils ISO 27001:2022 Clause 10.1 (Non-conformity and corrective action) and supports Clause 10.2 (Continual improvement).

---

## 2. Scope

This procedure applies to all non-conformities and opportunities for corrective action arising from:

- Internal audit findings (ISMS-12) — Major and Minor Non-Conformities
- External audit findings — certification body audit results (Stage 2, surveillance audits)
- Management review decisions (ISMS-13)
- Security incidents investigated under POL-12 that reveal systematic control failures
- KPI breaches identified under ISMS-11 that indicate control failure
- Regulatory findings or customer complaints related to ISMS controls
- Self-identified control gaps discovered by the engineering team or ISM

---

## 3. Corrective Action Record (CAR) Template

Each corrective action is documented in a **Corrective Action Record (CAR)** using template TPL-04. CARs are assigned sequential IDs: `CAR-YYYY-XX` (e.g., CAR-2026-01).

CARs are stored in `docs/iso27001/records/corrective-actions/` (classification: Confidential) and tracked in the CAR register maintained by the ISM.

---

## 4. The 7-Step Corrective Action Process

### Step 1: Identify the Non-Conformity

**Trigger:** A non-conformity is identified via one of the sources listed in Section 2.

**Actions:**

1. The identifying party (auditor, ISM, engineer, manager) documents the non-conformity in a new CAR (TPL-04) within 2 business days of identification
2. The CAR captures: source of identification, description of the non-conformity, affected ISMS clause or control (ISO 27001 reference and/or policy reference), date identified, identifier name
3. The ISM assigns a CAR ID and classifies the severity (Major NC / Minor NC / Observation)
4. The ISM notifies the CEO/CTO of Major NCs within 24 hours of identification

**Major NC definition:** A Major NC is one where a required ISMS element is completely absent, or where a control stated as implemented is demonstrably non-functional, or where a finding could prevent certification.

---

### Step 2: React — Contain and Remediate Immediately

**Purpose:** Prevent further harm or non-conformance before root cause is determined.

**Actions:**

1. The ISM and Engineering Lead assess whether immediate containment action is necessary to prevent further non-conformance or security risk (e.g., revoking access, disabling a vulnerable feature, removing a misconfiguration)
2. Immediate containment actions are documented in the CAR and implemented within the timeframes:

| Severity                                | Immediate Containment Deadline |
| --------------------------------------- | ------------------------------ |
| Major NC involving active security risk | 4 hours                        |
| Major NC without active immediate risk  | 24 hours                       |
| Minor NC                                | 5 business days                |
| Observation                             | No mandatory immediate action  |

3. Containment actions do not substitute for root cause analysis and permanent correction — they are interim measures only
4. Containment actions are logged in the tamper-proof audit log

---

### Step 3: Root Cause Analysis — Determine Why

**Purpose:** Understand the underlying cause of the non-conformity so that the corrective action addresses the root cause, not just the symptom.

**Technique:** Inovy uses the **5-Whys** technique as the primary root cause analysis method for all Major NCs. For complex incidents, a fishbone (Ishikawa) diagram may be used additionally.

**5-Whys Process:**

Starting with the non-conformity symptom, ask "Why did this happen?" five times, with each answer forming the basis for the next question. The final answer reveals the root cause. Examples:

> **Non-conformity:** Production deployment was made without a required code review.
>
> - Why? The developer had direct push access to main branch.
> - Why? Branch protection rules were not configured.
> - Why? There was no process to verify GitHub security settings during repository setup.
> - Why? Repository setup checklist did not include security configuration items.
> - Why? The repository setup process had never been formally documented.
> - **Root cause:** Absence of a documented repository setup procedure including security configuration requirements.

**Actions:**

1. Root cause analysis is conducted by the ISM (with Engineering Lead input for technical NCs) within 5 business days of identification (Major NC) or 14 days (Minor NC)
2. Root cause analysis is documented in the CAR
3. If root cause analysis reveals a systemic issue affecting multiple controls or processes, the ISM initiates a broader review of the affected area

---

### Step 4: Determine the Corrective Action

**Purpose:** Design a corrective action that addresses the root cause and prevents recurrence.

**Actions:**

1. The ISM and Engineering Lead (as applicable) identify corrective actions that directly address the root causes identified in Step 3
2. Corrective actions must be proportionate to the severity of the non-conformity and its risk implications
3. For each corrective action, the CAR documents:
   - Specific action to be taken (code change, documentation, process change, training)
   - Owner (named role)
   - Target completion date
   - Evidence of completion (what will demonstrate the action is done)
   - Method to verify effectiveness (how will we confirm the action works)

**Target completion timeframes:**

| Severity                  | Target Completion                                       |
| ------------------------- | ------------------------------------------------------- |
| Major NC (active risk)    | 14 days from identification                             |
| Major NC (no active risk) | 30 days from identification                             |
| Minor NC                  | 60 days from identification                             |
| Observation               | 90 days from identification (or next management review) |

Timeframes may be extended by the ISM with documented justification. CEO/CTO approval required to extend Major NC deadlines.

4. The ISM reviews proposed corrective actions for adequacy before the action is formally accepted and entered in the CAR

---

### Step 5: Implement the Corrective Action

**Purpose:** Execute the planned corrective action.

**Actions:**

1. The action owner implements the corrective action within the target deadline
2. For code changes: follow the standard PR review process per POL-04 and POL-17; reference the CAR ID in the PR description
3. For documentation changes: follow the document control procedure in ISMS-07; the updated document version is evidence of completion
4. For process changes: updated procedure documented and communicated to relevant staff; training records as applicable
5. Progress on implementation is reported to the ISM weekly for Major NCs, monthly for Minor NCs
6. The ISM updates the CAR status in the CAR register at each progress update
7. On completion, the action owner notifies the ISM with evidence of completion (PR link, document reference, screenshot, configuration export, etc.)

---

### Step 6: Review Effectiveness of the Corrective Action

**Purpose:** Verify that the corrective action has resolved the root cause and that the non-conformity no longer exists.

**Actions:**

1. The ISM conducts an effectiveness review within 30 days of the reported completion date for Major NCs; within 60 days for Minor NCs
2. Effectiveness review methods include:
   - Technical verification: re-testing the specific control or configuration that failed (e.g., attempting the non-conformant action to confirm it is now prevented)
   - Document review: reviewing the updated policy or procedure for completeness
   - Evidence sampling: reviewing audit logs, access reports, or configuration records to confirm the change is sustained
   - Re-interview: confirming staff awareness of the changed procedure
3. If the corrective action is found to be effective:
   - ISM marks the CAR as Closed with the closure date and evidence reference
   - ISM notes the closure in the monthly metrics report
4. If the corrective action is found to be ineffective or partially effective:
   - ISM reopens the CAR (status: Reopened)
   - Step 3 (root cause) is revisited — the original root cause may have been mis-identified
   - A revised corrective action plan is developed
   - CEO/CTO is notified for Major NCs
5. Effectiveness review results are documented in the CAR

---

### Step 7: Update the Risk Register

**Purpose:** Ensure that lessons from corrective actions are reflected in the ISMS risk register and prevent recurrence in the risk management cycle.

**Actions:**

1. Once a corrective action is closed, the ISM reviews the risk register (ISMS-09) to determine whether:
   - The risk addressed by this corrective action requires re-scoring (likelihood or impact changes due to the new control)
   - New risks have been identified during the root cause analysis
   - Existing risk treatment plans require updating
2. The ISM updates ISMS-09 as required and documents the change in the risk register version history (Git commit)
3. If the corrective action reveals a previously unknown systemic risk or control gap, a triggered risk assessment review is conducted per ISMS-08 Section 11.3
4. A summary of closed CARs and risk register updates is presented at the next management review (ISMS-13, Section E and F)

---

## 5. CAR Register

The ISM maintains a CAR register (stored in `docs/iso27001/records/corrective-actions/car-register.md`) containing a summary of all CARs:

| CAR ID      | Date Raised | Source                               | Description | Severity            | Owner | Target Date | Status                             | Closure Date |
| ----------- | ----------- | ------------------------------------ | ----------- | ------------------- | ----- | ----------- | ---------------------------------- | ------------ |
| CAR-YYYY-XX |             | Audit / Incident / Management review |             | Major / Minor / Obs |       |             | Open / Closed / Overdue / Reopened |              |

The CAR register is reviewed:

- Monthly by the ISM for status updates and escalation
- At every management review (ISMS-13)
- As part of the internal audit (ISMS-12) — auditors assess whether CARs from previous audits have been properly closed

---

## 6. Management Review Reporting

Open CARs are a standing agenda item at every management review (ISMS-13). The ISM presents:

- Total open CARs by severity and age
- CARs overdue (past target date) with explanation and revised timeline
- CARs closed since last review with effectiveness verification outcome
- Any systemic patterns identified across multiple CARs

The management review provides formal oversight of the corrective action process and escalation authority for CARs where progress is insufficient.

---

## 7. Interaction with Other ISMS Processes

| Related Process                   | Interaction                                                                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Internal Audit (ISMS-12)**      | Internal audit is the primary source of Major and Minor NCs triggering CARs; audit follow-up verifies CAR effectiveness                                     |
| **Incident Response (POL-12)**    | Post-incident reviews identifying systemic control failures trigger CARs; corrective actions address root causes of incidents                               |
| **Risk Register (ISMS-09)**       | Closed CARs feed back into risk re-scoring; new risks found during root cause analysis are added to risk register                                           |
| **Management Review (ISMS-13)**   | Management review receives CAR status reports; management decisions may trigger additional CARs; management approves resource allocation for CAR completion |
| **Document Control (ISMS-07)**    | Policy and procedure changes resulting from CARs follow the document control procedure                                                                      |
| **Security Objectives (ISMS-06)** | Persistent CAR non-closure or recurring NCs may trigger revision of security objectives                                                                     |

---

## 8. Document Control

This procedure is reviewed annually by the ISM. Updates follow ISMS-07 (Document Control Procedure). The procedure is also reviewed following any external certification audit finding related to the corrective action process.

**Next review:** 2027-03-13
