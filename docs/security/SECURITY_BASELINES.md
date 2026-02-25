# Security Baselines and Hardening Guidelines

**Document Version:** 1.0  
**Last Updated:** 2026-02-24  
**Owner:** Security Engineering Team  

## Purpose

This document defines the security baselines and hardening guidelines that the Inovy application must follow to ensure compliance with Dutch and European security standards for healthcare applications.

---

## Applicable Standards

### Primary Standards

#### 1. BIO (Baseline Informatiebeveiliging Overheid)

**Version:** 1.04  
**Applicability:** All government-related systems and suppliers  
**Website:** [https://www.bio-overheid.nl/](https://www.bio-overheid.nl/)

The BIO is the Dutch government's baseline information security standard, providing comprehensive security controls across:

- Access control and authentication
- Cryptography and data protection
- Network security
- System hardening
- Logging and monitoring
- Incident management

#### 2. NEN 7510

**Version:** 2017  
**Applicability:** Healthcare information systems  
**Standard Type:** Dutch healthcare information security standard based on ISO 27001

NEN 7510 provides healthcare-specific security requirements including:

- Patient data protection
- Medical record confidentiality
- Healthcare provider authentication
- Audit logging for medical data access
- Business continuity for healthcare services

#### 3. AVG/GDPR

**Applicability:** All systems processing personal data  
**Compliance Required:** Yes (legal requirement)

Privacy and data protection requirements for:

- Lawful processing of personal data
- Data subject rights (access, erasure, portability)
- Privacy by design and default
- Data breach notification
- Data Protection Impact Assessments (DPIA)

### Supporting Standards

#### OWASP Top 10

**Version:** 2021  
**Website:** [https://owasp.org/Top10/](https://owasp.org/Top10/)

Web application security risks and countermeasures:

1. Broken Access Control
2. Cryptographic Failures
3. Injection
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable and Outdated Components
7. Identification and Authentication Failures
8. Software and Data Integrity Failures
9. Security Logging and Monitoring Failures
10. Server-Side Request Forgery (SSRF)

#### CIS Benchmarks

**Applicability:** Infrastructure hardening  
**Website:** [https://www.cisecurity.org/cis-benchmarks](https://www.cisecurity.org/cis-benchmarks)

Security configuration baselines for:

- Operating systems (Linux, Windows)
- Cloud platforms (Azure, AWS)
- Databases (PostgreSQL, Redis)
- Web servers and application servers
- Container platforms (Docker, Kubernetes)

#### NIST Cybersecurity Framework

**Version:** 2.0  
**Applicability:** Overall security program structure  
**Website:** [https://www.nist.gov/cyberframework](https://www.nist.gov/cyberframework)

Framework categories:

- **Identify:** Asset management, risk assessment
- **Protect:** Access control, data security, training
- **Detect:** Monitoring, anomaly detection
- **Respond:** Incident response, communications
- **Recover:** Recovery planning, improvements

---

## Hardening Guidelines by Component

### 1. Application Security (Next.js / React)

#### Authentication & Authorization

**Requirement:** Implement secure authentication with multi-factor support

**Implementation:**

- Better Auth with OAuth, passkey, and magic link support
- Session management with secure cookies
- Role-based access control (RBAC)
- Organization-level data isolation

**Standards:** BIO-9.2, NEN 7510-A.9.2, OWASP A07

#### Secure Headers

**Requirement:** Configure comprehensive security headers

**Implementation:**

```typescript
// Required security headers
{
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': '[See CSP policy]',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
}
```

**Standards:** BIO-11.2, OWASP A05, CIS Web Server Benchmarks

#### Input Validation

**Requirement:** Validate all user input server-side

**Implementation:**

- Zod schemas for all server actions
- Type-safe validation with TypeScript
- Sanitization of user-generated content
- Protection against injection attacks

**Standards:** OWASP A03, BIO-14.2

#### Error Handling

**Requirement:** Secure error handling without information disclosure

**Implementation:**

- Generic error messages to users
- Detailed logging server-side
- No stack traces in production
- Structured error handling with neverthrow

**Standards:** OWASP A05, BIO-12.4

### 2. Database Security (PostgreSQL)

#### Encryption

**Requirement:** Encryption at rest and in transit

**Implementation:**

- TLS for all database connections
- Database-level encryption (Neon provider)
- Encrypted backups
- Secure credential management

**Standards:** BIO-10.1, NEN 7510-A.10.1, GDPR Art. 32

#### Access Control

**Requirement:** Least privilege database access

**Implementation:**

- Separate database users per environment
- Read-only replicas for reporting
- Connection pooling with limits
- Organization-level row-level security

**Standards:** BIO-9.1, NEN 7510-A.9.1

#### Audit Logging

**Requirement:** Log all data access and modifications

**Implementation:**

- Audit log table with immutable records
- User actions tracked with timestamps
- GDPR-compliant audit trails
- Retention policy compliance

**Standards:** NEN 7510-A.12.4, GDPR Art. 30

### 3. Infrastructure Security

#### Network Security

**Requirement:** Secure network communications

**Implementation:**

- TLS 1.3 for all external communications
- HTTPS only (HSTS enforced)
- Certificate validation in production
- Secure DNS configuration

**Standards:** BIO-11.2, CIS Network Security

#### Secrets Management

**Requirement:** Secure storage and access to secrets

**Implementation:**

- Environment variables for secrets
- No secrets in code or Git
- Vercel/cloud provider secret management
- Rotation policy for credentials

**Standards:** BIO-9.3, OWASP A07

#### Dependency Management

**Requirement:** Keep dependencies updated and vulnerability-free

**Implementation:**

- Automated dependency updates (Dependabot)
- npm audit in CI/CD pipeline
- Regular security updates
- Vulnerability scanning

**Standards:** OWASP A06, BIO-12.6

### 4. Caching & Session Security (Redis)

#### Transport Security

**Requirement:** TLS for Redis connections

**Implementation:**

- TLS enabled for all Redis connections
- Certificate validation in production
- Secure credentials (Upstash)
- No sensitive data cached without encryption

**Standards:** BIO-11.2

**Deviation:** DEV-2026-EXAMPLE (Development environments only)

#### Session Management

**Requirement:** Secure session handling

**Implementation:**

- HttpOnly, Secure, SameSite cookies
- Session expiration and rotation
- Better Auth session management
- Redis-backed session storage

**Standards:** OWASP A07, BIO-9.3

### 5. API Security

#### Rate Limiting

**Requirement:** Protect APIs from abuse

**Implementation:**

- Tier-based rate limiting
- Per-user and per-IP limits
- Graceful degradation
- Monitoring and alerting

**Standards:** OWASP A04, BIO-13.1

#### Authentication

**Requirement:** Secure API authentication

**Implementation:**

- Session-based authentication
- CORS configuration
- CSRF protection
- API key rotation

**Standards:** OWASP A07, BIO-9.2

### 6. Third-Party Services

#### Vendor Security Assessment

**Requirement:** Evaluate security of third-party services

**Implementation:**

- SOC 2 compliance verification
- Security questionnaires
- Data processing agreements
- Regular vendor reviews

**Standards:** BIO-15.1, NEN 7510-A.15.1, GDPR Art. 28

#### Service Hardening

**Current Third-Party Services:**

| Service | Purpose | Security Posture | Compliance |
|---------|---------|------------------|------------|
| Neon | PostgreSQL database | SOC 2 Type II | ✅ Compliant |
| Upstash | Redis caching | SOC 2 Type II | ✅ Compliant |
| Vercel | Hosting platform | SOC 2, ISO 27001 | ✅ Compliant |
| OpenAI | AI processing | SOC 2 Type II | ✅ Compliant |
| Deepgram | Transcription | SOC 2 Type II | ✅ Compliant |
| Qdrant | Vector database | SOC 2 (cloud) | ✅ Compliant |

---

## Hardening Checklists

### New Component Checklist

When adding a new component, verify:

- [ ] TLS/encryption enabled for all network communications
- [ ] Secure authentication and authorization implemented
- [ ] Input validation and sanitization in place
- [ ] Secure error handling (no information disclosure)
- [ ] Logging and monitoring configured
- [ ] Security headers configured (if web-facing)
- [ ] Rate limiting applied (if API)
- [ ] Secrets properly managed (no hardcoded credentials)
- [ ] Dependencies are up-to-date and vulnerability-free
- [ ] Third-party security verified (if applicable)
- [ ] Documentation includes security considerations
- [ ] Code review includes security review
- [ ] Compliance with applicable standards verified
- [ ] Deviations documented if any guideline cannot be met

### Production Deployment Checklist

Before deploying to production:

- [ ] All security requirements met or deviations approved
- [ ] No critical or high vulnerabilities in dependencies
- [ ] Security testing performed (SAST, DAST if applicable)
- [ ] Secrets configured in production environment
- [ ] Monitoring and alerting configured
- [ ] Audit logging enabled
- [ ] Backup and recovery tested
- [ ] Incident response procedures documented
- [ ] Security review sign-off obtained
- [ ] Compliance documentation updated

---

## Deviation Process

When a hardening guideline cannot be met, follow the formal deviation process:

**See:** [docs/security/HARDENING_DEVIATION_PROCESS.md](./HARDENING_DEVIATION_PROCESS.md)

**Quick Steps:**

1. Document the deviation using the template
2. Perform risk assessment
3. Submit PR with `security/hardening-deviation` label
4. Obtain required approvals based on risk level
5. Update the hardening deviations registry
6. Schedule periodic review

---

## Security Training and Awareness

### Required Training

All team members must complete:

- Secure coding practices training
- OWASP Top 10 awareness
- Privacy and GDPR fundamentals
- Incident response procedures
- Security baseline overview (this document)

### Resources

- **Internal:** Security wiki, deviation process documentation
- **External:** OWASP resources, vendor security documentation
- **Training Platforms:** [To be defined]

---

## Continuous Improvement

### Security Metrics

Track and improve:

- Time to remediate vulnerabilities
- Number of security issues in code review
- Compliance audit findings
- Deviation trend analysis
- Security training completion rates

### Regular Updates

This document is reviewed and updated:

- Quarterly for general updates
- Immediately when standards change
- After security incidents
- Following compliance audits

---

## References and Resources

### Internal Documentation

- [Hardening Deviation Process](./HARDENING_DEVIATION_PROCESS.md)
- [Hardening Deviations Registry](./HARDENING_DEVIATIONS_REGISTRY.md)
- [Security Incident Response Plan](./INCIDENT_RESPONSE_PLAN.md) *(to be created)*
- Application README: [/workspace/README.md](../../README.md)

### External Standards

- **BIO:** https://www.bio-overheid.nl/
- **NEN 7510:** https://www.nen.nl/nen-7510-2017-nl-248879
- **OWASP:** https://owasp.org/
- **CIS Benchmarks:** https://www.cisecurity.org/cis-benchmarks
- **NIST CSF:** https://www.nist.gov/cyberframework
- **GDPR:** https://gdpr.eu/

---

**Document Owner:** Security Engineering Team  
**Approved By:** [Name], Security Lead  
**Approval Date:** 2026-02-24  
**Next Review:** 2026-05-24
