# Legal & Compliance Register

| Field              | Value                                          |
| ------------------ | ---------------------------------------------- |
| Document ID        | POL-20                                         |
| Version            | 1.0                                            |
| Classification     | Internal                                       |
| Owner              | Information Security Manager                   |
| Approved by        | CEO/CTO                                        |
| Effective date     | 2026-03-13                                     |
| Review date        | 2027-03-13                                     |
| ISO 27001 Controls | A.5.31, A.5.32, A.5.33, A.5.35, A.5.36, A.5.37 |

---

## 1. Purpose

This document serves as Inovy's legal and compliance register, documenting the legislative, regulatory, and contractual obligations applicable to Inovy as a Dutch AI-powered meeting recording SaaS company, and the controls in place to meet those obligations. It also documents Inovy's approach to intellectual property rights, records protection, independent security review, compliance monitoring, and documented operating procedures. This register is a foundational ISMS document reviewed annually and updated as obligations change.

## 2. Scope

This register covers all legal, regulatory, and contractual obligations applicable to:

- Inovy's operation as a Dutch registered company
- Inovy's processing of personal data on behalf of customers and in its own right
- Inovy's development and operation of AI-powered software services
- Inovy's commercial relationships with customers and suppliers
- Inovy's use of open-source software components

## 3. Legal Requirements Register (A.5.31)

Inovy monitors and maintains compliance with the following applicable laws and regulations:

### 3.1 Primary Legislation and Regulations

| Obligation                                                                      | Jurisdiction | Authority                                | Relevance to Inovy                                                                                                                    | Key Requirements                                                                                                            | Inovy Controls                                                                                                                      | Review Frequency              |
| ------------------------------------------------------------------------------- | ------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| **General Data Protection Regulation (GDPR)** EU Regulation 2016/679            | EU           | Autoriteit Persoonsgegevens (Dutch DPA)  | Core compliance obligation: Inovy processes meeting recordings, transcripts, and PII (including BSN) as both controller and processor | Lawful basis; data subject rights; data minimisation; breach notification (72h); DPA appointment; RoPA; data transfer rules | POL-15; `gdpr-deletion.service.ts`; consent audit log; DPIA process; DPO appointment                                                | Annual + on regulatory change |
| **Dutch Uitvoeringswet AVG (UAVG)**                                             | Netherlands  | Autoriteit Persoonsgegevens              | Dutch national implementation of GDPR; includes specific provisions for BSN processing                                                | BSN (Burgerservicenummer) may only be processed for legally required purposes; stricter rules than GDPR base                | PII detection service detects and redacts BSN in transcripts; BSN never stored in plain text; access restricted to authorised roles | Annual                        |
| **ePrivacy Directive** (2002/58/EC as amended)                                  | EU           | Autoriteit Persoonsgegevens              | Cookie consent; electronic communications privacy                                                                                     | Consent for cookies and tracking; privacy of electronic communications                                                      | Cookie consent banner; session cookies per GDPR consent management                                                                  | Annual                        |
| **NEN 7510** (Information security for healthcare)                              | Netherlands  | NEN (normalisatie-instituut)             | Applicable if customers use Inovy for healthcare meetings involving patient data                                                      | ISO 27001 alignment; specific Dutch healthcare information security requirements                                            | ISO 27001 ISMS (this policy set); assessed for applicability per customer contract                                                  | Annual assessment             |
| **Wet Computercriminaliteit (Computer Crime Act)** III                          | Netherlands  | Openbaar Ministerie                      | Prohibition on hacking, malware distribution, and unauthorised access                                                                 | Inovy must not perform or facilitate unauthorised access to systems                                                         | Security controls; responsible disclosure programme (does not facilitate illegal testing); vetted penetration testing firms only    | Annual                        |
| **Electronic Identification and Trust Services (eIDAS)** EU Regulation 910/2014 | EU           | National supervisory bodies              | Electronic signatures on contracts                                                                                                    | Electronic signatures on customer agreements must meet eIDAS requirements if used                                           | Contract management process (to be defined); DocuSign or equivalent for contracts                                                   | Annual                        |
| **Dutch Bookkeeping Act (Boekhouding)**                                         | Netherlands  | Belastingdienst                          | Financial record retention                                                                                                            | Financial records retained for 7 years                                                                                      | Billing records retention policy (POL-15 Section 5.1)                                                                               | Annual                        |
| **EU AI Act** (Regulation 2024/1689)                                            | EU           | National market surveillance authorities | Inovy's AI features for meeting analysis                                                                                              | AI transparency obligations; risk classification of AI systems; prohibited practices                                        | AI Act applicability assessment to be completed by Q4 2026; risk register updated accordingly                                       | Annual + on regulatory change |

