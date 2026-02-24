import crypto from "crypto";
import {
  DataClassification,
  isEncryptionRequired,
  canDisableEncryption,
} from "./data-classification";

/**
 * Encryption utilities for data at rest
 * Uses AES-256-GCM for authenticated encryption
 * 
 * As per SSD-4.2.02: Encryption is applied by default for classified data
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
 * Check if encryption is enabled for a given data classification
 * Default behavior: encryption is ON for CONFIDENTIAL and HIGHLY_CONFIDENTIAL data
 * Can be overridden with DISABLE_ENCRYPTION_AT_REST=true (only for non-mandatory classifications)
 * 
 * @param classification - The data classification level
 * @returns true if encryption should be applied
 */
export function isEncryptionEnabled(
  classification: DataClassification = DataClassification.CONFIDENTIAL
): boolean {
  // Check if encryption is required for this classification
  const required = isEncryptionRequired(classification);
  
  // If required, always encrypt (cannot be disabled)
  if (required) {
    return true;
  }
  
  // For non-required classifications, check if it can be disabled
  const canDisable = canDisableEncryption(classification);
  
  // If it can be disabled, respect the environment variable
  if (canDisable) {
    return process.env.DISABLE_ENCRYPTION_AT_REST !== "true";
  }
  
  // Default to encryption (secure by default)
  return true;
}

/**
 * Validate encryption configuration
 * Throws error if encryption is required but master key is not set
 */
export function validateEncryptionConfig(
  classification: DataClassification = DataClassification.CONFIDENTIAL
): void {
  if (isEncryptionEnabled(classification) && !process.env.ENCRYPTION_MASTER_KEY) {
    throw new Error(
      `Encryption is required for ${classification} data but ENCRYPTION_MASTER_KEY is not configured. ` +
      "Please set the ENCRYPTION_MASTER_KEY environment variable."
    );
  }
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

