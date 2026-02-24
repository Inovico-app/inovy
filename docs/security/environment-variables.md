# Security-Related Environment Variables

This document describes environment variables related to security and certificate validation.

## Certificate Validation

### CA_CERTIFICATE_PATH

**Optional** - Path to custom CA certificate file

**Format:** File path to PEM-encoded certificate

**Example:**
```bash
CA_CERTIFICATE_PATH=/etc/ssl/certs/custom-ca.pem
```

**Usage:**
- Add organization-specific CA certificates
- Support internal APIs with custom certificate authorities
- Enable communication with services using non-public CAs

**Notes:**
- File must exist and be readable
- Must be in PEM format
- Can contain multiple certificates (concatenated)
- Loaded on application startup
- Combined with system CA certificates

### CA_CERTIFICATE

**Optional** - Custom CA certificate content

**Format:** PEM-encoded certificate string

**Example:**
```bash
CA_CERTIFICATE="-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKL0pMVU7I8ZMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjEwMTAxMDAwMDAwWhcNMzEwMTAxMDAwMDAwWjBF
...
-----END CERTIFICATE-----"
```

**Usage:**
- Add CA certificate directly via environment variable
- Cloud deployments where file system access is limited
- Containerized environments
- Secret management systems

**Notes:**
- Must be complete PEM-encoded certificate
- Include BEGIN and END markers
- Can contain multiple certificates (concatenated)
- Loaded on application startup
- Combined with system CA certificates

### NODE_TLS_REJECT_UNAUTHORIZED

**FORBIDDEN** - This variable must NEVER be set to "0"

**Status:** ❌ Setting this to "0" disables certificate validation globally

**Security Impact:**
- Disables ALL certificate validation in Node.js
- Exposes application to man-in-the-middle attacks
- Violates SSD-4.3.01 security requirements
- Makes all HTTPS connections insecure

**Correct Usage:**
```bash
# ✅ Do not set this variable (default is secure)
# NODE_TLS_REJECT_UNAUTHORIZED is not set

# ✅ Or explicitly enable validation (redundant but acceptable)
NODE_TLS_REJECT_UNAUTHORIZED=1
```

**Forbidden Usage:**
```bash
# ❌ NEVER do this in any environment
NODE_TLS_REJECT_UNAUTHORIZED=0
NODE_TLS_REJECT_UNAUTHORIZED="0"
```

## External API Keys

The following API keys are used for external service communication. All services use HTTPS with certificate validation.

### RECALL_API_KEY

**Required** for bot recording functionality

**Format:** API key token

**Example:**
```bash
RECALL_API_KEY=your-recall-api-key-here
```

**Security:**
- ✅ Uses HTTPS: `https://eu-central-1.recall.ai/api/v1`
- ✅ Certificate validation: Enabled
- ✅ TLS 1.2+: Enforced

### HUGGINGFACE_API_KEY

**Optional** for AI reranking functionality

**Format:** Bearer token

**Example:**
```bash
HUGGINGFACE_API_KEY=hf_your_token_here
```

**Security:**
- ✅ Uses HTTPS: `https://api-inference.huggingface.co`
- ✅ Certificate validation: Enabled
- ✅ TLS 1.2+: Enforced

### OPENAI_API_KEY

**Required** for AI embeddings and chat functionality

**Format:** API key with `sk-` prefix

**Example:**
```bash
OPENAI_API_KEY=sk-your-openai-key-here
```

**Security:**
- ✅ Uses HTTPS via official OpenAI SDK
- ✅ Certificate validation: Enabled by SDK
- ✅ TLS 1.2+: Enforced by SDK

### QDRANT_URL

**Required** for vector database operations

**Format:** Full URL with protocol

**Example:**
```bash
# Local development
QDRANT_URL=http://localhost:6333

# Production (HTTPS required)
QDRANT_URL=https://your-cluster.qdrant.io
```

**Security:**
- ✅ HTTPS in production
- ✅ Certificate validation: Enabled for HTTPS
- ✅ TLS 1.2+: Enforced for HTTPS

### QDRANT_API_KEY

**Required** for Qdrant cloud instances

**Format:** API key string

