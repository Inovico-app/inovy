# Internal Audit Program

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Document ID         | ISMS-12                      |
| Version             | 1.0                          |
| Classification      | Internal                     |
| Owner               | Information Security Manager |
| Approved by         | CEO/CTO                      |
| Effective date      | 2026-03-13                   |
| Review date         | 2027-03-13                   |
| ISO 27001 Reference | Clause 9.2                   |

---

## 1. Purpose

This Internal Audit Program establishes the framework, schedule, and procedures for conducting internal audits of Inovy's Information Security Management System (ISMS). Internal audits provide objective assurance that the ISMS:

- Conforms to the requirements of ISO/IEC 27001:2022 and Inovy's own security policies
- Is effectively implemented and maintained
- Identifies nonconformities, risks, and opportunities for improvement before they are discovered by external auditors or result in security incidents

Internal audits are a mandatory requirement under ISO 27001 Clause 9.2. Inovy's small, agile team model requires a pragmatic approach that maintains rigour without creating excessive overhead.

---

## 2. Scope

### 2.1 ISMS Audit Scope

All internal audits cover the full ISMS boundary as defined in ISMS-03 (ISMS Scope Statement), including:

- All ISO 27001:2022 clauses (Clauses 4 through 10)
- All applicable Annex A controls as documented in ISMS-10 (Statement of Applicability)
- All systems within scope: the Inovy web application (Next.js 16), Neon PostgreSQL database, Qdrant vector store, Azure Blob Storage, Azure Container Apps hosting infrastructure, and Deepgram speech processing integration
- All data processing activities: meeting recording ingestion, AI transcription, speaker diarisation, summary generation, and PII handling
- All personnel with access to in-scope systems, including employees, contractors, and service accounts

### 2.2 Audit Boundaries

The following are explicitly **out of scope** for internal audits (managed as third-party supplier risk):

- Internal controls within Azure, Neon, Deepgram, or Qdrant cloud infrastructure (assessed via supplier assurance — ISMS-10 A.5.19–A.5.22)
- Resend email delivery infrastructure beyond API key management

---

## 3. Audit Frequency

### 3.1 Annual Full ISMS Audit

Inovy conducts a minimum of one full-scope ISMS audit per calendar year. The full audit reviews all ISMS clauses and all applicable Annex A controls. The annual audit is scheduled in Q4 to allow findings to be incorporated into the management review and next year's risk assessment.

**Target completion:** End of Q4 each year.
**Full audit report due:** Within 14 days of audit completion.

### 3.2 Triggered Audits

Additional audits must be initiated when any of the following trigger events occur:

| Trigger                                                                                           | Scope of triggered audit                        | Initiation timeline                    |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------- |
| Critical security incident (Severity 1 or 2)                                                      | Affected controls + incident management process | Within 2 weeks of incident closure     |
| Major architectural change (e.g., new AI provider, new data region, new authentication mechanism) | Controls affected by the change                 | Before change goes to production       |
| Significant regulatory change affecting data processing                                           | Relevant legal/contractual controls             | Within 30 days of change taking effect |
| Management review identifies systemic ISMS weakness                                               | Relevant control domain                         | Within 60 days of management review    |
| Failed external audit or certification finding                                                    | Affected clauses and controls                   | Immediately following notification     |
| New or significantly changed supplier with access to personal data                                | A.5.19–A.5.22                                   | Before supplier access is granted      |

### 3.3 Spot Checks

The Information Security Manager may conduct targeted, unannounced spot checks on individual controls at any time. Spot checks are documented as brief audit memos rather than full audit reports. Findings from spot checks are tracked in the corrective action log (ISMS-14).

---

## 4. Auditor Independence

### 4.1 Independence Requirement

ISO 27001 requires that auditors be objective and impartial, and must not audit their own work. This means:

- The engineer who owns a specific control or wrote a specific procedure **must not** audit that control in isolation without a second reviewer.
- The Information Security Manager **must not** be the sole auditor of the ISMS processes they directly manage without co-auditor oversight.

### 4.2 Inovy's Independence Model

Given Inovy's small team structure, independence is maintained as follows:

1. **Cross-functional audit pairs:** Technical controls (e.g., A.8.x code-level controls) are audited by the ISM and reviewed by the Engineering Lead. ISMS process controls (e.g., Clause 6–9) are audited by the Engineering Lead and reviewed by the ISM. Neither individual solely audits an area where they are both designer and implementer.

2. **External auditor for certification:** For ISO 27001 certification audits (Stage 1 and Stage 2), an accredited external certification body (CB) is engaged. The CB auditors are fully independent.

