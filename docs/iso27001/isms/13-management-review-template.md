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

This document provides the template and procedure for Inovy's ISMS Management Review. ISO 27001 Clause 9.3 requires top management to review the ISMS at planned intervals to ensure its continuing suitability, adequacy, and effectiveness.

Management reviews are the primary governance mechanism by which Inovy's leadership confirms that the ISMS continues to protect customer meeting recordings, AI-generated transcripts, and personal data — and that security investment remains proportionate to risk.

---

## 2. Review Frequency

| Review type                    | Minimum frequency           | Recommended frequency (Year 1) |
| ------------------------------ | --------------------------- | ------------------------------ |
| Full management review         | Biannually (every 6 months) | Quarterly                      |
| Lightweight ISMS status update | Quarterly                   | Monthly                        |
| Emergency review (triggered)   | As needed                   | As needed                      |

**Rationale for quarterly frequency in Year 1:** During the initial ISMS implementation and certification phase, the programme is rapidly maturing. More frequent reviews enable faster detection of implementation gaps, more agile resource allocation, and stronger evidence of management engagement for the Stage 2 certification audit.

**Triggered reviews** must be convened within 10 business days of:

- A Severity 1 or Severity 2 security incident
- A major product architectural change (new AI processing pipeline, new data region, new third-party processor)
- A significant regulatory development affecting data protection (new supervisory authority guidance, regulatory investigation)
- Significant customer complaint relating to data security or privacy

---

## 3. Attendees

| Role                                     | Required / Optional |
| ---------------------------------------- | ------------------- |
| CEO                                      | Required            |
| CTO                                      | Required            |
| Information Security Manager             | Required            |
| Engineering Lead                         | Required            |
| Head of Product (where applicable)       | Optional            |
| Legal / DPO (where applicable)           | Optional            |
| External ISMS consultant (where engaged) | Optional            |

A quorum requires at minimum the CEO (or delegated executive), CTO, and ISM.

---

## 4. Mandatory Review Inputs (ISO 27001 Clause 9.3.2)

ISO 27001 Clause 9.3.2 mandates that the management review consider the following inputs. Evidence for each input must be prepared by the ISM and distributed to attendees at least 5 business days before the meeting.

### Input 1: Status of Actions from Previous Reviews

| Reference             | Action               | Owner   | Due date | Status        | Evidence           |
| --------------------- | -------------------- | ------- | -------- | ------------- | ------------------ |
| [e.g., MR-2025-Q3-01] | [Action description] | [Owner] | [Date]   | Open / Closed | [Link or document] |

**Preparation notes:** ISM extracts all open actions from the previous management review minutes and updates status based on documentary evidence. Any overdue open actions must be escalated to management attention and root cause of delay discussed.

---

### Input 2: Changes in External and Internal Issues Relevant to the ISMS

#### 2a. External Issues

The ISM prepares a brief assessment of material external changes since the last review. Relevant categories for Inovy:

| External issue category              | Assessment                                                                            | Impact on ISMS                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Regulatory changes                   | [e.g., AP updated guidance on AI-generated meeting summaries as personal data]        | [e.g., Review data retention periods for AI summaries]                       |
| Threat landscape                     | [e.g., Surge in API key theft targeting SaaS platforms via CI/CD pipeline compromise] | [e.g., Review GitHub Actions secret management, A.8.18]                      |
| AI/ML regulatory developments        | [e.g., EU AI Act enforcement milestones]                                              | [e.g., Review AI transparency obligations for meeting summarisation feature] |
| Cloud provider changes               | [e.g., Neon PostgreSQL end-of-life for legacy TLS versions]                           | [e.g., Verify TLS 1.2+ enforcement in Prisma connection strings]             |
| Deepgram / speech-AI changes         | [e.g., Deepgram updated data retention policy]                                        | [e.g., Re-assess A.5.20 supplier agreement compliance]                       |
| Competitor/market security incidents | [e.g., Major meeting-recording SaaS breached via exposed Deepgram tokens]             | [e.g., Confirm Deepgram token rotation procedure is active]                  |

#### 2b. Internal Issues

