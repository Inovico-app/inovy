# Records of Processing Activities (RoPA)

**GDPR Article 30 Compliance Document**

---

## 1. Document Metadata

| Field                | Value                                 |
| -------------------- | ------------------------------------- |
| **Document ID**      | INOVY-GDPR-ROPA-001                   |
| **Version**          | 1.0                                   |
| **Classification**   | Internal -- Confidential              |
| **Effective Date**   | 2026-03-13                            |
| **Next Review Date** | 2026-09-13                            |
| **Owner**            | Data Protection Officer, Inovico B.V. |
| **Approved By**      | Management Board, Inovico B.V.        |
| **Status**           | Active                                |

---

## 2. Controller Information

| Field                     | Details                                                       |
| ------------------------- | ------------------------------------------------------------- |
| **Controller Name**       | Inovico B.V.                                                  |
| **Registration**          | Dutch Chamber of Commerce (KvK)                               |
| **Registered Address**    | The Netherlands                                               |
| **DPO Contact**           | privacy@inovico.nl                                            |
| **Platform**              | Inovy -- AI-Powered Meeting Recording & Management Platform   |
| **Supervisory Authority** | Autoriteit Persoonsgegevens (Dutch Data Protection Authority) |

Inovico B.V. acts as both a **Data Controller** (for account data, usage analytics, billing, and audit logs) and a **Data Processor** (for meeting recordings, transcripts, and AI-generated content processed on behalf of customers pursuant to Data Processing Agreements under GDPR Article 28).

---

## 3. Records of Processing Activities

### 3.1 Account Management

| Field                       | Details                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Processing Activity**     | User account registration, authentication, and profile management                                               |
| **Purpose**                 | Provision of the Inovy platform; user identification and access control                                         |
| **Role**                    | Controller                                                                                                      |
| **Legal Basis**             | Contract performance -- Art. 6(1)(b) GDPR                                                                       |
| **Data Categories**         | Full name, email address, profile picture, hashed password, OAuth identifiers (Google, Microsoft)               |
| **Data Subjects**           | Registered users of the Inovy platform                                                                          |
| **Recipients**              | Neon (PostgreSQL hosting), Google/Microsoft (OAuth providers), Resend (verification emails)                     |
| **International Transfers** | Neon (US, Standard Contractual Clauses); Google/Microsoft (US, EU-US Data Privacy Framework); Resend (US, SCCs) |
| **Retention Period**        | Account lifetime + 30-day soft-delete period; permanently deleted thereafter                                    |
| **Security Measures**       | Encryption at rest (AES-256) and in transit (TLS 1.2+); password hashing (bcrypt); OAuth 2.0/OIDC; RBAC         |

---

### 3.2 Meeting Recording

| Field                       | Details                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Processing Activity**     | Capture and storage of meeting audio/video recordings                                                        |
| **Purpose**                 | Enable customers to record, store, and review meetings                                                       |
| **Role**                    | Processor (on behalf of the customer as Controller)                                                          |
| **Legal Basis**             | Consent of meeting participants -- Art. 6(1)(a) GDPR; processing under customer instruction per Art. 28      |
| **Data Categories**         | Audio recordings, video recordings, meeting metadata (date, time, duration, participant list)                |
| **Data Subjects**           | Meeting participants (employees, external attendees of customer organisations)                               |
| **Recipients**              | Recall.ai (meeting recording ingestion), Microsoft Azure EU-Central-1 (storage)                              |
| **International Transfers** | Recall.ai (US, DPA with SCCs); Azure storage remains within EU-Central-1                                     |
| **Retention Period**        | Duration of customer subscription + 30 days; deleted upon customer request or subscription termination       |
| **Security Measures**       | Encryption at rest (AES-256) and in transit (TLS 1.2+); access controls per customer tenant; secure deletion |

---

### 3.3 Meeting Transcription

