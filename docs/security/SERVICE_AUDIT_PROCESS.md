# Service Audit Process
## SSD-1.3.02: Regular Service Audits

**Last Updated:** 2026-02-24  
**Status:** Active  
**Compliance:** SSD-1.3.02 - Regular audits to ensure only design-required services are enabled

---

## Purpose

This document defines the process for regularly auditing services to ensure compliance with SSD-1.3.02. The audit process ensures:
1. Only design-required services are enabled
2. Unused services are identified and disabled
3. New services are properly justified and documented
4. Security posture is maintained

---

## Audit Schedule

### 1. Quarterly Service Audit (Every 3 Months)
**Responsibility:** Development Team Lead + Security Officer  
**Duration:** 2-4 hours  
**Output:** Updated SERVICE_INVENTORY.md + Audit Report

### 2. Annual Comprehensive Audit (Yearly)
**Responsibility:** CTO + External Security Auditor (if applicable)  
**Duration:** 1-2 days  
**Output:** Full security assessment report

### 3. Triggered Audits (As Needed)
**Triggers:**
- Before production releases
- After security incidents
- When adding new third-party integrations
- When entering new markets or use cases
- After regulatory changes

---

## Quarterly Audit Checklist

### Phase 1: Discovery (30 minutes)

#### 1.1 Identify All API Endpoints
```bash
# Run from workspace root
cd apps/web
find src/app/api -name "route.ts" -type f | sort
```

**Expected Output:** List of all API route files  
**Action:** Compare against SERVICE_INVENTORY.md, identify new routes

#### 1.2 Identify All Server Actions
```bash
# Run from workspace root
cd apps/web
find src/features -name "*.ts" -path "*/actions/*" -type f | sort
```

**Expected Output:** List of all server action files  
**Action:** Compare against SERVICE_INVENTORY.md, identify new actions

#### 1.3 Identify All Service Classes
```bash
# Run from workspace root
cd apps/web
find src/server/services -name "*.ts" -type f | sort
```

**Expected Output:** List of all service files  
**Action:** Compare against SERVICE_INVENTORY.md, identify new services

#### 1.4 Review Environment Variables
```bash
# Check .env.example for new configuration
cd apps/web
cat .env.example | grep -E "^[A-Z_]+=" | sort
```

**Expected Output:** List of all environment variables  
**Action:** Identify new feature flags or service configurations

---

### Phase 2: Service Review (60-90 minutes)

For each service identified, complete this checklist:

#### Service Evaluation Checklist

| Question | Yes/No | Notes |
|----------|--------|-------|
| **1. Design Requirement** |  |  |
| Is this service required by product design? |  |  |
| Does it support a documented user story or feature? |  |  |
| Is there a business justification documented? |  |  |
| **2. Security** |  |  |
| Does the service handle sensitive data (PII, medical)? |  |  |
| Is authentication required and properly implemented? |  |  |
| Is authorization properly enforced? |  |  |
| Are inputs validated and sanitized? |  |  |
| Are outputs properly encoded? |  |  |
| **3. Compliance** |  |  |
| Does the service comply with AVG/GDPR? |  |  |
| Does the service comply with NEN 7510? |  |  |
| Is audit logging implemented if required? |  |  |
| Is data retention policy followed? |  |  |
| **4. Control Mechanisms** |  |  |
| Can the service be disabled via feature flag? |  |  |
| Can the service be disabled per organization? |  |  |
| Are rate limits implemented? |  |  |
| Is there an emergency kill switch? |  |  |
| **5. Necessity** |  |  |
| Has the service been used in the last quarter? |  |  |
| Are there user requests for this functionality? |  |  |
| Is there an alternative way to achieve the goal? |  |  |
| Can this service be consolidated with another? |  |  |

#### For New Services (Not in Previous Inventory)

**Required Actions:**
1. ✅ Document business justification
2. ✅ Security review completed
3. ✅ Compliance review completed
4. ✅ Control mechanisms implemented
5. ✅ Added to SERVICE_INVENTORY.md
6. ✅ Decision logged in audit trail

