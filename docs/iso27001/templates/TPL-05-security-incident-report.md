# TPL-05: Security Incident Report

| Document ID       | TPL-05                                                      |
| ----------------- | ----------------------------------------------------------- |
| Version           | 1.0                                                         |
| Last Updated      | 2026-03-13                                                  |
| Owner             | ISMS Manager / Security Lead                                |
| Related Documents | Incident Response Policy, TPL-04 CAR, ISMS-09 Risk Register |
| Retention         | 5 years minimum (DPA notification records: 6 years)         |
| Review Cycle      | Completed for each security incident                        |

---

## Instructions

Complete this form for every security incident. Raise an incident as soon as detected — initial fields can be completed with partial information and updated as the investigation progresses. Assign a sequential ID using **INC-YYYY-NNN** (e.g., INC-2026-001).

For personal data breaches: Article 33 GDPR / Dutch AVG requires notification to the Autoriteit Persoonsgegevens within **72 hours** of becoming aware. Do not delay completing Section 7.

---

## Severity Levels

| Severity | Label    | Definition                                                                                                                                | Initial Response SLA                                      |
| -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **P1**   | Critical | Active breach of customer data; service completely down; ransomware; regulatory breach; ongoing attack                                    | Immediate — ISMS Manager + CEO notified within 15 minutes |
| **P2**   | High     | Suspected breach under investigation; significant service degradation; privileged credential compromise; potential personal data exposure | Within 1 hour of detection                                |
| **P3**   | Medium   | Isolated security event; minor data exposure (non-personal); policy violation; phishing attempt (unsuccessful)                            | Within 4 hours of detection                               |
| **P4**   | Low      | Near miss; minor policy violation; suspicious but unconfirmed activity; informational                                                     | Within 24 hours of detection                              |

---

## Section 1: Incident Identification

| Field                    | Value                                                                                                                                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Incident ID**          | INC-YYYY-NNN                                                                                                                                                                                                                                               |
| **Date / Time Detected** |                                                                                                                                                                                                                                                            |
| **Date / Time Reported** |                                                                                                                                                                                                                                                            |
| **Reported By**          | Name, role, contact                                                                                                                                                                                                                                        |
| **Detection Method**     | [ ] Monitoring alert [ ] User report [ ] Supplier notification [ ] Penetration test [ ] External report [ ] Audit finding [ ] Other:                                                                                                                       |
| **Incident Severity**    | [ ] P1 – Critical [ ] P2 – High [ ] P3 – Medium [ ] P4 – Low                                                                                                                                                                                               |
| **Incident Type**        | [ ] Unauthorised access [ ] Data breach/exfiltration [ ] Malware/ransomware [ ] Phishing/social engineering [ ] DDoS/availability [ ] Credential compromise [ ] Insider threat [ ] Physical security [ ] Supplier incident [ ] Policy violation [ ] Other: |
| **Incident Manager**     |                                                                                                                                                                                                                                                            |
| **Status**               | [ ] Open [ ] Contained [ ] Resolved [ ] Closed                                                                                                                                                                                                             |

---

## Section 2: Incident Description

**Summary** _(2–5 sentences — what happened, where, when, initial impact assessment):_

**Detailed Description:**

---

## Section 3: Systems and Data Affected

### Systems Affected

| System / Service                  | Component | Affected (Y/N) | Impact Description |
| --------------------------------- | --------- | -------------- | ------------------ |
| Next.js Web Application (Vercel)  |           |                |                    |
| Neon PostgreSQL Database          |           |                |                    |
| Qdrant Vector Database            |           |                |                    |
| Deepgram Transcription Service    |           |                |                    |
| OpenAI Integration                |           |                |                    |
| BetterAuth Authentication Service |           |                |                    |
| Resend Email Service              |           |                |                    |
| GitHub / Source Code Repositories |           |                |                    |
| Team Communication Tools          |           |                |                    |
| Employee Devices / Endpoints      |           |                |                    |
| Other:                            |           |                |                    |

### Data Affected

| Field                                | Value                                                                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personal data involved?**          | [ ] Yes [ ] No [ ] Under investigation                                                                                                                                                   |
| **Data categories affected**         | [ ] Names [ ] Email addresses [ ] Meeting recordings (audio) [ ] Meeting transcripts [ ] AI summaries [ ] Action items [ ] Authentication credentials [ ] Payment information [ ] Other: |
| **Estimated volume**                 | Approx. number of records / users affected                                                                                                                                               |
| **Data classification**              | [ ] Public [ ] Internal [ ] Confidential [ ] Restricted                                                                                                                                  |
| **Data subjects (if personal data)** | [ ] Inovy employees [ ] Customer end-users [ ] Third parties [ ] Unknown                                                                                                                 |
| **Data residency**                   | Where was the data stored/processed at time of incident?                                                                                                                                 |
| **Data exfiltrated?**                | [ ] Confirmed [ ] Suspected [ ] No [ ] Unknown                                                                                                                                           |

---

## Section 4: Timeline of Events

_Record all known events in chronological order. Include UTC timestamps where possible._

