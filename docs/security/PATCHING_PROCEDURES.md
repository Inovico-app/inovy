# ICT Component Patching Procedures

**Document Version:** 1.0  
**Last Updated:** 2026-02-22  
**Classification:** Internal  
**SSD Reference:** SSD-1.1.01 - Patching Procedures

## 1. Purpose

This document defines the procedures and schedules for patching and updating all ICT components within the Inovy platform to maintain security, stability, and compliance with security baseline requirements.

## 2. Scope

These procedures apply to all patchable components:

- Application dependencies (npm packages)
- Runtime environments (Node.js)
- Infrastructure platform (Vercel)
- Database systems (PostgreSQL, Redis, Qdrant)
- Third-party services and APIs
- Development tools and CI/CD

## 3. Patching Principles

### 3.1 Core Principles

- **Proactive Patching**: Apply security patches promptly
- **Risk-Based Prioritization**: Critical vulnerabilities patched immediately
- **Testing Before Production**: All patches tested in non-production environments
- **Rollback Capability**: Ability to quickly rollback problematic patches
- **Documentation**: All patching activities documented
- **Compliance**: Meet regulatory patch timelines

### 3.2 Patch Categories

| Category | Description | Target Timeline | Examples |
|----------|-------------|-----------------|----------|
| **Critical** | Actively exploited vulnerabilities, RCE, data breach risks | 24-48 hours | CVE with CVSS ≥9.0, zero-day exploits |
| **High** | Severe security issues, no known exploitation | 7 days | CVE with CVSS 7.0-8.9 |
| **Medium** | Security issues with mitigating factors | 30 days | CVE with CVSS 4.0-6.9 |
| **Low** | Minor security improvements | 90 days | CVE with CVSS 1.0-3.9, general updates |
| **Feature** | Non-security updates, new features | Planned releases | Major version updates, new capabilities |

## 4. Component-Specific Patching Procedures

### 4.1 Application Dependencies (npm Packages)

#### 4.1.1 Automated Dependency Updates

**Dependabot Configuration:**

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/apps/web"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    open-pull-requests-limit: 10
    reviewers:
      - "security-team"
    labels:
      - "dependencies"
      - "security"
    commit-message:
      prefix: "chore"
      include: "scope"
    
    # Security updates
    versioning-strategy: increase-if-necessary
    
    # Group non-security updates
    groups:
      dev-dependencies:
        dependency-type: "development"
        update-types:
          - "minor"
          - "patch"
      production-dependencies:
        dependency-type: "production"
        update-types:
          - "patch"

  # Root workspace
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
    
  # MCP package
  - package-ecosystem: "npm"
    directory: "/packages/mcp"
    schedule:
      interval: "weekly"
      day: "monday"
      time: "09:00"
```

#### 4.1.2 Manual Dependency Review Process

**Weekly Review (Every Monday):**

```bash
# 1. Check for outdated packages
cd /workspace
pnpm outdated

# 2. Run security audit
pnpm audit --production

# 3. Check Dependabot PRs
# Review and merge automated PRs at: https://github.com/[org]/[repo]/pulls

# 4. Update dependencies if needed
pnpm update --latest --interactive

# 5. Run tests after updates
pnpm typecheck
pnpm lint
pnpm build

# 6. Commit changes if manual updates were made
git add pnpm-lock.yaml package.json apps/*/package.json packages/*/package.json
git commit -m "chore(deps): update dependencies"
git push
```

#### 4.1.3 Critical Security Patches

**Immediate Response Process (within 24-48 hours):**

```bash
# 1. Assess the vulnerability
# Check: https://github.com/advisories
# Check: https://security.snyk.io/

# 2. Identify affected packages
pnpm audit --json > audit-report.json

# 3. Update specific vulnerable package
pnpm update <package-name>@latest

# 4. Test thoroughly
pnpm typecheck
pnpm lint
pnpm build
pnpm test  # if tests exist

# 5. Deploy to staging first
git checkout -b hotfix/security-<package-name>
git add pnpm-lock.yaml
git commit -m "fix(security): patch <package-name> vulnerability CVE-XXXX-XXXX"
git push -u origin hotfix/security-<package-name>

