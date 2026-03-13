# Access Control Policy

| Field              | Value                                                      |
| ------------------ | ---------------------------------------------------------- |
| Document ID        | POL-01                                                     |
| Version            | 1.0                                                        |
| Classification     | Internal                                                   |
| Owner              | Information Security Manager                               |
| Approved by        | CEO/CTO                                                    |
| Effective date     | 2026-03-13                                                 |
| Review date        | 2027-03-13                                                 |
| ISO 27001 Controls | A.5.15, A.5.16, A.5.17, A.5.18, A.8.2, A.8.3, A.8.4, A.8.5 |

---

## 1. Purpose

This policy defines the principles, rules, and responsibilities governing access to Inovy's information assets, systems, and infrastructure. It ensures that access is granted only to authorised individuals on a need-to-know and least-privilege basis, protecting the confidentiality, integrity, and availability of customer data — including meeting recordings, transcripts, and personal data such as BSN numbers.

## 2. Scope

This policy applies to:

- All Inovy employees, contractors, and third-party personnel with access to Inovy systems
- All information assets, including the Next.js web application, Neon PostgreSQL database, Azure Blob Storage, Qdrant vector database, Redis cache, GitHub repository, and third-party SaaS integrations
- All environments: production, staging, and development
- All access methods: web application, API, direct database access, cloud console, and CI/CD pipelines

## 3. Reference Documents

- POL-04 Information Classification and Handling Policy
- POL-06 Supplier Security Policy
- POL-09 HR Security Policy
- `apps/web/src/lib/auth/access-control.ts` — RBAC permission definitions
- `apps/web/src/lib/rbac/organization-isolation.ts` — Organisation isolation enforcement

---

## 4. Access Control Principles (A.5.15)

### 4.1 Least Privilege

All access rights shall be granted on the principle of least privilege. Users and service accounts receive the minimum permissions necessary to perform their assigned duties. No account shall have standing access to resources it does not actively require.

In Inovy's application layer, least privilege is enforced through a role-based access control (RBAC) system implemented in `src/lib/auth/access-control.ts`, which defines approximately 50 granular permission definitions across six roles. Each permission is explicitly declared; access is not inferred or inherited beyond the defined role hierarchy.

### 4.2 Need-to-Know

Access to Confidential and Restricted information (as defined in POL-04) requires both a legitimate business reason and formal authorisation. Access to customer meeting recordings, transcripts, and personal data is restricted to personnel whose job function requires it.

### 4.3 Deny by Default

The default access posture for all Inovy systems is deny-all. Access must be explicitly granted; it is never assumed. This applies at the application layer (permissions must be present in the role definition), the database layer (Row Level Security policies for tenant isolation), and the infrastructure layer (Azure RBAC with no standing broad permissions).

### 4.4 Separation of Duties

Sensitive operations — including production database changes, encryption key rotation, and deployment approvals — require involvement of at least two individuals. A developer cannot approve their own pull request. Database migrations require CI/CD pipeline execution with peer-reviewed code changes.

### 4.5 Role Hierarchy

Inovy implements the following role hierarchy within the application, in descending order of privilege:

| Role         | Scope         | Description                                                                                                           |
| ------------ | ------------- | --------------------------------------------------------------------------------------------------------------------- |
| `superadmin` | Platform-wide | Full platform administration, including the kill-switch endpoint at `/api/admin/agent/kill-switch`. Inovy staff only. |
| `owner`      | Organisation  | Full control over an organisation, including billing, member management, and all data.                                |
| `admin`      | Organisation  | Organisation-level administration excluding billing. Can manage members and all settings.                             |
| `manager`    | Organisation  | Can manage projects, meetings, and team members within their scope.                                                   |
| `user`       | Organisation  | Can create and manage their own meetings, recordings, and transcripts.                                                |
| `viewer`     | Organisation  | Read-only access to shared content within the organisation.                                                           |

---

## 5. Identity Management (A.5.16)

### 5.1 User Account Lifecycle

**Account Creation**

User accounts are created through the Inovy self-service sign-up flow. All new accounts require:

1. A valid email address
2. Email verification via a one-time link sent through Resend
3. Acceptance of the Terms of Service and Privacy Policy

Accounts created via organisation invitation are provisioned with the role assigned by the inviting owner or admin. The inviting party is responsible for ensuring the role is appropriate.

Service accounts for integrations (Google Workspace, Microsoft, etc.) are provisioned through OAuth flows managed by Better Auth. OAuth tokens are encrypted at rest using `OAUTH_ENCRYPTION_KEY`.

**Account Modification**

Role changes require approval from an `owner` or `admin` within the organisation. Role escalation to `superadmin` or `admin` at the platform level requires approval from the Information Security Manager and is logged in the audit trail.

**Account Deactivation**

When a user's employment or contract ends:

