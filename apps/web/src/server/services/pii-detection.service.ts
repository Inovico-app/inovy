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
  | "ssn"
  | "credit_card"
  | "medical_record"
  | "date_of_birth"
  | "address"
  | "person_name"
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
 * - Phone numbers (international formats)
 * - Social Security Numbers (SSN)
 * - Credit card numbers
 * - Medical record numbers
 * - Dates of birth
 * - Addresses (basic patterns)
 * - Person names (basic patterns)
 * - IP addresses
 */
export class PIIDetectionService {
  private static patterns: PIIPattern[] = [
    // Email addresses
    {
      type: "email",
      pattern:
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      confidence: 0.95,
    },
    // Phone numbers (various formats)
    {
      type: "phone",
      pattern:
        /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
      confidence: 0.85,
    },
    // Social Security Numbers (US format: XXX-XX-XXXX)
    {
      type: "ssn",
      pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
      confidence: 0.9,
    },
    // Credit card numbers (13-19 digits, may have spaces/dashes)
    {
      type: "credit_card",
      pattern: /\b(?:\d{4}[-\s]?){3}\d{1,4}\b/g,
      confidence: 0.8,
    },
    // Medical record numbers (various formats)
    {
      type: "medical_record",
      pattern: /\b(?:MRN|MR|Medical Record)[:\s-]?\d{6,}\b/gi,
      confidence: 0.75,
    },
    // Dates of birth (various formats)
    {
      type: "date_of_birth",
      pattern:
        /\b(?:DOB|Date of Birth|Born)[:\s-]?(?:\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}|\d{4}[-\/]\d{1,2}[-\/]\d{1,2})\b/gi,
      confidence: 0.7,
    },
    // IP addresses
    {
      type: "ip_address",
      pattern:
        /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      confidence: 0.9,
    },
    // Addresses (basic patterns - street numbers and common street terms)
    {
      type: "address",
      pattern:
        /\b\d+\s+(?:[A-Za-z]+(?:\s+[A-Za-z]+)*\s+)?(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Way|Circle|Cir)\b/gi,
      confidence: 0.6,
    },
    // Person names (capitalized words that might be names - lower confidence)
    // This is a basic pattern and may have false positives
    {
      type: "person_name",
      pattern: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g,
      confidence: 0.5,
    },
  ];

  /**
   * Detect PII in a text string
   *
   * @param text - The text to analyze
   * @param minConfidence - Minimum confidence threshold (0-1)
   * @returns Array of detected PII items
   */
  static detectPII(
    text: string,
    minConfidence: number = 0.5
  ): PIIDetection[] {
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
      const utteranceDetections = this.detectPII(
        utterance.text,
        minConfidence
      );

      for (const detection of utteranceDetections) {
        // Calculate approximate time based on character position
        const relativePosition =
          detection.startIndex / utterance.text.length;
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

