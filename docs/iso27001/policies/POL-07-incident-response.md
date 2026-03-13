# Incident Response Plan

| Field              | Value                                  |
| ------------------ | -------------------------------------- |
| Document ID        | POL-07                                 |
| Version            | 1.0                                    |
| Classification     | Internal                               |
| Owner              | Information Security Manager           |
| Approved by        | CEO/CTO                                |
| Effective date     | 2026-03-13                             |
| Review date        | 2027-03-13                             |
| ISO 27001 Controls | A.5.24, A.5.25, A.5.26, A.5.27, A.5.28 |

---

## 1. Purpose

This policy defines Inovy's approach to preparing for, detecting, classifying, containing, eradicating, recovering from, and learning from information security incidents. Given that Inovy processes sensitive customer data including meeting recordings, transcripts, and personal data such as BSN numbers, a swift and structured incident response is critical to limiting harm to customers and meeting regulatory obligations under the GDPR.

## 2. Scope

This policy applies to:

- All Inovy employees, contractors, and third parties with access to Inovy systems
- All Inovy information assets (as defined in the asset register in POL-03)
- All environments: production, staging, and development
- All types of security incident, including data breaches, system compromises, availability events, and insider threats

## 3. Reference Documents

- POL-01 Access Control Policy
- POL-03 Asset Management Policy
- POL-05 Cryptography and Key Management Policy (key compromise response)
- POL-06 Supplier Security Policy (supplier-caused incidents)
- POL-08 Business Continuity and DR Plan (major availability incidents)
- POL-09 HR Security Policy (insider threat and disciplinary process)
- GDPR Article 33 (supervisory authority notification within 72 hours)
- GDPR Article 34 (notification to data subjects)
- AVG (Dutch GDPR implementation)

---

## 4. Incident Classification

All security events are assessed and assigned a priority level. The priority determines the required response time and escalation path.

### Priority Definitions

| Priority | Name     | Description                                                                                           | Examples                                                                                                                                                     | Initial response time                                         |
| -------- | -------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| P1       | Critical | Active compromise or breach with likely exposure of customer data; platform-wide availability failure | Confirmed data breach, ransomware, compromised production credentials, database exfiltration, loss of `ENCRYPTION_MASTER_KEY`                                | Immediate (within 15 minutes, 24/7)                           |
| P2       | High     | Significant security event with potential customer data impact or major service degradation           | Suspected breach pending investigation, significant unauthorised access, compromised staff account with customer data access, loss of recording availability | Within 1 hour (business hours); within 2 hours (out of hours) |
| P3       | Medium   | Security event with limited or no immediate customer data impact; moderate service disruption         | Failed brute-force attempt, phishing attempt against staff, unauthorised access attempt without confirmed access, minor DDoS                                 | Within 4 business hours                                       |
| P4       | Low      | Potential policy violation or anomaly with no confirmed security impact                               | Unusual login location, minor policy violation, suspicious but unconfirmed activity                                                                          | Within 1 business day                                         |

### Incident Categories

- **Data breach:** Unauthorised access, disclosure, or exfiltration of customer or employee personal data
- **System compromise:** Unauthorised access to Inovy infrastructure, application servers, or databases
- **Malware / ransomware:** Malicious software affecting Inovy systems or developer devices
- **Credential compromise:** API keys, passwords, or cryptographic keys that have been exposed or stolen
- **Availability incident:** Significant or prolonged service unavailability affecting customers
- **Insider threat:** Malicious or negligent actions by current or former employees or contractors
- **Supplier incident:** A security incident at a third-party supplier that affects Inovy data
- **Physical security:** Theft or loss of a company device containing or providing access to Inovy data

---

## 5. Incident Response Process

### Phase 1: Preparation (A.5.24)

Inovy maintains ongoing preparedness through:

- Security logging across all application components, capturing authentication events, data access, privileged actions, and error conditions
- Audit logs stored in Neon PostgreSQL with append-only access controls
- Monitoring and alerting via Azure Monitor and Application Insights for anomalous activity
- Defined on-call rotation for P1/P2 incidents
- Contact list for key personnel and external parties (Dutch DPA, legal counsel) maintained by the Information Security Manager
- Incident response training for all technical staff as part of annual security awareness (POL-09)
- Regular tabletop exercises: at least annually, simulating a data breach scenario

**Security logging implementation:**

The Inovy application logs the following security events using the structured security logging functions in `src/lib/security/logging.ts` (or equivalent):

- User authentication (login, logout, MFA events, failed attempts, account lockouts)
- Access to Confidential and Restricted data (recordings, transcripts, PII lookups)
- Privileged actions by `superadmin` and `admin` roles
- Role changes and permission modifications
- Organisation access attempts (including cross-organisation access blocked by `assertOrganizationAccess()`)
- Kill-switch invocations at `/api/admin/agent/kill-switch`
- API key usage and OAuth token operations
- SAS token generation for Azure Blob Storage
- Data export and GDPR deletion requests

