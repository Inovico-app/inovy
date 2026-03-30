import { logger } from "@/lib/logger";

import type {
  ABTestConfig,
  Classifier,
  ClassifierDimension,
  ClassifierInput,
  ClassifierRegistryConfig,
  ClassifierRegistryResult,
  ClassifierVerdict,
  OrgGuardrailPolicy,
} from "./types";
import { DEFAULT_REGISTRY_CONFIG } from "./types";
import { VerdictAggregator } from "./verdict-aggregator";

interface ClassifierRegistryOptions {
  classifiers: Classifier[];
  config?: Partial<ClassifierRegistryConfig>;
  orgPolicy?: OrgGuardrailPolicy;
  abTests?: ABTestConfig[];
}

export class ClassifierRegistry {
  private readonly classifiers: Map<ClassifierDimension, Classifier>;
  private readonly config: ClassifierRegistryConfig;
  private readonly aggregator: VerdictAggregator;
  private readonly abTests: Map<ClassifierDimension, ABTestConfig>;

  constructor(options: ClassifierRegistryOptions) {
    this.classifiers = new Map();
    for (const classifier of options.classifiers) {
      this.classifiers.set(classifier.dimension, classifier);
    }

    this.config = { ...DEFAULT_REGISTRY_CONFIG, ...options.config };
    this.aggregator = new VerdictAggregator(options.orgPolicy);
    this.abTests = new Map();
    for (const test of options.abTests ?? []) {
      this.abTests.set(test.dimension, test);
    }
  }

  async evaluate(input: ClassifierInput): Promise<ClassifierRegistryResult> {
    const startTime = Date.now();

    const activeClassifiers = this.config.enabledDimensions
      .map((dim) => this.classifiers.get(dim))
      .filter((c): c is Classifier => c !== undefined);

    const classifierPromises = activeClassifiers.map((classifier) =>
      this.runWithTimeout(classifier, input),
    );

    const abShadowPromises = this.runShadowClassifiers(input);

    const settled = await Promise.allSettled(classifierPromises);

    const verdicts: ClassifierVerdict[] = [];
    const timedOut: ClassifierDimension[] = [];

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      const classifier = activeClassifiers[i];

      if (result.status === "fulfilled") {
        if (result.value.timedOut) {
          timedOut.push(classifier.dimension);
          this.handleTimeout(classifier.dimension);
        } else if (result.value.verdict) {
          verdicts.push(result.value.verdict);
        }
      } else {
        logger.error("Classifier threw unexpectedly", {
          component: "ClassifierRegistry",
          dimension: classifier.dimension,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
        });

        if (this.config.failurePolicy === "fail-closed") {
          timedOut.push(classifier.dimension);
        }
      }
    }

    // Log shadow results (don't affect final action)
    void abShadowPromises.then((shadowVerdicts) => {
      if (shadowVerdicts.length > 0) {
        logger.info("A/B shadow classifier results", {
          component: "ClassifierRegistry",
          shadowVerdicts: shadowVerdicts.map((v) => ({
            dimension: v.dimension,
            action: v.action,
            confidence: v.confidence,
            classifierVersion: v.classifierVersion,
          })),
        });
      }
    });

    const aggregation = this.aggregator.aggregate(verdicts);

    let finalAction = aggregation.finalAction;
    let blockedBy = aggregation.blockedBy as ClassifierDimension | undefined;

    if (timedOut.length > 0 && this.config.failurePolicy === "fail-closed") {
      finalAction = "block";
      blockedBy = blockedBy ?? timedOut[0];
    }

    const totalLatencyMs = Date.now() - startTime;

    return {
      verdicts,
      finalAction,
      blockedBy,
      blockMessage: aggregation.blockMessage,
      totalLatencyMs,
      timedOut,
    };
  }

  private async runWithTimeout(
    classifier: Classifier,
    input: ClassifierInput,
  ): Promise<{ verdict?: ClassifierVerdict; timedOut: boolean }> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<{
      verdict?: ClassifierVerdict;
      timedOut: boolean;
    }>((resolve) => {
      timeoutHandle = setTimeout(
        () => resolve({ timedOut: true }),
        this.config.timeoutMs,
      );
    });

    const classifyPromise = classifier
      .classify(input)
      .then((verdict) => ({ verdict, timedOut: false }))
      .catch((error) => {
        logger.error("Classifier error", {
          component: "ClassifierRegistry",
          dimension: classifier.dimension,
          error: error instanceof Error ? error.message : String(error),
        });

        if (this.config.failurePolicy === "fail-closed") {
          return { timedOut: true } as const;
        }
        return { timedOut: false } as const;
      });

    return Promise.race([classifyPromise, timeoutPromise]).finally(() => {
      clearTimeout(timeoutHandle);
    });
  }

  private async runShadowClassifiers(
    input: ClassifierInput,
  ): Promise<ClassifierVerdict[]> {
    const shadowPromises: Promise<ClassifierVerdict | null>[] = [];

    for (const [, abTest] of this.abTests) {
      if (!abTest.shadowMode) continue;

      for (const variant of abTest.variants) {
        shadowPromises.push(
          variant.classifier.classify(input).catch(() => null),
        );
      }
    }

    const results = await Promise.allSettled(shadowPromises);
    return results
      .filter(
        (r): r is PromiseFulfilledResult<ClassifierVerdict> =>
          r.status === "fulfilled" && r.value !== null,
      )
      .map((r) => r.value);
  }

  private handleTimeout(dimension: ClassifierDimension): void {
    logger.warn("Classifier timed out", {
      component: "ClassifierRegistry",
      dimension,
      timeoutMs: this.config.timeoutMs,
      failurePolicy: this.config.failurePolicy,
    });
  }
}
