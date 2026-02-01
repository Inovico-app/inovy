#!/usr/bin/env tsx

/**
 * XML Security Check Script
 *
 * This script checks for XML parsing libraries and ensures they are configured securely.
 * It should be run as part of CI/CD pipeline to enforce SSD-32 compliance.
 *
 * Usage:
 *   pnpm tsx scripts/check-xml-security.ts
 *
 * Exit codes:
 *   0 - No issues found
 *   1 - XML libraries detected without proper security documentation
 *   2 - Script error
 *
 * @see /workspace/apps/web/SECURITY-XXE-PREVENTION.md
 */

import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

interface CheckResult {
  passed: boolean;
  message: string;
  severity: "info" | "warning" | "error";
}

const XML_LIBRARIES = [
  "xml2js",
  "libxmljs",
  "libxmljs2",
  "fast-xml-parser",
  "xml-parser",
  "sax",
  "xmldom",
  "jsdom", // Can parse XML
  "cheerio", // Can parse XML
  "node-html-parser", // Can parse XML
];

const SECURITY_DOC_PATH = resolve(__dirname, "../SECURITY-XXE-PREVENTION.md");

/**
 * Check if XML parsing libraries are installed
 */
function checkXmlLibraries(): CheckResult[] {
  const results: CheckResult[] = [];

  console.log("🔍 Checking for XML parsing libraries...\n");

  try {
    // Read package.json
    const packageJsonPath = resolve(__dirname, "../package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const foundLibraries: string[] = [];

    // Check for XML libraries
    for (const lib of XML_LIBRARIES) {
      if (allDependencies[lib]) {
        foundLibraries.push(`${lib}@${allDependencies[lib]}`);
      }
    }

    if (foundLibraries.length === 0) {
      results.push({
        passed: true,
        message: "✅ No XML parsing libraries detected",
        severity: "info",
      });
    } else {
      results.push({
        passed: false,
        message: `⚠️  XML parsing libraries detected:\n   ${foundLibraries.join("\n   ")}`,
        severity: "error",
      });

      // Check if security documentation has been updated
      if (existsSync(SECURITY_DOC_PATH)) {
        const securityDoc = readFileSync(SECURITY_DOC_PATH, "utf-8");

        // Check if the document mentions the found libraries
        const librariesDocumented = foundLibraries.some((lib) => {
          const libName = lib.split("@")[0];
          return securityDoc.includes(libName);
        });

        if (librariesDocumented) {
          results.push({
            passed: true,
            message:
              "✅ XML libraries are documented in SECURITY-XXE-PREVENTION.md",
            severity: "info",
          });
        } else {
          results.push({
            passed: false,
            message:
              "❌ XML libraries are NOT documented in SECURITY-XXE-PREVENTION.md\n" +
              "   Please update the security documentation before using XML parsing.",
            severity: "error",
          });
        }
      } else {
        results.push({
          passed: false,
          message: "❌ SECURITY-XXE-PREVENTION.md not found!",
          severity: "error",
        });
      }
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `❌ Error checking XML libraries: ${error}`,
      severity: "error",
    });
  }

  return results;
}

/**
 * Check for XML parsing patterns in code
 */
function checkXmlUsageInCode(): CheckResult[] {
  const results: CheckResult[] = [];

  console.log("\n🔍 Checking for XML parsing patterns in code...\n");

  try {
    // Search for XML-related patterns
    const patterns = [
      "parseXml",
      "parseXML",
      "xml2js",
      "new XMLParser",
      "DOMParser",
      ".parseFromString",
      "text/xml",
      "application/xml",
    ];

    for (const pattern of patterns) {
      try {
        // Use ripgrep to search for patterns
        const output = execSync(
          `rg -i "${pattern}" apps/web/src --type ts --type tsx -l`,
          {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          }
        );

        if (output.trim()) {
          const files = output.trim().split("\n");
          results.push({
            passed: false,
            message:
              `⚠️  XML parsing pattern "${pattern}" found in:\n   ` +
              files.join("\n   "),
            severity: "warning",
          });
        }
      } catch (error) {
        // ripgrep returns non-zero exit code when no matches found
        // This is expected and means no issues were found
        if (error && typeof error === "object" && "status" in error) {
          const exitCode = (error as { status: number }).status;
          if (exitCode === 1) {
            // No matches found - this is good
            continue;
          }
        }
      }
    }

    if (results.length === 0) {
      results.push({
        passed: true,
        message: "✅ No XML parsing patterns detected in code",
        severity: "info",
      });
    }
  } catch (error) {
    results.push({
      passed: false,
      message: `❌ Error checking code patterns: ${error}`,
      severity: "error",
    });
  }

  return results;
}

