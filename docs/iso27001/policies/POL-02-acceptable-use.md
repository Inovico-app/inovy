# Acceptable Use Policy

| Field              | Value                        |
| ------------------ | ---------------------------- |
| Document ID        | POL-02                       |
| Version            | 1.0                          |
| Classification     | Internal                     |
| Owner              | Information Security Manager |
| Approved by        | CEO/CTO                      |
| Effective date     | 2026-03-13                   |
| Review date        | 2027-03-13                   |
| ISO 27001 Controls | A.5.10                       |

---

## 1. Purpose

This policy establishes the rules governing the acceptable use of Inovy's information assets, technology resources, and third-party services. It protects Inovy, its employees, and its customers by clearly defining permitted and prohibited activities, ensuring that company resources are used lawfully, ethically, and in accordance with Inovy's security posture.

## 2. Scope

This policy applies to:

- All Inovy employees (full-time and part-time), contractors, interns, and temporary workers
- All third parties who have been granted access to Inovy systems or data
- All Inovy-owned or managed devices, systems, accounts, and services
- All activities performed using Inovy's name, credentials, or infrastructure, regardless of location

As a remote-first Dutch company, this policy applies equally whether work is performed from a home office, co-working space, or any other location.

## 3. Reference Documents

- POL-01 Access Control Policy
- POL-04 Information Classification and Handling Policy
- POL-09 HR Security Policy (including the disciplinary process referenced in Section 11)
- POL-10 Remote Working Policy

---

## 4. Company Device Use

### 4.1 Acceptable Use of Company Devices

Company-issued devices (laptops, mobile phones, and any equipment provided by Inovy) are primarily intended for business use. Incidental personal use is permitted provided it does not:

- Interfere with job performance or productivity
- Violate any other section of this policy
- Expose the device to malware or security risk
- Consume excessive bandwidth or storage

All company devices must have the following security controls applied as a condition of use:

- Full-disk encryption enabled (FileVault on macOS, BitLocker on Windows)
- Automatic screen lock after 5 minutes of inactivity
- Operating system and applications kept up to date with security patches within 14 days of release
- Approved endpoint protection (antivirus/EDR) installed and active
- No jailbreaking, rooting, or removal of security controls

### 4.2 Personal Devices (BYOD)

Inovy operates a remote-first environment. Personal devices used for work purposes must meet the minimum security standards defined in POL-10. Specifically:

- Full-disk encryption must be enabled
- A PIN or biometric screen lock must be set
- Personal devices must not be used to store Confidential or Restricted information locally
- Customer meeting recordings, transcripts, and other Restricted data must not be downloaded to personal devices except under explicitly approved circumstances with an approved secure container

---

## 5. Email and Communications

### 5.1 Corporate Email

All official business communications must use the Inovy corporate email domain. Corporate email accounts:

- Must not be used for commercial activity unrelated to Inovy's business
- Must not be used to subscribe to services that are unrelated to work duties
- Must not be used to transmit or receive sexually explicit, harassing, discriminatory, or otherwise offensive material

When sending Confidential or Restricted information by email:

- Verify the recipient address carefully before sending
- Do not send unencrypted Restricted information (encryption keys, API secrets, personal health data, BSN numbers) by email under any circumstances
- Use secure file transfer or the Inovy platform's built-in sharing features where possible

### 5.2 Approved Communication Tools

The following communication tools are approved for use with Inovy business content:

| Tool                                     | Approved use                           | Restriction                                                                  |
| ---------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| Inovy corporate email (Google Workspace) | All business communications            | Confidential/Restricted data only with encryption or approved secure channel |
| Slack (company workspace)                | Internal team communication            | No API keys, passwords, or Restricted data in Slack channels                 |
| Notion                                   | Documentation and knowledge management | Internal and Confidential only                                               |
| GitHub                                   | Source code, issues, pull requests     | No secrets in commits or issues                                              |
| Zoom/Google Meet                         | Video meetings                         | Do not record sensitive conversations without participant consent            |

Personal communication tools (WhatsApp, Facebook Messenger, personal email accounts, etc.) must not be used to transmit any Confidential or Restricted Inovy information.

---

## 6. Source Code Repositories

### 6.1 GitHub Repository Usage

All source code written for Inovy must be committed to the Inovy GitHub organisation's private repository. The following rules apply:

- **Secrets and credentials must never be committed.** This includes API keys, passwords, connection strings, `.env` files, and private keys. The repository has secret scanning enabled; any accidental commit must be reported immediately and treated as a security incident
- **Personal GitHub accounts must not host Inovy source code.** Forks to personal accounts are prohibited
- **Branch protection rules must not be bypassed.** The `main` branch requires peer review and passing CI checks before merge
- **Third-party code must be licensed compatibly.** Dependencies with GPL or other copyleft licences require approval from the Engineering Lead before inclusion
- Commit messages should be descriptive and follow the agreed conventional commits format

### 6.2 Intellectual Property

All code, documentation, designs, and other work product created during the course of employment with Inovy is the intellectual property of Inovy B.V. unless otherwise agreed in writing.

---

## 7. Cloud Services and Infrastructure

### 7.1 Approved Cloud Services

Only the following cloud services are approved for use with Inovy data:

- **Compute and hosting:** Azure Container Apps
- **Database:** Neon PostgreSQL (EU-Central-1)
- **Object storage:** Azure Blob Storage (West Europe)
- **Vector database:** Qdrant (cloud-hosted)
- **Cache:** Upstash Redis
- **AI services:** OpenAI, Anthropic, Deepgram (as contracted third-party processors)
- **Email delivery:** Resend
- **Payments:** Stripe
- **Source control and CI/CD:** GitHub and GitHub Actions