| Field                       | Details                                                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Processing Activity**     | Automated speech-to-text transcription of meeting recordings                                                      |
| **Purpose**                 | Provide searchable, readable transcripts of recorded meetings                                                     |
| **Role**                    | Processor (on behalf of the customer as Controller)                                                               |
| **Legal Basis**             | Consent of meeting participants -- Art. 6(1)(a) GDPR; processing under customer instruction per Art. 28           |
| **Data Categories**         | Text transcripts, speaker identification labels, timestamps                                                       |
| **Data Subjects**           | Meeting participants                                                                                              |
| **Recipients**              | Deepgram (transcription service), Neon (transcript storage)                                                       |
| **International Transfers** | Deepgram (US, DPA with SCCs); Neon (US, DPA with SCCs)                                                            |
| **Retention Period**        | Duration of customer subscription + 30 days                                                                       |
| **Security Measures**       | Encryption at rest and in transit; data processed in-memory by Deepgram (no persistent storage); tenant isolation |

---

### 3.4 AI-Generated Summaries and Insights

| Field                       | Details                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Processing Activity**     | AI-powered analysis of transcripts to generate summaries, action items, and meeting insights               |
| **Purpose**                 | Enhance productivity by providing automated meeting intelligence                                           |
| **Role**                    | Processor (on behalf of the customer as Controller)                                                        |
| **Legal Basis**             | Customer instruction pursuant to Art. 28 GDPR; underlying consent from participants -- Art. 6(1)(a)        |
| **Data Categories**         | AI-generated summaries, action items, key topics, sentiment indicators, structured meeting insights        |
| **Data Subjects**           | Meeting participants (indirectly, through derived content)                                                 |
| **Recipients**              | OpenAI (AI analysis), Anthropic (AI analysis), Neon (storage of generated content)                         |
| **International Transfers** | OpenAI (US, DPA with SCCs, zero-retention API); Anthropic (US, DPA with SCCs); Neon (US, DPA with SCCs)    |
| **Retention Period**        | Duration of customer subscription + 30 days                                                                |
| **Security Measures**       | API-level encryption (TLS 1.2+); zero-retention/no-training agreements with AI providers; tenant isolation |

---

### 3.5 Usage Analytics

| Field                       | Details                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Processing Activity**     | Collection and analysis of platform usage data                                                            |
| **Purpose**                 | Service improvement, capacity planning, feature development, and platform reliability monitoring          |
| **Role**                    | Controller                                                                                                |
| **Legal Basis**             | Legitimate interest -- Art. 6(1)(f) GDPR (interest: service improvement and reliability)                  |
| **Data Categories**         | Page views, feature usage frequency, session duration, device/browser metadata, IP addresses (anonymised) |
| **Data Subjects**           | All platform users                                                                                        |
| **Recipients**              | Vercel (hosting/analytics), Microsoft Azure EU-Central-1                                                  |
| **International Transfers** | Vercel (US, DPA with SCCs)                                                                                |
| **Retention Period**        | Aggregated data: 24 months; raw event data: 90 days                                                       |
| **Security Measures**       | IP anonymisation; data minimisation; access restricted to authorised personnel; encrypted storage         |

**Legitimate Interest Assessment (LIA):** The processing is necessary to maintain and improve service quality and reliability. Users reasonably expect their usage data to inform platform development. Impact on data subjects is minimal due to anonymisation and aggregation. Users may opt out via account settings.

---

### 3.6 Billing and Payment Processing

| Field                       | Details                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Processing Activity**     | Processing subscription payments and maintaining financial records                                                                       |
| **Purpose**                 | Subscription management, invoicing, tax compliance, and financial record-keeping                                                         |
| **Role**                    | Controller                                                                                                                               |
| **Legal Basis**             | Contract performance -- Art. 6(1)(b); legal obligation -- Art. 6(1)(c) (Dutch bookkeeping law, Wet op de Administratieve Verplichtingen) |
| **Data Categories**         | Billing name, billing address, payment method tokens (no full card numbers), invoice history, subscription plan                          |
| **Data Subjects**           | Paying customers and billing contacts                                                                                                    |
| **Recipients**              | Stripe (payment processing)                                                                                                              |
| **International Transfers** | Stripe (US/EU, certified under EU-US Data Privacy Framework; DPA in place)                                                               |
| **Retention Period**        | 7 years (Dutch bookkeeping law, Art. 2:10 BW / Art. 52 AWR); payment tokens deleted upon subscription end                                |
| **Security Measures**       | PCI-DSS compliance via Stripe; no raw card data stored; encrypted billing records; access restricted to finance                          |

