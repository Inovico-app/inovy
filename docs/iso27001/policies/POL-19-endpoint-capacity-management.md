# Endpoint & Capacity Management Policy

| Field              | Value                               |
| ------------------ | ----------------------------------- |
| Document ID        | POL-19                              |
| Version            | 1.0                                 |
| Classification     | Internal                            |
| Owner              | Information Security Manager        |
| Approved by        | CEO/CTO                             |
| Effective date     | 2026-03-13                          |
| Review date        | 2027-03-13                          |
| ISO 27001 Controls | A.8.1, A.8.6, A.8.9, A.8.18, A.8.19 |

---

## 1. Purpose

This policy establishes Inovy's requirements for managing endpoint devices, ensuring system capacity, maintaining configuration integrity, controlling the use of privileged utilities, and managing software installation. Inovy operates as a fully remote, cloud-native organisation. The primary physical computing assets are employee endpoint devices; the primary infrastructure assets are Azure cloud services. Both must be managed systematically to ensure availability, security, and operational integrity.

## 2. Scope

This policy applies to:

- All Inovy-provided endpoint devices (laptops, mobile phones used for work)
- Azure Container Apps (application hosting)
- Neon PostgreSQL (database)
- Azure Blob Storage (file storage)
- Qdrant vector database
- Redis (Azure Cache for Redis)
- All CI/CD pipelines and their runtimes
- All production software dependencies

## 3. Roles and Responsibilities

| Role             | Responsibility                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| ISM              | Owns this policy; manages device inventory; approves privileged utility access; reviews capacity metrics                      |
| Engineering Lead | Implements and reviews infrastructure capacity configuration; approves new software dependencies; reviews configuration drift |
| People Ops       | Coordinates device procurement, onboarding, and decommissioning                                                               |
| All Employees    | Maintain their device in compliance with this policy; report device loss, theft, or anomalies immediately                     |

## 4. Endpoint Device Management (A.8.1)

### 4.1 Device Provisioning

All Inovy employees who require access to production systems or customer data are provided with a company-managed device. Inovy does not operate a BYOD (Bring Your Own Device) programme for production access.

**Device provisioning process**:

1. People Ops procures the device (macOS or Windows) to the ISM-approved specification
2. ISM or Engineering Lead enrolls the device in the Mobile Device Management (MDM) system
3. MDM applies the baseline security profile before the device is issued to the employee
4. Device is recorded in the **asset inventory** with make, model, serial number, assigned user, and provisioning date

### 4.2 Mandatory Endpoint Security Controls

All company-provided endpoint devices must be configured with the following controls enforced via MDM:

| Control                        | Requirement                                                                               | Enforcement                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Full Disk Encryption (FDE)** | Enabled on all devices before first use                                                   | macOS: FileVault 2; Windows: BitLocker with TPM. MDM verifies FDE status |
| **Operating System Updates**   | Auto-updates enabled. Critical security patches applied within 48 hours                   | MDM policy; ISM reviews compliance weekly                                |
| **Screen Lock**                | 5-minute inactivity timeout; password/biometric required to unlock                        | MDM configuration profile enforces timeout                               |
| **Antivirus / EDR**            | Company-approved endpoint protection tool installed and running with real-time protection | MDM compliance check                                                     |
| **Host Firewall**              | Enabled; blocks unsolicited inbound connections                                           | MDM configuration profile                                                |
| **Password Manager**           | 1Password installed and configured with company vault access                              | MDM application deployment                                               |
| **MFA**                        | MFA enabled on all Inovy accounts (GitHub, Azure AD, Google Workspace, 1Password)         | MDM and identity provider policies                                       |

MDM compliance is checked daily. Non-compliant devices receive an automated notification. If non-compliance is not resolved within 48 hours, the ISM restricts the device's access to company resources until compliance is restored.

### 4.3 Device Inventory

The **device inventory** is maintained in the ISMS asset register (POL-03). For each device, the following is recorded:

- Asset identifier (internal Inovy asset tag)
- Make, model, and serial number
- Operating system and version
- Assigned user
- Date of provisioning
- MDM enrolment status
- FDE status
- Last security check date
- Status (Active / Decommissioned / Lost/Stolen)

