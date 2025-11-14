import { logger } from "@/lib/logger";

export interface PIIDetection {
  type: PIIType;
  text: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export type PIIType =
  | "email"
  | "phone"
  | "bsn"
  | "credit_card"
  | "medical_record"
  | "date_of_birth"
  | "address"
  | "ip_address";

interface PIIPattern {
  type: PIIType;
  pattern: RegExp;
  confidence: number;
}

/**
 * PII Detection Service
 *
 * Detects Personally Identifiable Information (PII) and Protected Health Information (PHI)
 * in text transcripts using pattern matching.
 *
 * Supports detection of:
 * - Email addresses
 * - Phone numbers (Dutch formats)
 * - BSN (Burger Service Nummer) with elfproef validation
 * - Credit card numbers
 * - Medical record numbers
 * - Dates of birth (Dutch formats)
 * - Addresses (Dutch street patterns)
 * - IP addresses
 */
export class PIIDetectionService {
  private static patterns: PIIPattern[] = [
    // Email addresses
    {
      type: "email",
      pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      confidence: 0.95,
    },
    // Phone numbers (Dutch formats: +31 or 0 prefix)
    {
      type: "phone",
      pattern: /\b(?:\+31|0)[\s-]?(?:[1-9]\d{1}[\s-]?\d{6,7}|[1-9]\d{8})\b/g,
      confidence: 0.85,
    },
    // BSN (Burger Service Nummer) - 8 or 9 digits, validated with elfproef
    {
      type: "bsn",
      pattern: /\b(?:\d{1}[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{1,2}|\d{8,9})\b/g,
      confidence: 0.9,
    },
    // Credit card numbers (13-19 digits, may have spaces/dashes)
    {
      type: "credit_card",
      pattern: /\b(?:\d{4}[-\s]?){3}\d{1,4}\b/g,
      confidence: 0.8,
    },
    // Medical record numbers (Dutch formats)
    {
      type: "medical_record",
      pattern:
        /\b(?:DBC|DBC-nummer|Patiëntnummer|Medisch dossier|Dossiernummer)[:\s-]?\d{6,}\b/gi,
      confidence: 0.75,
    },
    // Dates of birth (Dutch formats: DD-MM-YYYY or DD/MM/YYYY)
    {
      type: "date_of_birth",
      pattern:
        /\b(?:Geboortedatum|Geboren|DOB|Date of Birth)[:\s-]?(?:\d{1,2}[-/]\d{1,2}[-/]\d{4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/gi,
      confidence: 0.7,
    },
    // IP addresses
    {
      type: "ip_address",
      pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      confidence: 0.9,
    },
    // Addresses (Dutch street patterns)
    {
      type: "address",
      pattern:
        /\b\d+[\s-]?(?:[A-Za-z]+[\s-]?)*(?:straat|St|weg|Wg|laan|Ln|plein|Pl|dreef|Dr|kade|Kd|hof|Hf|park|Pk|boulevard|Blvd|singel|Sgl|gracht|Grt)\b/gi,
      confidence: 0.6,
    },
  ];

  /**
   * Validate BSN using elfproef (eleven test)
   * BSN must be 8 or 9 digits and pass the checksum validation
   * For 8-digit BSNs, a leading zero is assumed
   *
   * @param bsn - BSN string (may contain spaces/dashes)
   * @returns true if valid BSN
   */
  private static validateBSN(bsn: string): boolean {
    // Remove spaces, dashes, and dots
    const digits = bsn.replace(/[\s.-]/g, "");

    // Must be 8 or 9 digits
    if (!/^\d{8,9}$/.test(digits)) {
      return false;
    }

    // Convert to array of numbers
    const numbers = digits.split("").map(Number);

    // For 8-digit BSN, prepend 0 to make it 9 digits
    const normalizedNumbers = numbers.length === 8 ? [0, ...numbers] : numbers;

    // Elfproef algorithm: multiply each digit by its weight
    // Positions: 9, 8, 7, 6, 5, 4, 3, 2, -1 (last digit gets -1)
    const weights = [9, 8, 7, 6, 5, 4, 3, 2, -1];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
      sum += normalizedNumbers[i] * weights[i];
    }

    // Sum must be divisible by 11
    return sum % 11 === 0;
  }

  /**
   * Detect PII in a text string
   *
   * @param text - The text to analyze
   * @param minConfidence - Minimum confidence threshold (0-1)
   * @returns Array of detected PII items
   */
  static detectPII(text: string, minConfidence: number = 0.5): PIIDetection[] {
    const detections: PIIDetection[] = [];
    const seenRanges = new Set<string>();

    for (const patternConfig of this.patterns) {
      if (patternConfig.confidence < minConfidence) {
        continue;
      }

      const matches = text.matchAll(patternConfig.pattern);

      for (const match of matches) {
        if (!match.index && match.index !== 0) {
          continue;
        }

        const startIndex = match.index;
        const endIndex = startIndex + match[0].length;
        const rangeKey = `${startIndex}-${endIndex}`;

        // Avoid duplicate detections at the same position
        if (seenRanges.has(rangeKey)) {
          continue;
        }

        // Skip if this range overlaps with a higher confidence detection
        const overlaps = detections.some(
          (d) =>
            d.startIndex < endIndex &&
            d.endIndex > startIndex &&
            d.confidence > patternConfig.confidence
        );

        if (overlaps) {
          continue;
        }

        // Validate BSN using elfproef
        if (patternConfig.type === "bsn") {
          if (!this.validateBSN(match[0])) {
            continue; // Skip invalid BSN
          }
        }

        seenRanges.add(rangeKey);

        detections.push({
          type: patternConfig.type,
          text: match[0],
          startIndex,
          endIndex,
          confidence: patternConfig.confidence,
        });
      }
    }

    // Sort by start index
    detections.sort((a, b) => a.startIndex - b.startIndex);

    logger.info("PII detection completed", {
      component: "PIIDetectionService.detectPII",
      textLength: text.length,
      detectionsCount: detections.length,
      types: detections.map((d) => d.type),
    });

    return detections;
  }

  /**
   * Detect PII in utterances (for time-based redaction)
   *
   * @param utterances - Array of utterance objects with text and timing
   * @param minConfidence - Minimum confidence threshold
   * @returns Array of detections with timing information
   */
  static detectPIIInUtterances(
    utterances: Array<{ text: string; start: number; end: number }>,
    minConfidence: number = 0.5
  ): Array<PIIDetection & { startTime?: number; endTime?: number }> {
    const detections: Array<
      PIIDetection & { startTime?: number; endTime?: number }
    > = [];

    let currentIndex = 0;

    for (const utterance of utterances) {
      const utteranceDetections = this.detectPII(utterance.text, minConfidence);

      for (const detection of utteranceDetections) {
        // Calculate approximate time based on character position
        const relativePosition = detection.startIndex / utterance.text.length;
        const duration = utterance.end - utterance.start;
        const startTime = utterance.start + duration * relativePosition;
        const endTime =
          utterance.start +
          duration * (detection.endIndex / utterance.text.length);

        detections.push({
          ...detection,
          startIndex: currentIndex + detection.startIndex,
          endIndex: currentIndex + detection.endIndex,
          startTime,
          endTime,
        });
      }

      // Add length of utterance text plus spacing
      currentIndex += utterance.text.length + 2; // +2 for spacing
    }

    return detections;
  }

  /**
   * Apply redactions to text
   *
   * @param text - Original text
   * @param redactions - Array of redaction ranges (startIndex, endIndex)
   * @param replacement - Text to replace redacted content with
   * @returns Redacted text
   */
  static applyRedactions(
    text: string,
    redactions: Array<{ startIndex: number; endIndex: number }>,
    replacement: string = "[REDACTED]"
  ): string {
    // Sort redactions by start index (descending) to apply from end to start
    const sortedRedactions = [...redactions].sort(
      (a, b) => b.startIndex - a.startIndex
    );

    let result = text;

    for (const redaction of sortedRedactions) {
      const before = result.slice(0, redaction.startIndex);
      const after = result.slice(redaction.endIndex);
      result = before + replacement + after;
    }

    return result;
  }
}

