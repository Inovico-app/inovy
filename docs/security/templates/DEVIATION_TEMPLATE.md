# Hardening Deviation: [Component Name] - [Short Description]

**Deviation ID:** DEV-YYYY-NNN  
**Status:** Draft | Under Review | Approved | Rejected | Implemented | Closed  
**Created:** YYYY-MM-DD  
**Created By:** [Name]  
**Last Updated:** YYYY-MM-DD  

---

## 1. Component Information

### Affected Component

**Component Name:** [Name of the ICT component]  
**Component Type:** [Infrastructure / Application / Service / Database / etc.]  
**Component Owner:** [Team/Individual responsible]  
**Environment:** [Development / Staging / Production / All]  

### Related Systems

- List any dependent or related systems affected by this deviation

---

## 2. Hardening Guideline Reference

### Guideline Not Met

**Standard:** [BIO / NEN 7510 / OWASP / CIS / NIST / Other]  
**Control ID:** [Specific control identifier]  
**Control Title:** [Name of the control]  
**Control Requirement:** 

> [Exact text of the guideline/control that cannot be met]

**Reference Link:** [URL to the standard or guideline document]

---

## 3. Deviation Description

### What is Being Deviated

Clearly describe what aspect of the hardening guideline is not being followed:

[Detailed description of the specific configuration, implementation, or practice that deviates from the guideline]

### Current Implementation

Describe what is currently implemented instead:

```
[Code, configuration, or implementation details]
```

### Expected Compliant Implementation

Describe what a fully compliant implementation would look like:

```
[Code, configuration, or implementation details for compliance]
```

---

## 4. Justification

### Business/Technical Reason

Explain why the deviation is necessary:

- **Technical Constraint:** [If applicable - describe technical limitation]
- **Business Requirement:** [If applicable - describe business need]
- **Third-Party Limitation:** [If applicable - describe vendor/service constraint]
- **Resource Constraint:** [If applicable - describe cost/time/resource limitation]
- **Functional Impact:** [If applicable - describe impact on functionality if compliant]

### Alternative Analysis

Document alternatives that were considered and why they were rejected:

1. **Alternative 1:** [Description]
   - **Why Rejected:** [Reason]

2. **Alternative 2:** [Description]
   - **Why Rejected:** [Reason]

3. **Alternative 3:** [Description]
   - **Why Rejected:** [Reason]

---

## 5. Risk Assessment

### Risk Classification

**Risk Level:** ☐ Critical | ☐ High | ☐ Medium | ☐ Low

**Risk Rating Justification:**

[Explain why this risk level was assigned]

### Threat Analysis

**Potential Threats:**

1. [Threat 1 - e.g., Unauthorized access]
2. [Threat 2 - e.g., Data exposure]
3. [Threat 3 - e.g., Service disruption]

**Likelihood:** ☐ Very High | ☐ High | ☐ Medium | ☐ Low | ☐ Very Low

**Impact if Exploited:** ☐ Critical | ☐ High | ☐ Medium | ☐ Low | ☐ Negligible

### Attack Vectors

List potential attack vectors that this deviation might enable:

1. [Attack vector 1]
2. [Attack vector 2]

### Data Sensitivity

**Data Classification:** ☐ Public | ☐ Internal | ☐ Confidential | ☐ Highly Confidential

**Data Types Affected:**

- [ ] Personal Identifiable Information (PII)
- [ ] Health Information (PHI/Medical data)
- [ ] Financial Data
- [ ] Authentication Credentials
- [ ] Business Confidential
- [ ] Other: [Specify]

---

## 6. Compensating Controls

### Implemented Mitigations

List all compensating controls that reduce the risk:

1. **Control 1:** [Description]
   - **Implementation:** [How it's implemented]
   - **Effectiveness:** [How it mitigates the risk]
   - **Verification:** [How to verify it's working]

2. **Control 2:** [Description]
   - **Implementation:** [How it's implemented]
   - **Effectiveness:** [How it mitigates the risk]
   - **Verification:** [How to verify it's working]

3. **Control 3:** [Description]
   - **Implementation:** [How it's implemented]
   - **Effectiveness:** [How it mitigates the risk]
   - **Verification:** [How to verify it's working]

### Additional Monitoring

- [Specific monitoring or alerting implemented]
- [Logging requirements]
- [Detection capabilities]

### Residual Risk

After compensating controls, the residual risk is:

**Residual Risk Level:** ☐ Critical | ☐ High | ☐ Medium | ☐ Low | ☐ Negligible

**Residual Risk Description:**

[Describe the remaining risk after all mitigations]

---

## 7. Deviation Metadata

### Classification

**Deviation Type:** ☐ Configuration | ☐ Implementation | ☐ Architecture | ☐ Process | ☐ Third-Party

**Duration:** ☐ Temporary | ☐ Permanent

**Scope:** ☐ Single Component | ☐ Multiple Components | ☐ System-wide

### Temporary Deviation Details

*Only complete if temporary*

**Expected Resolution Date:** YYYY-MM-DD  
**Remediation Plan:**

[Describe the plan to achieve compliance]

**Blockers to Compliance:**

- [What needs to happen to become compliant]

---

## 8. Approval

### Approval History

| Date | Approver | Role | Decision | Comments |
|------|----------|------|----------|----------|
| YYYY-MM-DD | [Name] | Security Engineer | Approved / Rejected / Conditional | [Comments] |
| YYYY-MM-DD | [Name] | Technical Lead | Approved / Rejected / Conditional | [Comments] |
| YYYY-MM-DD | [Name] | Client Rep | Approved / Rejected / Conditional | [Comments] |

### Approval Conditions

*If approved with conditions, list them here:*

1. [Condition 1]
2. [Condition 2]

### Final Decision

**Status:** ☐ Approved | ☐ Approved with Conditions | ☐ Rejected | ☐ Deferred

**Decision Date:** YYYY-MM-DD  
**Decision By:** [Name and Role]  
**Decision Rationale:**

[Explain the final approval decision]

---

## 9. Implementation

### Implementation Date

**Implemented:** YYYY-MM-DD  
**Implemented By:** [Name]  
**Implementation PR:** #[PR number]  
**Deployment Environment:** [Dev / Staging / Production]

### Verification

**Verification Method:**

- [How the deviation was verified to work as intended]
- [How compensating controls were verified]

**Verified By:** [Name]  
**Verification Date:** YYYY-MM-DD

---

## 10. Review and Monitoring

### Review Schedule

**Next Review Date:** YYYY-MM-DD  
**Review Frequency:** ☐ Monthly | ☐ Quarterly | ☐ Semi-annually | ☐ Annually

### Review History

| Review Date | Reviewer | Status | Changes | Next Review |
|-------------|----------|--------|---------|-------------|
| YYYY-MM-DD | [Name] | Active / Remediated / Closed | [Summary] | YYYY-MM-DD |

### Monitoring Requirements

- [Specific monitoring that should be in place]
- [Alerts that should trigger]
- [Metrics to track]

---

## 11. Closure

### Closure Criteria

*Complete when deviation is resolved or no longer needed*

**Closed Date:** YYYY-MM-DD  
**Closed By:** [Name]  
**Closure Reason:** ☐ Remediated | ☐ No Longer Applicable | ☐ Replaced by New Control

**Closure Notes:**

[Explain how the deviation was resolved or why it was closed]

---

## 12. Related Documentation

### References

- **Linear Issue:** [INO2-XXX]
- **Pull Requests:** [#PR1, #PR2]
- **Related Deviations:** [DEV-YYYY-NNN, DEV-YYYY-NNN]
- **Compliance Documentation:** [Links to relevant compliance docs]
- **Architecture Decisions:** [Links to ADRs if applicable]

### Attachments

- [Risk assessment documents]
- [Vendor security documentation]
- [Configuration files]
- [Screenshots or diagrams]

---

## Change Log

| Date | Author | Change Description |
|------|--------|-------------------|
| YYYY-MM-DD | [Name] | Initial creation |
| YYYY-MM-DD | [Name] | Risk assessment updated |
| YYYY-MM-DD | [Name] | Approved by stakeholders |
| YYYY-MM-DD | [Name] | Implementation completed |
