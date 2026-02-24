# Certificate Validity Verification (SSD-4.3.02)

This document describes the implementation of certificate validity verification in compliance with SSD-4.3.02.

## Overview

The application implements comprehensive TLS certificate validation including:
- Certificate expiration checking
- Rejection of expired certificates
- Warnings for near-expiry certificates (default: 30 days)
- Validation of certificate validity period (not-yet-valid rejection)

## Implementation

### Certificate Validation Utility

Located at: `apps/web/src/server/lib/certificate-validation.ts`

Provides core certificate validation functionality:

```typescript
import { validateCertificateValidity, CertificateValidationError } from '@/server/lib/certificate-validation';

// Validate certificate information
try {
  validateCertificateValidity(certInfo, hostname, {
    nearExpiryWarningDays: 30,
    strictValidation: true,
  });
} catch (error) {
  if (error instanceof CertificateValidationError) {
    console.error(`Certificate error: ${error.code}`);
  }
}
```

### Secure Fetch Wrapper

Located at: `apps/web/src/server/lib/secure-fetch.ts`

Drop-in replacement for `fetch()` that validates TLS certificates:

```typescript
import { secureFetch } from '@/server/lib/secure-fetch';

// Use instead of fetch() for external HTTPS requests
const response = await secureFetch('https://api.example.com/data', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer token'
  },
  certificateValidation: {
    nearExpiryWarningDays: 30,  // Warn if expiring within 30 days
    strictValidation: true,      // Reject invalid certificates
  },
});
```

### Configuration Options

#### `CertificateValidationOptions`

- **`nearExpiryWarningDays`** (default: 30)
  - Number of days before expiry to trigger a warning
  - Logs a warning message but does not reject the request

- **`strictValidation`** (default: true)
  - When `true`: Rejects expired and not-yet-valid certificates
  - When `false`: Logs warnings but allows the request

- **`customCaBundle`** (optional)
  - Custom certificate authority bundle in PEM format
  - Useful for internal or self-signed certificates

## Usage Examples

### Basic Usage

```typescript
import { secureFetch } from '@/server/lib/secure-fetch';

// Simple GET request with certificate validation
const response = await secureFetch('https://api.example.com/endpoint');
```

### Advanced Configuration

```typescript
import { secureFetch } from '@/server/lib/secure-fetch';

// Custom validation options
const response = await secureFetch('https://internal-api.example.com/data', {
  method: 'POST',
  body: JSON.stringify({ data: 'value' }),
  certificateValidation: {
    nearExpiryWarningDays: 60,  // Warn 60 days before expiry
    strictValidation: true,
    customCaBundle: process.env.CUSTOM_CA_BUNDLE,
  },
});
```

### Proactive Certificate Validation

```typescript
import { validateCertificate } from '@/server/lib/secure-fetch';

// Check certificate without making a full request
const certInfo = await validateCertificate('https://api.example.com');
console.log(`Certificate expires in ${certInfo.daysUntilExpiry} days`);
```

### Batch Validation

```typescript
import { batchValidateCertificates } from '@/server/lib/secure-fetch';

// Validate multiple certificates at startup
const urls = [
  'https://api1.example.com',
  'https://api2.example.com',
  'https://api3.example.com',
];

const results = await batchValidateCertificates(urls, {
  nearExpiryWarningDays: 30,
});

results.forEach(result => {
  if (!result.success) {
    console.error(`${result.url}: ${result.error}`);
  } else if (result.info?.isNearExpiry) {
    console.warn(`${result.url}: Expires in ${result.info.daysUntilExpiry} days`);
  }
});
```

## Updated Services

The following services have been updated to use secure fetch with certificate validation:

### Web Application (`apps/web`)

- **JWT Verification** (`packages/mcp/src/auth/jwt.ts`)
  - JWKS endpoint fetching with certificate validation
  - Google and Microsoft OAuth JWKS endpoints

- **Recall.ai API Service** (`apps/web/src/server/services/recall-api.service.ts`)
  - Bot session creation
  - Bot status retrieval
  - Recording download URL fetching

- **Recall Bot Provider** (`apps/web/src/server/services/bot-providers/recall/recall-provider.ts`)
  - Bot session termination
  - Recording download

- **Reranker Service** (`apps/web/src/server/services/rag/reranker.service.ts`)
  - HuggingFace API calls for re-ranking

- **Metadata Extractor** (`apps/web/src/server/services/metadata-extractor.service.ts`)
  - PDF fetching from external URLs