| Internal issue category  | Assessment                                                              | Impact on ISMS                                                      |
| ------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Organisational changes   | [e.g., New engineering hire onboarded with access to production]        | [e.g., Confirm onboarding checklist TPL-06 completed]               |
| Technology stack changes | [e.g., Migrated from PlanetScale to Neon PostgreSQL]                    | [e.g., Update ISMS-03 scope, confirm encryption-at-rest for new DB] |
| Product feature launches | [e.g., Launched AI meeting coach feature processing additional PII]     | [e.g., Privacy impact assessment completed, risk register updated]  |
| Infrastructure changes   | [e.g., Moved from self-hosted Qdrant to Qdrant Cloud]                   | [e.g., Update supplier register, review data processing agreement]  |
| Business model changes   | [e.g., First enterprise customer contract signed with DPA requirements] | [e.g., Review contractual security obligations, update ISMS-02]     |

---

### Input 3: Feedback on Information Security Performance

#### 3a. Nonconformities and Corrective Actions

| CAR reference  | Source                                   | Nonconformity summary | Status        | Effectiveness verified |
| -------------- | ---------------------------------------- | --------------------- | ------------- | ---------------------- |
| [CAR-XXXX-001] | [Internal audit / incident / monitoring] | [Description]         | Open / Closed | Yes / No / Pending     |

Summary statistics:

- Total open CARs: \_\_\_
- Overdue CARs (past deadline): \_\_\_
- CARs opened this period: \_\_\_
- CARs closed this period: \_\_\_
- Average time to close (this period): \_\_\_

---

#### 3b. Monitoring and Measurement Results (KPIs from ISMS-11)

| KPI                                     | Target              | Actual (this period) | Trend   | Status            |
| --------------------------------------- | ------------------- | -------------------- | ------- | ----------------- |
| Critical vulnerability remediation time | <72 hours           | [X hours avg]        | [↑/↓/→] | [Green/Amber/Red] |
| MFA enrollment rate                     | 100%                | [X%]                 | [↑/↓/→] | [Green/Amber/Red] |
| Security training completion            | 100%                | [X%]                 | [↑/↓/→] | [Green/Amber/Red] |
| Failed login attempts                   | <50/day per account | [X/day avg]          | [↑/↓/→] | [Green/Amber/Red] |
| Access review completion                | 100% quarterly      | [X%]                 | [↑/↓/→] | [Green/Amber/Red] |
| Incident response time (detect to log)  | <4 hours            | [X hours avg]        | [↑/↓/→] | [Green/Amber/Red] |
| Audit log integrity                     | 100%                | [Pass/Fail]          | [↑/↓/→] | [Green/Amber/Red] |
| Backup verification                     | Pass                | [Pass/Fail last run] | [↑/↓/→] | [Green/Amber/Red] |
| Security header compliance              | A+ rating           | [Current rating]     | [↑/↓/→] | [Green/Amber/Red] |
| Dependency freshness                    | <30 days behind     | [X days avg]         | [↑/↓/→] | [Green/Amber/Red] |

**KPI status key:** Green = meeting target; Amber = within 10% of target or single period miss; Red = consistently below target or significant deviation requiring action.

---

#### 3c. Audit Results

| Audit                                | Date   | Auditor   | Findings (Major NC / Minor NC / Obs / OFI) | Status        |
| ------------------------------------ | ------ | --------- | ------------------------------------------ | ------------- |
| Annual internal ISMS audit [year]    | [Date] | [Name]    | [X Major / Y Minor / Z Obs / W OFI]        | Open / Closed |
| Triggered audit: [trigger event]     | [Date] | [Name]    | [X Major / Y Minor / Z Obs / W OFI]        | Open / Closed |
| External certification audit Stage 1 | [Date] | [CB name] | [Findings]                                 | Open / Closed |
| External certification audit Stage 2 | [Date] | [CB name] | [Findings]                                 | Open / Closed |

---

#### 3d. Achievement of Information Security Objectives

| Objective (from ISMS-06)                        | Target               | Achievement (this period) | Evidence                | Status            |
| ----------------------------------------------- | -------------------- | ------------------------- | ----------------------- | ----------------- |
| [e.g., Zero Severity 1 incidents in production] | Zero                 | [X incidents]             | [Incident register]     | [Green/Amber/Red] |
| [e.g., ISO 27001 certification by Q4 2026]      | Certified by Q4 2026 | [Stage reached]           | [CB correspondence]     | [Green/Amber/Red] |
| [e.g., 100% MFA across all accounts]            | 100% by end Q1 2026  | [X% enrolled]             | [Better Auth dashboard] | [Green/Amber/Red] |
| [e.g., All critical deps remediated within 72h] | 100%                 | [X%]                      | [Dependabot log]        | [Green/Amber/Red] |

---

### Input 4: Feedback from Interested Parties

