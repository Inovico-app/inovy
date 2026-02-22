# ICT Component Hardening Policy

**Document Version:** 1.0  
**Last Updated:** 2026-02-22  
**Classification:** Internal  
**SSD Reference:** SSD-1.1.01 - Hardeningsbeleid

## 1. Purpose

This document establishes the hardening policies for all ICT components within the Inovy platform to ensure a secure baseline configuration that meets security best practices and compliance requirements, including NEN 7510, AVG/GDPR, and Dutch government security standards.

## 2. Scope

This policy applies to all ICT components including:

- Application Layer (Frontend & Backend)
- Runtime Environment
- Infrastructure and Platform Services
- Database Systems
- Third-party Services and Dependencies
- Development and CI/CD Pipeline

## 3. Policy Overview

All ICT components must be hardened according to industry best practices and security benchmarks. Hardening reduces the attack surface by:

- Disabling unnecessary services and features
- Applying security configurations
- Implementing least privilege principles
- Enforcing secure communication protocols
- Maintaining current security patches

## 4. Component-Specific Hardening Requirements

### 4.1 Application Layer

#### 4.1.1 Next.js Application Hardening

**Security Headers:**
```typescript
// Implemented in next.config.ts
- Content-Security-Policy (CSP)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy
- Strict-Transport-Security (HSTS)
```

**Configuration Requirements:**
- React Server Components (RSC) by default to minimize client-side code
- Minimal use of `'use client'` directives
- Server Actions secured with `next-safe-action` library
- All API routes must implement authentication and authorization
- Environment variables validated with Zod schemas
- No sensitive data exposed in client-side code
- Disable source maps in production builds
- Enable React Strict Mode
- Use React Compiler for automatic optimizations

**API Security:**
- Rate limiting implemented per tier (Free, Pro, Enterprise)
- Request validation using Zod schemas
- CORS policies strictly configured
- All endpoints require authentication unless explicitly public
- Input sanitization for all user-provided data
- Output encoding to prevent XSS

#### 4.1.2 TypeScript & Code Quality

**Requirements:**
- TypeScript strict mode enabled
- No `any` types without explicit justification
- ESLint with security rules enabled
- Pre-commit hooks for linting and type checking
- Regular security-focused code reviews
- Automated vulnerability scanning of code

### 4.2 Runtime Environment

#### 4.2.1 Node.js Hardening

**Version Management:**
- Node.js version: ≥20.9.0 (defined in package.json engines)
- Use only LTS (Long Term Support) versions
- Update to latest LTS within 30 days of release

**Configuration:**
```json
// package.json engines
{
  "engines": {
    "node": ">=20.9.0"
  }
}
```

**Security Practices:**
- `NODE_ENV=production` in production
- No development dependencies in production builds
- Limited process permissions (principle of least privilege)
- Secure environment variable management
- No secrets in code or version control

#### 4.2.2 Package Management

**pnpm Configuration:**
- Lock file (`pnpm-lock.yaml`) must be committed
- `--frozen-lockfile` flag for production installs
- Regular dependency audits with `pnpm audit`
- Automatic vulnerability detection via Dependabot
- Only trusted package registries (npmjs.com)

**Dependency Security:**
```bash
# Regular audit command
pnpm audit --production

# Update dependencies with security fixes
pnpm update --latest
```

### 4.3 Infrastructure & Platform Services

#### 4.3.1 Vercel Platform Hardening

**Vercel handles infrastructure-level hardening including:**
- Automatic SSL/TLS certificate management
- DDoS protection
- Edge network security
- Infrastructure patching and updates
- WAF (Web Application Firewall) protection
- Automatic security headers injection
- Bot protection

**Configuration Requirements:**
- Environment variables stored in Vercel dashboard (encrypted at rest)
- Production environment protection enabled
- Deployment protection rules configured
- Custom domain with DNSSEC enabled
- Security logs retention enabled

#### 4.3.2 Edge Functions Security

