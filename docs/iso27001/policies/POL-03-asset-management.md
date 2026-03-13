# Asset Management Policy

| Field              | Value                         |
| ------------------ | ----------------------------- |
| Document ID        | POL-03                        |
| Version            | 1.0                           |
| Classification     | Internal                      |
| Owner              | Information Security Manager  |
| Approved by        | CEO/CTO                       |
| Effective date     | 2026-03-13                    |
| Review date        | 2027-03-13                    |
| ISO 27001 Controls | A.5.9, A.5.11, A.5.12, A.5.13 |

---

## 1. Purpose

This policy defines the requirements for identifying, recording, classifying, and managing all information assets owned or controlled by Inovy B.V. Effective asset management ensures that assets receive appropriate protection commensurate with their value and the sensitivity of the information they contain or process.

## 2. Scope

This policy applies to:

- All hardware and software assets owned or leased by Inovy
- All information assets created, processed, stored, or transmitted by Inovy systems
- All cloud services and SaaS platforms used by Inovy
- All employees, contractors, and third parties who are custodians of Inovy assets
- All environments: production, staging, and development

## 3. Reference Documents

- POL-04 Information Classification and Handling Policy
- POL-06 Supplier Security Policy
- POL-09 HR Security Policy
- POL-10 Remote Working Policy

---

## 4. Inventory of Assets (A.5.9)

### 4.1 Asset Register Requirements

Inovy maintains a comprehensive asset register that is reviewed quarterly and updated whenever assets are added, modified, or decommissioned. Each asset entry must include:

- A unique Asset ID
- Asset name and description
- Asset type (data, software, hardware, service, or facility)
- Designated owner (individual or team responsible for the asset)
- Information classification (per POL-04: Public, Internal, Confidential, Restricted)
- Physical or logical location
- Key dependencies on other assets

### 4.2 Asset Register

The following table constitutes Inovy's current information asset register. The Engineering Lead and Information Security Manager are responsible for keeping this register current.

| Asset ID | Asset                                                         | Type     | Owner                        | Classification | Location                                               | Dependencies                                |
| -------- | ------------------------------------------------------------- | -------- | ---------------------------- | -------------- | ------------------------------------------------------ | ------------------------------------------- |
| AST-001  | Neon PostgreSQL (primary database)                            | Service  | Engineering Lead             | Confidential   | EU-Central-1 (Neon cloud)                              | AST-007, AST-008, AST-009                   |
| AST-002  | Azure Blob Storage (recordings)                               | Service  | Engineering Lead             | Confidential   | West Europe (Azure)                                    | AST-001                                     |
| AST-003  | Qdrant vector database                                        | Service  | Engineering Lead             | Internal       | Cloud-hosted (Qdrant Cloud)                            | AST-001, AST-009                            |
| AST-004  | Redis cache (Upstash)                                         | Service  | Engineering Lead             | Internal       | Upstash / Azure region                                 | AST-001                                     |
| AST-005  | GitHub repository (inovy monorepo)                            | Service  | Engineering Lead             | Confidential   | GitHub (cloud-hosted)                                  | —                                           |
| AST-006  | Application secrets (.env, ENCRYPTION_MASTER_KEY, API keys)   | Data     | Information Security Manager | Restricted     | GitHub Actions secrets, .env.local (developer devices) | AST-001, AST-002, AST-005                   |
| AST-007  | Source code                                                   | Data     | Engineering Lead             | Confidential   | GitHub (AST-005)                                       | AST-005                                     |
| AST-008  | Customer meeting recordings                                   | Data     | Engineering Lead             | Restricted     | Azure Blob Storage (AST-002)                           | AST-001, AST-002                            |
| AST-009  | Meeting transcripts and AI summaries                          | Data     | Engineering Lead             | Confidential   | Neon PostgreSQL (AST-001)                              | AST-001                                     |
| AST-010  | User PII (email, name, account data)                          | Data     | Information Security Manager | Confidential   | Neon PostgreSQL (AST-001)                              | AST-001                                     |
| AST-011  | BSN and sensitive personal data                               | Data     | Information Security Manager | Restricted     | Neon PostgreSQL (AST-001)                              | AST-001                                     |
| AST-012  | OpenAI API access                                             | Service  | Engineering Lead             | Internal       | OpenAI cloud (USA)                                     | AST-006                                     |
| AST-013  | Deepgram API access                                           | Service  | Engineering Lead             | Internal       | Deepgram cloud                                         | AST-006, AST-008                            |
| AST-014  | Anthropic API access                                          | Service  | Engineering Lead             | Internal       | Anthropic cloud (USA)                                  | AST-006                                     |
| AST-015  | Recall.ai integration                                         | Service  | Engineering Lead             | Internal       | Recall.ai cloud                                        | AST-006, AST-008                            |
| AST-016  | Stripe payment processing                                     | Service  | Engineering Lead             | Confidential   | Stripe cloud                                           | AST-006, AST-010                            |
| AST-017  | Resend email delivery                                         | Service  | Engineering Lead             | Internal       | Resend cloud                                           | AST-006                                     |
| AST-018  | Google Workspace (email, calendar, docs)                      | Service  | CEO                          | Internal       | Google cloud                                           | AST-010                                     |
| AST-019  | Team laptops / developer devices                              | Hardware | Individual employees         | Internal       | Off-premises (remote-first)                            | AST-005, AST-006                            |
| AST-020  | Azure Container Apps (application hosting)                    | Service  | Engineering Lead             | Confidential   | West Europe (Azure)                                    | AST-001, AST-002, AST-003, AST-004, AST-006 |
| AST-021  | GitHub Actions CI/CD pipelines                                | Service  | Engineering Lead             | Confidential   | GitHub (cloud-hosted)                                  | AST-005, AST-006, AST-020                   |
| AST-022  | Audit logs                                                    | Data     | Information Security Manager | Confidential   | Neon PostgreSQL (AST-001)                              | AST-001                                     |
| AST-023  | Encryption keys (ENCRYPTION_MASTER_KEY, OAUTH_ENCRYPTION_KEY) | Data     | Information Security Manager | Restricted     | .env files / GitHub Actions secrets                    | AST-006                                     |
| AST-024  | Terraform infrastructure state                                | Data     | Engineering Lead             | Confidential   | Azure Storage / GitHub                                 | AST-005, AST-020                            |

