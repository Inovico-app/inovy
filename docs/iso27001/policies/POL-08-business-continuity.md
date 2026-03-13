# Business Continuity and Disaster Recovery Plan

| Field              | Value                          |
| ------------------ | ------------------------------ |
| Document ID        | POL-08                         |
| Version            | 1.0                            |
| Classification     | Internal                       |
| Owner              | Information Security Manager   |
| Approved by        | CEO/CTO                        |
| Effective date     | 2026-03-13                     |
| Review date        | 2027-03-13                     |
| ISO 27001 Controls | A.5.29, A.5.30, A.8.13, A.8.14 |

---

## 1. Purpose

This policy establishes Inovy's approach to maintaining and restoring critical business operations in the event of a significant disruption. As a SaaS platform handling time-sensitive AI-powered meeting analysis for enterprise customers, Inovy must ensure that service availability and data integrity are maintained to meet customer contractual obligations and regulatory requirements.

## 2. Scope

This policy applies to:

- All Inovy information systems and services used to deliver the platform to customers
- All environments: production (primary focus), staging
- The Engineering Lead, CTO, and Information Security Manager as custodians of the DR plan
- Third-party services whose availability Inovy depends on

## 3. Reference Documents

- POL-03 Asset Management Policy (asset dependencies)
- POL-06 Supplier Security Policy (third-party availability obligations)
- POL-07 Incident Response Plan (for security-driven disruptions)

---

## 4. Recovery Objectives

The following recovery time and recovery point objectives define Inovy's continuity targets:

### 4.1 Recovery Time Objectives (RTO)

RTO is the maximum tolerable time between a disruption and restoration of the service to a minimum viable operating state.

| Service component                                 | RTO      | Rationale                                                    |
| ------------------------------------------------- | -------- | ------------------------------------------------------------ |
| Web application (Next.js on Azure Container Apps) | 4 hours  | Customer-facing; SLA obligation                              |
| Neon PostgreSQL database                          | 8 hours  | Required for all platform functionality                      |
| Azure Blob Storage (recordings)                   | 8 hours  | Recordings may be queued and processed on recovery           |
| Qdrant vector database                            | 12 hours | Semantic search non-critical; fallback to keyword search     |
| Redis cache (Upstash)                             | 2 hours  | Auto-failover via Upstash managed service; minimal data held |
| CI/CD pipeline (GitHub Actions)                   | 24 hours | Not customer-facing; deployments can be queued               |

### 4.2 Recovery Point Objectives (RPO)

RPO is the maximum acceptable data loss measured in time.

| Data asset                               | RPO                          | Backup mechanism                                                 |
| ---------------------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| Neon PostgreSQL (all tables)             | 1 hour                       | Neon WAL continuous streaming + PITR (Point-in-Time Recovery)    |
| Azure Blob Storage (recordings, uploads) | 24 hours                     | Azure versioning + soft delete (7-day retention)                 |
| Qdrant embeddings                        | 24 hours                     | Embeddings can be regenerated from transcripts; Qdrant snapshots |
| Redis cache                              | Effectively zero (ephemeral) | Cache is re-populated on first request; no durable data          |
| Source code (GitHub)                     | Real-time                    | Git distributed; GitHub maintains multiple replicas              |
| Infrastructure configuration             | Real-time                    | Terraform state stored in Azure Storage with versioning          |

---

## 5. Backup Strategy (A.8.13)

### 5.1 Database Backups (Neon PostgreSQL)

Neon provides continuous WAL (Write-Ahead Log) archiving for point-in-time recovery:

- **Continuous WAL streaming:** All database transactions are streamed to Neon's backup infrastructure in real time
- **Point-in-Time Recovery (PITR):** Neon supports PITR to any point within the last 7 days on the Pro plan. For compliance purposes, Inovy's plan is configured to retain backups for 30 days
- **Daily snapshots:** In addition to WAL, Neon performs daily logical backups. These are retained for 30 days
- **Backup verification:** Monthly restoration tests are performed to a staging environment to verify backup integrity. Results are documented in the backup verification log
- **Backup scope:** All production schemas and tables, including `users`, `organisations`, `meetings`, `recordings`, `transcripts`, `audit_logs`, `sessions`, and all other application tables

### 5.2 Azure Blob Storage Backups

Customer meeting recordings and uploaded files are stored in Azure Blob Storage (West Europe):

- **Versioning:** Azure Blob Storage versioning is enabled on the recordings container. All versions of each blob are retained for 90 days, allowing recovery from accidental deletion or corruption
- **Soft delete:** Container soft delete and blob soft delete are enabled with a 7-day retention period, protecting against accidental or malicious deletion
- **Locally Redundant Storage (LRS):** Data is stored with triple replication within the West Europe Azure region
- **Geo-redundant backup:** Critical backups use Azure Geo-Redundant Storage (GRS) or are copied to a secondary region (North Europe) as a secondary resilience measure for catastrophic region failure. Note: This secondary copy is used only for disaster recovery and does not affect the primary data residency commitment

### 5.3 Source Code and Infrastructure

