import { logger } from "@/lib/logger";

/**
 * Grounding indicators that suggest the model is acknowledging
 * uncertainty or lack of knowledge (positive signals).
 */
const UNCERTAINTY_PATTERNS = [
  /\bi don'?t (?:know|have (?:information|data|details))\b/i,
  /\bik (?:weet het niet|heb geen (?:informatie|gegevens))\b/i,
  /\bnot (?:found|available) in (?:the|my) (?:knowledge|data)\b/i,
  /\bbased on (?:the )?(?:available|provided) (?:information|data|context)\b/i,
  /\bop basis van (?:de )?beschikbare (?:informatie|gegevens)\b/i,
  /\bno (?:relevant )?(?:results|information|data) (?:found|available)\b/i,
  /\bgeen (?:relevante )?(?:resultaten|informatie|gegevens) gevonden\b/i,
];

/**
 * Patterns that suggest the model may be making ungrounded claims
 * when it should be citing sources.
 */
const UNGROUNDED_CLAIM_PATTERNS = [
  /\b(?:it is )?(?:well[- ]known|widely accepted|commonly believed)\b/i,
  /\b(?:everyone knows|as we all know|obviously)\b/i,
  /\b(?:research shows|studies have shown|experts say)\b(?! \[)/i,
  /\b(?:according to|as stated by)\b(?! \[|\bthe (?:recording|transcription|summary|meeting|document)\b)/i,
];

export interface GroundingCheckResult {
  isGrounded: boolean;
  hasSourceCitations: boolean;
  hasUncertaintySignals: boolean;
  ungroundedClaimCount: number;
  warnings: string[];
}

/**
 * Checks model output for grounding quality.
 *
 * This is NOT a blocking check — it produces warnings and metrics
 * that are logged for monitoring. The response is still returned to the user.
 *
 * @param text - The model's generated response
 * @param hadToolResults - Whether the model had tool/RAG results available
 */
export function checkOutputGrounding(
  text: string,
  hadToolResults: boolean
): GroundingCheckResult {
  const warnings: string[] = [];

  // Check for uncertainty acknowledgements
  const hasUncertaintySignals = UNCERTAINTY_PATTERNS.some((p) => p.test(text));

  // Check for source citations (e.g., [1], [Source], references to recordings/meetings)
  const citationPattern =
    /\[\d+\]|\[(?:Source|Bron)\]|\b(?:recording|opname|meeting|vergadering|document)\b.*\b(?:from|van|dated|van datum)\b/i;
  const hasSourceCitations = citationPattern.test(text);

  // Check for ungrounded claims
  const ungroundedClaims = UNGROUNDED_CLAIM_PATTERNS.filter((p) =>
    p.test(text)
  );
  const ungroundedClaimCount = ungroundedClaims.length;

  if (ungroundedClaimCount > 0) {
    warnings.push(
      `Response contains ${ungroundedClaimCount} potentially ungrounded claim(s)`
    );
  }

  // If tools returned results but model didn't cite any sources, flag it
  if (hadToolResults && !hasSourceCitations && !hasUncertaintySignals) {
    warnings.push(
      "Model had tool results available but did not cite sources in response"
    );
  }

  const isGrounded =
    ungroundedClaimCount === 0 &&
    (hasSourceCitations || hasUncertaintySignals || !hadToolResults);

  if (warnings.length > 0) {
    logger.info("Output grounding check completed with warnings", {
      component: "OutputGroundingMiddleware",
      isGrounded,
      hasSourceCitations,
      hasUncertaintySignals,
      ungroundedClaimCount,
      warnings,
    });
  }

  return {
    isGrounded,
    hasSourceCitations,
    hasUncertaintySignals,
    ungroundedClaimCount,
    warnings,
  };
}
