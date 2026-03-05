# Security Documentation

**Last Updated:** 2026-02-24  
**Owner:** Security Engineering Team  

## Overview

This directory contains all security-related documentation for the Inovy application, including hardening guidelines, deviation processes, compliance mappings, and security baselines.

---

## Document Structure

```
docs/security/
├── README.md                              # This file - security documentation index
├── SECURITY_BASELINES.md                  # Hardening guidelines and security baselines
├── HARDENING_DEVIATION_PROCESS.md         # Process for documenting deviations
├── HARDENING_DEVIATIONS_REGISTRY.md       # Central registry of all deviations
├── templates/
│   └── DEVIATION_TEMPLATE.md              # Template for deviation documentation
└── deviations/
    ├── DEV-2026-EXAMPLE.md                # Example deviation (Redis TLS in dev)
    └── DEV-YYYY-NNN.md                    # Individual deviation documents
```

---

## Quick Links

### Core Documentation

- **[Security Baselines](./SECURITY_BASELINES.md)** - Hardening guidelines and compliance standards
- **[Hardening Deviation Process](./HARDENING_DEVIATION_PROCESS.md)** - How to document and approve deviations
- **[Hardening Deviations Registry](./HARDENING_DEVIATIONS_REGISTRY.md)** - Central tracking of all deviations

### Templates

- **[Deviation Template](./templates/DEVIATION_TEMPLATE.md)** - Template for documenting new deviations
- **[PR Template](../../.github/PULL_REQUEST_TEMPLATE/hardening_deviation.md)** - Pull request template for deviations

### Examples

- **[Example Deviation](./deviations/DEV-2026-EXAMPLE.md)** - Complete example of a documented deviation

---

## For Developers

### When to Document a Hardening Deviation

You must document a hardening deviation when:

1. ✅ A component configuration cannot meet a hardening guideline
2. ✅ A security control must be implemented differently than the baseline
3. ✅ A third-party service has security limitations
4. ✅ Technical constraints prevent full compliance with a standard
5. ✅ Performance or functional requirements conflict with security controls

### Quick Start Guide

**Step 1:** Copy the template

```bash
cp docs/security/templates/DEVIATION_TEMPLATE.md docs/security/deviations/DEV-2026-XXX.md
```

**Step 2:** Fill out all sections of the template

- Document what guideline is not met
- Explain why it's necessary
- Perform risk assessment
- Document compensating controls
- Analyze alternatives

**Step 3:** Create a pull request

- Use the hardening deviation PR template
- Add label: `security/hardening-deviation`
- Request reviews from required approvers
- Link to Linear/GitHub issue

**Step 4:** After approval

- Update the deviations registry
- Add deviation ID comments in code
- Schedule review reminder

**Full Process:** See [HARDENING_DEVIATION_PROCESS.md](./HARDENING_DEVIATION_PROCESS.md)

---

## For Security Reviewers

### Review Responsibilities

As a security reviewer, you must:

1. **Validate Risk Assessment**
   - Verify risk level is accurately assigned
   - Check threat analysis is complete
   - Confirm impact assessment is realistic

2. **Evaluate Compensating Controls**
   - Ensure mitigations adequately address risk
   - Verify controls are implemented correctly
   - Check residual risk is acceptable

3. **Review Alternative Analysis**
   - Confirm no compliant alternatives were missed
   - Validate technical constraints
   - Assess if temporary resolution is feasible

4. **Approve or Reject**
   - Provide clear feedback
   - Document approval conditions if any
   - Set appropriate review schedule

### Review Checklist

Use this checklist when reviewing deviation requests:

- [ ] Deviation ID is unique and follows format (DEV-YYYY-NNN)
- [ ] All required sections are completed
- [ ] Hardening guideline reference is specific and accurate
- [ ] Business/technical justification is clear and valid
- [ ] Risk assessment is thorough and realistic
- [ ] Alternative analysis shows due diligence
- [ ] Compensating controls are adequate
- [ ] Residual risk is acceptable
- [ ] Implementation details are provided
- [ ] Review schedule is defined
- [ ] Required approvers are assigned

---

## For Auditors

### Compliance Evidence

The hardening deviation process provides complete audit trails:

1. **Documentation:** Every deviation is fully documented with risk assessment
2. **Approvals:** PR reviews show who approved and when
3. **Tracking:** Central registry provides overview of all deviations
4. **Monitoring:** Periodic reviews ensure ongoing appropriateness
5. **Git History:** Complete change history with timestamps

### Audit Support Documents

- **Process Documentation:** Shows formal process is established
- **Registry:** Demonstrates deviations are tracked
- **Review History:** Proves periodic reviews occur
- **Approval Matrix:** Shows appropriate governance
- **Risk Dashboard:** Provides risk visibility

### Compliance Mapping

| SSD Requirement | Implementation | Evidence |
|-----------------|----------------|----------|
| SSD-1.3.05: Document deviations | Deviation template and process | Process document + deviation files |
| SSD-1.3.05: Report to client | PR workflow with stakeholder visibility | Git history + PR threads |
| SSD-1.3.05: Client approval | Approval matrix by risk level | PR approvals + approval table in deviation docs |
| SSD-1.3.05: Periodic review | Quarterly review schedule | Review history in registry |

---

## Security Incidents

### If You Discover a Security Issue Related to a Deviation

1. **Assess Severity**
   - Critical: Immediate escalation required
   - High: Escalate within 24 hours
   - Medium: Report to security team
   - Low: Document in next review

2. **Immediate Actions**
   - Contain the issue if possible
   - Document the incident
   - Notify security team
   - Create incident ticket

3. **Follow-up**
   - Review deviation appropriateness
   - Update risk assessment
   - Implement additional controls
   - Consider remediation or closure

---

## Periodic Review Schedule

### Quarterly Activities

- Review all active deviations
- Update risk assessments if threat landscape changed
- Check for compliant alternatives that now exist
- Update registry with current status
- Report to stakeholders

### Annual Activities

- Comprehensive security audit
- Standards compliance review
- Update security baselines
- Refresh team training
- Archive closed deviations

---

## Contact Information

### Security Team

**Email:** security@inovy.nl  
**Slack Channel:** #security (if applicable)  
**On-Call:** [Emergency contact for security incidents]

### Process Questions

For questions about the hardening deviation process:

1. Read the [Hardening Deviation Process](./HARDENING_DEVIATION_PROCESS.md) document
2. Check the [Example Deviation](./deviations/DEV-2026-EXAMPLE.md)
3. Contact the Security Engineering Team

---

## Related Documentation

### Internal

- [Application README](../../README.md) - Application overview and tech stack
- [Architecture Documentation](../architecture/) - System architecture (if exists)
- [SSD Compliance Tracker](../../SSD_REMAINING_USER_STORIES.md) - Compliance user stories

### External Standards

- **BIO:** https://www.bio-overheid.nl/
- **NEN 7510:** https://www.nen.nl/nen-7510-2017-nl-248879
- **AVG/GDPR:** https://gdpr.eu/
- **OWASP:** https://owasp.org/
- **CIS Benchmarks:** https://www.cisecurity.org/cis-benchmarks
- **NIST CSF:** https://www.nist.gov/cyberframework

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-24 | Security Engineering Team | Initial creation of security documentation structure |

---

**Document Maintained By:** Security Engineering Team  
**Next Review:** 2026-05-24