### 7.2 Unauthorised Cloud Services

Employees must not use unauthorised cloud services to process, store, or transfer Inovy customer data or Internal/Confidential/Restricted information. This includes:

- Personal Dropbox, Google Drive, iCloud, or OneDrive accounts
- Unapproved AI services or chatbots (e.g., uploading customer transcripts to an unapproved AI tool)
- Shadow IT — services adopted by an individual without security review

Requests to use new cloud services must be raised with the Engineering Lead and reviewed under the supplier assessment process in POL-06.

### 7.3 CI/CD Pipelines

GitHub Actions pipelines are the approved mechanism for automated builds, tests, and deployments. Manual deployments to production that bypass the pipeline are prohibited except in declared emergency situations, which must be documented and reviewed post-incident.

---

## 8. AI Tools

### 8.1 AI-Assisted Development

AI coding assistants (e.g., GitHub Copilot, Claude Code, Cursor) may be used for development activities provided that:

- Customer data (recordings, transcripts, personal data) is not pasted into AI tool prompts
- Generated code is reviewed before committing, with particular attention to security vulnerabilities and licence compliance
- AI-generated code containing potential secrets, hard-coded credentials, or suspicious patterns is investigated before use

### 8.2 AI Services in the Inovy Platform

Inovy's platform integrates with OpenAI, Anthropic, and Deepgram as approved third-party AI processors. When using these integrations:

- Customer data is processed under the terms of signed Data Processing Agreements (DPAs)
- Meeting recordings and transcripts are transmitted to these services only for approved processing tasks (transcription, summarisation, analysis)
- No additional customer data should be sent to these services outside of approved platform workflows

### 8.3 Prohibited AI Uses

The following uses of AI tools are prohibited:

- Uploading customer recordings, transcripts, or personal data to unapproved AI services
- Using AI services to attempt to bypass or circumvent security controls
- Using AI services to generate content that violates applicable law or Inovy's code of conduct

---

## 9. Internet and Network Use

### 9.1 Acceptable Internet Use

Internet access is provided for business purposes. Incidental personal browsing is acceptable provided it does not:

- Expose devices to malware (e.g., visiting phishing sites, downloading pirated software)
- Violate applicable law (e.g., accessing illegal content)
- Interfere with work performance

### 9.2 Prohibited Internet Activity

The following activities are prohibited:

- Accessing, downloading, or distributing pornographic, extremist, or otherwise illegal content
- Downloading pirated software, films, or other copyrighted material
- Attempting to access systems or data without authorisation (hacking, port scanning external networks, etc.)
- Conducting any activity that could expose Inovy to legal liability
- Mining cryptocurrency using company devices or infrastructure

### 9.3 Network Security

- Public Wi-Fi must not be used for accessing Confidential or Restricted Inovy systems without VPN. Refer to POL-10 for remote working network requirements
- Employees must not connect unauthorised devices to any network segment used by Inovy infrastructure

---

## 10. Monitoring Notice

Inovy reserves the right to monitor the use of company-provided devices, systems, accounts, and network traffic to the extent permitted by Dutch law (Wet op de ondernemingsraden, General Data Protection Regulation). Monitoring may be conducted for:

- Security incident investigation
- Detecting policy violations
- Ensuring availability and performance of systems

Employees will be notified of monitoring activities in their employment contract. Monitoring is conducted proportionately and with documented justification. Personal data collected through monitoring is handled in accordance with Inovy's Privacy Policy and GDPR obligations.

---

## 11. Consequences of Violation

Violations of this Acceptable Use Policy are subject to the disciplinary process defined in **POL-09 Section 4**. The severity of the disciplinary action will be proportionate to the nature and impact of the violation:

| Severity | Examples                                                                       | Typical response                                                        |
| -------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Minor    | Incidental personal browsing, minor AUP oversight                              | Verbal warning, additional training                                     |
| Moderate | Using unapproved tools with non-sensitive data, policy non-compliance          | Written warning, mandatory retraining                                   |
| Serious  | Committing secrets to GitHub, using unapproved services for customer data      | Written warning, access restriction, formal investigation               |
| Critical | Intentional data exfiltration, deliberate security bypass, unauthorised access | Immediate suspension, potential termination, possible criminal referral |

Violations that constitute a data breach under GDPR will also trigger the incident response process defined in POL-07.

---

## 12. Roles and Responsibilities

| Role                          | Responsibility                                                            |
| ----------------------------- | ------------------------------------------------------------------------- |
| Information Security Manager  | Policy owner, investigating serious violations, monitoring oversight      |
| Engineering Lead              | Reviewing and approving new tools, enforcing source code policies         |
| All employees and contractors | Reading, understanding, and complying with this policy                    |
| Managers                      | Ensuring team members are trained on this policy and reporting violations |

---

## 13. Acknowledgement

All employees and contractors must acknowledge that they have read and understood this policy as part of their onboarding process. Acknowledgements are recorded in the HR system. Annual re-acknowledgement is required.

---

## 14. Policy Review

This policy is reviewed annually or following a significant change in technology usage, a policy violation, or a relevant legal or regulatory change.

| Revision | Date       | Author                       | Summary of Changes |
| -------- | ---------- | ---------------------------- | ------------------ |
| 1.0      | 2026-03-13 | Information Security Manager | Initial release    |