- **Source code:** Stored in GitHub with distributed version control. Every developer's local clone is an implicit backup. GitHub maintains replicated infrastructure across multiple data centres
- **Infrastructure as code:** All Azure infrastructure is provisioned via Terraform. Terraform state is stored in an Azure Storage account with versioning enabled. Configuration is committed to the GitHub repository
- **GitHub Actions secrets:** Secrets are managed by GitHub and replicated within GitHub's infrastructure. Inovy maintains offline documentation of all secrets (encrypted, stored in 1Password) to enable recovery if GitHub is unavailable

### 5.4 Backup Security

- All backups inherit the encryption of the source system (Neon and Azure both encrypt at rest using AES-256)
- Access to backup restoration is restricted to the Engineering Lead and designated DR team members
- Backup credentials and restoration procedures are stored in 1Password, accessible to the Engineering Lead and CTO
- Restoration from backup to production requires approval from the Engineering Lead and a second approver (CTO or ISM)

---

## 6. Redundancy and High Availability (A.8.14)

### 6.1 Application Layer (Azure Container Apps)

The Inovy web application runs on Azure Container Apps with the following resilience configuration:

- **Minimum replicas:** 1 (outside peak hours); scales to 3 replicas during peak periods
- **Maximum replicas:** 10 (configured auto-scaling based on CPU and HTTP request concurrency)
- **Health probes:** Azure Container Apps readiness and liveness probes are configured. Unhealthy replicas are automatically replaced within 60 seconds
- **Zero-downtime deployments:** Deployments use a rolling update strategy. New revision traffic is gradually shifted to the new revision; the old revision is kept active until the new revision is confirmed healthy
- **Region:** West Europe. No automatic cross-region failover is currently implemented; cross-region DR follows the manual procedures in Section 7

### 6.2 Database Layer (Neon PostgreSQL)

- **Neon architecture:** Neon separates compute from storage. Storage is replicated across multiple nodes within the EU-Central-1 region
- **Compute availability:** Neon Pro provides connection pooling via PgBouncer, reducing connection exhaustion under high load
- **Read replicas:** A Neon read replica is configured for non-critical read queries (reporting, analytics, admin dashboards), offloading read traffic from the primary compute node. In a failover scenario, read replica promotion is possible within minutes
- **PITR window:** 30 days (see Section 5.1)

### 6.3 Cache Layer (Upstash Redis)

- **Upstash managed service:** Upstash provides managed Redis with automatic failover and replication. Data is ephemeral (cache, rate-limit counters, temporary tokens); a cache miss is handled gracefully by the application, which re-queries the database
- **No single point of failure:** The application is designed to function correctly if Redis is unavailable, with graceful degradation (performance impact, but no data loss or service failure)

### 6.4 Object Storage (Azure Blob Storage)

- **LRS:** Data is replicated three times within the West Europe region
- **Azure SLA:** Azure provides a 99.9% availability SLA for Blob Storage

---

## 7. Continuity Scenarios and Response Procedures

### 7.1 Scenario: Azure West Europe Region Failure

**Description:** A major Azure outage affects the West Europe region, causing the application, Blob Storage, and associated services to become unavailable.

**Detection:** Azure Service Health alerts configured in Azure Monitor; customer reports of service unavailability.

**Response steps:**

1. **Incident Lead** declares a P1 incident and notifies the engineering team
2. Confirm the outage scope with Azure Service Health dashboard
3. Assess estimated recovery time from Azure status page
4. If RTO is projected to exceed 4 hours: initiate cross-region failover
5. **Failover to North Europe:**
   a. Update DNS to point to a pre-provisioned standby environment in Azure North Europe (or deploy a new environment using Terraform)
   b. Restore the latest Neon PITR snapshot to a secondary database endpoint (Neon supports connecting to the same data from a different compute region)
   c. Restore critical recordings from Azure GRS secondary if available; otherwise, inform customers of the data-at-risk window
   d. Update the application configuration to point to the secondary database and storage endpoints
   e. Deploy the application to Azure North Europe using the existing GitHub Actions workflow
6. Communicate with customers via the status page and email
7. Monitor for Azure West Europe recovery and plan failback
8. Once primary region recovers: failback with data reconciliation before cutting back

**Failback considerations:** Any writes made to the secondary environment during the failover must be replicated back to the primary before decommissioning the secondary.

### 7.2 Scenario: Database Corruption or Accidental Deletion

**Description:** Data in the Neon PostgreSQL database is corrupted or accidentally deleted (e.g., a failed migration, a bug in a server action that deleted records incorrectly).

**Detection:** Error alerts from Application Insights; customer reports of missing data; automated data integrity checks.

**Response steps:**

1. Declare a P2 incident; escalate to P1 if customer data loss is confirmed
2. Immediately halt write operations to the affected tables if ongoing corruption is suspected (consider the kill-switch or temporary API disabling)
3. Identify the time of corruption/deletion using the Neon activity log and audit logs
4. Use Neon PITR to restore the database to a point just before the corruption event
5. Validate the restored data against expected checksums or row counts
6. For partial deletion: restore only the affected tables using a selective restore to staging; export the corrected data; import to production
7. Re-run any business-critical operations that were lost in the RPO window
8. Communicate data loss (if any) to affected customers