/**
 * Verify security documentation exists and is up to date
 */
function checkSecurityDocumentation(): CheckResult[] {
  const results: CheckResult[] = [];

  console.log("\n🔍 Checking security documentation...\n");

  if (existsSync(SECURITY_DOC_PATH)) {
    const content = readFileSync(SECURITY_DOC_PATH, "utf-8");

    // Check for required sections
    const requiredSections = [
      "## Current Implementation Status",
      "## Acceptance Criteria Status",
      "## Future XML Processing Guidelines",
      "DTD processing disabled",
      "External entities blocked",
      "Secure parser configuration",
    ];

    const missingSections = requiredSections.filter(
      (section) => !content.includes(section)
    );

    if (missingSections.length === 0) {
      results.push({
        passed: true,
        message: "✅ Security documentation is complete",
        severity: "info",
      });
    } else {
      results.push({
        passed: false,
        message:
          "⚠️  Security documentation is missing required sections:\n   " +
          missingSections.join("\n   "),
        severity: "warning",
      });
    }

    // Check if document is recent (within last year)
    const dateMatch = content.match(/\*\*Last Updated:\*\* (\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      const lastUpdated = new Date(dateMatch[1]);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (lastUpdated < oneYearAgo) {
        results.push({
          passed: false,
          message: `⚠️  Security documentation is outdated (last updated: ${dateMatch[1]})`,
          severity: "warning",
        });
      }
    }
  } else {
    results.push({
      passed: false,
      message: `❌ Security documentation not found at ${SECURITY_DOC_PATH}`,
      severity: "error",
    });
  }

  return results;
}

/**
 * Main execution
 */
function main(): void {
  console.log("🔒 XML Security Check (SSD-32 Compliance)\n");
  console.log("=" .repeat(60));

  const allResults: CheckResult[] = [
    ...checkXmlLibraries(),
    ...checkXmlUsageInCode(),
    ...checkSecurityDocumentation(),
  ];

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("\n📊 Summary:\n");

  const errors = allResults.filter((r) => !r.passed && r.severity === "error");
  const warnings = allResults.filter(
    (r) => !r.passed && r.severity === "warning"
  );
  const passed = allResults.filter((r) => r.passed);

  console.log(`✅ Passed: ${passed.length}`);
  console.log(`⚠️  Warnings: ${warnings.length}`);
  console.log(`❌ Errors: ${errors.length}`);

  // Print all results
  console.log("\n" + "=".repeat(60));
  console.log("\n📋 Detailed Results:\n");

  allResults.forEach((result) => {
    console.log(result.message);
  });

  // Exit with appropriate code
  if (errors.length > 0) {
    console.log("\n❌ XML security check FAILED\n");
    console.log("Please review the errors above and take action:");
    console.log("1. Remove XML parsing libraries if not needed");
    console.log("2. Update SECURITY-XXE-PREVENTION.md with security measures");
    console.log("3. Implement secure XML parsing configuration");
    console.log("\nSee: /workspace/apps/web/SECURITY-XXE-PREVENTION.md\n");
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.log(
      "\n⚠️  XML security check passed with warnings - review recommended\n"
    );
    process.exit(0);
  }

  console.log("\n✅ XML security check PASSED\n");
  console.log(
    "No XML parsing libraries detected. Application follows JSON-only architecture.\n"
  );
  process.exit(0);
}

// Run the script
try {
  main();
} catch (error) {
  console.error("❌ Script error:", error);
  process.exit(2);
}
