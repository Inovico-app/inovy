# Certificate Revocation Verification

This module implements certificate revocation checking for HTTPS connections, fulfilling security requirement SSD-4.3.03.

## Overview

The implementation provides:
- ✅ CRL (Certificate Revocation List) checking
- ✅ OCSP (Online Certificate Status Protocol) checking
- ✅ Certificate revocation detection and rejection
- ✅ Configurable failure handling (strict/permissive modes)
- ✅ Caching for performance
- ✅ Comprehensive logging

## Architecture

### Components

1. **CertificateRevocationChecker** (`certificate-revocation.ts`)
   - Core revocation checking logic
   - Supports both CRL and OCSP
   - Implements caching for CRL data
   - Configurable timeout and strict mode

2. **SecureHttpsAgent** (`https-agent.ts`)
   - Custom HTTPS agent with certificate validation
   - Integrates revocation checking into TLS handshake
   - Rejects connections with revoked certificates

3. **Configuration** (`../config/certificate-validation.ts`)
   - Environment-based configuration
   - Development vs. production settings
   - Configurable check methods and timeouts

4. **Logging** (`certificate-logger.ts`)
   - Tracks all certificate validations
   - Records revocation events
   - Provides audit trail

## Usage

### Basic Usage with fetch

```typescript
import { secureFetch } from '@/server/lib/fetch-with-revocation-check';

// Automatically validates certificates including revocation status
const response = await secureFetch('https://api.example.com/data');
const data = await response.json();
```

### Using the Secure HTTPS Agent

```typescript
import { getSecureAgent } from '@/server/lib/fetch-with-revocation-check';

const agent = getSecureAgent();

const response = await fetch('https://api.example.com/data', {
  // @ts-expect-error - Node.js specific
  agent,
});
```

### Direct Revocation Checking

```typescript
import { verifyCertificateRevocation } from '@/server/lib/certificate-revocation';
import * as tls from 'tls';

const socket = tls.connect({ host: 'example.com', port: 443 });
socket.on('secureConnect', async () => {
  const cert = socket.getPeerCertificate();
  const result = await verifyCertificateRevocation(cert, {
    enableCRL: true,
    enableOCSP: true,
    timeout: 5000,
    strictMode: false,
  });

  if (result.isRevoked) {
    console.error('Certificate is revoked!');
    socket.destroy();
  }
});
```

### Custom Configuration

```typescript
import { CertificateRevocationChecker } from '@/server/lib/certificate-revocation';

const checker = new CertificateRevocationChecker({
  enableCRL: true,
  enableOCSP: true,
  timeout: 10000,
  strictMode: true,
  cacheTimeout: 7200000, // 2 hours
});

const result = await checker.checkCertificate(certificate);
```

## Environment Variables

Configure certificate validation through environment variables:

```bash
# Enable/disable certificate validation (default: true)
CERT_VALIDATION_ENABLED=true

# Enable CRL checking (default: true)
CERT_CRL_CHECK_ENABLED=true

# Enable OCSP checking (default: true)
CERT_OCSP_CHECK_ENABLED=true

# Timeout for revocation checks in milliseconds (default: 5000)
CERT_REVOCATION_TIMEOUT=5000

# Strict mode - reject on check failure (default: false)
CERT_STRICT_MODE=false

# Cache timeout for CRL data in milliseconds (default: 3600000 = 1 hour)
CERT_CACHE_TIMEOUT=3600000

# Log validation failures (default: true)
CERT_LOG_FAILURES=true

# Allow self-signed certificates in development (default: false)
CERT_ALLOW_SELF_SIGNED=false
```

## Modes

### Permissive Mode (Default)
- Revoked certificates are rejected
- Check failures (network errors, timeouts) are logged but allowed
- Suitable for most production environments
- Prevents false positives from network issues

### Strict Mode
- Revoked certificates are rejected
- Check failures also result in connection rejection
- Maximum security but may cause false positives
- Recommended for high-security environments

```typescript
// Enable strict mode via environment
CERT_STRICT_MODE=true

// Or programmatically
const result = await verifyCertificateRevocation(cert, {
  strictMode: true,
});
```

## Revocation Check Methods

### OCSP (Online Certificate Status Protocol)
- **Priority**: First choice (faster, real-time)
- **Method**: Queries OCSP responder for certificate status
- **Advantages**: Real-time, lightweight
- **Limitations**: Requires OCSP URL in certificate

### CRL (Certificate Revocation List)
- **Priority**: Fallback when OCSP unavailable
- **Method**: Downloads and checks revocation list
- **Advantages**: Works offline with cached CRLs
- **Limitations**: Larger payload, may be outdated