---

### 3.7 Audit Logging

| Field                       | Details                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Processing Activity**     | Logging of security events, data access, and administrative actions                                                                    |
| **Purpose**                 | Security monitoring, incident investigation, regulatory compliance, and accountability                                                 |
| **Role**                    | Controller / Processor (depending on whether logs relate to controller or processor activities)                                        |
| **Legal Basis**             | Legal obligation -- Art. 6(1)(c) (security requirements under Art. 32 GDPR); legitimate interest -- Art. 6(1)(f) (security monitoring) |
| **Data Categories**         | User IDs, action types, timestamps, IP addresses, resource identifiers, request metadata                                               |
| **Data Subjects**           | All platform users and system administrators                                                                                           |
| **Recipients**              | Neon (log storage), Microsoft Azure EU-Central-1 (infrastructure logs)                                                                 |
| **International Transfers** | Neon (US, DPA with SCCs)                                                                                                               |
| **Retention Period**        | 3 years minimum; configurable per regulatory requirement                                                                               |
| **Security Measures**       | Append-only log storage; tamper detection; encrypted at rest; access restricted to security personnel                                  |

---

### 3.8 Consent Records Management

| Field                       | Details                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Processing Activity**     | Recording and managing consent provided by data subjects                                              |
| **Purpose**                 | Demonstrating compliance with GDPR consent requirements (Art. 7); maintaining auditable consent trail |
| **Role**                    | Controller                                                                                            |
| **Legal Basis**             | Legal obligation -- Art. 6(1)(c) (obligation to demonstrate valid consent under Art. 7(1) GDPR)       |
| **Data Categories**         | Consent type, consent status, timestamp, user identifier, consent version, method of collection       |
| **Data Subjects**           | All individuals who provide consent (users and meeting participants)                                  |
| **Recipients**              | Neon (storage)                                                                                        |
| **International Transfers** | Neon (US, DPA with SCCs)                                                                              |
| **Retention Period**        | 5 years from the date consent was given or withdrawn                                                  |
| **Security Measures**       | Immutable records; encrypted at rest; access restricted to compliance and legal personnel             |

---

### 3.9 Marketing Communications

| Field                       | Details                                                                                                  |
| --------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Processing Activity**     | Sending marketing and promotional communications to opted-in users                                       |
| **Purpose**                 | Product updates, feature announcements, and promotional offers                                           |
| **Role**                    | Controller                                                                                               |
| **Legal Basis**             | Consent -- Art. 6(1)(a) GDPR                                                                             |
| **Data Categories**         | Email address, name, communication preferences, engagement metrics (open/click rates)                    |
| **Data Subjects**           | Users who have provided explicit opt-in consent                                                          |
| **Recipients**              | Resend (email delivery)                                                                                  |
| **International Transfers** | Resend (US, DPA with SCCs)                                                                               |
| **Retention Period**        | Until consent is withdrawn; preference records retained for 5 years per consent records policy           |
| **Security Measures**       | Double opt-in verification; one-click unsubscribe; encrypted mailing lists; suppression list enforcement |

---

### 3.10 GDPR Data Subject Request Fulfilment

| Field                       | Details                                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Processing Activity**     | Processing data subject access requests (DSAR), erasure requests, portability requests, and objections         |
| **Purpose**                 | Fulfilment of data subject rights under GDPR Articles 15--22                                                   |
| **Role**                    | Controller                                                                                                     |
| **Legal Basis**             | Legal obligation -- Art. 6(1)(c) GDPR                                                                          |
| **Data Categories**         | Request metadata, identity verification data, exported personal data packages                                  |
| **Data Subjects**           | Any individual exercising their GDPR rights                                                                    |
| **Recipients**              | Internal compliance team; data subject (for exports)                                                           |
| **International Transfers** | None (processed and delivered within platform infrastructure)                                                  |
| **Retention Period**        | GDPR export packages: 7 days (auto-deleted); request logs: 3 years                                             |
| **Security Measures**       | Identity verification before processing; encrypted export packages; automatic deletion of exports; audit trail |

