import type { LanguageModelV3Middleware } from "@ai-sdk/provider";

import { logger } from "@/lib/logger";

import { extractLastUserMessage, GuardrailError } from "./types";

const OFF_TOPIC_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  {
    pattern:
      /(?:write|generate|create)\s+(?:a\s+)?(?:malware|virus|exploit|ransomware|trojan|keylogger)/i,
    label: "malware-generation",
  },
  {
    pattern: /(?:how\s+to\s+)?(?:hack|crack|exploit|ddos|brute\s*force)\s+/i,
    label: "hacking",
  },

  {
    pattern:
      /(?:how\s+to\s+)?(?:make|build|create)\s+(?:a\s+)?(?:bomb|weapon|explosive|poison)/i,
    label: "weapons",
  },

  {
    pattern: /(?:how\s+to\s+)?(?:launder|counterfeit|forge|smuggle)/i,
    label: "illegal-activities",
  },

  {
    pattern:
      /(?:how\s+to\s+)?(?:cook|make|synthesize|manufacture)\s+(?:meth|cocaine|heroin|fentanyl|drugs)/i,
    label: "drug-manufacturing",
  },

  {
    pattern:
      /(?:how\s+to\s+)?(?:kill\s+(?:myself|yourself)|commit\s+suicide|end\s+(?:my|your)\s+life)/i,
    label: "self-harm",
  },

  {
    pattern:
      /(?:how\s+to\s+)?(?:steal|fake|forge)\s+(?:an?\s+)?(?:identity|passport|ID|license)/i,
    label: "identity-fraud",
  },
];

export function createTopicGuardMiddleware(): LanguageModelV3Middleware {
  return {
    specificationVersion: "v3",

    async transformParams({ params }) {
      const userMessage = extractLastUserMessage(params);

      if (!userMessage || userMessage.length === 0) {
        return params;
      }

      for (const { pattern, label } of OFF_TOPIC_PATTERNS) {
        if (pattern.test(userMessage)) {
          logger.security.suspiciousActivity(
            "Off-topic / dangerous request detected",
            {
              component: "TopicGuardMiddleware",
              category: label,
              inputLength: userMessage.length,
            }
          );

          throw new GuardrailError({
            type: "topic",
            severity: "block",
            message:
              "This request falls outside the scope of this application. Inovy is designed to assist with meeting recordings, transcriptions, and project management.",
            details: { category: label },
          });
        }
      }

      return params;
    },
  };
}

