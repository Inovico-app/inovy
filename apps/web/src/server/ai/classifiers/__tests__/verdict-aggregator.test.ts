import { describe, expect, it } from "vitest";

import type { ClassifierVerdict, OrgGuardrailPolicy } from "../types";
import { VerdictAggregator } from "../verdict-aggregator";

function makeVerdict(
  overrides: Partial<ClassifierVerdict> = {},
): ClassifierVerdict {
  return {
    dimension: "injection",
    action: "allow",
    confidence: 0.1,
    reasoning: "test",
    classifierVersion: "1.0.0",
    latencyMs: 50,
    model: "claude-haiku-4-5-20251001",
    ...overrides,
  };
}

describe("VerdictAggregator", () => {
  const aggregator = new VerdictAggregator();

  describe("with default thresholds", () => {
    it("allows when all verdicts are low confidence", () => {
      const verdicts = [
        makeVerdict({ dimension: "injection", confidence: 0.2 }),
        makeVerdict({ dimension: "topic", confidence: 0.1 }),
        makeVerdict({ dimension: "risk", confidence: 0.3 }),
      ];

      const result = aggregator.aggregate(verdicts);
      expect(result.finalAction).toBe("allow");
      expect(result.blockedBy).toBeUndefined();
    });

    it("blocks when injection confidence exceeds block threshold", () => {
      const verdicts = [
        makeVerdict({ dimension: "injection", confidence: 0.9 }),
        makeVerdict({ dimension: "topic", confidence: 0.1 }),
      ];

      const result = aggregator.aggregate(verdicts);
      expect(result.finalAction).toBe("block");
      expect(result.blockedBy).toBe("injection");
    });

    it("warns when confidence is between warn and block thresholds", () => {
      const verdicts = [
        makeVerdict({ dimension: "injection", confidence: 0.6 }),
        makeVerdict({ dimension: "topic", confidence: 0.1 }),
      ];

      const result = aggregator.aggregate(verdicts);
      expect(result.finalAction).toBe("warn");
    });

    it("uses strictest action across all verdicts", () => {
      const verdicts = [
        makeVerdict({ dimension: "injection", confidence: 0.6 }), // warn
        makeVerdict({ dimension: "topic", confidence: 0.95 }), // block
      ];

      const result = aggregator.aggregate(verdicts);
      expect(result.finalAction).toBe("block");
      expect(result.blockedBy).toBe("topic");
    });

    it("applies self-harm category override regardless of confidence", () => {
      const verdicts = [
        makeVerdict({
          dimension: "topic",
          confidence: 0.4, // below warn threshold
          category: "self-harm",
        }),
      ];

      const result = aggregator.aggregate(verdicts);
      expect(result.finalAction).toBe("block");
      expect(result.blockMessage).toContain("113 Zelfmoordpreventie");
    });

    it("returns allow with empty verdicts", () => {
      const result = aggregator.aggregate([]);
      expect(result.finalAction).toBe("allow");
    });
  });

  describe("with custom org policy", () => {
    const strictPolicy: OrgGuardrailPolicy = {
      organizationId: "org-1",
      thresholds: {
        injection: { blockAbove: 0.5, warnAbove: 0.3 },
        topic: { blockAbove: 0.5, warnAbove: 0.3 },
        risk: { blockAbove: 0.5, warnAbove: 0.3 },
        grounding: { blockAbove: 0.5, warnAbove: 0.3 },
      },
      categoryOverrides: [
        {
          category: "self-harm",
          action: "block",
          customResponse: "Custom crisis message",
        },
      ],
      failurePolicy: "fail-closed",
    };

    it("uses org-specific thresholds", () => {
      const aggregatorWithPolicy = new VerdictAggregator(strictPolicy);
      const verdicts = [
        makeVerdict({ dimension: "injection", confidence: 0.6 }),
      ];

      const result = aggregatorWithPolicy.aggregate(verdicts);
      expect(result.finalAction).toBe("block");
    });

    it("uses org-specific custom response for category override", () => {
      const aggregatorWithPolicy = new VerdictAggregator(strictPolicy);
      const verdicts = [
        makeVerdict({
          dimension: "topic",
          confidence: 0.2,
          category: "self-harm",
        }),
      ];

      const result = aggregatorWithPolicy.aggregate(verdicts);
      expect(result.blockMessage).toBe("Custom crisis message");
    });
  });
});
