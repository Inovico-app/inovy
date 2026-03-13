# TPL-06: Supplier Security Assessment

| Document ID       | TPL-06                                                                         |
| ----------------- | ------------------------------------------------------------------------------ |
| Version           | 1.0                                                                            |
| Last Updated      | 2026-03-13                                                                     |
| Owner             | ISMS Manager                                                                   |
| Related Documents | Supplier Management Policy, ISMS-09 Risk Register, ISMS-10 SoA (A.5.19–A.5.22) |
| Retention         | 3 years minimum; retain for duration of supplier relationship + 1 year         |
| Review Cycle      | Annual, or following significant change in service or supplier                 |

---

## Instructions

Complete one assessment per supplier. For critical suppliers (Criticality = High), conduct the assessment annually and obtain updated certifications/evidence. For non-critical suppliers, biennial review is acceptable. Raise a CAR (TPL-04) for any High-risk finding.

Inovy's key suppliers requiring assessment include: Vercel, Neon (PostgreSQL), Qdrant, Deepgram, OpenAI, Resend, GitHub, Cloudflare, and any new AI/integration providers.

---

## Section 1: Supplier Information

| Field                              | Value        |
| ---------------------------------- | ------------ |
| **Supplier Name**                  |              |
| **Legal Entity / Registered Name** |              |
| **Country of Incorporation**       |              |
| **Primary Contact (security)**     |              |
| **Contact Email**                  |              |
| **Website**                        |              |
| **Service Provided to Inovy**      |              |
| **Contract Reference**             |              |
| **Contract Start Date**            |              |
| **Contract Renewal Date**          |              |
| **Assessment Reference**           | SUP-YYYY-NNN |
| **Assessment Date**                |              |
| **Reviewer**                       |              |
| **Next Review Date**               |              |

---

## Section 2: Service Classification

### Data Shared with Supplier

| Data Category                       | Shared?        | Volume/Frequency | Classification |
| ----------------------------------- | -------------- | ---------------- | -------------- |
| Meeting recordings (audio)          | [ ] Yes [ ] No |                  | Confidential   |
| Meeting transcripts                 | [ ] Yes [ ] No |                  | Confidential   |
| AI summaries / action items         | [ ] Yes [ ] No |                  | Confidential   |
| User email addresses                | [ ] Yes [ ] No |                  | Confidential   |
| User names / profile data           | [ ] Yes [ ] No |                  | Internal       |
| Authentication credentials / tokens | [ ] Yes [ ] No |                  | Restricted     |
| Source code / configuration         | [ ] Yes [ ] No |                  | Restricted     |
| Billing / payment data              | [ ] Yes [ ] No |                  | Restricted     |
| Aggregate / anonymised analytics    | [ ] Yes [ ] No |                  | Internal       |
| No personal/confidential data       | [ ] Yes [ ] No |                  |                |

### Criticality Assessment

| Criterion                          | High                            | Medium                         | Low                           |
| ---------------------------------- | ------------------------------- | ------------------------------ | ----------------------------- |
| Impact if service is unavailable   | > 4 hours disrupts core product | 4–24 hours partial impact      | > 24 hours before impact      |
| Sensitivity of data shared         | Personal data / Confidential    | Internal data                  | Public data only              |
| Number of Inovy customers affected | All customers                   | Subset of customers            | Internal only                 |
| Replaceability                     | No short-term alternative       | Alternative available in weeks | Alternative available quickly |

**Overall Criticality:** [ ] High [ ] Medium [ ] Low

**Criticality Rationale:**

---

## Section 3: Security Certifications and Compliance

| Certification / Standard              | Held?                          | Scope | Certificate Valid Until | Evidence Sighted? |
| ------------------------------------- | ------------------------------ | ----- | ----------------------- | ----------------- |
| ISO 27001:2022                        | [ ] Yes [ ] No [ ] In progress |       |                         | [ ] Yes [ ] No    |
| SOC 2 Type II                         | [ ] Yes [ ] No [ ] In progress |       |                         | [ ] Yes [ ] No    |
| SOC 2 Type I                          | [ ] Yes [ ] No [ ] In progress |       |                         | [ ] Yes [ ] No    |
| PCI DSS                               | [ ] Yes [ ] No [ ] N/A         |       |                         | [ ] Yes [ ] No    |
| CSA STAR                              | [ ] Yes [ ] No [ ] N/A         |       |                         | [ ] Yes [ ] No    |
| ISO 9001                              | [ ] Yes [ ] No [ ] N/A         |       |                         | [ ] Yes [ ] No    |
| GDPR / AVG compliance self-assessment | [ ] Yes [ ] No                 |       |                         | [ ] Yes [ ] No    |
| Other:                                |                                |       |                         |                   |

