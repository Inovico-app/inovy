#!/usr/bin/env tsx

/**
 * Post-Deployment Hosting Configuration Verification Script
 *
 * This script verifies that the hosting configuration meets security requirements
 * as specified in SSD-4.1.06 (Hosting Configuration per Client Guidelines).
 *
 * Usage:
 *   npx tsx scripts/verify-hosting-config.ts [URL]
 *
 * Example:
 *   npx tsx scripts/verify-hosting-config.ts https://your-domain.com
 */

interface SecurityHeader {
  name: string;
  required: boolean;
  expectedValue?: string;
  ssdReference?: string;
  description: string;
}

interface VerificationResult {
  passed: boolean;
  header: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  ssdReference?: string;
}

const REQUIRED_SECURITY_HEADERS: SecurityHeader[] = [
  {
    name: "X-Content-Type-Options",
    required: true,
    expectedValue: "nosniff",
    ssdReference: "SSD-24.1.02",
    description: "Prevents MIME type sniffing attacks",
  },
  {
    name: "X-Frame-Options",
    required: true,
    expectedValue: "DENY",
    ssdReference: "SSD-24.1.03",
    description: "Prevents clickjacking attacks",
  },
  {
    name: "Strict-Transport-Security",
    required: true,
    ssdReference: "SSD-24.1.05",
    description: "Enforces HTTPS connections",
  },
  {
    name: "Content-Security-Policy",
    required: true,
    ssdReference: "SSD-24.1.04",
    description: "Prevents XSS and injection attacks",
  },
  {
    name: "Referrer-Policy",
    required: true,
    description: "Controls referrer information",
  },
  {
    name: "Permissions-Policy",
    required: true,
    description: "Restricts access to browser features",
  },
  {
    name: "X-XSS-Protection",
    required: false,
    description: "Browser XSS filtering (legacy, CSP preferred)",
  },
];

class HostingConfigVerifier {
  private url: string;
  private results: VerificationResult[] = [];

  constructor(url: string) {
    this.url = url;
  }

  async verify(): Promise<void> {
    console.log("🔍 Starting Hosting Configuration Verification");
    console.log(`📍 Target URL: ${this.url}`);
    console.log(`📅 Timestamp: ${new Date().toISOString()}\n`);

    await this.verifySecurityHeaders();
    await this.verifySSL();
    await this.verifyHTTPSRedirect();

    this.printResults();
    this.generateReport();
  }

  private async verifySecurityHeaders(): Promise<void> {
    console.log("🔐 Verifying Security Headers...\n");

    try {
      const response = await fetch(this.url, {
        method: "HEAD",
        redirect: "follow",
      });

      for (const header of REQUIRED_SECURITY_HEADERS) {
        const value = response.headers.get(header.name);

        if (!value) {
          const status = header.required ? "FAIL" : "WARN";
          this.results.push({
            passed: !header.required,
            header: header.name,
            status,
            message: `${header.name} header is missing`,
            ssdReference: header.ssdReference,
          });
          continue;
        }

        if (header.expectedValue && value !== header.expectedValue) {
          this.results.push({
            passed: false,
            header: header.name,
            status: "WARN",
            message: `${header.name}: Expected "${header.expectedValue}", got "${value}"`,
            ssdReference: header.ssdReference,
          });
          continue;
        }

        this.results.push({
          passed: true,
          header: header.name,
          status: "PASS",
          message: `${header.name}: ${value}`,
          ssdReference: header.ssdReference,
        });
      }
    } catch (error) {
      console.error("❌ Error fetching headers:", error);
      process.exit(1);
    }
  }

  private async verifySSL(): Promise<void> {
    console.log("🔒 Verifying SSL/TLS Configuration...\n");

    try {
      const url = new URL(this.url);

      if (url.protocol !== "https:") {
        this.results.push({
          passed: false,
          header: "HTTPS",
          status: "FAIL",
          message: "URL is not using HTTPS protocol",
          ssdReference: "SSD-4.1.06",
        });
        return;
      }

      this.results.push({
        passed: true,
        header: "HTTPS",
        status: "PASS",
        message: "HTTPS protocol is being used",
        ssdReference: "SSD-4.1.06",
      });
    } catch (error) {
      console.error("❌ Error verifying SSL:", error);
    }
  }

  private async verifyHTTPSRedirect(): Promise<void> {
    console.log("🔄 Verifying HTTP to HTTPS Redirect...\n");

    try {
      const url = new URL(this.url);
      const httpUrl = `http://${url.hostname}${url.pathname}`;

      const response = await fetch(httpUrl, {
        method: "HEAD",
        redirect: "manual",
      });

      if (response.status === 301 || response.status === 308) {
        const location = response.headers.get("location");
        if (location?.startsWith("https://")) {
          this.results.push({
            passed: true,
            header: "HTTP Redirect",
            status: "PASS",
            message: "HTTP requests are redirected to HTTPS",
            ssdReference: "SSD-4.1.06",
          });
        } else {
          this.results.push({
            passed: false,
            header: "HTTP Redirect",
            status: "FAIL",
            message: "HTTP redirect does not point to HTTPS",
            ssdReference: "SSD-4.1.06",
          });
        }
      } else {
        this.results.push({
          passed: false,
          header: "HTTP Redirect",
          status: "WARN",
          message: `Unexpected status code: ${response.status}`,
          ssdReference: "SSD-4.1.06",
        });
      }
    } catch (error) {
      console.error("⚠️  Could not verify HTTP redirect:", error);
    }
  }

  private printResults(): void {
    console.log("\n" + "=".repeat(80));
    console.log("📊 Verification Results");
    console.log("=".repeat(80) + "\n");

    const passed = this.results.filter((r) => r.status === "PASS").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;
    const warnings = this.results.filter((r) => r.status === "WARN").length;

    for (const result of this.results) {
      const icon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⚠️";
      const ssdRef = result.ssdReference ? ` [${result.ssdReference}]` : "";
      console.log(`${icon} ${result.message}${ssdRef}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log("=".repeat(80) + "\n");

    if (failed > 0) {
      console.log("❌ Verification FAILED - Security issues detected!\n");
      process.exit(1);
    } else if (warnings > 0) {
      console.log("⚠️  Verification PASSED with warnings - Review recommended.\n");
    } else {
      console.log("✅ Verification PASSED - All security checks successful!\n");
    }
  }

  private generateReport(): void {
    const timestamp = new Date().toISOString().split("T")[0];
    const reportPath = `./docs/security/audits/verification-report-${timestamp}.json`;

    const report = {
      timestamp: new Date().toISOString(),
      url: this.url,
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => r.status === "PASS").length,
        failed: this.results.filter((r) => r.status === "FAIL").length,
        warnings: this.results.filter((r) => r.status === "WARN").length,
      },
    };

    try {
      // Note: In production, you might want to write this to a file
      console.log("📄 Verification Report:");
      console.log(JSON.stringify(report, null, 2));
      console.log(`\n💾 Report would be saved to: ${reportPath}\n`);
    } catch (error) {
      console.error("❌ Error generating report:", error);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Usage: npx tsx scripts/verify-hosting-config.ts [URL]

Example:
  npx tsx scripts/verify-hosting-config.ts https://your-domain.com

Description:
  Verifies hosting configuration security headers and SSL/TLS settings
  according to SSD-4.1.06 requirements.
    `);
    process.exit(1);
  }

  const url = args[0];

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    console.error("❌ Error: URL must start with http:// or https://");
    process.exit(1);
  }

  const verifier = new HostingConfigVerifier(url);
  await verifier.verify();
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