**Requirements:**
- Timeout limits configured (max 25 seconds for Hobby, 5 minutes for Pro)
- Memory limits enforced
- No sensitive data in edge function logs
- Rate limiting per user/IP
- Execution context isolation

### 4.4 Database Systems

#### 4.4.1 PostgreSQL (Neon) Hardening

**Connection Security:**
- TLS/SSL required for all connections
- Connection pooling with secure credentials
- Database URL stored as encrypted environment variable
- Connection string with `sslmode=require` parameter
- IP allowlisting where applicable

**Access Control:**
- Principle of least privilege for database users
- Separate read/write credentials where applicable
- Database-level row security policies (RLS) for multi-tenancy
- All queries use parameterized statements (via Drizzle ORM)
- No raw SQL with user input without validation

**Configuration:**
```typescript
// Drizzle ORM configuration
- Use prepared statements
- Type-safe queries
- SQL injection prevention via parameterization
- Transaction management with rollback on error
```

#### 4.4.2 Redis (Upstash) Hardening

**Security Measures:**
- TLS-encrypted connections
- REST API with authentication tokens
- Token rotation policy (every 90 days)
- Key namespacing for isolation (`inovy:*`)
- TTL (Time To Live) set for all cached data
- No sensitive data stored without encryption
- Rate limiting on Redis operations

**Access Patterns:**
```typescript
// Secure Redis patterns
- Prefix all keys with application namespace
- Set explicit TTL for all keys
- Use Redis ACLs if available
- Monitor for unusual access patterns
```

#### 4.4.3 Qdrant Vector Database Hardening

**Security Configuration:**
- API key authentication required
- HTTPS-only connections to cloud instance
- Collection-level access control
- Organization-scoped data isolation
- Regular backup snapshots
- Encryption at rest (handled by Qdrant Cloud)
- Encryption in transit (TLS 1.3)

**Data Protection:**
```typescript
// Qdrant security practices
- Metadata filtering for organization isolation
- No PII in vector embeddings without anonymization
- Regular collection optimization
- Access logging enabled
```

### 4.5 Third-Party Services Hardening

#### 4.5.1 Authentication (Better Auth)

**Security Requirements:**
- Bcrypt password hashing with salt
- Session tokens cryptographically secure
- CSRF protection enabled
- OAuth 2.0 with PKCE flow
- Passkey/WebAuthn support
- Magic link with time-limited tokens
- Session expiration configured (7 days default)
- Refresh token rotation
- Account lockout after failed login attempts (configurable)

**Configuration:**
```typescript
// Better Auth security settings
- BETTER_AUTH_SECRET: 256-bit random key
- Secure session cookies (httpOnly, secure, sameSite)
- Email verification required
- Organization invitation token expiration
```

#### 4.5.2 AI Services Hardening

**OpenAI API:**
- API keys stored as environment variables (encrypted)
- Key rotation every 90 days
- Request logging for audit trail
- Rate limiting per organization tier
- Error messages sanitized (no API key leakage)
- Content filtering enabled
- Usage monitoring and alerting

**Anthropic API:**
- Similar security measures as OpenAI
- Separate API key from OpenAI
- Fallback model configuration

