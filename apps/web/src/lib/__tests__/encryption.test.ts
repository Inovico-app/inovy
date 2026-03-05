/**
 * Encryption Tests
 * Tests for AES-256-GCM encryption implementation
 * Run with: npx tsx --env-file=.env.local src/lib/__tests__/encryption.test.ts
 */

import crypto from "crypto";
import { encrypt, decrypt, encryptFile, decryptFile, generateEncryptionMetadata } from "../encryption";

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function runTest(name: string, testFn: () => void | Promise<void>): void {
  const test = async () => {
    try {
      await testFn();
      results.push({ name, passed: true });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.push({
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`✗ ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  void test();
}

// Setup: Ensure encryption key is set
if (!process.env.ENCRYPTION_MASTER_KEY) {
  console.error("❌ ENCRYPTION_MASTER_KEY environment variable is not set");
  console.error("Set it with: export ENCRYPTION_MASTER_KEY=$(openssl rand -hex 32)");
  process.exit(1);
}

console.log("🔐 Running AES-256-GCM Encryption Tests\n");

// Test 1: Basic encryption and decryption
runTest("Basic string encryption and decryption", () => {
  const plaintext = "Hello, World!";
  const encrypted = encrypt(plaintext);
  const decrypted = decrypt(encrypted);

  assert(encrypted !== plaintext, "Encrypted data should differ from plaintext");
  assert(decrypted.toString("utf8") === plaintext, "Decrypted data should match plaintext");
});

// Test 2: Buffer encryption
runTest("Buffer encryption and decryption", () => {
  const buffer = Buffer.from("Binary data test", "utf8");
  const encrypted = encrypt(buffer);
  const decrypted = decrypt(encrypted);

  assert(Buffer.compare(buffer, decrypted) === 0, "Decrypted buffer should match original");
});

// Test 3: Large data encryption (simulate file)
runTest("Large data encryption (1MB)", () => {
  const largeData = Buffer.alloc(1024 * 1024); // 1MB
  crypto.randomFillSync(largeData);

  const encrypted = encrypt(largeData);
  const decrypted = decrypt(encrypted);

  assert(Buffer.compare(largeData, decrypted) === 0, "Large data should decrypt correctly");
});

// Test 4: File encryption
runTest("File encryption and decryption", async () => {
  const fileContent = Buffer.from("Test file content");
  const encryptedBuffer = await encryptFile(fileContent);
  const decrypted = await decryptFile(encryptedBuffer.toString("base64"));

  assert(Buffer.compare(fileContent, decrypted) === 0, "File should decrypt correctly");
});

// Test 5: Authentication tag verification
runTest("Authentication tag prevents tampering", () => {
  const plaintext = "Secure data";
  const encrypted = encrypt(plaintext);

  // Tamper with encrypted data
  const tamperedData = encrypted.slice(0, -10) + "tampered!!";

  let decryptionFailed = false;
  try {
    decrypt(tamperedData);
  } catch (error) {
    decryptionFailed = true;
    assert(
      error instanceof Error && error.message.includes("tampered"),
      "Error should indicate tampering"
    );
  }

  assert(decryptionFailed, "Decryption should fail for tampered data");
});

// Test 6: Unique encryption for same plaintext
runTest("Same plaintext produces different ciphertext (unique IV/salt)", () => {
  const plaintext = "Same content";
  const encrypted1 = encrypt(plaintext);
  const encrypted2 = encrypt(plaintext);

  assert(encrypted1 !== encrypted2, "Same plaintext should produce different ciphertext");

  const decrypted1 = decrypt(encrypted1);
  const decrypted2 = decrypt(encrypted2);

  assert(decrypted1.toString("utf8") === plaintext, "First encryption should decrypt correctly");
  assert(decrypted2.toString("utf8") === plaintext, "Second encryption should decrypt correctly");
});

// Test 7: Empty data handling
runTest("Empty data encryption", () => {
  const empty = "";
  const encrypted = encrypt(empty);
  const decrypted = decrypt(encrypted);

  assert(decrypted.toString("utf8") === empty, "Empty data should decrypt correctly");
});

// Test 8: Unicode/UTF-8 data
runTest("Unicode/UTF-8 string encryption", () => {
  const unicode = "Hello 世界 🌍 Café";
  const encrypted = encrypt(unicode);
  const decrypted = decrypt(encrypted);

  assert(decrypted.toString("utf8") === unicode, "Unicode data should decrypt correctly");
});

// Test 9: Invalid encrypted data handling
runTest("Invalid encrypted data throws error", () => {
  let errorThrown = false;
  try {
    decrypt("invalid-base64-data");
  } catch (error) {
    errorThrown = true;
    assert(error instanceof Error, "Should throw an Error");
  }

  assert(errorThrown, "Invalid data should throw error");
});

// Test 10: Encryption metadata generation
runTest("Encryption metadata generation", () => {
  const metadata = generateEncryptionMetadata();

  assert(metadata.algorithm === "aes-256-gcm", "Algorithm should be aes-256-gcm");
  assert(metadata.encrypted === true, "Encrypted flag should be true");
  assert(typeof metadata.encryptedAt === "string", "encryptedAt should be a string");
  assert(!isNaN(Date.parse(metadata.encryptedAt)), "encryptedAt should be valid ISO date");
});

// Test 11: Encryption format validation
runTest("Encrypted data format (salt + iv + data + tag)", () => {
  const plaintext = "Test data";
  const encrypted = encrypt(plaintext);

  // Base64 decode to get raw bytes
  const rawBytes = Buffer.from(encrypted, "base64");

  // Expected: 64 bytes salt + 16 bytes IV + data + 16 bytes tag
  const minLength = 64 + 16 + 16; // salt + iv + tag (minimum with 0 bytes data)

  assert(rawBytes.length >= minLength, `Encrypted data should be at least ${minLength} bytes`);
});

// Test 12: Key derivation consistency
runTest("Key derivation produces consistent results", () => {
  const plaintext = "Consistency test";
  const encrypted1 = encrypt(plaintext);
  const encrypted2 = encrypt(plaintext);

  // Both should decrypt successfully (even though ciphertext differs)
  const decrypted1 = decrypt(encrypted1);
  const decrypted2 = decrypt(encrypted2);

  assert(decrypted1.toString("utf8") === plaintext, "First decryption should work");
  assert(decrypted2.toString("utf8") === plaintext, "Second decryption should work");
});

// Wait for all tests to complete
setTimeout(() => {
  console.log("\n" + "=".repeat(60));
  console.log("Test Results Summary");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log("\nFailed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log("\n✅ All encryption tests passed!");
    process.exit(0);
  }
}, 1000);
