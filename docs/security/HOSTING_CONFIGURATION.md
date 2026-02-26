# Hosting Configuration Guidelines

**Document Version:** 1.0.0  
**Last Updated:** 2026-02-24  
**SSD Reference:** SSD-4.1.06 - Versleuteling  
**Compliance:** NEN 7510, AVG, BIO

## Overview

This document outlines the hosting configuration guidelines for the Inovy application to meet security requirements as specified in SSD-4 (Veilige Communicatie). The hosting provider (Vercel) is configured according to these guidelines to ensure secure communication, data encryption, and compliance with Dutch healthcare security standards.

## Table of Contents

1. [Hosting Provider Configuration](#hosting-provider-configuration)
2. [Security Headers](#security-headers)
3. [TLS/SSL Configuration](#tlsssl-configuration)
4. [Environment Variables](#environment-variables)
5. [Network Security](#network-security)
6. [Monitoring and Logging](#monitoring-and-logging)
7. [Compliance Requirements](#compliance-requirements)
8. [Verification Procedures](#verification-procedures)
9. [Audit Schedule](#audit-schedule)

---

## Hosting Provider Configuration

### Platform Details

- **Hosting Provider:** Vercel
- **Platform Type:** Serverless Edge Network
- **Region:** Automatic global distribution with primary EU region
- **Compliance:** SOC 2 Type II, ISO 27001, GDPR compliant

### Configuration Files

#### 1. `vercel.json`

Location: `/apps/web/vercel.json`

**Purpose:** Vercel-specific configuration including cron jobs and security headers.

**Key Configurations:**

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), interest-cohort=()"
        }
      ]
    }
  ]
}
```

#### 2. `next.config.ts`

Location: `/apps/web/next.config.ts`

**Purpose:** Next.js configuration including Content Security Policy.

**Key Configurations:**

- Content Security Policy (CSP)
- Runtime configuration
- Server action limits
- External package handling

---

## Security Headers

All HTTP responses include the following security headers to prevent common attacks:

### 1. X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

**Purpose:** Prevents MIME type sniffing attacks.  
**SSD Reference:** SSD-24.1.02

### 2. X-Frame-Options

```
X-Frame-Options: DENY
```

**Purpose:** Prevents clickjacking attacks by disallowing the site to be embedded in frames.  
**SSD Reference:** SSD-24.1.03

### 3. X-XSS-Protection

```
X-XSS-Protection: 1; mode=block
```

**Purpose:** Enables browser XSS filtering and blocks page rendering if attack is detected.

### 4. Strict-Transport-Security (HSTS)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Purpose:** Forces HTTPS connections and includes all subdomains.  
**Max Age:** 1 year (31536000 seconds)  
**SSD Reference:** SSD-24.1.05

### 5. Content-Security-Policy (CSP)

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;
```

**Purpose:** Prevents XSS, injection attacks, and unauthorized resource loading.  
**SSD Reference:** SSD-24.1.04

**Policy Details:**

- `default-src 'self'` - Default to same-origin only
- `script-src` - Allows scripts from self and required analytics
- `style-src` - Allows inline styles (required for CSS-in-JS)
- `img-src` - Allows images from trusted sources and data URIs
- `object-src 'none'` - Blocks plugins (Flash, Java, etc.)
- `frame-ancestors 'none'` - Prevents embedding in iframes
- `upgrade-insecure-requests` - Automatically upgrades HTTP to HTTPS

### 6. Referrer-Policy

```
Referrer-Policy: strict-origin-when-cross-origin
```

**Purpose:** Controls referrer information sent with requests.

### 7. Permissions-Policy

```
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

**Purpose:** Restricts access to sensitive browser features and blocks FLoC tracking.

---

## TLS/SSL Configuration

### Certificate Management

- **Provider:** Vercel automatic SSL
- **Certificate Authority:** Let's Encrypt
- **Renewal:** Automatic, no manual intervention required
- **Protocol:** TLS 1.3 (preferred), TLS 1.2 (minimum)
- **Cipher Suites:** Modern, secure cipher suites only

### HTTPS Enforcement

- **All traffic:** Automatically redirected from HTTP to HTTPS
- **HSTS:** Enabled with 1-year max-age
- **Certificate Transparency:** Monitored via Vercel platform

### Verification

Test SSL configuration at:
- [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)
- [Security Headers](https://securityheaders.com/)

**Expected Grade:** A or A+

---

## Environment Variables

### Sensitive Configuration

All sensitive configuration is stored as environment variables, never in code:

#### Production Environment Variables

**Required Variables:**

```env
# Database
DATABASE_URL=postgresql://[ENCRYPTED_CONNECTION_STRING]

# Redis Cache (Upstash)
UPSTASH_REDIS_REST_URL=[ENCRYPTED_URL]
UPSTASH_REDIS_REST_TOKEN=[ENCRYPTED_TOKEN]

# Authentication
BETTER_AUTH_SECRET=[32_BYTE_RANDOM_STRING]
BETTER_AUTH_URL=https://[PRODUCTION_DOMAIN]
NEXT_PUBLIC_APP_URL=https://[PRODUCTION_DOMAIN]

# AI Services (Encrypted at rest)
OPENAI_API_KEY=[ENCRYPTED_KEY]
ANTHROPIC_API_KEY=[ENCRYPTED_KEY]
DEEPGRAM_API_KEY=[ENCRYPTED_KEY]

# Vector Database
QDRANT_URL=[ENCRYPTED_URL]
QDRANT_API_KEY=[ENCRYPTED_KEY]

# File Storage
BLOB_READ_WRITE_TOKEN=[ENCRYPTED_TOKEN]

# Email
RESEND_API_KEY=[ENCRYPTED_KEY]

# Payment
STRIPE_SECRET_KEY=[ENCRYPTED_KEY]
STRIPE_WEBHOOK_SECRET=[ENCRYPTED_SECRET]
```

### Security Best Practices

1. **Encryption at Rest:** All environment variables are encrypted by Vercel
2. **Access Control:** Limited to authorized team members only
3. **Rotation Policy:** Credentials rotated quarterly or after incidents
4. **Audit Logging:** All access to environment variables is logged
5. **No Client Exposure:** Sensitive variables never exposed to client-side code

---

## Network Security

### Firewall Configuration

- **Edge Network:** Vercel Edge Network with DDoS protection
- **Rate Limiting:** Implemented at application layer
- **IP Restrictions:** Can be configured for admin routes if needed
- **Geo-blocking:** Available through Vercel Enterprise (if required)

### Database Security

#### PostgreSQL (Neon)

- **Connection:** SSL/TLS encrypted connections only
- **Access:** Private endpoints, no public access
- **Authentication:** Certificate-based authentication
- **IP Allowlist:** Configured to allow only Vercel IP ranges

#### Redis (Upstash)

- **Connection:** TLS encrypted REST API
- **Authentication:** Token-based authentication
- **Access:** Restricted to application only

#### Vector Database (Qdrant Cloud)

- **Connection:** HTTPS encrypted API
- **Authentication:** API key authentication
- **Access:** Restricted to application servers

### API Security

- **CORS:** Configured with explicit origins
- **Rate Limiting:** Tier-based rate limiting implemented
- **Authentication:** Required for all protected endpoints
- **Authorization:** Role-based access control (RBAC)

---

## Monitoring and Logging

### Vercel Analytics

- **Real User Monitoring (RUM):** Enabled
- **Web Vitals:** Tracked continuously
- **Error Tracking:** Automatic error reporting
- **Performance:** Core Web Vitals monitoring

### Application Logging

- **Structured Logging:** Pino logger with JSON format
- **Log Levels:** ERROR, WARN, INFO, DEBUG
- **Sensitive Data:** Never logged (credentials, tokens, PII)
- **Retention:** 30 days (production), 7 days (development)

### Security Monitoring

**Monitored Events:**

1. Failed authentication attempts
2. Authorization failures
3. Unusual API access patterns
4. Rate limit violations
5. Database connection failures
6. SSL/TLS certificate expiration
7. Security header violations

**Alerting:**

- Immediate alerts for critical security events
- Daily digest for non-critical events
- Weekly security reports

---

## Compliance Requirements

### NEN 7510 (Healthcare Information Security)

**Applicable Controls:**

- **Access Control:** Implemented via Better Auth and RBAC
- **Encryption:** TLS 1.3 for data in transit, AES-256 at rest
- **Audit Logging:** Comprehensive audit trail maintained
- **Incident Response:** Documented procedures in place

### AVG/GDPR

**Compliance Measures:**

- **Data Minimization:** Only necessary data collected
- **Purpose Limitation:** Data used only for stated purposes
- **Storage Limitation:** Retention policies enforced
- **Data Subject Rights:** Export and deletion capabilities
- **Privacy by Design:** Built into architecture

### BIO (Baseline Informatiebeveiliging Overheid)

**Relevant Measures:**

- **Cryptographic Controls:** Modern encryption standards
- **Access Management:** Strong authentication and authorization
- **Network Security:** Secure network architecture
- **Logging and Monitoring:** Comprehensive logging

---

## Verification Procedures

### Post-Deployment Verification

**Automated Checks:** (see `scripts/verify-hosting-config.ts`)

1. Security headers verification
2. SSL/TLS configuration check
3. Environment variables validation
4. API endpoint authentication
5. CORS configuration
6. Rate limiting functionality

**Manual Checks:**

1. SSL certificate validity (SSL Labs)
2. Security headers score (securityheaders.com)
3. Performance metrics (Vercel Analytics)
4. Error rates and logs
5. Database connectivity
6. Third-party service integrations

### Verification Schedule

- **Post-deployment:** Immediate verification after each deployment
- **Weekly:** Automated security header checks
- **Monthly:** Full security audit
- **Quarterly:** External security assessment

---

## Audit Schedule

### Regular Configuration Audits

#### Weekly Audits

- [ ] Security headers verification
- [ ] SSL certificate expiration check
- [ ] Error rate monitoring
- [ ] Performance metrics review

#### Monthly Audits

- [ ] Environment variable review
- [ ] Access control verification
- [ ] Dependency security scan
- [ ] Log analysis for security events
- [ ] Rate limiting effectiveness
- [ ] API authentication checks

#### Quarterly Audits

- [ ] Full security configuration review
- [ ] Penetration testing consideration
- [ ] Incident response plan review
- [ ] Disaster recovery testing
- [ ] Compliance documentation update
- [ ] Third-party security assessments
- [ ] Credential rotation
- [ ] Team access review

#### Annual Audits

- [ ] Complete security audit
- [ ] External security assessment
- [ ] Compliance certification renewal
- [ ] Architecture review
- [ ] Security training refresh
- [ ] Documentation review and update

### Audit Documentation

All audits must be documented with:

1. **Date and time** of audit
2. **Auditor name(s)**
3. **Findings** (passed/failed checks)
4. **Issues identified** (if any)
5. **Remediation actions** (if required)
6. **Sign-off** by security officer

**Audit Log Location:** `/docs/security/audits/`

---

## Change Management

### Configuration Change Process

1. **Request:** Document the change requirement
2. **Review:** Security team reviews the change
3. **Testing:** Test in development/staging environment
4. **Approval:** Get approval from security officer
5. **Implementation:** Apply change in production
6. **Verification:** Run post-deployment verification
7. **Documentation:** Update this document

### Emergency Changes

For critical security patches:

1. Immediate implementation authorized
2. Follow-up review within 24 hours
3. Documentation updated within 48 hours

---

## References

### Internal Documentation

- [Security Architecture](./SECURITY_ARCHITECTURE.md)
- [Incident Response Plan](./INCIDENT_RESPONSE.md)
- [Disaster Recovery Plan](./DISASTER_RECOVERY.md)

### External Resources

- [Vercel Security Documentation](https://vercel.com/docs/security)
- [NEN 7510 Standard](https://www.nen.nl/en/nen-7510-2017-nl-250999)
- [OWASP Security Headers](https://owasp.org/www-project-secure-headers/)
- [Mozilla Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)

### Compliance Standards

- **NEN 7510:2017** - Information security in healthcare
- **AVG/GDPR** - General Data Protection Regulation
- **BIO** - Baseline Informatiebeveiliging Overheid
- **ISO 27001** - Information Security Management

---

## Document Control

### Version History

| Version | Date       | Author | Changes                |
| ------- | ---------- | ------ | ---------------------- |
| 1.0.0   | 2026-02-24 | System | Initial documentation  |

### Review Schedule

- **Next Review Date:** 2026-05-24 (3 months)
- **Review Frequency:** Quarterly
- **Document Owner:** Security Team
- **Approval Required:** Yes (Security Officer)

### Approval

**Approved by:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_  
**Title:** Security Officer  
**Date:** \_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_\_

---

## Appendix A: Security Header Testing

### Testing Tools

```bash
# Test security headers
curl -I https://[your-domain]

# Test SSL configuration
openssl s_client -connect [your-domain]:443 -tls1_3

# Test HSTS preload eligibility
# Visit: https://hstspreload.org/
```

### Expected Results

All security headers should be present in HTTP responses. Any missing headers should be reported and addressed immediately.

---

## Appendix B: Incident Response Contacts

### Security Contacts

- **Security Team:** security@[your-domain]
- **Vercel Support:** vercel.com/support
- **Emergency Hotline:** [TBD]

### Escalation Path

1. On-call engineer
2. Security officer
3. CTO/CISO
4. CEO (for major incidents)

---

**END OF DOCUMENT**
