# Security Awareness & Training Program

| Field              | Value                        |
| ------------------ | ---------------------------- |
| Document ID        | POL-11                       |
| Version            | 1.0                          |
| Classification     | Internal                     |
| Owner              | Information Security Manager |
| Approved by        | CEO/CTO                      |
| Effective date     | 2026-03-13                   |
| Review date        | 2027-03-13                   |
| ISO 27001 Controls | A.6.3, A.6.8                 |

---

## 1. Purpose

This policy establishes Inovy's Security Awareness and Training Program to ensure that all personnel understand their information security responsibilities, are equipped to recognise and respond to threats, and actively contribute to the protection of Inovy's information assets and the personal data of its customers. As an AI-powered meeting recording SaaS processing sensitive meeting content, transcripts, and personally identifiable information (including BSN numbers), Inovy's security posture depends critically on the informed behaviour of every team member.

## 2. Scope

This policy applies to:

- All Inovy employees, regardless of role or location
- Contractors and temporary staff with access to Inovy systems or data
- Third-party developers working under a services agreement
- New hires during their onboarding period

This policy covers all training activities related to information security awareness, including onboarding training, annual refreshers, role-specific technical training, and ad-hoc training triggered by incidents or significant changes.

## 3. Roles and Responsibilities

| Role                               | Responsibility                                                                                                                               |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Information Security Manager (ISM) | Owns this policy; designs and maintains the training programme; tracks completion; updates content following incidents or regulatory changes |
| People Operations / HR             | Coordinates onboarding training scheduling; ensures new hires complete mandatory training before being granted full system access            |
| Engineering Lead                   | Ensures engineers complete secure coding training; integrates security requirements into engineering onboarding                              |
| All Managers                       | Ensure direct reports complete required training within deadlines; escalate non-compliance to ISM                                            |
| All Staff                          | Complete all assigned training modules within the specified timeframes; report security events without delay                                 |

## 4. Training Programme

### 4.1 Onboarding Training (A.6.3)

All new hires must complete the mandatory security awareness module during their **first week** of employment, before being granted access to production systems or customer data.

**Completion gate**: People Ops confirms training completion in TPL-08 (Training & Compliance Tracker) before the ISM or Engineering Lead grants production access credentials.

The onboarding module covers:

1. **Inovy's information security policy overview** — classification scheme, acceptable use, consequences of policy violations
2. **Password hygiene** — use of 1Password (company-provided password manager), minimum 16-character passphrases, unique credentials per service, MFA on all accounts
3. **Phishing and social engineering** — recognising spear-phishing targeting Inovy's SaaS integrations (Microsoft 365, Google Workspace, Stripe), vishing, pretexting; reporting suspicious emails to ISM via `security@inovico.nl` or the `#security` Slack channel
4. **Data classification** — Inovy's four-tier classification (Public / Internal / Confidential / Restricted); what constitutes Restricted data (meeting recordings, transcripts, BSN numbers, API keys, OAuth tokens)
5. **Incident reporting procedure** — what constitutes a security event, how to report immediately, the no-blame culture for good-faith reporters
6. **GDPR basics** — lawful basis for processing meeting data, data subject rights (access, erasure, portability), data minimisation, prohibition on processing customer data outside approved tooling
7. **Remote work security** — WPA2/WPA3 Wi-Fi, VPN usage, clear desk, screen lock, prohibition on conducting sensitive conversations in public spaces
8. **Acceptable use** — approved software list, prohibition on installing unapproved tools on company devices, no customer data in personal cloud storage

**Format**: Self-paced online module (estimated 90 minutes) hosted on Inovy's internal learning platform, followed by a short assessment (minimum 80% pass mark). Failed assessments require a retake within 48 hours.

### 4.2 Annual Security Refresher Training (A.6.3)

All personnel complete an annual refresher training module by **31 March each year**. The ISM updates the module content in Q1 to reflect:

- New threats observed during the preceding year (e.g., AI-specific attack patterns, prompt injection attacks targeting Inovy's AI pipeline)
- Lessons learned from security incidents or near-misses
- Regulatory changes affecting GDPR, Dutch UAVG, or ePrivacy compliance
- Changes to Inovy's technology stack or third-party integrations

The annual refresher covers all onboarding topics in abbreviated form, plus any new content. Engineers additionally complete a secure coding refresher (see Section 4.4).

**Completion target**: 100% of all active personnel by 31 March. The ISM reports completion rates to the management review meeting in Q2.

### 4.3 Ad-Hoc Training (Post-Incident / Change-Triggered)

Ad-hoc training is triggered by:

- **Post-incident**: Following any confirmed security incident (regardless of severity), the ISM assesses whether targeted awareness training is required. If a phishing attack succeeded, all staff receive an immediate phishing awareness module within 5 business days. If a data handling error occurred, the relevant team receives targeted GDPR/data classification training.
- **Significant technology changes**: When Inovy introduces a new third-party integration (e.g., a new AI provider), or makes significant changes to the authentication stack (Better Auth roles, OAuth flows), affected engineers and administrators receive targeted security briefings before the change is deployed to production.
- **Regulatory changes**: Material changes to GDPR guidance, Dutch DPA enforcement actions, or new NEN 7510 guidance trigger a briefing to all affected roles within 30 days.
- **Threat intelligence**: If the ISM identifies a credible emerging threat relevant to Inovy's stack (e.g., a novel prompt injection technique targeting AI SaaS platforms), an advisory is distributed via Slack `#security` with a mandatory acknowledgement response.

### 4.4 Role-Specific Training: Secure Coding (Engineers)

All engineers (backend, frontend, full-stack) complete the following in addition to the general programme:

**Onboarding (first two weeks)**:

1. **Inovy secure coding standards** — as documented in POL-13 (Secure Development Lifecycle Policy) and the `docs/iso27001/` reference library
2. **Zod schema validation** — correct usage patterns; understanding why runtime validation is required even with TypeScript strict mode
3. **Drizzle ORM and parameterised queries** — prohibition on raw SQL string concatenation; understanding of SQL injection risks in the context of Neon PostgreSQL
4. **PII handling in code** — use of `pii-utils.ts` for HMAC-SHA256 anonymisation; correct use of Pino log redaction fields (`password`, `apiKey`, `token`, `accessToken`, `refreshToken`, `secret`, `authorization`, `cookie`, `sessionId`, `email`); prohibition on logging BSN or meeting content
5. **AI prompt injection awareness** — understanding of Inovy's 18+ pattern detection library; never interpolating unvalidated user input into AI system prompts
6. **Secrets management** — use of GitHub Actions secrets and Azure environment variables; pre-commit secret scanning hooks; prohibition on committing `.env` files or API keys
7. **Better Auth RBAC** — understanding of the six-role model (`superadmin`, `owner`, `admin`, `manager`, `user`, `viewer`); principle of least privilege in permission checks; organisation isolation at the data layer

**Annual refresher (engineers)**:

- Review of OWASP Top 10 changes relevant to Next.js 16 / Server Components
- Review of any CVEs affecting Inovy's dependency tree identified by Dependabot or `pnpm audit`
- Update on any changes to the AI security landscape (prompt injection, model exfiltration)

## 5. Security Event Reporting (A.6.8)

### 5.1 Reporting Obligation

All Inovy personnel are required to report **immediately** any actual or suspected information security event. Prompt reporting is critical to minimising the impact of incidents and fulfilling Inovy's regulatory obligations under GDPR Article 33 (72-hour breach notification to the Dutch DPA).

A security event includes but is not limited to:

- Receipt of a suspicious email, text, or phone call requesting credentials, access, or sensitive information
- Accidental disclosure of customer meeting data, transcripts, or PII to an unauthorised party
- Loss or theft of a company device or any device containing Inovy data
- Unauthorised access or an attempted login to any Inovy system
- Discovery of credentials (API keys, tokens, passwords) committed to a repository or transmitted in plain text
- Malware or ransomware infection on any device used for Inovy work
- Observation of unusual system behaviour (unexpected data exports, unusual API calls to Deepgram, OpenAI, or Recall.ai, unexplained permission changes)
- Accidental sharing of a meeting recording or transcript with the wrong organisation

### 5.2 Reporting Channels

| Priority               | Channel                                                 | Response Time                     |
| ---------------------- | ------------------------------------------------------- | --------------------------------- |
| Immediate / Critical   | Slack `#security` channel + email `security@inovico.nl` | ISM responds within 1 hour        |
| Urgent                 | Email `security@inovico.nl`                             | ISM responds within 4 hours       |
| Non-urgent observation | Slack `#security` channel                               | ISM reviews within 1 business day |

If the ISM is unavailable, reports should be escalated to the CTO directly.

### 5.3 What to Include in a Report

When reporting a security event, provide as much of the following information as possible:

1. **What happened** — a factual description of the observed event or anomaly
2. **When it happened** — date and time (UTC preferred) of the event or when it was discovered
3. **Systems affected** — which Inovy applications, databases, integrations, or devices are involved (e.g., "the Neon production database", "my company MacBook", "the OpenAI API key in the staging environment")
4. **Actions already taken** — any immediate steps taken (e.g., "I revoked the API key in the OpenAI dashboard", "I disconnected the laptop from the network")
5. **Your contact details** — so the ISM can follow up quickly

Do not delay reporting to gather more information. An incomplete but timely report is always preferable to a complete but delayed one.

### 5.4 No-Blame Culture

Inovy operates a **no-penalty policy** for good-faith reporting of security events. Personnel who report security events promptly and honestly will not face disciplinary action as a result of their report, even if they caused or contributed to the event inadvertently.

This protection applies to:

- Clicking a phishing link accidentally
- Accidentally sending a meeting recording to the wrong recipient
- Committing a secret to a branch before the pre-commit hook was active
- Misconfiguring an access permission

This protection does **not** apply to deliberate, malicious, or grossly negligent actions, or to concealing a security event after discovery.

### 5.5 Handling of Reported Events

Upon receiving a report, the ISM will:

1. Acknowledge receipt within the timeframes specified in Section 5.2
2. Initiate triage to determine whether the event constitutes a security incident requiring escalation under POL-07 (Incident Management Policy)
3. Communicate with the reporter to gather additional information if needed
4. Preserve evidence (logs, screenshots, affected artefacts) before any remediation
5. Assess GDPR breach notification obligations (72-hour clock to Dutch DPA if personal data is involved)

## 6. Measurement and Effectiveness

### 6.1 Training Completion Tracking

Training completion is tracked in **TPL-08 (Training & Compliance Tracker)**. The ISM maintains this register with:

- Employee name and role
- Date of onboarding security training completion
- Assessment score
- Date of most recent annual refresher completion
- Any ad-hoc training completed and its trigger
- Outstanding training assignments

**Target**: 100% completion rate for all mandatory training. Any personnel with overdue training are flagged to their manager and the ISM escalates to the CEO if not resolved within 10 business days of the deadline.

### 6.2 Phishing Simulation

The ISM conducts simulated phishing exercises at least **twice per year** using phishing simulation tooling. Simulations are:

- Designed to reflect realistic threats to Inovy (e.g., spoofed GitHub notifications, spoofed Stripe payment alerts, spoofed Microsoft 365 login pages)
- Unannounced to staff
- Proportionate and not designed to embarrass individuals

Results are anonymised before being shared in management reviews. Individuals who repeatedly click simulation links receive targeted one-to-one coaching, not disciplinary action.

Simulation metrics tracked:

- Click-through rate per simulation (target: below 10%)
- Report rate (target: above 50% of recipients report the simulation)
- Trend over time

### 6.3 Management Review Reporting

The ISM presents training programme effectiveness metrics at the bi-annual management review meeting, including:

- Training completion rates (vs. 100% target)
- Phishing simulation results and trends
- Number of security events reported and their outcomes
- Lessons learned from incidents incorporated into training content
- Proposed content updates for the next cycle

## 7. Training Content Management

### 7.1 Content Updates

Training content is reviewed and updated:

- **Annually** in Q1 before the annual refresher rollout
- **Within 30 days** of a significant incident affecting Inovy or a comparable AI SaaS company
- **Within 30 days** of material regulatory changes
- **As needed** following introduction of new technology or third-party integrations

All training content is version-controlled and stored in Inovy's internal documentation system. Previous versions are retained for audit purposes.

### 7.2 Reference Documentation

Staff are encouraged to bookmark and refer to the Inovy security documentation library at `docs/iso27001/` which serves as the authoritative internal reference for all information security policies, procedures, and guidelines applicable to their role.

## 8. Non-Compliance

Failure to complete mandatory security awareness training by the required deadline, or failure to report known security events, constitutes a violation of this policy. Non-compliance is handled in accordance with Inovy's disciplinary procedures, taking into account the circumstances and any mitigating factors. Repeated or wilful non-compliance may result in suspension of system access pending completion of training or investigation.

## 9. Related Documents

| Document                            | Reference |
| ----------------------------------- | --------- |
| Information Security Policy         | POL-01    |
| Incident Management Policy          | POL-07    |
| Clear Desk & Screen Lock Policy     | POL-10    |
| Secure Development Lifecycle Policy | POL-13    |
| Data Protection & Privacy Policy    | POL-15    |
| Training & Compliance Tracker       | TPL-08    |

## 10. Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