## Error Handling

### Certificate Validation Errors

```typescript
import { secureFetch, CertificateValidationError } from '@/server/lib/secure-fetch';

try {
  const response = await secureFetch('https://api.example.com');
} catch (error) {
  if (error instanceof CertificateValidationError) {
    switch (error.code) {
      case 'CERT_EXPIRED':
        console.error(`Certificate expired: ${error.hostname}`);
        break;
      case 'CERT_NOT_YET_VALID':
        console.error(`Certificate not yet valid: ${error.hostname}`);
        break;
      case 'CERT_VALIDATION_FAILED':
        console.error(`Certificate validation failed: ${error.message}`);
        break;
    }
  }
}
```

## Logging

Certificate validation events are logged with appropriate severity levels:

### Error Level
- Expired certificates
- Certificate authorization failures
- Certificate extraction failures

### Warning Level
- Near-expiry certificates (within threshold)
- Non-HTTPS requests
- Certificate validation disabled

### Debug Level
- Successful certificate validation
- Certificate validity information

Example log output:

```json
{
  "level": "warn",
  "message": "Certificate nearing expiry",
  "component": "CertificateValidation",
  "hostname": "api.example.com",
  "daysUntilExpiry": 25,
  "validTo": "2026-03-25T00:00:00.000Z",
  "warningThreshold": 30
}
```

## Security Considerations

### Default Behavior

- **Strict validation enabled by default**: All certificates are validated
- **Expired certificates rejected**: Prevents communication with expired certificates
- **Not-yet-valid certificates rejected**: Prevents time-based attacks
- **Near-expiry warnings**: Proactive notification of expiring certificates

### Node.js Default Validation

The implementation builds on top of Node.js default certificate validation:
- Uses Node.js system CA bundle
- Validates certificate chain
- Checks hostname against certificate
- Verifies certificate signatures

### Additional Validation

Our implementation adds:
- Explicit expiry date checking
- Near-expiry warnings with configurable threshold
- Enhanced logging for audit trails
- Custom CA bundle support for internal certificates

## Compliance

This implementation satisfies the requirements of **SSD-4.3.02**:

✅ **Certificate expiration checked**
- Validates certificate expiry dates
- Checks both `validFrom` and `validTo` dates

✅ **Expired certificates rejected**
- Throws `CertificateValidationError` for expired certificates
- Logs security events for audit trails

✅ **Warning for near-expiry certificates**
- Configurable warning threshold (default 30 days)
- Logs warnings when certificates are approaching expiry

## Testing

Test suite located at: `apps/web/src/server/lib/__tests__/certificate-validation.test.ts`

Run tests:

```bash
pnpm test certificate-validation
```

## Environment Variables

Optional environment variables for certificate validation:

- **`CUSTOM_CA_BUNDLE`**: Path to custom CA bundle in PEM format
- **`CERT_EXPIRY_WARNING_DAYS`**: Override default warning threshold (30 days)
- **`DISABLE_CERT_VALIDATION`**: Disable certificate validation (not recommended)

## Monitoring

### Certificate Expiry Monitoring

Use the batch validation feature to monitor certificate expiry:

```typescript
import { batchValidateCertificates } from '@/server/lib/secure-fetch';

// Run daily to monitor external API certificates
const criticalUrls = [
  'https://eu-central-1.recall.ai',
  'https://api-inference.huggingface.co',
  'https://www.googleapis.com',
];

const results = await batchValidateCertificates(criticalUrls);

// Alert on certificates expiring within 30 days
results.forEach(result => {
  if (result.info?.isNearExpiry) {
    // Send alert to monitoring system
    alertNearExpiry(result.url, result.info.daysUntilExpiry);
  }
});
```

## Migration Guide

### Updating Existing Code

Replace direct `fetch()` calls with `secureFetch()`:

**Before:**
```typescript
const response = await fetch('https://api.example.com/data', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' },
});
```

**After:**
```typescript
import { secureFetch } from '@/server/lib/secure-fetch';

const response = await secureFetch('https://api.example.com/data', {
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' },
  certificateValidation: {
    nearExpiryWarningDays: 30,
    strictValidation: true,
  },
});
```

## References

- **SSD-4**: Veilige Communicatie
- **SSD-4.3.02**: Certificaat geldigheidsduur verificatie
- **Node.js TLS Documentation**: https://nodejs.org/api/tls.html
- **Node.js HTTPS Agent**: https://nodejs.org/api/https.html#class-httpsagent
