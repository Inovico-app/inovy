# Cryptography and Key Management Policy

| Field              | Value                        |
| ------------------ | ---------------------------- |
| Document ID        | POL-05                       |
| Version            | 1.0                          |
| Classification     | Internal                     |
| Owner              | Information Security Manager |
| Approved by        | CEO/CTO                      |
| Effective date     | 2026-03-13                   |
| Review date        | 2027-03-13                   |
| ISO 27001 Controls | A.8.24                       |

---

## 1. Purpose

This policy defines Inovy's requirements for the appropriate and consistent use of cryptographic controls to protect information assets, and establishes the rules for managing cryptographic keys throughout their lifecycle. Strong cryptography is a foundational control for protecting customer data — including meeting recordings, transcripts, and personal data such as BSN numbers — against unauthorised disclosure and tampering.

## 2. Scope

This policy applies to:

- All cryptographic mechanisms implemented within the Inovy web application (`apps/web`)
- All cryptographic keys used by Inovy systems, including those managed by third-party services
- All environments: production, staging, and development
- All employees and contractors who develop, maintain, or operate cryptographic systems
- Third-party services that process or store encrypted Inovy data

## 3. Reference Documents

- POL-01 Access Control Policy
- POL-04 Information Classification and Handling Policy
- POL-06 Supplier Security Policy (third-party cryptographic responsibilities)
- `apps/web/src/lib/encryption.ts` — Primary encryption implementation
- `apps/web/src/lib/auth/` — Authentication cryptography (Better Auth)

---

## 4. Approved Cryptographic Algorithms (A.8.24)

Inovy mandates the use of cryptographically strong, industry-standard algorithms. The following algorithms are approved for use:

### 4.1 Symmetric Encryption

| Algorithm | Key length | Mode                      | Approved use                                          |
| --------- | ---------- | ------------------------- | ----------------------------------------------------- |
| AES       | 256-bit    | GCM (Galois/Counter Mode) | Application-level data encryption, file encryption    |
| AES       | 256-bit    | CBC (with HMAC)           | Legacy compatibility only, requires explicit approval |

**Prohibited:** DES, 3DES, RC4, Blowfish, AES with ECB mode.

### 4.2 Password Hashing and Key Derivation

| Algorithm     | Parameters                  | Approved use                                       |
| ------------- | --------------------------- | -------------------------------------------------- |
| scrypt        | N=16384, r=16, p=1          | Password hashing (Better Auth)                     |
| PBKDF2-SHA256 | 100,000 iterations minimum  | Key derivation from master key                     |
| Argon2id      | m=65536, t=3, p=4 (minimum) | Alternative password hashing (for future adoption) |

**Prohibited:** MD5, SHA-1, bcrypt (below cost factor 12), unsalted hashing of any kind.

### 4.3 Message Authentication and Integrity

| Algorithm   | Approved use                                              |
| ----------- | --------------------------------------------------------- |
| HMAC-SHA256 | Message authentication codes, webhook signatures (Stripe) |
| SHA-256     | Data integrity verification, content hashing              |
| SHA-384     | Enhanced integrity where required                         |

**Prohibited:** MD5 and SHA-1 for integrity purposes.

### 4.4 Asymmetric Cryptography

| Algorithm | Key size                             | Approved use                             |
| --------- | ------------------------------------ | ---------------------------------------- |
| RSA       | 2048-bit minimum; 4096-bit preferred | TLS certificates (where applicable)      |
| ECDSA     | P-256 or P-384                       | JWT signing (where applicable), WebAuthn |
| Ed25519   | 256-bit                              | SSH keys for infrastructure access       |

**Prohibited:** RSA below 2048-bit, DSA, DH groups below 2048-bit.

### 4.5 Transport Layer Security

