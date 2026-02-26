# Security Documentation
## SSD-1.3.02: Support Only Design-Required Services

This directory contains documentation and tooling for ensuring compliance with SSD-1.3.02 of the Dutch Standard for Secure Development (SSD-1).

---

## 📋 Overview

**SSD-1.3.02** requires that:
> ICT components only support services required by design. Other services are deactivated or removed.

This requirement ensures minimal attack surface and reduces security risk by:
- Documenting all services and their justification
- Identifying and disabling unused services
- Performing regular service audits
- Maintaining control mechanisms for service enablement

---

## 📚 Documentation

### [SERVICE_INVENTORY.md](./SERVICE_INVENTORY.md)
**Comprehensive inventory of all services in the application.**

Contains:
- Complete list of API endpoints, server actions, and services
- Business justification for each service
- Service control mechanisms (environment variables, feature flags)
- Security and compliance status
- Recommendations for unused services

**When to review:** Quarterly, before releases, when adding new services

---

### [SERVICE_AUDIT_PROCESS.md](./SERVICE_AUDIT_PROCESS.md)
**Step-by-step process for conducting service audits.**

Contains:
- Quarterly audit checklist
- Annual comprehensive audit procedure
- Service approval process
- Service removal/deprecation process
- Emergency service disable procedure

**When to use:** Every 3 months, or when triggered by releases/incidents

---

### [SERVICE_CONTROL_CONFIG.md](./SERVICE_CONTROL_CONFIG.md)
**Reference for all service control mechanisms.**

Contains:
- Environment variable configuration
- Per-organization settings
- Role-based access control
- Feature flag implementation
- Production hardening checklist

**When to use:** During deployment, configuration changes, troubleshooting

---

## 🛠️ Audit Scripts

Located in `/scripts/audit/`:

### `discover-services.sh`
**Automatically discover all services in the codebase.**

```bash
./scripts/audit/discover-services.sh
```

**Output:**
- List of all API routes
- List of all server actions
- List of all service classes
- Database schemas
- Environment variables
- Webhooks and cron jobs
- Summary report saved to file

**When to run:** Before audits, after major changes, monthly

---

### `compliance-check.sh`
**Automated compliance checks for common security issues.**

```bash
./scripts/audit/compliance-check.sh
```

**Checks:**
- API authentication
- Authorization in server actions
- Rate limiting implementation
- Sensitive data handling (hardcoded secrets)
- Audit logging for sensitive operations
- Input validation
- Environment configuration
- Cron job security
- Webhook signature verification
- Experimental feature flags

**When to run:** Before deployments, during code reviews, continuous integration

---

### `check-service-status.sh`
**Check which services are currently enabled/configured.**

```bash
./scripts/audit/check-service-status.sh
```

**Output:**
- Status of all services (enabled/disabled/configured)
- Production readiness check
- Configuration issues
- Recommendations

**When to run:** After configuration changes, troubleshooting, deployment verification

---

## 🚀 Quick Start Guide

### For New Team Members

1. **Read the Documentation**
   - Start with [SERVICE_INVENTORY.md](./SERVICE_INVENTORY.md)
   - Understand control mechanisms in [SERVICE_CONTROL_CONFIG.md](./SERVICE_CONTROL_CONFIG.md)
   - Review audit process in [SERVICE_AUDIT_PROCESS.md](./SERVICE_AUDIT_PROCESS.md)

2. **Run Discovery Scripts**
   ```bash
   # Discover all services
   ./scripts/audit/discover-services.sh
   
   # Check service status
   ./scripts/audit/check-service-status.sh
   ```

3. **Understand Service Control**
   - Review `.env.example` for configuration options
   - Check database for per-organization settings
   - Understand feature flags and role-based access

---

### For Auditors

**Quarterly Audit Checklist:**

1. Run service discovery
   ```bash
   ./scripts/audit/discover-services.sh > audit-$(date +%Y%m%d).txt
   ```

2. Run compliance checks
   ```bash
   ./scripts/audit/compliance-check.sh
   ```

3. Check service status
   ```bash
   ./scripts/audit/check-service-status.sh
   ```

4. Compare against SERVICE_INVENTORY.md
   - Identify new services
   - Verify justifications
   - Check for unused services

5. Update documentation
   - Update SERVICE_INVENTORY.md
   - Document new services
   - Mark deprecated services
   - Add audit trail entry

6. Create audit report
   - Use template in SERVICE_AUDIT_PROCESS.md
   - Document findings and action items
   - Schedule next audit

---

### For Developers

**Adding a New Service:**

1. **Proposal**
   - Document business justification
   - Create technical design
   - Assess security and compliance impact

2. **Implementation**
   - Follow security best practices
   - Add authentication/authorization
   - Implement rate limiting
   - Add audit logging (if sensitive)
   - Create feature flag for control

