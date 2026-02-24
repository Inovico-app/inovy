# Security Headers Implementation

## Issue: INO2-334 - Prevent fallback to unencrypted communication

### Implementation Summary

This implementation adds comprehensive security headers to prevent fallback to unencrypted communication and protect against common web vulnerabilities.

### Changes Made

#### File Modified: `apps/web/src/proxy.ts`

Added a `setSecurityHeaders()` function that applies the following security headers to all responses:

1. **Strict-Transport-Security (HSTS)**
   - Value: `max-age=31536000; includeSubDomains`
   - Purpose: Enforces HTTPS for 1 year on this domain and all subdomains
   - Prevents: HTTP downgrade attacks, man-in-the-middle attacks

2. **X-Content-Type-Options**
   - Value: `nosniff`
   - Purpose: Prevents MIME type sniffing
   - Prevents: MIME confusion attacks

3. **X-Frame-Options**
   - Value: `DENY`
   - Purpose: Prevents the page from being embedded in frames
   - Prevents: Clickjacking attacks

4. **Content-Security-Policy (CSP)**
   - Directives:
     - `default-src 'self'`: Only load resources from same origin by default
     - `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://va.vercel-scripts.com`: Allow scripts from self and Vercel
     - `style-src 'self' 'unsafe-inline'`: Allow inline styles (required for Next.js)
     - `img-src 'self' data: https: blob:`: Allow images from self, data URIs, HTTPS, and blobs
     - `font-src 'self' data:`: Allow fonts from self and data URIs
     - `connect-src 'self' https: wss:`: Allow API calls to HTTPS and WebSocket connections
     - `frame-ancestors 'none'`: Prevent framing (redundant with X-Frame-Options)
     - `base-uri 'self'`: Restrict base tag URLs
     - `form-action 'self'`: Only allow form submissions to same origin
   - Prevents: XSS attacks, injection attacks, unauthorized resource loading

5. **Referrer-Policy**
   - Value: `strict-origin-when-cross-origin`
   - Purpose: Controls referrer information sent with requests
   - Prevents: Information leakage to third parties

6. **Permissions-Policy**
   - Restrictions:
     - `camera=()`: Disable camera access
     - `microphone=()`: Disable microphone access
     - `geolocation=()`: Disable geolocation
     - `interest-cohort=()`: Opt out of FLoC/tracking
   - Purpose: Restricts browser features to reduce attack surface

7. **X-DNS-Prefetch-Control**
   - Value: `on`
   - Purpose: Enables DNS prefetching for performance

### Security Headers Applied To

All responses now include these headers:
- Public routes (sign-in, sign-up, etc.)
- Protected routes (dashboard, recordings, etc.)
- API routes
- Redirects (onboarding, authentication)

### Acceptance Criteria Status

- [x] HSTS implemented with 1-year max-age and includeSubDomains
- [x] No plaintext fallback possible (enforced by HSTS)
- [x] Downgrade attacks prevented (HSTS prevents HTTP fallback)
- [x] Comprehensive security headers configured (X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy)

### SSD Compliance

This implementation satisfies:

- **SSD-4.3.04**: Encrypted communication configured with no fallback to unencrypted
- **SSD-24.1.02**: X-Content-Type-Options header set
- **SSD-24.1.03**: X-Frame-Options header set
- **SSD-24.1.04**: Content-Security-Policy header set
- **SSD-24.1.05**: Strict-Transport-Security header set
- **SSD-33.1.01**: Comprehensive security headers configured

### Testing

The implementation:
- Passes TypeScript compilation (no type errors)
- Follows existing code style (no new linting errors)
- Applies headers consistently to all response types
- Works with existing CORS configuration for API routes

### Deployment

Once merged and deployed to Vercel:
1. HTTPS will be strictly enforced for all requests
2. Browsers will cache the HSTS policy for 1 year
3. All security headers will be sent with every response
4. Users attempting to access via HTTP will be automatically redirected to HTTPS by their browser

### Notes

- The CSP includes `'unsafe-inline'` and `'unsafe-eval'` for scripts to support Next.js and React functionality. This can be tightened in the future with nonces or hashes.
- Vercel already enforces HTTPS, but adding HSTS at the application level provides defense-in-depth
- The `includeSubDomains` directive in HSTS ensures all subdomains also require HTTPS
- Headers are set in middleware rather than Next.js config to ensure they're applied to all responses including redirects

### Future Improvements

1. **CSP Refinement**: Use nonces or hashes to remove `'unsafe-inline'` and `'unsafe-eval'`
2. **HSTS Preloading**: Consider adding `preload` directive and submitting to browser preload lists
3. **CSP Reporting**: Add `report-uri` directive to monitor CSP violations
4. **Subresource Integrity**: Add SRI hashes for external scripts
5. **Certificate Transparency**: Monitor CT logs for unauthorized certificates
