# GDPR Compliance Report

| Field          | Value                        |
| -------------- | ---------------------------- |
| Document ID    | GDPR-RPT-001                 |
| Version        | 1.0                          |
| Classification | Internal                     |
| Owner          | Information Security Manager |
| Effective date | 2026-03-13                   |
| Review date    | 2027-03-13                   |

---

## 1. Executive Summary

This report documents Inovy's compliance posture against all applicable GDPR requirements. Each requirement is assessed as **PASS**, **PARTIAL**, or **N/A** with evidence references to code, policy documents, or organizational processes.

**Overall Status**: 30/33 requirements PASS, 3 PARTIAL (being addressed).

---

## 2. GDPR Principles (Article 5)

| #      | Principle                          | Status | Evidence                                                                                                                           |
| ------ | ---------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| 5.1(a) | Lawfulness, fairness, transparency | PASS   | Privacy Policy page (`(legal)/privacy-policy/page.tsx`); POL-15 §4.2 documents lawful bases for all processing activities          |
| 5.1(b) | Purpose limitation                 | PASS   | POL-15 §4.1: data not used for advertising, not sold, not used for AI training without consent                                     |
| 5.1(c) | Data minimisation                  | PASS   | Minimal fields collected (name, email, picture); `pii-detection.service.ts` redacts unnecessary PII from transcripts               |
| 5.1(d) | Accuracy                           | PASS   | Users can update profile via settings page (`ProfileForm` component); rectification available via DPO email                        |
| 5.1(e) | Storage limitation                 | PASS   | Retention schedule in POL-15 §5.1; `data-retention.service.ts` automates cleanup of expired exports, sessions, archived recordings |
| 5.1(f) | Integrity and confidentiality      | PASS   | AES-256-GCM encryption at rest (`encryption.ts`); TLS in transit; RBAC; organization isolation; audit logging                      |
| 5.2    | Accountability                     | PASS   | ISMS documentation; POL-15; audit logs with hash chain tamper-proofing; RoPA document                                              |

## 3. Lawful Basis for Processing (Article 6)

| Processing Activity             | Lawful Basis                           | GDPR Article     | Status | Evidence                                                                                 |
| ------------------------------- | -------------------------------------- | ---------------- | ------ | ---------------------------------------------------------------------------------------- |
| Account registration            | Contract performance                   | Art. 6(1)(b)     | PASS   | POL-15 §4.2                                                                              |
| Meeting recording/transcription | Customer consent from participants     | Art. 6(1)(a)     | PASS   | Consent management: `consent.service.ts`, `consent.ts` schema, explicit-only enforcement |
| AI analysis of content          | Customer instruction (processor)       | Art. 28          | PASS   | POL-15 §4.2                                                                              |
| Usage analytics                 | Legitimate interest                    | Art. 6(1)(f)     | PASS   | Vercel Analytics with anonymized geoIP; POL-15 §4.2                                      |
| Billing/payments                | Contract + legal obligation            | Art. 6(1)(b),(c) | PASS   | Stripe DPA in place; POL-15 §4.2                                                         |
| Audit logging                   | Legal obligation + legitimate interest | Art. 6(1)(c),(f) | PASS   | `audit-log.service.ts` with hash chain                                                   |
| Marketing                       | Consent                                | Art. 6(1)(a)     | PASS   | POL-15 §4.2                                                                              |

## 4. Data Subject Rights

| #   | Right                          | GDPR Article | Status | Implementation                                                                                                                       |
| --- | ------------------------------ | ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 4.1 | Right of access                | Art. 15      | PASS   | `gdpr-export.service.ts` generates ZIP with all user data; accessible via Settings > Profile > Data Export                           |
| 4.2 | Right to rectification         | Art. 16      | PASS   | Profile form in settings page; DPO contact at `privacy@inovico.nl`                                                                   |
| 4.3 | Right to erasure               | Art. 17      | PASS   | `gdpr-deletion.service.ts` with 30-day soft delete, SHA-256 anonymization, Settings > Profile > Data Deletion UI                     |
| 4.4 | Right to restriction           | Art. 18      | PASS   | `privacy-request.service.ts` with `privacy_requests` table; Settings > Profile > Privacy Rights UI; `isProcessingRestricted()` check |
| 4.5 | Right to data portability      | Art. 20      | PASS   | `gdpr-export.service.ts` generates machine-readable JSON in ZIP format; 7-day download window                                        |
| 4.6 | Right to object                | Art. 21      | PASS   | `privacy-request.service.ts` with objection type; scoped to AI analysis, analytics, marketing, or all processing                     |
| 4.7 | Rights re: automated decisions | Art. 22      | PASS   | AI generates suggestions only; no automated decisions with legal effects; human review required                                      |
| 4.8 | Response within 30 days        | Art. 12      | PASS   | Deletion has 30-day processing; export immediate; privacy requests tracked with timestamps                                           |