# 6. Create PR and get expedited review
# 7. Deploy to production after staging verification
```

#### 4.1.4 Version Pinning Strategy

**Dependency Version Management:**

```json
// package.json - Version strategy
{
  "dependencies": {
    // Critical dependencies: exact versions
    "next": "16.1.1",
    "react": "19.2.3",
    
    // Stable dependencies: caret (minor updates ok)
    "@tanstack/react-query": "^5.89.0",
    
    // Development dependencies: flexible
    "typescript": "^5.9.2"
  }
}
```

**Pinning Rules:**
- **Exact versions** (`"16.1.1"`): Framework core (Next.js, React)
- **Caret versions** (`"^5.89.0"`): Stable libraries (minor + patch updates)
- **Tilde versions** (`"~5.89.0"`): Patch updates only (rare cases)
- **Lock file**: `pnpm-lock.yaml` always committed

### 4.2 Runtime Environment (Node.js)

#### 4.2.1 Node.js Update Schedule

**Update Policy:**
- **LTS releases only**: Use Long Term Support versions
- **Update window**: Within 30 days of new LTS release
- **Testing period**: 2 weeks in staging before production

**Current Version Requirement:**
```json
{
  "engines": {
    "node": ">=20.9.0"
  }
}
```

#### 4.2.2 Node.js Update Process

**Quarterly Review (or when new LTS is released):**

```bash
# 1. Check current Node.js version
node --version

# 2. Check for new LTS releases
# Visit: https://nodejs.org/en/about/releases/

# 3. Update Vercel deployment configuration
# In Vercel Dashboard:
# Project Settings > General > Node.js Version

# 4. Update GitHub Actions workflows
# .github/workflows/*.yml
# Update: uses: actions/setup-node@v4
#         with:
#           node-version: "24"  # Update version

# 5. Update package.json engines
# "engines": {
#   "node": ">=24.0.0"  # Update minimum version
# }

# 6. Update local development
# Using nvm:
nvm install 24
nvm use 24
nvm alias default 24

# 7. Test thoroughly
pnpm install
pnpm build
pnpm test

# 8. Document change
# Create PR with Node.js version update
git checkout -b chore/update-nodejs-24
# ... make changes ...
git commit -m "chore(runtime): update Node.js to v24 LTS"
git push -u origin chore/update-nodejs-24
```

### 4.3 Infrastructure Platform (Vercel)

#### 4.3.1 Vercel Platform Updates

**Managed by Vercel:**
- Infrastructure patching (automatic)
- Security updates (automatic)
- Edge network updates (automatic)
- Certificate renewals (automatic)

**Monitoring Requirements:**
- Subscribe to [Vercel Status](https://www.vercel-status.com/)
- Review [Vercel Changelog](https://vercel.com/changelog) monthly
- Enable email notifications for critical updates

#### 4.3.2 Next.js Framework Updates

**Update Schedule:**
- **Patch releases** (16.1.x): Apply within 7 days
- **Minor releases** (16.x.0): Apply within 30 days, test thoroughly
- **Major releases** (17.0.0): Plan migration, allocate 1-3 months

**Update Process:**

```bash
# 1. Check current Next.js version
cd apps/web
npm list next

# 2. Check for updates
npm outdated next

# 3. Review release notes
# Visit: https://github.com/vercel/next.js/releases

# 4. Update Next.js (patch or minor)
pnpm update next@latest

# 5. Update React (if Next.js requires it)
pnpm update react@latest react-dom@latest

# 6. Run codemod if provided (for breaking changes)
npx @next/codemod <codemod-name>

# 7. Test application thoroughly
pnpm dev          # Test in development
pnpm build        # Test production build
pnpm start        # Test production server

# 8. Deploy to staging for verification
# 9. Monitor for issues (24-48 hours)
# 10. Deploy to production