The inventory is reviewed and reconciled against MDM records on a **quarterly** basis by the ISM and People Ops.

### 4.4 Device Decommissioning

When a device is returned (e.g., employee departure, device replacement):

1. MDM enrolment is revoked immediately upon departure notification from People Ops
2. All Inovy accounts and OAuth sessions associated with the device are revoked
3. The device undergoes secure disposal per POL-12 Section 12 (factory reset with cryptographic erasure for SSDs)
4. The asset inventory is updated to "Decommissioned" status with the decommissioning date
5. Decommissioning is recorded in the asset disposal register

### 4.5 Lost or Stolen Devices

If a device is lost or stolen, the employee must report this to the ISM **immediately** (within 1 hour of discovery). The ISM initiates:

1. **Remote wipe** via MDM within 1 hour of notification
2. **Credential revocation**: All accounts accessible from the device (GitHub, Azure AD, Google Workspace, 1Password, Slack, email) are signed out and tokens revoked
3. **Incident assessment**: ISM assesses whether any customer data was accessible on the device and whether a GDPR breach notification is required (POL-07)
4. **Asset inventory update**: Device status updated to "Lost/Stolen"
5. **Replacement**: People Ops coordinates device replacement

## 5. Capacity Management (A.8.6)

### 5.1 Azure Container Apps

Inovy's Next.js application runs on **Azure Container Apps** with auto-scaling configured to handle variable load:

| Parameter        | Value                    | Rationale                                                |
| ---------------- | ------------------------ | -------------------------------------------------------- |
| Minimum replicas | 1                        | Always available; reduces cold start frequency           |
| Maximum replicas | 3                        | Sufficient for current customer load; reviewed quarterly |
| Scale trigger    | HTTP request queue depth | Scales on actual demand                                  |
| CPU request      | Defined in Terraform     | Right-sized for application profile                      |
| Memory request   | Defined in Terraform     | Includes buffer for AI processing workloads              |

Auto-scaling ensures that temporary load spikes (e.g., many customers uploading meetings simultaneously) are handled without service degradation, while minimum replicas ensure baseline availability.

**Capacity review trigger**: If the maximum replica count is reached and sustained for >15 minutes, an alert is sent to the Engineering Lead for capacity review. The maximum replica count is reviewed and adjusted as part of the quarterly capacity review.

### 5.2 Neon PostgreSQL

Neon provides **serverless auto-scaling** for the PostgreSQL database:

- **Compute auto-scaling**: Neon automatically scales compute (vCPUs) up during high-load periods and scales down (to zero during inactivity, configurable)
- **Storage**: Automatically scales with data volume; no capacity limit to manage proactively
- **Connection pool**: Application uses a **connection pool with a maximum of 15 connections** to prevent database overload. The connection pool health is monitored via `/api/connection-pool/health`

**Connection pool monitoring**: If the connection pool exceeds 80% utilisation (>12 of 15 connections active), an alert is triggered for the Engineering Lead to investigate. Sustained pool exhaustion indicates either application scaling requirements or a connection leak.

### 5.3 Azure Blob Storage

Azure Blob Storage scales automatically and has no practical capacity constraint for Inovy's use case (meeting recordings and export files). Capacity is monitored via:

- Azure Monitor storage metrics (total size, object count)
- Monthly cost review (storage cost increase indicates unexpected data accumulation)

**Retention enforcement**: The GDPR deletion service (`gdpr-deletion.service.ts`) ensures recordings are deleted after account termination + 30 days, preventing unbounded storage growth. GDPR export packages expire and are deleted after 7 days.

### 5.4 Qdrant Vector Database

Qdrant stores vector embeddings of meeting transcripts for semantic search. Capacity parameters:

- **Cloud-hosted Qdrant**: Scaled via Qdrant cloud console to match the vector collection size
- **Collection size monitoring**: Monitored via `/api/qdrant/health` and Qdrant cloud dashboard
- **Embedding strategy**: Transcripts are chunked before embedding; chunk size balanced to optimise search quality and storage efficiency

Qdrant capacity is reviewed quarterly. If collection size growth rate indicates a capacity milestone within 3 months, scaling is planned proactively.