3. **External auditor for supplementary assurance:** When the full annual internal audit would require one individual to audit their own work with no feasible cross-functional check (e.g., sole engineer auditing their own code), Inovy engages an external security consultant or penetration tester to provide objective assessment of the relevant area.

4. **Audit rotation:** Where possible, audit responsibilities are rotated annually so that no single individual audits the same control area in consecutive years.

### 4.3 Conflicts of Interest

Auditors must declare any conflict of interest before beginning an audit activity. Conflicts include: owning the system being audited, having a financial interest in the audit outcome, or having a prior employment relationship that could bias the assessment. Declared conflicts are resolved by reassigning the auditor or engaging external support.

---

## 5. Audit Process

The internal audit process follows four phases:

### Phase 1: Audit Planning

1. **Issue Audit Notice:** ISM issues written audit notice to all auditees and relevant stakeholders at least 15 business days before fieldwork begins. The notice includes: audit scope, objectives, criteria, schedule, and names of auditors.
2. **Define Audit Criteria:** Confirm the criteria against which the ISMS will be evaluated:
   - ISO/IEC 27001:2022 clauses and Annex A controls
   - Inovy's internal ISMS policies (ISMS-01 through ISMS-14)
   - Applicable legal and regulatory requirements (EU GDPR, Dutch UAVG)
   - Contractual obligations with enterprise customers
3. **Prepare Audit Checklist:** Develop a detailed audit checklist covering every Annex A control listed as "Applicable" in ISMS-10 and all ISO 27001 clause requirements. Checklist includes: control objective, audit question, expected evidence, and pass/fail criteria.
4. **Request Evidence:** Send evidence request list to control owners at least 10 business days before fieldwork. Evidence typically includes: policy documents, configuration screenshots, access logs, training records, incident records, and code review history.
5. **Review Previous Findings:** Review previous internal audit reports, CAR log (ISMS-14), and management review minutes to identify areas requiring follow-up.

### Phase 2: Audit Execution (Fieldwork)

1. **Opening Meeting:** Hold a brief opening meeting with all key auditees to confirm scope, timeline, and logistics. Duration: 30 minutes.
2. **Document Review:** Review all requested evidence against audit criteria. Document observations in the audit working papers.
3. **Technical Testing:** For applicable Annex A technical controls, perform direct testing:
   - Review `apps/web/src/` codebase for implementation of controls (A.8.x)
   - Review Azure Container Apps and Azure infrastructure configuration for infrastructure controls
   - Review Neon PostgreSQL access controls and encryption configuration
   - Review Better Auth configuration for MFA enforcement, session management, and access controls
   - Review Qdrant access controls and data isolation
   - Run `pnpm audit` to assess current vulnerability status
   - Review Dependabot alert history and remediation timeliness
4. **Process Interviews:** Conduct brief interviews (15–30 minutes each) with control owners to assess awareness, understanding, and actual practice of documented procedures.
5. **Sampling:** For controls involving recurring activities (e.g., access reviews, training completion, incident response), select a sample of records covering at least 3 months or the full period since the last audit, whichever is shorter.
6. **Working Paper Documentation:** Record all findings, evidence references, and auditor judgements in standardised audit working papers. Working papers are retained for a minimum of 3 years.

### Phase 3: Audit Reporting

1. **Closing Meeting:** Present preliminary findings to auditees before the final report is issued. Allow auditees to clarify factual inaccuracies. Duration: 60 minutes.
2. **Draft Report:** Issue draft audit report within 7 business days of fieldwork completion.
3. **Auditee Review Period:** Allow auditees 5 business days to respond to the draft report with factual corrections (not dispute of findings).
4. **Final Report:** Issue final audit report within 14 business days of fieldwork completion.
5. **Report Distribution:** Final report is distributed to: CEO, CTO, Information Security Manager, and relevant control owners. Report is classified **Internal — Confidential**.

### Phase 4: Follow-Up

1. **Raise CARs:** For every Major and Minor Nonconformity, raise a Corrective Action Request (TPL-04 / ISMS-14) within 5 business days of final report issue.
2. **Track to Closure:** All CARs are tracked in the corrective action log. Open CARs are reviewed at every management review meeting.
3. **Effectiveness Review:** The ISM verifies that implemented corrective actions have been effective before closing each CAR. Verification includes re-testing the affected control.
4. **Next Audit Input:** Audit findings feed directly into the next annual audit plan as areas of focus.

---

## 6. Audit Criteria

Audit criteria are the reference standards against which evidence is evaluated:

| Criteria category      | Specific reference                                             |
| ---------------------- | -------------------------------------------------------------- |
| International standard | ISO/IEC 27001:2022 (all clauses and Annex A)                   |
| ISMS policies          | ISMS-01 through ISMS-14                                        |
| Data protection        | EU GDPR, Dutch UAVG, Article 32 technical measures             |
| Access control         | ISMS-05 (Roles and Responsibilities)                           |
| Risk management        | ISMS-08 (Risk Assessment Methodology), ISMS-09 (Risk Register) |
| Incident management    | TPL-05 (Incident Report Template)                              |
| Supplier security      | ISMS-10 Annex A.5.19–A.5.22                                    |
| Cryptography           | TLS 1.2+ in transit, AES-256 at rest (Neon and Azure)          |
| Change management      | GitHub pull request history, branch protection rules           |

---

## 7. Audit Finding Categories

All audit findings are categorised as follows. The category determines the urgency and formality of corrective action required.

| Category                              | Definition                                                                                                                                                                                    | CAR required                            | Resolution timeline                                                                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| **Major Nonconformity (Major NC)**    | Complete absence of a required control; evidence of systematic failure; direct risk of information security breach; failure that would likely result in certification non-award or withdrawal | Yes (TPL-04)                            | Root cause analysis and containment within 7 days; full corrective action within 30 days |
| **Minor Nonconformity (Minor NC)**    | Isolated failure of an otherwise implemented control; a single instance of non-compliance with a documented procedure; gap that does not represent a systemic failure                         | Yes (TPL-04)                            | Corrective action within 60 days                                                         |
| **Observation**                       | Area where a control is implemented but could be improved; best practice not being followed; potential weakness that has not yet resulted in a nonconformity                                  | Recommended (TPL-04)                    | Address at next review cycle; within 90 days                                             |
| **Opportunity for Improvement (OFI)** | Suggestion for improvement that is not required by the standard but would improve security posture or efficiency                                                                              | No CAR required; record in audit report | Address at management discretion                                                         |

---

## 8. Audit Safeguards (Annex A.8.34)

ISO 27001:2022 Annex A.8.34 requires that audit and testing activities be planned and agreed to minimise disruption to business processes and protect data accessed during audits.

### 8.1 Audit Activity Controls

The following controls apply to all audit and penetration testing activities:

1. **Staff notification:** All staff are notified in writing before any audit or penetration testing activity begins. For penetration tests, notification is sent at least 5 business days in advance, specifying the dates, target systems, and tester identities.
2. **Scope restriction:** Audit and testing activities are strictly restricted to the agreed scope. Auditors and testers must not access systems, data, or code outside the agreed scope. Any accidental access to out-of-scope systems must be immediately reported to the ISM.
3. **Production data protection:** Auditors must not extract production personal data during testing. Where evidence of data processing must be reviewed, auditors review logs and system outputs with PII masked or sampled. Direct database queries against production are pre-approved by the Engineering Lead.
4. **Test data handling:** Any synthetic or sampled data used during penetration tests is treated as **Confidential** for its lifecycle. Test data is deleted within 5 business days of test completion.
5. **Audit data classification:** All audit working papers, draft reports, and final reports are classified **Internal — Confidential**. They are stored in the Inovy Google Drive ISMS folder with access restricted to the audit team and senior leadership.
6. **Findings encryption in transit:** Draft and final audit reports, and penetration test findings, are transmitted only over encrypted channels (HTTPS, encrypted email, or shared drive links). Reports must not be sent as unencrypted email attachments.
7. **Penetration test results storage:** Penetration test reports and raw findings are stored separately from general ISMS documentation, in a restricted-access subfolder accessible only to the ISM, CTO, and CEO. Penetration test findings are never stored in public or team-wide repositories.
8. **Test artefact cleanup:** After penetration testing, all test accounts, test data, injected payloads, and test artefacts must be removed from production systems within 5 business days. The tester provides a written cleanup confirmation.
9. **Minimal disruption:** Penetration tests against the live Inovy platform are scheduled outside business hours (08:00–18:00 GMT) where practicable to minimise impact on active customer meetings. API-level tests may occur during business hours with ISM approval.
10. **No disruption to availability controls:** Denial-of-service testing is explicitly prohibited against production systems unless agreed in advance in writing by the CTO.

---

## 9. Audit Reporting Requirements

### 9.1 Audit Report Structure

Each audit report must contain:

1. Executive summary (1 page)
2. Audit scope, objectives, and criteria
3. Auditor names and independence declaration
4. Evidence reviewed (document index and system configurations reviewed)
5. Findings summary table (category, reference, description, evidence, root cause, recommended action)
6. Detailed finding narratives for all Major NCs and Minor NCs
7. Summary of previous findings and closure status
8. Auditor's conclusion and overall ISMS effectiveness opinion
9. Annexes: audit checklist, evidence samples, working paper index