3. **Documentation**
   - Add to SERVICE_INVENTORY.md
   - Document environment variables
   - Update API documentation

4. **Approval**
   - Security review
   - Compliance review (if handling sensitive data)
   - Tech lead approval
   - CTO approval (for production)

---

### For DevOps/SRE

**Production Deployment Checklist:**

1. **Pre-Deployment**
   ```bash
   # Verify configuration
   ./scripts/audit/check-service-status.sh
   
   # Run compliance checks
   ./scripts/audit/compliance-check.sh
   ```

2. **Required Environment Variables**
   - `BETTER_AUTH_SECRET` (strong, unique)
   - `ENCRYPTION_MASTER_KEY` (if encryption enabled)
   - `DATABASE_URL`
   - `UPSTASH_REDIS_REST_URL` (rate limiting)
   - `CRON_SECRET`

3. **Optional Services (Configure Only If Required)**
   - `RECALL_API_KEY` (bot services)
   - `GOOGLE_CLIENT_ID` (Google integrations)
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (AI chat)
   - `DEEPGRAM_API_KEY` (transcription)

4. **Disabled in Production**
   - `ENABLE_MCP_ENDPOINT=false`
   - `ENABLE_EXPERIMENTAL_CHAT=false`
   - Remove debug/development variables

5. **Post-Deployment**
   - Verify service status
   - Check error rates
   - Monitor rate limiting
   - Review logs for issues

---

## 📊 Compliance Status

### Current Status: ✅ Compliant

**Last Audit:** 2026-02-24  
**Next Audit:** 2026-05-24  
**Auditor:** System

### Summary
- **Total Services:** 31 API routes + 100+ server actions + 72 service classes
- **Unused Services Identified:** 0
- **Security Issues:** 0
- **Compliance Issues:** 0

### Recent Changes
- 2026-02-24: Initial service inventory created
- 2026-02-24: Audit process documented
- 2026-02-24: Service control configuration documented
- 2026-02-24: Audit scripts created

---

## 🎯 Key Performance Indicators (KPIs)

Track these metrics for ongoing compliance:

| Metric | Target | Current |
|--------|--------|---------|
| Service Count Trend | Stable or decreasing | Baseline established |
| Services with Documentation | 100% | 100% |
| Audit Completion Rate | 100% on time | N/A (first audit) |
| Security Issues per Audit | 0 | 0 |
| Unused Services | <5% | 0% |

---

## 🔒 Security Best Practices

### When Adding Services

1. **Principle of Least Privilege**
   - Only add necessary functionality
   - Restrict access to minimum required roles
   - Implement fine-grained permissions

2. **Defense in Depth**
   - Multiple layers of security controls
   - Authentication + Authorization + Rate Limiting
   - Input validation + Output encoding

3. **Fail Secure**
   - Default to deny access
   - Explicit allow rather than implicit
   - Graceful degradation without security compromise

4. **Audit Everything Sensitive**
   - Log access to sensitive data
   - Track modifications and deletions
   - Maintain tamper-proof audit trails

5. **Control Mechanisms**
   - Feature flags for toggleability
   - Per-organization control where appropriate
   - Emergency kill switches for critical services

---

## 📞 Contact & Support

### Questions or Issues?

- **Security Concerns:** security@inovy.app
- **Compliance Questions:** compliance@inovy.app
- **Technical Support:** dev-team@inovy.app

### External Audits

For external security audits or compliance certification:
- Schedule through CTO
- Provide access to all documentation in this directory
- Review findings and update documentation accordingly

---

## 📖 Related Resources

### Internal Documentation
- [README.md](/README.md) - Project overview
- [PRD.md](/PRD.md) - Product requirements
- [SSD_REMAINING_USER_STORIES.md](/SSD_REMAINING_USER_STORIES.md) - Security compliance roadmap

### External Standards
- [NEN 7510](https://www.nen.nl/en/nen-7510-2017-a1-2020-nl-264481) - Healthcare information security
- [AVG/GDPR](https://gdpr.eu/) - Data protection regulation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Web application security risks
- [OWASP API Security](https://owasp.org/www-project-api-security/) - API security best practices

### Tools
- [Better Auth](https://better-auth.com/) - Authentication framework
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe database access
- [Next-safe-action](https://next-safe-action.dev/) - Type-safe server actions
- [Zod](https://zod.dev/) - Schema validation

---

## 📝 Document History

| Date | Author | Changes |
|------|--------|---------|
| 2026-02-24 | System | Initial documentation created for SSD-1.3.02 compliance |

---

**Document Classification:** Internal - Security  
**Review Frequency:** Quarterly  
**Next Review Date:** 2026-05-24
