# Security Documentation

This directory contains security guidelines, policies, and implementation guides for the Inovy application.

## Compliance Framework

Our application follows Dutch and European healthcare security standards:

- **NEN 7510** - Information Security in Healthcare
- **AVG/GDPR** - Data Protection
- **BIO** - Baseline Information Security Government
- **NIS2** - Network and Information Security Directive

## Security Standards (SSD)

The following documents address specific SSD (Secure Software Development) requirements:

### XXE Prevention (SSD-32)

- **[XML Parsing Security](./xml-parsing-security.md)** - SSD-32.1.02
  - Safe XML parsing library guidelines
  - XXE vulnerability prevention
  - Approved libraries and configurations
  - Implementation examples

## Current Security Posture

### Data Exchange

- ✅ **JSON-only API communication** - All REST APIs use JSON
- ✅ **No active XML parsing** - XML parsing guidelines established for future needs
- ✅ **Secure document processing** - DOCX processing uses vetted libraries (mammoth.js)

### Authentication & Authorization

- ✅ **Better Auth** - Modern authentication with passkeys
- ✅ **Role-Based Access Control** - Multi-level permissions (super admin, org admin, manager, member, practitioner)
- ✅ **Multi-tenancy** - Organization-level data isolation

### Data Protection

- ✅ **Encrypted connections** - TLS for all connections
- ✅ **Encrypted storage** - Database encryption at rest
- ✅ **Secure file storage** - Vercel Blob for document storage
- ✅ **Access logging** - Comprehensive audit trails

### Infrastructure Security

- ✅ **Vercel deployment** - Managed infrastructure with SOC 2 compliance
- ✅ **Neon PostgreSQL** - Serverless database with encryption
- ✅ **Environment separation** - Separate dev/staging/production environments
- ✅ **Secret management** - Environment variables for sensitive data

## Security Best Practices

### For Developers

1. **Input Validation**
   - Use Zod schemas for all inputs
   - Validate on both client and server
   - Sanitize user-provided content

2. **Error Handling**
   - Use neverthrow for type-safe error handling
   - Never expose internal errors to users
   - Log security events comprehensively

3. **Authentication**
   - Always check authentication in server actions
   - Validate organization access
   - Use type-safe permission checks

4. **Data Access**
   - Use parameterized queries (Drizzle ORM)
   - Implement organization-level isolation
   - Validate scope access (project/org/global)

5. **Dependencies**
   - Keep dependencies updated (Dependabot)
   - Review security advisories weekly
   - Use only approved libraries for sensitive operations

### Code Review Checklist

- [ ] Authentication checked in server actions
- [ ] Input validated with Zod schemas
- [ ] Errors handled with neverthrow
- [ ] Organization isolation enforced
- [ ] No sensitive data in logs
- [ ] SQL injection prevented (ORM only)
- [ ] XSS prevention (React escaping + sanitization)
- [ ] CSRF protection (Better Auth handles this)

## Incident Response

If a security vulnerability is discovered:

1. **Report immediately** to security@inovy.app
2. **Do not** disclose publicly until fixed
3. **Document** the issue in a private GitHub security advisory
4. **Fix** and deploy patch as soon as possible
5. **Notify** affected users if data was compromised
6. **Update** relevant security documentation

## Security Testing

### Automated Testing

- **Dependabot** - Automated dependency vulnerability scanning
- **ESLint** - Static code analysis with security rules
- **TypeScript** - Type safety prevents many security issues

### Manual Testing

- **Code reviews** - All code reviewed by senior developers
- **Security reviews** - Quarterly security audits
- **Penetration testing** - Annual third-party pen testing

## Compliance Verification

### Regular Audits

- **Monthly** - Dependency security review
- **Quarterly** - Security posture assessment
- **Annually** - Full compliance audit (NEN 7510)

### Documentation Review

All security documentation is reviewed every 6 months to ensure:

- Guidelines are current
- Technologies are up to date
- Compliance requirements are met
- Incidents are addressed

## Additional Resources

### Internal Documentation

- See `/docs` directory for implementation guides
- See `.cursor/rules` for development guidelines
- See `PRD.md` for product security requirements

### External Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [NEN 7510 Standard](https://www.nen.nl/en/nen-7510-2017-nl-245398)
- [NCSC Security Guidelines](https://www.ncsc.nl/documenten/publicaties)

## Contact

- **Security Questions:** security@inovy.app
- **Architecture Questions:** architecture@inovy.app
- **Emergency Security Issues:** Use GitHub Security Advisories

---

**Last Updated:** February 1, 2026  
**Next Review:** August 1, 2026
