# Hardening Deviation Process

**Document Version:** 1.0  
**Last Updated:** 2026-02-24  
**Compliance Standard:** SSD-1.3.05  

## Purpose

This document establishes the formal process for documenting, approving, and tracking hardening deviations when ICT components cannot fully comply with established hardening guidelines. This ensures security risks are formally acknowledged and accepted through proper governance.

## Scope

This process applies to:

- Infrastructure configuration deviations
- Software component hardening exceptions
- Security control implementations that differ from established guidelines
- Technology stack deviations from approved standards
- Third-party service security posture exceptions

## Definitions

### Hardening Deviation

A **hardening deviation** occurs when the configuration or implementation of an ICT component must deviate from established hardening guidelines, security baselines, or best practices due to:

- Technical limitations or incompatibilities
- Functional requirements that conflict with security controls
- Third-party service constraints
- Performance or operational requirements
- Cost or resource constraints

### Hardening Guidelines Reference

The application follows these hardening standards:

- **BIO (Baseline Informatiebeveiliging Overheid)** - Dutch government baseline
- **NEN 7510** - Healthcare information security standard
- **OWASP Top 10** - Web application security risks
- **CIS Benchmarks** - Infrastructure security baselines
- **NIST Cybersecurity Framework** - Security control framework

## Process Overview

```
┌──────────────────────┐
│  1. Identify         │
│  Deviation Need      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  2. Document         │
│  Deviation           │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  3. Risk             │
│  Assessment          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  4. Submit for       │
│  Approval            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  5. Review &         │
│  Approval Decision   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  6. Implementation   │
│  & Tracking          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  7. Periodic         │
│  Review              │
└──────────────────────┘
```

## Detailed Process Steps

### 1. Identify Deviation Need

**Who:** Developer, DevOps Engineer, Security Engineer  
**When:** During design, implementation, or review phases

**Actions:**

1. Identify the specific hardening guideline that cannot be met
2. Document the technical or business reason for the deviation
3. Evaluate if alternative approaches exist that would comply
4. Determine if the deviation is temporary or permanent

### 2. Document Deviation

**Who:** Developer or Security Engineer initiating the deviation  
**Required Information:**

Use the Hardening Deviation Template (see Appendix A) to document:

- **Deviation ID**: Unique identifier (e.g., `DEV-2026-001`)
- **Component**: Affected ICT component or system
- **Guideline Reference**: Specific hardening guideline/control not met
- **Description**: Clear explanation of the deviation
- **Justification**: Technical/business reason for the deviation
- **Risk Assessment**: Security impact and residual risk
- **Compensating Controls**: Mitigations to reduce risk
- **Alternative Analysis**: Why compliant alternatives are not viable
- **Temporary/Permanent**: Expected duration
- **Review Date**: When the deviation should be reassessed

### 3. Risk Assessment

**Who:** Security Engineer or Technical Lead  
**Actions:**

1. Assess the security impact using standard risk classification:
   - **Critical**: Could lead to data breach or system compromise
   - **High**: Significant security weakness
   - **Medium**: Moderate security impact
   - **Low**: Minimal security impact

2. Identify residual risk after compensating controls

3. Document risk acceptance rationale

### 4. Submit for Approval

**Who:** Developer or Security Engineer  
**How:** Create Pull Request using the Hardening Deviation PR Template

**Requirements:**

- Use PR label: `security/hardening-deviation`
- Include completed deviation documentation
- Attach risk assessment
- Reference related issues or requirements
- Assign to appropriate approvers

### 5. Review & Approval Decision

**Who:** Security Engineer, Technical Lead, Product Owner, or Client Representative  
**Approval Requirements:**

| Risk Level | Required Approvers |
|------------|-------------------|
| Critical   | Security Engineer + Technical Lead + Client |
| High       | Security Engineer + Technical Lead |
| Medium     | Security Engineer or Technical Lead |
| Low        | Technical Lead |

**Review Checklist:**

- [ ] Deviation is clearly documented and justified
- [ ] Risk assessment is accurate and complete
- [ ] Compensating controls are adequate
- [ ] No compliant alternatives are feasible
- [ ] Temporary deviations have a remediation plan
- [ ] Impact on compliance posture is acceptable

**Decision Options:**

- **Approved**: Deviation is accepted, proceed with implementation
- **Approved with Conditions**: Additional compensating controls required
- **Rejected**: Must find compliant alternative
- **Deferred**: Needs more analysis or information

### 6. Implementation & Tracking

**Who:** Developer implementing the change  
**Actions:**

1. Merge approved PR with deviation documentation
2. Add deviation to the Hardening Deviations Registry (see `HARDENING_DEVIATIONS_REGISTRY.md`)
3. Implement compensating controls as documented
4. Update system documentation to reference the deviation
5. Add code comments referencing the deviation ID where applicable

**Example Code Comment:**

```typescript
// SECURITY DEVIATION: DEV-2026-001
// This implementation deviates from BIO hardening guideline 3.2.1
// See: docs/security/deviations/DEV-2026-001.md
// Approved by: [Name] on [Date]
// Review Date: 2026-06-30
```

### 7. Periodic Review

**Who:** Security Engineer  
**Frequency:** Quarterly or per deviation review date  
**Actions:**