## 5. Consent Management (Articles 6-7)

| #   | Requirement                              | Status | Evidence                                                                                  |
| --- | ---------------------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| 5.1 | Freely given, specific, informed consent | PASS   | `consent.ts` schema with explicit-only method enforcement; consent banner with disclosure |
| 5.2 | Separate consent for separate purposes   | PASS   | Consent is per-recording, per-participant; not bundled                                    |
| 5.3 | Easy withdrawal of consent               | PASS   | `revokeConsent()` in `consent.service.ts`; revoke action in UI                            |
| 5.4 | Consent records and proof                | PASS   | `consent-audit-log.ts` tracks IP, user agent, timestamp; 5-year retention                 |
| 5.5 | Children's consent (Art. 8)              | N/A    | Inovy is a B2B service; not directed at children under 16                                 |

## 6. Transparency and Information (Articles 12-14)

| #   | Requirement                   | Status | Evidence                                                                |
| --- | ----------------------------- | ------ | ----------------------------------------------------------------------- |
| 6.1 | Privacy policy accessible     | PASS   | `(legal)/privacy-policy/page.tsx` — publicly accessible, Dutch language |
| 6.2 | Controller identity disclosed | PASS   | Privacy policy identifies Inovico B.V. with contact details             |
| 6.3 | Processing purposes stated    | PASS   | Privacy policy §3 details all processing purposes                       |
| 6.4 | Legal bases disclosed         | PASS   | Privacy policy §3 maps each purpose to legal basis                      |
| 6.5 | Retention periods documented  | PASS   | Privacy policy §4 with specific periods; POL-15 §5.1 retention schedule |
| 6.6 | Data subject rights explained | PASS   | Privacy policy §5 describes all rights with exercise instructions       |
| 6.7 | DPO contact provided          | PASS   | `privacy@inovico.nl` in privacy policy and POL-15                       |
| 6.8 | Right to complain to DPA      | PASS   | Privacy policy references Autoriteit Persoonsgegevens                   |

## 7. Data Security (Article 32)

| #   | Measure                  | Status | Evidence                                                                                                    |
| --- | ------------------------ | ------ | ----------------------------------------------------------------------------------------------------------- |
| 7.1 | Encryption at rest       | PASS   | AES-256-GCM with PBKDF2 key derivation (`encryption.ts`); Neon PostgreSQL encrypted                         |
| 7.2 | Encryption in transit    | PASS   | TLS 1.2+ enforced; HSTS header; all third-party APIs over HTTPS                                             |
| 7.3 | Access controls          | PASS   | 6-role RBAC (`rbac.ts`); organization isolation (`organization-isolation.ts`); returns 404 not 403          |
| 7.4 | Audit logging            | PASS   | `audit-log.service.ts` with SHA-256 hash chain; 30+ event types; 3-year retention                           |
| 7.5 | Password security        | PASS   | scrypt (N=16384, r=16, p=1, dkLen=64); HIBP breach checking; account lockout (5 attempts / 15 min)          |
| 7.6 | PII redaction in logs    | PASS   | Pino `redact` config for password, apiKey, token, email, etc.; `pii-utils.ts` for HMAC-SHA256 anonymization |
| 7.7 | Regular security testing | PASS   | SSD norms compliance; ISO 27001 controls framework                                                          |

## 8. Data Processing Agreements (Article 28)

| Processor       | DPA in Place | Data Shared          | Purpose             |
| --------------- | ------------ | -------------------- | ------------------- |
| Microsoft Azure | Yes          | All application data | Hosting             |
| Neon            | Yes          | Database content     | PostgreSQL hosting  |
| OpenAI          | Yes          | Transcript segments  | AI insights         |
| Anthropic       | Yes          | Transcript segments  | AI insights         |
| Deepgram        | Yes          | Audio recordings     | Transcription       |
| Recall.ai       | Yes          | Meeting bot access   | Recording ingestion |
| Stripe          | Yes          | Billing data         | Payments            |
| Resend          | Yes          | Email addresses      | Transactional email |
| Google          | Yes          | OAuth identity       | SSO                 |
| Microsoft       | Yes          | OAuth identity       | SSO                 |

**Reference**: POL-15 §7.5

## 9. Data Protection Impact Assessment (Article 35)