**Deepgram API:**
- Secure WebSocket connections (wss://)
- API key rotation policy
- Audio data transmission over TLS
- Temporary storage only for processing
- Automatic deletion after transcription

#### 4.5.3 File Storage (Vercel Blob)

**Security Measures:**
- Token-based authentication
- Pre-signed URLs with expiration
- File type validation (allow-list approach)
- File size limits enforced (max 50MB)
- Malware scanning for uploaded files
- Access logging
- No public read access by default
- Content-Disposition headers set

**Configuration:**
```typescript
// Blob storage security
- Token stored as environment variable
- Client upload with server-side validation
- Unique file identifiers (nanoid)
- Metadata stored separately in database
```

#### 4.5.4 Email Service (Resend)

**Security Requirements:**
- API key stored securely
- SPF, DKIM, DMARC configured for domain
- Email rate limiting
- Template sanitization (XSS prevention)
- No sensitive data in email content without encryption
- Unsubscribe links for marketing emails
- Audit logging of all sent emails

#### 4.5.5 Payment Processing (Stripe)

**Security Measures:**
- PCI DSS compliance (Stripe handles card data)
- Webhook signature verification required
- Publishable vs. secret key separation
- Test mode for development
- Production keys stored as environment variables
- Idempotency keys for duplicate prevention
- Customer data minimization
- Regular reconciliation of transactions

#### 4.5.6 OAuth Integrations (Google, Microsoft)

**Security Requirements:**
- OAuth 2.0 with authorization code flow
- PKCE (Proof Key for Code Exchange) enabled
- State parameter for CSRF protection
- Token encryption at rest
- Automatic token refresh
- Token revocation on user logout
- Scope minimization (least privilege)
- Consent screen review

**Token Management:**
```typescript
// OAuth token security
- Access tokens: short-lived (1 hour)
- Refresh tokens: stored encrypted
- Token rotation on refresh
- Revocation on suspicious activity
```

### 4.6 Development & CI/CD Pipeline Hardening

#### 4.6.1 Version Control (Git/GitHub)

**Security Requirements:**
- Branch protection rules for `main` branch:
  - Require pull request reviews (minimum 1)
  - Require status checks to pass
  - Require up-to-date branches
  - Restrict force pushes
  - Restrict deletions
- Signed commits encouraged (GPG/SSH)
- No secrets committed to repository
- `.gitignore` properly configured
- Secret scanning enabled (GitHub)
- Dependabot security updates enabled
- Code scanning (CodeQL) enabled

#### 4.6.2 CI/CD Security (GitHub Actions)

**Workflow Hardening:**
```yaml
# Security measures in workflows
- Minimal permissions (GITHUB_TOKEN)
- Secrets stored in GitHub Secrets (encrypted)
- No secrets in logs
- Dependency caching with integrity checks
- Locked action versions (e.g., actions/checkout@v4)
- OIDC for cloud deployments (no long-lived credentials)
```

**Required Checks:**
- TypeScript type checking
- ESLint security rules
- Dependency vulnerability scanning
- License compliance check
- Build success verification
- Database migration dry-run

#### 4.6.3 Development Environment

**Security Practices:**
- `.env.local` for local secrets (not committed)
- `.env.example` with dummy values (committed)
- Local HTTPS for development (when needed)
- Separate development and production databases
- Mock external services in tests
- No production credentials on developer machines

## 5. Network Security

### 5.1 Transport Layer Security

**Requirements:**
- TLS 1.3 preferred, TLS 1.2 minimum
- Strong cipher suites only
- Perfect Forward Secrecy (PFS)
- HSTS header with max-age=31536000
- Certificate transparency monitoring
- Automatic certificate renewal

### 5.2 API Communication

**Security Measures:**
- HTTPS for all external API calls
- API authentication tokens transmitted securely
- No credentials in URL parameters
- Mutual TLS (mTLS) for sensitive integrations (if applicable)

## 6. Logging & Monitoring

### 6.1 Security Logging

**Requirements:**
- All authentication events logged (login, logout, failures)
- All authorization failures logged
- All data access logged (audit trail)
- All configuration changes logged
- Sensitive data excluded from logs (passwords, tokens, PII)
- Log retention: minimum 1 year (compliance requirement)

**Logging Implementation:**
```typescript
// Pino structured logging
- Log level: INFO in production
- Separate error log stream
- Log aggregation (Vercel Logs)
- Alerting on critical errors
- Log sanitization (no secrets)
```

### 6.2 Security Monitoring

**Monitoring Requirements:**
- Uptime monitoring (status page)
- Error rate monitoring
- Security event alerting
- Anomaly detection for:
  - Failed login attempts
  - Unusual API usage
  - Large data exports
  - Permission escalation attempts
- Performance monitoring (Web Vitals)

## 7. Incident Response

### 7.1 Security Incident Handling

**Process:**
1. **Detection** - via monitoring, alerts, or user reports
2. **Containment** - isolate affected systems/users
3. **Investigation** - analyze logs, determine scope
4. **Remediation** - apply fixes, patch vulnerabilities
5. **Recovery** - restore normal operations
6. **Post-incident** - document lessons learned, update policies

### 7.2 Vulnerability Disclosure

**Responsible Disclosure Policy:**
- Security contact email: security@inovy.io (to be configured)
- Response SLA: 48 hours for initial acknowledgment
- Coordinated disclosure timeline
- Recognition for security researchers (hall of fame)

## 8. Compliance & Audit

### 8.1 Regular Security Audits

**Audit Schedule:**
- **Monthly**: Dependency vulnerability scan
- **Quarterly**: Configuration review
- **Annually**: Comprehensive security assessment
- **Ad-hoc**: After significant changes or incidents

### 8.2 Compliance Verification

**Verification Activities:**
- Automated compliance checks in CI/CD
- Manual security checklist review
- Penetration testing (annual)
- Code security review (per release)
- Third-party security audit (annual)

### 8.3 Documentation Requirements

**Mandatory Documentation:**
- This hardening policy (current document)
- Patching procedures (separate document)
- Incident response playbook
- Access control matrix
- Data flow diagrams
- Risk assessment (DPIA)
- Audit logs and reports

## 9. Training & Awareness

### 9.1 Security Training

**Requirements:**
- Security awareness training for all team members (annual)
- Secure coding training for developers (semi-annual)
- Incident response training for operations team
- Phishing awareness training (quarterly)

### 9.2 Security Champions

**Program:**
- Designated security champion per team
- Regular security discussions in team meetings
- Security newsletter with latest threats and best practices
- Bug bounty program consideration

## 10. Policy Maintenance

### 10.1 Policy Review

**Review Schedule:**
- **Quarterly**: Minor updates for new technologies
- **Annually**: Major review and approval
- **Ad-hoc**: After security incidents or major changes

### 10.2 Policy Ownership

**Responsibilities:**
- **Policy Owner**: Security Engineer / CTO
- **Approval Authority**: Management / CISO
- **Implementation**: Development Team
- **Audit**: Internal Audit / External Auditor

## 11. Enforcement

### 11.1 Compliance Monitoring

**Automated Checks:**
- CI/CD pipeline security gates
- Dependency vulnerability scanning (Dependabot)
- Code quality and security linting (ESLint)
- Infrastructure as Code (IaC) security scanning

**Manual Reviews:**
- Code review checklist includes security items
- Architecture review for new features
- Third-party risk assessment before integration

### 11.2 Non-Compliance

**Consequences:**
- Build failure if security checks fail
- Deployment blocked until remediation
- Incident investigation for policy violations
- Escalation to management for repeated violations

## 12. References

### 12.1 Internal Documentation

- [Patching Procedures](./PATCHING_PROCEDURES.md)
- [Compliance Verification](./COMPLIANCE_VERIFICATION.md)
- [Security Checklist](./SECURITY_CHECKLIST.md)

### 12.2 External Standards

- **NEN 7510**: Information security in healthcare
- **NEN 7512**: Audit logging in healthcare
- **NEN 7513**: Access control in healthcare
- **AVG/GDPR**: General Data Protection Regulation
- **ISO 27001**: Information Security Management
- **OWASP Top 10**: Web application security risks
- **CIS Benchmarks**: Security configuration guidelines
- **NIS2**: EU Cybersecurity Directive

### 12.3 Technology-Specific Guidelines

- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Vercel Security Documentation](https://vercel.com/docs/security)

---

**Document Control:**
- **Created**: 2026-02-22
- **Version**: 1.0
- **Next Review**: 2026-05-22 (Quarterly)
- **Approved By**: [To be completed]
- **Approval Date**: [To be completed]
