# Directory Listing Prevention - SSD-29.1.02

This document describes how directory listing is prevented in the Inovy web application to comply with SSD-29.1.02 security requirements.

## Requirement

**SSD-29.1.02**: De webserver heeft directory listing uitgeschakeld.

**Translation**: The web server has directory listing disabled.

**Objective**: Prevent file enumeration and unauthorized access to server directories.

## Implementation

### 1. Next.js Architecture

The application uses Next.js 16 with the App Router, which inherently prevents directory listing:

- **File-based Routing**: Only specific files (`page.tsx`, `route.ts`, `layout.tsx`) create accessible routes
- **No Directory Access**: Arbitrary directory paths return 404 errors
- **Controlled Static Assets**: Static files must be explicitly placed in designated locations

### 2. Security Headers

Security headers are configured in two places to ensure comprehensive protection:

#### Middleware (`src/middleware.ts`)

The middleware adds security headers to all requests:

```typescript
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()
```

#### Next.js Configuration (`next.config.ts`)

The same headers are also configured at the framework level for redundancy and defense in depth.

### 3. Vercel Deployment

The application is deployed on Vercel, which:

- **Does not expose directory listings**: Vercel's infrastructure prevents directory browsing
- **Serves files through Next.js**: All requests are routed through the Next.js application
- **No web server configuration access**: Traditional web server directory listing settings are not applicable

## Acceptance Criteria

### ✅ Directory Listing Disabled

- **Implementation**: Next.js App Router architecture + Security headers
- **Verification**: No directory listing capability in Next.js or Vercel
- **Status**: Compliant

### ✅ 404 for Directory Access

- **Implementation**: Next.js routing returns 404 for non-existent routes
- **Verification**: Directory paths without explicit route handlers return 404
- **Status**: Compliant

### ✅ Index Files Required

- **Implementation**: Next.js requires explicit route files (`page.tsx`, `route.ts`)
- **Verification**: No automatic index file serving; routes must be explicitly defined
- **Status**: Compliant

## Testing

### Manual Testing

1. **Test non-existent directory**:
   ```
   GET /some-directory/
   Expected: 404 Not Found
   ```

2. **Test API directory**:
   ```
   GET /api/
   Expected: 404 Not Found (unless explicit route exists)
   ```

3. **Test nested paths**:
   ```
   GET /path/to/nested/directory/
   Expected: 404 Not Found
   ```

### Automated Testing

The security headers are automatically applied by:
- Middleware for all matching routes
- Next.js configuration for all paths

### Verification Commands

```bash
# Check security headers
curl -I https://your-domain.com

# Expected headers:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
```

## Security Considerations

### Defense in Depth

The implementation uses multiple layers:
1. **Application Layer**: Next.js routing prevents directory access
2. **HTTP Headers**: Security headers prevent content type sniffing
3. **Platform Layer**: Vercel infrastructure blocks directory listings
4. **Middleware**: Additional request processing and validation

### No Public Directory Browsing

- No `public` folder with directory listing
- Static assets served through Next.js optimization
- No direct file system access exposed

### CSP and Additional Security

While not required for directory listing prevention, consider adding:
- Content Security Policy (CSP) headers
- Strict Transport Security (HSTS)
- Additional security scanning tools

## Maintenance

### Regular Audits

- Review middleware configuration quarterly
- Verify security headers are present on production
- Test directory access prevention on new deployments

### Monitoring

- Monitor for unusual 404 patterns that might indicate enumeration attempts
- Log and alert on suspicious directory access patterns
- Review server logs for potential security issues

## References

- **SSD-29**: Directory listing security requirements
- **Next.js Security**: https://nextjs.org/docs/app/building-your-application/security
- **Vercel Security**: https://vercel.com/docs/security
- **OWASP**: Directory Listing Prevention

## Compliance Status

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Directory listing disabled | ✅ Compliant | Next.js + Headers + Vercel |
| 404 for directory access | ✅ Compliant | Next.js routing |
| Index files required | ✅ Compliant | App Router architecture |

**Last Updated**: 2026-02-01
**Reviewed By**: Security Team
**Next Review**: 2026-05-01
