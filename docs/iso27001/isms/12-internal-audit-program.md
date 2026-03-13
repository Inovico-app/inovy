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

This document defines Inovy's internal audit program for the ISMS. It fulfils ISO 27001:2022 Clause 9.2 requirements by establishing the schedule, scope, criteria, auditor competence requirements, process, and reporting framework for internal audits. Internal audits provide independent assurance that the ISMS conforms to ISO 27001:2022 requirements, Inovy's own policies, and is effectively implemented and maintained.

---

## 2. Audit Program Objectives

The internal audit program aims to:

1. Verify conformance of the ISMS with ISO/IEC 27001:2022 requirements (Clauses 4–10 and Annex A)
2. Verify conformance with Inovy's own information security policies (ISMS-04, POL-01 through POL-20)
3. Assess the effectiveness of controls in protecting Inovy's information assets
4. Identify non-conformities, opportunities for improvement, and areas of good practice
5. Provide input to management reviews (ISMS-13) and drive continual improvement
6. Generate evidence for the external certification audit (Stage 2)

---

## 3. Audit Schedule

### 3.1 Annual Full Audit

A full internal audit covering the complete ISMS scope is conducted annually, planned to complete at least 8 weeks before the external certification audit or surveillance audit.

| Audit Cycle       | Planned Period      | Rationale                                               |
| ----------------- | ------------------- | ------------------------------------------------------- |
| Audit 2026-01     | July–September 2026 | Pre-certification internal audit before Q4 2026 Stage 2 |
| Audit 2027-01     | Q1–Q2 2027          | Annual audit ahead of first surveillance audit          |
| Subsequent audits | Annual, Q1–Q2       | Ongoing annual cycle                                    |

### 3.2 Triggered Additional Audits

Additional targeted audits are scheduled when any of the following occur:

- A confirmed security incident of Medium or higher severity
- A significant change to the ISMS scope (new system, new market, significant new supplier)
- A major non-conformity found in a previous audit that requires verification
- Regulatory change affecting the ISMS (new AP guidance, NIS2 enforcement action)
- Request from management or external certification body
- Post-incident review identifying a systemic control failure

Triggered audits are scoped to the area affected by the triggering event and documented with the trigger reference in the audit report.

---

## 4. Audit Scope

### 4.1 Standard Full Audit Scope

Each annual full audit covers:

| Area                       | Clauses / Controls                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Context and planning**   | ISO 27001 Clauses 4, 5, 6 — organization context, interested parties, scope, policy, roles, risk assessment, objectives |
| **Support and operation**  | ISO 27001 Clauses 7, 8 — resources, awareness, communication, documented information, risk treatment implementation     |
| **Performance evaluation** | ISO 27001 Clause 9 — monitoring, measurement, internal audit, management review                                         |
| **Improvement**            | ISO 27001 Clause 10 — non-conformities, corrective actions                                                              |
| **Annex A controls**       | All applicable controls per ISMS-10 (Statement of Applicability)                                                        |
| **Policy compliance**      | All POL-XX policies relevant to the audit period                                                                        |
| **GDPR alignment**         | Data subject rights processes, breach notification procedure, sub-processor management                                  |
| **AI security controls**   | Prompt injection guards, PII output filtering, LLM output validation                                                    |

### 4.2 Risk-Based Audit Prioritization

Audit effort is weighted based on risk level from ISMS-09 (Risk Register). Controls addressing Critical and High risks receive greater audit depth and more extensive evidence sampling. Controls for R-001 (MFA), R-002 (account lockout), R-004 (security headers), and R-005 (key management) receive priority in the first annual audit.

---

## 5. Auditor Competence and Independence

### 5.1 Independence Requirement

Auditors must be independent of the area being audited. This is a non-negotiable requirement of ISO 27001:2022 Clause 9.2.2:

- The ISM does not audit their own ISMS documentation work; an independent reviewer (Engineering Lead or external consultant) audits the ISM's outputs
- Developers do not audit the security of their own code without independent review
- Where Inovy's team is too small to provide complete independence, an external ISO 27001-qualified consultant is engaged for the relevant audit module

### 5.2 Auditor Competence

Internal auditors must demonstrate:

- Understanding of ISO/IEC 27001:2022 requirements (clauses and Annex A)
- Familiarity with Inovy's technology stack and security controls (Next.js, Azure, Better Auth, Drizzle ORM)
- Ability to review technical evidence (code, configuration, logs, access control records)
- Understanding of GDPR requirements as they apply to Inovy's processing
- Audit technique skills: evidence gathering, interview technique, document review, finding classification

For the first certification cycle, the ISM is the primary internal auditor. An external ISO 27001-accredited consultant assists with modules where ISM independence is required or where specialist technical knowledge is needed.

---

## 6. Audit Process

### Phase 1: Plan (4–6 weeks before audit)

1. ISM drafts the **Audit Plan** (TPL-AUD-01) including: scope, objectives, criteria, dates, auditors, areas/processes to be covered, evidence sampling approach
2. Audit Plan is approved by the CEO/CTO
3. Audit schedule is communicated to all relevant staff; cooperation is mandatory
4. Auditor requests evidence packs: policy documents, access control records, training records, change management records, incident records, KPI reports, git history, Dependabot reports
5. Pre-audit document review of ISMS documentation currency and completeness

### Phase 2: Execute (1–2 weeks)

