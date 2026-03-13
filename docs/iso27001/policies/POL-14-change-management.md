# Change Management Policy

| Field              | Value                        |
| ------------------ | ---------------------------- |
| Document ID        | POL-14                       |
| Version            | 1.0                          |
| Classification     | Internal                     |
| Owner              | Information Security Manager |
| Approved by        | CEO/CTO                      |
| Effective date     | 2026-03-13                   |
| Review date        | 2027-03-13                   |
| ISO 27001 Controls | A.8.32, A.8.33               |

---

## 1. Purpose

This policy establishes the requirements for managing changes to Inovy's information systems, applications, and infrastructure in a controlled and auditable manner. Inovy operates an AI-powered meeting recording SaaS platform. Uncontrolled changes to production systems can introduce security vulnerabilities, cause data loss, or expose customer meeting recordings and PII to unauthorised parties. This policy ensures that all changes are reviewed, tested, authorised, and reversible before they impact production.

## 2. Scope

This policy covers all changes to:

- **Application code**: The `apps/web` Next.js application and `packages/mcp` package
- **Infrastructure**: Terraform IaC in `infrastructure/` and Azure resource configuration
- **Database schema**: Drizzle ORM migrations in `apps/web/src/server/db/migrations/`
- **CI/CD pipelines**: GitHub Actions workflows in `.github/workflows/`
- **Third-party integrations**: Configuration of OpenAI, Deepgram, Anthropic, Recall.ai, Stripe, Resend, Google Workspace, and Microsoft integrations
- **Security configuration**: Network security groups, Azure RBAC, GitHub repository settings, environment variables

Changes to documentation, internal non-production tooling, and personal development environments are out of scope.

## 3. Roles and Responsibilities

| Role                   | Responsibility                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Change Author          | Creates the pull request with complete documentation; performs testing; responds to review feedback; is accountable for the change meeting all requirements in this policy    |
| Code Reviewer          | Reviews the pull request for correctness, security, and policy compliance; approves or requests changes; is accountable for the quality of their review                       |
| Engineering Lead       | Approves Normal changes with security impact; coordinates Emergency changes; reviews deployment pipeline configuration changes                                                |
| ISM                    | Reviews and approves changes to security-relevant components (authentication, authorisation, RBAC, PII handling, audit logging, secrets); approves Emergency changes post-hoc |
| GitHub Actions / Azure | Executes automated deployments; no human executes changes directly in production                                                                                              |

## 4. Change Management Process (A.8.32)

### 4.1 All Changes via Pull Requests

**Every change to production systems must be made via a GitHub pull request.** Direct changes to the `main` branch are prohibited. Branch protection rules on the `main` branch enforce:

- At least **1 approving review** required before merge
- **All CI checks must pass** before merge (CodeQL, `pnpm audit`, TypeScript compile, lint, tests)
- The branch must be up to date with `main` before merge
- Branch protection applies to all users, including repository administrators

### 4.2 Pull Request Documentation Requirements

Every pull request must include in the description:

1. **Change description**: What is being changed and why. For security-impacting changes, link to the relevant threat or requirement.
2. **Testing evidence**: How the change was tested. Acceptable evidence includes:
   - Screenshots or screen recordings of the feature working correctly
   - Test output from automated test runs
   - Description of manual testing steps performed
   - For schema migrations: confirmation that the migration ran successfully in local development
3. **Security impact assessment**: Completion of the security checklist from POL-13 Section 4.1. If the change has no security impact, this must be explicitly stated (not omitted).
4. **Rollback plan**: How the change can be reversed if it causes issues in production. For database migrations, the down migration must be documented or confirmed to exist.

### 4.3 Change Categories

#### Standard Changes (Routine, Pre-Approved)

Standard changes are low-risk, well-understood changes that follow an established pattern and do not require individual security review. They still require at least one code review and passing CI.

Examples:

- Adding a new UI component that does not interact with sensitive data
- Updating a non-security npm dependency to a patch version
- Fixing a typo in copy or documentation
- Adding a new CSS class or style adjustment
- Updating a Resend email template for transactional emails (non-auth)

Standard changes may be merged by any engineer with the required approvals and passing CI.

#### Normal Changes (Require Security Review)

Normal changes introduce new functionality, modify existing business logic, or touch components with security implications. They require a dedicated security impact assessment and may require ISM or Engineering Lead review.

Examples:

- New server actions that access the database
- Changes to Better Auth configuration, roles, or permissions
- New third-party API integration (adding Recall.ai, adding a new AI provider)
- Changes to the AI prompt pipeline or injection detection logic
- New API endpoints or changes to existing endpoint authentication
- Database schema changes (new tables, column additions, index changes)
- Changes to file upload handling (MIME validation, size limits, storage paths)
- Infrastructure changes (Terraform, Azure networking, NSG rules)
- Changes to environment variable handling or secrets management
- New background jobs or webhook processors

Normal changes require explicit approval from the Engineering Lead. Changes touching authentication, authorisation, PII handling, or audit logging require ISM review.

#### Emergency Changes

Emergency changes are required immediately to address a critical security incident, a production outage, or a material regulatory deadline. The standard review process is expedited but not bypassed.

**Emergency change procedure**:

1. The change author notifies the Engineering Lead and ISM via Slack `#engineering` with the subject "EMERGENCY CHANGE: [brief description]"
2. An expedited review is performed by at least one engineer (Engineering Lead if available)
3. The change is deployed via the normal CI/CD pipeline — not manually
4. **Post-hoc documentation** must be completed within **24 hours** of deployment:
   - Incident ticket created in the issue tracker with full description
   - Pull request updated with complete documentation (what, why, testing, security impact)
   - ISM notified to review the change record
