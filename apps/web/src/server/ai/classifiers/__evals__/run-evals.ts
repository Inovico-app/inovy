/**
 * Eval runner for LLM-based classifiers.
 *
 * Run: pnpm --filter web exec tsx src/server/ai/classifiers/__evals__/run-evals.ts [--tag <tag>] [--dimension <dimension>]
 *
 * CI trigger: only on main merges touching src/server/ai/classifiers/**
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { InjectionClassifier } from "../injection.classifier";
import { TopicClassifier } from "../topic.classifier";
import { RiskClassifier } from "../risk.classifier";
import { GroundingClassifier } from "../grounding.classifier";
import type { Classifier, ClassifierInput } from "../types";

interface EvalCase {
  name: string;
  input: string;
  expectedAction?: "allow" | "warn" | "block";
  expectedCategory?: string;
  expectedGroundedRatio?: number;
  minConfidence?: number;
  tags: string[];
}

interface EvalResult {
  name: string;
  passed: boolean;
  runs: number;
  passCount: number;
  details: string;
}

const RUNS_PER_CASE = 3;
const MIN_PASS_RATIO = 2 / 3;
const CONFIDENCE_TOLERANCE = 0.1;

const EVAL_DIR = __dirname;

const CLASSIFIERS: Record<string, Classifier> = {
  injection: new InjectionClassifier(),
  topic: new TopicClassifier(),
  risk: new RiskClassifier(),
  grounding: new GroundingClassifier(),
};

const EVAL_FILES: Record<string, string> = {
  injection: "injection-eval.json",
  topic: "topic-eval.json",
  risk: "risk-eval.json",
  grounding: "grounding-eval.json",
};

function loadEvalCases(dimension: string): EvalCase[] {
  const filePath = join(EVAL_DIR, EVAL_FILES[dimension]);
  return JSON.parse(readFileSync(filePath, "utf-8")) as EvalCase[];
}

function makeInput(text: string): ClassifierInput {
  return {
    text,
    context: { scope: "project" },
    metadata: {
      organizationId: "eval-org",
      userId: "eval-user",
      conversationId: "eval-conv",
    },
  };
}

async function runEvalCase(
  classifier: Classifier,
  testCase: EvalCase,
): Promise<EvalResult> {
  let passCount = 0;
  const failures: string[] = [];

  for (let run = 0; run < RUNS_PER_CASE; run++) {
    try {
      const verdict = await classifier.classify(makeInput(testCase.input));
      let passed = true;

      if (
        testCase.expectedAction &&
        verdict.action !== testCase.expectedAction
      ) {
        if (testCase.minConfidence !== undefined) {
          if (
            verdict.confidence <
            testCase.minConfidence - CONFIDENCE_TOLERANCE
          ) {
            passed = false;
            failures.push(
              `Run ${run + 1}: expected ${testCase.expectedAction}, got ${verdict.action} (confidence ${verdict.confidence})`,
            );
          }
        } else {
          passed = false;
          failures.push(
            `Run ${run + 1}: expected ${testCase.expectedAction}, got ${verdict.action}`,
          );
        }
      }

      if (
        testCase.expectedCategory &&
        verdict.category !== testCase.expectedCategory
      ) {
        passed = false;
        failures.push(
          `Run ${run + 1}: expected category ${testCase.expectedCategory}, got ${verdict.category}`,
        );
      }

      if (passed) passCount++;
    } catch (error) {
      failures.push(
        `Run ${run + 1}: classifier threw: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const passed = passCount / RUNS_PER_CASE >= MIN_PASS_RATIO;

  return {
    name: testCase.name,
    passed,
    runs: RUNS_PER_CASE,
    passCount,
    details: passed
      ? `${passCount}/${RUNS_PER_CASE} passed`
      : `${passCount}/${RUNS_PER_CASE} passed. Failures: ${failures.join("; ")}`,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const tagFilter = args.includes("--tag")
    ? args[args.indexOf("--tag") + 1]
    : undefined;
  const dimensionFilter = args.includes("--dimension")
    ? args[args.indexOf("--dimension") + 1]
    : undefined;

  const dimensions = dimensionFilter
    ? [dimensionFilter]
    : Object.keys(CLASSIFIERS);

  let totalPassed = 0;
  let totalFailed = 0;

  for (const dimension of dimensions) {
    const classifier = CLASSIFIERS[dimension];
    if (!classifier) {
      console.error(`Unknown dimension: ${dimension}`);
      continue;
    }

    let cases = loadEvalCases(dimension);
    if (tagFilter) {
      cases = cases.filter((c) => c.tags.includes(tagFilter));
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Evaluating: ${dimension} (${cases.length} cases)`);
    console.log("=".repeat(60));

    for (const testCase of cases) {
      const result = await runEvalCase(classifier, testCase);

      const status = result.passed ? "PASS" : "FAIL";
      const icon = result.passed ? "✓" : "✗";
      console.log(`  ${icon} [${status}] ${result.name} — ${result.details}`);

      if (result.passed) totalPassed++;
      else totalFailed++;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Results: ${totalPassed} passed, ${totalFailed} failed`);
  console.log("=".repeat(60));

  if (totalFailed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Eval runner failed:", error);
  process.exit(1);
});
