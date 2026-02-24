# Security Documentation

This document describes the security measures implemented in Inovy, with a focus on encryption at rest and key management practices.

## Encryption at Rest

### Overview

Inovy implements **AES-256-GCM encryption** for data at rest, meeting the **SSD-2.3.02** security requirement. All sensitive data is encrypted by default using industry-standard cryptographic algorithms.

### Encryption Standards

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 128 bits (16 bytes)
- **Authentication Tag**: 128 bits (16 bytes)
- **Key Derivation**: PBKDF2 with SHA-256, 100,000 iterations
- **Salt Size**: 512 bits (64 bytes)

### What Data is Encrypted

#### 1. Recording Files (Secure by Default)

All uploaded and bot-generated recording files are encrypted at rest in Vercel Blob storage:

- **Location**: `apps/web/src/lib/encryption.ts`
- **Environment Variable**: `ENCRYPTION_MASTER_KEY` (required)
- **Opt-out**: Set `DISABLE_ENCRYPTION_AT_REST=true` (not recommended)
- **Storage**: Vercel Blob with private access mode
- **Metadata**: Encryption metadata stored in `recordings.encryptionMetadata` field

**Encryption Flow:**
```
Upload → Encrypt (AES-256-GCM) → Store in Blob (private) → Save metadata in DB
Playback → Fetch from Blob → Decrypt → Stream to authorized user
```

#### 2. OAuth Tokens (Always Encrypted)

OAuth access and refresh tokens for Google Workspace and Microsoft 365 integrations:

- **Location**: `apps/web/src/features/integrations/google/lib/google-oauth.ts`
- **Environment Variable**: `OAUTH_ENCRYPTION_KEY` (required, 64 hex characters)
- **Storage**: `oauth_connections` table
- **Algorithm**: AES-256-GCM with 128-bit IV and authentication tag
- **Format**: `iv:authTag:encryptedData` (hex-encoded components)

**Encrypted Fields:**
- `oauth_connections.accessToken`
- `oauth_connections.refreshToken`

#### 3. Better Auth Managed Data

Better Auth handles encryption for:

- **Passwords**: Hashed with Argon2id (Better Auth default)
- **Session tokens**: Cryptographically secure random tokens
- **Magic link tokens**: Cryptographically secure random tokens
- **Passkey credentials**: WebAuthn public keys (not sensitive)

These are managed by Better Auth's internal security mechanisms and do not require additional application-level encryption.

## Key Management

### Encryption Keys

The application uses **two separate encryption keys** for different purposes:

#### 1. ENCRYPTION_MASTER_KEY

**Purpose**: Encrypts recording files at rest

**Requirements:**
- Must be a strong, random hex string (minimum 32 bytes recommended)
- Should be at least 256 bits of entropy
- Must be kept secret and never committed to version control

**Generation:**
```bash
# Generate a secure master key
openssl rand -hex 32
```

**Configuration:**
```env
# Production - Use secure key management service
ENCRYPTION_MASTER_KEY=<64-character-hex-string>

# Optional: Disable encryption (not recommended for production)
DISABLE_ENCRYPTION_AT_REST=true
```

**Storage Recommendations:**
- **Development**: Environment variables in `.env.local` (gitignored)
- **Production**: Use a secrets management service:
  - AWS Secrets Manager
  - HashiCorp Vault
  - Azure Key Vault
  - Google Cloud Secret Manager
  - Vercel Environment Variables (encrypted at rest)

#### 2. OAUTH_ENCRYPTION_KEY

**Purpose**: Encrypts OAuth access and refresh tokens

**Requirements:**
- Must be exactly 32 bytes (64 hex characters)
- Should be cryptographically random
- Must be kept secret and never committed to version control

**Generation:**
```bash
# Generate a secure OAuth encryption key
openssl rand -hex 32
```

**Configuration:**
```env
OAUTH_ENCRYPTION_KEY=<64-character-hex-string>
```

**Storage:** Same recommendations as `ENCRYPTION_MASTER_KEY`

### Key Rotation

When rotating encryption keys:

#### For Recording Files (ENCRYPTION_MASTER_KEY):

