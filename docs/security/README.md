# Security Documentation

This directory contains comprehensive security documentation for the Inovy application, including compliance documentation for SSD (Secure Software Development) norms and security audit procedures.

## Directory Structure

```
docs/security/
├── README.md                                          # This file
├── SSD-1.2.02-PROTOCOLS-SERVICES-ACCOUNTS-AUDIT.md  # Main audit document
└── SSD-1.2.02-VERIFICATION-CHECKLIST.md             # Quarterly verification checklist
```

## SSD Compliance Documentation

### SSD-1.2.02: Deactivate Unnecessary Protocols, Services and Accounts

**Status:** ✅ COMPLIANT

The Inovy application complies with SSD-1.2.02 (hardeningsrichtlijn) which requires that only necessary protocols, services, and accounts are active during hosting.

#### Key Documents

1. **[SSD-1.2.02-PROTOCOLS-SERVICES-ACCOUNTS-AUDIT.md](./SSD-1.2.02-PROTOCOLS-SERVICES-ACCOUNTS-AUDIT.md)**
   - Comprehensive audit of all active protocols, services, and accounts
   - Business justification for each component
   - Security controls and configurations
   - Risk assessment and compliance evidence
   - **Review Frequency:** Annually or when major changes occur

2. **[SSD-1.2.02-VERIFICATION-CHECKLIST.md](./SSD-1.2.02-VERIFICATION-CHECKLIST.md)**
   - Quarterly verification checklist
   - Step-by-step verification procedures
   - Compliance testing commands
   - Action item tracking
   - **Review Frequency:** Quarterly (every 3 months)

## Compliance Summary

### Active Components (All Necessary)

#### Protocols
- ✅ HTTP/HTTPS (Required for web traffic)
- ✅ WebSocket Secure (Required for real-time transcription)
- ✅ OAuth 2.0 (Required for integrations)
- ✅ Webhooks (Required for event notifications)

#### Services
- ✅ 31 API endpoints (All documented and justified)
- ✅ 3 Scheduled tasks (All necessary)
- ✅ Health check endpoints (Required for monitoring)

#### Accounts
- ✅ User accounts (Better Auth managed)
- ✅ 6 User roles (All actively used)
- ✅ Service accounts (All necessary and secured)

### Deactivated/Removed Components

- ❌ FTP/SSH/Telnet - Not exposed
- ❌ Direct database access - Not available
- ❌ Debug/test endpoints - Not in production
- ❌ Default system accounts - Not present
- ❌ Unnecessary integrations - Not configured

## Security Configuration

### Next.js Security Headers

The following security headers are configured in `apps/web/next.config.ts`:

```typescript
{
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()"
}
```

These headers are applied to all routes to enhance security.

### Verification Commands

Quick commands to verify compliance:

```bash
# Count API routes (should be 31)
find apps/web/src/app/api -name "route.ts" | wc -l

# Check for debug endpoints (should be none)
grep -r "debug\|test" apps/web/src/app/api/ || echo "None found"

# Security dependency check
pnpm audit

# Check for hardcoded credentials (should be none)
grep -r "password\|secret\|key" apps/web/src --include="*.ts" --include="*.tsx" | grep -E "=\s*['\"]" || echo "None found"
```

## Review Schedule

| Document | Frequency | Last Review | Next Review |
|----------|-----------|-------------|-------------|
| Main Audit Document | Annually | 2026-02-22 | 2027-02-22 |
| Verification Checklist | Quarterly | 2026-02-22 | 2026-05-22 |

## Responsibilities

### Security Team
- Maintain audit documentation
- Perform quarterly verifications
- Track and remediate findings
- Update security configurations

### Development Team
- Document new services/endpoints
- Follow secure coding practices
- Remove unused components
- Request security review for changes

### Compliance Team
- Review audit documentation
- Approve compliance determinations
- Report to stakeholders
- Coordinate with auditors

## Quick Reference

### Adding a New Service/Endpoint

When adding a new service or API endpoint:

1. **Document Business Justification**
   - Why is this service necessary?
   - What functionality does it provide?
   - Are there alternative approaches?

2. **Security Review**
   - Authentication required?
   - Authorization checks implemented?
   - Rate limiting configured?
   - Input validation present?
   - Error handling secure?

3. **Update Documentation**
   - Add to main audit document
   - Update service inventory
   - Document security controls

4. **Testing**
   - Security testing performed
   - Compliance verified
   - Monitoring configured

### Deactivating a Service/Endpoint

When deactivating a service:

1. **Impact Assessment**
   - What functionality will be lost?
   - Are there dependencies?
   - Who will be affected?

2. **Communication**
   - Notify stakeholders
   - Document reason for removal
   - Plan rollback if needed

3. **Implementation**
   - Remove from codebase
   - Remove from configuration
   - Deploy changes
   - Verify deactivation

4. **Documentation**
   - Update audit document
   - Remove from service inventory
   - Document deactivation date

## Related Documentation

- [SSD Remaining User Stories](../../SSD_REMAINING_USER_STORIES.md) - Other SSD compliance requirements
- [Project README](../../README.md) - Main project documentation
- [Architecture Documentation](../../README.md#architecture) - System architecture overview

## Security Contacts

For security concerns or questions:

- **Security Team:** [To be defined]
- **Technical Lead:** [To be defined]
- **Compliance Officer:** [To be defined]

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-22 | System | Initial creation |

---

**Classification:** Internal Use  
**Distribution:** Development Team, Security Team, Compliance Team
