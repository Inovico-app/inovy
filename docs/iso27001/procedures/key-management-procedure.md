# Key Management Procedure

**Document ID:** ISMS-PROC-KM-001
**Version:** 1.0
**Classification:** Internal
**ISO 27001 Control:** A.8.24 - Use of Cryptography
**Owner:** Engineering Lead
**Last Reviewed:** 2026-03-13

---

## 1. Purpose

This procedure defines the generation, storage, rotation, and destruction of cryptographic keys used across the Inovy platform. It ensures that cryptographic controls are applied consistently and that key material is protected throughout its lifecycle.

## 2. Scope

This procedure covers:

- ENCRYPTION_MASTER_KEY (symmetric key for data-at-rest encryption)
- BETTER_AUTH_SECRET (session signing key)
- JWT signing keys (API authentication)
- Third-party API keys and secrets (Google, Microsoft, Deepgram, OpenAI, Qdrant, etc.)

## 3. Key Generation

### 3.1 ENCRYPTION_MASTER_KEY

Generate a 256-bit (32-byte) cryptographically secure random key:

```bash
openssl rand -base64 32
```

Requirements:

- Must be generated on a trusted workstation or via a secure CI/CD pipeline
- Must use a cryptographically secure random number generator (CSPRNG)
- Never generate keys on shared or untrusted systems

### 3.2 BETTER_AUTH_SECRET

Generate a 256-bit secret for session signing:

```bash
openssl rand -hex 32
```

### 3.3 General API Secrets

For any new service secret:

```bash
openssl rand -base64 48
```

## 4. Key Storage

### 4.1 Current Storage Mechanism

All cryptographic keys are stored as environment variables in:

- **Vercel Environment Variables** (production and preview deployments)
  - Encrypted at rest by Vercel's infrastructure
  - Access restricted to team members with appropriate Vercel roles
- **Local development**: `.env.local` files (git-ignored, never committed)

### 4.2 Access Controls

- Only the Engineering Lead and designated DevOps personnel have access to production secrets in Vercel
- Access to Vercel project settings is governed by Vercel team roles
- All access to secret management interfaces is logged
- Service accounts used in CI/CD have minimum required permissions

### 4.3 Key Inventory

Maintain a key inventory in the ISMS risk register documenting:

| Attribute        | Description                            |
| ---------------- | -------------------------------------- |
| Key Name         | Environment variable name              |
| Purpose          | What the key is used for               |
| Algorithm        | Encryption/signing algorithm used      |
| Key Length       | Key size in bits                       |
| Storage Location | Where the key is stored (Vercel, etc.) |
| Owner            | Responsible person                     |
| Created Date     | When the key was generated             |
| Rotation Date    | When the key was last rotated          |
| Expiry Policy    | How often the key must be rotated      |

## 5. Key Rotation

### 5.1 Scheduled Rotation

| Key                   | Rotation Frequency  | Notes                              |
| --------------------- | ------------------- | ---------------------------------- |
| ENCRYPTION_MASTER_KEY | Every 12 months     | Requires re-encryption of data     |
| BETTER_AUTH_SECRET    | Every 12 months     | All sessions invalidated on rotate |
| Third-party API keys  | Per provider policy | Follow provider recommendations    |

### 5.2 Rotation Procedure

#### Step 1: Generate New Key

```bash
# For ENCRYPTION_MASTER_KEY:
openssl rand -base64 32

# For BETTER_AUTH_SECRET:
openssl rand -hex 32
```

#### Step 2: Update Environment Variables

1. Add the new key as a separate environment variable (e.g., `ENCRYPTION_MASTER_KEY_NEW`)
2. Deploy the application with dual-key support (if applicable)
3. Update the primary environment variable to the new value
4. Remove the old key variable

#### Step 3: Re-encrypt Data (ENCRYPTION_MASTER_KEY only)

1. Run the re-encryption migration script (if data is encrypted at rest)
2. Verify all encrypted data can be decrypted with the new key
3. Log the re-encryption results

#### Step 4: Verify

1. Confirm application starts successfully with the new key
2. Run automated health checks and integration tests
3. Verify authentication flows work correctly (for BETTER_AUTH_SECRET)
4. Monitor error rates for 24 hours post-rotation

#### Step 5: Cleanup

1. Remove the old key from environment variables
2. Update the key inventory with the new rotation date
3. Document the rotation in the change log

### 5.3 Emergency Rotation

Trigger emergency rotation when:

- Key compromise is suspected or confirmed
- Personnel with key access are terminated
- Security incident involving key material is detected

Emergency rotation procedure:

1. **Immediately** generate a new key
2. **Immediately** update the environment variable in production
3. **Immediately** revoke all active sessions (for BETTER_AUTH_SECRET)
4. Deploy the application with the new key
5. File an incident report per the incident response procedure
6. Notify affected stakeholders
7. Conduct a post-incident review within 72 hours

## 6. Key Backup and Escrow

### 6.1 Backup Policy

- Production keys are backed up within the Vercel platform's own redundancy
- A secondary copy of critical keys (ENCRYPTION_MASTER_KEY, BETTER_AUTH_SECRET) is stored in a sealed envelope in a physical safe accessible only to the CTO and Engineering Lead
- The sealed envelope is updated on every key rotation

### 6.2 Recovery Procedure

1. Retrieve the sealed envelope from the physical safe
2. Use the backup key to restore service
3. Generate a new key and rotate immediately after recovery
4. Update the backup envelope with the new key
5. Document the recovery event

## 7. Key Destruction

When a key is no longer needed:

1. Remove the key from all environment variable stores
2. Verify no application component references the old key
3. Overwrite any local copies securely
4. Document the destruction in the key inventory

## 8. Future Migration Plan: Azure Key Vault

The following migration is planned for future implementation:

1. **Provision Azure Key Vault** with RBAC-based access control
2. **Migrate secrets** from Vercel environment variables to Azure Key Vault
3. **Integrate application** to fetch secrets from Key Vault at runtime via managed identity
4. **Enable Key Vault audit logging** to Azure Monitor
5. **Implement automatic rotation** using Azure Key Vault rotation policies

Benefits:

- Hardware Security Module (HSM) backed key storage
- Centralized audit trail for all key access
- Automatic key rotation with notifications
- Fine-grained access policies per key

## 9. Compliance Mapping

| ISO 27001 Control | Requirement                   | This Procedure              |
| ----------------- | ----------------------------- | --------------------------- |
| A.8.24            | Use of cryptography           | Sections 3-7                |
| A.5.10            | Acceptable use of information | Section 4 (access controls) |
| A.8.9             | Configuration management      | Section 5 (rotation)        |
| A.8.10            | Information deletion          | Section 7 (destruction)     |

## 10. Review Schedule

This procedure must be reviewed:

- At least annually
- After any key compromise incident
- When cryptographic requirements change
- When infrastructure changes affect key storage