### 5.5 Redis Cache

Redis (Azure Cache for Redis, **Basic B10, 1 GB**) is used for session management and caching:

| Parameter             | Value                                                         |
| --------------------- | ------------------------------------------------------------- |
| Tier                  | Basic B10                                                     |
| Memory                | 1 GB                                                          |
| Sessions expire after | 7 days (inactive session TTL)                                 |
| Eviction policy       | `allkeys-lru` (least recently used eviction when memory full) |

**Memory monitoring**: Azure Monitor tracks Redis memory utilisation. If memory exceeds 75% (750 MB), the Engineering Lead is notified to review caching patterns or scale to the next tier.

### 5.6 Quarterly Capacity Review

A formal capacity review is conducted **quarterly** covering:

- Container Apps scaling headroom and maximum replica adequacy
- Database connection pool utilisation trends
- Blob Storage growth rate vs. retention policy effectiveness
- Qdrant collection size and query latency trends
- Redis memory utilisation and eviction rate trends
- Projected load growth for the next quarter based on customer growth

Outcomes of the capacity review are documented and any required scaling actions are implemented as Terraform changes via the normal change management process (POL-14).

## 6. Configuration Management (A.8.9)

### 6.1 Infrastructure-as-Code

All Inovy infrastructure is defined and managed as code using **Terraform**. Infrastructure configuration changes are made exclusively via:

1. Modification of Terraform files in the `infrastructure/` directory
2. Pull request review and approval (per POL-14)
3. `terraform plan` review to confirm the expected changes
4. Terraform apply via the GitHub Actions Terraform deployment workflow

**Manual infrastructure changes via the Azure portal are prohibited** unless in a documented emergency and followed by Terraform code updates within 24 hours to prevent state drift.

**Terraform state** is stored in **Azure Storage** with state locking enabled. Concurrent Terraform applies are blocked, preventing configuration race conditions. Access to the Terraform state storage account is restricted to the CI/CD service principal and the ISM.

### 6.2 Application Configuration

Application configuration (environment-specific settings, feature flags, API endpoint URLs) is managed via:

- **Production**: Azure Container Apps environment variable configuration. Updated via the Azure Container Apps Terraform resource.
- **Local development**: `.env.local` files (gitignored; never committed to source control). Each engineer maintains their own local configuration.

**Secrets are not configuration**: API keys, database passwords, and OAuth secrets are secrets, not configuration. They are managed via Azure Container Apps environment variables (production) and GitHub Actions secrets (CI/CD). They are never stored in configuration files committed to source control.

### 6.3 Docker Container Configuration

The Inovy application is containerised using a **multi-stage Alpine-based Dockerfile**:

- **Build stage**: Node.js 22 Alpine; installs all dependencies (including devDependencies); runs `pnpm build`
- **Runtime stage**: Node.js 22 Alpine minimal; copies only the standalone Next.js build output; does not include devDependencies, source maps, or build tools
- **Dependency installation**: `pnpm install --frozen-lockfile` ensures reproducible builds; the lockfile must be committed to source control and is updated only via deliberate `pnpm update` commands reviewed in PRs

The Docker image is built in CI and tagged with the commit SHA. The same image is used for all environments, eliminating configuration drift between test and production environments.

### 6.4 Configuration Drift Detection

- **Terraform**: `terraform plan` is run in CI on every infrastructure PR to detect drift between the code and the live infrastructure
- **Application dependencies**: `pnpm install --frozen-lockfile` fails if the lockfile is inconsistent with `package.json`, preventing hidden dependency changes
- **MDM**: Device compliance checks detect configuration drift (e.g., FDE disabled, screen lock timeout changed) on all endpoint devices

## 7. Privileged Utility Controls (A.8.18)

Privileged utilities are tools or commands that can directly modify production data, infrastructure, or security configuration outside the normal application flow.

### 7.1 Database Access Controls

