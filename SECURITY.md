# Security Policy

## Reporting a Vulnerability

We take the security of Inovy seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Email:** Send details to security@inovy.app
2. **GitHub:** Use [GitHub Security Advisories](https://github.com/inovy/inovy/security/advisories/new) for private reporting
3. **Include:**
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment:** Within 24 hours
- **Initial Assessment:** Within 72 hours
- **Status Updates:** Weekly until resolved
- **Resolution:** Security patches deployed ASAP
- **Credit:** Public acknowledgment (if desired)

### Security Standards

Inovy complies with:

- **NEN 7510** - Healthcare Information Security (Netherlands)
- **AVG/GDPR** - Data Protection Regulation
- **BIO** - Baseline Information Security Government
- **OWASP Top 10** - Web Application Security

### Current Security Measures

- ✅ **Authentication:** Better Auth with passkey support
- ✅ **Authorization:** Role-based access control (RBAC)
- ✅ **Data Encryption:** TLS in transit, encryption at rest
- ✅ **Input Validation:** Zod schemas on all inputs
- ✅ **SQL Injection:** Prevented via Drizzle ORM
- ✅ **XSS Prevention:** React escaping + content sanitization
- ✅ **CSRF Protection:** Token-based protection
- ✅ **XXE Prevention:** Secure XML parsing guidelines (SSD-32.1.02)
- ✅ **Dependency Scanning:** Automated Dependabot updates
- ✅ **Security Audits:** Quarterly reviews

### Disclosure Policy

- We follow **coordinated disclosure** practices
- Vulnerabilities are patched before public disclosure
- Security advisories published after fixes are deployed
- 90-day disclosure timeline (or sooner by mutual agreement)

### Out of Scope

The following are explicitly out of scope:

- Social engineering attacks
- Physical attacks
- Denial of service attacks
- Spam or phishing attacks
- Issues in third-party services (report to them directly)
- Issues requiring physical access to user devices
- Issues in outdated browsers or operating systems

### Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | ✅ Active support  |
| < Latest| ❌ Upgrade required |

We maintain security updates only for the latest deployed version. Please upgrade to the latest version to receive security fixes.

### Security Documentation

Detailed security guidelines for developers:

- [Security Documentation](/docs/security/README.md)
- [XML Parsing Security](/docs/security/xml-parsing-security.md)

### Contact

- **Email:** security@inovy.app
- **Website:** https://inovy.app
- **GitHub:** https://github.com/inovy/inovy

---

**Last Updated:** February 1, 2026  
Thank you for helping keep Inovy secure!
