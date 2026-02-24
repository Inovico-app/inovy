#!/usr/bin/env tsx

import { validateHttpsConfiguration } from "../apps/web/src/lib/security";

console.log("Certificate Validation Configuration Check");
console.log("==========================================\n");

try {
  const config = validateHttpsConfiguration();

  console.log("Configuration Details:");
  console.log(`  Certificate Validation: ${config.rejectUnauthorized ? "✅ ENABLED" : "❌ DISABLED"}`);
  console.log(`  TLS Version Range: ${config.tlsVersion}`);
  console.log(`  CA Certificate Count: ${config.caCount}`);
  console.log(`  Custom CA Certificates: ${config.hasCustomCa ? "Yes" : "No"}`);

  console.log("\nEnvironment Variables:");
  console.log(
    `  CA_CERTIFICATE_PATH: ${process.env.CA_CERTIFICATE_PATH || "(not set)"}`
  );
  console.log(
    `  CA_CERTIFICATE: ${process.env.CA_CERTIFICATE ? "(set)" : "(not set)"}`
  );
  console.log(
    `  NODE_TLS_REJECT_UNAUTHORIZED: ${process.env.NODE_TLS_REJECT_UNAUTHORIZED || "(not set)"}`
  );

  console.log("\nSecurity Checks:");

  if (!config.rejectUnauthorized) {
    console.error("  ❌ CRITICAL: Certificate validation is DISABLED!");
    console.error(
      "     This is a SECURITY VULNERABILITY. Certificate validation must be enabled."
    );
    process.exit(1);
  } else {
    console.log("  ✅ Certificate validation is enabled");
  }

  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    console.error(
      "  ❌ CRITICAL: NODE_TLS_REJECT_UNAUTHORIZED is set to 0!"
    );
    console.error(
      "     This disables certificate validation globally and must be removed."
    );
    process.exit(1);
  } else {
    console.log("  ✅ NODE_TLS_REJECT_UNAUTHORIZED is not disabled");
  }

  if (!config.tlsVersion.includes("TLSv1.2")) {
    console.error("  ⚠️  WARNING: TLS 1.2 might not be enabled");
  } else {
    console.log("  ✅ TLS 1.2+ is enabled");
  }

  if (config.caCount < 100) {
    console.warn(
      "  ⚠️  WARNING: Low CA certificate count. Expected 100+, found:",
      config.caCount
    );
  } else {
    console.log(`  ✅ Sufficient CA certificates loaded (${config.caCount})`);
  }

  console.log("\n==========================================");
  console.log("✅ All certificate validation checks PASSED");
  console.log("==========================================\n");

  process.exit(0);
} catch (error) {
  console.error("\n❌ ERROR: Failed to validate certificate configuration");
  console.error(error);
  process.exit(1);
}
