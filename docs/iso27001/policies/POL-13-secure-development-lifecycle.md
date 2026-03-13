# Secure Development Lifecycle Policy

| Field              | Value                                                         |
| ------------------ | ------------------------------------------------------------- |
| Document ID        | POL-13                                                        |
| Version            | 1.0                                                           |
| Classification     | Internal                                                      |
| Owner              | Information Security Manager                                  |
| Approved by        | CEO/CTO                                                       |
| Effective date     | 2026-03-13                                                    |
| Review date        | 2027-03-13                                                    |
| ISO 27001 Controls | A.8.25, A.8.26, A.8.27, A.8.28, A.8.29, A.8.30, A.8.31, A.5.8 |

---

## 1. Purpose

This policy defines Inovy's requirements for integrating information security throughout the software development lifecycle (SDLC). Inovy develops and operates an AI-powered meeting recording SaaS platform built on Next.js 16, Better Auth, Drizzle ORM, and Neon PostgreSQL. The application processes sensitive meeting recordings, transcripts, and personally identifiable information including BSN numbers. Security must be embedded at every phase of development rather than applied as an afterthought.

## 2. Scope

This policy applies to:

- All software developed by Inovy engineers for the `apps/web` application and `packages/mcp` package
- All changes to infrastructure-as-code (Terraform in `infrastructure/`)
- All third-party code integrated via npm packages or direct API integration
- External contractors contributing code to the Inovy codebase
- GitHub Actions CI/CD workflows that build, test, and deploy Inovy software

## 3. Roles and Responsibilities

| Role             | Responsibility                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Engineering Lead | Enforces secure coding standards; approves security-relevant architectural decisions; ensures security checklists are completed             |
| ISM              | Owns this policy; performs security reviews of high-risk features; coordinates annual penetration testing; reviews SAST findings            |
| All Engineers    | Apply secure coding standards in all code; complete security checklist for feature PRs; triage and remediate SAST findings assigned to them |
| Product Manager  | Ensures security impact assessment is part of feature requirements; raises security-impacting features for ISM review                       |

## 4. Security in Project Management (A.5.8)

Security requirements must be identified, assessed, and documented at the start of every feature or significant change. This is not a retrospective activity.

### 4.1 Security Impact Assessment

For every feature or change, the author must complete the **Security Checklist** as part of the pull request description. The checklist covers:

| Category                           | Questions to answer                                                                                                                                                                                                                                         |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication & Authorisation** | Does this feature require authentication? Are Better Auth RBAC permission checks applied at the server action level? Could any code path be reached by an unauthenticated user? Does the feature respect organisation isolation (multi-tenancy boundaries)? |
| **Data Classification**            | What data does this feature create, read, update, or delete? Is any of it Restricted (recordings, transcripts, BSN, API keys)? Is PII handled according to POL-15?                                                                                          |
| **Third-party integrations**       | Does this feature call any external API (OpenAI, Deepgram, Anthropic, Recall.ai, Google, Microsoft, Stripe, Resend)? Are API credentials managed via environment variables? Are webhook payloads validated with HMAC-SHA256?                                |
| **Input validation**               | Is all input validated with Zod schemas before use? Are AI prompts constructed without unvalidated user input interpolation?                                                                                                                                |
| **Encryption**                     | Is data at rest encrypted (Azure Blob Storage encryption, Neon TLS)? Is data in transit encrypted with TLS 1.2+?                                                                                                                                            |

Features assessed as high security impact (e.g., changes to authentication flows, RBAC permission model, AI output handling, payment processing) must be reviewed by the ISM or Engineering Lead before merge.

## 5. Secure Development Lifecycle Phases (A.8.25)

Inovy follows a structured SDLC with defined security activities at each phase:

### 5.1 Requirements Phase

- Security requirements documented alongside functional requirements in the feature specification
- Data processing requirements identify data classification and applicable regulatory obligations (GDPR, UAVG)
- Privacy-by-design considerations documented (data minimisation, purpose limitation)
- Security acceptance criteria defined before implementation begins

### 5.2 Design Phase

- Threat modelling performed for features that introduce new attack surfaces:
  - New API endpoints
  - New third-party integrations
  - Changes to authentication or authorisation logic
  - New AI pipeline components
- Architecture diagrams reviewed to ensure defence-in-depth (see Section 7)
- Data flow diagrams identify all points where PII is processed, stored, or transmitted
- Organisation isolation validated at the design level for any multi-tenant feature

