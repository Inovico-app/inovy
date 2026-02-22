import crypto from "crypto";

/**
 * Encryption Utilities for Data at Rest
 *
 * This module provides NIST-compliant encryption for sensitive data storage.
 *
 * ## Compliance
 *
 * - **SSD-4.1.01:** Use industry-standard secure protocols and cryptography
 * - **NIST FIPS 197:** Advanced Encryption Standard (AES)
 * - **NIST SP 800-38D:** Recommendation for Block Cipher Modes (GCM)
 * - **NIST SP 800-132:** Password-Based Key Derivation
 *
 * ## Algorithm: AES-256-GCM
 *
 * AES-256-GCM provides authenticated encryption with associated data (AEAD):
 * - **Confidentiality:** AES-256 encryption
 * - **Integrity:** GCM authentication tag
 * - **Performance:** Hardware-accelerated on modern CPUs
 *
 * **NIST Approval:** FIPS 197, SP 800-38D
 *
 * ## Key Derivation: PBKDF2-SHA256
 *
 * Master key is derived using PBKDF2 with SHA-256:
 * - **Iterations:** 100,000 (exceeds NIST minimum of 10,000)
 * - **Salt Length:** 512 bits (exceeds NIST minimum of 128 bits)
 * - **Hash Function:** SHA-256 (FIPS 180-4)
 *
 * **NIST Approval:** SP 800-132, FIPS 180-4
 *
 * @see CRYPTOGRAPHY_COMPLIANCE.md for full compliance documentation
 */

/**
 * Cryptographic constants following NIST guidelines
 */
const ALGORITHM = "aes-256-gcm"; // NIST FIPS 197, SP 800-38D
const IV_LENGTH = 16; // 128 bits (NIST recommended for AES-GCM)
const SALT_LENGTH = 64; // 512 bits (exceeds NIST minimum of 128 bits)
const TAG_LENGTH = 16; // 128 bits (NIST recommended for GCM)
const KEY_LENGTH = 32; // 256 bits (AES-256)

/**
 * Derive encryption key from master key and salt using PBKDF2-SHA256
 *
 * NIST SP 800-132 compliant key derivation function.
 *
 * @param masterKey - The master encryption key from environment
 * @param salt - Random salt (512 bits recommended)
 * @param iterations - Number of PBKDF2 iterations (default: 100,000)
 * @returns Derived encryption key (256 bits)
 *
 * **Security Properties:**
 * - Key stretching: Makes brute-force attacks computationally expensive
 * - Salt: Prevents rainbow table attacks
 * - Iterations: 100,000 exceeds NIST minimum of 10,000 for PBKDF2-HMAC-SHA256
 *
 * **NIST Compliance:**
 * - Algorithm: PBKDF2 (SP 800-132)
 * - Hash: SHA-256 (FIPS 180-4)
 * - Iterations: ≥ 10,000 (NIST minimum), 100,000 (our setting)
 * - Salt length: ≥ 128 bits (NIST minimum), 512 bits (our setting)
 */
function deriveKey(
  masterKey: string,
  salt: Buffer,
  iterations: number = 100000
): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, iterations, KEY_LENGTH, "sha256");
}

/**
 * Get master encryption key from environment
 * In production, this should be stored securely (e.g., AWS KMS, HashiCorp Vault)
 */
function getMasterKey(): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!masterKey) {
    throw new Error(
      "ENCRYPTION_MASTER_KEY environment variable is not set. " +
        "This is required for encryption at rest."
    );
  }
  return masterKey;
}

/**
 * Encrypt data using AES-256-GCM (NIST-approved algorithm)
 *
 * Provides authenticated encryption with associated data (AEAD):
 * - **Confidentiality:** AES-256 prevents unauthorized data access
 * - **Integrity:** GCM authentication tag detects tampering
 * - **Uniqueness:** Unique salt and IV for each encryption operation
 *
 * **Output Format:**
 * Base64-encoded string containing: `salt || IV || ciphertext || auth_tag`
 * - Salt: 512 bits (64 bytes)
 * - IV: 128 bits (16 bytes)
 * - Ciphertext: Variable length (same as plaintext)
 * - Auth Tag: 128 bits (16 bytes)
 *
 * **NIST Compliance:**
 * - Encryption: AES-256-GCM (FIPS 197, SP 800-38D)
 * - Key Derivation: PBKDF2-SHA256 (SP 800-132)
 * - Random Generation: crypto.randomBytes (cryptographically secure)
 *
 * @param data - The data to encrypt (Buffer or string)
 * @returns Base64-encoded encrypted data with salt, IV, and authentication tag
 *
 * @example
 * ```typescript
 * const encrypted = encrypt("sensitive data");
 * // Store encrypted in database
 * ```
 */
