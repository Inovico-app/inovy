# Information Classification and Handling Policy

| Field              | Value                        |
| ------------------ | ---------------------------- |
| Document ID        | POL-04                       |
| Version            | 1.0                          |
| Classification     | Internal                     |
| Owner              | Information Security Manager |
| Approved by        | CEO/CTO                      |
| Effective date     | 2026-03-13                   |
| Review date        | 2027-03-13                   |
| ISO 27001 Controls | A.5.12, A.5.13, A.5.14       |

---

## 1. Purpose

This policy establishes a classification scheme for Inovy's information assets and prescribes handling rules that ensure information is protected commensurate with its sensitivity and value. Consistent classification enables staff to make appropriate decisions about storage, transmission, and disposal without requiring case-by-case guidance.

## 2. Scope

This policy applies to:

- All information created, received, stored, processed, or transmitted by Inovy B.V.
- All formats: digital files, database records, emails, documents, verbal communications, and printed materials
- All employees, contractors, and third parties acting on behalf of Inovy
- All environments: production, staging, development, and backups

## 3. Reference Documents

- POL-03 Asset Management Policy
- POL-05 Cryptography and Key Management Policy
- POL-06 Supplier Security Policy
- GDPR (Regulation (EU) 2016/679)
- AVG (Algemene verordening gegevensbescherming) — Dutch implementation

---

## 4. Classification Scheme (A.5.12)

Inovy uses a four-tier classification scheme. Every piece of information must be assigned one of the following classifications:

### 4.1 Public

**Definition:** Information that has been approved for release to the general public, or that carries no reputational or regulatory risk if disclosed.

**Examples:**

- Marketing website content and blog posts
- Public API documentation
- Open-source libraries published by Inovy
- Job postings
- Press releases and public announcements

**Default handling:** No special controls required beyond accuracy and brand consistency.

---

### 4.2 Internal

**Definition:** Information intended for use within Inovy by all employees and authorised contractors. Disclosure outside the organisation is not approved but would not cause material harm.

**Examples:**

- Internal process documentation and runbooks
- Architecture diagrams and system design documents
- Non-sensitive configuration files (e.g., feature flags without secrets)
- Team meeting notes (non-sensitive)
- Qdrant and Redis operational data
- Third-party AI API access metadata (not the actual customer data processed)
- HR policies and procedures (non-confidential sections)

**Default handling:** Access limited to Inovy employees and authorised contractors. Must not be shared publicly.

---

### 4.3 Confidential

**Definition:** Sensitive business, technical, or customer information where unauthorised disclosure could cause material harm to Inovy, its customers, or third parties.

**Examples:**

- Source code (GitHub repository — AST-005, AST-007)
- Customer personal data: email addresses, names, account details (AST-010)
- Meeting transcripts and AI-generated summaries (AST-009)
- Database contents (Neon PostgreSQL — AST-001)
- Audit logs (AST-022)
- Stripe payment data (payment identifiers, subscription details; full PAN data is never stored by Inovy)
- Employee personal data (salary, performance reviews)
- Security vulnerability reports and penetration test results
- Infrastructure state (Terraform state — AST-024)
- Business contracts and financial information

**Default handling:** Access on a need-to-know basis. Must be encrypted in transit and at rest. Sharing requires explicit authorisation.

---

### 4.4 Restricted

**Definition:** The most sensitive information Inovy holds. Unauthorised disclosure would likely cause severe harm: regulatory penalties, significant reputational damage, loss of customer trust, or direct harm to individuals.

**Examples:**

- Encryption keys and secrets: `ENCRYPTION_MASTER_KEY`, `OAUTH_ENCRYPTION_KEY`, `BETTER_AUTH_SECRET`, `CRON_SECRET`, `UPLOAD_TOKEN_SECRET` (AST-006, AST-023)
- Third-party API keys with broad permissions (OpenAI, Deepgram, Anthropic, Recall.ai, Stripe secret keys)
- Customer meeting recordings (audio/video — AST-008)
- Personal data that is likely to include special categories: BSN (Burgerservicenummer) numbers, health information, biometric data appearing in meeting recordings
- GDPR subject access request exports
- Data breach investigation records