### 3.2 Contractual Obligations

| Obligation                        | Counterparty                                                                                     | Key Requirements                                                                                        | Review                |
| --------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | --------------------- |
| Data Processing Agreements (DPAs) | All customers processing personal data                                                           | Customer as controller; Inovy as processor; Sub-processor approval; 72h breach notification to customer | Per contract renewal  |
| Sub-processor DPAs                | Microsoft Azure, Neon, OpenAI, Anthropic, Deepgram, Recall.ai, Stripe, Resend, Google, Microsoft | Sub-processor technical and organisational measures; audit rights; GDPR compliance                      | Annual                |
| GitHub Terms of Service           | GitHub (Microsoft)                                                                               | Code repository terms; Actions usage; data residency                                                    | Annual                |
| Azure Enterprise Agreement        | Microsoft                                                                                        | Azure service terms; data residency (EU-Central-1); SLA obligations                                     | Per agreement renewal |
| Stripe Terms of Service           | Stripe                                                                                           | PCI DSS compliance (Stripe manages); data handling                                                      | Annual                |

### 3.3 Regulatory Monitoring

The ISM is responsible for monitoring changes to applicable legislation and regulations. Monitoring channels include:

- Dutch DPA (Autoriteit Persoonsgegevens) newsletter and enforcement decisions
- European Data Protection Board (EDPB) guidelines and opinions
- EU AI Act implementation guidance from the European AI Office
- ENISA (EU Agency for Cybersecurity) advisories
- NEN standards update notifications
- Legal counsel briefings (engaged for significant regulatory changes)

When a material regulatory change is identified, the ISM:

1. Assesses the impact on Inovy's ISMS, processes, and technical controls
2. Creates a remediation plan if changes are required
3. Updates relevant ISMS policies within 60 days of the change taking effect
4. Briefs the management team on the change and Inovy's response

## 4. Intellectual Property Rights (A.5.32)

### 4.1 Inovy's Intellectual Property

All software, documentation, processes, and intellectual property developed by Inovy employees and contractors in the course of their work for Inovy is owned by Inovy B.V. Employment contracts and contractor agreements include explicit IP assignment clauses.

Source code developed for the Inovy platform is:

- Stored in GitHub repositories under the Inovy organisation
- Version-controlled with full commit history
- Not licensed to third parties without a separate commercial agreement
- Protected from unauthorised disclosure under the confidentiality provisions of employment and contractor agreements

### 4.2 Open-Source Software Licence Compliance

Inovy uses open-source software components in its product. A **Software Bill of Materials (CycloneDX SBOM)** is generated automatically during the CI/CD build process and includes the licence for every direct and transitive dependency. The SBOM is stored as a build artefact.

Licence compliance requirements:

| Licence Category             | Examples                  | Permitted Use                          | Conditions                                                                                                                    |
| ---------------------------- | ------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Permissive**               | MIT, BSD, Apache 2.0, ISC | Permitted for all Inovy use cases      | Attribution in NOTICES file; no change to distribution terms                                                                  |
| **Weak Copyleft**            | LGPL v2.1/v3, MPL 2.0     | Permitted with conditions              | Library must remain as a separate dynamically linked module; modifications to the LGPL/MPL component published if distributed |
| **Strong Copyleft**          | GPL v2, GPL v3, AGPL v3   | **Requires ISM approval before use**   | Strong copyleft licences may require Inovy to open-source proprietary code if distributed in a combined work                  |
| **Commercial / Proprietary** | Commercial licenses       | **Requires purchase and ISM approval** | Must be licenced for Inovy's intended use; no sublicensing without specific authorisation                                     |