#### For Existing Services

**Review Criteria:**
- ✅ Still required by design
- ✅ Usage metrics reviewed (if available)
- ✅ No security issues identified
- ✅ Compliance maintained
- ✅ Control mechanisms functional

---

### Phase 3: Unused Service Identification (30 minutes)

#### 3.1 Review Usage Metrics

```bash
# If analytics are available, review service usage
# Check logs for API endpoint calls in last 90 days
```

**Identify:**
- Services with zero usage in last quarter
- Services with declining usage
- Services marked as "experimental" or "beta"

#### 3.2 Evaluate for Removal

For each unused service, determine:

| Evaluation Criteria | Decision |
|---------------------|----------|
| Zero usage for 90+ days | Consider removal |
| Declining usage (>50% drop) | Review necessity |
| Experimental/beta status | Evaluate production readiness or remove |
| Superseded by another service | Mark for deprecation |
| Security concerns | Immediate disable/remove |

#### 3.3 Create Removal Plan

For services to be removed:
1. Document removal justification
2. Create deprecation timeline (if needed)
3. Notify stakeholders
4. Plan code removal
5. Update documentation

---

### Phase 4: Configuration Audit (30 minutes)

#### 4.1 Review Feature Flags

Check all feature flags are properly set:

```bash
# Review environment configuration
cd apps/web
cat .env.example
```

**Verify:**
- [ ] `ENABLE_ENCRYPTION_AT_REST` is set appropriately
- [ ] Third-party API keys are only set if services are required
- [ ] Development-only features are disabled in production
- [ ] Rate limits are configured appropriately

#### 4.2 Review Per-Organization Settings

**Check Database Configuration:**
```sql
-- Review agent settings across organizations
SELECT 
  o.id,
  o.name,
  os.agent_enabled,
  os.bot_enabled
FROM organizations o
LEFT JOIN organization_settings os ON o.id = os.organization_id;
```

**Verify:**
- [ ] Agent settings match organization requirements
- [ ] Bot settings are appropriate for organization type
- [ ] No unauthorized service access

#### 4.3 Review Role-Based Access Control

**Verify:**
- [ ] Admin routes are properly restricted
- [ ] Sensitive operations require appropriate permissions
- [ ] Organization isolation is enforced
- [ ] API authentication is required

---

### Phase 5: Documentation Update (30 minutes)

#### 5.1 Update SERVICE_INVENTORY.md

- [ ] Add new services discovered
- [ ] Update status of existing services
- [ ] Mark deprecated services
- [ ] Update control mechanisms
- [ ] Add audit trail entry

#### 5.2 Update Related Documentation

- [ ] Update README if services changed
- [ ] Update API documentation
- [ ] Update deployment documentation
- [ ] Update security documentation

#### 5.3 Create Audit Report

**Audit Report Template:**

```markdown
# Service Audit Report

## Date: [Date]
## Auditor: [Name]
## Period Covered: [Date Range]

### Summary
- Total Services: [Number]
- New Services: [Number]
- Removed Services: [Number]
- Services Under Review: [Number]

### New Services Identified
| Service | Justification | Status |
|---------|---------------|--------|
| [Name] | [Reason] | [Approved/Rejected] |

### Services Removed
| Service | Reason | Date Removed |
|---------|--------|--------------|
| [Name] | [Reason] | [Date] |

### Services Under Review
| Service | Issue | Action Required |
|---------|-------|-----------------|
| [Name] | [Issue] | [Action] |

### Compliance Status
- [ ] All services have documented justification
- [ ] No unauthorized services identified
- [ ] Feature flags properly configured
- [ ] Security controls verified
- [ ] Documentation updated

### Action Items
1. [Action 1] - Assigned to: [Name] - Due: [Date]
2. [Action 2] - Assigned to: [Name] - Due: [Date]

### Next Audit Date: [Date]
```