| Interested party                          | Feedback received                                                           | Source                       | Impact on ISMS                                     |
| ----------------------------------------- | --------------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------- |
| Enterprise customers                      | [e.g., Customer X requested SOC 2 Type II report]                           | [Customer call / DPA review] | [e.g., Evaluate SOC 2 alongside ISO 27001]         |
| Supervisory authorities                   | [e.g., AP updated guidance on AI processing]                                | [AP website]                 | [e.g., Review consent mechanism for AI processing] |
| Employees                                 | [e.g., Phishing simulation results — 2 staff clicked]                       | [Training records]           | [e.g., Targeted refresher training for 2 staff]    |
| External auditors / CB                    | [e.g., Stage 1 audit identified missing procedure for access review]        | [Stage 1 report]             | [e.g., CAR raised, procedure created]              |
| Suppliers (Azure, Neon, Deepgram, OpenAI) | [e.g., Neon notified of upcoming maintenance window affecting availability] | [Supplier comms]             | [e.g., Update BCP, notify customers]               |

---

### Input 5: Risk Assessment Changes

The ISM presents a summary of changes to the risk register (ISMS-09) since the previous management review:

| Change                                                                    | Risk register reference | New/changed risk score          | Direction  | Management decision required      |
| ------------------------------------------------------------------------- | ----------------------- | ------------------------------- | ---------- | --------------------------------- |
| [e.g., New threat: prompt injection attacks on AI summarisation pipeline] | [RR-NEW-XXX]            | [High/Medium/Low]               | [New risk] | [Yes — approve treatment plan]    |
| [e.g., Deepgram API key rotation implemented — residual risk reduced]     | [RR-XXX]                | [Risk reduced from High to Low] | [↓]        | [No — accept residual]            |
| [e.g., No code-level audit log tamper detection yet implemented]          | [RR-XXX]                | [Risk remains Medium]           | [→]        | [Yes — assign owner and deadline] |

**Summary:**

- Total risks in register: \_\_\_
- New risks identified this period: \_\_\_
- Risks changed (increased): \_\_\_
- Risks changed (decreased): \_\_\_
- Risks accepted: \_\_\_
- Risks requiring immediate management decision: \_\_\_

---

### Input 6: Opportunities for Continual Improvement

The ISM presents identified opportunities for improving the ISMS that do not arise from nonconformities. Sources include: audit OFIs, staff suggestions, new security tooling, industry best practice updates.

| Opportunity                                                       | Source                   | Potential benefit                            | Estimated effort                | Management decision        |
| ----------------------------------------------------------------- | ------------------------ | -------------------------------------------- | ------------------------------- | -------------------------- |
| [e.g., Implement runtime secret scanning in CI pipeline]          | [Engineering suggestion] | [Prevent accidental key exposure in commits] | [Low — 1 day]                   | [Approve / Defer / Reject] |
| [e.g., Adopt OpenSSF Scorecard for dependency security scoring]   | [Industry best practice] | [Systematic dependency hygiene visibility]   | [Medium — 3 days]               | [Approve / Defer / Reject] |
| [e.g., Customer-facing security portal (SOC 2 / ISO 27001 badge)] | [Sales feedback]         | [Accelerate enterprise deals]                | [High — external CB engagement] | [Approve / Defer / Reject] |

---

## 5. Management Review Outputs (ISO 27001 Clause 9.3.3)

ISO 27001 Clause 9.3.3 requires that the outputs of the management review include decisions and actions relating to:

### Output 1: Decisions on Opportunities for Continual Improvement

| Opportunity                | Decision (Approve / Defer / Reject) | Rationale   | Owner  | Deadline | Action reference |
| -------------------------- | ----------------------------------- | ----------- | ------ | -------- | ---------------- |
| [Opportunity from Input 6] | [Decision]                          | [Rationale] | [Name] | [Date]   | [MR-YYYY-QX-XX]  |

### Output 2: Any Changes to the ISMS

| Change required                                                   | Rationale                | Affected document(s) | Owner | Deadline | Action reference |
| ----------------------------------------------------------------- | ------------------------ | -------------------- | ----- | -------- | ---------------- |
| [e.g., Update ISMS-03 scope to include new Qdrant Cloud supplier] | [New supplier onboarded] | [ISMS-03, ISMS-10]   | [ISM] | [Date]   | [MR-YYYY-QX-XX]  |

### Output 3: Resource Needs