The Engineering Lead reviews the SBOM quarterly to:

- Identify any new GPL or AGPL licenced dependencies introduced through transitive dependency updates
- Confirm licence compatibility for new direct dependencies
- Ensure NOTICES files are up to date

Any GPL or AGPL licenced package that is part of the Inovy production build requires an immediate review and written approval from ISM before deployment to production.

### 4.3 Third-Party IP in Training Data and AI Outputs

Inovy does not use customer meeting content to train AI models without explicit customer consent. Inovy's AI processing uses third-party models (OpenAI GPT-4, Anthropic Claude, Deepgram). Outputs generated by these models are used within the Inovy service in accordance with the respective providers' terms of service, including restrictions on using AI-generated content to compete with the AI provider.

## 5. Protection of Records (A.5.33)

### 5.1 Record Retention and Integrity

Inovy's ISMS and operational records are managed to ensure their integrity, availability, and authenticity throughout their retention period:

| Record Type                       | Location                        | Retention Period            | Integrity Control                            | Access Control                                           |
| --------------------------------- | ------------------------------- | --------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| Audit logs (general)              | Neon PostgreSQL                 | 3 years minimum             | SHA-256 hash chain                           | Application service account INSERT-only; ISM read access |
| Chat audit logs                   | Neon PostgreSQL                 | 1 year minimum              | SHA-256 hash chain                           | Application service account INSERT-only; ISM read access |
| Consent audit logs                | Neon PostgreSQL                 | 5 years                     | SHA-256 hash chain                           | Application service account INSERT-only; ISM read access |
| ISMS policy documents             | GitHub (version-controlled)     | Indefinitely (full history) | Git commit hash integrity; immutable history | All staff read; ISM write                                |
| Penetration test reports          | Encrypted cloud storage         | 3 years                     | File hash on receipt                         | ISM, CTO only                                            |
| Management review minutes         | Encrypted cloud storage         | 3 years                     | Version-controlled                           | Management team                                          |
| Data Processing Agreements        | Encrypted cloud storage         | Duration + 7 years          | Version-controlled                           | ISM, Legal, CEO                                          |
| Financial records                 | Accounting system               | 7 years                     | Accounting system controls                   | Finance, CEO                                             |
| Incident records                  | ISMS incident register (GitHub) | 3 years                     | Git commit history                           | ISM, Engineering Lead                                    |
| GDPR data subject request records | Encrypted cloud storage         | 3 years                     | Version-controlled                           | ISM, DPO                                                 |

### 5.2 ISMS Document Version Control

All ISMS policies, procedures, and templates are version-controlled in the `docs/iso27001/` directory of the Inovy GitHub repository. Git provides:

- **Immutable history**: Every version of every document is preserved in the commit history
- **Authorship tracking**: Every change is attributed to a specific commit author
- **Change log**: Commit messages describe what changed and why
- **Approval trail**: Pull requests document the review and approval of document changes before they take effect

The `main` branch is the authoritative source for all current ISMS documents. Historical versions are accessible via Git history.

### 5.3 Tamper-Evident Audit Logs

The SHA-256 hash chain in the audit log database provides tamper evidence for log records:

- The hash of each record includes the content of the current record and the hash of the previous record
- Any modification to a historical record would break the chain
- The ISM verifies hash chain integrity quarterly using the hash chain verification utility

If a hash chain break is detected, this is treated as a P1 security incident (potential unauthorised modification of audit records).

## 6. Independent Review of Information Security (A.5.35)

### 6.1 Annual External Penetration Test

An independent penetration test is commissioned annually from a qualified external security firm. The firm must:

- Hold relevant professional certifications (CREST, OSCP, or equivalent)
- Be independent of Inovy's development team and have no conflict of interest
- Sign an NDA before the engagement begins

The penetration test results in a formal report delivered to the ISM and CTO. Findings are tracked and remediated according to POL-18 SLAs. The remediation status is included in the following management review.

