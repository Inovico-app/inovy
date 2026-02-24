# Certificate Validation Implementation

**SSD Requirement:** SSD-4.3.01 - Verify certificate is signed by trusted CA

## Overview

This document describes the certificate validation implementation to ensure all external API communications verify SSL/TLS certificates against trusted Certificate Authorities (CAs), preventing man-in-the-middle attacks.

## Implementation Status

✅ **Implemented** - Certificate validation is enforced across all external API calls

## Architecture

### 1. Secure HTTPS Agent

**Location:** `apps/web/src/lib/security/https-agent.ts`

A singleton HTTPS agent manager that:
- Enforces `rejectUnauthorized: true` to validate certificates
- Uses TLS 1.2 and 1.3 for secure communication
- Loads Node.js system CA certificates by default
- Supports custom CA certificates via environment variables
- Provides validation configuration introspection

**Key Features:**
- **Singleton Pattern:** Single agent instance across the application
- **CA Certificate Chain:** Uses Node.js built-in trusted CA certificates
- **Custom CA Support:** Allows adding organization-specific CA certificates
- **TLS Version Control:** Enforces minimum TLS 1.2
- **Logging:** Comprehensive logging for security auditing

### 2. Secure Fetch Wrapper

**Location:** `apps/web/src/lib/security/secure-fetch.ts`

A wrapper around native `fetch()` that:
- Automatically applies the secure HTTPS agent to all HTTPS requests
- Logs certificate validation failures with detailed error messages
- Provides optional request logging for security auditing
- Prevents accidental certificate validation bypass

**Key Features:**
- **Automatic Certificate Validation:** All HTTPS requests validate certificates
- **Error Detection:** Identifies and logs certificate-related errors
- **Request Logging:** Optional detailed logging for audit trails
- **Type Safety:** Full TypeScript support with proper typing

## Updated Services

The following services have been updated to use `secureFetch`:

1. **Recall API Service** (`apps/web/src/server/services/recall-api.service.ts`)
   - External API: `https://eu-central-1.recall.ai/api/v1`
   - Operations: Bot session creation, status checks, recording downloads

2. **Reranker Service** (`apps/web/src/server/services/rag/reranker.service.ts`)
   - External API: `https://api-inference.huggingface.co/models/`
   - Operations: AI model inference for search result reranking

3. **Metadata Extractor** (`apps/web/src/server/services/metadata-extractor.service.ts`)
   - Operations: PDF downloads from external URLs

4. **Document Service** (`apps/web/src/server/services/document.service.ts`)
   - Operations: Document downloads (PDF, DOCX, text files) from external URLs

## Third-Party SDK Certificate Validation

### Node.js Default Behavior

**Status:** ✅ All third-party SDKs use Node.js default certificate validation

Node.js validates SSL/TLS certificates by default for all HTTPS connections. This applies to:
- Native `https` module
- Native `fetch()` API (Node.js 18+)
- All third-party libraries built on top of these modules

### Verified SDKs

#### 1. OpenAI SDK (`openai`)
- **Status:** ✅ Validates certificates by default
- **Implementation:** Uses native fetch/https modules
- **Location:** `apps/web/src/server/services/document.service.ts`
- **Usage:** Embedding generation (`text-embedding-3-large`)

#### 2. Google APIs (`googleapis`)
- **Status:** ✅ Validates certificates by default
- **Implementation:** Uses native `https` module
- **Locations:**
  - `apps/web/src/server/services/google-calendar.service.ts`
  - `apps/web/src/server/services/google-drive.service.ts`
  - `apps/web/src/server/services/google-gmail.service.ts`
- **Services:** Calendar, Drive, Gmail APIs

#### 3. Qdrant Client (`@qdrant/js-client-rest`)
- **Status:** ✅ Validates certificates by default
- **Implementation:** Uses native fetch/https modules
- **Location:** `apps/web/src/server/services/rag/qdrant.service.ts`
- **Usage:** Vector database operations

#### 4. Deepgram SDK (`@deepgram/sdk`)
- **Status:** ✅ Validates certificates by default
- **Implementation:** Uses native https module
- **Location:** `apps/web/src/lib/deepgram.ts`
- **Usage:** Speech-to-text transcription

