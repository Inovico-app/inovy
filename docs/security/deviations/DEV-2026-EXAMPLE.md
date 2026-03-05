# Hardening Deviation: Redis TLS Certificate Validation - Development Environment

**Deviation ID:** DEV-2026-EXAMPLE  
**Status:** Approved  
**Created:** 2026-02-24  
**Created By:** Security Engineering Team  
**Last Updated:** 2026-02-24  

---

## 1. Component Information

### Affected Component

**Component Name:** Upstash Redis Connection  
**Component Type:** Cache Service / Infrastructure  
**Component Owner:** Platform Engineering Team  
**Environment:** Development / Local Testing  

### Related Systems

- Next.js application cache layer
- Session management system
- Rate limiting service

---

## 2. Hardening Guideline Reference

### Guideline Not Met

**Standard:** BIO (Baseline Informatiebeveiliging Overheid)  
**Control ID:** BIO-11.2.3  
**Control Title:** Transport Layer Security Configuration  
**Control Requirement:** 

> All network communications with external services must use TLS with certificate validation enabled to prevent man-in-the-middle attacks.

**Reference Link:** https://www.bio-overheid.nl/media/1400/70463-rapport-bio-versie-104zv.pdf

---

## 3. Deviation Description

### What is Being Deviated

In development environments, the Redis client connection is configured with `rejectUnauthorized: false` to disable TLS certificate validation. This allows developers to use self-signed certificates or skip certificate verification for local Redis instances.

### Current Implementation

```typescript
// apps/web/src/lib/cache/redis-client.ts
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  tls: {
    rejectUnauthorized: process.env.NODE_ENV !== 'production',
  },
});
```

### Expected Compliant Implementation

```typescript
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
  tls: {
    rejectUnauthorized: true, // Always validate certificates
  },
});
```

---

## 4. Justification

### Business/Technical Reason

- **Technical Constraint:** Local development environments may use self-signed certificates or Docker containers with default certificates
- **Business Requirement:** Developers need to test caching functionality locally without complex certificate infrastructure
- **Resource Constraint:** Setting up proper certificate infrastructure for every developer workstation is time-intensive
- **Functional Impact:** Without this deviation, local development requires full certificate infrastructure setup, significantly impacting developer velocity

### Alternative Analysis

1. **Alternative 1:** Use production Redis for all development
   - **Why Rejected:** Security risk exposing production data to dev environments; cost implications; network dependency issues

2. **Alternative 2:** Require all developers to set up proper certificate infrastructure locally
   - **Why Rejected:** High setup complexity; inconsistent across developer environments; significant time investment for each developer

3. **Alternative 3:** Use non-TLS Redis connections in development
   - **Why Rejected:** Increases risk of accidentally deploying non-TLS configuration; doesn't mirror production environment properly

---

## 5. Risk Assessment

### Risk Classification

**Risk Level:** ☒ Low (dev/staging only)

**Risk Rating Justification:**

This deviation only applies to local development environments and staging, never to production. Production environments always use full TLS certificate validation with Upstash Redis cloud service. The risk is limited to development workstations which are already within trusted networks and not exposed to external traffic.

### Threat Analysis

**Potential Threats:**

1. Man-in-the-middle attack on developer workstation network
2. Interception of cache data during local development
3. Credential exposure if development keys are intercepted

**Likelihood:** ☒ Low (requires attacker on local development network)

**Impact if Exploited:** ☒ Low (development/test data only, no production data exposed)

### Attack Vectors

1. Attacker on same local network as developer workstation performing MITM
2. Compromised development environment intercepting Redis traffic

### Data Sensitivity

**Data Classification:** ☒ Internal (development/test data only)

**Data Types Affected:**

- [ ] Personal Identifiable Information (PII)
- [ ] Health Information (PHI/Medical data)
- [ ] Financial Data
- [ ] Authentication Credentials
- [x] Business Confidential (development/test data)
- [x] Other: Cache data, session tokens (development only)

---

## 6. Compensating Controls

### Implemented Mitigations

1. **Environment-Specific Configuration**
   - **Implementation:** TLS validation is enforced in production via environment check (`NODE_ENV === 'production'`)
   - **Effectiveness:** Ensures production always uses proper certificate validation
   - **Verification:** CI/CD checks validate production configuration before deployment