### 5.3 Implementation Phase

- Developers apply secure coding standards as defined in Section 8 of this policy
- Pre-commit hooks run automatically:
  - Secret scanning (prevents API keys, tokens, passwords from being committed)
  - TypeScript compilation check
  - Prettier formatting
- Engineers reference `docs/iso27001/` policies as the authoritative internal security reference

### 5.4 Testing Phase

- SAST (CodeQL) runs automatically in GitHub Actions CI on every pull request
- `pnpm audit` runs in CI to check for known vulnerabilities in npm dependencies
- Dependency review (Dependabot alerts) reviewed before merge
- Manual code review by a second engineer is required for all pull requests
- High-impact features receive additional security-focused review by the Engineering Lead or ISM

### 5.5 Deployment Phase

- All deployments are performed via GitHub Actions CI/CD pipelines (`azure-container-deploy.yml`)
- No manual deployments to production are permitted (see POL-14)
- Database migrations are executed via the dedicated `migrate-prod-db.yml` workflow, not via `pnpm db:push`
- Production environment variables are managed via Azure Container Apps environment configuration, not committed to source control
- Container images are tagged with the commit SHA for traceability and rollback capability

### 5.6 Operations Phase

- Security monitoring via Pino structured logging with field redaction
- Health check endpoints monitored continuously: `/api/health`, `/api/connection-pool/health`, `/api/qdrant/health`
- Failed authentication and authorisation events logged and alertable
- Post-incident review identifies SDLC process improvements to prevent recurrence
- Vulnerability disclosures handled according to POL-18 (Vulnerability Management Policy)

## 6. Application Security Requirements (A.8.26)

All Inovy web application endpoints must implement the following security requirements:

### 6.1 HTTP Security Headers

Every response from the Inovy Next.js application must include the following security headers, configured in `next.config.ts`:

| Header                      | Required Value / Behaviour                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | Restrictive policy with explicit allowlists for trusted CDNs, Google Workspace, Microsoft auth endpoints, and Inovy's Azure Blob Storage domain |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload`                                                                                                  |
| `X-Frame-Options`           | `DENY` — prevents clickjacking                                                                                                                  |
| `X-Content-Type-Options`    | `nosniff`                                                                                                                                       |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                                                                                                               |
| `Permissions-Policy`        | Restrictive policy limiting camera, microphone, geolocation access                                                                              |

Security headers are verified in CI using automated header checks.

### 6.2 Input Validation

- **All** user-supplied input must be validated with **Zod schemas** before use in any business logic, database query, or AI prompt
- Validation occurs at the server action boundary (using `next-safe-action` with Zod schemas) so that no unvalidated input reaches the database or AI services
- File uploads are validated for:
  - MIME type against an explicit whitelist (audio/mpeg, audio/wav, video/mp4, etc.)
  - File size limits enforced before processing
  - HMAC-SHA256 upload tokens with timing-safe comparison to prevent token forgery
- URL parameters and query strings are parsed through typed schemas, not accessed as raw strings

### 6.3 Output Encoding

- All dynamic content rendered in the browser is passed through React's automatic XSS escaping
- HTML content from external sources (e.g., email previews, rich text from integrations) is sanitised with **DOMPurify** before rendering
- JSON API responses use `Content-Type: application/json` to prevent MIME confusion attacks

### 6.4 CSRF Protection

Cross-Site Request Forgery protection is provided by **Better Auth**'s built-in CSRF token mechanism. All state-changing requests (POST, PUT, PATCH, DELETE) must include a valid CSRF token. Next.js Server Actions automatically include origin validation.

## 7. Secure Architecture Principles (A.8.27)

### 7.1 React Server Components

Inovy uses Next.js 16's React Server Components (RSC) architecture. By default, components run on the server and do not expose business logic, database queries, or sensitive configuration to the client bundle. This significantly reduces the attack surface compared to traditional SPAs.

**Requirement**: `use client` directives must only be applied to components that genuinely require browser APIs. Data fetching must never be performed in client components; it must be performed in Server Components using the `use cache` directive or in server actions.

### 7.2 Organisation Isolation

Inovy is a multi-tenant SaaS. Every database query that accesses organisation-scoped data must include an `organizationId` filter. The absence of an organisation filter is a critical security defect.

- Organisation isolation is enforced at the data access layer using Drizzle ORM query builders
- All server actions validate the requesting user's organisation membership before executing queries
- Cross-organisation data access is prohibited at the code level; any attempt results in an authorisation error and an audit log entry