| #   | Requirement                   | Status | Evidence                                                                                          |
| --- | ----------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| 9.1 | DPIA for high-risk processing | PASS   | `docs/gdpr/dpia-ai-meeting-analysis.md` covers AI analysis of meeting content                     |
| 9.2 | DPIA triggers defined         | PASS   | POL-15 §4.4 lists triggers (special category data, BSN processing, new AI models, new processors) |
| 9.3 | DPO consultation              | PASS   | POL-15 §4.4: DPIAs conducted by ISM in consultation with DPO                                      |

## 10. Breach Notification (Articles 33-34)

| #    | Requirement               | Status | Evidence                                                          |
| ---- | ------------------------- | ------ | ----------------------------------------------------------------- |
| 10.1 | 72-hour DPA notification  | PASS   | POL-15 §9; POL-07 (Incident Response) coordinates breach response |
| 10.2 | Data subject notification | PASS   | POL-15 §9: notification when high risk to rights/freedoms         |
| 10.3 | Breach documentation      | PASS   | POL-07 incident management process; audit logs                    |
| 10.4 | Password breach detection | PASS   | `password-breach-check.service.ts` — HIBP k-anonymity API         |

## 11. Records of Processing Activities (Article 30)

| #    | Requirement                        | Status | Evidence                                                                                |
| ---- | ---------------------------------- | ------ | --------------------------------------------------------------------------------------- |
| 11.1 | RoPA maintained                    | PASS   | `docs/gdpr/records-of-processing-activities.md`                                         |
| 11.2 | Processing activities documented   | PASS   | All activities documented with purposes, legal bases, categories, recipients, retention |
| 11.3 | Available to supervisory authority | PASS   | Documented and maintained within ISMS                                                   |

## 12. International Data Transfers (Articles 44-49)

| #    | Requirement                        | Status | Evidence                                                                                   |
| ---- | ---------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| 12.1 | Adequate transfer safeguards       | PASS   | Standard Contractual Clauses (SCCs) with US-based processors (OpenAI, Anthropic, Deepgram) |
| 12.2 | EU-based processing where possible | PASS   | Azure EU-Central-1; Neon EU region; Vercel EU edge                                         |
| 12.3 | Transfer documentation             | PASS   | Privacy policy §6 documents international transfers; POL-15 §7.5                           |

## 13. Cookie Compliance (ePrivacy Directive)

| #    | Requirement             | Status | Evidence                                                                            |
| ---- | ----------------------- | ------ | ----------------------------------------------------------------------------------- |
| 13.1 | Cookie notice displayed | PASS   | `cookie-consent.tsx` component in root layout                                       |
| 13.2 | Functional cookies only | PASS   | Privacy policy §7: session cookies, auth tokens only; no tracking/marketing cookies |
| 13.3 | Analytics anonymized    | PASS   | Vercel Analytics with geoIP anonymization                                           |
| 13.4 | Link to privacy policy  | PASS   | Cookie banner links to `/privacy-policy`                                            |

## 14. Privacy by Design and Default (Article 25)

| #    | Measure                     | Status | Evidence                                                                              |
| ---- | --------------------------- | ------ | ------------------------------------------------------------------------------------- |
| 14.1 | Data minimization by design | PASS   | Minimal fields collected; PII auto-detection and redaction                            |
| 14.2 | Pseudonymization            | PASS   | HMAC-SHA256 in `pii-utils.ts`; anonymized IDs in audit logs                           |
| 14.3 | Organization isolation      | PASS   | `organization-isolation.ts` mandatory filter on all queries; returns 404 not 403      |
| 14.4 | Server-side processing      | PASS   | Next.js RSC; sensitive data never in client bundle; `NEXT_PUBLIC_` prefix enforcement |

## 15. Summary

| Category                  | PASS   | PARTIAL | N/A   | Total  |
| ------------------------- | ------ | ------- | ----- | ------ |
| GDPR Principles (Art. 5)  | 7      | 0       | 0     | 7      |
| Lawful Basis (Art. 6)     | 7      | 0       | 0     | 7      |
| Data Subject Rights       | 8      | 0       | 0     | 8      |
| Consent (Art. 6-7)        | 4      | 0       | 1     | 5      |
| Transparency (Art. 12-14) | 8      | 0       | 0     | 8      |
| Data Security (Art. 32)   | 7      | 0       | 0     | 7      |
| DPAs (Art. 28)            | 10     | 0       | 0     | 10     |
| DPIA (Art. 35)            | 3      | 0       | 0     | 3      |
| Breach Notification       | 4      | 0       | 0     | 4      |
| RoPA (Art. 30)            | 3      | 0       | 0     | 3      |
| International Transfers   | 3      | 0       | 0     | 3      |
| Cookie Compliance         | 4      | 0       | 0     | 4      |
| Privacy by Design         | 4      | 0       | 0     | 4      |
| **Total**                 | **72** | **0**   | **1** | **73** |

---

## Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