### Verification Method

All SDKs inherit certificate validation from Node.js runtime:
1. Node.js uses OpenSSL for TLS/SSL
2. System CA certificates are loaded by default
3. Certificate validation is enabled unless explicitly disabled
4. No `NODE_TLS_REJECT_UNAUTHORIZED=0` in our environment
5. No `rejectUnauthorized: false` in any configuration

## Environment Configuration

### Required Environment Variables

No environment variables are required for basic certificate validation. The system uses Node.js default CA certificates.

### Optional Environment Variables

#### Custom CA Certificate Path
```bash
CA_CERTIFICATE_PATH=/path/to/custom-ca.pem
```
- **Purpose:** Add organization-specific CA certificates
- **Format:** PEM-encoded certificate file
- **Use Case:** Internal APIs with custom CAs

#### Custom CA Certificate Content
```bash
CA_CERTIFICATE="-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKL...
-----END CERTIFICATE-----"
```
- **Purpose:** Add CA certificate directly via environment variable
- **Format:** PEM-encoded certificate string
- **Use Case:** Cloud deployments, containerized environments

### Certificate Validation Must Never Be Disabled

The following configurations are **FORBIDDEN**:

```bash
# ❌ NEVER use these
NODE_TLS_REJECT_UNAUTHORIZED=0
NODE_TLS_REJECT_UNAUTHORIZED="0"
```

```typescript
// ❌ NEVER use this
const agent = new https.Agent({
  rejectUnauthorized: false
});
```

## Trusted CA List

### System CA Certificates