---

### 3.11 Session and Authentication Token Management

| Field                       | Details                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| **Processing Activity**     | Issuance and management of session tokens and authentication state                                |
| **Purpose**                 | Secure user authentication and session continuity                                                 |
| **Role**                    | Controller                                                                                        |
| **Legal Basis**             | Contract performance -- Art. 6(1)(b) GDPR (necessary for platform access)                         |
| **Data Categories**         | Session tokens, refresh tokens, device fingerprints, last-active timestamps                       |
| **Data Subjects**           | Authenticated platform users                                                                      |
| **Recipients**              | Neon (session storage)                                                                            |
| **International Transfers** | Neon (US, DPA with SCCs)                                                                          |
| **Retention Period**        | Session tokens: 7 days; refresh tokens: 30 days; expired tokens purged automatically              |
| **Security Measures**       | HttpOnly secure cookies; CSRF protection; token rotation; encrypted storage; automatic expiration |

---

## 4. Summary of Third-Party Processors

All listed third-party processors have executed Data Processing Agreements (DPAs) in compliance with GDPR Article 28. DPAs are reviewed annually.

| Processor       | Service                      | Location     | Transfer Mechanism                  | DPA Status |
| --------------- | ---------------------------- | ------------ | ----------------------------------- | ---------- |
| Microsoft Azure | Cloud hosting                | EU-Central-1 | N/A (EU processing)                 | Active     |
| Neon            | PostgreSQL database          | US           | Standard Contractual Clauses (SCCs) | Active     |
| OpenAI          | AI analysis                  | US           | SCCs + zero-retention API           | Active     |
| Anthropic       | AI analysis                  | US           | SCCs                                | Active     |
| Deepgram        | Speech-to-text transcription | US           | SCCs                                | Active     |
| Recall.ai       | Meeting recording ingestion  | US           | SCCs                                | Active     |
| Stripe          | Payment processing           | US/EU        | EU-US Data Privacy Framework        | Active     |
| Resend          | Transactional email          | US           | SCCs                                | Active     |
| Google          | OAuth authentication         | US           | EU-US Data Privacy Framework        | Active     |
| Microsoft       | OAuth authentication         | US           | EU-US Data Privacy Framework        | Active     |

---

## 5. International Data Transfers

Where personal data is transferred outside the European Economic Area (EEA), the following safeguards are in place:

1. **Standard Contractual Clauses (SCCs):** Executed with all US-based sub-processors in accordance with Commission Implementing Decision (EU) 2021/914.
2. **EU-US Data Privacy Framework:** Relied upon for processors certified under the framework (Google, Microsoft, Stripe), as supplementary to SCCs.
3. **Transfer Impact Assessments (TIAs):** Conducted for each sub-processor to evaluate the legal framework of the recipient country and the effectiveness of supplementary measures.
4. **Supplementary Technical Measures:** Encryption in transit (TLS 1.2+) and at rest (AES-256); pseudonymisation where feasible; contractual restrictions on government access disclosure obligations.

---

## 6. Technical and Organisational Security Measures (Art. 32)

The following measures are implemented to ensure a level of security appropriate to the risk:

### 6.1 Technical Measures

- **Encryption:** AES-256 encryption at rest; TLS 1.2+ for all data in transit
- **Access Control:** Role-based access control (RBAC); principle of least privilege; multi-factor authentication for administrative access
- **Network Security:** Web Application Firewall (WAF); DDoS protection; network segmentation
- **Application Security:** Input validation; parameterised queries (Drizzle ORM); Content Security Policy headers; CSRF protection
- **Monitoring:** Real-time security event monitoring; automated anomaly detection; structured audit logging
- **Backup & Recovery:** Automated encrypted backups; point-in-time recovery capability; disaster recovery procedures tested annually

