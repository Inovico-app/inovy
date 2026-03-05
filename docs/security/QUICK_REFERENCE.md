# Hardening Deviation Process - Quick Reference Guide

**For:** Developers & Security Engineers  
**Last Updated:** 2026-02-24

## When Do I Need to Document a Deviation?

Document a hardening deviation when:

✅ Component configuration cannot meet a hardening guideline  
✅ Security control must be implemented differently  
✅ Third-party service has security limitations  
✅ Technical constraints prevent full compliance  
✅ Performance/functional requirements conflict with security controls

## Quick Process (5 Steps)

### Step 1: Create Deviation Document (15 min)

```bash
# Copy template
cp docs/security/templates/DEVIATION_TEMPLATE.md \
   docs/security/deviations/DEV-2026-XXX.md

# Fill out all required sections
```

**Required Sections:**

- Component information
- Guideline reference
- Deviation description
- Justification
- Risk assessment ⚠️
- Compensating controls ⚠️
- Alternative analysis

### Step 2: Assess Risk (10 min)

**Risk Levels:**

- **Critical:** Data breach, system compromise, compliance violation
- **High:** Significant weakness, moderate effort to exploit
- **Medium:** Moderate impact, specific conditions needed
- **Low:** Minimal impact, unlikely exploitation

**Required Approvals by Risk:**

| Risk | Approvers |
|------|-----------|
| Critical | Security Engineer + Tech Lead + Client |
| High | Security Engineer + Tech Lead |
| Medium | Security Engineer OR Tech Lead |
| Low | Tech Lead |

### Step 3: Create Pull Request (5 min)

```bash
# Create feature branch
git checkout -b security/hardening-deviation-[component]-[description]

# Add deviation document
git add docs/security/deviations/DEV-2026-XXX.md

# Commit
git commit -m "security: Document hardening deviation DEV-2026-XXX"

# Push and create PR
git push -u origin security/hardening-deviation-[component]-[description]
```

**PR Requirements:**

- Use hardening deviation PR template
- Add label: `security/hardening-deviation`
- Assign required approvers
- Link to Linear/GitHub issue

### Step 4: Obtain Approval (varies)

Wait for required approvals based on risk level.

**Reviewer Focus:**

- Risk assessment accuracy
- Compensating controls adequacy
- Alternative analysis completeness
- Residual risk acceptability

### Step 5: After Approval (5 min)

```bash
# Update registry
# Edit: docs/security/HARDENING_DEVIATIONS_REGISTRY.md
# Add your deviation to "Active Deviations" section
```

**Post-Approval Tasks:**

- Update hardening deviations registry
- Add deviation ID comments in code
- Schedule review reminder
- Notify stakeholders

---

## Risk Assessment Cheat Sheet

### Likelihood Scale

| Level | Description |
|-------|-------------|
| Very High | Almost certain to occur |
| High | Likely to occur |
| Medium | Could occur occasionally |
| Low | Unlikely to occur |
| Very Low | Extremely unlikely |

### Impact Scale

| Level | Description |
|-------|-------------|
| Critical | Data breach, major system compromise |
| High | Significant data exposure or service disruption |
| Medium | Moderate impact on security or operations |
| Low | Minor impact, limited scope |
| Negligible | No meaningful impact |

### Risk Matrix

```
Likelihood × Impact = Risk Level

         │ Low   │ Med   │ High  │ Crit  │
─────────┼───────┼───────┼───────┼───────┤
Very High│ Med   │ High  │ Crit  │ Crit  │
High     │ Med   │ High  │ High  │ Crit  │
Medium   │ Low   │ Med   │ High  │ High  │
Low      │ Low   │ Low   │ Med   │ High  │
Very Low │ Low   │ Low   │ Low   │ Med   │
```

---

## Compensating Controls Examples

### Common Compensating Controls

1. **Environment Separation**
   - Deviation only in dev/staging, not production
   - Separate credentials per environment

2. **Additional Monitoring**
   - Enhanced logging
   - Real-time alerting
   - Security monitoring

3. **Network Controls**
   - Network isolation
   - Firewall rules
   - VPN requirements

4. **Access Controls**
   - Additional authentication
   - Stricter authorization
   - IP allowlisting