1. **Keep old key accessible** during transition
2. **Generate new key** using `openssl rand -hex 32`
3. **Update environment** with new key as `ENCRYPTION_MASTER_KEY_NEW`
4. **Migration approach:**
   - Option A: Decrypt with old key, re-encrypt with new key (recommended)
   - Option B: Store multiple key versions with key ID metadata
5. **Remove old key** only after all data is re-encrypted
6. **Update environment** to use only new key

#### For OAuth Tokens (OAUTH_ENCRYPTION_KEY):

1. **Generate new key** using `openssl rand -hex 32`
2. **Update environment** variable
3. **Force re-authentication** for all users (tokens will be re-encrypted on next login)
4. **Revoke old tokens** with OAuth providers

**Key Rotation Frequency:**
- **Recommended**: Every 12 months
- **Required**: After any suspected key compromise
- **Best Practice**: Automated rotation with proper key versioning

## Security Features

### Authenticated Encryption (AES-GCM)

AES-GCM provides both **confidentiality** and **authenticity**:

- **Confidentiality**: Data is encrypted and cannot be read without the key
- **Authenticity**: Authentication tag ensures data has not been tampered with
- **Performance**: Hardware acceleration available on modern CPUs (AES-NI)

**Benefits over AES-CBC:**
- Built-in authentication (no need for separate HMAC)
- Prevents tampering and bit-flipping attacks
- Single-pass encryption and authentication
- Recommended by NIST for authenticated encryption

### Key Derivation (PBKDF2)

**Purpose**: Derives encryption keys from the master key with a random salt

**Parameters:**
- **Function**: PBKDF2
- **Hash**: SHA-256
- **Iterations**: 100,000
- **Salt**: 64 bytes (random per encryption)

**Benefits:**
- Each encryption uses a unique derived key (via unique salt)
- Protects against rainbow table attacks
- Meets OWASP recommendations for key derivation

### Data Flow Security

#### Upload Flow:
```
1. User uploads file → Validate file type and size
2. Check encryption configuration → Ensure ENCRYPTION_MASTER_KEY is set
3. Encrypt file in memory → AES-256-GCM with unique salt and IV
4. Upload to Vercel Blob → Private access mode
5. Store metadata → Save encryption metadata in database
```

#### Playback Flow:
```
1. Authenticate user → Verify session and organization access
2. Fetch encrypted file → Download from Vercel Blob
3. Decrypt in memory → Use ENCRYPTION_MASTER_KEY
4. Stream to user → Serve with appropriate cache headers
```

### Security Defaults

**Secure by Default Principle:**
- Encryption is **enabled by default** for all recording files
- OAuth tokens are **always encrypted** (no opt-out)
- Better Auth manages password hashing securely
- Private access mode for encrypted files in Blob storage

**Opt-out (Not Recommended):**
```env
# Only disable encryption in non-production environments
DISABLE_ENCRYPTION_AT_REST=true
```

## Compliance

### SSD-2.3.02 Compliance

**Requirement**: Data encrypted at rest with AES-GCM 256 or equivalent

**Implementation Status**: ✅ **COMPLIANT**

- [x] AES-GCM 256 encryption implemented
- [x] Encryption keys properly managed
- [x] Secure by default (encryption enabled by default)
- [x] Industry-standard cryptography (AES-256-GCM, PBKDF2)
- [x] Authenticated encryption (GCM mode with auth tags)
- [x] Key derivation with salt (PBKDF2, 100k iterations)
- [x] Documentation provided for key management

### AVG/GDPR Compliance

**Data Protection Measures:**
- Encryption at rest for sensitive data
- Secure key management practices
- Access control with organization isolation
- Audit logging for all data access
- Data export and deletion capabilities

### NEN 7510 Compliance

**Information Security in Healthcare:**
- Encryption meets NEN 7510 requirements
- Key management follows best practices
- Access control and logging implemented
- Incident response procedures (see audit logs)

## Testing

### Running Encryption Tests

```bash
# From apps/web directory
export ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)
npx tsx src/lib/__tests__/encryption.test.ts
```

