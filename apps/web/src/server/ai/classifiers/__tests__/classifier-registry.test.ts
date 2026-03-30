import { describe, expect, it, vi } from "vitest";

import type {
  Classifier,
  ClassifierInput,
  ClassifierVerdict,
  OrgGuardrailPolicy,
} from "../types";
import { ClassifierRegistry } from "../classifier-registry";

function makeClassifier(
  dimension: ClassifierVerdict["dimension"],
  result: Partial<ClassifierVerdict> = {},
  delayMs = 10,
): Classifier {
  return {
    name: `test-${dimension}`,
    version: "1.0.0",
    dimension,
    classify: vi.fn(async () => {
      await new Promise((r) => setTimeout(r, delayMs));
      return {
        dimension,
        action: "allow" as const,
        confidence: 0.1,
        reasoning: "test",
        classifierVersion: "1.0.0",
        latencyMs: delayMs,
        model: "test-model",
        ...result,
      };
    }),
  };
}

const TEST_INPUT: ClassifierInput = {
  text: "What was discussed in Monday's meeting?",
  context: { scope: "project" },
  metadata: {
    organizationId: "org-1",
    userId: "user-1",
    conversationId: "conv-1",
  },
};

describe("ClassifierRegistry", () => {
  it("runs all classifiers in parallel and returns verdicts", async () => {
    const registry = new ClassifierRegistry({
      classifiers: [
        makeClassifier("injection"),
        makeClassifier("topic"),
        makeClassifier("risk"),
      ],
      config: {
        timeoutMs: 1000,
        failurePolicy: "fail-open",
        enabledDimensions: ["injection", "topic", "risk"],
      },
    });

    const result = await registry.evaluate(TEST_INPUT);

    expect(result.verdicts).toHaveLength(3);
    expect(result.finalAction).toBe("allow");
    expect(result.timedOut).toHaveLength(0);
  });

  it("blocks when any classifier returns high confidence", async () => {
    const registry = new ClassifierRegistry({
      classifiers: [
        makeClassifier("injection", { confidence: 0.95, action: "block" }),
        makeClassifier("topic"),
        makeClassifier("risk"),
      ],
      config: {
        timeoutMs: 1000,
        failurePolicy: "fail-open",
        enabledDimensions: ["injection", "topic", "risk"],
      },
    });

    const result = await registry.evaluate(TEST_INPUT);

    expect(result.finalAction).toBe("block");
    expect(result.blockedBy).toBe("injection");
  });

  it("handles classifier timeout gracefully with fail-open", async () => {
    const registry = new ClassifierRegistry({
      classifiers: [
        makeClassifier("injection", {}, 2000), // will timeout
        makeClassifier("topic"),
      ],
      config: {
        timeoutMs: 100,
        failurePolicy: "fail-open",
        enabledDimensions: ["injection", "topic"],
      },
    });

    const result = await registry.evaluate(TEST_INPUT);

    expect(result.timedOut).toContain("injection");
    expect(result.finalAction).toBe("allow");
  });

  it("blocks on timeout when fail-closed", async () => {
    const registry = new ClassifierRegistry({
      classifiers: [
        makeClassifier("injection", {}, 2000), // will timeout
        makeClassifier("topic"),
      ],
      config: {
        timeoutMs: 100,
        failurePolicy: "fail-closed",
        enabledDimensions: ["injection", "topic"],
      },
    });

    const result = await registry.evaluate(TEST_INPUT);

    expect(result.timedOut).toContain("injection");
    expect(result.finalAction).toBe("block");
  });

  it("skips classifiers not in enabledDimensions", async () => {
    const injectionClassifier = makeClassifier("injection");
    const topicClassifier = makeClassifier("topic");

    const registry = new ClassifierRegistry({
      classifiers: [injectionClassifier, topicClassifier],
      config: {
        timeoutMs: 1000,
        failurePolicy: "fail-open",
        enabledDimensions: ["injection"],
      },
    });

    const result = await registry.evaluate(TEST_INPUT);

    expect(result.verdicts).toHaveLength(1);
    expect(result.verdicts[0].dimension).toBe("injection");
    expect(topicClassifier.classify).not.toHaveBeenCalled();
  });

  it("handles classifier errors gracefully with fail-open", async () => {
    const failingClassifier: Classifier = {
      name: "failing",
      version: "1.0.0",
      dimension: "injection",
      classify: vi.fn(async () => {
        throw new Error("API error");
      }),
    };

    const registry = new ClassifierRegistry({
      classifiers: [failingClassifier, makeClassifier("topic")],
      config: {
        timeoutMs: 1000,
        failurePolicy: "fail-open",
        enabledDimensions: ["injection", "topic"],
      },
    });

    const result = await registry.evaluate(TEST_INPUT);

    expect(result.verdicts).toHaveLength(1); // only topic verdict
    expect(result.finalAction).toBe("allow");
  });

  it("applies org policy to verdict aggregation", async () => {
    const strictPolicy: OrgGuardrailPolicy = {
      organizationId: "org-1",
      thresholds: {
        injection: { blockAbove: 0.3, warnAbove: 0.1 },
        topic: { blockAbove: 0.3, warnAbove: 0.1 },
        risk: { blockAbove: 0.3, warnAbove: 0.1 },
        grounding: { blockAbove: 0.3, warnAbove: 0.1 },
      },
      categoryOverrides: [],
      failurePolicy: "fail-closed",
    };

    const registry = new ClassifierRegistry({
      classifiers: [makeClassifier("injection", { confidence: 0.4 })],
      config: {
        timeoutMs: 1000,
        failurePolicy: "fail-open",
        enabledDimensions: ["injection"],
      },
      orgPolicy: strictPolicy,
    });

    const result = await registry.evaluate(TEST_INPUT);

    expect(result.finalAction).toBe("block");
  });
});