| Resource                                   | Justification                                  | Type (Budget / People / Tools) | Requested by | Management decision | Budget reference    |
| ------------------------------------------ | ---------------------------------------------- | ------------------------------ | ------------ | ------------------- | ------------------- |
| [e.g., External penetration test — £3,500] | [Annual pentest requirement for certification] | [Budget]                       | [ISM]        | [Approve / Defer]   | [Budget line]       |
| [e.g., 0.5 FTE ISM time for CAR follow-up] | [8 open CARs requiring closure]                | [People]                       | [ISM]        | [Approve / Defer]   | [Sprint allocation] |

---

## 6. Action Tracking Table

All actions arising from management reviews are assigned a unique reference, owner, and deadline. Open actions are reviewed at the start of every subsequent management review.

| Action reference  | Action description   | Owner  | Priority (High/Med/Low) | Deadline | Status | Closed date | Evidence of closure |
| ----------------- | -------------------- | ------ | ----------------------- | -------- | ------ | ----------- | ------------------- |
| MR-[YYYY]-[QX]-01 | [Action description] | [Name] | [Priority]              | [Date]   | Open   | —           | —                   |
| MR-[YYYY]-[QX]-02 | [Action description] | [Name] | [Priority]              | [Date]   | Closed | [Date]      | [Link]              |

**Action reference format:** `MR-[YEAR]-[Q1/Q2/Q3/Q4]-[sequence]`. Example: `MR-2026-Q2-03`.

---

## 7. Meeting Agenda Template

The following agenda is used for all full management reviews. Estimated durations are for a standard quarterly review.

```
INOVY ISMS MANAGEMENT REVIEW
Date: [Date]
Time: [Start time] – [End time] ([Duration])
Location: [Google Meet / in-person]
Chair: Information Security Manager
Minutes: [Designated note-taker]

AGENDA

1. Welcome and quorum confirmation [5 min]
2. Approval of previous management review minutes [5 min]
3. Review of actions from previous meeting (Input 1) [10 min]
4. External and internal context changes (Input 2) [10 min]
5. Information security performance review
   a. Nonconformities and CARs (Input 3a) [10 min]
   b. KPI dashboard review (Input 3b) [10 min]
   c. Audit results (Input 3c) [10 min]
   d. Security objectives achievement (Input 3d) [10 min]
6. Feedback from interested parties (Input 4) [5 min]
7. Risk register changes (Input 5) [10 min]
8. Opportunities for continual improvement (Input 6) [10 min]
9. Management decisions and action assignment (Outputs 1–3) [15 min]
10. Any other business [5 min]
11. Date and agenda for next review [5 min]

TOTAL: ~120 minutes
```

**Pre-meeting preparation checklist (ISM):**

- [ ] Prepare agenda and evidence pack (inputs 1–6) — distribute 5 business days before
- [ ] Update KPI dashboard with current period data
- [ ] Update CAR log status
- [ ] Prepare risk register change summary
- [ ] Confirm attendees and quorum
- [ ] Book meeting room / video call

**Post-meeting checklist (ISM):**

- [ ] Circulate draft minutes within 3 business days
- [ ] Obtain attendee sign-off on minutes within 5 business days
- [ ] Log all new actions in the action tracking table
- [ ] Raise any new CARs (TPL-04) within 5 business days
- [ ] File signed minutes in ISMS Google Drive (classified: Internal — Confidential)
- [ ] Update ISMS document register if any document changes were approved

---

## 8. Management Review Records

All management review records are subject to document control per ISMS-07.

| Record                                         | Retention period  | Storage location  | Classification          |
| ---------------------------------------------- | ----------------- | ----------------- | ----------------------- |
| Signed management review minutes               | 5 years           | ISMS Google Drive | Internal — Confidential |
| Evidence packs (KPI data, audit reports, etc.) | 3 years           | ISMS Google Drive | Internal — Confidential |
| Action tracking table (current)                | Current + 2 years | ISMS Google Drive | Internal                |
| Attendance records                             | 5 years           | ISMS Google Drive | Internal                |

---

## 9. Roles and Responsibilities

| Role                         | Responsibility                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Information Security Manager | Owns the management review process; prepares all inputs; chairs the meeting; drafts minutes; tracks actions   |
| CEO                          | Top management representative; provides strategic direction; approves resource allocations                    |
| CTO                          | Technical authority; confirms feasibility of proposed ISMS changes; approves engineering resource for actions |
| Engineering Lead             | Provides technical KPI data; attends as subject matter expert for technical controls                          |
| All attendees                | Review pre-meeting evidence pack; participate constructively; fulfil assigned actions by deadlines            |

---

## 10. Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