| Requirement           | Value                                               |
| --------------------- | --------------------------------------------------- |
| Minimum TLS version   | TLS 1.2                                             |
| Preferred TLS version | TLS 1.3                                             |
| Minimum cipher suites | ECDHE with AES-128-GCM or AES-256-GCM               |
| Certificate authority | Let's Encrypt or Azure-managed certificates         |
| Certificate validity  | Maximum 90 days (Let's Encrypt); rotation automated |

**Prohibited:** SSL 2.0, SSL 3.0, TLS 1.0, TLS 1.1, RC4 cipher suites, NULL cipher suites, export-grade cipher suites.

---

## 5. Current Cryptographic Implementation

### 5.1 Application-Level Encryption (`src/lib/encryption.ts`)

The primary encryption module implements the following scheme:

**Algorithm:** AES-256-GCM (authenticated encryption providing both confidentiality and integrity)

**Key derivation:**

- Input: `ENCRYPTION_MASTER_KEY` (256-bit random value, base64-encoded)
- Algorithm: PBKDF2-SHA256
- Iterations: 100,000
- Salt: 64 bytes (cryptographically random, generated per encryption operation)
- Output key length: 256 bits

**Encryption parameters per operation:**

- IV (Initialisation Vector): 16 bytes (cryptographically random, generated per encryption operation)
- Authentication tag: 128-bit GCM authentication tag (included in ciphertext)
- Salt and IV are stored with the ciphertext to enable decryption; the master key is never stored with the ciphertext

**Encrypted data types:**

- OAuth access and refresh tokens stored in the database
- Sensitive configuration values stored in the database
- User-specific secrets requiring individual-level encryption

### 5.2 Password Authentication (Better Auth scrypt)

User passwords are hashed using scrypt via Better Auth's authentication library:

- Algorithm: scrypt
- CPU/memory cost (N): 16,384
- Block size (r): 16
- Parallelisation factor (p): 1
- Salt: Unique per user, generated at registration time
- Output length: 64 bytes

Passwords are hashed before storage and the plaintext is never persisted or logged.

### 5.3 OAuth Token Encryption

OAuth tokens received from third-party identity providers (Google, Microsoft) are encrypted using AES-256-GCM via `OAUTH_ENCRYPTION_KEY` before storage in the Neon PostgreSQL database. Decryption occurs only when the token needs to be used server-side for API calls.

### 5.4 Session Tokens

Session tokens are generated and signed using `BETTER_AUTH_SECRET` via Better Auth's session management system. Tokens are:

- Cryptographically random (256-bit minimum entropy)
- Stored as HTTP-only, Secure cookies
- Validated on every authenticated request

### 5.5 SAS Tokens for Blob Storage

Azure Blob Storage SAS (Shared Access Signature) tokens are generated server-side for each customer recording access request. SAS tokens:

- Are scoped to the specific blob being accessed
- Have a maximum validity of 1 hour
- Use HMAC-SHA256 signing with the Azure storage account key
- Are generated on every access request; they are not cached

---

## 6. Key Inventory

| Key ID | Key name                   | Purpose                                                | Length                      | Storage location                                  | Rotation frequency      |
| ------ | -------------------------- | ------------------------------------------------------ | --------------------------- | ------------------------------------------------- | ----------------------- |
| KEY-01 | `ENCRYPTION_MASTER_KEY`    | AES-256-GCM master key for application data encryption | 256-bit                     | GitHub Actions secrets (prod), `.env.local` (dev) | Annual                  |
| KEY-02 | `OAUTH_ENCRYPTION_KEY`     | AES-256-GCM key for OAuth token encryption             | 256-bit                     | GitHub Actions secrets (prod), `.env.local` (dev) | Annual                  |
| KEY-03 | `BETTER_AUTH_SECRET`       | Session token signing and authentication               | 256-bit                     | GitHub Actions secrets (prod), `.env.local` (dev) | Annual                  |
| KEY-04 | `CRON_SECRET`              | Authenticating cron job invocations                    | 256-bit                     | GitHub Actions secrets (prod), `.env.local` (dev) | Annual                  |
| KEY-05 | `UPLOAD_TOKEN_SECRET`      | Signing file upload tokens                             | 256-bit                     | GitHub Actions secrets (prod), `.env.local` (dev) | Annual                  |
| KEY-06 | Azure Storage Account Key  | Signing SAS tokens for Blob Storage                    | Azure-managed               | Azure Key Vault (platform-managed)                | Annual (Azure rotation) |
| KEY-07 | TLS certificates           | HTTPS transport security                               | RSA 2048-bit or ECDSA P-256 | Azure-managed / Let's Encrypt                     | Automatic (90-day)      |
| KEY-08 | GitHub Actions deploy keys | CI/CD authentication                                   | Ed25519                     | GitHub Secrets                                    | Annual                  |

---

## 7. Key Management Lifecycle (A.8.24)

### 7.1 Key Generation

All cryptographic keys must be generated using a cryptographically secure pseudo-random number generator (CSPRNG):

- In Node.js: `crypto.randomBytes()` or `crypto.getRandomValues()` (Web Crypto API)
- In cloud services: Platform-managed key generation (Azure Key Vault, Neon)
- Keys must never be derived from predictable inputs (usernames, timestamps, sequential IDs)
- Minimum entropy: 256 bits for symmetric keys; per algorithm requirements for asymmetric keys

### 7.2 Key Storage

**Current state (production):**

- Application keys (KEY-01 to KEY-05, KEY-08) are stored as GitHub Actions encrypted secrets
- Keys are injected as environment variables at container startup time
- Keys are not written to disk in the container or to any logs
- Developer environments: Keys are stored in `.env.local` files protected by full-disk encryption on developer devices

**Planned improvement:**

- Migration of KEY-01 to KEY-05 to **Azure Key Vault** is planned within the next 12 months
- Azure Key Vault provides hardware-backed key storage, audit logging of key access, and fine-grained RBAC for key access
- Application will retrieve keys from Azure Key Vault at startup using Managed Identity, eliminating the need to store keys as environment variables

**Prohibited key storage locations:**

- Source code repositories (even private)
- Unencrypted files on disk
- Slack, email, or chat applications
- Application logs or error messages
- Client-side JavaScript bundles

### 7.3 Key Distribution

- Keys are distributed to the production environment exclusively via GitHub Actions secrets, which are encrypted by GitHub using NaCl sealed box encryption
- No key is ever communicated via email, Slack, or SMS under any circumstances
- Developer keys for local environments are shared once via an approved encrypted secrets manager (1Password or equivalent) and thereafter each developer generates their own set of keys

### 7.4 Key Rotation

Keys must be rotated according to the schedule in the key inventory (Section 6). Rotation is also triggered by:

- Suspected or confirmed compromise of a key
- Departure of any employee with knowledge of the key
- A significant security incident involving the systems where the key is used
- A change of cloud provider or key storage mechanism

**Rotation procedure:**

1. Generate a new key using the approved generation method
2. Update the GitHub Actions secret (and, once implemented, Azure Key Vault)
3. Re-deploy the application to load the new key
4. Re-encrypt any data encrypted with the old key (where applicable)
5. Verify that the application functions correctly with the new key
6. Revoke and destroy the old key
7. Document the rotation in the key management log

### 7.5 Key Use

- Each key must be used only for its designated purpose (key separation principle)
- `ENCRYPTION_MASTER_KEY` is used exclusively for application data encryption; it must not be used for authentication
- Keys must not be used beyond their defined validity period
- All key access in production is logged (when Azure Key Vault is implemented, access logs will be automatically captured)

### 7.6 Key Destruction

When a key is retired (after rotation or upon decommissioning of the system it protects):

- The secret is deleted from GitHub Actions secrets
- All copies of the key on developer devices are securely deleted
- The deletion is documented in the key management log with the date and method
- Once Azure Key Vault is implemented, key destruction will use the Key Vault's key deletion and purge API, which ensures cryptographic destruction

---

## 8. Roles and Responsibilities

| Role                         | Responsibility                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------- |
| Information Security Manager | Policy ownership, key rotation approval, key compromise response                 |
| Engineering Lead             | Implementing cryptographic controls, executing key rotation procedures           |
| CTO                          | Approving key management budget (Azure Key Vault migration)                      |
| All developers               | Using approved algorithms, never hardcoding keys, reporting suspected compromise |

---

## 9. Key Compromise Response

If a cryptographic key is suspected or confirmed to be compromised:

1. **Immediately notify** the Information Security Manager and Engineering Lead
2. **Treat as a security incident** and invoke POL-07 (Incident Response)
3. **Immediately rotate** the compromised key (do not wait for the scheduled rotation)
4. **Assess the impact:** Identify what data may have been exposed or tampered with
5. **Re-encrypt** any data that was encrypted with the compromised key
6. **Notify affected parties** if customer data has been compromised (see POL-07 breach notification)
7. **Conduct a post-incident review** within 5 business days

---

## 10. Compliance and Review

Cryptographic implementations must be reviewed:

- Annually as part of the policy review cycle
- Whenever a vulnerability is discovered in an algorithm currently in use (e.g., a significant cryptanalytic break)
- When a major algorithm standard is deprecated by NIST, ECRYPT, or a relevant standards body
- When the application undergoes a significant architectural change

The Information Security Manager maintains a watch on cryptographic standards publications from NIST, ENISA, and the BSI (Bundesamt für Sicherheit in der Informationstechnik).

---

## 11. Policy Review

| Revision | Date       | Author                       | Summary of Changes |
| -------- | ---------- | ---------------------------- | ------------------ |
| 1.0      | 2026-03-13 | Information Security Manager | Initial release    |