### 7.3 Layered Architecture

The application follows a layered architecture with clear trust boundaries:

```
Browser (untrusted) → Next.js Edge/Middleware (rate limiting, auth check) →
Server Components / Server Actions (business logic, RBAC check) →
Data Access Layer (Drizzle ORM, org isolation) →
Neon PostgreSQL / Azure Blob Storage / Qdrant (data stores)
```

No layer trusts input from the layer above without validation. RBAC checks are performed at the server action layer, not in the UI.

### 7.4 Defence in Depth

Multiple independent security controls protect each sensitive operation. For example, accessing a meeting recording requires:

1. Valid Better Auth session (authentication)
2. Correct organisation membership (authorisation check 1)
3. Explicit permission check for the recording resource (authorisation check 2)
4. Audit log entry recording the access

## 8. Secure Coding Standards (A.8.28)

### 8.1 Input Validation

```typescript
// REQUIRED: All server actions use next-safe-action with Zod schema
const transcribeAction = actionClient
  .schema(
    z.object({ meetingId: z.string().uuid(), language: z.string().max(10) }),
  )
  .action(async ({ parsedInput }) => {
    /* ... */
  });
```

Raw input must never be used in database queries, AI prompts, or file operations.

### 8.2 Database Queries

- All database queries must use **Drizzle ORM's query builder** with parameterised values
- Raw SQL strings are **prohibited** — they bypass Drizzle's type safety and parameterisation
- Any deviation from Drizzle ORM requires ISM approval and must be documented in the PR

```typescript
// CORRECT: Parameterised query via Drizzle
await db.select().from(meetings).where(eq(meetings.organizationId, orgId));

// PROHIBITED: String interpolation in SQL
await db.execute(sql`SELECT * FROM meetings WHERE org_id = '${orgId}'`);
```

### 8.3 AI Prompt Injection Prevention

Inovy's AI pipeline processes user-supplied meeting content through OpenAI, Anthropic, and Deepgram. Prompt injection is a primary threat vector.

- User input must never be interpolated directly into AI system prompts
- Inovy's prompt injection detection library checks for 18+ patterns before passing content to AI models, including Dutch-language injection attempts
- AI output is validated against expected schemas before being returned to users or stored
- PII output guard middleware prevents AI models from returning raw PII in responses

### 8.4 PII Handling

- BSN numbers, email addresses, phone numbers, and other PII must be anonymised using **HMAC-SHA256** before storage in non-essential contexts (using `pii-utils.ts`)
- PII must never appear in application logs; Pino's `redact` configuration enforces this for known fields
- PII in meeting transcripts is detected by the PII detection service and redacted in contexts where the raw value is not required
- Credit card numbers and medical record data must never be stored on Inovy systems

### 8.5 Secrets Management

- API keys, tokens, and passwords must **never** be committed to source code
- Pre-commit hooks run secret scanning on all staged files before commit
- Secrets are managed via:
  - GitHub Actions secrets (for CI/CD)
  - Azure Container Apps environment variable configuration (for production)
  - `.env.local` files (for local development only, gitignored)
- If a secret is accidentally committed, it must be considered compromised immediately: rotate the secret, then clean the git history

### 8.6 TypeScript Strict Mode

All Inovy code is written in TypeScript with `strict: true` in `tsconfig.json`. This enforces:

- `strictNullChecks`: eliminates null/undefined bugs
- `noImplicitAny`: prevents untyped code
- `strictFunctionTypes`: ensures correct function type compatibility

Type errors must be resolved; `any` casts and `@ts-ignore` comments are permitted only when unavoidable and must include a comment explaining the reason.

## 9. Security Testing (A.8.29)

### 9.1 Static Application Security Testing (SAST)

**CodeQL** runs on every pull request targeting the `main` branch via GitHub Actions. CodeQL analyses TypeScript/JavaScript code for:

- SQL injection vulnerabilities
- Cross-site scripting (XSS)
- Insecure regular expressions (ReDoS)
- Prototype pollution
- Path traversal
- Sensitive data exposure

CodeQL findings are reviewed by the Engineering Lead before merge. Critical findings block merge; high findings must have a documented remediation plan within 72 hours.

**Semgrep** (optional, additional ruleset) can be run locally by engineers for additional coverage of Inovy-specific patterns (e.g., missing `organizationId` filter, unsafe AI prompt construction).

