import { describe, expect, it, vi } from "vitest";

import type { GroundingEvaluation } from "../types";
import { GroundingEnforcer } from "../grounding-enforcer";
import type { GroundingClassifier } from "../grounding.classifier";

function makeGroundingClassifier(
  evaluations: GroundingEvaluation[],
): GroundingClassifier {
  let callCount = 0;
  return {
    name: "grounding-classifier",
    version: "1.0.0",
    dimension: "grounding",
    classify: vi.fn(),
    evaluate: vi.fn(async () => {
      const result =
        evaluations[callCount] ?? evaluations[evaluations.length - 1];
      callCount++;
      return result;
    }),
  } as unknown as GroundingClassifier;
}

describe("GroundingEnforcer", () => {
  it("returns response unchanged when grounded", async () => {
    const classifier = makeGroundingClassifier([
      {
        overallGrounded: true,
        groundedRatio: 0.95,
        ungroundedClaims: [],
        reasoning: "All claims grounded",
      },
    ]);

    const enforcer = new GroundingEnforcer(classifier, {
      groundedThreshold: 0.8,
      maxRetries: 1,
    });

    const result = await enforcer.enforce({
      responseText: "The meeting discussed Q1 results [1].",
      context: ["Q1 results transcript"],
    });

    expect(result.action).toBe("pass");
    expect(result.finalText).toBe("The meeting discussed Q1 results [1].");
    expect(result.retried).toBe(false);
  });

  it("retries when grounding ratio is below threshold", async () => {
    const classifier = makeGroundingClassifier([
      {
        overallGrounded: false,
        groundedRatio: 0.5,
        ungroundedClaims: [{ claim: "Experts agree", reason: "No source" }],
        reasoning: "Contains ungrounded claims",
      },
      {
        overallGrounded: true,
        groundedRatio: 0.9,
        ungroundedClaims: [],
        reasoning: "Retry was grounded",
      },
    ]);

    const retryFn = vi.fn(async () => "Improved response with [1] citations.");

    const enforcer = new GroundingEnforcer(classifier, {
      groundedThreshold: 0.8,
      maxRetries: 1,
    });

    const result = await enforcer.enforce({
      responseText: "Experts agree that the project is on track.",
      context: ["Project status transcript"],
      retryFn,
    });

    expect(result.action).toBe("pass");
    expect(result.retried).toBe(true);
    expect(retryFn).toHaveBeenCalledOnce();
  });

  it("annotates when retry still ungrounded", async () => {
    const ungroundedEval: GroundingEvaluation = {
      overallGrounded: false,
      groundedRatio: 0.4,
      ungroundedClaims: [
        { claim: "Revenue increased 20%", reason: "Not in context" },
        { claim: "Team agreed unanimously", reason: "Not in context" },
      ],
      reasoning: "Multiple ungrounded claims",
    };

    const classifier = makeGroundingClassifier([
      ungroundedEval,
      ungroundedEval,
    ]);

    const retryFn = vi.fn(async () => "Still ungrounded response.");

    const enforcer = new GroundingEnforcer(classifier, {
      groundedThreshold: 0.8,
      maxRetries: 1,
    });

    const result = await enforcer.enforce({
      responseText: "Revenue increased 20% and team agreed unanimously.",
      context: ["Some transcript"],
      retryFn,
    });

    expect(result.action).toBe("annotate");
    expect(result.ungroundedClaims).toHaveLength(2);
    expect(result.retried).toBe(true);
  });

  it("annotates without retry when no retryFn provided", async () => {
    const classifier = makeGroundingClassifier([
      {
        overallGrounded: false,
        groundedRatio: 0.3,
        ungroundedClaims: [{ claim: "test", reason: "no source" }],
        reasoning: "Ungrounded",
      },
    ]);

    const enforcer = new GroundingEnforcer(classifier, {
      groundedThreshold: 0.8,
      maxRetries: 1,
    });

    const result = await enforcer.enforce({
      responseText: "Some ungrounded text.",
      context: [],
    });

    expect(result.action).toBe("annotate");
    expect(result.retried).toBe(false);
  });
});
