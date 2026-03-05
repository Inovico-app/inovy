# Network Services Security Configuration

## Overview

This document describes the security configurations applied to all network services in accordance with SSD-1.2.03 (Hardening Guidelines) and NEN 7510 standards for healthcare information security.

**Status:** ✅ Implemented  
**Last Updated:** 2026-02-24  
**Compliance:** SSD-1.2.03, NEN 7510, OWASP Best Practices

## Security Configurations

### 1. HTTPS Enforcement

**Status:** ✅ Enforced by Vercel Platform

- All connections are automatically upgraded to HTTPS
- HTTP Strict Transport Security (HSTS) enabled with 2-year max-age
- Preload directive included for browser HSTS preload list
- IncludeSubDomains directive ensures all subdomains use HTTPS

**Configuration:**
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

**Verification:**
- Check response headers in browser DevTools
- Use SSL Labs (ssllabs.com) for comprehensive SSL/TLS analysis

### 2. Security Headers

**Implementation Location:** `apps/web/src/proxy.ts`

All responses include comprehensive security headers following OWASP recommendations:

#### Content Security Policy (CSP)
Prevents cross-site scripting (XSS) and injection attacks by controlling resource loading:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' data: https://fonts.gstatic.com;
  img-src 'self' data: https: blob:;
  connect-src 'self' https://vercel.live https://*.vercel.app https://*.google.com https://*.googleapis.com wss://*.pusher.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  upgrade-insecure-requests
```

**Purpose:**
- `default-src 'self'`: Only allow resources from same origin by default
- `frame-ancestors 'none'`: Prevent clickjacking by disallowing iframe embedding
- `upgrade-insecure-requests`: Automatically upgrade HTTP to HTTPS
- Specific allowances for required third-party services (Google APIs, Vercel, Pusher)

#### X-Frame-Options
```
X-Frame-Options: DENY
```
**Purpose:** Additional protection against clickjacking attacks

#### X-Content-Type-Options
```
X-Content-Type-Options: nosniff
```
**Purpose:** Prevent MIME-type sniffing attacks

#### Referrer-Policy
```
Referrer-Policy: strict-origin-when-cross-origin
```
**Purpose:** Control referrer information sent to external sites (privacy protection)

#### Permissions-Policy
```
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()
```
**Purpose:** Disable unnecessary browser features to reduce attack surface

#### X-DNS-Prefetch-Control
```
X-DNS-Prefetch-Control: off
```
**Purpose:** Disable DNS prefetching for enhanced privacy

#### X-Download-Options
```
X-Download-Options: noopen
```
**Purpose:** Prevent automatic file execution in Internet Explorer

#### X-Permitted-Cross-Domain-Policies
```
X-Permitted-Cross-Domain-Policies: none
```
**Purpose:** Control Adobe Flash and PDF cross-domain access

### 3. CORS (Cross-Origin Resource Sharing)

**Implementation Location:** `apps/web/src/proxy.ts`

CORS is configured with security-first approach:

#### Configuration
```typescript
Access-Control-Allow-Credentials: true
Access-Control-Allow-Origin: <validated-origin>
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
Access-Control-Max-Age: 86400
```

#### Origin Validation
- Origins validated against whitelist from environment variables
- Request origin checked against `CORS_ORIGIN` or `NEXT_PUBLIC_APP_URL`
- Multiple origins supported (comma-separated)
- Fallback to first configured origin if request origin not in whitelist
- Development mode allows `http://localhost:3000`

#### HTTP Methods
- Only necessary methods allowed: GET, POST, PUT, DELETE, OPTIONS
- Dangerous methods (TRACE, CONNECT) explicitly excluded

#### Preflight Handling
- OPTIONS requests handled with 204 No Content response
- Preflight responses cached for 24 hours (86400 seconds)
- All security headers applied to preflight responses

### 4. Protocol Security

#### TLS/SSL Configuration
**Provider:** Vercel (automatically managed)

**Requirements:**
- TLS 1.2 minimum (TLS 1.3 preferred)
- Strong cipher suites only
- Perfect Forward Secrecy (PFS) enabled
- Certificate auto-renewal

**Verification:**
```bash
# Check TLS version and ciphers
openssl s_client -connect yourdomain.com:443 -tls1_2
```

#### API Security
- All API endpoints require authentication (except public routes)
- Session-based authentication with secure cookies
- CSRF protection via same-origin policy
- Rate limiting recommended (to be implemented)

### 5. Network Service Configurations

#### Allowed Public Routes
The following routes are exempt from authentication but still have security headers:
- `/api/auth/*` - Authentication endpoints
- `/_next/*` - Next.js internal routes
- `/favicon.ico` - Static assets
- `/accept-invitation` - User invitation flow
- `/sign-in`, `/sign-up` - Public authentication pages
- `/onboarding` - User onboarding
- `/forgot-password`, `/reset-password` - Password recovery
- `/verify-email`, `/verify-email-token` - Email verification

All other routes require authentication.

#### Protected API Routes
- All `/api/*` routes (except `/api/auth/*`) require valid session
- CORS headers applied to all API routes
- Security headers applied to all API responses

