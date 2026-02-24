# Security Policy

**Version:** 1.0  
**Last Updated:** February 24, 2026  
**Application:** Inovy - AI-Powered Meeting Recording & Management Platform

## Table of Contents

1. [Overview](#overview)
2. [Supply Chain Security](#supply-chain-security)
3. [Security Standards Compliance](#security-standards-compliance)
4. [Reporting Security Issues](#reporting-security-issues)
5. [Security Measures](#security-measures)
6. [Dependency Management](#dependency-management)

## Overview

Inovy is designed for healthcare organizations and must comply with strict Dutch and European security standards. This document outlines our security policies, practices, and procedures.

### Applicable Standards

- **NEN 7510**: Dutch healthcare information security standard
- **BIO**: Baseline Informatiebeveiliging Overheid (Government Information Security Baseline)
- **AVG/GDPR**: General Data Protection Regulation
- **ISO 27001**: Information security management
- **MDR**: Medical Device Regulation (if applicable)

## Supply Chain Security

### SSD-3.1.01: External Component Verification

Inovy implements comprehensive supply chain security measures to verify the origin and safety of all external components.

#### Dependency Lifecycle Management

We maintain a complete **[Dependency Lifecycle Management Plan](./DEPENDENCY_LIFECYCLE.md)** that covers:

- **Selection Criteria**: Rigorous vetting before adding dependencies
- **Origin Verification**: Cryptographic verification of all packages
- **Security Assessment**: Continuous vulnerability scanning
- **Update Management**: Structured update and patching processes
- **Monitoring**: Automated and manual security monitoring

#### Key Security Measures

1. **Package Registry Verification**
   - All dependencies from official npm registry
   - Integrity hashes (SHA-512) for every package
   - Verified publishers with two-factor authentication

2. **Automated Security Scanning**
   - GitHub Dependabot for vulnerability detection
   - CI/CD security pipeline on every push
   - Weekly automated security audits
   - Immediate alerts for critical vulnerabilities

3. **Lockfile Management**
   - `pnpm-lock.yaml` committed and protected
   - Frozen lockfile installations in CI/CD
   - Manual review of all lockfile changes
   - No git or local file dependencies in production

4. **Update Strategy**
   - Security patches: <24 hours for critical issues
   - Minor updates: Weekly review cycle
   - Major updates: Monthly planning and testing
   - Automated Dependabot PRs for security issues

#### Security Scanning Pipeline

Our CI/CD pipeline includes:

```yaml
Security Scan (on every push):
├── Dependency Audit (pnpm audit)
├── License Compliance Check
├── Lockfile Integrity Verification
├── Outdated Dependency Report
├── Dependency Review (PRs only)
└── SBOM Generation (main branch)
```

**Merge Blocking:**
- Critical vulnerabilities: ❌ Blocks merge
- High vulnerabilities: ❌ Blocks merge
- Prohibited licenses: ❌ Blocks merge
- Lockfile inconsistencies: ❌ Blocks merge

See our **[Security Scanning Workflow](.github/workflows/security-scan.yml)** for implementation details.

## Security Standards Compliance

### NEN 7510 (Healthcare Information Security)

Inovy implements security controls aligned with NEN 7510:

#### Access Control (12.1)
- Role-Based Access Control (RBAC)
- Organization-level data isolation
- Multi-factor authentication support
- Session management with secure cookies
- Audit logging for all access

#### Cryptographic Controls (12.3)
- TLS 1.3 for all data in transit
- AES-256 encryption for sensitive data at rest
- Secure key management
- HTTPS-only in production

#### Secure Development (14.2)
- Security-by-design principles
- Code review requirements
- Automated security testing
- Dependency lifecycle management (this document)

#### Software Management (12.6)
- Structured update process
- Vulnerability management program
- Change control procedures
- Configuration management

### BIO Compliance

Baseline Informatiebeveiliging Overheid requirements:

- **U.01.1**: Secure software development lifecycle
- **U.05.1**: Supplier security requirements
- **U.12.1**: Technical vulnerability management
- **U.13.1**: Software installation and maintenance

### GDPR/AVG Compliance

Privacy-by-design measures:

- Data minimization
- Purpose limitation
- Storage limitation
- Encryption and pseudonymization
- Data portability
- Right to erasure
- Privacy impact assessments (DPIA)

## Reporting Security Issues

### Responsible Disclosure

If you discover a security vulnerability in Inovy:

1. **DO NOT** create a public GitHub issue
2. **DO NOT** disclose the vulnerability publicly
3. **DO** email security@[company-domain] with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if available)

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 48 hours
- **Status Update**: Within 1 week
- **Resolution**: Based on severity (see below)

### Severity Response Times

| Severity | Description | Response Time |
|----------|-------------|---------------|
| **Critical** | System compromise, data breach | 24 hours |
| **High** | Significant security impact | 1 week |
| **Medium** | Limited security impact | 1 month |
| **Low** | Minimal security impact | Next release |

### Security Researcher Recognition

We appreciate responsible disclosure:
- Public acknowledgment (with permission)
- Recognition in release notes
- Security Hall of Fame

## Security Measures

### Authentication and Authorization

- **Better Auth**: Enterprise-grade authentication
  - Email/password with verification
  - OAuth (Google, Microsoft)
  - Magic links
  - Passkey/WebAuthn support
  - Multi-factor authentication

- **Role-Based Access Control (RBAC)**
  - Organization-level permissions
  - Project-level access control
  - Policy-based authorization
  - Audit logging

### Data Protection

#### Data in Transit
- TLS 1.3 mandatory for all connections
- HTTPS-only in production (HSTS enabled)
- Secure WebSocket connections (WSS)
- Certificate pinning where applicable

#### Data at Rest
- PostgreSQL encryption at rest (provider-level)
- Redis encryption in transit and at rest
- Vercel Blob encrypted storage
- Secure key management via environment variables

#### Sensitive Data Handling
- Healthcare data segregation
- Encryption for PII/PHI
- Secure session management
- Token rotation policies

### API Security

- **Rate Limiting**: Tier-based rate limits per organization
- **Input Validation**: Zod schemas for all inputs
- **Output Sanitization**: XSS prevention
- **CSRF Protection**: Token-based CSRF protection
- **API Authentication**: Bearer token or session-based auth

### Infrastructure Security

#### Vercel Platform Security
- DDoS protection
- WAF (Web Application Firewall)
- Automatic SSL/TLS certificates
- Edge network security
- Infrastructure-level isolation

#### Database Security
- Neon PostgreSQL with encryption
- Connection pooling with PgBouncer
- Database access logging
- Least privilege access
- Automated backups with encryption

#### Redis Security
- Upstash Redis with TLS
- Authentication required
- Network isolation
- Encryption in transit and at rest

### Application Security

#### Security Headers
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Content-Security-Policy: [configured per route]
```

#### Input Validation
- Zod runtime validation for all inputs
- Type-safe schema validation
- Server-side validation (never trust client)
- SQL injection prevention via parameterized queries
- XSS prevention via output encoding

#### Error Handling
- No sensitive information in error messages
- Structured logging without PII
- Error tracking with sanitization
- Generic error messages to users

### Logging and Monitoring

- **Structured Logging**: Pino for performance and security
- **Audit Trail**: All sensitive operations logged
- **Security Events**: Authentication, authorization, data access
- **Anomaly Detection**: Monitor for unusual patterns
- **Log Retention**: 90 days minimum, longer for compliance

### Code Security

- **Static Analysis**: ESLint with security rules
- **Type Safety**: Strict TypeScript mode
- **Code Review**: Required for all changes
- **Branch Protection**: Protected main branch
- **Signed Commits**: Recommended for maintainers

## Dependency Management

### Dependency Security Process

Our comprehensive dependency security process is documented in:

📄 **[Dependency Lifecycle Management Plan](./DEPENDENCY_LIFECYCLE.md)**

Key highlights:

#### 1. Origin Verification
- All packages from npm registry with verified publishers
- Cryptographic integrity verification (SHA-512 hashes)
- No git dependencies or local paths in production
- Publisher two-factor authentication preferred

#### 2. Security Scanning
- Automated vulnerability scanning in CI/CD
- GitHub Dependabot for security updates
- Weekly security audit schedule
- Quarterly manual security review

#### 3. Update Management
- Critical security patches: <24 hours
- High security patches: <1 week
- Regular updates: Weekly cycle
- Major updates: Monthly planning

#### 4. Monitoring
- Continuous vulnerability monitoring
- Automated security alerts
- Weekly dependency health checks
- Quarterly compliance audits

### Current Security Posture

| Metric | Target | Status |
|--------|--------|--------|
| Critical vulnerabilities | 0 | ✅ 0 |
| High vulnerabilities | 0 | ✅ 0 |
| Medium vulnerabilities | <5 | 🔄 Monitored |
| Outdated dependencies | <10% | 🔄 Monitored |
| Dependencies with 2FA publishers | >90% | ✅ Met |

### Dependency Categories

#### Critical Risk Dependencies (Weekly Review)
- Authentication: `better-auth`, `@better-auth/passkey`
- Database: `drizzle-orm`, `@neondatabase/serverless`
- Payment: `stripe`
- Security: `zod`, `neverthrow`

#### High Risk Dependencies (Bi-weekly Review)
- Framework: `next`, `react`, `react-dom`
- AI SDKs: `openai`, `@anthropic-ai/sdk`, `@deepgram/sdk`
- Workflow: `workflow`

#### Medium Risk Dependencies (Monthly Review)
- UI libraries: `@radix-ui/*`, `tailwindcss`
- Utilities: `date-fns`, `nanoid`, `clsx`
- State management: `@tanstack/react-query`, `nuqs`

### Prohibited Practices

❌ **Never allowed:**
- Installing packages without security review
- Using git URLs as dependencies
- Disabling integrity checks
- Installing from untrusted registries
- Using deprecated packages
- Ignoring security audit failures

## Security Testing

### Automated Testing

- **Unit Tests**: Core business logic and utilities
- **Integration Tests**: API endpoints and database operations
- **E2E Tests**: Critical user flows
- **Security Tests**: Input validation, auth flows, RBAC

### Security-Specific Testing

- **Authentication Testing**: Login, session, token handling
- **Authorization Testing**: RBAC policy enforcement
- **Input Validation Testing**: Injection attacks, XSS
- **API Security Testing**: Rate limiting, authentication
- **Dependency Scanning**: Automated in CI/CD

## Incident Response

### Security Incident Types

1. **Data Breach**: Unauthorized access to sensitive data
2. **Vulnerability Exploitation**: Active exploit of known vulnerability
3. **Supply Chain Compromise**: Compromised dependency
4. **Authentication Bypass**: Unauthorized access to system
5. **Denial of Service**: Service unavailability

### Incident Response Process

1. **Detection**: Automated alerts or manual report
2. **Containment**: Isolate affected systems
3. **Assessment**: Determine scope and impact
4. **Eradication**: Remove threat and patch vulnerability
5. **Recovery**: Restore normal operations
6. **Post-Incident**: Review and improve processes

### Communication

- **Internal**: Immediate notification to security team
- **Management**: Within 4 hours for critical incidents
- **Users**: Within 24 hours if user data affected
- **Authorities**: Per GDPR breach notification requirements (72 hours)

## Compliance Audits

### Internal Audits

- **Monthly**: Dependency security audit
- **Quarterly**: Comprehensive security review
- **Annually**: Full compliance assessment

### External Audits

- **Annual**: Third-party security assessment
- **Biennial**: NEN 7510 certification audit
- **As needed**: Penetration testing

## Security Contacts

### Internal Contacts

- **Security Team**: security@[company-domain]
- **Engineering Lead**: [lead-email]
- **Privacy Officer**: [privacy-email]
- **Compliance Officer**: [compliance-email]

### Emergency Contacts

For critical security incidents:
- **24/7 Hotline**: [phone-number]
- **Security Email**: security@[company-domain]
- **Incident Response**: incident-response@[company-domain]

## Additional Resources

- **Dependency Lifecycle Plan**: [DEPENDENCY_LIFECYCLE.md](./DEPENDENCY_LIFECYCLE.md)
- **Security Scanning Workflow**: [.github/workflows/security-scan.yml](.github/workflows/security-scan.yml)
- **Dependabot Configuration**: [.github/dependabot.yml](.github/dependabot.yml)
- **Development Guidelines**: [README.md](./README.md)

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-24 | Initial security policy for SSD compliance |

---

**Document Owner**: Security Team  
**Review Cycle**: Quarterly  
**Next Review**: May 2026