**Default handling:** Strictly need-to-know. Encrypted at rest (AES-256-GCM) and in transit (TLS 1.2+). Access subject to explicit individual authorisation. Audit trail required.

---

## 5. Classification Process

### 5.1 Default Classification

If an item of information cannot be classified using the criteria above, it must be treated as **Confidential** until the Information Security Manager assigns a classification.

### 5.2 Classification Responsibility

Information is classified at the point of creation by the creator, or — for received information — by the first Inovy employee who processes it. The classification is inherited by all copies and derivatives of the information.

### 5.3 Re-classification

Re-classification to a lower level requires approval from the Information Security Manager. Re-classification to a higher level may be done by the asset owner without approval (applying stricter controls is always acceptable). All re-classification decisions must be documented in the asset register.

---

## 6. Labelling Requirements (A.5.13)

### 6.1 Document Labelling

All documents classified as Internal, Confidential, or Restricted must bear their classification label:

- **Digital documents (Markdown, PDF, Word, Google Docs):** Classification label in the document header (e.g., the metadata table used in this policy)
- **Email:** Subject line prefix: `[INTERNAL]`, `[CONFIDENTIAL]`, or `[RESTRICTED]`
- **Spreadsheets and data exports:** Filename must include the classification (e.g., `audit-log-export-CONFIDENTIAL-2026-01-01.csv`)
- **Slack messages containing sensitive data:** Must use the appropriate DLP notation where supported

### 6.2 Source Code Labelling

Source code files containing security-sensitive logic must include a comment header:

```typescript
// Classification: CONFIDENTIAL
// This file contains encryption logic. Do not share or include in client bundles.
```

### 6.3 Database and API Labelling

Database tables containing Confidential or Restricted data must be documented in the database schema documentation with their classification. API endpoints that return Confidential or Restricted data must be noted in the API documentation.

### 6.4 Azure Resource Tagging

All Azure resources must carry the `classification` tag as specified in POL-03 Section 6.2.

---

## 7. Handling Rules by Classification

### 7.1 Storage

| Classification | At-rest encryption     | Access control             | Backup              |
| -------------- | ---------------------- | -------------------------- | ------------------- |
| Public         | Not required           | Not required               | Optional            |
| Internal       | Recommended            | Employee-level auth        | Recommended         |
| Confidential   | Required               | RBAC, need-to-know         | Required            |
| Restricted     | Required (AES-256-GCM) | Individual-level auth, MFA | Required, encrypted |

**Specific controls in production:**

- **Neon PostgreSQL (AST-001):** All connections use `sslmode=require`. The database is encrypted at rest by the Neon platform using AES-256
- **Azure Blob Storage (AST-002):** All containers are configured with "private" access tier. Azure Storage Service Encryption (AES-256) is enabled. Versioning and soft-delete are enabled
- **Qdrant (AST-003):** Access secured by API key. Data encrypted at rest by Qdrant Cloud platform
- **Encryption keys (AST-023):** Stored in `.env` files on developer machines with full-disk encryption. In production, stored as GitHub Actions secrets and injected at runtime. Migration to Azure Key Vault is planned (see POL-05)

### 7.2 Transmission

All data transmission is subject to the following minimum transport security requirements:

| Classification | Minimum transport security                                                                      |
| -------------- | ----------------------------------------------------------------------------------------------- |
| Public         | HTTP acceptable for non-sensitive content; HTTPS preferred                                      |
| Internal       | HTTPS (TLS 1.2+) required                                                                       |
| Confidential   | HTTPS (TLS 1.2+) required; end-to-end encryption preferred                                      |
| Restricted     | HTTPS (TLS 1.2+) required; end-to-end encryption required; signed and short-lived access tokens |

**Implementation details:**

- All Inovy web application traffic is served over HTTPS via Azure Container Apps with TLS termination
- Database connections use `sslmode=require` (PostgreSQL TLS)
- Azure Blob Storage recordings are served via signed SAS (Shared Access Signature) tokens with a short expiry (maximum 1 hour), not public URLs
- API calls to OpenAI, Deepgram, and Anthropic are made server-side over HTTPS; customer data is never transmitted to these services from the client browser directly

