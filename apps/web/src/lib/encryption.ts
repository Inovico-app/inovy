import crypto from "crypto";

/**
 * Encryption utilities for data at rest
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64; // 512 bits
const TAG_LENGTH = 16; // 128 bits
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from master key and salt
 * Uses PBKDF2 with SHA-256
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
 * Encrypt data using AES-256-GCM
 * Returns base64-encoded string containing: salt + iv + encrypted data + auth tag
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
 * Decrypt data encrypted with encrypt()
 * Expects base64-encoded string containing: salt + iv + encrypted data + auth tag
 */
export function decrypt(encryptedData: string): Buffer {
  const masterKey = getMasterKey();

  // Decode from base64
  const combined = Buffer.from(encryptedData, "base64");

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