Logs include: timestamp (UTC), actor identity (user ID, email), action, target resource, source IP address, user agent, and outcome (success/failure).

### Phase 2: Detection and Identification (A.5.25)

Security incidents may be detected through:

- Automated alerting from Azure Monitor (error rate spikes, unusual geographic access patterns, failed authentication volume)
- Application Insights anomaly detection
- Security logging analysis (mass data access, repeated authorisation failures)
- Employee reports (phishing emails, lost devices, suspicious behaviour)
- Customer reports (unexpected account activity, data exposure notifications)
- Third-party notifications (GitHub secret scanning, Dependabot critical alerts, supplier incident notifications)
- External vulnerability researchers (responsible disclosure programme)

**Detection responsibility:** All Inovy employees are responsible for reporting suspected security events. Reports are directed to the Information Security Manager via `security@inovy.app` or the designated incident Slack channel (`#security-incidents`).

**Avoiding false positive fatigue:** Alert thresholds are tuned to minimise false positives. All alerts are triaged by on-call personnel before escalation.

### Phase 3: Triage and Assessment

Upon receiving an incident report:

1. **Assign a priority** (P1-P4) based on the classification criteria in Section 4
2. **Assign an Incident Lead:** The Information Security Manager leads all P1/P2 incidents. Engineering Lead may lead P3/P4 incidents with ISM oversight
3. **Open an incident record** in the designated incident tracking system (GitHub private issue or equivalent) with timestamp, initial description, priority, and assigned lead
4. **Notify key stakeholders** according to the escalation matrix in Section 8
5. **Assess scope:** What systems, data, and individuals are affected? Is the incident ongoing or contained?

### Phase 4: Containment (A.5.26)

Containment actions are taken to prevent further harm. The scope and aggressiveness of containment is proportional to the severity:

**Immediate containment actions (P1/P2):**

- **Kill-switch activation:** The `/api/admin/agent/kill-switch` endpoint (restricted to `superadmin`) can be invoked to immediately halt all AI agent processing across the platform, preventing continued automated data processing during a suspected AI-related incident
- **Session invalidation:** All active user sessions for affected accounts are invalidated via the Better Auth session management interface
- **Credential rotation:** Compromised API keys, database passwords, or encryption keys are immediately rotated (see POL-05 Section 9)
- **Network isolation:** Compromised Azure Container App instances are scaled down and removed from the load balancer; traffic is rerouted to clean instances
- **Account suspension:** Compromised or suspect user accounts are suspended; access is revoked in accordance with POL-01

**Preservation for forensics:**

Before taking containment actions, capture:

- A snapshot of relevant application logs from Azure Monitor and Application Insights
- Database query logs from Neon for the suspected timeframe
- Network traffic logs from Azure
- Screenshots or recordings of suspicious behaviour

Containment actions that may destroy evidence (e.g., deleting a compromised container) must be balanced against the need to preserve evidence. Where evidence preservation is in conflict with containment, the Incident Lead decides based on the severity of ongoing harm.

### Phase 5: Eradication

Once contained, the root cause is identified and eliminated:

- Compromised credentials are rotated and old credentials destroyed
- Malicious code or backdoors are identified through source code review and removed
- Vulnerable dependencies are patched or replaced
- Misconfigured resources are corrected
- Attacker infrastructure (IP ranges, domains) is blocked at the network layer
- All affected systems are scanned for indicators of compromise before re-introduction to production

### Phase 6: Recovery

Systems are restored to normal operation:

1. Restore services from clean backups if necessary (see POL-08 for recovery procedures)
2. Verify integrity of restored data (checksums, consistency checks)
3. Gradually restore service, monitoring closely for signs of re-compromise
4. Confirm that all containment and eradication steps are complete before declaring recovery
5. Notify affected customers when service is restored

### Phase 7: Evidence Collection (A.5.28)

All evidence collected during the incident is handled in accordance with chain-of-custody requirements:

- Log extracts are stored in a designated, access-controlled incident evidence store
- Evidence is timestamped and its source is documented
- Evidence is not modified; copies are taken for analysis
- Physical devices (if relevant) are preserved and not used after seizure
- Evidence is retained for a minimum of 3 years or as required by legal proceedings
- Access to evidence is restricted to the Incident Lead, the Information Security Manager, and legal counsel

The following evidence types are routinely collected:

- Application and infrastructure logs from the relevant timeframe
- Neon database access logs
- Azure Activity Log entries
- GitHub Actions pipeline logs
- Network access logs
- Relevant source code versions and commit history