### Execution Flow
1. Try OCSP if enabled and URL available
2. Fall back to CRL if OCSP fails or unavailable
3. Cache CRL data to reduce network overhead
4. Return result based on mode (strict/permissive)

## Integration Example: Recall API Service

```typescript
// Before (no revocation checking)
const response = await fetch('https://api.recall.ai/endpoint');

// After (with revocation checking)
import { secureFetch } from '@/server/lib/fetch-with-revocation-check';

const response = await secureFetch('https://api.recall.ai/endpoint');
```

## Logging and Monitoring

### Accessing Logs

```typescript
import { certificateLogger } from '@/server/lib/certificate-logger';

// Get all logs
const logs = certificateLogger.getLogs();

// Get recent revocations (last 24 hours)
const revocations = certificateLogger.getRecentRevocations(24);

// Clear logs
certificateLogger.clearLogs();
```

### Log Entry Structure

```typescript
interface CertificateLogEntry {
  timestamp: Date;
  hostname?: string;
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  revocationCheck: {
    isRevoked: boolean;
    method?: 'CRL' | 'OCSP' | 'CACHE';
    error?: string;
    checkedAt: Date;
    details?: string;
  };
}
```

## Security Considerations

### Production Deployment

1. **Enable Validation**: Always enable in production
   ```bash
   CERT_VALIDATION_ENABLED=true
   ```

2. **Configure Timeouts**: Set appropriate timeouts
   ```bash
   CERT_REVOCATION_TIMEOUT=5000
   ```

3. **Monitor Logs**: Track revocation events
   ```typescript
   const revoked = certificateLogger.getRecentRevocations();
   ```

4. **Cache Tuning**: Adjust cache timeout based on your needs
   ```bash
   CERT_CACHE_TIMEOUT=3600000
   ```

### Development

- Validation is enabled by default in development
- Use `CERT_VALIDATION_ENABLED=false` to disable if needed
- Self-signed certificates are rejected unless explicitly allowed

### Compliance

This implementation fulfills:
- **SSD-4.3.03**: Certificate revocation verification
- **NEN 7510**: Secure communication requirements
- **AVG/GDPR**: Secure data transmission

## Performance

### Caching Strategy
- CRL data is cached for 1 hour by default
- Cache reduces network overhead for repeated checks
- OCSP responses are not cached (real-time status)

### Network Impact
- OCSP: Single HTTP request, typically < 1KB
- CRL: Downloads full revocation list (varies by CA)
- Timeouts prevent hanging connections
- Asynchronous checks don't block main thread

### Optimization Tips

1. **Use connection pooling**: `keepAlive: true`
2. **Adjust cache timeout**: Balance freshness vs. performance
3. **Enable both methods**: OCSP (fast) with CRL fallback
4. **Monitor timeout settings**: Tune based on your network

## Limitations

### Current Implementation

1. **ASN.1 Parsing**: Basic implementation, may not parse all certificate formats
2. **OCSP Stapling**: Not yet implemented (Vercel supports this)
3. **CRL Delta Lists**: Not supported
4. **Certificate Pinning**: Not included in this module

### Future Enhancements

- [ ] Full ASN.1 parser for OCSP/CRL
- [ ] OCSP stapling support
- [ ] Certificate pinning
- [ ] CRL delta lists
- [ ] Metrics and monitoring endpoints
- [ ] Redis-based caching for distributed systems

## Testing

```typescript
// Test with a known revoked certificate
import { verifyCertificateRevocation } from '@/server/lib/certificate-revocation';

// Mock certificate (in real tests, use actual certificate data)
const result = await verifyCertificateRevocation(mockRevokedCert);

expect(result.isRevoked).toBe(true);
expect(result.method).toBe('OCSP' || 'CRL');
```

## Troubleshooting

### Issue: High Latency

**Solution**: Increase cache timeout or disable strict mode

```bash
CERT_CACHE_TIMEOUT=7200000
CERT_STRICT_MODE=false
```

### Issue: False Positives

**Solution**: Use permissive mode and monitor logs

```bash
CERT_STRICT_MODE=false
CERT_LOG_FAILURES=true
```

### Issue: OCSP/CRL Unavailable

**Solution**: Ensure network access to CA servers, check firewall rules

## Support

For issues or questions:
1. Check logs: `certificateLogger.getLogs()`
2. Verify environment variables
3. Test with `CERT_STRICT_MODE=false`
4. Review network connectivity to CA servers

## References

- [RFC 6960 - OCSP](https://datatracker.ietf.org/doc/html/rfc6960)
- [RFC 5280 - CRL](https://datatracker.ietf.org/doc/html/rfc5280)
- [NEN 7510 - Healthcare Information Security](https://www.nen.nl/nen-7510-2017-nl-245398)
- [SSD-4 - Secure Communication Standards](https://www.digitaleoverheid.nl/)
