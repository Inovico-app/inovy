# HR Security Policy

| Field              | Value                                    |
| ------------------ | ---------------------------------------- |
| Document ID        | POL-09                                   |
| Version            | 1.0                                      |
| Classification     | Internal                                 |
| Owner              | Information Security Manager             |
| Approved by        | CEO/CTO                                  |
| Effective date     | 2026-03-13                               |
| Review date        | 2027-03-13                               |
| ISO 27001 Controls | A.6.1, A.6.2, A.6.3, A.6.4, A.6.5, A.6.6 |

---

## 1. Purpose

This policy defines Inovy's requirements for managing information security risks throughout the entire employment lifecycle — from pre-employment screening through to termination. People are both the greatest asset and one of the most significant risk vectors in any organisation. This policy ensures that Inovy employees and contractors are security-aware, contractually bound to appropriate obligations, and that security controls are maintained through personnel changes.

## 2. Scope

This policy applies to:

- All Inovy B.V. employees (full-time and part-time)
- All contractors and temporary workers
- All third-party personnel with direct access to Inovy systems or customer data
- The entire employment lifecycle: recruitment, onboarding, ongoing employment, role change, and termination

## 3. Reference Documents

- POL-01 Access Control Policy (access revocation on termination)
- POL-02 Acceptable Use Policy (employee obligations)
- POL-04 Information Classification and Handling Policy
- POL-07 Incident Response Plan (insider threat response)
- POL-10 Remote Working Policy
- Dutch employment law (Burgerlijk Wetboek, Boek 7)
- GDPR (employee personal data)

---

## 4. Pre-Employment Screening (A.6.1)

### 4.1 Purpose of Screening

Pre-employment screening mitigates the risk of hiring individuals who pose a security risk to Inovy or its customers. Screening must be conducted before any offer of employment or contract is finalised, and before access to Inovy systems is granted.

### 4.2 Screening Requirements

The level of screening required varies by the classification of data the individual will access:

| Access level                                                                                                    | Screening requirements                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Public / Internal only                                                                                          | Identity verification, professional reference (at least one), work authorisation (right to work in the Netherlands or remotely under Dutch law) |
| Confidential                                                                                                    | All of the above, plus: employment history verification (last 3 years), LinkedIn or equivalent professional profile review                      |
| Restricted (including superadmin, or roles with access to BSN data, encryption keys, production infrastructure) | All of the above, plus: criminal background check (Verklaring Omtrent het Gedrag — VOG), formal reference from previous employer                |

### 4.3 Screening Process

1. Candidate submits to the agreed screening process as part of the offer acceptance
2. HR (or the CEO for early-stage hiring) initiates the background check via an approved screening provider
3. Identity is verified by reviewing a government-issued ID document
4. VOG (where required) is requested from the candidate; employment is conditional on a satisfactory VOG
5. Professional references are checked by phone or video; not solely by email
6. Results are recorded in the candidate's HR file and retained for the duration of employment plus 2 years
7. If screening reveals concerns, the hiring decision is escalated to the CEO and Information Security Manager

### 4.4 Contractor Screening

Contractors and temporary workers who will access Confidential or Restricted data are subject to equivalent screening requirements. The contracting agency is responsible for providing evidence of screening, which Inovy verifies. If the agency cannot provide evidence, Inovy conducts the screening directly.

---

## 5. Employment Terms and Security Obligations (A.6.2)

### 5.1 Employment Contract Requirements

All employment contracts and contractor agreements must include the following information security provisions:

- **Confidentiality obligation:** The employee agrees to maintain the confidentiality of Inovy's Confidential and Restricted information, including customer data, source code, and business information, both during and after employment
- **Information security responsibilities:** The employee acknowledges their responsibility to comply with Inovy's information security policies, including this policy and POL-02 (Acceptable Use Policy)
- **Intellectual property:** All work product created during employment is the property of Inovy B.V.
- **Incident reporting obligation:** The employee agrees to immediately report any suspected security incident, vulnerability, or policy violation
- **GDPR awareness:** For roles with access to personal data, the contract references Inovy's privacy policy and the employee's obligations as an authorised processor of personal data
- **Post-termination obligations:** Confidentiality obligations survive termination of employment; the duration and scope are specified in the contract

### 5.2 Policies Acknowledgement

During onboarding, all new hires must:

1. Read and sign an acknowledgement of the Information Security Policies (including this policy, POL-01, POL-02, and POL-04)
2. Acknowledge receipt of the Employee Handbook, which incorporates the security policies
3. Complete the mandatory security awareness training (see Section 6)