**Example:**
```bash
QDRANT_API_KEY=your-qdrant-api-key
```

**Security:**
- ✅ Used only with HTTPS endpoints
- ✅ Certificate validation: Enabled
- ✅ TLS 1.2+: Enforced

### DEEPGRAM_API_KEY

**Required** for speech-to-text functionality

**Format:** API key string

**Example:**
```bash
DEEPGRAM_API_KEY=your-deepgram-api-key
```

**Security:**
- ✅ Uses HTTPS via official Deepgram SDK
- ✅ Certificate validation: Enabled by SDK
- ✅ TLS 1.2+: Enforced by SDK

### GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

**Required** for Google integrations (Calendar, Drive, Gmail)

**Format:** OAuth 2.0 credentials

**Example:**
```bash
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://your-app.com/api/integrations/google/callback
```

**Security:**
- ✅ Uses HTTPS via official Google APIs SDK
- ✅ Certificate validation: Enabled by SDK
- ✅ TLS 1.2+: Enforced by SDK
- ✅ OAuth 2.0: Industry-standard authentication

## Webhook Configuration

### WEBHOOK_BASE_URL

**Required** for receiving webhooks from external services

**Format:** Full HTTPS URL

**Example:**
```bash
WEBHOOK_BASE_URL=https://your-app.com
```

**Security:**
- ✅ Must use HTTPS in production
- ✅ Vercel provides valid SSL certificates
- ✅ Automatic certificate management

## Validation

### Automated Validation Script

Run the certificate validation script to verify configuration:

```bash
pnpm tsx scripts/validate-certificates.ts
```

This script checks:
- Certificate validation is enabled
- TLS version configuration
- CA certificate count
- Environment variable configuration
- Security misconfigurations

### CI/CD Integration

Add to your CI pipeline to prevent deployment with insecure configuration:

```yaml
# .github/workflows/security-check.yml
- name: Validate Certificate Configuration
  run: pnpm tsx scripts/validate-certificates.ts
```

## Best Practices

### 1. Never Disable Certificate Validation

```bash
# ❌ NEVER
NODE_TLS_REJECT_UNAUTHORIZED=0

# ✅ ALWAYS (or leave unset)
NODE_TLS_REJECT_UNAUTHORIZED=1
```

### 2. Use HTTPS in Production

All external URLs must use HTTPS:

```bash
# ❌ Insecure
QDRANT_URL=http://your-cluster.qdrant.io

# ✅ Secure
QDRANT_URL=https://your-cluster.qdrant.io
```

### 3. Protect API Keys

- Never commit API keys to version control
- Use environment variables or secret management systems
- Rotate keys regularly
- Use minimum required permissions

### 4. Custom CA Certificates

When adding custom CAs:
- Verify CA certificate authenticity
- Document why custom CA is needed
- Review and update regularly
- Test certificate validation after changes

## Troubleshooting

### Issue: Certificate validation fails

**Symptoms:**
- API calls fail with certificate errors
- Error messages about untrusted certificates

**Solutions:**
1. Check if API uses valid public CA certificate
2. Verify API endpoint URL is correct
3. If using internal API, add CA certificate via `CA_CERTIFICATE_PATH` or `CA_CERTIFICATE`
4. Check if certificate has expired

### Issue: Self-signed certificate in development

**Development Only Solution:**
```typescript
import { secureFetch } from '@/lib/security';

// Only for local development, never in production
const response = await secureFetch(url, {
  skipCertValidation: process.env.NODE_ENV === 'development'
});
```

**Better Solution:**
Use a proper development certificate:
- Use mkcert for local HTTPS
- Use ngrok for external HTTPS
- Use Let's Encrypt for staging environments

## Security Compliance

This configuration satisfies:
- **SSD-4.3.01:** Verify certificate is signed by trusted CA
- **NEN 7510:** Information security in healthcare
- **AVG/GDPR:** Data protection in transit
- **ISO 27001:** Information security management

## References

- [Node.js TLS/SSL Documentation](https://nodejs.org/api/tls.html)
- [OWASP Transport Layer Protection](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)
- [Certificate Validation Implementation](./certificate-validation.md)