**Certification notes:**

---

## Section 4: Data Protection and GDPR Compliance

| Question                                                   | Response                                                                              | Evidence / Notes |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------- |
| Is a Data Processing Agreement (DPA) in place?             | [ ] Yes [ ] No — required [ ] Not required (no personal data)                         | DPA reference:   |
| Is the DPA aligned with GDPR Article 28?                   | [ ] Yes [ ] No [ ] Under review                                                       |                  |
| Where is data processed / stored?                          |                                                                                       |                  |
| Is processing within the EU/EEA?                           | [ ] Yes (EU/EEA only) [ ] No — SCCs/adequacy decision in place [ ] No — not justified |                  |
| EU-U.S. Data Privacy Framework or SCCs in place?           | [ ] DPF [ ] SCCs [ ] Adequacy decision [ ] N/A                                        |                  |
| Data residency: can EU-only storage be enforced?           | [ ] Yes [ ] No [ ] On request                                                         |                  |
| Does supplier have a Privacy Policy covering Inovy's data? | [ ] Yes [ ] No                                                                        |                  |
| Are data subject rights (access, deletion) supported?      | [ ] Yes [ ] Partial [ ] No                                                            |                  |
| Retention and deletion commitments documented?             | [ ] Yes [ ] No                                                                        |                  |

---

## Section 5: Encryption

| Requirement                                 | Implemented?                      | Details / Evidence         |
| ------------------------------------------- | --------------------------------- | -------------------------- |
| Data encrypted at rest                      | [ ] Yes [ ] No [ ] Partial        | Algorithm / standard used: |
| Data encrypted in transit (TLS 1.2+)        | [ ] Yes [ ] No [ ] Partial        | TLS version:               |
| Encryption keys managed by supplier         | [ ] Yes [ ] No                    |                            |
| Customer-managed encryption keys available? | [ ] Yes [ ] No [ ] Not applicable |                            |
| Key rotation policy in place?               | [ ] Yes [ ] No                    | Rotation frequency:        |
| Database backups encrypted?                 | [ ] Yes [ ] No                    |                            |

---

## Section 6: Access Controls

| Requirement                                           | Implemented?                  | Details / Evidence |
| ----------------------------------------------------- | ----------------------------- | ------------------ |
| Multi-factor authentication enforced for admin access | [ ] Yes [ ] No                |                    |
| Role-based access control implemented                 | [ ] Yes [ ] No                |                    |
| Least-privilege principle applied                     | [ ] Yes [ ] No                |                    |
| Privileged access reviews conducted                   | [ ] Yes [ ] Frequency:        |                    |
| Inovy has ability to restrict user permissions        | [ ] Yes [ ] No                |                    |
| Access logs available to Inovy                        | [ ] Yes [ ] No [ ] On request |                    |
| API authentication using secure tokens/OAuth          | [ ] Yes [ ] No                |                    |

---

## Section 7: Vulnerability Management and Security Testing

| Requirement                                    | Implemented?   | Details / Evidence    |
| ---------------------------------------------- | -------------- | --------------------- |
| Regular vulnerability scanning                 | [ ] Yes [ ] No | Frequency:            |
| Penetration testing conducted                  | [ ] Yes [ ] No | Last date: Frequency: |
| Critical patches applied within 7 days         | [ ] Yes [ ] No | SLA:                  |
| Bug bounty or responsible disclosure programme | [ ] Yes [ ] No |                       |
| Software composition analysis (SCA)            | [ ] Yes [ ] No |                       |
| Security development lifecycle (SDLC)          | [ ] Yes [ ] No |                       |

---

## Section 8: Incident Response

| Requirement                                             | Implemented?                 | Details / Evidence  |
| ------------------------------------------------------- | ---------------------------- | ------------------- |
| Incident response plan in place                         | [ ] Yes [ ] No               |                     |
| Customer notification SLA for security incidents        | [ ] Yes [ ] No               | SLA:                |
| Will Inovy be notified of breaches affecting our data?  | [ ] Yes [ ] No               |                     |
| Notification timeline for personal data breaches        |                              | Within \_\_\_ hours |
| Incident history: known major incidents in last 3 years | [ ] None [ ] Yes — describe: |                     |
| Status page / uptime monitoring available               | [ ] Yes [ ] No               | URL:                |

