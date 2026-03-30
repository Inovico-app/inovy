import type { UIMessage } from "ai";

export type ClassifierDimension = "injection" | "topic" | "risk" | "grounding";

export interface ClassifierInput {
  text: string;
  context: {
    conversationHistory?: UIMessage[];
    scope: "project" | "organization";
    language?: "nl" | "en";
  };
  metadata: {
    organizationId: string;
    userId: string;
    conversationId: string;
  };
}

export interface ClassifierVerdict {
  dimension: ClassifierDimension;
  action: "allow" | "warn" | "block";
  confidence: number;
  reasoning: string;
  category?: string;
  classifierVersion: string;
  latencyMs: number;
  model: string;
}

export interface Classifier {
  readonly name: string;
  readonly version: string;
  readonly dimension: ClassifierDimension;
  classify(input: ClassifierInput): Promise<ClassifierVerdict>;
}

export interface OrgGuardrailPolicy {
  organizationId: string;
  thresholds: Record<
    ClassifierDimension,
    {
      blockAbove: number;
      warnAbove: number;
    }
  >;
  categoryOverrides: {
    category: string;
    action: "block" | "warn";
    customResponse?: string;
  }[];
  failurePolicy: "fail-open" | "fail-closed";
}

export const DEFAULT_THRESHOLDS: Record<
  ClassifierDimension,
  { blockAbove: number; warnAbove: number }
> = {
  injection: { blockAbove: 0.8, warnAbove: 0.5 },
  topic: { blockAbove: 0.85, warnAbove: 0.6 },
  risk: { blockAbove: 0.9, warnAbove: 0.7 },
  grounding: { blockAbove: 0.8, warnAbove: 0.6 },
};

export const DEFAULT_CATEGORY_OVERRIDES: OrgGuardrailPolicy["categoryOverrides"] =
  [
    {
      category: "self-harm",
      action: "block",
      customResponse:
        "If you or someone you know is struggling, please reach out for help. " +
        "Nederland: 113 Zelfmoordpreventie (0900-0113 or 113.nl) | " +
        "International: contact your local emergency services (112) or visit findahelpline.com",
    },
  ];

export interface ClassifierRegistryConfig {
  timeoutMs: number;
  failurePolicy: "fail-open" | "fail-closed";
  enabledDimensions: ClassifierDimension[];
}

export const DEFAULT_REGISTRY_CONFIG: ClassifierRegistryConfig = {
  timeoutMs: 500,
  failurePolicy: "fail-open",
  enabledDimensions: ["injection", "topic", "risk"],
};

export interface ClassifierRegistryResult {
  verdicts: ClassifierVerdict[];
  finalAction: "allow" | "warn" | "block";
  blockedBy?: ClassifierDimension;
  blockMessage?: string;
  totalLatencyMs: number;
  timedOut: ClassifierDimension[];
}

export interface ABTestConfig {
  dimension: ClassifierDimension;
  variants: {
    classifier: Classifier;
    weight: number;
  }[];
  shadowMode?: boolean;
}

export interface GroundingEvaluation {
  overallGrounded: boolean;
  groundedRatio: number;
  ungroundedClaims: { claim: string; reason: string }[];
  reasoning: string;
}

export interface GroundingEnforcerConfig {
  groundedThreshold: number;
  maxRetries: number;
}

export const DEFAULT_GROUNDING_CONFIG: GroundingEnforcerConfig = {
  groundedThreshold: 0.8,
  maxRetries: 1,
};