### 9.2 Dependency Vulnerability Scanning

- `pnpm audit` runs in every CI pipeline and fails the build on critical or high severity findings without an explicit exception documented in the PR
- **GitHub Dependabot** monitors all npm dependencies and creates automated PRs for security patches within 24 hours of CVE publication
- Engineers are expected to review and merge Dependabot security PRs within the SLA defined in POL-18

### 9.3 Pre-commit Secret Scanning

A pre-commit hook runs secret scanning on all staged files before every commit. This uses pattern matching to detect:

- API keys (OpenAI, Anthropic, Deepgram, Stripe, Resend, Recall.ai)
- AWS/Azure credentials
- Private keys (RSA, EC)
- Generic high-entropy strings matching token patterns

If a secret is detected, the commit is blocked and the engineer must remove the secret before proceeding.

### 9.4 Software Bill of Materials (SBOM)

A **CycloneDX SBOM** is generated as part of the CI/CD pipeline and stored as a build artefact. The SBOM documents all direct and transitive dependencies, their versions, and their licences. This supports:

- Rapid identification of affected components when new CVEs are published
- Licence compliance auditing

### 9.5 Annual Penetration Testing

Inovy commissions an annual penetration test from an independent security firm. The test scope includes:

- Web application penetration test (OWASP-methodology)
- API security testing (all REST and Server Action endpoints)
- Authentication and authorisation bypass testing
- AI-specific security testing (prompt injection, model output manipulation)
- Infrastructure review (Azure networking, IAM)

Findings are remediated according to the SLAs in POL-18. Penetration test reports are retained for 3 years.

## 10. Outsourced Development (A.8.30)

When external contractors or third-party developers contribute to the Inovy codebase:

1. **NDA / Confidentiality Agreement**: All external developers must sign an NDA before being granted any access to the codebase or development environment
2. **Repository access**: External developers are granted read access to only the repositories necessary for their work; they are never granted production environment access
3. **Code review**: All code contributed by external developers must be reviewed by an Inovy engineer before merge. The review explicitly checks for:
   - Backdoors or malicious code
   - Compliance with this secure coding policy
   - Correct application of Inovy's RBAC and organisation isolation patterns
4. **No production access**: External developers must not be granted access to production databases, Azure subscriptions, or production secrets
5. **Offboarding**: Upon completion of engagement, all repository access is revoked, GitHub tokens are invalidated, and any temporary credentials are rotated

## 11. Separation of Environments (A.8.31)

### 11.1 Environment Inventory

| Environment           | Purpose                         | Infrastructure                                                                          | Secrets                                                            |
| --------------------- | ------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **Local development** | Individual engineer development | Developer's machine; local `.env.local`; optional local Qdrant via Docker Compose       | `.env.local` (gitignored); non-production API keys where possible  |
| **Production**        | Live customer-facing service    | Azure Container Apps (EU-Central-1); Neon PostgreSQL (EU-Central-1); Azure Blob Storage | Azure Container Apps environment variables; GitHub Actions secrets |

Inovy does not currently maintain a dedicated staging environment; this is documented in the risk register as an accepted risk. Feature testing is performed in local development environments against synthetic data.

### 11.2 Production Data in Development

**Production data must never be used in development environments.** This prohibition includes:

- Meeting recordings and transcripts from real customers
- Customer PII (email addresses, BSN numbers, names)
- Production database exports

All development and testing must use **synthetic or anonymised data**. If a production data issue must be debugged, the following procedure applies:

1. ISM and Engineering Lead approve the access in writing (Slack DM is sufficient)
2. Anonymised copies of the relevant records are created
3. All copies are deleted within 48 hours of the investigation completing
4. The access is logged in the security incident register

### 11.3 Secret Separation

Production secrets (Neon `DATABASE_URL`, OpenAI API key, Deepgram API key, Stripe secret key, etc.) are stored exclusively in Azure Container Apps environment configuration and GitHub Actions secrets. They are never:

- Stored in `.env` files committed to source control
- Used in local development environments
- Shared via email, Slack, or any communication channel

## 12. Related Documents

| Document                         | Reference |
| -------------------------------- | --------- |
| Information Security Policy      | POL-01    |
| Change Management Policy         | POL-14    |
| Data Protection & Privacy Policy | POL-15    |
| Vulnerability Management Policy  | POL-18    |
| Incident Management Policy       | POL-07    |

## 13. Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