### 4.3 Asset Ownership Responsibilities

Each asset owner is responsible for:

- Approving access requests to the asset
- Ensuring the asset is appropriately classified
- Conducting or overseeing periodic reviews of who has access
- Ensuring the asset is decommissioned securely when no longer required
- Ensuring protective controls appropriate to the classification are in place

Asset ownership does not transfer unless explicitly documented and approved by the Information Security Manager.

---

## 5. Asset Classification (A.5.12)

All assets are classified in accordance with POL-04 Information Classification and Handling Policy. The four classification levels are:

| Classification | Description                                                             | Examples from asset register                                        |
| -------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Public         | Approved for public release                                             | Marketing website, public documentation                             |
| Internal       | For internal use; not intended for public disclosure                    | Architecture diagrams, team docs, Qdrant, Redis                     |
| Confidential   | Sensitive business or customer data; restricted to authorised personnel | Source code, user PII, database, audit logs, recordings             |
| Restricted     | Highest sensitivity; requires strict controls                           | Encryption keys, API secrets, BSN data, medical data in transcripts |

Classification is assigned by the asset owner and recorded in the asset register. Re-classification requires approval from the Information Security Manager.

---

## 6. Labelling of Assets (A.5.13)

### 6.1 Document and File Labelling

All documents, files, and data outputs classified as Internal, Confidential, or Restricted must be labelled with their classification at the point of creation. Labelling conventions:

- Documents: Classification label in the header (as demonstrated in this policy document)
- Source code files containing sensitive logic: Comment header indicating sensitivity (e.g., `// CONFIDENTIAL — contains encryption logic`)
- Database exports: Filenames must include the classification (e.g., `users-export-CONFIDENTIAL-2026-01-01.csv`)
- Email: Subject line prefix for Confidential/Restricted emails (e.g., `[CONFIDENTIAL]`)

### 6.2 Cloud Resource Labelling

All Azure resources are tagged with the following mandatory tags:

| Tag key          | Example value  | Purpose          |
| ---------------- | -------------- | ---------------- |
| `classification` | `confidential` | Data sensitivity |
| `owner`          | `engineering`  | Responsible team |
| `environment`    | `production`   | Deployment tier  |
| `project`        | `inovy`        | Cost allocation  |

GitHub repositories are labelled using repository topics and README badges.

### 6.3 Physical Asset Labelling

Company-issued laptops and devices are labelled with an asset tag (physical sticker with the Asset ID from the register). Devices without an asset tag are not authorised for use with Inovy systems.

---

## 7. Return of Assets (A.5.11)

### 7.1 Return on Termination or Change

When an employee or contractor's relationship with Inovy ends, or when they change roles, the following asset return process must be completed:

**Within 24 hours of the effective date:**

1. All company-issued hardware (laptops, phones, tokens) must be returned to the company or shipping arranged
2. Access to all digital assets is revoked (see POL-01 Section 7.3 and POL-09 Section 5)
3. GitHub organisation membership is removed
4. Access to cloud infrastructure consoles (Azure, Neon, Upstash) is revoked
5. Slack and Google Workspace accounts are deprovisioned

**Data on personal devices:**

If the departing individual used a personal device under BYOD arrangements, they must confirm in writing (via the exit checklist in POL-09) that all Inovy data has been deleted from personal devices. This includes:

- Local copies of source code or `.env` files
- Downloaded recordings or transcripts
- Cached credentials or API keys stored in local tools (e.g., database clients, `~/.aws/credentials`, etc.)

### 7.2 Return on Asset Decommissioning

When a service or hardware asset is decommissioned:

1. All data stored on the asset is securely deleted or migrated to the replacement asset
2. Credentials and API keys associated with the asset are rotated or revoked
3. The asset is marked as decommissioned in the asset register with the decommission date and method
4. For cloud services: accounts are closed and data deletion is confirmed with the supplier
5. For hardware: devices are wiped using NIST 800-88 compliant methods before disposal or return

### 7.3 Asset Transfer

When an asset is transferred to a different owner:

1. The transfer is documented in the asset register
2. The new owner is notified of the asset's classification and their responsibilities
3. Access rights are reviewed and updated to reflect the new ownership structure

---

## 8. Asset Lifecycle Management

### 8.1 Provisioning

New assets are added to the asset register before being put into production use. The Engineering Lead is responsible for raising asset registration requests for new technology services. The Information Security Manager approves additions of Confidential or Restricted assets.

### 8.2 Periodic Review

The asset register is reviewed quarterly as part of the access review process. Reviews verify that:

- All assets are still in use and accurately described
- Classifications are still appropriate
- Owners are still the correct individuals
- No unregistered assets have been introduced (shadow IT)

### 8.3 Decommissioning

Assets are decommissioned using the process in Section 7.2. The minimum retention period before data destruction is in line with Inovy's data retention schedule and applicable legal requirements (Dutch and EU law), which generally require certain business records to be kept for 7 years.

---

## 9. Special Considerations for AI-Processed Data

Customer data that has been processed by AI services (OpenAI, Deepgram, Anthropic) may reside in those services' processing infrastructure temporarily. Inovy's DPAs with these processors specify:

- Data is not used to train models
- Data is deleted after processing within the retention period specified in the DPA
- Processing is limited to the EU or to services with adequate EU data transfer safeguards

Assets relating to AI processing outputs (transcripts, summaries, embeddings) are classified as Confidential and remain subject to the full asset lifecycle controls in this policy.

---

## 10. Roles and Responsibilities

| Role                         | Responsibility                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------- |
| Information Security Manager | Asset register maintenance, classification approval, return process oversight    |
| Engineering Lead             | Technical asset lifecycle, cloud resource tagging, service decommissioning       |
| Asset Owners                 | Approving access, ensuring classification accuracy, conducting reviews           |
| HR Manager                   | Triggering return process upon termination, confirming exit checklist completion |
| All staff                    | Reporting unregistered assets, following return procedures                       |

---

## 11. Policy Review

This policy is reviewed annually or when significant changes occur to the technology landscape, the supplier base, or applicable regulations.

| Revision | Date       | Author                       | Summary of Changes |
| -------- | ---------- | ---------------------------- | ------------------ |
| 1.0      | 2026-03-13 | Information Security Manager | Initial release    |
