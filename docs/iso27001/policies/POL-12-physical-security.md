# Physical Security Policy

| Field              | Value                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| Document ID        | POL-12                                                                                                |
| Version            | 1.0                                                                                                   |
| Classification     | Internal                                                                                              |
| Owner              | Information Security Manager                                                                          |
| Approved by        | CEO/CTO                                                                                               |
| Effective date     | 2026-03-13                                                                                            |
| Review date        | 2027-03-13                                                                                            |
| ISO 27001 Controls | A.7.1, A.7.2, A.7.3, A.7.4, A.7.5, A.7.6, A.7.7, A.7.8, A.7.9, A.7.10, A.7.11, A.7.12, A.7.13, A.7.14 |

---

## 1. Purpose

This policy establishes Inovy's physical security controls in the context of its fully remote, cloud-native operating model. Inovy is a Dutch AI-powered meeting recording SaaS company. It operates without a permanent physical office; all infrastructure is cloud-hosted on Microsoft Azure (EU-Central-1 region), and all personnel work remotely. This policy documents how ISO 27001 Annex A.7 physical security controls are addressed in this context, where responsibility for data centre physical security is delegated to cloud providers, and the primary physical security surface is employee endpoint devices and home working environments.

## 2. Scope

This policy applies to:

- All Inovy personnel and their working environments (home offices, co-working spaces, client sites)
- All Inovy-owned or Inovy-managed devices (laptops, mobile devices)
- All cloud-hosted infrastructure (Azure Container Apps, Neon PostgreSQL, Azure Blob Storage, Qdrant, Redis)
- Third-party contractors with access to Inovy systems or physical documents

## 3. Scope Reduction Justification

Inovy operates as a fully remote company with no permanent physical office and no on-premises server infrastructure. All production computing is performed on Microsoft Azure services in the EU-Central-1 (Frankfurt) region. Given this operating model:

- **A.7.1 (Physical security perimeters)**: There are no Inovy-controlled data centre perimeters. Physical perimeter security for all server infrastructure is provided by Microsoft Azure's Tier III/IV data centres with ISO 27001, SOC 2 Type II, and FedRAMP certifications. Inovy relies on Azure's physical security controls and monitors Azure's compliance posture annually.
- **A.7.2 (Physical entry controls)**: Not applicable to Inovy-controlled facilities. Azure manages access control to its data centres. For co-working spaces used by personnel, employees are responsible for ensuring they work in areas where screen content cannot be observed by unauthorised persons.
- **A.7.3 (Securing offices, rooms, and facilities)**: Not applicable — no permanent Inovy office. If a temporary meeting space is used for Inovy business (e.g., client meeting, team offsite), the organiser is responsible for ensuring the space is appropriate and that sensitive information is not left visible.
- **A.7.4 (Physical security monitoring)**: Azure's data centres operate 24/7 CCTV, motion detection, and security guard monitoring. Inovy has no additional monitoring capability for these facilities.
- **A.7.6 (Working in secure areas)**: Addressed through the remote working security controls in this policy and POL-10 (Clear Desk & Screen Lock Policy).

## 4. Environmental Threats to Infrastructure (A.7.5)

Inovy's production infrastructure is hosted on Microsoft Azure in the EU-Central-1 (Frankfurt) region. Azure's data centres provide comprehensive protection against environmental threats. The following summarises the controls in place and how Inovy verifies them:

| Threat                       | Azure Control                                                                      | Inovy Verification                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Fire                         | FM-200 suppression systems, fire detection, building compartmentalisation          | Annual review of Azure compliance documentation and SOC 2 reports        |
| Flooding                     | Data centres sited above flood plains; raised floor infrastructure                 | Azure Compliance Manager; review of Azure physical security white papers |
| Seismic activity             | Data centres engineered to local seismic standards                                 | Azure Compliance Manager                                                 |
| Power failure                | Redundant utility feeds, UPS systems, diesel generators with 48-hour fuel reserves | Azure SLA (99.99% uptime); Inovy monitors via health check endpoints     |
| Temperature / humidity       | Precision air conditioning with N+1 redundancy, environmental monitoring           | Azure SOC 2 Type II reports reviewed annually                            |
| Electromagnetic interference | Screened infrastructure within data centre                                         | Azure facility standards                                                 |

**Residual risk**: Single-region deployment creates geographic concentration risk. This is accepted and documented in the risk register; multi-region failover is on the product roadmap. Neon PostgreSQL provides automatic failover within the region.

## 5. Clear Desk and Screen Lock (A.7.7)

All Inovy personnel must comply with the following requirements at all times when working with Inovy systems or data:

### 5.1 Screen Lock