The application uses Node.js built-in CA certificates, which includes:
- Common public CAs (Let's Encrypt, DigiCert, GlobalSign, etc.)
- Root and intermediate certificates
- Regularly updated with Node.js security patches

**Current CA Count:** ~140+ root certificates (varies by Node.js version)

### Verification

Check current CA configuration:
```typescript
import { validateHttpsConfiguration } from '@/lib/security';

const config = validateHttpsConfiguration();
console.log(config);
// {
//   rejectUnauthorized: true,
//   tlsVersion: "TLSv1.2 - TLSv1.3",
//   caCount: 142,
//   hasCustomCa: false
// }
```

## Security Benefits

### 1. Man-in-the-Middle (MITM) Attack Prevention
- **Protection:** Validates server identity via certificates
- **Mechanism:** Ensures server presents valid certificate signed by trusted CA
- **Result:** Prevents attackers from impersonating legitimate servers

### 2. Data Confidentiality
- **Protection:** Ensures encrypted communication channels
- **Mechanism:** TLS 1.2/1.3 with certificate validation
- **Result:** Prevents eavesdropping on sensitive data

### 3. Data Integrity
- **Protection:** Detects tampering of data in transit
- **Mechanism:** TLS integrity checks with validated certificates
- **Result:** Ensures data arrives unmodified

### 4. Authentication
- **Protection:** Verifies API endpoint authenticity
- **Mechanism:** Certificate chain validation to trusted root CA
- **Result:** Confirms communication with legitimate services

## Testing & Validation

### Manual Testing

Test certificate validation:
```typescript
import { secureFetch } from '@/lib/security';

// ✅ Should succeed with valid certificate
const response = await secureFetch('https://api.example.com/endpoint');

// ❌ Should fail with invalid certificate
try {
  await secureFetch('https://self-signed.badssl.com/');
} catch (error) {
  console.log('Certificate validation working:', error.message);
}
```

### Validation Script

Create a validation script to test certificate handling:

```typescript
// scripts/validate-certificates.ts
import { validateHttpsConfiguration } from '@/lib/security';

const config = validateHttpsConfiguration();

console.log('Certificate Validation Configuration:');
console.log('=====================================');
console.log(`Certificate Validation: ${config.rejectUnauthorized ? '✅ ENABLED' : '❌ DISABLED'}`);
console.log(`TLS Version: ${config.tlsVersion}`);
console.log(`CA Certificate Count: ${config.caCount}`);
console.log(`Custom CA Loaded: ${config.hasCustomCa ? 'Yes' : 'No'}`);

if (!config.rejectUnauthorized) {
  console.error('❌ ERROR: Certificate validation is disabled!');
  process.exit(1);
}

console.log('\n✅ All certificate validation checks passed');
```

### CI/CD Integration

Add to your CI pipeline:
```yaml
- name: Validate Certificate Configuration
  run: pnpm tsx scripts/validate-certificates.ts
```

## Monitoring & Logging

### Certificate Validation Logs

All certificate validation events are logged:

**Successful Requests:**
```json
{
  "level": "debug",
  "component": "secureFetch",
  "url": "https://api.example.com/endpoint",
  "method": "GET",
  "hasCertValidation": true
}
```

**Certificate Errors:**
```json
{
  "level": "error",
  "component": "secureFetch",
  "url": "https://api.example.com/endpoint",
  "error": "certificate has expired",
  "advice": "This error indicates that the server's SSL/TLS certificate is not trusted. Check the certificate validity and CA chain."
}
```

### Agent Initialization Logs

```json
{
  "level": "info",
  "component": "SecureHttpsAgentManager",
  "message": "Initialized HTTPS agent with system CA certificates",
  "systemCaCount": 142
}
```

## Troubleshooting

### Certificate Validation Failures

**Symptom:** API calls fail with certificate errors

**Common Causes:**
1. **Expired Certificate:** Server certificate has expired
   - **Solution:** Contact API provider to renew certificate

2. **Self-Signed Certificate:** Server uses self-signed certificate
   - **Solution:** Add CA certificate via `CA_CERTIFICATE_PATH` or `CA_CERTIFICATE`

3. **Untrusted CA:** Server certificate signed by unknown CA
   - **Solution:** Verify API provider legitimacy, add CA certificate if trusted

4. **Hostname Mismatch:** Certificate issued for different domain
   - **Solution:** Use correct API endpoint URL

5. **Incomplete Certificate Chain:** Missing intermediate certificates
   - **Solution:** Contact API provider to fix certificate chain

### Testing with Self-Signed Certificates (Development Only)

**⚠️ For development/testing purposes only, never in production:**

```typescript
import { secureFetch } from '@/lib/security';

// Development only: temporarily skip validation
const response = await secureFetch(
  'https://localhost:3000',
  { skipCertValidation: true }
);
```

## Compliance

### SSD-4.3.01 Requirements

| Requirement | Status | Implementation |
|------------|--------|----------------|
| Certificate validation implemented | ✅ | `secureFetch` with `https.Agent` |
| Trusted CA list maintained | ✅ | Node.js system CA + optional custom CAs |
| Invalid certificates rejected | ✅ | `rejectUnauthorized: true` |
| TLS 1.2+ enforced | ✅ | `minVersion: "TLSv1.2"` |
| Logging and monitoring | ✅ | Comprehensive logging in `secureFetch` |

### Audit Trail

All certificate validation events are logged with:
- Timestamp
- Component name
- URL/endpoint
- Success/failure status
- Error details (if applicable)
- Certificate validation status

## Maintenance

### Updating CA Certificates

System CA certificates are updated via Node.js updates:
1. Monitor Node.js security advisories
2. Update Node.js version regularly
3. Test after updates to ensure compatibility

### Adding Custom CA Certificates

When needed (e.g., internal APIs):
1. Obtain CA certificate in PEM format
2. Set `CA_CERTIFICATE_PATH` environment variable
3. Restart application to load new certificate
4. Verify with `validateHttpsConfiguration()`

### Refreshing Agent Configuration

To reload CA certificates without restart:
```typescript
import { refreshHttpsAgent } from '@/lib/security';

// Reload CA certificates
refreshHttpsAgent();
```

## References

- [Node.js TLS/SSL Documentation](https://nodejs.org/api/tls.html)
- [OWASP Transport Layer Protection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [Let's Encrypt Certificate Authority](https://letsencrypt.org/)

## Change Log

- **2026-02-24:** Initial implementation of certificate validation system
  - Created secure HTTPS agent with CA validation
  - Implemented secure fetch wrapper
  - Updated all external API services
  - Verified third-party SDK certificate validation
  - Added documentation and testing guidelines