# 11. Document changes
git commit -m "chore(deps): update Next.js to vX.Y.Z"
```

### 4.4 Database Systems

#### 4.4.1 PostgreSQL (Neon) Patching

**Managed by Neon:**
- Database engine updates (automatic)
- Security patches (automatic)
- Performance improvements (automatic)

**User Responsibilities:**
- Monitor [Neon Status](https://neon.tech/status)
- Review [Neon Changelog](https://neon.tech/docs/changelog)
- Test database connections after Neon maintenance windows
- Update `@neondatabase/serverless` client library (monthly)

**Client Library Update:**

```bash
# Monthly check
cd apps/web
npm outdated @neondatabase/serverless

# Update if new version available
pnpm update @neondatabase/serverless@latest

# Test database connections
pnpm db:studio  # Verify connection
```

#### 4.4.2 Redis (Upstash) Patching

**Managed by Upstash:**
- Redis version updates (automatic)
- Security patches (automatic)
- Infrastructure maintenance (automatic)

**User Responsibilities:**
- Monitor [Upstash Status](https://status.upstash.com/)
- Update `@upstash/redis` client library (monthly)
- Rotate API tokens (quarterly)
- Test cache operations after updates

**Client Library Update:**

```bash
# Monthly check
pnpm outdated @upstash/redis

# Update if new version available
pnpm update @upstash/redis@latest

# Test cache functionality
curl http://localhost:3000/api/cache/health
```

**Token Rotation (Quarterly):**

```bash
# 1. Generate new token in Upstash Dashboard
# 2. Update environment variable in Vercel
# 3. Redeploy application
# 4. Verify new token works
# 5. Delete old token from Upstash
# 6. Document rotation in security log
```

#### 4.4.3 Qdrant Vector Database Patching

**Managed by Qdrant Cloud:**
- Qdrant version updates (automatic)
- Security patches (automatic)
- Infrastructure maintenance (automatic)

**User Responsibilities:**
- Monitor [Qdrant Changelog](https://github.com/qdrant/qdrant/releases)
- Update `@qdrant/js-client-rest` library (monthly)
- Test vector search after updates
- Optimize collections after major updates

**Client Library Update:**

```bash
# Monthly check
pnpm outdated @qdrant/js-client-rest

# Update if new version available
pnpm update @qdrant/js-client-rest@latest

# Test Qdrant connectivity
curl http://localhost:3000/api/qdrant/health

# Run optimization if major update
pnpm optimize-qdrant
```

### 4.5 Third-Party Services

#### 4.5.1 API Client Library Updates

**Monthly Update Schedule:**

```bash
# AI Services
pnpm update openai@latest
pnpm update @anthropic-ai/sdk@latest
pnpm update @deepgram/sdk@latest
pnpm update ai@latest
pnpm update @ai-sdk/openai@latest

# Authentication
pnpm update better-auth@latest
pnpm update @better-auth/passkey@latest
pnpm update @better-auth/stripe@latest

# Storage & Email
pnpm update @vercel/blob@latest
pnpm update resend@latest

# Integrations
pnpm update googleapis@latest
pnpm update stripe@latest

# Test after updates
pnpm typecheck
pnpm build
```

#### 4.5.2 Third-Party Service Monitoring

**Service Health Checks:**
- OpenAI: https://status.openai.com/
- Anthropic: https://status.anthropic.com/
- Deepgram: https://status.deepgram.com/
- Stripe: https://status.stripe.com/
- Resend: https://resend.com/status
- Vercel: https://www.vercel-status.com/

**Monitoring Actions:**
- Subscribe to status page notifications
- Review service changelogs monthly
- Update API integrations when deprecated
- Test fallback mechanisms quarterly

### 4.6 Development Tools & CI/CD

#### 4.6.1 Development Dependencies

**Monthly Update Process:**

```bash
# TypeScript
pnpm update typescript@latest

# Build tools
pnpm update turbo@latest
pnpm update @tailwindcss/postcss@latest
pnpm update tailwindcss@latest

# Database tools
pnpm update drizzle-orm@latest
pnpm update drizzle-kit@latest
pnpm update drizzle-seed@latest

# Linting & Formatting
pnpm update eslint@latest
pnpm update prettier@latest
pnpm update typescript-eslint@latest