2. **Network Isolation**
   - **Implementation:** Development environments operate on trusted local networks or VPNs
   - **Effectiveness:** Reduces attack surface by limiting network exposure
   - **Verification:** Developer workstation security policy enforcement

3. **Separate Credentials**
   - **Implementation:** Development and production use completely separate Redis credentials
   - **Effectiveness:** Prevents development environment compromise from affecting production
   - **Verification:** Credential management system maintains separation

4. **Code Review Process**
   - **Implementation:** All Redis configuration changes require security review via PR
   - **Effectiveness:** Prevents accidental production misconfiguration
   - **Verification:** Branch protection rules enforce review requirements

5. **Test Data Only**
   - **Implementation:** Development environments never contain production or real user data
   - **Effectiveness:** Limits impact of any development environment compromise
   - **Verification:** Data access policies and environment separation

### Additional Monitoring

- Production deployment pipeline validates TLS configuration
- Security team periodically audits Redis connections
- Automated tests verify production uses certificate validation

### Residual Risk

After compensating controls, the residual risk is:

**Residual Risk Level:** ☒ Negligible

**Residual Risk Description:**

The residual risk is negligible because:
- Deviation only applies to isolated development environments
- Production always uses full TLS validation
- No real user data exists in development
- Multiple layers of protection prevent production misconfiguration

---

## 7. Deviation Metadata

### Classification

**Deviation Type:** ☒ Configuration

**Duration:** ☒ Permanent (for development environments)

**Scope:** ☐ Single Component (Redis client configuration)

### Temporary Deviation Details

*Not applicable - this is a permanent accepted deviation for development environments*

---

## 8. Approval

### Approval History

| Date | Approver | Role | Decision | Comments |
|------|----------|------|----------|----------|
| 2026-02-24 | Security Team | Security Engineer | Approved | Low risk for dev environments with proper prod controls |
| 2026-02-24 | Platform Lead | Technical Lead | Approved | Necessary for local development workflow |

### Approval Conditions

*No conditions - approved as documented*

### Final Decision

**Status:** ☒ Approved

**Decision Date:** 2026-02-24  
**Decision By:** Security Engineering Team  
**Decision Rationale:**

The deviation is approved because:
1. Risk is limited to non-production environments only
2. Production maintains full compliance with certificate validation
3. Compensating controls adequately address residual risk
4. Development velocity benefit outweighs minimal risk
5. Clear environment separation prevents production impact

---

## 9. Implementation

### Implementation Date

**Implemented:** 2026-02-24  
**Implemented By:** Platform Engineering Team  
**Implementation PR:** #[PR number]  
**Deployment Environment:** Development / Staging

### Verification

**Verification Method:**

- Verified that production environment enforces `rejectUnauthorized: true`
- Tested that development environment successfully connects with self-signed certificates
- Confirmed CI/CD pipeline validates production TLS configuration
- Code review confirmed environment-specific logic is correct

**Verified By:** Security Engineering Team  
**Verification Date:** 2026-02-24

---

## 10. Review and Monitoring

### Review Schedule

**Next Review Date:** 2026-08-24  
**Review Frequency:** ☒ Semi-annually

### Review History

| Review Date | Reviewer | Status | Changes | Next Review |
|-------------|----------|--------|---------|-------------|
| 2026-02-24 | Security Team | Active | Initial approval | 2026-08-24 |

### Monitoring Requirements

- Monthly audit of production Redis TLS configuration
- CI/CD pipeline checks on every deployment
- Annual review of development environment security practices
- Periodic penetration testing of development environment boundaries

---

## 11. Closure

### Closure Criteria

*Not applicable - this is an approved permanent deviation for development environments*

---

## 12. Related Documentation

### References

- **Linear Issue:** INO2-316
- **Pull Requests:** #[PR implementing deviation]
- **Related Deviations:** None
- **Compliance Documentation:** SSD-1.3.05 Hardening Deviations
- **Architecture Decisions:** docs/architecture/redis-caching-strategy.md (if exists)

### Attachments

- Redis client configuration file: `apps/web/src/lib/cache/redis-client.ts`
- Environment configuration documentation: README.md

---

## Change Log

| Date | Author | Change Description |
|------|--------|-------------------|
| 2026-02-24 | Security Team | Initial creation and approval |