| Date / Time (UTC) | Event                            | Source / Evidence |
| ----------------- | -------------------------------- | ----------------- |
|                   | Incident origin (estimated)      |                   |
|                   | Incident detected                |                   |
|                   | Incident reported                |                   |
|                   | Initial response initiated       |                   |
|                   | Containment actions taken        |                   |
|                   | Scope assessment completed       |                   |
|                   | Root cause identified            |                   |
|                   | Recovery initiated               |                   |
|                   | Service restored (if applicable) |                   |
|                   | Incident closed                  |                   |

---

## Section 5: Containment Actions

_Document all actions taken to stop the incident from spreading and limit further damage._

| #   | Containment Action | Taken By | Date / Time | Outcome |
| --- | ------------------ | -------- | ----------- | ------- |
| 1   |                    |          |             |         |
| 2   |                    |          |             |         |
| 3   |                    |          |             |         |
| 4   |                    |          |             |         |

**Containment complete?** [ ] Yes — Date/Time: ******\_\_\_****** [ ] No — ongoing (explain):

---

## Section 6: Root Cause Analysis

**Immediate cause** _(what directly triggered the incident):_

**Contributing factors:**

**Root cause** _(underlying systemic failure — see TPL-04 for full 5-Whys if CAR is raised):_

**Root cause category:**

- [ ] Unpatched vulnerability / outdated dependency
- [ ] Misconfiguration (cloud infrastructure / application)
- [ ] Credential compromise (phishing, weak password, leaked key)
- [ ] Insider action (malicious or accidental)
- [ ] Third-party supplier failure
- [ ] Missing security control
- [ ] Human error
- [ ] Unknown

---

## Section 7: Recovery Actions

_Document all actions taken to restore normal operations and remediate the root cause._

| #   | Recovery Action | Owner | Date / Time | Status |
| --- | --------------- | ----- | ----------- | ------ |
| 1   |                 |       |             |        |
| 2   |                 |       |             |        |
| 3   |                 |       |             |        |
| 4   |                 |       |             |        |

**Service fully restored?** [ ] Yes — Date/Time: ******\_\_\_****** [ ] No — partial restoration (explain):

**Residual risk after recovery:**

---

## Section 8: Lessons Learned

_Complete this section within 5 business days of incident closure. Involve all relevant team members._

**What worked well?**

**What could be improved?**

**Specific recommendations to prevent recurrence:**

1.
2.
3.

**Changes required to:**

- [ ] Policies / procedures
- [ ] Technical controls
- [ ] Training / awareness
- [ ] Monitoring / detection
- [ ] Supplier management
- [ ] Incident response process

---

## Section 9: Corrective Actions Raised

| CAR ID | Description | Owner | Target Date |
| ------ | ----------- | ----- | ----------- |
|        |             |       |             |
|        |             |       |             |

---

## Section 10: GDPR / AVG Notification Assessment

_Complete this section for any incident involving personal data. Consult the Privacy Officer / DPO._

### Article 33 Assessment — Notification to Autoriteit Persoonsgegevens (AP)

| Question                                                       | Answer                                                           |
| -------------------------------------------------------------- | ---------------------------------------------------------------- |
| Does this incident involve personal data?                      | [ ] Yes [ ] No                                                   |
| Is there a risk to the rights and freedoms of natural persons? | [ ] Yes [ ] No [ ] Unlikely                                      |
| **DPA notification required (Article 33)?**                    | **[ ] Yes — notify within 72 hours [ ] No — document rationale** |
| Date / time 72-hour clock started                              |                                                                  |
| AP notification deadline                                       |                                                                  |
| AP notified?                                                   | [ ] Yes [ ] No [ ] In progress                                   |
| AP notification reference number                               |                                                                  |
| AP notification date / time                                    |                                                                  |

**If notification NOT required, rationale** _(document per Article 33(5))_:

### Article 34 Assessment — Notification to Data Subjects

| Question                                       | Answer             |
| ---------------------------------------------- | ------------------ |
| Is the risk to data subjects HIGH?             | [ ] Yes [ ] No     |
| **Data subjects to be notified (Article 34)?** | **[ ] Yes [ ] No** |
| Data subjects notified?                        | [ ] Yes [ ] No     |
| Date / time notified                           |                    |
| Number of data subjects notified               |                    |
| Notification method                            |                    |
| Content of notification approved by            |                    |

---

## Section 11: Incident Closure

| Field                          | Value                                           |
| ------------------------------ | ----------------------------------------------- |
| **Closure Date**               |                                                 |
| **Closed By**                  |                                                 |
| **Final Severity**             | [ ] P1 [ ] P2 [ ] P3 [ ] P4                     |
| **Incident Duration**          | From detection to resolution                    |
| **Financial Impact**           | Estimated cost (if known)                       |
| **Reputational Impact**        | [ ] None [ ] Minor [ ] Moderate [ ] Significant |
| **Verified By (ISMS Manager)** |                                                 |
| **Verification Date**          |                                                 |

**Post-Incident Review Completed:** [ ] Yes — Date: ******\_\_\_****** [ ] N/A (P4 — waived)

---

## Sign-Off

| Role                      | Name | Signature | Date |
| ------------------------- | ---- | --------- | ---- |
| Incident Manager          |      |           |      |
| ISMS Manager              |      |           |      |
| Privacy Officer / DPO     |      |           |      |
| Management Representative |      |           |      |