**Test Coverage:**
- Basic string encryption/decryption
- Buffer encryption/decryption
- Large file encryption (1MB+)
- Authentication tag validation (tamper detection)
- Unique encryption (different ciphertext for same plaintext)
- Empty data handling
- Unicode/UTF-8 support
- Error handling for invalid data
- Encryption metadata generation
- Encrypted data format validation
- Key derivation consistency

## Best Practices

### Development Environment

1. **Never commit encryption keys** to version control
2. **Use `.env.local`** for local development (gitignored)
3. **Generate unique keys** per environment (dev, staging, prod)
4. **Test encryption** with test keys before deploying

### Production Environment

1. **Use secrets management service** (AWS Secrets Manager, Vault, etc.)
2. **Enable encryption by default** (do not set `DISABLE_ENCRYPTION_AT_REST`)
3. **Monitor key usage** and set up alerts for failures
4. **Implement key rotation** policy (every 12 months)
5. **Backup keys securely** in encrypted storage
6. **Restrict key access** to authorized personnel only
7. **Audit key access** regularly
8. **Use different keys** per environment

### Operational Security

1. **Log all encryption failures** (already implemented)
2. **Monitor decryption errors** for potential attacks
3. **Set up alerts** for repeated decryption failures
4. **Regular security audits** of encryption implementation
5. **Penetration testing** to verify security
6. **Incident response plan** for key compromise

## Architecture Decisions

### Why AES-256-GCM?

1. **Industry Standard**: Widely adopted and proven secure
2. **Authenticated Encryption**: Built-in tamper detection
3. **Performance**: Hardware acceleration available
4. **NIST Recommended**: Approved for government use
5. **Future-Proof**: Expected to remain secure for decades

### Why PBKDF2 for Key Derivation?

1. **Standard Compliance**: Widely recommended by OWASP
2. **Configurable Iterations**: Can increase over time as CPUs improve
3. **Salt Support**: Unique key per encryption operation
4. **Proven Security**: Extensively analyzed and tested
5. **Library Support**: Available in Node.js crypto module

### Why Two Separate Keys?

1. **Separation of Concerns**: Different keys for different data types
2. **Blast Radius Reduction**: Compromise of one key doesn't affect all data
3. **Key Rotation**: Easier to rotate keys for specific data types
4. **Access Control**: Different services can have access to different keys

## Troubleshooting

### Common Issues

#### "ENCRYPTION_MASTER_KEY environment variable is not set"

**Solution:**
```bash
# Generate and set the key
export ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)

# Or add to .env.local:
echo "ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)" >> .env.local
```

#### "OAUTH_ENCRYPTION_KEY must be 32 bytes (64 hex characters)"

**Solution:**
```bash
# Generate a 32-byte key
export OAUTH_ENCRYPTION_KEY=$(openssl rand -hex 32)
```

#### "Decryption failed: Invalid key or tampered data"

**Causes:**
1. Wrong encryption key being used
2. Data was tampered with
3. Corrupted encrypted data
4. Key was rotated without migrating data

**Solution:**
- Verify `ENCRYPTION_MASTER_KEY` matches the key used for encryption
- Check audit logs for potential tampering
- Restore from backup if data is corrupted

#### "Failed to decrypt recording"

**Causes:**
1. File was encrypted with different key
2. Blob storage returned corrupted data
3. Network error during download

**Solution:**
- Check encryption metadata in database
- Verify Blob storage integrity
- Re-upload recording if necessary

## Security Contacts

For security issues or key compromise:

1. **Immediate Actions:**
   - Rotate affected keys immediately
   - Review audit logs for suspicious activity
   - Notify security team
   - Document the incident

2. **Incident Response:**
   - Follow incident response plan
   - Assess impact and affected data
   - Implement remediation measures
   - Update security documentation

## References

- [NIST Special Publication 800-38D (GCM)](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [SSD-2.3.02: Data Encryption at Rest](Linear Issue INO2-321)
- [AVG/GDPR Encryption Requirements](https://gdpr.eu/encryption/)
- [NEN 7510 Information Security in Healthcare](https://www.nen.nl/en/nen-7510-2017-nl-268885)

## Version History

- **v1.0** (2026-02-24): Initial security documentation
  - AES-256-GCM encryption implementation
  - PBKDF2 key derivation
  - OAuth token encryption
  - Secure by default configuration
  - Comprehensive test suite