---

## Annual Comprehensive Audit

### Extended Checklist

In addition to quarterly audit, include:

#### 1. Third-Party Integration Review
- [ ] Review all OAuth integrations
- [ ] Audit third-party API usage
- [ ] Review data sharing agreements
- [ ] Verify vendor security certifications
- [ ] Check for alternative providers

#### 2. Compliance Deep Dive
- [ ] Full AVG/GDPR compliance review
- [ ] NEN 7510 security audit
- [ ] Data retention policy verification
- [ ] Consent management review
- [ ] Audit log completeness check

#### 3. Architecture Review
- [ ] Service decomposition opportunities
- [ ] Microservices vs monolith evaluation
- [ ] API versioning strategy
- [ ] Deprecation roadmap
- [ ] Performance optimization opportunities

#### 4. Security Assessment
- [ ] Penetration testing (if not done separately)
- [ ] Dependency vulnerability scan
- [ ] Security header review
- [ ] HTTPS/TLS configuration
- [ ] Rate limiting effectiveness
- [ ] Logging and monitoring adequacy

#### 5. Risk Assessment
- [ ] Identify high-risk services
- [ ] Evaluate single points of failure
- [ ] Review disaster recovery plans
- [ ] Assess data breach scenarios
- [ ] Update risk register

---

## Service Approval Process

### Adding New Services

When adding a new service, follow this approval process:

#### 1. Proposal Phase
**Required Documentation:**
- Business justification (which user story/feature does this support?)
- Technical design document
- Security considerations
- Compliance impact assessment
- Control mechanisms (how can it be disabled?)
- Alternative solutions considered

**Approval Required:** Product Owner + Tech Lead

#### 2. Implementation Phase
**Required Actions:**
- [ ] Security review by security officer
- [ ] Compliance review (if handling sensitive data)
- [ ] Code review with security focus
- [ ] Integration with feature flag system
- [ ] Rate limiting implemented
- [ ] Audit logging added (if required)
- [ ] Documentation created

**Approval Required:** Tech Lead + Security Officer

#### 3. Deployment Phase
**Required Actions:**
- [ ] Add to SERVICE_INVENTORY.md
- [ ] Update environment configuration documentation
- [ ] Add to monitoring/alerting
- [ ] Create runbook for operations
- [ ] Announce to team

**Approval Required:** CTO (for production deployments)

---

## Service Removal Process

### Deprecating Services

#### 1. Identification
- Service marked as unused in audit
- Business requirement changed
- Security concerns identified
- Better alternative available

#### 2. Impact Assessment
- [ ] Identify dependent services
- [ ] Review client usage (if API)
- [ ] Assess data migration needs
- [ ] Evaluate rollback requirements

#### 3. Deprecation Timeline
- **Week 1-2:** Announce deprecation, provide alternatives
- **Week 3-4:** Add deprecation warnings
- **Week 5-8:** Monitor usage, provide support for migration
- **Week 9-12:** Disable service
- **Week 13+:** Remove code (after confirmation of zero impact)

#### 4. Removal Checklist
- [ ] Service disabled via feature flag
- [ ] Monitoring confirms zero usage
- [ ] Code removed from codebase
- [ ] Database migrations cleaned up (if applicable)
- [ ] Documentation updated
- [ ] SERVICE_INVENTORY.md updated
- [ ] Team notified

---

## Emergency Service Disable Procedure

### When to Use
- Critical security vulnerability discovered
- Compliance violation identified
- Service causing system instability
- Unauthorized access detected

### Procedure

#### 1. Immediate Actions (0-15 minutes)
```bash
# For environment-based services
# Update environment variable to disable service
# Example: Set ENABLE_EXPERIMENTAL_FEATURES=false

# For organization-based services
# Update database to disable for affected organizations
```

#### 2. Communication (15-30 minutes)
- [ ] Notify CTO/Security Officer
- [ ] Notify affected users (if customer-facing)
- [ ] Create incident report
- [ ] Document actions taken