Acknowledgements are stored in the HR system. Annual re-acknowledgement is required.

---

## 6. Security Awareness and Training (A.6.3)

### 6.1 Onboarding Training

Within the **first week** of joining Inovy, all new employees and contractors complete the mandatory security onboarding programme. The programme covers:

| Module                            | Content                                                                                 | Duration   |
| --------------------------------- | --------------------------------------------------------------------------------------- | ---------- |
| Information security fundamentals | Why security matters at Inovy; the CIA triad; our threat model                          | 30 minutes |
| Data classification and handling  | The four classification levels; handling rules; real examples from Inovy data           | 30 minutes |
| Access control and authentication | RBAC roles; password policy; MFA setup; session security                                | 45 minutes |
| Acceptable use                    | What is and isn't permitted; cloud services; AI tools; source code                      | 30 minutes |
| Incident reporting                | How to identify and report a security incident; the incident response process           | 20 minutes |
| Remote working security           | Home office security; device security; network security                                 | 20 minutes |
| GDPR and personal data            | What counts as personal data; customer data protection obligations; data subject rights | 30 minutes |

New hires are assigned access to systems **only after completing the security onboarding programme**.

### 6.2 Annual Refresher Training

All staff complete an annual security refresher training. The refresher:

- Reviews any policy changes from the previous year
- Covers current threat landscape topics relevant to Inovy (e.g., AI-specific threats, social engineering targeting SaaS companies)
- Includes at least one scenario-based exercise
- Is completed within 30 days of the annual anniversary of the previous training
- Completion is tracked in the HR system; non-completion triggers a reminder from the Information Security Manager

### 6.3 Phishing Simulation Exercises

Inovy conducts **simulated phishing exercises** at least twice per year to test employee vigilance:

- Simulated phishing emails are sent to all employees without prior notice
- Click rates and credential submission rates are tracked (anonymously in aggregate; individually for follow-up)
- Employees who click through a simulated phishing link receive immediate targeted awareness material
- Persistent high-risk behaviour (clicking in multiple simulated exercises) triggers mandatory additional training and a conversation with the employee's manager
- Results are reported to management and used to improve the training programme

### 6.4 Role-Specific Training

Employees with access to Restricted data or with technical security responsibilities receive additional training:

| Role                  | Additional training                                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Engineers             | Secure coding practices (OWASP Top 10, injection prevention, cryptography); annual security code review workshop |
| Superadmin / Admin    | Privileged access management; social engineering targeting privileged users                                      |
| Customer-facing roles | Handling customer data requests; social engineering via customer support channels                                |

---

## 7. Disciplinary Process (A.6.4)

### 7.1 Overview

Violations of Inovy's information security policies are treated seriously and may result in disciplinary action up to and including termination of employment. The disciplinary process is fair, proportionate, and follows Dutch employment law requirements.

### 7.2 Disciplinary Stages

| Stage                                | Trigger                                                                                                                                                          | Process                                                                                                        | Documentation                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1 – Verbal warning                   | Minor first-time policy violation; oversight or lack of awareness                                                                                                | One-to-one meeting with the manager; verbal warning; additional training assigned                              | Record in HR file; signed by manager and employee                |
| 2 – Written warning                  | Repeat minor violation after verbal warning; moderate violation (e.g., committing secrets to GitHub, using unapproved services for non-sensitive data)           | Formal meeting with manager and HR; written warning issued; remediation plan agreed                            | Formal warning letter; signed by both parties; stored in HR file |
| 3 – Suspension pending investigation | Serious policy violation with potential harm to customers or data subjects; suspected intentional breach; confirmed data exposure                                | Immediate suspension with pay; formal investigation (internal or external); investigation report with findings | Investigation report; suspension notice; decision memo           |
| 4 – Termination                      | Confirmed intentional breach; serious negligence causing data breach; repeated failure to comply after written warning; violations constituting gross misconduct | Termination of contract in accordance with Dutch employment law (Wet Werk en Zekerheid)                        | Termination letter; exit checklist                               |

### 7.3 Immediate Termination for Intentional Security Breaches

Certain acts constitute gross misconduct (dringende reden) under Dutch law and may result in immediate termination (ontslag op staande voet) without following the staged process:

- Intentional exfiltration of customer data
- Deliberate sabotage of Inovy systems
- Selling or sharing Inovy intellectual property or customer data with unauthorised parties
- Bypassing security controls for personal gain
- Accessing systems or data without authorisation after being explicitly prohibited