---

## Section 9: Business Continuity

| Requirement                          | Implemented?                     | Details / Evidence |
| ------------------------------------ | -------------------------------- | ------------------ |
| Business continuity plan documented  | [ ] Yes [ ] No                   |                    |
| Disaster recovery plan documented    | [ ] Yes [ ] No                   |                    |
| RTO (Recovery Time Objective)        |                                  |                    |
| RPO (Recovery Point Objective)       |                                  |                    |
| BCP/DR tested at least annually      | [ ] Yes [ ] No [ ] Not confirmed | Last test date:    |
| Geographic redundancy / multi-region | [ ] Yes [ ] No                   | Regions:           |
| SLA / uptime guarantee               |                                  | SLA:               |
| Historical uptime (last 12 months)   |                                  |                    |

---

## Section 10: Sub-Processor Management

| Question                                              | Response                      | Notes          |
| ----------------------------------------------------- | ----------------------------- | -------------- |
| Does the supplier use sub-processors?                 | [ ] Yes [ ] No                |                |
| List of sub-processors available?                     | [ ] Yes (URL/document) [ ] No |                |
| Is Inovy notified of sub-processor changes?           | [ ] Yes [ ] No                | Notice period: |
| Do sub-processors meet equivalent security standards? | [ ] Yes [ ] No [ ] Unknown    |                |

**Known sub-processors:**

---

## Section 11: Overall Risk Assessment

### Risk Summary

| Area                     | Risk Level                  | Notes |
| ------------------------ | --------------------------- | ----- |
| Data protection / GDPR   | [ ] Low [ ] Medium [ ] High |       |
| Encryption               | [ ] Low [ ] Medium [ ] High |       |
| Access controls          | [ ] Low [ ] Medium [ ] High |       |
| Vulnerability management | [ ] Low [ ] Medium [ ] High |       |
| Incident response        | [ ] Low [ ] Medium [ ] High |       |
| Business continuity      | [ ] Low [ ] Medium [ ] High |       |
| Sub-processor risk       | [ ] Low [ ] Medium [ ] High |       |

**Overall Supplier Risk Rating:** [ ] Low [ ] Medium [ ] High [ ] Critical

**Overall Risk Rationale:**

### Risk Disposition

- [ ] **Accept** — Risk is within Inovy's risk appetite; no further action required
- [ ] **Conditional Accept** — Risk accepted with compensating controls or contractual protections
- [ ] **Mitigate** — Corrective actions required before/during use (see action items below)
- [ ] **Reject** — Supplier does not meet minimum security requirements; discontinue or do not engage

---

## Section 12: Action Items

| #   | Finding | Required Action | Owner | Due Date | Status |
| --- | ------- | --------------- | ----- | -------- | ------ |
| 1   |         |                 |       |          |        |
| 2   |         |                 |       |          |        |
| 3   |         |                 |       |          |        |

---

## Section 13: Approval

| Role                                 | Name | Signature | Date |
| ------------------------------------ | ---- | --------- | ---- |
| Reviewer (ISMS Manager)              |      |           |      |
| Approver (Management Representative) |      |           |      |

---

## Supplier Register Summary

_Maintain a current summary of all assessed suppliers._

| Supplier   | Service               | Criticality | Certifications | DPA | Overall Risk | Last Assessed | Next Review |
| ---------- | --------------------- | ----------- | -------------- | --- | ------------ | ------------- | ----------- |
| Vercel     | Hosting / CDN         | High        | SOC 2 Type II  | Yes |              |               |             |
| Neon       | PostgreSQL DB         | High        | SOC 2 Type II  | Yes |              |               |             |
| Qdrant     | Vector DB             | High        |                |     |              |               |             |
| Deepgram   | Transcription AI      | High        | SOC 2          | Yes |              |               |             |
| OpenAI     | AI / LLM              | High        | SOC 2 Type II  | Yes |              |               |             |
| Resend     | Email delivery        | Medium      |                | Yes |              |               |             |
| GitHub     | Source code / CI/CD   | High        | SOC 2 Type II  | Yes |              |               |             |
| Cloudflare | DNS / DDoS protection | Medium      | SOC 2 Type II  | Yes |              |               |             |