#### 3. Investigation (30 minutes - 24 hours)
- [ ] Analyze impact
- [ ] Identify root cause
- [ ] Determine remediation steps
- [ ] Create fix plan

#### 4. Resolution
- [ ] Implement fix
- [ ] Security review of fix
- [ ] Re-enable service (if appropriate)
- [ ] Post-mortem analysis
- [ ] Update procedures to prevent recurrence

---

## Automation Recommendations

### Automated Service Discovery

Create scripts to automate service discovery:

```bash
#!/bin/bash
# scripts/audit/discover-services.sh

echo "=== API Routes ==="
find apps/web/src/app/api -name "route.ts" -type f | sort

echo ""
echo "=== Server Actions ==="
find apps/web/src/features -name "*.ts" -path "*/actions/*" -type f | sort

echo ""
echo "=== Services ==="
find apps/web/src/server/services -name "*.ts" -type f | sort

echo ""
echo "=== Database Schemas ==="
find apps/web/src/server/db/schema -name "*.ts" -type f | sort
```

### Automated Compliance Checks

Create automated checks for common compliance issues:

```bash
#!/bin/bash
# scripts/audit/compliance-check.sh

echo "Checking for missing authentication..."
# Search for route.ts files without authorization checks

echo "Checking for missing rate limiting..."
# Search for API routes without rate limiting

echo "Checking for sensitive data handling..."
# Search for PII handling without audit logging
```

### Continuous Monitoring

Implement automated monitoring:
- Service usage metrics
- Unused endpoint detection
- Failed authentication attempts
- Rate limit violations
- Audit log analysis

---

## Training Requirements

### For Development Team
- [ ] Review SERVICE_INVENTORY.md quarterly
- [ ] Understand service approval process
- [ ] Know how to add feature flags
- [ ] Understand compliance requirements
- [ ] Participate in audit process

### For Security Team
- [ ] Lead quarterly audits
- [ ] Review new service proposals
- [ ] Monitor security alerts
- [ ] Maintain compliance documentation
- [ ] Coordinate with external auditors

### For Operations Team
- [ ] Monitor service health
- [ ] Execute emergency disable procedures
- [ ] Maintain environment configurations
- [ ] Respond to security incidents
- [ ] Participate in annual audits

---

## Metrics & KPIs

### Track These Metrics
1. **Service Count:** Total number of active services over time
2. **Service Churn:** Services added vs removed per quarter
3. **Unused Services:** Services with zero usage
4. **Audit Completion:** On-time audit completion rate
5. **Security Issues:** Security issues discovered per audit
6. **Compliance Status:** Percentage of services with complete documentation

### Target KPIs
- Service count stable or decreasing (avoid bloat)
- 100% audit completion on schedule
- Zero critical security issues
- 100% services with documented justification
- <5% unused services

---

## Appendix: Tools & Resources

### Recommended Tools
- **API Documentation:** Swagger/OpenAPI for endpoint documentation
- **Dependency Analysis:** Madge or similar for service dependency graphs
- **Security Scanning:** OWASP ZAP, Snyk, or similar
- **Log Analysis:** ELK stack or similar for usage analysis
- **Monitoring:** Prometheus, Grafana, or similar

### External Resources
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [NEN 7510 Security Guidelines](https://www.nen.nl/en/nen-7510-2017-a1-2020-nl-264481)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)
- [Dutch Healthcare Data Protection Authority](https://autoriteitpersoonsgegevens.nl/)

---

## Related Documents
- [Service Inventory](./SERVICE_INVENTORY.md)
- [Service Control Configuration](./SERVICE_CONTROL_CONFIG.md)
- [Security Compliance Checklist](./SECURITY_COMPLIANCE_CHECKLIST.md)

---

**Document Classification:** Internal - Security  
**Review Frequency:** Annually  
**Next Review Date:** 2027-02-24