1. The account is deactivated within 24 hours of the termination date
2. All active sessions are invalidated immediately
3. OAuth tokens are revoked
4. Access to shared resources is removed

**Account Deletion (GDPR)**

Account deletion is handled by the GDPR service (`src/server/services/gdpr.ts`), which performs a cascading deletion of all personal data associated with the account, including meeting recordings, transcripts, AI-generated summaries, and vector embeddings stored in Qdrant.

### 5.2 Privileged Account Management

Superadmin accounts are held exclusively by designated Inovy platform engineers. These accounts:

- Are subject to mandatory MFA (TOTP)
- Are reviewed quarterly
- Have all privileged actions logged to the audit log with actor identity, timestamp, and action performed
- Are not shared under any circumstances

### 5.3 Service Account Management

Service accounts used by CI/CD pipelines (GitHub Actions) and internal automation services are assigned minimum necessary permissions. Service account credentials are stored as GitHub Actions secrets and rotated at least annually.

---

## 6. Authentication (A.5.17)

### 6.1 Password Policy

All Inovy user accounts are subject to the following password requirements:

- Minimum length: 12 characters
- Complexity: Must contain at least one uppercase letter, one lowercase letter, one number, and one special character
- Breached password check: Passwords are checked against the HaveIBeenPwned database API at the time of creation and change; compromised passwords are rejected
- Password history: The last 5 passwords cannot be reused
- Maximum age: Passwords must be changed at least every 12 months

### 6.2 Password Storage

Passwords are hashed using **scrypt** with the following parameters:

- N (CPU/memory cost): 16,384
- r (block size): 16
- p (parallelisation): 1

These parameters are managed by Better Auth's scrypt implementation. Plaintext passwords are never stored or logged at any layer.

### 6.3 Multi-Factor Authentication

MFA is **mandatory** for all accounts with `admin` or higher privileges and **strongly recommended** for all users. MFA is enforced via:

- **TOTP (Time-based One-Time Password):** Implemented via the Better Auth two-factor plugin. Users register an authenticator app (Google Authenticator, Authy, etc.)
- **Passkeys (WebAuthn):** Users may register a passkey as a primary or secondary authentication factor
- **Magic links:** One-time email links are available as an alternative authentication method for standard user accounts but are not accepted as a substitute for MFA for privileged accounts

### 6.4 Session Management

- Session token expiry: 7 days
- Session inactivity timeout: 30 minutes of inactivity triggers session invalidation
- Sessions are invalidated upon password change or explicit logout
- Session tokens are cryptographically signed using `BETTER_AUTH_SECRET`

---

## 7. Access Rights Management (A.5.18)

### 7.1 Role Assignment

Roles are assigned at the point of invitation. The inviting user (owner or admin) selects the appropriate role from the defined set. The invited user cannot self-assign or escalate their own role.

Role assignments are stored in the database and enforced server-side on every API request and server action.

### 7.2 Access Review

Formal access reviews are conducted **quarterly** by organisation owners and system administrators. The review process includes:

1. Generating a list of all active users and their assigned roles per organisation
2. Confirming that each user's role is still appropriate for their current responsibilities
3. Removing or downgrading access for users whose responsibilities have changed
4. Documenting the review outcome in the access review log

Superadmin accounts undergo a separate, more rigorous review by the Information Security Manager on a quarterly basis.

### 7.3 Access Revocation on Termination

Upon employee or contractor termination:

1. Access is revoked within **24 hours** of the effective termination date
2. The checklist in POL-09 Section 5 (Termination and Change) is followed
3. All active sessions are invalidated immediately via the Better Auth session management interface
4. GitHub organisation membership is removed
5. Access to cloud infrastructure (Azure, Neon, Upstash) is revoked
6. API keys generated by or for the individual are rotated

### 7.4 Organisation Isolation

Inovy's application architecture enforces strict tenant isolation at the data layer through the `assertOrganizationAccess()` function in `src/lib/rbac/organization-isolation.ts`. This function:

- Verifies that the authenticated user belongs to the organisation they are requesting data from
- Is called at the beginning of every server action and API route handler that touches organisation-scoped data
- Returns HTTP 404 (not 403) for cross-organisation access attempts, preventing information leakage about the existence of other organisations' resources

---

## 8. Privileged Access Management (A.8.2)

### 8.1 Privileged Access Justification

Access to `superadmin` and `admin` roles requires documented justification:

- **Superadmin:** Requires written approval from the Information Security Manager and CTO. Access is reviewed quarterly and revoked when the business justification no longer holds.
- **Admin (within an organisation):** Assigned by the organisation owner. The owner is responsible for documenting the business reason in the access review log.

### 8.2 Privileged Action Logging

All privileged actions performed by `superadmin` and `admin` accounts are written to the audit log with:

- Actor identity (user ID, email)
- Timestamp (UTC)
- Action performed
- Target resource
- IP address and user agent

The audit log is append-only and stored in the Neon PostgreSQL database. Deletion of audit log entries requires approval from the Information Security Manager.

### 8.3 Kill-Switch Endpoint

The `/api/admin/agent/kill-switch` endpoint is restricted to `superadmin` accounts only. This endpoint allows platform operators to immediately halt all AI agent processing across the platform in the event of a security incident or runaway AI process. Access is logged to the audit trail with full context.

### 8.4 Production Infrastructure Access

Direct access to production databases, cloud consoles, and infrastructure is restricted to:

- Platform engineers with an active `superadmin` designation
- CI/CD service accounts operating within defined pipeline contexts

Interactive production database access requires a separate justification ticket and is reviewed after the fact in the next quarterly access review.

---

## 9. Information Access Restriction (A.8.3)

### 9.1 Data Layer Isolation

Customer data is isolated at the database layer using organisation-scoped queries. Every database query that retrieves customer data includes an `organisationId` filter. The ORM layer (Drizzle ORM) enforces this through shared query utilities that prepend the organisation filter.

### 9.2 API Response Design

To prevent information leakage through error responses:

- Cross-organisation resource requests return **HTTP 404** rather than 403
- Error messages do not reveal whether a resource exists
- Stack traces are never returned to clients; they are logged server-side only

### 9.3 Meeting Recording and Transcript Access

Access to meeting recordings stored in Azure Blob Storage is controlled via time-limited, signed SAS (Shared Access Signature) tokens. Recordings are never returned as publicly accessible URLs. SAS token generation is restricted to authenticated users who are members of the organisation that owns the recording.

---

## 10. Source Code Access (A.8.4)

### 10.1 Repository Access

The Inovy source code is hosted in a private GitHub repository within the Inovy GitHub organisation. Access is granted on a need-to-know basis:

- All contributors must be members of the GitHub organisation
- Repository access is reviewed as part of the quarterly access review
- Departed employees are removed from the GitHub organisation within 24 hours of termination

### 10.2 Branch Protection

The `main` branch is protected with the following rules:

- Direct pushes are prohibited; all changes must be submitted via pull request
- At least one approving review from a team member is required
- Status checks (lint, typecheck, build) must pass before merge
- Force-push is disabled

### 10.3 Secret Management in Source Code

Secrets must never be committed to the repository. The repository is configured with:

- `.gitignore` entries for `.env*` files
- GitHub Advanced Security secret scanning alerts to detect accidentally committed credentials
- Pre-commit hooks to prevent committing `.env` files

---

## 11. Secure Authentication (A.8.5)

### 11.1 TOTP MFA

MFA using TOTP is implemented via the Better Auth two-factor plugin. TOTP codes are validated server-side; backup codes are generated at enrolment, hashed with PBKDF2-SHA256, and stored in the database. Users are encouraged to store backup codes securely.

### 11.2 Account Lockout

To protect against brute-force attacks:

- Accounts are locked after **5 consecutive failed authentication attempts**
- Lockout duration: **15 minutes**
- Lockout events are logged to the audit trail
- Account unlocks can be performed by the account owner via email-based verification or by a `superadmin`

### 11.3 Session Security

- All sessions are established over TLS 1.2 or higher
- Session cookies are set with `HttpOnly`, `Secure`, and `SameSite=Lax` flags
- Sessions are tied to the issuing IP address for high-privilege accounts
- Session tokens are rotated upon privilege escalation

### 11.4 Transport Security

All authentication requests and API traffic is transmitted exclusively over HTTPS with TLS 1.2 as the minimum version. HTTP requests are redirected to HTTPS at the application layer.

---

## 12. Roles and Responsibilities

| Role                         | Responsibility                                                        |
| ---------------------------- | --------------------------------------------------------------------- |
| Information Security Manager | Policy owner, quarterly privilege review, approving superadmin access |
| CTO                          | Approving superadmin access, policy approval                          |
| Engineering Lead             | Implementing access controls in code, reviewing security-relevant PRs |
| Organisation Owners          | Assigning and reviewing roles within their organisation               |
| All staff                    | Complying with this policy, reporting access anomalies                |

---

## 13. Compliance and Enforcement

Non-compliance with this policy is subject to the disciplinary process defined in POL-09 Section 4. Intentional circumvention of access controls, including sharing credentials, exploiting role escalation vulnerabilities, or accessing cross-organisation data without authorisation, will result in immediate suspension pending investigation.

---

## 14. Policy Review

This policy is reviewed annually, or following a significant security incident, a major architectural change to the access control system, or a change in applicable regulation.

| Revision | Date       | Author                       | Summary of Changes |
| -------- | ---------- | ---------------------------- | ------------------ |
| 1.0      | 2026-03-13 | Information Security Manager | Initial release    |