## Security Audit Procedures

### Regular Audits

**Frequency:** Quarterly (every 3 months)

**Audit Checklist:**

#### 1. Security Headers Audit
- [ ] Verify all security headers present in responses
- [ ] Check CSP policy is not too permissive
- [ ] Confirm HSTS header has correct directives
- [ ] Validate Permissions-Policy restrictions
- [ ] Test X-Frame-Options effectiveness

**Tools:**
- [SecurityHeaders.com](https://securityheaders.com)
- [Mozilla Observatory](https://observatory.mozilla.org)
- Browser DevTools Network tab

**Script:**
```bash
# Run security headers audit
npm run audit:security-headers
```

#### 2. CORS Configuration Audit
- [ ] Verify origin whitelist is up-to-date
- [ ] Check no wildcard (*) origins in production
- [ ] Confirm only necessary HTTP methods allowed
- [ ] Validate credentials handling
- [ ] Test preflight request handling

**Manual Test:**
```bash
# Test CORS configuration
curl -H "Origin: https://unauthorized-origin.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-domain.com/api/endpoint -v
```

#### 3. TLS/SSL Audit
- [ ] Verify TLS 1.2+ only
- [ ] Check certificate validity and expiration
- [ ] Confirm strong cipher suites
- [ ] Test Perfect Forward Secrecy
- [ ] Validate certificate chain

**Tools:**
- [SSL Labs](https://www.ssllabs.com/ssltest/)
- `openssl s_client`

**Command:**
```bash
# Check TLS configuration
npm run audit:tls
```

#### 4. Protocol Security Audit
- [ ] Review API authentication mechanisms
- [ ] Check session cookie security attributes
- [ ] Validate CSRF protection
- [ ] Test rate limiting (when implemented)
- [ ] Review error handling (no sensitive data in errors)

#### 5. Network Services Audit
- [ ] Review public route list for necessity
- [ ] Audit authentication bypass vulnerabilities
- [ ] Check for exposed development endpoints
- [ ] Validate redirect security
- [ ] Test for open redirects

### Automated Monitoring

**Implementation:** Scheduled checks run automatically

#### Daily Checks
- SSL certificate expiration monitoring
- Security header presence verification
- CORS configuration validation

#### Weekly Checks
- Dependency vulnerability scanning
- Security advisory reviews
- Log analysis for suspicious patterns

#### Monthly Checks
- Full penetration testing
- Security configuration review
- Compliance verification

### Incident Response

If security issues are discovered:

1. **Immediate Actions:**
   - Document the issue with severity assessment
   - Notify security team
   - Implement temporary mitigation if needed

2. **Investigation:**
   - Analyze logs for exploitation attempts
   - Determine scope and impact
   - Identify root cause

3. **Remediation:**
   - Implement fix in development
   - Test thoroughly
   - Deploy to production
   - Verify fix effectiveness

4. **Post-Incident:**
   - Update documentation
   - Review and improve security measures
   - Conduct lessons-learned session
   - Update audit procedures if needed

## Audit Scripts

Security audit scripts are provided for automated checks:

### Run All Audits
```bash
npm run audit:security
```

### Individual Audits
```bash
# Security headers
npm run audit:security-headers

# CORS configuration
npm run audit:cors

# TLS/SSL
npm run audit:tls

# Full security scan
npm run audit:full
```

## Compliance Mapping

### SSD-1.2.03 Requirements
✅ Security configurations applied to all network services  
✅ Protocol configurations follow security guidelines  
✅ Regular security configuration audits defined

### NEN 7510 Requirements
✅ Information security measures (Section 10)  
✅ Access control (Section 9)  
✅ Cryptography (Section 10)  
✅ Network security management (Section 13)

### OWASP Top 10 Coverage
✅ A01: Broken Access Control - Authentication + CORS  
✅ A02: Cryptographic Failures - HTTPS + HSTS  
✅ A03: Injection - CSP + Input validation  
✅ A05: Security Misconfiguration - Security headers  
✅ A07: Identification and Authentication Failures - Session security  

## Maintenance

### Configuration Updates

When updating security configurations:

1. Review impact of changes
2. Test in development environment
3. Verify no breaking changes
4. Update this documentation
5. Deploy to staging
6. Run full security audit
7. Deploy to production
8. Verify in production

### Documentation Updates

This document should be updated when:
- Security headers are modified
- CORS policy changes
- New security measures are implemented
- Audit procedures are updated
- Compliance requirements change

### Review Schedule

- **Security Configurations:** Quarterly
- **Documentation:** Quarterly or upon changes
- **Audit Procedures:** Bi-annually
- **Compliance Mapping:** Annually

## References

- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [NEN 7510 Standard](https://www.nen.nl/nen-7510-2017-nl-245398)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [Vercel Security Best Practices](https://vercel.com/docs/security)
- [Content Security Policy Reference](https://content-security-policy.com/)

## Contact

For security concerns or questions:
- Security Team: [security@inovy.nl]
- Documentation: `/workspace/docs/security/`
- Issue Tracking: Linear (INO2-311)
