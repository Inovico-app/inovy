# Inovy Documentation

This directory contains comprehensive documentation for the Inovy platform, organized by topic area.

## Documentation Structure

### Security Documentation

Located in `/docs/security/`

#### Authorization System (SSD-7.1.03)

The authorization system documentation covers the complete process for defining, assigning, and maintaining user authorizations to ensure systematic and secure access control in compliance with NEN 7510, NEN 7513, and SSD-7 requirements.

**Key Documents:**

- **[Authorization Process](./security/AUTHORIZATION_PROCESS.md)** - Complete process for defining and maintaining authorizations
  - Authorization architecture overview
  - Role definition process
  - Permission structure
  - Authorization enforcement
  - Audit logging
  - Security best practices
  - Maintenance procedures

- **[Authorization Assignment Procedures](./security/AUTHORIZATION_ASSIGNMENT.md)** - Procedures for assigning and managing user roles
  - User onboarding and initial assignment
  - Organization invitation workflow
  - Role modification procedures
  - Member management
  - Emergency procedures
  - Superadmin role management

- **[Authorization Configuration](./security/AUTHORIZATION_CONFIGURATION.md)** - Technical configuration documentation
  - Role definitions and hierarchy
  - Complete permission matrix
  - Database schema configuration
  - Access control configuration
  - API endpoints
  - Environment variables
  - Cache configuration

**Compliance Coverage:**

- ✅ **SSD-7.1.03**: Process for defining, assigning, and maintaining authorizations
- ✅ **NEN 7510**: Information security in healthcare (access control)
- ✅ **NEN 7513**: Logging and authorization in healthcare
- ✅ **AVG (GDPR)**: Access control and minimal data access principles

## Quick Links

### For Developers

- [Authorization Technical Implementation](/workspace/apps/web/src/lib/README.md)
- [Authorization Configuration](./security/AUTHORIZATION_CONFIGURATION.md)
- Access Control Code: `/workspace/apps/web/src/lib/auth/access-control.ts`
- RBAC Utilities: `/workspace/apps/web/src/lib/rbac/`

### For Administrators

- [Authorization Assignment Procedures](./security/AUTHORIZATION_ASSIGNMENT.md)
- [Member Management Guide](./security/AUTHORIZATION_ASSIGNMENT.md#3-member-management)
- [Role Selection Guidelines](./security/AUTHORIZATION_ASSIGNMENT.md#13-role-selection-guidelines)

### For Security & Compliance

- [Authorization Process](./security/AUTHORIZATION_PROCESS.md)
- [Audit Logging](./security/AUTHORIZATION_PROCESS.md#5-authorization-auditing)
- [Security Best Practices](./security/AUTHORIZATION_PROCESS.md#6-security-best-practices)
- [Compliance Mapping](./security/AUTHORIZATION_PROCESS.md#81-compliance-mapping)

## Document Maintenance

All documentation is subject to regular review:

- **Quarterly Review**: Every 3 months
- **Annual Review**: Comprehensive review annually
- **Ad-hoc Updates**: As needed for security or compliance changes

**Next Review Date:** 2026-05-24

## Document Ownership

- **Document Owner**: Security & Compliance Team
- **Technical Owner**: Development Team
- **Approvers**: CTO, Security Officer, Compliance Officer

## Contributing to Documentation

When updating documentation:

1. Follow the established format and structure
2. Update version history in each document
3. Update the next review date
4. Ensure cross-references remain valid
5. Run documentation through review process
6. Update this index if adding new documents

## Standards and References

### Internal Standards

- Clean Architecture patterns
- TypeScript best practices
- Next.js 16 conventions
- Better Auth integration

### External Standards

- [NEN 7510:2017 - Information Security in Healthcare](https://www.nen.nl/en/nen-7510-2017-nl-244879)
- [NEN 7513:2018 - Logging in Healthcare](https://www.nen.nl/en/nen-7513-2018-nl-267352)
- [AVG (GDPR)](https://gdpr-info.eu/)
- [ISO 27001 - Information Security Management](https://www.iso.org/isoiec-27001-information-security.html)

## Contact

For questions about documentation:

- **Security Questions**: Security & Compliance Team
- **Technical Questions**: Development Team
- **Process Questions**: Project Management

---

*Last Updated: 2026-02-24*