### 6.2 ISO 27001 Certification Surveillance Audit

As part of Inovy's ISO 27001 certification programme, surveillance audits are conducted annually by the accredited certification body. These audits independently verify:

- Ongoing compliance with ISO 27001 requirements
- Effectiveness of ISMS controls
- Corrective action on previous audit findings

### 6.3 Internal Audit

The ISM conducts an annual internal audit of the ISMS, assessing compliance with all policies in this documentation set. The internal audit covers:

- Policy compliance through interviews and evidence review
- Technical control effectiveness through log review and system testing
- Risk register currency and risk treatment adequacy

Internal audit findings are documented and presented to the management review meeting.

## 7. Compliance with Policies and Standards (A.5.36)

### 7.1 Quarterly ISM Self-Assessment

The ISM performs a **quarterly self-assessment** of Inovy's compliance with its ISMS policies. The assessment covers:

- Status of all open vulnerability remediation actions
- Training completion rates (TPL-08)
- Incident register review
- Policy document currency (are all policies within their review date?)
- Outstanding risk treatment actions from the risk register
- Dependabot PR backlog
- Audit log hash chain verification

The quarterly self-assessment results are documented and retained for 2 years.

### 7.2 Management Review

Inovy holds a **bi-annual management review** of the ISMS, attended by the CEO, CTO, and ISM. The management review agenda includes:

- Status of actions from previous management reviews
- Changes in internal and external issues relevant to the ISMS
- Information security performance metrics (incidents, training completion, vulnerability SLAs)
- Penetration test findings and remediation status
- Risk register review and update
- Regulatory compliance status
- ISMS resource requirements
- Opportunities for improvement

Minutes of management review meetings are retained for 3 years.

### 7.3 Compliance Metrics Tracked

| Metric                                                | Target | Reporting Frequency |
| ----------------------------------------------------- | ------ | ------------------- |
| Security training completion rate                     | 100%   | Quarterly           |
| Phishing simulation click-through rate                | <10%   | Semi-annual         |
| Critical vulnerability remediation within SLA         | 100%   | Monthly             |
| High vulnerability remediation within SLA             | 100%   | Monthly             |
| Dependabot security PRs outstanding >SLA              | 0      | Weekly              |
| Audit log hash chain integrity                        | 100%   | Quarterly           |
| ISMS documents within review date                     | 100%   | Quarterly           |
| Data subject rights requests responded within 30 days | 100%   | Quarterly           |
| Incidents notified to Dutch DPA within 72 hours       | 100%   | Per incident        |

## 8. Documented Operating Procedures (A.5.37)

Inovy maintains documented procedures for all critical operational activities. Key procedures and their locations:

| Procedure                                    | Document Reference               | Location                                                              |
| -------------------------------------------- | -------------------------------- | --------------------------------------------------------------------- |
| **Deployment to production**                 | CI/CD pipeline configuration     | `.github/workflows/azure-container-deploy.yml`                        |
| **Database migration**                       | Database migration procedure     | `.github/workflows/migrate-prod-db.yml`; POL-14 Section 4.4           |
| **Security incident response**               | Incident Management Policy       | POL-07                                                                |
| **Backup and recovery verification**         | Neon PITR procedure              | PROC-02 (to be created)                                               |
| **Access provisioning and de-provisioning**  | Access Control Policy            | POL-01                                                                |
| **New employee onboarding**                  | Onboarding checklist             | HR onboarding runbook                                                 |
| **Employee offboarding**                     | Offboarding checklist            | HR offboarding runbook; includes MDM revocation, account deactivation |
| **Vulnerability assessment and remediation** | Vulnerability Management Policy  | POL-18                                                                |
| **GDPR data subject rights requests**        | Data Protection & Privacy Policy | POL-15 Section 4.3                                                    |
| **Key rotation procedure**                   | Key Management Procedure         | PROC-01                                                               |

All procedures are reviewed at least annually or when the underlying process changes. Changes to procedures follow the change management process in POL-14.

## 9. Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