### 7.3 Sharing and Transfer (A.5.14)

#### 7.3.1 Internal Sharing

- **Public / Internal:** May be shared via Google Workspace, Notion, or Slack without restriction
- **Confidential:** May be shared with authorised Inovy employees via approved tools. Must not be attached to personal email or sent via unapproved channels
- **Restricted:** Sharing is strictly limited to individuals with an explicit business need. Must use encrypted channels. API keys and encryption keys must never be shared via Slack, email, or chat — use a secrets manager or encrypted password manager (e.g., 1Password)

#### 7.3.2 Third-Party Transfer

Transfer of Inovy data to third parties is governed by POL-06. Key requirements:

- A Data Processing Agreement (DPA) must be in place before transferring any personal data
- Transfers of special category personal data (health data, BSN) require explicit legal basis and enhanced due diligence
- Transfers of Restricted data to third-party processors (e.g., recordings sent to Deepgram for transcription) must be logged and reviewed at the next quarterly supplier review
- International transfers of personal data (e.g., to OpenAI and Anthropic, which process in the USA) must rely on Standard Contractual Clauses (SCCs) or an equivalent GDPR transfer mechanism

#### 7.3.3 Electronic Transfer Protocols

- File transfers must use SFTP, HTTPS, or an equivalently secure protocol
- Email attachment of Confidential data is permitted only when the attachment is encrypted and the password is shared via a separate channel
- Email attachment of Restricted data (including encryption keys or BSN data) is prohibited under all circumstances

### 7.4 Disposal

| Classification | Disposal method                                                      |
| -------------- | -------------------------------------------------------------------- |
| Public         | Standard deletion                                                    |
| Internal       | Standard secure deletion                                             |
| Confidential   | Secure deletion (overwrite or cryptographic erasure)                 |
| Restricted     | Cryptographic erasure with key destruction; documented and witnessed |

Digital files must be deleted using methods that prevent recovery. For cloud storage (Azure Blob), deletion is confirmed via the Azure Storage API. Cryptographic erasure (deleting the encryption key for the data) is used where overwriting is not practical.

Physical documents containing Confidential or Restricted information must be shredded using a cross-cut or micro-cut shredder.

---

## 8. Special Categories of Personal Data

Under GDPR Article 9, special categories of personal data require heightened protection. Inovy's meeting recordings may contain:

- Health information (employees discussing medical matters in meetings)
- Biometric data (voice recordings that can identify individuals)
- Political opinions, religious beliefs, or other special categories

Such data is classified as **Restricted** regardless of the overall sensitivity of the meeting. Where Inovy identifies that a recording or transcript contains special category data:

1. Access is restricted to the minimum necessary personnel
2. The data subject's rights are noted and handled with priority
3. Retention is minimised (special category data is deleted as soon as the processing purpose is fulfilled)
4. The Data Protection Officer (or equivalent) is informed

BSN (Burgerservicenummer) data is classified as **Restricted**. Inovy should not be collecting BSN data in normal operation; any instance where BSN data appears in meeting content should be treated as a data protection incident and reported to the Information Security Manager.

---

## 9. Roles and Responsibilities

| Role                         | Responsibility                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------- |
| Information Security Manager | Policy ownership, classification disputes, re-classification approvals, DPA oversight |
| Engineering Lead             | Implementing classification controls in code and infrastructure                       |
| Asset Owners                 | Classifying assets under their ownership, ensuring handling rules are followed        |
| All employees                | Correctly classifying information they create, following handling rules               |
| Data Protection Officer      | Oversight of personal data classification and special category handling               |

---

## 10. Non-Compliance

Failure to correctly classify or handle information — particularly Confidential or Restricted data — may constitute a breach of GDPR and will be treated as a serious security incident under POL-07. Wilful misclassification to circumvent controls is subject to the disciplinary process in POL-09 Section 4.

---

## 11. Policy Review

This policy is reviewed annually or following a data incident, a change in the data types processed by Inovy, a regulatory change, or a significant change to the technology stack.

| Revision | Date       | Author                       | Summary of Changes |
| -------- | ---------- | ---------------------------- | ------------------ |
| 1.0      | 2026-03-13 | Information Security Manager | Initial release    |
