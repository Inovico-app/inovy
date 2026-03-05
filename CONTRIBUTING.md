# Contributing to Inovy

Thank you for contributing to Inovy! This document provides guidelines for contributing to the project.

## Table of Contents

1. [Development Setup](#development-setup)
2. [Code Standards](#code-standards)
3. [Git Workflow](#git-workflow)
4. [Pull Request Process](#pull-request-process)
5. [Security Guidelines](#security-guidelines)
6. [Testing Requirements](#testing-requirements)

---

## Development Setup

### Prerequisites

- Node.js 20.9+ (required for Next.js 16)
- pnpm 10.9+ (package manager)
- Git

### Getting Started

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Set up environment variables (see README.md)
4. Run database migrations: `pnpm db:push`
5. Start development server: `pnpm dev`

See [README.md](./README.md) for detailed setup instructions.

---

## Code Standards

### TypeScript

- Use TypeScript for all code
- Enable strict mode
- Prefer interfaces over types
- Avoid enums; use const maps instead
- Use proper type inference

### React Components

- Favor React Server Components (RSC)
- Minimize 'use client' directives
- Use functional components
- Implement proper error boundaries
- Follow naming conventions (PascalCase for components)

### Styling

- Use Tailwind CSS 4 for styling
- Follow mobile-first responsive design
- Use Shadcn UI components
- Maintain accessibility (WCAG AA)

### Code Organization

- Follow Clean Architecture patterns
- Separate concerns (presentation, business logic, data access)
- Use DTOs for data transfer
- Implement proper error handling with neverthrow
- Add meaningful comments only for non-obvious logic

See `.cursor/rules/nextjs-react-tailwind.mdc` for detailed code style guidelines.

---

## Git Workflow

### Branch Naming Conventions

Use descriptive branch names with prefixes:

- `feature/[description]` - New features
- `fix/[description]` - Bug fixes
- `refactor/[description]` - Code refactoring
- `docs/[description]` - Documentation changes
- `security/[description]` - Security-related changes
- `security/hardening-deviation-[component]-[description]` - Hardening deviations

Examples:

- `feature/project-templates`
- `fix/recording-upload-timeout`
- `security/hardening-deviation-redis-tls`

### Commit Messages

Follow conventional commits format:

```
type(scope): brief description

Detailed explanation if needed.

Refs: #issue-number
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `docs`: Documentation
- `test`: Testing
- `chore`: Maintenance
- `security`: Security changes

Examples:

```
feat(projects): add project template instructions

Implement database schema and CRUD operations for project-level
AI instructions that guide summary generation.

Refs: #123

fix(auth): resolve session timeout issue

Fixed an issue where sessions would expire prematurely due to
incorrect token refresh logic.

Refs: #456

security: Document hardening deviation DEV-2026-001

Document deviation from BIO-11.2.3 for development environment
Redis TLS configuration. Low risk with compensating controls.

Deviation ID: DEV-2026-001
Refs: INO2-316
```

---

## Pull Request Process

### Before Creating a PR

1. **Code Quality**
   - Run linter: `pnpm lint`
   - Fix any linting errors
   - Run type checking: `pnpm typecheck`
   - Ensure no type errors

2. **Testing**
   - Test your changes locally
   - Verify no regressions
   - Add tests if applicable

3. **Documentation**
   - Update relevant documentation
   - Add code comments for complex logic
   - Update README if needed

### Creating the PR

1. **Title:** Use conventional commit format
2. **Description:** Provide clear context and motivation
3. **Labels:** Add appropriate labels
4. **Reviewers:** Assign relevant team members
5. **Issues:** Link related Linear/GitHub issues

### PR Templates

Use specialized PR templates when applicable:

- **Hardening Deviation:** Use `.github/PULL_REQUEST_TEMPLATE/hardening_deviation.md`
  - Required for any security baseline deviations
  - See [Hardening Deviation Process](./docs/security/HARDENING_DEVIATION_PROCESS.md)

### PR Review Guidelines

- **Timely Reviews:** Review PRs within 24-48 hours
- **Constructive Feedback:** Be specific and helpful
- **Code Quality:** Check for maintainability and best practices
- **Security:** Review for security implications
- **Testing:** Verify changes are tested

### Required Approvals

| PR Type | Required Approvals |
|---------|-------------------|
| Standard | 1 team member |
| Security Changes | Security engineer or technical lead |
| Hardening Deviation (Critical) | Security engineer + Technical lead + Client |
| Hardening Deviation (High) | Security engineer + Technical lead |
| Hardening Deviation (Medium) | Security engineer OR Technical lead |
| Hardening Deviation (Low) | Technical lead |
| Database Schema | Technical lead |

---

## Security Guidelines

### Security-First Development

All code must follow security best practices:

1. **Input Validation**
   - Validate all user input server-side
   - Use Zod schemas for validation
   - Sanitize output to prevent XSS

2. **Authentication & Authorization**
   - Use Better Auth for authentication
   - Implement RBAC for authorization
   - Check permissions on every action

3. **Data Protection**
   - Encrypt sensitive data
   - Use HTTPS/TLS for all communications
   - Follow data minimization principles

4. **Error Handling**
   - Don't expose sensitive information in errors
   - Log errors securely server-side
   - Use neverthrow for functional error handling

5. **Dependencies**
   - Keep dependencies updated
   - Review security advisories
   - Avoid deprecated packages

### Hardening Deviations

When you need to deviate from security hardening guidelines:

1. **Document the Deviation**
   - Use template: `docs/security/templates/DEVIATION_TEMPLATE.md`
   - Save to: `docs/security/deviations/DEV-YYYY-NNN.md`
   - Complete all sections including risk assessment

2. **Submit for Approval**
   - Create PR using hardening deviation template
   - Add label: `security/hardening-deviation`
   - Assign required approvers based on risk level
   - Link to Linear/GitHub issue

3. **After Approval**
   - Update the hardening deviations registry
   - Add deviation ID in code comments
   - Schedule periodic review

**Full Process:** [docs/security/HARDENING_DEVIATION_PROCESS.md](./docs/security/HARDENING_DEVIATION_PROCESS.md)

### Security Standards

The application must comply with:

- **BIO** - Dutch government security baseline
- **NEN 7510** - Healthcare information security
- **AVG/GDPR** - Data protection regulation
- **OWASP Top 10** - Web security best practices

See [docs/security/SECURITY_BASELINES.md](./docs/security/SECURITY_BASELINES.md) for complete guidelines.

---

## Testing Requirements

### Manual Testing

- Test your changes in development environment
- Verify functionality works as expected
- Check responsive design on different screen sizes
- Test edge cases and error scenarios

### Automated Testing

*To be implemented*

- Unit tests for business logic
- Integration tests for API endpoints
- E2E tests for critical user flows

### Pre-Deployment Checklist

Before deploying to production:

- [ ] Code passes linting
- [ ] No TypeScript errors
- [ ] Manual testing completed
- [ ] Security review passed (if security-related)
- [ ] Documentation updated
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Monitoring and alerting configured

---

## Database Changes

### Schema Migrations

When making database schema changes:

1. **Generate Migration**
   ```bash
   pnpm db:generate --name descriptive-migration-name
   ```

2. **Review Migration**
   - Check generated SQL
   - Verify indexes are appropriate
   - Ensure no data loss

3. **Test Migration**
   - Test in development first
   - Verify rollback works
   - Check performance impact

4. **Deploy Migration**
   - Never run `pnpm db:push` or `pnpm db:migrate` manually
   - Use GitHub Actions workflow to run migrations
   - Monitor migration execution

### Schema Best Practices

- Use UUID primary keys
- Add timestamps (createdAt, updatedAt)
- Create proper indexes
- Use foreign keys with proper references
- Document schema changes in PR

---

## Code Review Guidelines

### As a Reviewer

- **Timeliness:** Review within 24-48 hours
- **Thoroughness:** Check code quality, security, and architecture
- **Constructive:** Provide specific, actionable feedback
- **Learning:** Explain reasoning behind suggestions
- **Approval:** Only approve when confident in quality

### Review Checklist

- [ ] Code follows project architecture patterns
- [ ] TypeScript types are properly used
- [ ] Error handling is comprehensive
- [ ] Security best practices are followed
- [ ] No hardcoded secrets or credentials
- [ ] Comments are meaningful (not obvious)
- [ ] Performance considerations addressed
- [ ] Accessibility standards met
- [ ] Documentation is updated
- [ ] No obvious bugs or issues

### Security Review Checklist

For security-related PRs:

- [ ] Input validation is present and correct
- [ ] Authentication/authorization is properly implemented
- [ ] No sensitive data exposure
- [ ] Error messages don't leak information
- [ ] Dependencies are up-to-date and secure
- [ ] Hardening deviations are documented (if any)
- [ ] Compliance requirements are met

---

## Documentation Standards

### Code Documentation

- Document complex business logic
- Explain non-obvious technical decisions
- Avoid obvious comments
- Reference related issues or deviations
- Use JSDoc for public APIs

### Security Deviations

Document hardening deviations when:

- Configuration deviates from hardening guidelines
- Security controls are implemented differently
- Third-party services have security limitations
- Technical constraints prevent full compliance

**Process:** [docs/security/HARDENING_DEVIATION_PROCESS.md](./docs/security/HARDENING_DEVIATION_PROCESS.md)

### Architecture Decisions

For significant architectural decisions:

- Document reasoning and trade-offs
- Consider creating ADR (Architecture Decision Record)
- Update relevant documentation
- Communicate to team

---

## Getting Help

### Questions About:

**Development Setup:** See [README.md](./README.md)  
**Architecture Patterns:** See [Structure.md](./Structure.md)  
**Security Process:** See [docs/security/README.md](./docs/security/README.md)  
**Code Style:** See `.cursor/rules/nextjs-react-tailwind.mdc`

### Contact

**Development Team:** [team contact]  
**Security Team:** security@inovy.nl  
**Project Management:** [PM contact]

---

## Code of Conduct

### Expected Behavior

- Be respectful and professional
- Provide constructive feedback
- Be open to learning and different perspectives
- Focus on what's best for the project
- Follow established processes and guidelines

### Unacceptable Behavior

- Harassment or discrimination
- Deliberately introducing security vulnerabilities
- Ignoring code review feedback
- Bypassing security processes
- Disclosing security issues publicly before resolution

---

## License

This project is private and proprietary. Contributions are subject to the project license.

---

**Last Updated:** 2026-02-24  
**Document Owner:** Engineering Team
