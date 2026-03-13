# Roles and Responsibilities

| Field               | Value                        |
| ------------------- | ---------------------------- |
| Document ID         | ISMS-05                      |
| Version             | 1.0                          |
| Classification      | Internal                     |
| Owner               | Information Security Manager |
| Approved by         | CEO/CTO                      |
| Effective date      | 2026-03-13                   |
| Review date         | 2027-03-13                   |
| ISO 27001 Reference | Clause 5.2, A.5.2, A.5.3     |

---

## 1. Purpose

This document defines the information security roles and responsibilities within Inovy's ISMS. It fulfils the requirements of ISO 27001:2022 Clause 5.2 (roles, responsibilities and authorities) and Annex A controls A.5.2 (Information security roles and responsibilities) and A.5.3 (Segregation of duties).

---

## 2. Organizational Security Roles

### 2.1 CEO / CTO

**Accountability:** Ultimate accountability for the ISMS and Inovy's information security posture.

**Responsibilities:**

- Approve the Information Security Policy (ISMS-04) and all top-level ISMS documents
- Allocate sufficient resources (budget, personnel, time) for ISMS operation and improvement
- Ensure information security objectives (ISMS-06) are aligned with and integrated into business strategy
- Chair or participate in biannual management reviews (ISMS-13)
- Act on significant security incidents escalated by the ISM
- Approve changes to the ISMS scope (ISMS-03)
- Ensure the organization's culture supports information security through visible leadership

### 2.2 Information Security Manager (ISM)

**Authority:** Delegated authority from CEO/CTO for day-to-day ISMS operation. Reports directly to CTO.

**Responsibilities:**

- Own, maintain, and continually improve the ISMS documentation suite (ISMS-01 to ISMS-14 and all subordinate policies)
- Conduct and coordinate the annual risk assessment (ISMS-08) and maintain the risk register (ISMS-09)
- Manage the internal audit program (ISMS-12) including scheduling, auditor assignment, and follow-up of findings
- Prepare and facilitate biannual management reviews (ISMS-13)
- Manage the corrective action process (ISMS-14) including tracking CARs to closure
- Monitor security KPIs (ISMS-11) and report performance to management
- Oversee supplier security assessments per POL-18 and maintain the sub-processor register
- Act as primary contact for the Autoriteit Persoonsgegevens and NCSC-NL
- Coordinate personal data breach assessment and notification (GDPR Art. 33/34)
- Maintain the ISMS policy framework (POL-01 through POL-20) and annual review cycle
- Ensure security awareness training is delivered and records maintained
- Monitor threat intelligence sources (Appendix B of ISMS-04) and translate intelligence into risk management actions

### 2.3 Engineering Lead

**Authority:** Technical authority for secure engineering practices and infrastructure security.

**Responsibilities:**

- Implement and maintain technical security controls as specified in the ISMS risk treatment plan
- Enforce the Secure Development Lifecycle (SDL) per POL-17 including code review, SAST, secret scanning, and dependency management
- Manage GitHub repository security settings, branch protection rules, and CI/CD pipeline security
- Oversee infrastructure provisioning via Terraform; ensure IaC changes are reviewed before apply
- Conduct quarterly access reviews for infrastructure and production system access
- Ensure security patches are applied within SLAs defined in POL-19 (Vulnerability Management)
- Evaluate and approve third-party technical integrations from a security perspective
- Provide technical input to risk assessments and threat modelling
- Escalate security incidents to the ISM per POL-12 (Incident Response)

### 2.4 Developers

**Authority:** Responsible for security of code they produce and systems they operate.

**Responsibilities:**

- Write secure code following POL-17 (Secure Development Policy) and OWASP guidelines
- Complete all mandatory security awareness training within required timeframes
- Report potential security vulnerabilities and incidents to the ISM or Engineering Lead promptly
- Never commit secrets, credentials, or PII to source code repositories
- Review security-relevant aspects of code in peer reviews; reject PRs with unresolved security findings
- Apply dependency updates flagged by Dependabot within SLAs defined in POL-19
- Follow the change management procedure (POL-04) for all production changes
- Comply with all ISMS policies (POL-01 through POL-20) relevant to their role

### 2.5 All Staff

**Authority:** Individual responsibility for compliance with ISMS policies.

**Responsibilities:**

- Read, understand, and comply with ISMS-04 (Information Security Policy) and applicable subordinate policies
- Complete mandatory annual security awareness training
- Report security incidents, near-misses, and suspected vulnerabilities immediately through the defined reporting channel
- Protect access credentials; never share passwords or MFA tokens
- Use only approved devices and tools for accessing Inovy systems (per POL-01 and POL-10)
- Lock screens and secure devices when unattended
- Report lost or stolen devices immediately to the ISM