# Test after updates
pnpm typecheck
pnpm lint
pnpm build
```

#### 4.6.2 GitHub Actions

**Quarterly Review Process:**

```bash
# 1. Review all workflow files
ls -la .github/workflows/

# 2. Check for action updates
# Visit: https://github.com/actions

# 3. Update action versions
# Update format: uses: actions/checkout@v4 (use latest major version)

# Common actions to update:
# - actions/checkout
# - actions/setup-node
# - actions/cache
# - pnpm/action-setup

# 4. Test workflows
# Push to test branch and verify workflow execution

# 5. Document changes
git commit -m "chore(ci): update GitHub Actions"
```

**Action Version Pinning Strategy:**
- Use **major version tags** (`@v4`, not `@v4.1.2`)
- Review breaking changes before major version updates
- Pin to specific SHA for critical workflows (optional)
- Subscribe to action repository releases

## 5. Patching Schedule

### 5.1 Regular Patching Calendar

| Frequency | Day | Time | Activity | Responsible |
|-----------|-----|------|----------|-------------|
| **Daily** | Mon-Fri | 09:00 UTC | Dependabot PR review | Dev Team |
| **Weekly** | Monday | 09:00 UTC | Dependency audit | Security Engineer |
| **Weekly** | Monday | 10:00 UTC | Security advisories review | Security Engineer |
| **Monthly** | First Monday | All day | Third-party library updates | Dev Team |
| **Monthly** | Second Monday | All day | Development tools update | Dev Team |
| **Quarterly** | First Monday of Q | All day | Node.js LTS check | DevOps |
| **Quarterly** | First Monday of Q | All day | GitHub Actions update | DevOps |
| **Quarterly** | Second Monday of Q | All day | API token rotation | Security Engineer |
| **Quarterly** | Third Monday of Q | All day | Security audit | Security Engineer |
| **Annually** | January | All month | Major framework review | Tech Lead |
| **Annually** | July | All month | Comprehensive security assessment | External Auditor |

### 5.2 Emergency Patching

**Critical Vulnerability Response:**

1. **Alert Received** (T+0)
   - Dependabot security alert
   - GitHub security advisory
   - Vendor security bulletin
   - Public disclosure (Twitter, Reddit, etc.)

2. **Assessment** (T+1 hour)
   - Verify vulnerability affects Inovy
   - Assess severity (CVSS score)
   - Determine exploitability
   - Identify affected components

3. **Planning** (T+2 hours)
   - Determine patch strategy
   - Identify mitigation steps if no patch available
   - Plan deployment approach
   - Notify stakeholders

4. **Implementation** (T+4-48 hours based on severity)
   - Apply patches in test environment
   - Run automated tests
   - Manual verification
   - Deploy to staging
   - Monitor for issues (4-8 hours)
   - Deploy to production
   - Verify patch effectiveness

5. **Documentation** (T+72 hours)
   - Document incident
   - Update risk register
   - Create post-mortem if needed
   - Update procedures if gaps identified

### 5.3 Maintenance Windows

**Standard Maintenance Windows:**
- **Day**: Tuesday or Wednesday (avoid Monday, Friday)
- **Time**: 02:00-06:00 UTC (off-peak hours)
- **Frequency**: As needed (typically 1-2 times per month)
- **Notification**: 3 business days advance notice for planned maintenance

**Emergency Maintenance:**
- **Authorization**: Security Engineer or Tech Lead
- **Notification**: As soon as possible (may be during incident)
- **Communication**: Status page update + email to users

## 6. Testing & Validation

### 6.1 Automated Testing

**Pre-Deployment Checks (CI/CD):**

```yaml
# GitHub Actions workflow
- name: Type Check
  run: pnpm typecheck

- name: Lint
  run: pnpm lint

- name: Build
  run: pnpm build

- name: Security Audit
  run: pnpm audit --production

- name: Dependency Check
  run: |
    npm outdated || true
    npm audit --production --audit-level=moderate
