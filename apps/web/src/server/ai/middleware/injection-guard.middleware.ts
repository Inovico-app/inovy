import type { LanguageModelV3Middleware } from "@ai-sdk/provider";

import { logger } from "@/lib/logger";

import { extractLastUserMessage, GuardrailError } from "./types";

const INJECTION_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  {
    pattern: /ignore\s+(?:all\s+)?(?:previous\s+)?instructions?/i,
    description: "instruction override",
  },
  {
    pattern: /forget\s+(?:all\s+)?(?:previous|everything|above)/i,
    description: "memory wipe",
  },
  { pattern: /override\s+(?:your\s+)?system/i, description: "system override" },
  {
    pattern: /disregard\s+(?:all\s+)?(?:your\s+)?rules?/i,
    description: "rule disregard",
  },
  { pattern: /new\s+instructions?\s*:/i, description: "new instructions" },

  {
    pattern:
      /(?:reveal|show|display|print|output|repeat)\s+(?:your\s+)?system\s*(?:prompt|instructions?|message)/i,
    description: "system prompt extraction",
  },
  {
    pattern:
      /what\s+(?:are|is)\s+your\s+(?:system\s+)?(?:prompt|instructions?|rules?)/i,
    description: "system prompt query",
  },

  {
    pattern:
      /(?:act|behave|pretend|imagine)\s+(?:as\s+if\s+)?you\s+(?:are|were)/i,
    description: "role manipulation",
  },
  {
    pattern: /you\s+are\s+now\s+(?:a|an|the)/i,
    description: "role reassignment",
  },
  {
    pattern: /entering\s+(?:a\s+new\s+)?(?:DAN|jailbreak|developer)\s+mode/i,
    description: "jailbreak mode",
  },

  {
    pattern: /<\s*\/?(?:system|instructions?|admin|root|prompt)/i,
    description: "XML tag injection",
  },
  { pattern: /\[(?:system|INST|SYS)\]/i, description: "bracket tag injection" },

  { pattern: /(?:decode|base64|eval)\s*\(/i, description: "encoded payload" },

  {
    pattern: /negeer\s+(?:alle\s+)?(?:vorige\s+)?instructies/i,
    description: "Dutch instruction override",
  },
  { pattern: /vergeet\s+(?:alles|vorige)/i, description: "Dutch memory wipe" },
  {
    pattern: /nieuwe\s+instructies\s*:/i,
    description: "Dutch new instructions",
  },
];

export function createInjectionGuardMiddleware(): LanguageModelV3Middleware {
  return {
    specificationVersion: "v3",

    async transformParams({ params }) {
      const userMessage = extractLastUserMessage(params);

      if (!userMessage || userMessage.length === 0) {
        return params;
      }

      const violations: string[] = [];

      for (const { pattern, description } of INJECTION_PATTERNS) {
        if (pattern.test(userMessage)) {
          violations.push(description);
        }
      }

      if (violations.length > 0) {
        logger.security.suspiciousActivity(
          "Prompt injection patterns detected",
          {
            component: "InjectionGuardMiddleware",
            violations,
            inputLength: userMessage.length,
          }
        );

        throw new GuardrailError({
          type: "injection",
          severity: "block",
          message:
            "Your message was blocked because it contains patterns that could compromise system security. Please rephrase your request.",
          details: { violations },
        });
      }

      return params;
    },
  };
}