- All company devices must be configured with an automatic screen lock that activates after **5 minutes** of inactivity
- The lock screen must require a password, PIN, or biometric authentication to unlock
- Personnel must manually lock their screen (keyboard shortcut) whenever leaving their device unattended, even briefly
- **macOS**: `Command + Control + Q` or close the lid; Screen Lock setting: System Settings → Lock Screen → "Require password after screen saver begins or display is turned off": Immediately
- **Windows**: `Windows + L`

### 5.2 Clear Desk

- Sensitive printed documents (meeting notes, contracts, data subject information) must be stored securely when not in use and must not be left visible to household members, visitors, or in the background of video calls
- Whiteboards or sticky notes containing sensitive information must be cleared or obscured before video calls
- Company devices must not be left unattended in public spaces (cafes, co-working spaces) even when locked

Full details are documented in **POL-10 (Clear Desk & Screen Lock Policy)**.

## 6. Equipment Siting and Protection (A.7.8)

### 6.1 Cloud Infrastructure

All Inovy servers, databases, and storage infrastructure are hosted on Microsoft Azure within dedicated virtual network subnets. Physical equipment placement, environmental monitoring, and protection from interference are managed entirely by Azure. Inovy does not have physical access to this equipment.

Azure Container Apps, Neon PostgreSQL (EU-Central-1), Azure Blob Storage, Qdrant vector database, and Redis are all deployed in accordance with Azure's physical security standards.

### 6.2 Endpoint Devices

Personnel working from home or co-working spaces must position their laptop screen to:

- Prevent shoulder-surfing by household members, visitors, or members of the public
- Ensure that meeting content, recordings, transcripts, or customer data on screen cannot be observed by unauthorised persons
- When working in public spaces, use a privacy screen filter if possible when accessing sensitive data

Personnel should not participate in calls discussing Restricted or Confidential information in public spaces where conversations can be overheard.

## 7. Off-Premises Assets (A.7.9)

### 7.1 Laptop Management

All company-provided laptops that leave the employee's primary home workspace (e.g., taken to client sites, co-working spaces, conferences) are subject to the following controls:

- **Full Disk Encryption (FDE)** must be enabled at all times:
  - **macOS**: FileVault 2 enabled and recovery key escrowed with the ISM via MDM
  - **Windows**: BitLocker with TPM enabled and recovery key stored in Azure AD
- The device must be registered in Inovy's **device inventory** (maintained in the ISMS register, referenced in POL-03)
- The screen lock timeout (5 minutes) must be active at all times
- The device must not be connected to untrusted public Wi-Fi networks without a VPN. Personnel must use the company-provided VPN when connecting from networks they do not control
- Devices must never be checked in as airline luggage; they must be carried as hand luggage

### 7.2 Loss or Theft

Any loss or theft of a device that may contain Inovy data or provide access to Inovy systems must be **reported immediately** to the ISM via `security@inovico.nl` and Slack `#security`. Immediate reporting enables remote device wipe via MDM before unauthorised access can occur.

Upon report of loss or theft:

1. ISM initiates remote device wipe via MDM within 1 hour of notification
2. All credentials associated with the device are revoked (GitHub, Azure AD, Google Workspace, 1Password)
3. ISM assesses whether any sensitive data was accessible on the device
4. If Inovy customer data was potentially accessible, the incident is escalated under POL-07 (Incident Management Policy) and the 72-hour GDPR breach notification clock is started if applicable

## 8. Storage Media (A.7.10)

### 8.1 Minimisation of Local Sensitive Data

All production data is stored in cloud services (Neon PostgreSQL, Azure Blob Storage, Qdrant). Personnel must not store Inovy customer data (meeting recordings, transcripts, PII) on local device storage except as strictly necessary for short-term operational purposes. Any such local copies must be deleted as soon as they are no longer required.

### 8.2 USB Storage Prohibition

The use of USB storage devices (USB keys, external hard drives) for transferring sensitive Inovy data (recordings, transcripts, BSN numbers, API keys, database exports) is **prohibited**. All data transfers between systems must use approved cloud channels:

- Code via GitHub
- Files via Google Drive (internal) or the Inovy web application (customer data)
- Database migrations via the CI/CD pipeline (`migrate-prod-db.yml` GitHub Actions workflow)

If a legitimate business requirement arises for portable media, the ISM must approve it in advance. Approved media must be encrypted.

### 8.3 Removal of Storage Media

If a company laptop is being decommissioned or returned, the storage media must be securely erased before disposal (see Section 10 on Secure Disposal).

## 9. Supporting Utilities (A.7.11)

All production infrastructure is hosted on Microsoft Azure, which manages power supplies, cooling, uninterruptible power systems, and network connectivity for all server equipment. Azure's EU-Central-1 data centres maintain:

- Redundant utility power feeds from separate substations
- N+1 UPS systems with automatic failover
- Diesel generator backup with 48-hour minimum fuel reserves
- Precision cooling with N+1 redundancy
- Redundant internet connectivity via multiple tier-1 carriers

