# Security Implementation Guide

This directory contains security-related utilities and configurations for SSD-4 compliance.

## Overview

The application implements industry-standard secure protocols and cryptography to meet SSD-4.1.01 requirements:

✅ **TLS 1.2+** for all connections
✅ **NIST-approved algorithms** (AES-256-GCM, PBKDF2-SHA256)
✅ **No deprecated protocols** (no SSL, TLS 1.0/1.1, MD5, SHA-1)

## Components

### 1. Encryption (`../encryption.ts`)

NIST-compliant encryption for data at rest using AES-256-GCM.

```typescript
import { encrypt, decrypt, verifyCryptoCompliance } from '@/lib/encryption';

// Encrypt sensitive data
const encrypted = encrypt('sensitive patient data');

// Decrypt when needed
const decrypted = decrypt(encrypted);
const plaintext = decrypted.toString('utf8');

// Verify NIST compliance
const compliance = verifyCryptoCompliance();
if (compliance.compliant) {
  console.log('Cryptography meets NIST guidelines');
}
```

**Features:**
- AES-256-GCM authenticated encryption
- PBKDF2-SHA256 key derivation (100,000 iterations)
- Unique salt and IV for each encryption
- Authentication tag for integrity verification

### 2. Secure HTTP Client (`../secure-http-client.ts`)

Enforces TLS 1.2+ and HTTPS for all external connections.

```typescript
import { secureFetch, validateSecureConnection } from '@/lib/secure-http-client';

// Validate connection before use
validateSecureConnection('https://api.example.com', 'External API');

// Make secure HTTP request (enforces HTTPS, TLS 1.2+)
const response = await secureFetch('https://api.example.com/data', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'value' }),
  timeout: 10000,
});
```

**Features:**
- HTTPS enforcement (rejects HTTP)
- TLS 1.2+ requirement
- Configurable timeouts
- Localhost restrictions in production
- Comprehensive error handling

### 3. Security Headers (`../middleware/security-headers.ts`)

HTTP security headers middleware for Next.js.

```typescript
import { securityHeadersMiddleware } from '@/middleware/security-headers';

// In middleware.ts
export function middleware(request: NextRequest) {
  return securityHeadersMiddleware(request);
}

// In API routes
import { getSecurityHeaders } from '@/middleware/security-headers';

export async function GET() {
  return new Response('OK', {
    headers: {
      ...getSecurityHeaders(),
      'Content-Type': 'application/json',
    },
  });
}
```

**Headers included:**
- `Strict-Transport-Security` (HSTS)
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Content-Security-Policy`
- `Referrer-Policy`
- `Permissions-Policy`
- Cross-Origin policies

## Quick Start

### 1. Set Up Encryption

Add the encryption master key to your environment:

```bash
# .env.local
ENCRYPTION_MASTER_KEY="your-secure-random-key-here"
```

Generate a secure key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2. Use Secure HTTP Client

Replace `fetch` with `secureFetch` for external API calls:

```typescript
// Before
const response = await fetch('https://api.example.com/data');

// After
import { secureFetch } from '@/lib/secure-http-client';
const response = await secureFetch('https://api.example.com/data');
```

### 3. Apply Security Headers

Add middleware to apply security headers to all responses:

```typescript
// middleware.ts
import { securityHeadersMiddleware } from '@/middleware/security-headers';

export function middleware(request: NextRequest) {
  return securityHeadersMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## Testing

Run the comprehensive test suite:

```bash
# Test encryption
pnpm test apps/web/src/lib/__tests__/encryption.test.ts

# Test secure HTTP client
pnpm test apps/web/src/lib/__tests__/secure-http-client.test.ts

# Test security headers
pnpm test apps/web/src/middleware/__tests__/security-headers.test.ts
```

## Compliance Verification

### Runtime Verification

```typescript
import { verifyCryptoCompliance } from '@/lib/encryption';
import { getTlsInfo } from '@/lib/secure-http-client';
import { validateSecurityHeaders } from '@/middleware/security-headers';

// Check encryption compliance
const cryptoStatus = verifyCryptoCompliance();
console.log('Crypto compliant:', cryptoStatus.compliant);

// Check TLS support
const tlsInfo = getTlsInfo();
console.log('TLS version:', tlsInfo.minVersion, '-', tlsInfo.maxVersion);

// Check security headers
const headers = response.headers;
const headerStatus = validateSecurityHeaders(headers);
console.log('Headers compliant:', headerStatus.valid);
```

### Automated Testing

All security implementations include comprehensive test suites that verify:

- NIST algorithm compliance
- TLS version requirements
- Security header presence
- Error handling
- Edge cases

## Documentation

For detailed compliance information, see:

- **[CRYPTOGRAPHY_COMPLIANCE.md](/CRYPTOGRAPHY_COMPLIANCE.md)** - Full compliance documentation
- **NIST Standards:**
  - [FIPS 197](https://nvlpubs.nist.gov/nistpubs/FIPS/NIST.FIPS.197.pdf) - AES
  - [SP 800-38D](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf) - GCM
  - [SP 800-132](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-132.pdf) - PBKDF2
  - [SP 800-52 Rev. 2](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-52r2.pdf) - TLS

## Best Practices

### 1. Encrypt Sensitive Data

Always encrypt personally identifiable information (PII) and protected health information (PHI):

```typescript
// Encrypt before storing
const encryptedData = encrypt(sensitiveData);
await db.insert({ data: encryptedData });

// Decrypt when reading
const row = await db.query(...);
const decryptedData = decrypt(row.data);
```

### 2. Use Secure Connections

Always use `secureFetch` for external API calls:

```typescript
// Services should validate connection at initialization
export class ExternalApiService {
  static readonly API_URL = "https://api.example.com";

  static {
    validateSecureConnection(this.API_URL, "External API");
  }

  static async getData() {
    return await secureFetch(`${this.API_URL}/data`);
  }
}
```

### 3. Apply Security Headers

Ensure all HTTP responses include security headers:

```typescript
// API routes should include security headers
export async function GET() {
  return new Response(JSON.stringify(data), {
    headers: {
      ...getSecurityHeaders(),
      'Content-Type': 'application/json',
    },
  });
}
```

### 4. Regular Security Audits

- Run tests before each deployment
- Monitor NIST publications for algorithm updates
- Review security configurations quarterly
- Update dependencies regularly

## Troubleshooting

### Encryption Errors

```typescript
// Error: ENCRYPTION_MASTER_KEY not set
// Solution: Add to environment variables
process.env.ENCRYPTION_MASTER_KEY = "your-key";

// Error: Decryption failed
// Possible causes:
// - Wrong key
// - Tampered ciphertext
// - Corrupted data
```

### TLS Errors

```typescript
// Error: Insecure protocol detected
// Solution: Use HTTPS instead of HTTP
const url = "https://api.example.com"; // Not http://

// Error: Node.js version not supported
// Solution: Upgrade to Node.js v12+
```

### Security Header Issues

```typescript
// Some headers missing
const validation = validateSecurityHeaders(headers);
console.log('Missing:', validation.missing);

// CSP too restrictive in development
const csp = getCspForEnvironment('development');
```

## Support

For security-related questions or concerns:

- Review: [CRYPTOGRAPHY_COMPLIANCE.md](/CRYPTOGRAPHY_COMPLIANCE.md)
- Security Team: [To be assigned]
- Compliance Officer: [To be assigned]

## Updates

This implementation is current as of:
- **Date:** 2026-02-22
- **SSD Version:** 4.1.01
- **Next Review:** 2026-05-22
