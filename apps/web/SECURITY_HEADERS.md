# Security Headers Configuration

This document describes the comprehensive security headers implemented in the application to comply with SSD-33.1.01 requirements.

## Implemented Headers

### 1. X-Content-Type-Options: nosniff

**Purpose:** Prevents MIME type sniffing attacks by forcing browsers to respect the declared Content-Type.

**Value:** `nosniff`

**Security Benefit:** Protects against attacks where malicious files are disguised with incorrect MIME types to exploit browser vulnerabilities.

### 2. X-Frame-Options: DENY

**Purpose:** Prevents clickjacking attacks by blocking the page from being embedded in iframes.

**Value:** `DENY`

**Security Benefit:** Critical for healthcare applications to prevent attackers from overlaying malicious interfaces over legitimate content to steal credentials or trick users into unintended actions.

### 3. Strict-Transport-Security (HSTS)

**Purpose:** Forces browsers to only connect via HTTPS, preventing downgrade attacks.

**Value:** `max-age=63072000; includeSubDomains; preload`

- `max-age=63072000`: Enforces HTTPS for 2 years (730 days)
- `includeSubDomains`: Applies to all subdomains
- `preload`: Eligible for browser HSTS preload lists

**Security Benefit:** Ensures all patient data transmission is encrypted and prevents man-in-the-middle attacks. Essential for AVG/GDPR compliance.

### 4. Referrer-Policy

**Purpose:** Controls how much referrer information is shared when navigating away from the application.

**Value:** `strict-origin-when-cross-origin`

**Security Benefit:** Shares full referrer information for same-origin requests, but only the origin for cross-origin requests. Prevents leaking sensitive URL parameters (like patient IDs or session tokens) to third-party sites.

### 5. Permissions-Policy

**Purpose:** Controls which browser features and APIs can be accessed.

**Value:** `camera=(), microphone=(), geolocation=(), interest-cohort=()`

**Disabled Features:**
- Camera access (unless explicitly required for telemedicine)
- Microphone access (unless explicitly required for telemedicine)
- Geolocation tracking
- FLoC/Topics (privacy-invasive advertising tracking)

**Security Benefit:** Minimizes attack surface by disabling unnecessary browser features. Aligns with AVG data minimization principles.

### 6. Content-Security-Policy (CSP)

**Purpose:** Defines trusted sources for content, preventing XSS and data injection attacks.

**Directives:**

- `default-src 'self'`: Only allow resources from same origin by default
- `script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://va.vercel-scripts.com`: Allow scripts from self and specific trusted sources
  - Note: `'unsafe-eval'` and `'unsafe-inline'` are currently enabled for Next.js compatibility. These should be reviewed and tightened in production.
- `style-src 'self' 'unsafe-inline'`: Allow styles from self and inline styles
- `img-src 'self' data: https: blob:`: Allow images from self, data URIs, HTTPS, and blob URLs
- `font-src 'self' data:`: Allow fonts from self and data URIs
- `connect-src 'self' https: wss:`: Allow HTTPS and WebSocket connections
- `frame-src 'self' https://js.stripe.com`: Allow iframes from self and Stripe (for payment processing)
- `media-src 'self' blob:`: Allow media from self and blob URLs
- `worker-src 'self' blob:`: Allow web workers from self and blob URLs
- `object-src 'none'`: Block plugins like Flash
- `base-uri 'self'`: Restrict base tag to same origin
- `form-action 'self'`: Only allow form submissions to same origin
- `frame-ancestors 'none'`: Prevent embedding (similar to X-Frame-Options)
- `upgrade-insecure-requests`: Automatically upgrade HTTP requests to HTTPS

**Security Benefit:** Comprehensive defense against XSS attacks, data injection, and other content-based vulnerabilities. Critical for protecting patient data in healthcare applications.

## Compliance

These headers help ensure compliance with:

- **AVG (GDPR)**: Data protection through secure transmission and storage
- **NEN 7510**: Information security in healthcare
- **NEN 7512**: Logging and monitoring (supported by secure headers)
- **NEN 7513**: Access control (supported by CSP and frame restrictions)
- **BIO (Baseline Information Security)**: Government security baseline

## Testing and Verification

### Manual Testing

1. Use browser DevTools Network tab to inspect response headers
2. Verify all headers are present on various routes
3. Test that the application functions correctly with strict CSP

### Automated Testing

Use online tools to verify header configuration:
- [Mozilla Observatory](https://observatory.mozilla.org/)
- [Security Headers](https://securityheaders.com/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)

### Expected Scores

With these headers, the application should achieve:
- Mozilla Observatory: A+ rating
- Security Headers: A grade
- CSP Evaluator: No high-risk findings

## Regular Audits

As per SSD-33.1.01 requirements, security headers should be audited:

1. **Quarterly Reviews**: Verify all headers are still present and effective
2. **After Major Updates**: Check compatibility with new features/dependencies
3. **Security Incidents**: Review and strengthen headers if vulnerabilities are discovered
4. **Compliance Audits**: Document headers for NEN 7510 certification

## Future Improvements

### Short-term

1. **Tighten CSP**: Remove `'unsafe-eval'` and `'unsafe-inline'` by:
   - Using nonces or hashes for inline scripts/styles
   - Refactoring code to avoid eval()

2. **Add CSP Reporting**: Implement CSP violation reporting to monitor attacks

```typescript
"report-uri /api/csp-report",
"report-to csp-endpoint"
```

### Long-term

1. **Implement Subresource Integrity (SRI)**: Add integrity checks for third-party scripts
2. **Certificate Pinning**: Consider implementing certificate pinning for critical APIs
3. **Feature Policy Enhancements**: Review and tighten permissions as new browser features emerge

## Related Documentation

- [Next.js Security Headers Documentation](https://nextjs.org/docs/app/api-reference/next-config-js/headers)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN HTTP Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)

## Changelog

- **2026-02-01**: Initial implementation of comprehensive security headers (SSD-33.1.01)
  - Added X-Content-Type-Options
  - Added X-Frame-Options
  - Added Strict-Transport-Security
  - Added Referrer-Policy
  - Added Permissions-Policy
  - Added Content-Security-Policy