### 9.2 Audit Report Classification

All internal audit reports are classified **Internal — Confidential** and are subject to document control per ISMS-07.

---

## 10. Annual Audit Schedule Template

The following schedule template is to be completed at the start of each calendar year. Actual dates are confirmed in the Audit Notice issued per Section 5 (Phase 1).

| Audit activity                                | ISO 27001 clause / Control group | Planned quarter | Auditor (primary) | Auditor (reviewer) | Status  |
| --------------------------------------------- | -------------------------------- | --------------- | ----------------- | ------------------ | ------- |
| Context, scope, and interested parties review | Clauses 4, 5                     | Q1              | Engineering Lead  | ISM                | Planned |
| Risk assessment and risk treatment review     | Clause 6, ISMS-08, ISMS-09       | Q1              | ISM               | Engineering Lead   | Planned |
| Security objectives review                    | Clause 6.2, ISMS-06              | Q1              | ISM               | Engineering Lead   | Planned |
| Roles and responsibilities review             | Clause 5.3, ISMS-05              | Q2              | Engineering Lead  | ISM                | Planned |
| Asset management controls                     | A.5.9–A.5.12                     | Q2              | Engineering Lead  | ISM                | Planned |
| Access control — technical                    | A.5.15–A.5.18, A.8.2–A.8.5       | Q2              | Engineering Lead  | ISM                | Planned |
| Cryptography and key management               | A.8.24                           | Q2              | Engineering Lead  | ISM                | Planned |
| Physical and environmental security           | A.7.1–A.7.14                     | Q2              | ISM               | Engineering Lead   | Planned |
| Supplier security                             | A.5.19–A.5.22                    | Q2              | ISM               | Engineering Lead   | Planned |
| Human resource security                       | A.6.1–A.6.8                      | Q3              | ISM               | Engineering Lead   | Planned |
| Incident management                           | A.5.25–A.5.28, Clause 6.1.2      | Q3              | ISM               | Engineering Lead   | Planned |
| Business continuity                           | A.5.29–A.5.30                    | Q3              | Engineering Lead  | ISM                | Planned |
| Network and communications security           | A.8.20–A.8.23                    | Q3              | Engineering Lead  | ISM                | Planned |
| Application security (SDLC)                   | A.8.25–A.8.34                    | Q3              | Engineering Lead  | ISM                | Planned |
| Vulnerability management                      | A.8.8                            | Q3              | Engineering Lead  | ISM                | Planned |
| Operations security                           | A.8.9–A.8.19                     | Q4              | Engineering Lead  | ISM                | Planned |
| Compliance and legal obligations              | A.5.31–A.5.36                    | Q4              | ISM               | Engineering Lead   | Planned |
| Monitoring and measurement review             | Clause 9.1, ISMS-11              | Q4              | ISM               | Engineering Lead   | Planned |
| Internal audit self-review                    | Clause 9.2, ISMS-12              | Q4              | Engineering Lead  | ISM                | Planned |
| Management review preparation                 | Clause 9.3, ISMS-13              | Q4              | ISM               | Engineering Lead   | Planned |
| Corrective action review                      | Clause 10.1, ISMS-14             | Q4              | ISM               | Engineering Lead   | Planned |

---

## 11. Audit Records and Retention

| Record                           | Retention period               | Storage location               |
| -------------------------------- | ------------------------------ | ------------------------------ |
| Audit working papers             | 3 years                        | ISMS Google Drive (restricted) |
| Audit reports (all versions)     | 5 years                        | ISMS Google Drive (restricted) |
| Audit checklists                 | 3 years                        | ISMS Google Drive (restricted) |
| Evidence samples                 | 3 years                        | ISMS Google Drive (restricted) |
| Audit notices and correspondence | 3 years                        | ISMS Google Drive (restricted) |
| Penetration test reports         | 5 years (restricted subfolder) | ISMS Google Drive (restricted) |

---

## 12. Roles and Responsibilities

| Role                         | Responsibility                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Information Security Manager | Owns the audit program; issues audit notices; assigns auditors; reviews and signs off final reports; tracks CAR closure |
| Engineering Lead             | Primary auditor for technical controls (A.8.x); co-auditor for ISMS process controls; provides technical evidence       |
| CEO/CTO                      | Receives audit reports; approves resource allocation for corrective actions                                             |
| All staff                    | Cooperate with audit activities; provide requested evidence; participate in interviews                                  |
| External auditors / CB       | Conduct certification Stage 1 and Stage 2 audits; provide independent findings                                          |

---

## 13. Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