---

## 3. RACI Matrix

**Key:** R = Responsible | A = Accountable | C = Consulted | I = Informed

| Activity                               | CEO/CTO | ISM | Eng Lead | Developers | All Staff  |
| -------------------------------------- | ------- | --- | -------- | ---------- | ---------- |
| Risk assessment execution              | I       | A/R | C        | C          | I          |
| Policy approval                        | A       | R   | C        | I          | I          |
| Policy compliance monitoring           | I       | A/R | C        | I          | I          |
| Incident response (operational)        | I       | A   | R        | R          | R (report) |
| Incident escalation to authorities     | A       | R   | C        | I          | I          |
| Access reviews (infrastructure)        | I       | A   | R        | C          | I          |
| Access reviews (application RBAC)      | I       | A   | R        | R          | I          |
| Internal audit coordination            | I       | A/R | C        | I          | I          |
| Internal audit evidence provision      | I       | A   | R        | R          | C          |
| Management review preparation          | C       | A/R | C        | I          | I          |
| Management review participation        | A/R     | R   | C        | I          | I          |
| Vulnerability management               | I       | A   | R        | R          | I          |
| Patch application (infrastructure)     | I       | A   | R        | R          | I          |
| Change management approval             | A       | C   | R        | C          | I          |
| Security awareness training delivery   | I       | A/R | C        | I          | I          |
| Security awareness training completion | I       | A   | I        | R          | R          |
| Supplier security assessment           | I       | A/R | C        | I          | I          |
| Corrective action tracking             | I       | A/R | C        | C          | I          |
| GDPR breach notification               | A       | R   | C        | I          | I          |
| Cryptographic key management           | I       | A   | R        | R          | I          |
| Audit log review                       | I       | A/R | C        | I          | I          |
| Secure SDLC enforcement                | I       | A   | R        | R          | I          |

---

## 4. Segregation of Duties (A.5.3)

Inovy implements segregation of duties to reduce the risk of error, fraud, or unauthorized actions. The following segregation controls are in place:

### 4.1 Code Review and Deployment

- **No self-approved pull requests:** All code changes require review and approval by at least one engineer other than the author before merging. This is enforced by GitHub branch protection rules on the main branch (required reviewer count ≥ 1, no PR author self-approval).
- **Deployment pipeline:** Production deployments are triggered through GitHub Actions CI/CD pipeline, not through direct manual access to production infrastructure. This separates the act of writing code from the act of deploying it.

### 4.2 Database Administration

- **Database admin vs. application admin:** Database administration access (schema changes, data migration, direct query access) is restricted to a subset of engineers with operational need and is separate from application administration (user management, organization management within the app).
- **Production database access:** Direct production database access requires justification, is logged, and is separate from development/staging database access.

### 4.3 Audit Log Integrity

- **Audit log read-only for non-ISM roles:** The tamper-proof SHA-256 hash chain audit log is stored in an append-only structure. Application RBAC restricts modification or deletion of audit records. Only the ISM and designated audit reviewers have read access to the full security audit trail; operational users cannot modify log records.
- **No self-auditing:** Engineers cannot review or alter audit logs of their own actions. Audit log review for investigations is conducted by the ISM or a designated auditor who is not the subject of the review.

### 4.4 ISMS Document Approval

- **No self-approval of ISMS documents:** ISMS documents authored by the ISM are approved by the CEO/CTO. Policy changes proposed by engineering are reviewed and approved by the ISM before publication. This ensures independent review of all policy changes.

### 4.5 Access Provisioning

- **Separate provisioner and approver:** Access provisioning to sensitive systems requires both a request from the user's manager and approval by the ISM or Engineering Lead. No individual can provision their own elevated access.
- **Privilege escalation separation:** Emergency or break-glass access to production systems requires dual authorization (ISM + Engineering Lead or CEO/CTO) and is logged in the incident record.

### 4.6 Financial Transactions

- **Payment system separation:** Stripe payment processing is handled through the application layer only. No engineering team member has direct access to customer billing data beyond what is surfaced in the Stripe dashboard. Financial approval for significant expenditure requires CEO/CTO authorization.

---

## 5. Named Responsibilities (Current)

Specific named individuals are assigned to ISMS roles in the internal HR/operations system. Role assignments are reviewed:

- At least annually during the management review (ISMS-13)
- Immediately upon departure of a named role-holder
- Upon significant organizational restructuring

The current role assignment register is maintained as a controlled internal document separate from this ISMS-05 to avoid requiring policy updates on personnel changes.

---

## 6. Document Control

This document is reviewed annually by the ISM. Updates to role descriptions or RACI assignments follow the procedure defined in ISMS-07 (Document Control Procedure).

**Next review:** 2027-03-13
