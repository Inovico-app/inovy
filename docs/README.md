# Inovy Documentation

**Last Updated:** 2026-02-24

## Overview

This directory contains comprehensive documentation for the Inovy application, including security processes, architecture decisions, compliance documentation, and operational procedures.

---

## Documentation Structure

```
docs/
├── README.md                    # This file - documentation index
└── security/                    # Security documentation
    ├── README.md                # Security documentation index
    ├── SECURITY_BASELINES.md    # Hardening guidelines
    ├── HARDENING_DEVIATION_PROCESS.md  # Deviation process
    ├── HARDENING_DEVIATIONS_REGISTRY.md # Deviation tracking
    ├── QUICK_REFERENCE.md       # Quick reference for developers
    ├── templates/               # Templates
    │   └── DEVIATION_TEMPLATE.md
    └── deviations/              # Individual deviation docs
        ├── DEV-2026-EXAMPLE.md
        └── DEV-YYYY-NNN.md
```

---

## Quick Links

### For Developers

- **[Security Quick Reference](./security/QUICK_REFERENCE.md)** - Fast guide to deviation process
- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute to the project
- **[Code Style Guide](../.cursor/rules/nextjs-react-tailwind.mdc)** - Frontend development guidelines

### For Security Engineers

- **[Security Baselines](./security/SECURITY_BASELINES.md)** - Hardening guidelines and standards
- **[Deviation Process](./security/HARDENING_DEVIATION_PROCESS.md)** - Complete process documentation
- **[Deviations Registry](./security/HARDENING_DEVIATIONS_REGISTRY.md)** - Central tracking

### For Auditors

- **[Security Documentation](./security/README.md)** - Security documentation overview
- **[Deviations Registry](./security/HARDENING_DEVIATIONS_REGISTRY.md)** - Audit trail and tracking
- **[Compliance Mapping](./security/HARDENING_DEVIATIONS_REGISTRY.md#compliance-mapping)** - SSD compliance evidence

---

## Documentation Categories

### Security & Compliance

Security documentation ensures the application meets Dutch and European security standards for healthcare applications.

**Key Documents:**

- Security baselines and hardening guidelines
- Hardening deviation process and registry
- Compliance mappings (BIO, NEN 7510, GDPR)

**Location:** `docs/security/`

### Architecture *(planned)*

Architecture documentation would include:

- System architecture diagrams
- Component interaction diagrams
- Data flow diagrams
- Architecture Decision Records (ADRs)

**Location:** `docs/architecture/` *(to be created)*

### Operations *(planned)*

Operational documentation would include:

- Deployment procedures
- Runbooks and playbooks
- Monitoring and alerting setup
- Disaster recovery procedures

**Location:** `docs/operations/` *(to be created)*

### API Documentation *(planned)*

API documentation would include:

- API endpoint documentation
- Authentication guides
- Integration guides
- API versioning strategy

**Location:** `docs/api/` *(to be created)*

---

## Contributing to Documentation

### Documentation Standards

- Use Markdown format
- Include table of contents for long documents
- Add last updated date and owner
- Link to related documents
- Keep language clear and concise
- Include examples where helpful

### When to Update Documentation

Update documentation when:

- Adding new features or components
- Changing security configurations
- Making architectural decisions
- Creating new processes
- Discovering security deviations
- Updating compliance mappings

### Documentation Review

- Review documentation in PRs
- Keep documentation in sync with code
- Update version numbers and dates
- Archive outdated documentation
- Maintain change logs

---

## Getting Help

### Questions About:

**Security Process:** See [docs/security/README.md](./security/README.md)  
**Development:** See [CONTRIBUTING.md](../CONTRIBUTING.md)  
**Application:** See [README.md](../README.md)

### Contact

**Documentation Questions:** Engineering Team  
**Security Questions:** security@inovy.nl  
**Compliance Questions:** compliance@inovy.nl

---

## Future Documentation

### Planned Documentation

As the project grows, we plan to add:

- **Architecture Documentation** - System design and ADRs
- **Operations Documentation** - Deployment and runbooks
- **API Documentation** - Complete API reference
- **User Documentation** - End-user guides and tutorials
- **Incident Response Plan** - Security incident procedures
- **Business Continuity Plan** - Disaster recovery procedures

---

**Documentation Maintained By:** Engineering Team  
**Last Updated:** 2026-02-24