### 7.3 Scenario: Security Compromise of Production Systems

**Description:** The production environment has been compromised by an attacker (malware, backdoor, credential theft).

**Response steps:**

1. Follow POL-07 Incident Response Plan for containment
2. **Do not restore from backup to the compromised infrastructure** until the root cause is identified and the compromise vector is closed
3. Provision a new, clean environment using Terraform (infrastructure as code allows full environment rebuild)
4. Restore data from a backup taken before the compromise was introduced
5. Deploy the application from a known-good source code commit (verified via git commit signature)
6. Re-issue all credentials and encryption keys (see POL-05 Section 7.4)
7. Restore service to customers only after security clearance from the Incident Lead

### 7.4 Scenario: Cryptographic Key Compromise (`ENCRYPTION_MASTER_KEY`)

**Description:** The `ENCRYPTION_MASTER_KEY` or `OAUTH_ENCRYPTION_KEY` has been compromised or is suspected to have been exposed.

**Response steps:**

1. Invoke POL-05 Section 9 (Key Compromise Response) immediately
2. Declare a P1 security incident per POL-07
3. Take an application snapshot and audit log extract before making changes
4. Generate new key material using `crypto.randomBytes(32)` in a trusted environment
5. Rotate the key in GitHub Actions secrets
6. Deploy the application with the new key
7. Re-encrypt all data that was encrypted with the compromised key using the migration utility in `src/lib/encryption.ts`
8. Verify re-encryption is complete and application functions correctly
9. Destroy the old key material (delete from GitHub secrets, purge from developer devices)
10. Notify affected customers if any encrypted personal data was potentially exposed

---

## 8. Business Continuity Planning (A.5.29, A.5.30)

### 8.1 Critical Business Functions

The following business functions are identified as critical and must be maintained or restored within the defined RTOs:

| Function               | Description                                                      | RTO                                                     |
| ---------------------- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| Platform access        | Customers can access the Inovy web application                   | 4 hours                                                 |
| Meeting processing     | New meeting recordings are ingested, transcribed, and summarised | 4 hours                                                 |
| Data access            | Customers can access their existing recordings and transcripts   | 4 hours                                                 |
| Billing                | Stripe payment processing continues                              | 4 hours (Stripe SLA; not within Inovy's infrastructure) |
| Customer communication | Transactional emails via Resend                                  | 8 hours                                                 |

### 8.2 Remote-First Resilience

As a fully remote Dutch company, Inovy is inherently resilient to location-based disruptions (office unavailability, local power outages). All team members work from home or co-working spaces and have access to the systems they need via internet connectivity. Business continuity in the face of a staff member becoming unavailable relies on:

- **Documentation:** All operational procedures (runbooks, architecture documentation, deployment procedures) are maintained in Notion and the GitHub repository
- **Shared access:** Critical credentials are accessible to at least two designated team members (CTO and Engineering Lead minimum) via 1Password
- **On-call rotation:** Ensures coverage for P1/P2 incidents even outside business hours

### 8.3 Communication During a Disruption

- **Status page:** Inovy maintains a public status page at `status.inovy.app` using a third-party status page provider. Incidents are posted within 15 minutes of declaration
- **Customer email:** Email notifications are sent to affected customers for P1/P2 incidents using Resend (or a backup email provider if Resend is the cause of the incident)
- **Internal communication:** Slack and Signal (as backup) are used for internal team coordination during incidents
- **Regulatory notification:** Dutch DPA notification (GDPR Article 33) is triggered by the Information Security Manager if personal data is affected

---

## 9. Testing and Exercises (A.5.30)

### 9.1 Backup Restoration Tests

- **Frequency:** Monthly database restoration tests to a staging environment
- **Scope:** Restore the latest Neon PITR backup; verify application functionality against the restored data; document results
- **Results:** Stored in the backup verification log maintained by the Engineering Lead

### 9.2 DR Tabletop Exercises

- **Frequency:** Annual full DR tabletop exercise; semi-annual targeted exercises for specific scenarios
- **Participants:** Engineering Lead, CTO, Information Security Manager
- **Scope:** Walk through one or more of the scenarios in Section 7; identify gaps in procedures; update this plan accordingly

### 9.3 DR Plan Review

This plan is reviewed:

- Annually (as part of the standard policy review cycle)
- After a real continuity event (to incorporate lessons learned)
- After any significant change to the technology stack or cloud architecture

---

## 10. Roles and Responsibilities

| Role                         | Responsibility                                                     |
| ---------------------------- | ------------------------------------------------------------------ |
| Engineering Lead             | DR plan execution, backup management, infrastructure failover      |
| CTO                          | Executive decision-making during major incidents, DR plan approval |
| Information Security Manager | DR plan ownership, regulatory notification, PIR facilitation       |
| On-call engineer             | First response for out-of-hours P1/P2 incidents                    |

---

## 11. Policy Review

| Revision | Date       | Author                       | Summary of Changes |
| -------- | ---------- | ---------------------------- | ------------------ |
| 1.0      | 2026-03-13 | Information Security Manager | Initial release    |
