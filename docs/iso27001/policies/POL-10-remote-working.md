# Remote Working Policy

| Field              | Value                        |
| ------------------ | ---------------------------- |
| Document ID        | POL-10                       |
| Version            | 1.0                          |
| Classification     | Internal                     |
| Owner              | Information Security Manager |
| Approved by        | CEO/CTO                      |
| Effective date     | 2026-03-13                   |
| Review date        | 2027-03-13                   |
| ISO 27001 Controls | A.6.7                        |

---

## 1. Purpose

Inovy B.V. operates as a remote-first company. This policy establishes the information security requirements for working remotely to ensure that information assets, customer data, and Inovy systems receive the same level of protection outside the traditional office environment as they would within it. The absence of a centralised office makes this policy foundational to Inovy's overall security posture.

## 2. Scope

This policy applies to:

- All Inovy employees, contractors, and third parties who access Inovy systems or data from locations other than an Inovy-managed premises (which, as a remote-first company, is effectively all staff)
- All devices used for remote work, whether company-issued or personal (BYOD)
- All locations used for remote work: home offices, co-working spaces, hotels, public spaces, and any other location

## 3. Reference Documents

- POL-01 Access Control Policy
- POL-02 Acceptable Use Policy
- POL-04 Information Classification and Handling Policy
- POL-09 HR Security Policy

---

## 4. Workspace Requirements

### 4.1 Dedicated Work Area

Employees should work from a dedicated area that provides an appropriate level of privacy and physical security. Recommended workspace setup:

- **Privacy screen:** A privacy screen filter is recommended for laptops used in locations where others may view the screen (co-working spaces, coffee shops, public transport). A privacy screen is **required** when working with Confidential or Restricted information in any location where the screen could be observed by others
- **Shoulder surfing prevention:** The screen orientation and position should prevent passers-by or neighbours from viewing sensitive content. Where this cannot be guaranteed, Confidential or Restricted information should not be displayed
- **Physical document security:** Printed materials containing Internal or above information should not be left unattended. Printed Confidential or Restricted documents should be stored in a lockable space when not in use
- **Locking workstation when leaving:** The workstation must be locked (screen lock activated) whenever the employee steps away, even briefly

### 4.2 Co-working Spaces

Co-working spaces are an acceptable working environment subject to the following conditions:

- Conversations involving Confidential customer information (meeting details, company names, user data) must not take place in open areas where they could be overheard. Use a private room or step outside
- Never leave a laptop unattended at a co-working space without a physical security cable lock
- Do not connect to unknown or unverified co-working space networks; use a mobile hotspot or VPN if network trust is uncertain (see Section 6)
- Confirm that the co-working space does not have monitoring cameras directed at workstations before displaying Restricted information

### 4.3 Visitors

If a visitor is present in the remote work environment (home office included):

- The screen must be locked or content hidden before the visitor enters the workspace
- Conversations involving Confidential customer information must not take place while visitors are present
- Visitors must not be given access to Inovy systems or devices

---

## 5. Device Security

### 5.1 Company-Issued Devices

The following security controls are mandatory on all company-issued devices:

| Control                    | Requirement                                                                         | Verification                                         |
| -------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Full disk encryption       | Enabled and active (FileVault on macOS, BitLocker on Windows, LUKS on Linux)        | Required before device is issued; verified quarterly |
| Screen lock                | Automatic screen lock after **5 minutes** of inactivity                             | Configured during device setup                       |
| Screen lock authentication | Strong PIN (6+ digits), password, or biometric                                      | Configured during device setup                       |
| Operating system updates   | Security patches applied within **14 days** of release                              | Enforced via MDM or self-certification               |
| Application updates        | Critical security updates for browsers and development tools applied within 14 days | Self-certification; spot checks                      |
| Endpoint protection        | Approved antivirus / EDR software installed and active                              | Installed during device setup                        |
| Remote wipe capability     | Device enrolled in MDM with remote wipe capability                                  | Enrolled before use                                  |
| Firewall                   | OS-level firewall enabled                                                           | Verified during setup                                |

### 5.2 Personal Devices (BYOD)

Inovy operates a limited BYOD policy for personal devices used for work purposes. Personal devices are permitted for accessing Internal-classified resources (Slack, Google Workspace, Notion) provided the following minimum controls are applied:

| Control                    | Requirement                                                 |
| -------------------------- | ----------------------------------------------------------- |
| Full disk encryption       | Required (FileVault, BitLocker, or equivalent)              |
| Screen lock                | PIN, password, or biometric; automatic lock after 5 minutes |
| OS version                 | Supported, up-to-date operating system (not end-of-life)    |
| No jailbreaking or rooting | Device must not be jailbroken or rooted                     |

**Restrictions on personal devices:**

- Personal devices must **not** be used to access the Neon production database directly
- Personal devices must **not** be used to store or process Restricted information (encryption keys, API keys, BSN data, raw recordings)
- Development work on personal devices requires that `.env` files are stored with full-disk encryption and that the device meets the full company-issued device standard
- If a personal device is lost, stolen, or compromised, it must be reported to the Information Security Manager immediately (see Section 10)

### 5.3 Software Installation

- Only software from legitimate, verified sources (App Store, verified vendor websites) may be installed
- Cracked, pirated, or modified software is prohibited
- Browser extensions must be reviewed before installation; extensions with broad permissions (access to all sites, clipboard access) require Engineering Lead approval
- No software may be installed that disables or circumvents the security controls listed in Section 5.1

---

## 6. Network Security

### 6.1 Home Network Requirements

For home office use, the following minimum network security requirements apply:

| Requirement              | Standard                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Wi-Fi encryption         | WPA3 (preferred) or WPA2 (acceptable). WEP and open networks are prohibited                                                      |
| Wi-Fi password           | Minimum 12 characters, unique to the home network                                                                                |
| Router firmware          | Kept up to date; check for updates at least quarterly                                                                            |
| Router admin credentials | Default credentials changed before use                                                                                           |
| Guest network            | If guests use the home Wi-Fi, a separate guest network must be configured to segregate Inovy devices from personal/guest devices |

### 6.2 Public and Untrusted Networks

Public Wi-Fi networks (coffee shops, airports, hotels, conference venues) present significant security risks including man-in-the-middle attacks and passive traffic interception.

**When using public Wi-Fi:**

- Accessing the Inovy web application or other HTTPS-only services is acceptable (TLS provides protection)
- Accessing the Neon production database console directly over public Wi-Fi is **prohibited** without VPN
- Accessing any Restricted information over public Wi-Fi is **prohibited** without VPN
- Transmitting Confidential or Restricted information over public Wi-Fi **without VPN** is **prohibited**

**VPN usage:**

Inovy provides access to a company VPN for situations requiring additional network security. The VPN must be connected when:

- Accessing production databases directly (outside of the application layer)
- Working with Restricted information on an untrusted network
- Accessing any cloud management console (Azure, Neon) from a public Wi-Fi network

Where a VPN is not available (e.g., VPN is unavailable), use a trusted mobile hotspot from a company or personal mobile device as an alternative to public Wi-Fi.

### 6.3 Mobile Hotspots

Using a mobile data connection (personal or company mobile hotspot) is an acceptable alternative to public Wi-Fi for most work scenarios, as mobile data networks are encrypted by default (LTE/5G) and not susceptible to the same passive interception risks as open Wi-Fi.

---

## 7. Data Handling in Remote Environments

### 7.1 Local Storage of Customer Data

Customer data (recordings, transcripts, user PII) must not be stored on local devices outside of approved development scenarios. Specifically:

- Production customer data must not be downloaded to a local device for analysis, debugging, or any other purpose without explicit approval from the Information Security Manager
- Where production data must be accessed for debugging, it must be accessed via the application or a secure database client with an encrypted connection; it must not be exported to local files
- Development and test data must use anonymised or synthetic data, not production customer data

### 7.2 Development Data

Developers may work with development or staging environment data locally. Development data must:

- Be anonymised (no real customer names, emails, or recordings)
- Be stored on an encrypted disk
- Not be shared with unauthorised parties
- Be deleted when no longer required for the development task

### 7.3 Prohibited Local Storage

The following must **never** be stored locally on any device without explicit approval and approved encryption:

- Production database dumps or exports
- Customer meeting recordings or raw audio/video
- GDPR subject access request exports
- Encryption keys or API key files (except `.env.local` for development, protected by full-disk encryption)
- BSN or other special category personal data

### 7.4 Printing

- Printing of Confidential or Restricted information is **prohibited** without explicit approval from the Information Security Manager
- If printing is approved, printed materials must be stored securely and cross-cut shredded when no longer needed
- Inovy does not operate a centralised printer; all printing is done on personal or co-working printers, increasing the risk of unintended disclosure. This restriction reflects that risk