export function encrypt(data: Buffer | string): string {
  const masterKey = getMasterKey();
  const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");

  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive encryption key
  const key = deriveKey(masterKey, salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt data
  const encrypted = Buffer.concat([
    cipher.update(dataBuffer),
    cipher.final(),
  ]);

  // Get authentication tag
  const tag = cipher.getAuthTag();

  // Combine: salt + iv + encrypted + tag
  const combined = Buffer.concat([salt, iv, encrypted, tag]);

  // Return as base64
  return combined.toString("base64");
}

/**
 * Decrypt data encrypted with encrypt() and verify authenticity
 *
 * Performs authenticated decryption using AES-256-GCM:
 * - **Decryption:** Recovers original plaintext using derived key
 * - **Authentication:** Verifies GCM authentication tag to detect tampering
 * - **Error Handling:** Throws descriptive error if decryption fails
 *
 * **Security Features:**
 * - Authentication tag verification prevents use of tampered ciphertext
 * - Constant-time comparison in GCM mode prevents timing attacks
 * - Same key derivation as encryption (PBKDF2-SHA256)
 *
 * **Input Format:**
 * Base64-encoded string containing: `salt || IV || ciphertext || auth_tag`
 *
 * **NIST Compliance:**
 * - Decryption: AES-256-GCM (FIPS 197, SP 800-38D)
 * - Key Derivation: PBKDF2-SHA256 (SP 800-132)
 * - Authentication: GCM tag verification (SP 800-38D)
 *
 * @param encryptedData - Base64-encoded encrypted data from encrypt()
 * @returns Decrypted data as Buffer
 * @throws Error if data is tampered, key is wrong, or format is invalid
 *
 * @example
 * ```typescript
 * const decrypted = decrypt(encryptedData);
 * const plaintext = decrypted.toString('utf8');
 * ```
 */
export function decrypt(encryptedData: string): Buffer {
  try {
    const masterKey = getMasterKey();

    // Decode from base64
    const combined = Buffer.from(encryptedData, "base64");

    // Validate minimum length
    const minLength = SALT_LENGTH + IV_LENGTH + TAG_LENGTH;
    if (combined.length < minLength) {
      throw new Error(
        `Invalid encrypted data: too short (${combined.length} bytes, minimum ${minLength} bytes)`
      );
    }

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(combined.length - TAG_LENGTH);
    const encrypted = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      combined.length - TAG_LENGTH
    );

    // Derive decryption key (same as encryption key)
    const key = deriveKey(masterKey, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("Unsupported state or unable to authenticate data") ||
        error.message.includes("bad decrypt"))
    ) {
      throw new Error("Decryption failed: Invalid key or tampered data");
    }
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Encrypt a file stream
 * Returns encrypted buffer
 */
export async function encryptFile(file: File | Buffer): Promise<Buffer> {
  const buffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;
  const encrypted = encrypt(buffer);
  return Buffer.from(encrypted, "base64");
}

/**
 * Decrypt a file stream
 * Returns decrypted buffer
 */
export async function decryptFile(encryptedData: string | Buffer): Promise<Buffer> {
  const data = Buffer.isBuffer(encryptedData)
    ? encryptedData.toString("base64")
    : encryptedData;
  return decrypt(data);
}

/**
 * Generate encryption metadata for storage
 *
 * Returns metadata about the encryption applied to data.
 * Useful for audit logs and compliance tracking.
 *
 * @returns Object with encryption metadata
 */
export function generateEncryptionMetadata(): {
  algorithm: string;
  encrypted: boolean;
  encryptedAt: string;
} {
  return {
    algorithm: ALGORITHM,
    encrypted: true,
    encryptedAt: new Date().toISOString(),
  };
}

/**
 * Get cryptographic configuration details for compliance reporting
 *
 * Returns information about the cryptographic algorithms and parameters
 * used by this module for compliance auditing and verification.
 *
 * @returns Object with cryptographic configuration details
 *
 * @example
 * ```typescript
 * const config = getCryptoConfig();
 * console.log(`Using ${config.algorithm} with ${config.iterations} iterations`);
 * ```
 */
export function getCryptoConfig(): {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  saltLength: number;
  tagLength: number;
  iterations: number;
  kdf: string;
  hashFunction: string;
  nistCompliance: string[];
} {
  return {
    algorithm: ALGORITHM,
    keyLength: KEY_LENGTH * 8, // Convert to bits
    ivLength: IV_LENGTH * 8,
    saltLength: SALT_LENGTH * 8,
    tagLength: TAG_LENGTH * 8,
    iterations: 100000,
    kdf: "PBKDF2",
    hashFunction: "SHA-256",
    nistCompliance: [
      "FIPS 197 (AES)",
      "SP 800-38D (GCM)",
      "SP 800-132 (PBKDF2)",
      "FIPS 180-4 (SHA-256)",
    ],
  };
}

/**
 * Verify that cryptographic configuration meets NIST guidelines
 *
 * Checks that all cryptographic parameters meet minimum NIST requirements:
 * - AES key length ≥ 128 bits (using 256 bits)
 * - GCM IV length = 96 bits recommended, 128 bits acceptable
 * - PBKDF2 iterations ≥ 10,000 (using 100,000)
 * - Salt length ≥ 128 bits (using 512 bits)
 * - Authentication tag length ≥ 96 bits (using 128 bits)
 *
 * @returns Object with compliance status and any warnings
 *
 * @example
 * ```typescript
 * const status = verifyCryptoCompliance();
 * if (!status.compliant) {
 *   console.error('Cryptography not compliant:', status.warnings);
 * }
 * ```
 */
export function verifyCryptoCompliance(): {
  compliant: boolean;
  warnings: string[];
  details: {
    aesKeyLength: { value: number; minimum: number; compliant: boolean };
    ivLength: { value: number; recommended: number; compliant: boolean };
    saltLength: { value: number; minimum: number; compliant: boolean };
    pbkdf2Iterations: { value: number; minimum: number; compliant: boolean };
    authTagLength: { value: number; minimum: number; compliant: boolean };
  };
} {
  const warnings: string[] = [];

  const aesKeyLengthCompliant = KEY_LENGTH * 8 >= 128;
  if (!aesKeyLengthCompliant) {
    warnings.push(
      `AES key length (${KEY_LENGTH * 8} bits) is below NIST minimum (128 bits)`
    );
  }

  const ivLengthCompliant = IV_LENGTH * 8 >= 96;
  if (!ivLengthCompliant) {
    warnings.push(
      `IV length (${IV_LENGTH * 8} bits) is below NIST recommended (96 bits)`
    );
  }

  const saltLengthCompliant = SALT_LENGTH * 8 >= 128;
  if (!saltLengthCompliant) {
    warnings.push(
      `Salt length (${SALT_LENGTH * 8} bits) is below NIST minimum (128 bits)`
    );
  }

  const iterations = 100000;
  const iterationsCompliant = iterations >= 10000;
  if (!iterationsCompliant) {
    warnings.push(
      `PBKDF2 iterations (${iterations}) is below NIST minimum (10,000)`
    );
  }

  const authTagLengthCompliant = TAG_LENGTH * 8 >= 96;
  if (!authTagLengthCompliant) {
    warnings.push(
      `Authentication tag length (${TAG_LENGTH * 8} bits) is below NIST minimum (96 bits)`
    );
  }

  const compliant =
    aesKeyLengthCompliant &&
    ivLengthCompliant &&
    saltLengthCompliant &&
    iterationsCompliant &&
    authTagLengthCompliant;

  return {
    compliant,
    warnings,
    details: {
      aesKeyLength: {
        value: KEY_LENGTH * 8,
        minimum: 128,
        compliant: aesKeyLengthCompliant,
      },
      ivLength: {
        value: IV_LENGTH * 8,
        recommended: 96,
        compliant: ivLengthCompliant,
      },
      saltLength: {
        value: SALT_LENGTH * 8,
        minimum: 128,
        compliant: saltLengthCompliant,
      },
      pbkdf2Iterations: {
        value: iterations,
        minimum: 10000,
        compliant: iterationsCompliant,
      },
      authTagLength: {
        value: TAG_LENGTH * 8,
        minimum: 96,
        compliant: authTagLengthCompliant,
      },
    },
  };
}

