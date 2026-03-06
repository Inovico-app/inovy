import { logger } from "@/lib/logger";
import {
  ActionErrors,
  type ActionResult,
} from "@/lib/server-action-client/action-errors";
import { GuardrailsQueries } from "@/server/data-access/guardrails.queries";
import type { GuardrailsPolicy } from "@/server/db/schema";
import { err, ok } from "neverthrow";

import {
  GuardrailsClientService,
  type ValidationResult,
} from "./guardrails-client.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EffectivePolicy {
  enabled: boolean;
  piiDetectionEnabled: boolean;
  piiAction: "block" | "redact" | "warn";
  piiEntities: string[];
  jailbreakDetectionEnabled: boolean;
  jailbreakAction: "block" | "redact" | "warn";
  toxicityDetectionEnabled: boolean;
  toxicityThreshold: number;
  toxicityAction: "block" | "redact" | "warn";
  hallucinationCheckEnabled: boolean;
  hallucinationAction: "block" | "redact" | "warn";
}

export interface GuardrailsViolationInfo {
  type: "pii" | "jailbreak" | "toxicity" | "hallucination";
  direction: "input" | "output";
  actionTaken: "blocked" | "redacted" | "warned" | "passed";
  severity: "low" | "medium" | "high" | "critical";
  guardName: string;
  details?: Record<string, unknown>;
}

export interface InputValidationResult {
  blocked: boolean;
  processedText: string;
  violations: GuardrailsViolationInfo[];
}

export interface OutputValidationResult {
  blocked: boolean;
  processedText: string;
  violations: GuardrailsViolationInfo[];
}

export interface GuardedExecutionParams<T> {
  orgId: string;
  projectId?: string;
  userId: string;
  input: string;
  context?: string;
  llmCall: (processedInput: string) => Promise<T>;
}

export interface GuardedResult<T> {
  result: T;
  violations: GuardrailsViolationInfo[];
}

// ---------------------------------------------------------------------------
// Action severity mapping
// ---------------------------------------------------------------------------

const ACTION_RESTRICTIVENESS: Record<string, number> = {
  block: 3,
  redact: 2,
  warn: 1,
};

function mostRestrictiveAction(
  a: "block" | "redact" | "warn",
  b: "block" | "redact" | "warn"
): "block" | "redact" | "warn" {
  return (ACTION_RESTRICTIVENESS[a] ?? 0) >= (ACTION_RESTRICTIVENESS[b] ?? 0)
    ? a
    : b;
}