```

### 6.2 Manual Testing

**Post-Patch Verification Checklist:**

- [ ] Application builds successfully
- [ ] Type checking passes
- [ ] Linting passes
- [ ] All automated tests pass
- [ ] Development server starts
- [ ] Production build works
- [ ] Database connections work
- [ ] Cache operations work
- [ ] Authentication flows work
- [ ] API endpoints respond correctly
- [ ] Third-party integrations work
- [ ] File uploads work
- [ ] AI processing works (transcription, summary)
- [ ] No console errors in browser
- [ ] No new security warnings

### 6.3 Staging Environment

**Staging Deployment Process:**

```bash
# 1. Deploy to staging (automatic via Vercel)
# Triggered by PR creation or push to staging branch

# 2. Wait 4-8 hours (monitor for errors)
# Check Vercel logs for errors
# Check application logs in dashboard
# Test critical user flows

# 3. Approve production deployment
# If no issues, merge PR to main
# Production deployment automatic

# 4. Monitor production (24-48 hours)
# Check error rates
# Check performance metrics
# Monitor user reports
```

### 6.4 Rollback Procedures

**Quick Rollback Process:**

```bash
# Option 1: Vercel instant rollback (recommended)
# In Vercel Dashboard:
# 1. Go to Deployments
# 2. Find previous stable deployment
# 3. Click "..." menu
# 4. Click "Promote to Production"

# Option 2: Git revert (if Option 1 not available)
git revert <commit-hash>
git push origin main
# Wait for automatic deployment

# Option 3: Emergency hotfix
git checkout main
git checkout -b hotfix/revert-patch
# Manually undo changes
git commit -m "hotfix: revert problematic patch"
git push -u origin hotfix/revert-patch
# Create PR and merge immediately
```

**Rollback Decision Criteria:**
- Critical functionality broken
- Data integrity issues
- Severe performance degradation
- Security introduced by patch (rare)
- Unable to fix forward within 1 hour

## 7. Documentation & Communication

### 7.1 Patch Documentation

**Required Documentation:**

1. **Patch Log** (monthly summary)
   - Date of patch
   - Component patched
   - Version before/after
   - Reason for patch (security, bug fix, feature)
   - Test results
   - Deployment date

2. **Security Incident Reports** (for critical patches)
   - CVE identifier
   - Vulnerability description
   - Risk assessment
   - Mitigation steps
   - Remediation timeline
   - Lessons learned

3. **Change Log** (user-facing)
   - Keep `CHANGELOG.md` updated
   - Include security fixes (without details)
   - Document breaking changes

### 7.2 Communication Plan

**Internal Communication:**
- Slack channel: `#security-updates`
- Email: security@inovy.io
- Weekly security meeting

**External Communication (for critical patches):**
- Status page: status.inovy.io (to be set up)
- Email notification to affected users
- In-app notification banner

**Communication Templates:**

```markdown
# Critical Security Patch Notification

**Date**: [Date]
**Severity**: Critical
**Status**: Resolved

We have applied a critical security patch to address [brief description].

**Actions Taken**:
- Applied patch to [component]
- Verified fix effectiveness
- Monitored for issues

**User Impact**: None / Minimal downtime (X minutes)

**User Action Required**: None / Please log out and log back in

For questions, contact: security@inovy.io
```

## 8. Metrics & Reporting

### 8.1 Patching Metrics

**Key Performance Indicators (KPIs):**

| Metric | Target | Measurement |
|--------|--------|-------------|
| Critical patch time | < 48 hours | Time from disclosure to production deployment |
| High patch time | < 7 days | Time from disclosure to production deployment |
| Medium patch time | < 30 days | Time from disclosure to production deployment |
| Dependency age | < 6 months | Average age of production dependencies |
| Unpatched vulnerabilities | 0 critical, <5 high | Count from `pnpm audit` |
| Patch success rate | > 99% | Patches deployed without rollback |
| Dependabot PR merge time | < 7 days | Time from PR creation to merge |

### 8.2 Monthly Reporting

**Security Patch Report (Monthly):**