1. Review all active hardening deviations
2. Reassess risk levels based on threat landscape changes
3. Evaluate if deviation is still necessary
4. Check if compliant alternatives now exist
5. Update or close deviations as appropriate
6. Report to stakeholders on deviation status

## Deviation Documentation Structure

All hardening deviations are stored in:

```
docs/security/deviations/
├── DEV-2026-001.md
├── DEV-2026-002.md
└── ...
```

Each deviation file follows the standardized template (see Appendix A).

## Integration with Git Workflow

### Branch Naming Convention

When implementing a deviation:

```
security/hardening-deviation-[component]-[short-description]
```

Example: `security/hardening-deviation-redis-tls-certificate`

### Commit Message Format

```
security: Document hardening deviation DEV-2026-XXX

- Component: [Component Name]
- Guideline: [Reference]
- Risk Level: [Low/Medium/High/Critical]
- Status: [Documented/Approved/Implemented]

Refs: #issue-number
Deviation ID: DEV-2026-XXX
```

### PR Requirements

All hardening deviation PRs must:

1. Use the Hardening Deviation PR template
2. Include the `security/hardening-deviation` label
3. Link to the relevant Linear/GitHub issue
4. Have completed risk assessment
5. Include all required approvals before merge

## Deviation Registry

A central registry of all hardening deviations is maintained in:

```
docs/security/HARDENING_DEVIATIONS_REGISTRY.md
```

This provides:

- Quick overview of all active deviations
- Risk summary dashboard
- Review schedule tracking
- Status of compensating controls

## Roles and Responsibilities

### Developer

- Identify when deviation is needed
- Complete initial documentation
- Submit for approval
- Implement approved deviations
- Add deviation references in code

### Security Engineer

- Perform risk assessments
- Review deviation requests
- Approve/reject deviations
- Conduct periodic reviews
- Maintain deviation registry

### Technical Lead

- Review technical justification
- Validate alternative analysis
- Approve deviations within authority
- Ensure implementation quality

### Product Owner / Client Representative

- Approve high-risk deviations
- Make risk acceptance decisions
- Set business priorities
- Review compliance impact

## Compliance and Audit

### Audit Trail

All hardening deviations maintain a complete audit trail:

- Initial submission (Git commit)
- Review comments (PR discussion)
- Approval decisions (PR approvals)
- Implementation (merge commit)
- Periodic reviews (documented in deviation file)

### Reporting

Quarterly reports to stakeholders include:

- Count of active deviations by risk level
- New deviations approved in period
- Deviations closed or remediated
- Risk trends and compliance posture
- Recommendations for improvement

### External Audit Support

During compliance audits:

1. Provide deviation registry as central documentation
2. Show approval trail via Git history
3. Demonstrate periodic review process
4. Present risk assessments and compensating controls
5. Show remediation progress for temporary deviations

## Templates and Tools

### Available Templates

1. **Deviation Documentation Template** - `docs/security/templates/DEVIATION_TEMPLATE.md`
2. **PR Template** - `.github/PULL_REQUEST_TEMPLATE/hardening_deviation.md`
3. **Risk Assessment Template** - Embedded in deviation template

### Automation

The following automation is in place:

- PR labels trigger deviation tracking workflows
- Scheduled reminders for deviation reviews
- Compliance dashboard integration (when available)

## Review Schedule

### Regular Review Cadence

| Review Type | Frequency | Participants |
|-------------|-----------|-------------|
| Individual Deviation Review | Per deviation schedule (typically quarterly) | Security Engineer, Technical Owner |
| Full Registry Review | Quarterly | Security Engineer, Technical Lead, Product Owner |
| Compliance Audit | Annually | All stakeholders + External Auditor |
| Risk Reassessment | Semi-annually or when threat landscape changes | Security Engineer |

### Review Triggers

Immediate review required when:

- Security incident occurs related to a deviation
- New vulnerability discovered affecting deviated component
- Compliant alternative becomes available
- Business requirements change
- Regulatory requirements change

## References

### Internal Documents

- `docs/security/HARDENING_DEVIATIONS_REGISTRY.md` - Central deviation registry
- `docs/security/SECURITY_BASELINES.md` - Hardening baselines and guidelines
- `.github/PULL_REQUEST_TEMPLATE/hardening_deviation.md` - PR template

### External Standards

- **BIO (Baseline Informatiebeveiliging Overheid)** - [https://www.bio-overheid.nl/](https://www.bio-overheid.nl/)
- **NEN 7510** - Healthcare information security
- **OWASP** - [https://owasp.org/](https://owasp.org/)
- **CIS Benchmarks** - [https://www.cisecurity.org/cis-benchmarks](https://www.cisecurity.org/cis-benchmarks)
- **NIST Cybersecurity Framework** - [https://www.nist.gov/cyberframework](https://www.nist.gov/cyberframework)

## Appendix A: Hardening Deviation Template

See: `docs/security/templates/DEVIATION_TEMPLATE.md`

## Appendix B: Example Deviation

See: `docs/security/deviations/DEV-2026-EXAMPLE.md`

---

**Document Owner:** Security Engineering Team  
**Approval:** [Name], Security Lead  
**Next Review Date:** 2026-05-24