5. The Emergency change is flagged in the monthly management review

Emergency changes that circumvent the CI/CD pipeline (manual deployments) are **prohibited**, even in emergencies. If the CI/CD pipeline is unavailable, this is itself a P1 incident.

### 4.4 Database Migration Process

Database schema changes using Drizzle ORM follow a specific sub-process:

1. **Generate migration**: `pnpm db:generate --name <descriptive-name>` creates a new migration file in `apps/web/src/server/db/migrations/`
2. **Review migration SQL**: The generated SQL must be reviewed in the pull request. Destructive operations (DROP COLUMN, DROP TABLE, data truncation) require explicit ISM approval
3. **Test locally**: The migration must be successfully applied to a local development database before merge
4. **Merge triggers automated deployment**: On merge to `main`, the `migrate-prod-db.yml` GitHub Actions workflow automatically applies pending migrations to the Neon PostgreSQL production database
5. **Monitor post-migration**: The change author monitors health check endpoints and application logs for 30 minutes post-migration

**`pnpm db:push` is prohibited in production.** This command bypasses the migration system and can cause data loss or schema drift.

### 4.5 Application Deployment Process

Application deployments are performed automatically by the `azure-container-deploy.yml` GitHub Actions workflow on merge to `main`:

1. Docker image built using multi-stage Alpine Dockerfile
2. Image tagged with the commit SHA (e.g., `inovy-web:abc1234`)
3. Image pushed to Azure Container Registry
4. Azure Container Apps updated to the new image with zero-downtime rolling deployment
5. Health checks confirm the new deployment is healthy before traffic is switched
6. Previous image tag retained in registry for rollback

No engineer deploys directly to Azure Container Apps. All deployments are traceable to a specific commit and pull request.

## 5. Rollback Procedures

### 5.1 Application Rollback

If a deployment causes issues, rollback is performed by:

1. Identifying the previous healthy container image tag (from the GitHub Actions deployment log)
2. Updating the Azure Container Apps revision to point to the previous image tag
3. Health checks confirm the rollback is successful
4. The failed pull request is reverted on GitHub and re-merged only after the issue is resolved

Container image tags are retained in Azure Container Registry for a minimum of **90 days**, providing a rollback window for any recent deployment.

### 5.2 Database Migration Rollback

Every Drizzle migration file must include a **down migration** that reverses the schema change. Down migrations are tested in local development as part of the PR process.

If a production migration must be reversed:

1. ISM and Engineering Lead approve the rollback
2. Application is set to maintenance mode if required to prevent data corruption
3. Down migration is executed via a dedicated `rollback` workflow (or equivalent Drizzle CLI command run via CI)
4. Application deployment is rolled back to the compatible version
5. Incident is documented fully

Destructive rollbacks (losing data) require ISM approval and must be preceded by a database backup verification.

### 5.3 Infrastructure Rollback

Terraform state changes can be reversed by:

1. Reverting the Terraform IaC change in the pull request
2. Running `terraform plan` to confirm the revert scope
3. Applying via the Terraform GitHub Actions workflow

Terraform state is locked in Azure Storage, preventing concurrent modifications.

## 6. Test Information and Production Data (A.8.33)

### 6.1 Prohibition on Production Data in Testing

Production data must not be used in testing environments. This prohibition is absolute and includes:

- Customer meeting recordings and transcripts
- Customer PII (names, email addresses, BSN numbers)
- Production database exports or snapshots
- OAuth tokens or API keys from production integrations

Violation of this prohibition is a reportable security incident under POL-07 and must be treated as a potential data breach under GDPR.

### 6.2 Synthetic and Anonymised Test Data

All testing uses:

- **Synthetic data**: Fabricated records that match production schema shapes but contain no real customer information. Engineers are responsible for generating appropriate test fixtures.
- **Anonymised data** (when schema shape must reflect production): Data exported from production and anonymised via HMAC-SHA256 pseudonymisation (`pii-utils.ts`) or full replacement of PII fields with synthetic values, before loading into a development environment.

### 6.3 Investigating Production Issues

When a production bug requires access to production data to diagnose:

1. The Engineer requests access in writing to the ISM (Slack DM is acceptable)
2. ISM and Engineering Lead jointly approve the request, documenting the justification
3. The minimum necessary data is accessed via Neon's console or parameterised queries
4. All production data accessed is **deleted from local environments within 48 hours** of the investigation closing
5. The access is recorded in the security event log

If the investigation reveals a potential data breach, POL-07 (Incident Management Policy) is invoked.

## 7. Change Records and Audit Trail

### 7.1 GitHub as the System of Record

GitHub serves as Inovy's primary change management system of record. Every change has:

- A pull request with description, reviews, and approval history
- CI run results demonstrating the change passed all automated checks
- Merge commit linking the change to the deployment

GitHub pull request history is retained indefinitely and is available for audit purposes.

### 7.2 Change Metrics

The ISM reviews the following change metrics at the monthly management review:

- Number of changes deployed (by category: Standard / Normal / Emergency)
- Number of Emergency changes (with justification review)
- Number of failed deployments and rollbacks
- Open Dependabot security PRs beyond SLA

## 8. Related Documents

| Document                            | Reference |
| ----------------------------------- | --------- |
| Information Security Policy         | POL-01    |
| Secure Development Lifecycle Policy | POL-13    |
| Incident Management Policy          | POL-07    |
| Vulnerability Management Policy     | POL-18    |
| Data Protection & Privacy Policy    | POL-15    |

## 9. Document History

| Version | Date       | Author | Changes         |
| ------- | ---------- | ------ | --------------- |
| 1.0     | 2026-03-13 | ISM    | Initial release |