5. **Process Controls**
   - Manual review processes
   - Approval workflows
   - Regular audits

### Evaluating Control Effectiveness

Good compensating controls:

✅ Directly address the risk introduced by deviation  
✅ Are verifiable and can be tested  
✅ Don't introduce new risks  
✅ Are maintained and monitored  
✅ Reduce residual risk to acceptable level

---

## Code Comment Format

Reference deviations in code:

```typescript
// SECURITY DEVIATION: DEV-2026-001
// Component: Redis connection configuration
// Deviation: TLS certificate validation disabled in development
// Approved: 2026-02-24 | Review: 2026-08-24
// See: docs/security/deviations/DEV-2026-001.md
if (process.env.NODE_ENV !== 'production') {
  tlsConfig.rejectUnauthorized = false;
}
```

---

## Common Scenarios

### Scenario 1: Third-Party Service Limitation

**Example:** SaaS provider doesn't support required encryption standard

**Steps:**

1. Document the limitation
2. Assess risk of using service as-is
3. Document compensating controls (e.g., additional encryption layer)
4. Evaluate alternative providers
5. Get client approval for risk acceptance

### Scenario 2: Development Environment Configuration

**Example:** Local development needs self-signed certificates

**Steps:**

1. Document environment-specific deviation
2. Ensure production remains compliant
3. Show clear separation (env checks, config)
4. Classify as low risk (dev data only)
5. Get technical lead approval

### Scenario 3: Performance vs Security Trade-off

**Example:** Security control impacts performance significantly

**Steps:**

1. Document performance requirements
2. Show performance testing results
3. Explore optimization options
4. Document any partial implementation
5. Assess risk of reduced security
6. Get appropriate approvals

### Scenario 4: Legacy System Integration

**Example:** Must integrate with system that doesn't support modern security

**Steps:**

1. Document legacy system constraints
2. Assess risk of integration
3. Implement isolation/segmentation
4. Add monitoring and alerting
5. Create migration plan (if temporary)
6. Get client approval

---

## FAQs

### Q: Do I need approval for every security-related change?

**A:** No. Only deviations from established hardening guidelines require the formal deviation process. Standard security implementations and improvements do not.

### Q: How long does the approval process take?

**A:** Depends on risk level and approver availability:

- Low risk: 1-2 days
- Medium risk: 2-3 days
- High risk: 3-5 days
- Critical risk: 1 week+ (requires client approval)

### Q: Can I implement the deviation before approval?

**A:** No. Deviations must be approved before implementation. You can prepare the code but don't merge until approved.

### Q: What if an emergency requires a deviation?

**A:** For genuine emergencies:

1. Document the deviation immediately
2. Implement with technical lead approval
3. Complete full approval process retrospectively
4. Set urgent review date

### Q: How do I know what hardening guidelines apply?

**A:** See [docs/security/SECURITY_BASELINES.md](./SECURITY_BASELINES.md) for complete guidelines organized by component type.

### Q: What if I'm not sure if something is a deviation?

**A:** When in doubt, ask the security team. It's better to over-document than miss a required deviation.

---

## Helpful Commands

```bash
# View active deviations
cat docs/security/HARDENING_DEVIATIONS_REGISTRY.md

# Find deviation references in code
grep -r "SECURITY DEVIATION" --include="*.ts" --include="*.tsx"

# Check security labels on PRs
gh pr list --label "security/hardening-deviation"

# View security documentation
ls -la docs/security/
```

---

## Resources

**Full Documentation:**

- [Hardening Deviation Process](./HARDENING_DEVIATION_PROCESS.md)
- [Security Baselines](./SECURITY_BASELINES.md)
- [Hardening Deviations Registry](./HARDENING_DEVIATIONS_REGISTRY.md)

**Templates:**

- [Deviation Template](./templates/DEVIATION_TEMPLATE.md)
- [PR Template](../../.github/PULL_REQUEST_TEMPLATE/hardening_deviation.md)

**Examples:**

- [Example Deviation](./deviations/DEV-2026-EXAMPLE.md)

**Contact:**

- Security Team: security@inovy.nl
- Questions: #security channel (if applicable)

---

**Quick Reference Version:** 1.0  
**Last Updated:** 2026-02-24