1. **Opening meeting:** Auditor briefs audit scope, process, and expected cooperation with all relevant personnel
2. **Evidence gathering:** Combination of:
   - Document review (ISMS-XX documents, POL-XX policies, records, logs)
   - Technical configuration review (GitHub settings, Azure configuration, Dependabot status, MFA enrollment reports)
   - Code review samples (server action security, RBAC enforcement, encryption implementation)
   - Staff interviews (ISM, Engineering Lead, developers) to verify awareness and practice
   - Log analysis (audit log samples, access logs, deployment logs)
3. **Observations recorded** in real time using the audit working paper (TPL-AUD-02)
4. **Closing meeting:** Auditor presents preliminary findings; auditees may clarify factual errors

### Phase 3: Report (within 2 weeks of execution)

1. ISM (or external auditor) produces the **Audit Report** (AUD-YYYY-XX) containing:
   - Audit scope and criteria
   - Audit team and dates
   - Evidence reviewed (sampled)
   - Findings classified per Section 7
   - Recommendations for improvement
   - Overall conformance assessment
2. Audit Report reviewed by CEO/CTO before distribution
3. Report distributed to: CEO/CTO, Engineering Lead, ISM
4. Report stored in `docs/iso27001/records/audits/` (classification: Restricted)

### Phase 4: Follow-Up (within 30 days of report)

1. For each Major and Minor Non-Conformity, a **Corrective Action Record** (CAR-YYYY-XX) is raised per ISMS-14
2. Engineering Lead and relevant teams develop corrective action plans
3. ISM tracks CAR completion per ISMS-14 procedure
4. ISM verifies effectiveness of corrective actions (may require re-audit of specific area)
5. Closed CARs documented and reported at next management review

---

## 7. Finding Classification

All audit findings are classified into one of four categories:

| Classification                        | Definition                                                                                                                                                                                                          | Required Action                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Major Non-Conformity (Major NC)**   | Complete absence of a required ISMS element; systematic failure of a control; direct contradiction of ISO 27001 requirements; or evidence of a control stated as IMPLEMENTED in ISMS-10 that is demonstrably absent | Mandatory CAR; corrective action plan within 14 days; root cause analysis required; effectiveness verification before closure |
| **Minor Non-Conformity (Minor NC)**   | Isolated or occasional failure of a control that otherwise functions; documentation gap for an otherwise-implemented control; evidence gap for a stated control                                                     | Mandatory CAR; corrective action plan within 30 days                                                                          |
| **Observation**                       | Area of potential concern that does not constitute a non-conformity; early warning of a developing issue                                                                                                            | Documented; addressed in normal management cycle; no mandatory CAR but recommended action                                     |
| **Opportunity for Improvement (OFI)** | Area where ISMS effectiveness or efficiency could be enhanced beyond current requirements                                                                                                                           | Documented; ISM reviews for inclusion in security objectives or risk register                                                 |

---

## 8. Audit Records

| Record                                  | Storage Location                            | Retention | Classification |
| --------------------------------------- | ------------------------------------------- | --------- | -------------- |
| Audit Plans (TPL-AUD-01)                | `docs/iso27001/records/audits/`             | 5 years   | Confidential   |
| Audit Working Papers (TPL-AUD-02)       | `docs/iso27001/records/audits/`             | 5 years   | Restricted     |
| Audit Reports (AUD-YYYY-XX)             | `docs/iso27001/records/audits/`             | 5 years   | Restricted     |
| Corrective Action Records (CAR-YYYY-XX) | `docs/iso27001/records/corrective-actions/` | 5 years   | Confidential   |

---

## 9. Audit Safeguards (A.8.34)

To protect the integrity of both the audit process and Inovy's operational systems during audit activities, the following safeguards apply:

### 9.1 Staff Notification

All staff subject to audit activities are notified in advance of the audit schedule and their expected cooperation. Audit is not covert; the objective is assurance and improvement, not entrapment. Notification does not apply to pre-announcement of specific evidence requests where pre-notification could compromise evidence integrity (e.g., access log review).

### 9.2 Scope Restriction

Audit access is strictly limited to systems, data, and information within the defined audit scope. Auditors do not access systems beyond what is necessary to gather evidence for the stated audit criteria. Any out-of-scope access is documented and requires ISM and CTO approval.

### 9.3 Confidential Handling

All audit findings, working papers, and reports are classified as Restricted and shared only with authorized recipients (ISM, Engineering Lead, CEO/CTO, external certification body as required). Findings are not communicated to third parties (including customers or investors) without CEO/CTO approval.

### 9.4 Encrypted Findings Storage

Audit working papers and reports containing details of control weaknesses or vulnerabilities are stored in the `docs/iso27001/records/audits/` directory which is protected by repository access controls (GitHub private repository, restricted write access). Particularly sensitive findings (e.g., exploitable vulnerability details) are stored with additional access restriction.

### 9.5 Penetration Test Result Handling

Where penetration testing forms part of audit activities (e.g., multi-tenancy boundary testing per R-011 treatment), penetration test reports are classified as Restricted. Raw technical findings are shared only with the Engineering Lead and ISM for remediation purposes. Summaries are included in the Audit Report; technical details are referenced but stored separately.

### 9.6 Test Data Clean-Up

Any test data created during audit activities (e.g., test user accounts, test meeting records) is deleted within 48 hours of the audit activity completion. Auditors document test data created and confirm deletion.

---

## 10. Document Control

This audit program document is reviewed annually by the ISM and updated to reflect lessons learned from completed audits. Updates follow ISMS-07 (Document Control Procedure).

**Next review:** 2027-03-13