function severityForType(
  type: "pii" | "jailbreak" | "toxicity" | "hallucination"
): "low" | "medium" | "high" | "critical" {
  const map: Record<string, "low" | "medium" | "high" | "critical"> = {
    jailbreak: "critical",
    pii: "high",
    toxicity: "high",
    hallucination: "medium",
  };
  return map[type] ?? "medium";
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class GuardrailsService {
  /**
   * Merge default + org + project policies (most-restrictive-wins).
   */
  static async getEffectivePolicy(
    orgId: string,
    projectId?: string
  ): Promise<EffectivePolicy> {
    const [defaultPolicy, orgPolicy, projectPolicy] = await Promise.all([
      GuardrailsQueries.getDefaultPolicy(),
      GuardrailsQueries.getOrganizationPolicy(orgId),
      projectId ? GuardrailsQueries.getProjectPolicy(projectId) : undefined,
    ]);

    const base = this.policyToEffective(defaultPolicy);
    const org = orgPolicy ? this.policyToEffective(orgPolicy) : null;
    const proj = projectPolicy ? this.policyToEffective(projectPolicy) : null;

    return this.mergePolicies(base, org, proj);
  }

  /**
   * Validate user input against enabled input guards.
   */
  static async validateInput(params: {
    text: string;
    orgId: string;
    projectId?: string;
    userId: string;
  }): Promise<InputValidationResult> {
    const policy = await this.getEffectivePolicy(
      params.orgId,
      params.projectId
    );

    if (!policy.enabled) {
      return { blocked: false, processedText: params.text, violations: [] };
    }

    const violations: GuardrailsViolationInfo[] = [];
    let processedText = params.text;
    let blocked = false;

    // PII detection on input
    if (policy.piiDetectionEnabled) {
      const result = await GuardrailsClientService.validate(
        "pii-input-guard",
        processedText
      );

      if (!result.passed) {
        const violation = this.buildViolation(
          "pii",
          "input",
          policy.piiAction,
          "pii-input-guard",
          result
        );
        violations.push(violation);

        if (policy.piiAction === "block") {
          blocked = true;
        } else if (
          policy.piiAction === "redact" &&
          result.validatedOutput
        ) {
          processedText = result.validatedOutput;
        }
      }
    }

    // Jailbreak detection on input
    if (policy.jailbreakDetectionEnabled && !blocked) {
      const result = await GuardrailsClientService.validate(
        "jailbreak-guard",
        processedText
      );

      if (!result.passed) {
        const violation = this.buildViolation(
          "jailbreak",
          "input",
          policy.jailbreakAction,
          "jailbreak-guard",
          result
        );
        violations.push(violation);

        if (policy.jailbreakAction === "block") {
          blocked = true;
        }
      }
    }

    // Log violations asynchronously
    for (const v of violations) {
      this.logViolation(params.orgId, params.projectId, params.userId, v);
    }

    return { blocked, processedText, violations };
  }

  /**
   * Validate LLM output against enabled output guards.
   */
  static async validateOutput(params: {
    text: string;
    orgId: string;
    projectId?: string;
    userId: string;
    context?: string;
  }): Promise<OutputValidationResult> {
    const policy = await this.getEffectivePolicy(
      params.orgId,
      params.projectId
    );

    if (!policy.enabled) {
      return { blocked: false, processedText: params.text, violations: [] };
    }

    const violations: GuardrailsViolationInfo[] = [];
    let processedText = params.text;
    let blocked = false;

    // PII detection on output
    if (policy.piiDetectionEnabled) {
      const result = await GuardrailsClientService.validate(
        "pii-output-guard",
        processedText
      );

      if (!result.passed) {
        const violation = this.buildViolation(
          "pii",
          "output",
          policy.piiAction,
          "pii-output-guard",
          result
        );
        violations.push(violation);

        if (policy.piiAction === "block") {
          blocked = true;
        } else if (
          policy.piiAction === "redact" &&
          result.validatedOutput
        ) {
          processedText = result.validatedOutput;
        }
      }
    }

    // Toxicity filtering on output
    if (policy.toxicityDetectionEnabled && !blocked) {
      const result = await GuardrailsClientService.validate(
        "toxicity-guard",
        processedText
      );

      if (!result.passed) {
        const violation = this.buildViolation(
          "toxicity",
          "output",
          policy.toxicityAction,
          "toxicity-guard",
          result
        );
        violations.push(violation);

        if (policy.toxicityAction === "block") {
          blocked = true;
        }
      }
    }

    for (const v of violations) {
      this.logViolation(params.orgId, params.projectId, params.userId, v);
    }

    return { blocked, processedText, violations };
  }

  /**
   * Full guardrails pipeline: validate input -> LLM call -> validate output.
   */
  static async executeWithGuardrails<T>(
    params: GuardedExecutionParams<T>
  ): Promise<ActionResult<GuardedResult<T>>> {
    const allViolations: GuardrailsViolationInfo[] = [];

    try {
      // 1. Validate input
      const inputResult = await this.validateInput({
        text: params.input,
        orgId: params.orgId,
        projectId: params.projectId,
        userId: params.userId,
      });

      allViolations.push(...inputResult.violations);

      if (inputResult.blocked) {
        return err(
          ActionErrors.forbidden(
            "Your message was blocked by the organization's safety policy.",
            { violations: inputResult.violations },
            "GuardrailsService.executeWithGuardrails"
          )
        );
      }

      // 2. Execute LLM call with (possibly redacted) input
      const llmResult = await params.llmCall(inputResult.processedText);

      // 3. Validate output (only for string results)
      if (typeof llmResult === "string") {
        const outputResult = await this.validateOutput({
          text: llmResult,
          orgId: params.orgId,
          projectId: params.projectId,
          userId: params.userId,
          context: params.context,
        });

        allViolations.push(...outputResult.violations);

        if (outputResult.blocked) {
          return err(
            ActionErrors.forbidden(
              "The AI response was blocked by the organization's safety policy.",
              { violations: outputResult.violations },
              "GuardrailsService.executeWithGuardrails"
            )
          );
        }

        return ok({
          result: outputResult.processedText as T,
          violations: allViolations,
        });
      }

      return ok({ result: llmResult, violations: allViolations });
    } catch (error) {
      logger.error("Guardrails execution failed", {
        component: "GuardrailsService.executeWithGuardrails",
        orgId: params.orgId,
        error: error instanceof Error ? error.message : String(error),
      });

      return err(
        ActionErrors.internal(
          "Guardrails validation failed",
          error instanceof Error ? error : undefined,
          "GuardrailsService.executeWithGuardrails"
        )
      );
    }
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private static policyToEffective(
    policy: GuardrailsPolicy | undefined
  ): EffectivePolicy {
    if (!policy) {
      return {
        enabled: true,
        piiDetectionEnabled: true,
        piiAction: "redact",
        piiEntities: [
          "EMAIL_ADDRESS",
          "PHONE_NUMBER",
          "PERSON",
          "CREDIT_CARD",
          "US_SSN",
          "IBAN_CODE",
          "IP_ADDRESS",
        ],
        jailbreakDetectionEnabled: true,
        jailbreakAction: "block",
        toxicityDetectionEnabled: true,
        toxicityThreshold: 0.7,
        toxicityAction: "block",
        hallucinationCheckEnabled: false,
        hallucinationAction: "warn",
      };
    }

    return {
      enabled: policy.enabled,
      piiDetectionEnabled: policy.piiDetectionEnabled,
      piiAction: policy.piiAction,
      piiEntities: policy.piiEntities,
      jailbreakDetectionEnabled: policy.jailbreakDetectionEnabled,
      jailbreakAction: policy.jailbreakAction,
      toxicityDetectionEnabled: policy.toxicityDetectionEnabled,
      toxicityThreshold: policy.toxicityThreshold,
      toxicityAction: policy.toxicityAction,
      hallucinationCheckEnabled: policy.hallucinationCheckEnabled,
      hallucinationAction: policy.hallucinationAction,
    };
  }

  private static mergePolicies(
    base: EffectivePolicy,
    org: EffectivePolicy | null,
    proj: EffectivePolicy | null
  ): EffectivePolicy {
    let merged = { ...base };

    if (org) {
      merged = this.mergeTwo(merged, org);
    }
    if (proj) {
      merged = this.mergeTwo(merged, proj);
    }

    return merged;
  }

  /**
   * Merge two policies — the overlay can only make things MORE restrictive.
   */
  private static mergeTwo(
    base: EffectivePolicy,
    overlay: EffectivePolicy
  ): EffectivePolicy {
    return {
      enabled: base.enabled || overlay.enabled,
      piiDetectionEnabled:
        base.piiDetectionEnabled || overlay.piiDetectionEnabled,
      piiAction: mostRestrictiveAction(base.piiAction, overlay.piiAction),
      piiEntities: [
        ...new Set([...base.piiEntities, ...overlay.piiEntities]),
      ],
      jailbreakDetectionEnabled:
        base.jailbreakDetectionEnabled || overlay.jailbreakDetectionEnabled,
      jailbreakAction: mostRestrictiveAction(
        base.jailbreakAction,
        overlay.jailbreakAction
      ),
      toxicityDetectionEnabled:
        base.toxicityDetectionEnabled || overlay.toxicityDetectionEnabled,
      toxicityThreshold: Math.min(
        base.toxicityThreshold,
        overlay.toxicityThreshold
      ),
      toxicityAction: mostRestrictiveAction(
        base.toxicityAction,
        overlay.toxicityAction
      ),
      hallucinationCheckEnabled:
        base.hallucinationCheckEnabled || overlay.hallucinationCheckEnabled,
      hallucinationAction: mostRestrictiveAction(
        base.hallucinationAction,
        overlay.hallucinationAction
      ),
    };
  }

  private static buildViolation(
    type: "pii" | "jailbreak" | "toxicity" | "hallucination",
    direction: "input" | "output",
    action: "block" | "redact" | "warn",
    guardName: string,
    result: ValidationResult
  ): GuardrailsViolationInfo {
    const actionTaken: "blocked" | "redacted" | "warned" =
      action === "block"
        ? "blocked"
        : action === "redact"
          ? "redacted"
          : "warned";

    return {
      type,
      direction,
      actionTaken,
      severity: severityForType(type),
      guardName,
      details: result.rawResponse ?? undefined,
    };
  }

  private static logViolation(
    orgId: string,
    projectId: string | undefined,
    userId: string,
    violation: GuardrailsViolationInfo
  ): void {
    GuardrailsQueries.insertViolation({
      organizationId: orgId,
      projectId: projectId ?? null,
      userId,
      violationType: violation.type,
      direction: violation.direction,
      actionTaken: violation.actionTaken,
      severity: violation.severity,
      guardName: violation.guardName,
      details: violation.details ?? null,
    }).catch((error) => {
      logger.error("Failed to log guardrails violation", {
        component: "GuardrailsService.logViolation",
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }
}
