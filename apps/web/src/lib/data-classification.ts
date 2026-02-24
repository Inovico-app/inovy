/**
 * Data Classification System for SSD-4.2.02 Compliance
 * Defines classification levels and encryption requirements for sensitive data
 */

/**
 * Data classification levels based on sensitivity
 * As per SSD-4.2.02: "Per default geldt hierbij de classificatie waarvoor versleuteling plaatsvindt"
 * (By default, classification applies where encryption takes place)
 */
export enum DataClassification {
  /**
   * PUBLIC: No sensitivity, no encryption required
   * Examples: Public marketing materials, general information
   */
  PUBLIC = "public",

  /**
   * INTERNAL: Internal use only, encryption recommended but not mandatory
   * Examples: Internal documentation, non-sensitive business data
   */
  INTERNAL = "internal",

  /**
   * CONFIDENTIAL: Sensitive data, encryption mandatory by default
   * Examples: Business records, project data, user conversations
   */
  CONFIDENTIAL = "confidential",

  /**
   * HIGHLY_CONFIDENTIAL: Highly sensitive data, encryption always mandatory
   * Examples: Medical data, personally identifiable information (PII),
   * authentication credentials, financial information
   */
  HIGHLY_CONFIDENTIAL = "highly_confidential",
}

/**
 * Data types and their classification levels
 */
export const DATA_TYPE_CLASSIFICATIONS = {
  // Recording-related data
  recordingFile: DataClassification.HIGHLY_CONFIDENTIAL,
  transcriptionText: DataClassification.HIGHLY_CONFIDENTIAL,
  transcriptionHistory: DataClassification.HIGHLY_CONFIDENTIAL,
  
  // AI-generated content
  aiInsights: DataClassification.CONFIDENTIAL,
  aiSummaries: DataClassification.CONFIDENTIAL,
  summaryHistory: DataClassification.CONFIDENTIAL,
  
  // Communication data
  chatMessages: DataClassification.CONFIDENTIAL,
  
  // Task and project data
  taskDescription: DataClassification.CONFIDENTIAL,
  projectDescription: DataClassification.INTERNAL,
  
  // Personal and consent data
  participantEmail: DataClassification.HIGHLY_CONFIDENTIAL,
  participantName: DataClassification.HIGHLY_CONFIDENTIAL,
  consentData: DataClassification.HIGHLY_CONFIDENTIAL,
  
  // Authentication and credentials
  oauthTokens: DataClassification.HIGHLY_CONFIDENTIAL,
  apiKeys: DataClassification.HIGHLY_CONFIDENTIAL,
} as const;

/**
 * Determine if encryption is required for a given classification level
 */
export function isEncryptionRequired(
  classification: DataClassification
): boolean {
  switch (classification) {
    case DataClassification.PUBLIC:
      return false;
    case DataClassification.INTERNAL:
      return false;
    case DataClassification.CONFIDENTIAL:
      return true; // Mandatory by default as per SSD-4.2.02
    case DataClassification.HIGHLY_CONFIDENTIAL:
      return true; // Always mandatory
    default:
      // Default to encryption for unknown classifications (secure by default)
      return true;
  }
}

/**
 * Determine if encryption can be disabled for a given classification
 * Approved exceptions must be documented as per acceptance criteria
 */
export function canDisableEncryption(
  classification: DataClassification
): boolean {
  switch (classification) {
    case DataClassification.PUBLIC:
    case DataClassification.INTERNAL:
      return true; // Can opt-out if needed
    case DataClassification.CONFIDENTIAL:
      return false; // Cannot disable without documented exception
    case DataClassification.HIGHLY_CONFIDENTIAL:
      return false; // Never allow disabling
    default:
      return false; // Secure by default
  }
}

/**
 * Get encryption requirement for a specific data type
 */
export function getEncryptionRequirement(
  dataType: keyof typeof DATA_TYPE_CLASSIFICATIONS
): {
  classification: DataClassification;
  required: boolean;
  canDisable: boolean;
} {
  const classification = DATA_TYPE_CLASSIFICATIONS[dataType];
  return {
    classification,
    required: isEncryptionRequired(classification),
    canDisable: canDisableEncryption(classification),
  };
}

/**
 * Documented exceptions for encryption (as per acceptance criteria)
 * These must be approved and regularly reviewed
 */
export const ENCRYPTION_EXCEPTIONS = {
  /**
   * Database indexes and foreign keys
   * Reason: Performance - encrypted fields cannot be efficiently indexed
   * Mitigation: Use non-sensitive surrogate keys (UUIDs) for relationships
   * Status: Approved
   */
  databaseIndexes: {
    reason: "Performance - encrypted fields cannot be efficiently indexed",
    mitigation: "Use non-sensitive surrogate keys (UUIDs) for relationships",
    approved: true,
    approvedBy: "Security Team",
    approvedAt: "2026-02-24",
  },

  /**
   * Real-time search and filtering
   * Reason: Full-text search requires plaintext or specialized encrypted search
   * Mitigation: Use redacted versions for search, decrypt on-demand for display
   * Status: Approved
   */
  searchIndexes: {
    reason: "Full-text search requires plaintext",
    mitigation: "Use redacted versions for search, decrypt on-demand for display",
    approved: true,
    approvedBy: "Security Team",
    approvedAt: "2026-02-24",
  },

  /**
   * Metadata fields (non-sensitive)
   * Reason: Metadata like timestamps, counts, status do not contain sensitive data
   * Mitigation: Separate sensitive data from metadata in schema design
   * Status: Approved
   */
  metadata: {
    reason: "Metadata does not contain sensitive information",
    mitigation: "Separate sensitive data from metadata in schema design",
    approved: true,
    approvedBy: "Security Team",
    approvedAt: "2026-02-24",
  },
} as const;

/**
 * Encryption policy summary for compliance documentation
 */
export const ENCRYPTION_POLICY = {
  version: "1.0.0",
  effectiveDate: "2026-02-24",
  standard: "SSD-4.2.02",
  summary: "Encryption is applied by default for all classified data (CONFIDENTIAL and HIGHLY_CONFIDENTIAL). Exceptions are documented and approved.",
  algorithm: "AES-256-GCM",
  keyManagement: "PBKDF2 with SHA-256 for key derivation",
  scope: [
    "Recording files",
    "Transcription text and history",
    "AI-generated insights and summaries",
    "Chat messages",
    "Task descriptions",
    "Personal identifiable information (PII)",
    "OAuth tokens and credentials",
  ],
} as const;
