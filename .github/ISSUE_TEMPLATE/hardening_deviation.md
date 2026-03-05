---
name: Hardening Deviation
about: Report a need for hardening guideline deviation
title: '[DEVIATION] [Component] - [Brief Description]'
labels: 'security/hardening-deviation, needs-analysis'
assignees: ''
---

# Hardening Deviation Request

**⚠️ This issue is for tracking a potential hardening deviation**

## Component Information

**Component Name:** [Name of affected component]  
**Component Type:** [Infrastructure / Application / Service / Database / etc.]  
**Environment:** [Development / Staging / Production / All]

## Hardening Guideline

**Standard:** [BIO / NEN 7510 / OWASP / CIS / NIST / Other]  
**Control ID:** [Specific control identifier, e.g., BIO-11.2.3]  
**Control Name:** [Name of the control]  

**Guideline Description:**

[Briefly describe what the hardening guideline requires]

## Deviation Need

### What Cannot Be Met

[Describe specifically what aspect of the hardening guideline cannot be followed]

### Why It's Needed

[Explain the technical or business reason why the deviation is necessary]

### Initial Risk Assessment

**Estimated Risk Level:** ☐ Critical | ☐ High | ☐ Medium | ☐ Low

[Brief explanation of risk]

## Next Steps

- [ ] Assign to security engineer for detailed risk assessment
- [ ] Document deviation using template at `docs/security/templates/DEVIATION_TEMPLATE.md`
- [ ] Create PR with deviation documentation
- [ ] Obtain required approvals
- [ ] Update hardening deviations registry

## Context

[Any additional context that would help reviewers understand this deviation]

## Related Issues

- Related to: [Link to other issues]
- Linear: [INO2-XXX]

---

**Note:** This issue tracks the need for a deviation. The actual documentation and approval will be done through a pull request following the [Hardening Deviation Process](../../docs/security/HARDENING_DEVIATION_PROCESS.md).
