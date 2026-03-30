import { logger } from "@/lib/logger";

import {
  DEFAULT_CATEGORY_OVERRIDES,
  DEFAULT_THRESHOLDS,
  type ClassifierVerdict,
  type OrgGuardrailPolicy,
} from "./types";

interface AggregationResult {
  finalAction: "allow" | "warn" | "block";
  blockedBy?: string;
  blockMessage?: string;
  verdictSummary: Record<
    string,
    { action: "allow" | "warn" | "block"; confidence: number }
  >;
}

const ACTION_PRIORITY: Record<string, number> = {
  allow: 0,
  warn: 1,
  block: 2,
};

const DEFAULT_BLOCK_MESSAGE =
  "This request falls outside the scope of this application. " +
  "Inovy is designed to assist with meeting recordings, transcriptions, and project management.";

export class VerdictAggregator {
  private readonly thresholds: OrgGuardrailPolicy["thresholds"];
  private readonly categoryOverrides: OrgGuardrailPolicy["categoryOverrides"];

  constructor(policy?: OrgGuardrailPolicy) {
    this.thresholds = policy?.thresholds ?? DEFAULT_THRESHOLDS;
    this.categoryOverrides =
      policy?.categoryOverrides ?? DEFAULT_CATEGORY_OVERRIDES;
  }

  aggregate(verdicts: ClassifierVerdict[]): AggregationResult {
    if (verdicts.length === 0) {
      return {
        finalAction: "allow",
        verdictSummary: {},
      };
    }

    let finalAction: "allow" | "warn" | "block" = "allow";
    let blockedBy: string | undefined;
    let blockMessage: string | undefined;
    const verdictSummary: AggregationResult["verdictSummary"] = {};

    for (const verdict of verdicts) {
      const resolved = this.resolveVerdict(verdict);
      verdictSummary[verdict.dimension] = {
        action: resolved.action,
        confidence: verdict.confidence,
      };

      if (ACTION_PRIORITY[resolved.action] > ACTION_PRIORITY[finalAction]) {
        finalAction = resolved.action;
        if (resolved.action === "block") {
          blockedBy = verdict.dimension;
          blockMessage = resolved.message;
        }
      }
    }

    if (finalAction === "warn") {
      logger.info("Classifier verdicts produced warnings", {
        component: "VerdictAggregator",
        verdictSummary,
      });
    }

    return {
      finalAction,
      blockedBy,
      blockMessage: blockMessage ?? DEFAULT_BLOCK_MESSAGE,
      verdictSummary,
    };
  }

  private resolveVerdict(verdict: ClassifierVerdict): {
    action: "allow" | "warn" | "block";
    message?: string;
  } {
    // Category overrides take priority
    if (verdict.category) {
      const override = this.categoryOverrides.find(
        (o) => o.category === verdict.category,
      );
      if (override) {
        return {
          action: override.action,
          message: override.customResponse,
        };
      }
    }

    // Apply threshold-based resolution
    const threshold = this.thresholds[verdict.dimension];
    if (!threshold) {
      return { action: "allow" };
    }

    if (verdict.confidence >= threshold.blockAbove) {
      return { action: "block" };
    }
    if (verdict.confidence >= threshold.warnAbove) {
      return { action: "warn" };
    }
    return { action: "allow" };
  }
}