### 6.2 Organisational Measures

- **Data Protection by Design and Default:** Privacy considerations integrated into the software development lifecycle (SDLC)
- **Staff Training:** Mandatory GDPR and data protection training for all personnel with access to personal data
- **Vendor Management:** Annual review of all sub-processor DPAs and security postures
- **Incident Response:** Documented breach notification procedure aligned with Art. 33/34 GDPR (72-hour notification to supervisory authority)
- **Data Minimisation:** Collection limited to what is strictly necessary for each processing purpose
- **Pseudonymisation:** Applied where feasible, particularly in analytics and logging contexts

---

## 7. Data Protection Impact Assessments (DPIA)

The following processing activities have been identified as requiring a DPIA under Art. 35 GDPR due to their nature, scope, or use of new technologies:

| Processing Activity           | DPIA Status | Last Assessment | Next Review |
| ----------------------------- | ----------- | --------------- | ----------- |
| AI-generated meeting analysis | Completed   | 2026-03-01      | 2026-09-01  |
| Meeting recording and storage | Completed   | 2026-03-01      | 2026-09-01  |
| Automated transcription       | Completed   | 2026-03-01      | 2026-09-01  |

DPIAs are maintained as separate documents and are available upon request to the supervisory authority.

---

## 8. Data Subject Rights Procedures

Inovico B.V. has established procedures to fulfil the following data subject rights within the statutory timeframes (generally 30 days, extendable by 60 days for complex requests):

| Right                          | GDPR Article | Implementation                                                                  |
| ------------------------------ | ------------ | ------------------------------------------------------------------------------- |
| Right of Access                | Art. 15      | Self-service data export via platform settings; manual DSAR process             |
| Right to Rectification         | Art. 16      | Self-service profile editing; support request for other data                    |
| Right to Erasure               | Art. 17      | Account deletion with 30-day soft-delete; cascade deletion of content           |
| Right to Restriction           | Art. 18      | Processing suspension flag on account; manual review procedure                  |
| Right to Data Portability      | Art. 20      | JSON/CSV export of personal data; machine-readable format                       |
| Right to Object                | Art. 21      | Opt-out mechanisms for analytics and marketing; support escalation              |
| Rights re: Automated Decisions | Art. 22      | AI outputs are assistive only (no solely automated decisions with legal effect) |

Contact for all data subject requests: **privacy@inovico.nl**

---

## 9. Review Schedule

This RoPA is a living document and shall be reviewed and updated in accordance with the following schedule:

| Review Type           | Frequency         | Responsible Party                     | Next Scheduled |
| --------------------- | ----------------- | ------------------------------------- | -------------- |
| Full Document Review  | Semi-annually     | Data Protection Officer               | 2026-09-13     |
| Processing Activities | Quarterly         | Data Protection Officer + Engineering | 2026-06-13     |
| Sub-processor Review  | Annually          | Data Protection Officer + Legal       | 2027-03-13     |
| Post-incident Review  | As needed         | Incident Response Team                | N/A            |
| Regulatory Update     | Upon legal change | Legal Counsel + DPO                   | N/A            |

### Triggers for Unscheduled Review

- Introduction of a new processing activity
- Engagement of a new sub-processor
- Material change to an existing processing activity
- Data breach or security incident
- Guidance or enforcement action from the supervisory authority
- Changes in applicable law or regulatory requirements

---

## 10. Document History

| Version | Date       | Author                  | Changes                  |
| ------- | ---------- | ----------------------- | ------------------------ |
| 1.0     | 2026-03-13 | Data Protection Officer | Initial creation of RoPA |

---

_This document is maintained by Inovico B.V. in fulfilment of its obligations under Article 30 of the General Data Protection Regulation (EU) 2016/679. For questions or requests, contact the Data Protection Officer at privacy@inovico.nl._
