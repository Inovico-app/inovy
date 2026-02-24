/**
 * XML Security Configuration
 *
 * This module provides secure configuration for XML parsing to prevent XXE attacks.
 * As of 2026-02-01, this application does NOT use XML parsing.
 * This file serves as documentation and secure defaults if XML parsing is ever introduced.
 *
 * @see /workspace/apps/web/SECURITY-XXE-PREVENTION.md for full documentation
 *
 * SSD-32 Compliance: Protection Against XML External Entity (XXE) Attacks
 */

/**
 * Security policy for XML processing
 *
 * IMPORTANT: This application uses JSON-only architecture.
 * XML processing is NOT ALLOWED without security review.
 */
export const XML_SECURITY_POLICY = {
  /**
   * Whether XML processing is allowed in this application
   * @default false
   */
  allowXmlProcessing: false,

  /**
   * If XML processing is required, these security measures MUST be enforced
   */
  securityRequirements: {
    /**
     * Disable external entity processing
     * Prevents XXE attacks by blocking external entity resolution
     */
    disableExternalEntities: true,

    /**
     * Disable DTD (Document Type Definition) loading
     * Prevents loading external DTDs that could contain malicious entities
     */
    disableDtdLoading: true,

    /**
     * Disable DTD validation
     * Prevents validation against external DTDs
     */
    disableDtdValidation: true,

    /**
     * Disable DOCTYPE declarations
     * Blocks DOCTYPE declarations entirely
     */
    disableDoctype: true,

    /**
     * Maximum XML document size (in bytes)
     * Prevents XML bomb attacks (e.g., Billion Laughs)
     * @default 1MB
     */
    maxXmlSize: 1024 * 1024, // 1MB

    /**
     * Maximum XML depth
     * Prevents deeply nested XML that could cause DoS
     * @default 10
     */
    maxXmlDepth: 10,

    /**
     * Enable strict parsing mode
     * Reject any malformed or suspicious XML
     */
    strictMode: true,
  },
} as const;

/**
 * Secure XML Parser Configuration Template
 *
 * If XML parsing is absolutely necessary, use this configuration template.
 * This is provided for future reference only.
 *
 * @example Using fast-xml-parser (recommended - secure by default)
 * ```typescript
 * import { XMLParser } from 'fast-xml-parser';
 *
 * const parser = new XMLParser({
 *   ...SECURE_XML_PARSER_CONFIG,
 *   ignoreAttributes: false,
 * });
 * ```
 *
 * @example Using libxmljs2 (secure configuration)
 * ```typescript
 * import { parseXml } from 'libxmljs2';
 *
 * const doc = parseXml(xmlString, SECURE_LIBXML_CONFIG);
 * ```
 */
export const SECURE_XML_PARSER_CONFIG = {
  /**
   * Disable entity processing
   * Critical for preventing XXE attacks
   */
  processEntities: false,

  /**
   * Disable external entity resolution
   */
  resolveExternalEntities: false,

  /**
   * Parse tag values carefully
   */
  parseTagValue: false,

  /**
   * Allow boolean attributes
   */
  allowBooleanAttributes: true,

  /**
   * Ignore attributes if not needed
   */
  ignoreAttributes: true,

  /**
   * Trim whitespace
   */
  trimValues: true,
} as const;

/**
 * Secure configuration for libxmljs2
 */
export const SECURE_LIBXML_CONFIG = {
  /**
   * Disable entity substitution
   * Prevents XXE attacks
   */
  noent: false,

  /**
   * Disable DTD loading
   * Prevents loading external DTDs
   */
  dtdload: false,

  /**
   * Disable DTD validation
   * Prevents validation against external DTDs
   */
  dtdvalid: false,

  /**
   * Disable DOCTYPE declarations
   * Blocks DOCTYPE entirely
   */
  doctype: false,

  /**
   * Disable network access
   * Prevents fetching external resources
   */
  nonet: true,

  /**
   * Disable xinclude processing
   * Prevents XML Inclusion attacks
   */
  noxincnode: true,
} as const;

/**
 * Validate XML input size before parsing
 *
 * This function should be called BEFORE attempting to parse any XML
 * to prevent XML bomb attacks (e.g., Billion Laughs attack).
 *
 * @param xmlString - The XML string to validate
 * @returns true if size is acceptable, false otherwise
 *
 * @example
 * ```typescript
 * if (!validateXmlSize(xmlInput)) {
 *   throw new Error('XML input exceeds maximum size');
 * }
 * ```
 */
export function validateXmlSize(xmlString: string): boolean {
  if (!XML_SECURITY_POLICY.allowXmlProcessing) {
    throw new Error(
      "XML processing is not allowed in this application. See SECURITY-XXE-PREVENTION.md"
    );
  }

  const sizeInBytes = Buffer.byteLength(xmlString, "utf8");
  return sizeInBytes <= XML_SECURITY_POLICY.securityRequirements.maxXmlSize;
}

/**
 * Detect suspicious XML patterns
 *
 * This function checks for common XXE attack patterns in XML input.
 * It should be used as an additional security layer before parsing.
 *
 * @param xmlString - The XML string to check
 * @returns Array of detected threats (empty if safe)
 *
 * @example
 * ```typescript
 * const threats = detectXmlThreats(xmlInput);
 * if (threats.length > 0) {
 *   logger.warn('Suspicious XML detected', { threats });
 *   throw new Error('XML input contains suspicious patterns');
 * }
 * ```
 */
export function detectXmlThreats(xmlString: string): string[] {
  const threats: string[] = [];

  // Check for DOCTYPE declarations
  if (/<!DOCTYPE/i.test(xmlString)) {
    threats.push("DOCTYPE declaration detected");
  }

  // Check for ENTITY declarations
  if (/<!ENTITY/i.test(xmlString)) {
    threats.push("ENTITY declaration detected");
  }

  // Check for SYSTEM keyword (external entity reference)
  if (/SYSTEM\s+["']/i.test(xmlString)) {
    threats.push("SYSTEM entity reference detected");
  }

  // Check for PUBLIC keyword (external entity reference)
  if (/PUBLIC\s+["']/i.test(xmlString)) {
    threats.push("PUBLIC entity reference detected");
  }

  // Check for parameter entities
  if (/%\w+;/.test(xmlString)) {
    threats.push("Parameter entity reference detected");
  }

  // Check for file:// URLs
  if (/file:\/\//i.test(xmlString)) {
    threats.push("file:// URL detected");
  }

  // Check for http:// or https:// in entity declarations
  if (/<!ENTITY[^>]*https?:\/\//i.test(xmlString)) {
    threats.push("HTTP(S) URL in entity declaration detected");
  }

  // Check for suspicious nested entity patterns (XML bomb detection)
  const entityReferences = xmlString.match(/&\w+;/g) || [];
  if (entityReferences.length > 100) {
    threats.push(
      `Excessive entity references detected (${entityReferences.length})`
    );
  }

  return threats;
}

/**
 * Error thrown when XML processing is attempted but not allowed
 */
export class XmlProcessingNotAllowedError extends Error {
  constructor() {
    super(
      "XML processing is not allowed in this application. " +
        "This application uses JSON-only architecture. " +
        "See /workspace/apps/web/SECURITY-XXE-PREVENTION.md for details."
    );
    this.name = "XmlProcessingNotAllowedError";
  }
}

/**
 * Error thrown when XML input fails security validation
 */
export class XmlSecurityViolationError extends Error {
  constructor(
    public readonly threats: string[],
    message?: string
  ) {
    super(
      message ||
        `XML input failed security validation: ${threats.join(", ")}`
    );
    this.name = "XmlSecurityViolationError";
  }
}
