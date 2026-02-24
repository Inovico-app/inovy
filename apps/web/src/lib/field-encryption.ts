/**
 * Field-level encryption utilities for database text fields
 * Provides transparent encryption/decryption for sensitive data fields
 * 
 * As per SSD-4.2.02: Encryption by default for classified data
 */

import { DataClassification } from "./data-classification";
import {
  encrypt as encryptData,
  decrypt as decryptData,
  isEncryptionEnabled,
  validateEncryptionConfig,
} from "./encryption";

/**
 * Encryption metadata for encrypted fields
 */
export interface FieldEncryptionMetadata {
  isEncrypted: boolean;
  classification: DataClassification;
  algorithm: string;
  encryptedAt: string;
}

/**
 * Result of field encryption operation
 */
export interface EncryptedField {
  encryptedValue: string | null;
  isEncrypted: boolean;
  encryptionMetadata: string | null;
}

/**
 * Encrypt a text field based on its data classification
 * Returns encrypted value and metadata for storage
 * 
 * @param value - The plaintext value to encrypt
 * @param classification - The data classification level
 * @returns Encrypted field data or original value if encryption is not enabled
 */
export function encryptField(
  value: string | null,
  classification: DataClassification = DataClassification.CONFIDENTIAL
): EncryptedField {
  // If value is null or empty, don't encrypt
  if (!value) {
    return {
      encryptedValue: value,
      isEncrypted: false,
      encryptionMetadata: null,
    };
  }

  // Check if encryption is enabled for this classification
  const shouldEncrypt = isEncryptionEnabled(classification);

  if (!shouldEncrypt) {
    return {
      encryptedValue: value,
      isEncrypted: false,
      encryptionMetadata: null,
    };
  }

  // Validate configuration before encrypting
  validateEncryptionConfig(classification);

  // Encrypt the value
  const encrypted = encryptData(value);

  // Generate metadata
  const metadata: FieldEncryptionMetadata = {
    isEncrypted: true,
    classification,
    algorithm: "aes-256-gcm",
    encryptedAt: new Date().toISOString(),
  };

  return {
    encryptedValue: encrypted,
    isEncrypted: true,
    encryptionMetadata: JSON.stringify(metadata),
  };
}

/**
 * Decrypt a text field
 * Returns plaintext value
 * 
 * @param encryptedValue - The encrypted value
 * @param isEncrypted - Whether the field is encrypted
 * @returns Decrypted plaintext value
 */
export function decryptField(
  encryptedValue: string | null,
  isEncrypted: boolean = false
): string | null {
  // If value is null or not encrypted, return as-is
  if (!encryptedValue || !isEncrypted) {
    return encryptedValue;
  }

  try {
    // Decrypt the value
    const decrypted = decryptData(encryptedValue);
    return decrypted.toString("utf8");
  } catch (error) {
    throw new Error(
      `Failed to decrypt field: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Encrypt multiple fields at once
 * Useful for batch operations
 * 
 * @param fields - Map of field names to values and classifications
 * @returns Map of field names to encrypted field data
 */
export function encryptFields(
  fields: Record<
    string,
    { value: string | null; classification: DataClassification }
  >
): Record<string, EncryptedField> {
  const result: Record<string, EncryptedField> = {};

  for (const [fieldName, { value, classification }] of Object.entries(fields)) {
    result[fieldName] = encryptField(value, classification);
  }

  return result;
}

/**
 * Decrypt multiple fields at once
 * Useful for batch operations
 * 
 * @param fields - Map of field names to encrypted values and encryption status
 * @returns Map of field names to decrypted values
 */
export function decryptFields(
  fields: Record<
    string,
    { encryptedValue: string | null; isEncrypted: boolean }
  >
): Record<string, string | null> {
  const result: Record<string, string | null> = {};

  for (const [fieldName, { encryptedValue, isEncrypted }] of Object.entries(
    fields
  )) {
    result[fieldName] = decryptField(encryptedValue, isEncrypted);
  }

  return result;
}

/**
 * Helper to encrypt transcription text (HIGHLY_CONFIDENTIAL)
 */
export function encryptTranscriptionText(
  text: string | null
): EncryptedField {
  return encryptField(text, DataClassification.HIGHLY_CONFIDENTIAL);
}

/**
 * Helper to decrypt transcription text
 */
export function decryptTranscriptionText(
  encryptedText: string | null,
  isEncrypted: boolean
): string | null {
  return decryptField(encryptedText, isEncrypted);
}

/**
 * Helper to encrypt AI insights (CONFIDENTIAL)
 */
export function encryptAiInsight(content: string | null): EncryptedField {
  return encryptField(content, DataClassification.CONFIDENTIAL);
}

/**
 * Helper to decrypt AI insights
 */
export function decryptAiInsight(
  encryptedContent: string | null,
  isEncrypted: boolean
): string | null {
  return decryptField(encryptedContent, isEncrypted);
}

/**
 * Helper to encrypt chat messages (CONFIDENTIAL)
 */
export function encryptChatMessage(message: string | null): EncryptedField {
  return encryptField(message, DataClassification.CONFIDENTIAL);
}

/**
 * Helper to decrypt chat messages
 */
export function decryptChatMessage(
  encryptedMessage: string | null,
  isEncrypted: boolean
): string | null {
  return decryptField(encryptedMessage, isEncrypted);
}

/**
 * Helper to encrypt PII (HIGHLY_CONFIDENTIAL)
 */
export function encryptPII(pii: string | null): EncryptedField {
  return encryptField(pii, DataClassification.HIGHLY_CONFIDENTIAL);
}

/**
 * Helper to decrypt PII
 */
export function decryptPII(
  encryptedPII: string | null,
  isEncrypted: boolean
): string | null {
  return decryptField(encryptedPII, isEncrypted);
}