### Phase 8: Post-Incident Review (A.5.27)

Within **5 business days** of incident closure, a post-incident review (PIR) is conducted. The PIR includes:

1. **Timeline reconstruction:** Chronological account of how the incident was detected, what actions were taken, and when
2. **Root cause analysis:** What was the underlying cause of the incident? Use the "5 Whys" technique or a fishbone diagram
3. **Impact assessment:** What data was affected? How many customers and employees? What was the business impact?
4. **Response effectiveness:** What went well? What could have been better? Were the classification and escalation appropriate?
5. **Action items:** Specific, measurable improvements to prevent recurrence, assigned to owners with due dates
6. **Lessons learned:** Summary for security awareness training

The PIR report is stored in the incident record and shared with the management team. Action items are tracked to completion.

---

## 6. Data Breach Notification

### 6.1 Dutch DPA Notification (GDPR Article 33)

If a personal data breach has occurred (or is suspected), Inovy must notify the **Autoriteit Persoonsgegevens (Dutch DPA)** within **72 hours** of becoming aware of the breach.

**Contact:** https://www.autoriteitpersoonsgegevens.nl/meldformulier-datalekken

The notification must include:

- Nature of the breach (category and approximate number of records affected)
- Categories and approximate number of data subjects affected
- Contact details of the Data Protection Officer or Information Security Manager
- Likely consequences of the breach
- Measures taken or proposed to address the breach

If full information is not available within 72 hours, an initial notification is submitted with the information available, followed by supplementary notifications as more information becomes known.

### 6.2 Data Subject Notification (GDPR Article 34)

If the breach is likely to result in a high risk to the rights and freedoms of data subjects (e.g., exposure of BSN numbers, health data in recordings, financial information), affected data subjects are notified directly.

The notification is sent by email to the affected individual's registered email address and must include:

- A plain-language description of what happened
- The categories of personal data involved
- What Inovy is doing to address the breach
- What the individual can do to protect themselves
- The contact details for the Information Security Manager / DPO

### 6.3 Management Notification

For P1 and P2 incidents:

- **CEO and CTO are notified immediately** (within 1 hour of P1 classification)
- Legal counsel is engaged within 4 hours for any confirmed personal data breach
- The Board (if applicable) is informed within 24 hours

### 6.4 Supplier-Caused Breaches

If a breach is caused by a third-party supplier:

1. The supplier's incident notification is the trigger for Inovy's own incident response
2. The 72-hour DPA notification clock starts from when Inovy becomes aware (not when the supplier was breached)
3. Inovy notifies affected data subjects even if the breach occurred at the supplier
4. The supplier incident is recorded in the supplier risk register (POL-06)

---

## 7. Escalation Matrix

| Scenario               | Notified immediately                           | Notified within 1 hour  | Notified within 4 hours                            |
| ---------------------- | ---------------------------------------------- | ----------------------- | -------------------------------------------------- |
| P1 (active breach)     | Information Security Manager, Engineering Lead | CEO, CTO, Legal counsel | Dutch DPA (if personal data), affected customers   |
| P2 (suspected breach)  | Information Security Manager, Engineering Lead | CTO                     | CEO (if confirmed personal data impact)            |
| P3 (significant event) | Information Security Manager                   | Engineering Lead        | —                                                  |
| P4 (low severity)      | Information Security Manager                   | —                       | —                                                  |
| Supplier incident      | Information Security Manager                   | Engineering Lead        | — (follow P1/P2 if confirmed personal data impact) |

---

## 8. Incident Response Team

| Role                         | Incident responsibility                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Information Security Manager | Incident Lead for P1/P2; DPA notification; management escalation; PIR facilitation |
| Engineering Lead             | Technical containment, eradication, and recovery; forensic log collection          |
| CTO                          | Executive decision-making; customer and media communications approval              |
| CEO                          | Board and investor notification; regulatory liaison (if escalated)                 |
| Legal counsel (external)     | Legal obligations assessment; DPA notification review; litigation hold             |
| On-call engineer             | Initial detection and triage; immediate containment for P1 out-of-hours            |

---

## 9. Post-Incident Improvement

The action items generated by the PIR are tracked in the engineering backlog and reviewed monthly by the Information Security Manager. The PIR itself is classified as **Confidential** and stored in a restricted-access document store.

Patterns across multiple incidents (recurring root causes, repeated policy violations) are addressed through:

- Architecture changes (shifting controls left in the development process)
- Additional security training (POL-09)
- Policy updates

---

## 10. Policy Review

This policy is reviewed annually, following a significant security incident, or when applicable regulations change.

| Revision | Date       | Author                       | Summary of Changes |
| -------- | ---------- | ---------------------------- | ------------------ |
| 1.0      | 2026-03-13 | Information Security Manager | Initial release    |