| Utility                                  | Who Can Use                  | Requirements                                                                                  |
| ---------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm db:generate`                       | All engineers                | Normal development workflow; generates migration file only                                    |
| `pnpm db:migrate` (via CI/CD)            | CI/CD pipeline only          | Automated; requires PR merge to `main`; never run manually                                    |
| `pnpm db:push`                           | **Prohibited in production** | This command is prohibited for production use; it bypasses migrations and can cause data loss |
| Direct database query (via Neon console) | ISM + Engineering Lead       | Requires joint approval; logged; anonymised data only; limited 48-hour window                 |
| Drizzle Studio                           | ISM + Engineering Lead       | Requires approval; same controls as direct DB access                                          |

The database service account used by the production application has **minimum necessary permissions**: SELECT, INSERT, UPDATE, DELETE on application tables. It does not have DDL permissions (CREATE TABLE, ALTER TABLE, DROP). Schema changes are applied exclusively through the migration workflow using a separate migration service account.

### 7.2 Admin Kill-Switch

Inovy implements an **admin kill-switch** capability accessible only to the `superadmin` role. This allows emergency suspension of a user account or organisation in response to a security incident. Use of the kill-switch:

- Is logged in the general audit log with the superadmin's identifier and reason
- Triggers an ISM notification
- Must be documented in the incident register within 4 hours

Kill-switch activations are reviewed by the ISM at the next management review.

### 7.3 Infrastructure Privileged Access

| Utility                                | Access Control                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------- |
| Azure portal (production subscription) | ISM and Engineering Lead; MFA required; access logged by Azure Activity Log             |
| Terraform apply (production)           | CI/CD pipeline service principal only; humans cannot directly apply                     |
| GitHub repository settings             | Repository administrators (ISM, Engineering Lead); branch protection cannot be bypassed |
| GitHub Actions secrets                 | Repository administrators only                                                          |
| Azure Container Apps configuration     | Via Terraform (CI/CD); emergency direct changes require ISM + Engineering Lead approval |

## 8. Software Installation Controls (A.8.19)

### 8.1 Production Runtime Software

The production Inovy application runs as a **standalone Next.js build** within an Alpine Docker container. The runtime environment contains:

- Node.js runtime (version pinned in Dockerfile)
- Next.js standalone build output (including only production dependencies)
- No development dependencies, build tools, test frameworks, or source files

The `pnpm.onlyBuiltDependencies` configuration in `package.json` controls which packages are permitted to run postinstall scripts during the container build. Currently allowlisted: `@swc/core`, `@tailwindcss/oxide`, `esbuild`, `sharp`, `@vercel/speed-insights`. Any package not on this list is blocked from running postinstall scripts, limiting supply chain attack surface.

### 8.2 New Dependency Approval

When an engineer proposes adding a new npm dependency, the pull request must include in the description:

- **Purpose**: Why this dependency is needed
- **Maintenance assessment**: Last update date, download count, GitHub stars, organisation maintenance
- **Security assessment**: Any known CVEs at time of adoption; whether the package processes PII, performs cryptographic operations, or requires network access
- **Licence**: SPDX licence identifier; confirmed not to include copyleft licences (e.g., GPL) without ISM approval
- **Postinstall scripts**: Whether the package requires a postinstall script; if so, justification for adding it to `pnpm.onlyBuiltDependencies`

Engineering Lead approval is required for all new production dependencies. ISM approval is additionally required for dependencies that: handle PII, perform authentication or cryptographic operations, make external network calls, or require postinstall scripts.

### 8.3 Employee Device Software

Software installation on company devices must comply with:

- **Approved software list**: Maintained by the ISM; covers productivity tools, development tools, security tools, and communication applications
- **Prohibited categories**: P2P clients, gaming software, unlicensed software, software from unverified sources, software requiring disabling of security controls
- **Developer tools**: Engineers may install development tools via approved package managers (Homebrew, winget) as needed for their role, subject to the security assessment criteria above
- **Browser extensions**: Only extensions from the approved extension list (curated by ISM) are permitted on company devices used for work

Employees must not install software that requires disabling antivirus, firewall, or OS security features.

## 9. Related Documents

| Document                        | Reference |
| ------------------------------- | --------- |
| Information Security Policy     | POL-01    |
| Asset Management Policy         | POL-03    |
| Physical Security Policy        | POL-12    |
| Change Management Policy        | POL-14    |
| Vulnerability Management Policy | POL-18    |
| Legal & Compliance Register     | POL-20    |

## 10. Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