Inovy monitors service availability through:

- Azure Service Health dashboard (subscribed alerts)
- Internal health check endpoints: `/api/health`, `/api/connection-pool/health`, `/api/qdrant/health`
- Azure Container Apps replica auto-scaling (1–3 replicas) provides resilience against single-instance failures

For personnel home working environments, Inovy does not mandate specific power backup equipment, but personnel are expected to:

- Use a UPS for their home router if they are in a role requiring high availability (on-call engineers)
- Have a mobile data backup plan for critical work

## 10. Cabling Security (A.7.12)

**This control is excluded from Inovy's scope.**

Inovy operates entirely on cloud-hosted infrastructure. There is no Inovy-controlled server cabling infrastructure. All physical cabling within Azure data centres is managed by Microsoft under their ISO 27001-certified physical security programme.

For endpoint devices, personnel use standard home/office networking equipment. Network cabling in home offices is considered lower risk than data centre cabling and is outside the scope of this policy.

This exclusion is documented in Inovy's Statement of Applicability (SoA) with the justification that all server infrastructure is cloud-hosted and no Inovy-controlled cabling exists.

## 11. Equipment Maintenance (A.7.13)

### 11.1 Cloud Infrastructure Maintenance

Microsoft Azure is responsible for all physical maintenance of server infrastructure hosting Inovy's applications. This includes hardware replacement, preventive maintenance, and emergency repairs. Maintenance activities that may affect availability are communicated via Azure Service Health notifications.

Inovy receives advance notice of planned maintenance windows and has implemented the following to minimise impact:

- Azure Container Apps auto-scaling ensures service continuity during container restarts
- Neon PostgreSQL provides automatic failover for database maintenance events
- Health check monitoring alerts the on-call engineer to any unexpected availability impact

### 11.2 Endpoint Device Maintenance

All Inovy-provided laptops must be maintained as follows:

- **Operating system updates**: Auto-updates enabled. Critical security patches must be applied within **48 hours** of release. Non-critical updates applied within 7 days. MDM policy enforces update compliance.
- **Application updates**: Security-critical application updates (browser, productivity suite) applied within 7 days
- **Antivirus/EDR**: Company-standard endpoint detection and response tool installed and maintained with automatic definition updates (see POL-19)
- **Hardware review**: Annual hardware review by the employee. Devices showing signs of physical compromise, damage to ports, or unexpected peripherals must be reported to the ISM immediately
- **Battery and hardware health**: Devices with failing hardware should be reported to People Ops for replacement before they become a reliability risk

## 12. Secure Disposal of Equipment (A.7.14)

When Inovy-provided equipment reaches end of life or is being decommissioned, the following procedures apply to prevent data recovery from disposed equipment.

### 12.1 Laptops and Desktops

**Standard procedure (HDD/SSD)**:

1. Perform a **factory reset** to the original operating system state, ensuring that the "Erase all content and settings" option is selected (this triggers cryptographic erasure on FileVault/BitLocker-encrypted drives where the key is discarded)
2. For drives that cannot be cryptographically erased: perform a **NIST 800-88 Rev.1 Clear** (DoD 5220.22-M pattern wipe) using approved erasure software
3. Verify erasure using the erasure software's verification report
4. Document the disposal in the asset disposal register (maintained by People Ops)

**SSD-specific procedure**: SSDs (which are standard in all Inovy laptops) must be **cryptographically erased** by discarding the encryption key. On FileVault 2 (macOS) or BitLocker (Windows), this is achieved by performing a full OS reset while encryption is active. The erasure software's certificate of erasure must be retained.

**Hardware disposal**: After erasure, devices may be:

- Returned to the device leasing provider (if leased) with erasure documentation
- Donated to a certified IT recycler / WEEE-compliant disposal provider with erasure documentation
- Sold on the secondary market after erasure documentation is confirmed

### 12.2 Mobile Devices

Mobile devices must be factory-reset to remove all Inovy accounts, email, and data before return, transfer, or disposal. MDM enrolment must be revoked by the ISM before disposal.

### 12.3 Documentation

All equipment disposals are recorded in the asset disposal register, including:

- Asset identifier and serial number
- Date of disposal
- Erasure method used
- Name of person performing erasure
- Certificate of erasure reference (if applicable)
- Final destination of the device

This register is retained for a minimum of 3 years.

## 13. Related Documents

| Document                              | Reference |
| ------------------------------------- | --------- |
| Information Security Policy           | POL-01    |
| Asset Management Policy               | POL-03    |
| Clear Desk & Screen Lock Policy       | POL-10    |
| Incident Management Policy            | POL-07    |
| Endpoint & Capacity Management Policy | POL-19    |
| Statement of Applicability            | ISMS-SoA  |

## 14. Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