```markdown
# Security Patch Report - [Month] [Year]

## Summary
- Total patches applied: [X]
- Critical: [X]
- High: [X]
- Medium: [X]
- Low: [X]

## Critical Patches
[List of critical patches with CVE, component, timeline]

## Outstanding Vulnerabilities
[List of known unpatched vulnerabilities with justification]

## Metrics
- Average patch time (critical): [X] hours
- Average patch time (high): [X] days
- Dependencies updated: [X]
- Failed patches (rolled back): [X]

## Upcoming Patches
[Scheduled updates for next month]

## Recommendations
[Process improvements, tool updates, training needs]
```

## 9. Roles & Responsibilities

### 9.1 Patching Roles

| Role | Responsibilities |
|------|------------------|
| **Security Engineer** | - Monitor security advisories<br>- Assess vulnerabilities<br>- Approve critical patches<br>- Conduct security audits<br>- Maintain patching documentation |
| **Development Team** | - Review Dependabot PRs<br>- Apply patches<br>- Test patches<br>- Deploy patches<br>- Monitor deployments |
| **DevOps/SRE** | - Manage CI/CD pipeline<br>- Maintain infrastructure<br>- Monitor production<br>- Execute rollbacks<br>- Manage environment variables |
| **Tech Lead** | - Approve major version updates<br>- Review breaking changes<br>- Plan migration strategies<br>- Allocate resources for patching<br>- Escalation point |
| **Product Owner** | - Approve maintenance windows<br>- Communicate with stakeholders<br>- Balance features vs. security<br>- Approve emergency patches |

### 9.2 On-Call Rotation

**Security On-Call:**
- 24/7 coverage for critical security issues
- Rotation: weekly
- Response time: 1 hour for critical alerts
- Escalation path defined

## 10. Tools & Automation

### 10.1 Patching Tools

**Implemented Tools:**
- **Dependabot**: Automated dependency updates
- **GitHub Security Advisories**: Vulnerability notifications
- **pnpm audit**: Dependency vulnerability scanning
- **ESLint**: Code security linting
- **GitHub Actions**: Automated testing and deployment

**Recommended Additional Tools:**
- **Snyk**: Continuous security monitoring (optional)
- **Socket Security**: Supply chain security (optional)
- **OWASP Dependency-Check**: License and vulnerability scanning (optional)

### 10.2 Automation Opportunities

**Future Automation:**
- Automatic merging of patch-only Dependabot PRs (after testing)
- Automated security patch notifications to Slack
- Automated rollback triggers based on error rates
- Dependency update dashboard
- Automated compliance reporting

## 11. Continuous Improvement

### 11.1 Process Review

**Quarterly Process Review:**
- Review patching metrics
- Identify bottlenecks
- Update procedures based on lessons learned
- Incorporate new tools or techniques
- Training needs assessment

### 11.2 Security Training

**Patching Training:**
- New team member onboarding: include patching procedures
- Annual refresher training on patching process
- Post-incident training after critical patches
- Share lessons learned from security incidents

## 12. Compliance & Audit

### 12.1 Audit Trail

**Required Records (retained for 1 year minimum):**
- Patch logs with dates and versions
- Vulnerability assessments
- Test results
- Deployment logs
- Rollback events
- Security incident reports

### 12.2 Compliance Verification

**Evidence Collection:**
- Dependabot configuration
- GitHub Actions workflows
- pnpm-lock.yaml history (git log)
- Security advisory review logs
- Monthly patch reports
- Audit findings and remediation

## 13. References

### 13.1 Internal Documentation
- [Hardening Policy](./HARDENING_POLICY.md)
- [Compliance Verification](./COMPLIANCE_VERIFICATION.md)
- [Security Checklist](./SECURITY_CHECKLIST.md)

### 13.2 External Resources
- [GitHub Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [npm Security Best Practices](https://docs.npmjs.com/security-best-practices)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [NIST NVD - CVE Database](https://nvd.nist.gov/)
- [OWASP Dependency Management](https://owasp.org/www-community/Component_Analysis)

---

**Document Control:**
- **Created**: 2026-02-22
- **Version**: 1.0
- **Next Review**: 2026-05-22 (Quarterly)
- **Approved By**: [To be completed]
- **Approval Date**: [To be completed]