The Information Security Manager must be involved in any decision to terminate immediately for a security breach.

### 7.4 Fair Process

All disciplinary processes follow the principles of:

- **Right to know:** The employee is informed of the allegations before any disciplinary meeting
- **Right to respond:** The employee has the opportunity to present their account
- **Right to be accompanied:** The employee may bring a colleague or trade union representative to formal disciplinary meetings
- **Proportionality:** The disciplinary response is proportionate to the severity of the breach
- **Right to appeal:** The employee has the right to appeal any disciplinary decision

---

## 8. Termination and Change of Role (A.6.5)

### 8.1 Access Revocation on Termination

Upon termination of employment (whether voluntary, involuntary, or end of contract), the following access revocation steps must be completed within **24 hours** of the effective termination date:

**Digital access:**

- [ ] Inovy web application account deactivated and all active sessions invalidated
- [ ] GitHub organisation membership removed
- [ ] Google Workspace account (email, Drive, Calendar) suspended and access removed
- [ ] Slack account deactivated
- [ ] Azure resource access (if applicable) revoked
- [ ] Neon database access revoked (if applicable)
- [ ] Upstash / Redis access revoked (if applicable)
- [ ] Any personal API keys or access tokens issued to the individual are rotated
- [ ] 1Password account removed from the Inovy team vault

**Physical access:**

- [ ] Company-issued laptop and peripherals returned (or return arranged and confirmed)
- [ ] Any physical access credentials (if applicable) returned

**Data on personal devices (BYOD):**

- [ ] Employee confirms in writing (via the exit interview or exit checklist) that all Inovy data has been deleted from personal devices, including: local copies of source code, `.env` files, downloaded recordings or transcripts, cached credentials

### 8.2 Exit Interview and Checklist

All departing employees complete an exit interview conducted by HR. The exit interview includes:

1. Return of all company assets (confirmed via the checklist above)
2. Reminder of post-termination confidentiality obligations (NDA / confidentiality clause)
3. Confirmation that the employee has no remaining access to Inovy systems
4. Opportunity for the employee to raise any security concerns before departure

The completed exit checklist is signed by the departing employee and the HR manager and stored in the HR file.

### 8.3 Change of Role

When an employee changes role within Inovy:

1. The previous role's access rights are removed
2. The new role's access rights are granted in accordance with POL-01
3. A formal access review is conducted within 5 business days of the role change to confirm that access is appropriate for the new role
4. The role change is noted in the access review log

The principle is that access rights do not carry forward automatically; they must be explicitly re-granted for the new role.

---

## 9. Confidentiality Agreements (A.6.6)

### 9.1 NDA / Confidentiality Clause

All individuals who will access Inovy information classified as Confidential or Restricted must sign a confidentiality agreement (or have equivalent terms in their employment/contractor agreement) before gaining access.

For employees, the confidentiality obligation is included in the employment contract. For contractors and third parties, a separate Non-Disclosure Agreement (NDA) is required.

The NDA / confidentiality clause must specify:

- Categories of information covered (referencing Inovy's classification scheme in POL-04)
- Duration of the obligation (minimum 3 years post-termination for customer data; indefinite for trade secrets and source code)
- Permitted disclosures (e.g., to a court or regulator if legally required)
- Consequences of breach

### 9.2 Timing

The NDA must be signed:

- Before any access to Inovy systems or data is granted
- Before the start of any work engagement (not after)
- Before attending meetings where Confidential or Restricted information is discussed

### 9.3 Maintenance

A register of signed NDAs is maintained by the Information Security Manager. NDAs are retained for the duration of the obligation plus 7 years for legal purposes.

---

## 10. Roles and Responsibilities

| Role                         | Responsibility                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| Information Security Manager | Policy ownership, training programme oversight, disciplinary involvement for security breaches |
| CEO                          | Pre-employment screening decisions for sensitive roles, termination approvals                  |
| Engineering Lead             | Technical access revocation, security awareness for engineering team                           |
| HR Manager                   | Onboarding/offboarding coordination, exit interviews, NDA register                             |
| All managers                 | Ensuring team members complete training, reporting policy violations                           |

---

## 11. Policy Review

This policy is reviewed annually or following a significant HR security event (e.g., a confirmed insider threat), a change in applicable Dutch employment law, or a significant change in the organisation structure.

| Revision | Date       | Author                       | Summary of Changes |
| -------- | ---------- | ---------------------------- | ------------------ |
| 1.0      | 2026-03-13 | Information Security Manager | Initial release    |
