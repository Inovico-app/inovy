# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it to our security team immediately.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: [security@inovy.app](mailto:security@inovy.app)

You should receive a response within 48 hours. If the issue is confirmed, we will release a patch as soon as possible depending on complexity.

## Supported Versions

We provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Measures

### Dependency Management

We maintain a comprehensive dependency management process to ensure all components have the latest security patches:

1. **Automated Dependency Updates**
   - Dependabot is configured to automatically check for dependency updates
   - Pull requests are automatically created for security vulnerabilities
   - Dependencies are reviewed and updated regularly

2. **Security Audits**
   - Regular security audits using `pnpm audit`
   - CI/CD pipeline includes automated security checks
   - Monthly manual reviews of dependency security status

3. **Version Pinning**
   - pnpm lockfile ensures consistent dependency versions across environments
   - Direct dependencies are carefully version-managed in package.json
   - Transitive dependencies are monitored and updated when necessary

### Security Compliance (SSD-1.3.03)

This project complies with **SSD-1.3.03**: ICT components are equipped with the most recent patches, unless there is a demonstrable and documented reason why this is not the case and the client has given written consent to this.

#### Current Security Status

**Last Updated:** February 24, 2026

**Direct Dependencies:** ✅ Up to date with latest security patches

**Transitive Dependencies:** ⚠️ Some exceptions documented below

#### Known Security Exceptions

The following security vulnerabilities exist in transitive dependencies that we cannot directly control:

1. **workflow package vulnerabilities** (Third-party dependency)
   - **Package:** `workflow@4.0.1-beta.40`
   - **Affected transitive dependencies:**
     - `fast-xml-parser` (critical/high) - via AWS SDK
     - `devalue` (high/low) - via @workflow/core
     - `next@16.0.1` (moderate/high) - via @workflow/web
     - `minimatch` (high) - via archiver
     - `esbuild` (moderate) - via better-auth/drizzle-kit
     - `undici` (moderate) - via @workflow/world-local
   
   **Impact Assessment:**
   - These vulnerabilities are in development/build-time dependencies
   - The workflow package is in beta and actively maintained
   - Risk is mitigated as these components are not exposed in production runtime
   
   **Mitigation Strategy:**
   - Monitor workflow package updates
   - Plan to upgrade when stable version is released
   - Consider alternative solutions if vulnerabilities become critical
   
   **Approval Status:** ⏳ Pending client approval (see: [INO2-314](linear.app/inovy/issue/INO2-314))

2. **archiver package vulnerabilities** (Production dependency)
   - **Package:** `archiver@7.0.1`
   - **Affected transitive dependencies:**
     - `glob@10.x` (high) - command injection vulnerability
     - `minimatch@10.x` (high) - ReDoS vulnerability
   
   **Impact Assessment:**
   - Used for file archiving functionality
   - Vulnerabilities require CLI access with specific flags
   - Not exposed through public API
   
   **Mitigation Strategy:**
   - Limit archiver usage to trusted internal operations
   - Monitor for archiver package updates
   - Consider implementing custom archiving solution if needed
   
   **Approval Status:** ⏳ Pending client approval (see: [INO2-314](linear.app/inovy/issue/INO2-314))

### Update Process

1. **Regular Updates**
   - Weekly: Review Dependabot alerts
   - Monthly: Run `pnpm update` for patch updates
   - Quarterly: Review and update major versions

2. **Emergency Updates**
   - Critical vulnerabilities are addressed within 24 hours
   - High-severity vulnerabilities are addressed within 1 week
   - Medium/low vulnerabilities are addressed in next scheduled update

3. **Testing**
   - All dependency updates are tested in development environment
   - Automated tests run before deployment
   - Manual verification for major updates

### Security Best Practices

This project follows industry-standard security practices:

- ✅ Regular dependency audits
- ✅ Automated security scanning in CI/CD
- ✅ Version pinning with lockfile
- ✅ Principle of least privilege
- ✅ Secure authentication (UZI-pas, MFA)
- ✅ Data encryption (at rest and in transit)
- ✅ Comprehensive logging and monitoring
- ✅ NEN 7510 compliance for healthcare data
- ✅ AVG (GDPR) compliance

## Compliance

This project complies with:

- **NEN 7510** - Information security in healthcare
- **AVG (GDPR)** - General Data Protection Regulation
- **SSD-1** - Hardening of technical components
- **BIO** - Baseline Information Security for Government

For more information about our security compliance, see:
- [SSD Compliance Documentation](./docs/security/ssd-compliance.md)
- [Privacy Policy](./docs/legal/privacy-policy.md)

## Security Contacts

- **Security Team:** security@inovy.app
- **Project Maintainer:** [Contact via Linear](https://linear.app/inovy)

## Acknowledgments

We appreciate the security research community and encourage responsible disclosure of security vulnerabilities.