### 7.5 Screen Sharing

When screen sharing in video calls (Zoom, Google Meet):

- Close or minimise windows containing Confidential or Restricted information before sharing the screen
- Use "Share a window" rather than "Share the entire screen" to reduce accidental disclosure
- Verify who is in the meeting (authenticated participants) before sharing sensitive content

---

## 8. Communication Security

### 8.1 Approved Communication Tools

All work communication must use Inovy-approved tools (see POL-02 Section 5.2). Personal messaging applications (WhatsApp personal accounts, Facebook Messenger, SMS) must not be used for Inovy business communications involving Confidential or Restricted information.

### 8.2 Video Call Security

- Company meetings and customer calls use approved video conferencing tools (Zoom or Google Meet via corporate Google Workspace)
- Meeting rooms used for sensitive discussions must be set to require authentication or a password
- Meeting recordings must be stored in approved storage (Inovy platform or secure company storage), not the video conferencing provider's cloud
- Participants in customer calls must be in a private, quiet location where the call cannot be overheard by others

### 8.3 Verbal Communications

- Sensitive business discussions (financial, personnel, security-related) must not be conducted in public spaces where they could be overheard
- Use headphones or earbuds when participating in calls in potentially overheard environments
- Do not discuss customer names, meeting content, or personal data in the presence of individuals who are not authorised to receive that information

---

## 9. Physical Security of Devices

### 9.1 Unattended Devices

- Never leave a laptop or mobile device unattended and unlocked
- In co-working spaces, public places, or shared spaces: never leave a device physically unattended without either taking it with you or using a physical security cable lock
- When stepping away from a device in any environment, activate the screen lock (keyboard shortcut: `Cmd+Ctrl+Q` on macOS, `Win+L` on Windows)

### 9.2 Travel

When travelling (within the Netherlands or internationally):

- Carry the laptop in hand luggage; never check it in
- At airport security: keep the laptop in sight at all times; retrieve it promptly from the X-ray machine
- In airports, hotels, and taxis: the screen should be positioned to prevent observation by others
- Be aware of shoulder surfing in crowded environments (trains, planes)
- When crossing international borders: be aware that customs authorities in some jurisdictions may request access to devices. Contact the Information Security Manager if border device inspection occurs

---

## 10. Lost, Stolen, or Compromised Devices

If a device is lost, stolen, or suspected to be compromised (malware, physical tampering):

1. **Report immediately** to the Information Security Manager (within 1 hour of discovery)
2. **Remote wipe** is initiated by the Information Security Manager or Engineering Lead via MDM
3. **Access revocation:** All credentials stored on the device (SSH keys, saved passwords, cached session tokens) are invalidated
4. Change the password for all accounts that were accessible from the device
5. The incident is assessed under POL-07 to determine if customer data may have been at risk
6. A police report (aangifte) is filed if the device was stolen (required for insurance and regulatory purposes)
7. A replacement device is provisioned with the standard security configuration before work resumes

---

## 11. Compliance and Monitoring

Compliance with this policy is verified through:

- Annual self-certification: All remote workers certify annually that their work environment and devices meet the requirements of this policy
- Spot checks: The Engineering Lead or Information Security Manager may request evidence of device encryption status, screen lock configuration, or network security at any time
- MDM telemetry: Device management software reports on OS patch levels and encryption status
- Onboarding verification: New joiners' devices are verified as part of the onboarding process before access is granted

Non-compliance with this policy is subject to the disciplinary process in POL-09 Section 7.

---

## 12. Roles and Responsibilities

| Role                          | Responsibility                                                     |
| ----------------------------- | ------------------------------------------------------------------ |
| Information Security Manager  | Policy ownership, compliance monitoring, lost device response      |
| Engineering Lead              | MDM management, device provisioning, technical security standards  |
| All employees and contractors | Compliance with this policy, reporting violations and lost devices |
| Managers                      | Ensuring team members understand and comply with this policy       |

---

## 13. Policy Review

This policy is reviewed annually or when a significant change in the remote working model occurs, a security incident is linked to remote working, or relevant regulations or threat landscape changes.

| Revision | Date       | Author                       | Summary of Changes |
| -------- | ---------- | ---------------------------- | ------------------ |
| 1.0      | 2026-03-13 | Information Security Manager | Initial release    |
