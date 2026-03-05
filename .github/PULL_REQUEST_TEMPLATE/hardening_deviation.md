---
name: Hardening Deviation
about: Submit a hardening deviation for review and approval
title: 'security: Hardening Deviation - [Component] - [Short Description]'
labels: 'security/hardening-deviation, needs-review'
---

# Hardening Deviation Request

**⚠️ SECURITY DEVIATION - Requires Approval Before Merge**

## Deviation Summary

**Deviation ID:** DEV-YYYY-NNN  
**Component:** [Name of affected component]  
**Risk Level:** ☐ Critical | ☐ High | ☐ Medium | ☐ Low  
**Duration:** ☐ Temporary | ☐ Permanent  

**One-line summary:** [Brief description of what hardening guideline is not being met]

---

## Quick Reference Checklist

Before submitting this PR, ensure you have:

- [ ] Created a deviation document using the template at `docs/security/templates/DEVIATION_TEMPLATE.md`
- [ ] Saved deviation document to `docs/security/deviations/DEV-YYYY-NNN.md`
- [ ] Completed risk assessment with threat analysis
- [ ] Documented compensating controls
- [ ] Analyzed alternative approaches
- [ ] Added appropriate reviewers based on risk level
- [ ] Linked to related Linear issue or GitHub issue
- [ ] Referenced deviation ID in relevant code comments
- [ ] Updated the hardening deviations registry

---

## Deviation Documentation

**Full Documentation:** `docs/security/deviations/DEV-YYYY-NNN.md`

### Hardening Guideline Reference

**Standard:** [BIO / NEN 7510 / OWASP / CIS / NIST]  
**Control ID:** [Specific control identifier]  
**Control Requirement:** [Brief description of the guideline]

### Deviation Description

[Provide a clear, concise description of what is being deviated and why]

### Why This Deviation is Necessary

[Explain the technical or business justification]

---

## Risk Assessment Summary

### Risk Level Justification

**Risk Level:** [Critical / High / Medium / Low]

[Explain why this risk level was assigned]

### Threat Analysis

**Potential Threats:**

1. [Primary threat]
2. [Secondary threat]

**Likelihood:** [Very High / High / Medium / Low / Very Low]  
**Impact:** [Critical / High / Medium / Low / Negligible]

### Data Sensitivity

**Data Classification:** [Public / Internal / Confidential / Highly Confidential]

**Sensitive Data Types Affected:**

- [ ] PII (Personal Identifiable Information)
- [ ] PHI (Protected Health Information)
- [ ] Financial Data
- [ ] Authentication Credentials
- [ ] Other: [Specify]

---

## Compensating Controls

List all mitigations that reduce the risk:

1. **[Control 1]:** [Description and how it reduces risk]
2. **[Control 2]:** [Description and how it reduces risk]
3. **[Control 3]:** [Description and how it reduces risk]

**Residual Risk After Controls:** [Critical / High / Medium / Low / Negligible]

---

## Alternative Analysis

### Compliant Alternatives Considered

1. **[Alternative 1]**
   - **Description:** [Brief description]
   - **Why Not Viable:** [Reason]

2. **[Alternative 2]**
   - **Description:** [Brief description]
   - **Why Not Viable:** [Reason]

---

## Implementation Details

### Files Changed

List key files affected by this deviation:

- `[path/to/file1]` - [Brief description of changes]
- `[path/to/file2]` - [Brief description of changes]

### Configuration Changes

```diff
# Show relevant configuration changes
- old_configuration_line
+ new_configuration_line
```

### Code References

Reference the deviation ID in code comments:

```typescript
// SECURITY DEVIATION: DEV-YYYY-NNN
// [Brief explanation of why deviation is needed]
// Approved: [Date] | Review Date: [Date]
```

---

## Testing and Verification

### Testing Performed

- [ ] Verified functionality with deviation in place
- [ ] Tested compensating controls work as expected
- [ ] Confirmed production configuration remains compliant
- [ ] Validated environment-specific behavior
- [ ] Security testing performed (if applicable)

### Verification Results

[Describe testing results and how you verified the implementation]

---

## Review Schedule

**Next Review Date:** YYYY-MM-DD  
**Review Frequency:** ☐ Monthly | ☐ Quarterly | ☐ Semi-annually | ☐ Annually  

### Temporary Deviation Only

*If temporary, complete this section:*

**Expected Resolution Date:** YYYY-MM-DD  
**Remediation Plan:** [How will full compliance be achieved?]

---

## Required Approvals

Based on risk level, this PR requires approval from:

### Critical Risk
- [ ] Security Engineer
- [ ] Technical Lead
- [ ] Product Owner
- [ ] Client Representative

### High Risk
- [ ] Security Engineer
- [ ] Technical Lead

### Medium Risk
- [ ] Security Engineer OR Technical Lead

### Low Risk
- [ ] Technical Lead

---

## Related Issues and Documentation

**Linear Issue:** [INO2-XXX]  
**Related PRs:** [#PR1, #PR2]  
**Related Deviations:** [DEV-YYYY-NNN]  
**Compliance Documentation:** SSD-1.3.05  

---

## Reviewer Guidelines

### For Security Engineers

Review focus areas:

- [ ] Risk assessment is accurate and complete
- [ ] Compensating controls adequately address the risk
- [ ] Residual risk is acceptable
- [ ] Alternative analysis is thorough
- [ ] Monitoring and review schedule is appropriate

### For Technical Leads

Review focus areas:

- [ ] Technical justification is valid
- [ ] Implementation is correct and follows patterns
- [ ] No compliant alternatives were overlooked
- [ ] Code quality and maintainability standards are met
- [ ] Documentation is complete

### For All Reviewers

- [ ] Deviation documentation is complete and clear
- [ ] PR follows hardening deviation process
- [ ] Appropriate risk level is assigned
- [ ] Required approvers are included
- [ ] Review schedule is defined

---

## Post-Approval Actions

After approval and merge:

- [ ] Update `docs/security/HARDENING_DEVIATIONS_REGISTRY.md` with this deviation
- [ ] Schedule calendar reminder for next review date
- [ ] Notify stakeholders of approved deviation
- [ ] Add to compliance reporting documentation
- [ ] Update architecture diagrams if applicable

---

## Additional Notes

[Any additional context, concerns, or information that reviewers should know]

---

## References

- **Deviation Process:** `docs/security/HARDENING_DEVIATION_PROCESS.md`
- **Template:** `docs/security/templates/DEVIATION_TEMPLATE.md`
- **Registry:** `docs/security/HARDENING_DEVIATIONS_REGISTRY.md`
