# TPL-01: Risk Assessment Worksheet

| Document ID      | TPL-01                                                     |
| ---------------- | ---------------------------------------------------------- |
| Version          | 1.0                                                        |
| Last Updated     | 2026-03-13                                                 |
| Owner            | ISMS Manager                                               |
| Related Document | ISMS-08 Risk Assessment Methodology, ISMS-09 Risk Register |
| Review Cycle     | Per risk assessment cycle (min. annual)                    |

---

## Instructions

Complete one row per identified risk. Use the scoring scales below. Calculate Risk Score as:
**Risk Score = Likelihood × Impact**

Reference the ISMS-08 methodology for detailed guidance on identifying assets, threats, and vulnerabilities specific to Inovy's SaaS environment.

---

## Scoring Guidance

### Likelihood Scale

| Score | Level          | Description                                                                       |
| ----- | -------------- | --------------------------------------------------------------------------------- |
| 1     | Rare           | Threat unlikely to occur; no known precedent in similar SaaS environments         |
| 2     | Unlikely       | Threat could occur but has not been observed at Inovy; infrequent in the industry |
| 3     | Possible       | Threat may occur occasionally; observed in the industry                           |
| 4     | Likely         | Threat expected to occur at some point; common in the industry                    |
| 5     | Almost Certain | Threat expected to occur regularly; high frequency in SaaS environments           |

### Impact Scale

| Score | Level         | Description                                                            | Example                                     |
| ----- | ------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| 1     | Insignificant | Negligible business impact; no data breach                             | Minor availability blip < 1 hour            |
| 2     | Minor         | Limited impact; small number of users affected                         | Single non-sensitive record exposed         |
| 3     | Moderate      | Noticeable disruption; potential minor regulatory action               | Service down 4–8 hours; < 100 records       |
| 4     | Major         | Significant business harm; regulatory investigation likely             | Meeting recordings exposed; > 1,000 records |
| 5     | Catastrophic  | Existential threat to business; large-scale breach; enforcement action | Full DB compromise; GDPR enforcement        |

### Risk Level Matrix

|                  | **Impact 1** | **Impact 2** | **Impact 3** | **Impact 4**  | **Impact 5**  |
| ---------------- | ------------ | ------------ | ------------ | ------------- | ------------- |
| **Likelihood 5** | Medium (5)   | High (10)    | High (15)    | Critical (20) | Critical (25) |
| **Likelihood 4** | Low (4)      | Medium (8)   | High (12)    | High (16)     | Critical (20) |
| **Likelihood 3** | Low (3)      | Medium (6)   | Medium (9)   | High (12)     | High (15)     |
| **Likelihood 2** | Low (2)      | Low (4)      | Medium (6)   | Medium (8)    | High (10)     |
| **Likelihood 1** | Low (1)      | Low (2)      | Low (3)      | Low (4)       | Medium (5)    |

| Risk Level | Score Range | Action Required                                          |
| ---------- | ----------- | -------------------------------------------------------- |
| Low        | 1–4         | Accept; monitor annually                                 |
| Medium     | 5–9         | Mitigate within 90 days; document rationale if accepting |
| High       | 10–16       | Mitigate within 30 days; mandatory treatment plan        |
| Critical   | 17–25       | Immediate treatment required; escalate to management     |

### Treatment Options

| Option       | Description                                                                        |
| ------------ | ---------------------------------------------------------------------------------- |
| **Accept**   | Risk is within appetite; document acceptance with rationale and owner sign-off     |
| **Mitigate** | Implement controls to reduce likelihood and/or impact to acceptable level          |
| **Transfer** | Transfer risk to third party (e.g., insurance, contractual obligation on supplier) |
| **Avoid**    | Discontinue the activity or asset that introduces the risk                         |

---

## Risk Assessment Worksheet

**Assessment Date:** ******\_\_\_******
**Assessed by:** ******\_\_\_******
**Review Date:** ******\_\_\_******
**Scope:** ******\_\_\_******

| #     | Asset | Threat | Vulnerability | Existing Controls | Likelihood (1–5) | Impact (1–5) | Risk Score | Risk Level | Treatment Option | Treatment Description | Residual Risk | Owner | Deadline |
| ----- | ----- | ------ | ------------- | ----------------- | ---------------- | ------------ | ---------- | ---------- | ---------------- | --------------------- | ------------- | ----- | -------- |
| R-001 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-002 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-003 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-004 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-005 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-006 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-007 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-008 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-009 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-010 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-011 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-012 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-013 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-014 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-015 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-016 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-017 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-018 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-019 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |
| R-020 |       |        |               |                   |                  |              |            |            |                  |                       |               |       |          |

_Add rows as needed. Each risk should have a unique ID prefixed with R-._

---

## Inovy Asset Category Reference

Use these asset categories when completing the **Asset** column:

| Category                | Examples                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| Meeting Data            | Audio recordings, transcripts, AI summaries, action items               |
| User Data               | Names, email addresses, profile information, meeting metadata           |
| Infrastructure          | Vercel deployment, Neon PostgreSQL, Qdrant vector DB, Cloudflare        |
| Application             | Next.js web app, MCP server, API endpoints, authentication (BetterAuth) |
| Third-Party AI Services | Deepgram (transcription), OpenAI (summaries), AI pipeline integrations  |
| Credentials & Secrets   | API keys, database credentials, OAuth tokens, signing secrets           |
| Source Code             | GitHub repositories, CI/CD pipelines, deployment configurations         |
| People                  | Employees, contractors, remote-first team members                       |
| Supplier / SaaS Tools   | Vercel, Neon, Resend, Qdrant, GitHub, communication tools               |

---

## Common Inovy Threats Reference

- Unauthorised access to meeting recordings via misconfigured access controls
- API key leakage through environment variable exposure or Git commits
- SQL injection / NoSQL injection against Neon PostgreSQL or Qdrant
- AI model data exfiltration via prompt injection
- Third-party SaaS supplier breach (Vercel, Neon, Deepgram, OpenAI)
- Insider threat: employee access to customer meeting data
- Ransomware targeting cloud infrastructure or code repositories
- DDoS attack against Next.js application
- Phishing targeting remote-first team members
- GDPR breach: unlawful processing or unauthorised disclosure of meeting data

---

## Approval

| Role                      | Name | Signature | Date |
| ------------------------- | ---- | --------- | ---- |
| ISMS Manager              |      |           |      |
| Management Representative |      |           |      |
