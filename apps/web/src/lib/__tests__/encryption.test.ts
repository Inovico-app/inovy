import { describe, expect, it } from "vitest";
import {
  encrypt,
  decrypt,
  getCryptoConfig,
  verifyCryptoCompliance,
  generateEncryptionMetadata,
} from "../encryption";

/**
 * Encryption Module Tests
 *
 * Tests for NIST-compliant encryption implementation
 * Validates SSD-4.1.01 compliance requirements
 */

describe("encryption", () => {
  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt string data correctly", () => {
      const originalData = "sensitive patient information";
      const encrypted = encrypt(originalData);
      const decrypted = decrypt(encrypted);

      expect(decrypted.toString("utf8")).toBe(originalData);
    });

    it("should encrypt and decrypt buffer data correctly", () => {
      const originalData = Buffer.from("binary data", "utf8");
      const encrypted = encrypt(originalData);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toEqual(originalData);
    });

    it("should produce different ciphertext for same plaintext (unique IV)", () => {
      const data = "same data";
      const encrypted1 = encrypt(data);
      const encrypted2 = encrypt(data);

      expect(encrypted1).not.toBe(encrypted2);

      const decrypted1 = decrypt(encrypted1);
      const decrypted2 = decrypt(encrypted2);

      expect(decrypted1.toString("utf8")).toBe(data);
      expect(decrypted2.toString("utf8")).toBe(data);
    });

    it("should handle empty string encryption", () => {
      const encrypted = encrypt("");
      const decrypted = decrypt(encrypted);

      expect(decrypted.toString("utf8")).toBe("");
    });

    it("should handle large data encryption", () => {
      const largeData = "A".repeat(1000000); // 1MB of data
      const encrypted = encrypt(largeData);
      const decrypted = decrypt(encrypted);

      expect(decrypted.toString("utf8")).toBe(largeData);
    });

    it("should handle special characters and unicode", () => {
      const specialData = "🔒 Secure data with émojis and spëcial çhars! 你好";
      const encrypted = encrypt(specialData);
      const decrypted = decrypt(encrypted);

      expect(decrypted.toString("utf8")).toBe(specialData);
    });
  });

  describe("authentication and integrity", () => {
    it("should detect tampered ciphertext", () => {
      const originalData = "important data";
      const encrypted = encrypt(originalData);

      const buffer = Buffer.from(encrypted, "base64");
      buffer[buffer.length - 5] = buffer[buffer.length - 5]! ^ 0xff;
      const tamperedEncrypted = buffer.toString("base64");

      expect(() => decrypt(tamperedEncrypted)).toThrow();
    });

    it("should reject data that is too short", () => {
      const shortData = Buffer.alloc(10).toString("base64");

      expect(() => decrypt(shortData)).toThrow(
        /Invalid encrypted data: too short/
      );
    });

    it("should reject invalid base64 data", () => {
      expect(() => decrypt("not-valid-base64!!!")).toThrow();
    });
  });

  describe("NIST compliance validation", () => {
    it("should use NIST-approved algorithms", () => {
      const config = getCryptoConfig();

      expect(config.algorithm).toBe("aes-256-gcm");
      expect(config.kdf).toBe("PBKDF2");
      expect(config.hashFunction).toBe("SHA-256");
    });

    it("should meet NIST minimum key length (AES-256)", () => {
      const config = getCryptoConfig();

      expect(config.keyLength).toBeGreaterThanOrEqual(256);
      expect(config.keyLength).toBe(256);
    });

    it("should meet NIST minimum PBKDF2 iterations", () => {
      const config = getCryptoConfig();
      const NIST_MIN_ITERATIONS = 10000;

      expect(config.iterations).toBeGreaterThanOrEqual(NIST_MIN_ITERATIONS);
      expect(config.iterations).toBe(100000);
    });

    it("should meet NIST minimum salt length", () => {
      const config = getCryptoConfig();
      const NIST_MIN_SALT_BITS = 128;

      expect(config.saltLength).toBeGreaterThanOrEqual(NIST_MIN_SALT_BITS);
      expect(config.saltLength).toBe(512);
    });

    it("should use recommended IV length for AES-GCM", () => {
      const config = getCryptoConfig();
      const NIST_RECOMMENDED_IV_BITS = 128;

      expect(config.ivLength).toBe(NIST_RECOMMENDED_IV_BITS);
    });

    it("should use recommended authentication tag length", () => {
      const config = getCryptoConfig();
      const NIST_RECOMMENDED_TAG_BITS = 128;

      expect(config.tagLength).toBeGreaterThanOrEqual(
        NIST_RECOMMENDED_TAG_BITS
      );
      expect(config.tagLength).toBe(128);
    });

    it("should include all required NIST compliance references", () => {
      const config = getCryptoConfig();

      expect(config.nistCompliance).toContain("FIPS 197 (AES)");
      expect(config.nistCompliance).toContain("SP 800-38D (GCM)");
      expect(config.nistCompliance).toContain("SP 800-132 (PBKDF2)");
      expect(config.nistCompliance).toContain("FIPS 180-4 (SHA-256)");
    });

    it("should pass NIST compliance verification", () => {
      const compliance = verifyCryptoCompliance();

      expect(compliance.compliant).toBe(true);
      expect(compliance.warnings).toHaveLength(0);
    });

    it("should verify all cryptographic parameters meet NIST minimums", () => {
      const compliance = verifyCryptoCompliance();

      expect(compliance.details.aesKeyLength.compliant).toBe(true);
      expect(compliance.details.ivLength.compliant).toBe(true);
      expect(compliance.details.saltLength.compliant).toBe(true);
      expect(compliance.details.pbkdf2Iterations.compliant).toBe(true);
      expect(compliance.details.authTagLength.compliant).toBe(true);
    });
  });

  describe("encryption metadata", () => {
    it("should generate valid encryption metadata", () => {
      const metadata = generateEncryptionMetadata();

      expect(metadata.algorithm).toBe("aes-256-gcm");
      expect(metadata.encrypted).toBe(true);
      expect(metadata.encryptedAt).toBeDefined();

      const timestamp = new Date(metadata.encryptedAt);
      expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      expect(timestamp.getTime()).toBeGreaterThan(Date.now() - 5000);
    });
  });

  describe("output format validation", () => {
    it("should produce base64-encoded output", () => {
      const encrypted = encrypt("test data");

      expect(() => Buffer.from(encrypted, "base64")).not.toThrow();

      const buffer = Buffer.from(encrypted, "base64");
      const reEncoded = buffer.toString("base64");
      expect(reEncoded).toBe(encrypted);
    });

    it("should include salt, IV, ciphertext, and auth tag", () => {
      const data = "test";
      const encrypted = encrypt(data);
      const buffer = Buffer.from(encrypted, "base64");

      const config = getCryptoConfig();
      const SALT_BYTES = config.saltLength / 8;
      const IV_BYTES = config.ivLength / 8;
      const TAG_BYTES = config.tagLength / 8;

      const minLength = SALT_BYTES + IV_BYTES + TAG_BYTES;
      expect(buffer.length).toBeGreaterThanOrEqual(minLength);
    });
  });

  describe("SSD-4.1.01 acceptance criteria", () => {
    it("should use industry-standard encryption (AES-256-GCM)", () => {
      const config = getCryptoConfig();
      expect(config.algorithm).toBe("aes-256-gcm");
    });

    it("should follow NIST cryptographic guidelines", () => {
      const compliance = verifyCryptoCompliance();
      expect(compliance.compliant).toBe(true);
    });

    it("should not use deprecated algorithms", () => {
      const config = getCryptoConfig();

      const deprecatedAlgorithms = [
        "des",
        "3des",
        "rc4",
        "md5",
        "sha1",
        "aes-128-ecb",
        "aes-256-ecb",
      ];

      const algorithmLower = config.algorithm.toLowerCase();
      const kdfLower = config.kdf.toLowerCase();
      const hashLower = config.hashFunction.toLowerCase();

      deprecatedAlgorithms.forEach((deprecated) => {
        expect(algorithmLower).not.toContain(deprecated);
        expect(kdfLower).not.toContain(deprecated);
        expect(hashLower).not.toContain(deprecated);
      });
    });

    it("should use approved hash functions (SHA-256, not MD5 or SHA-1)", () => {
      const config = getCryptoConfig();
      expect(config.hashFunction).toBe("SHA-256");
      expect(config.hashFunction).not.toContain("MD5");
      expect(config.hashFunction).not.toContain("SHA-1");
    });

    it("should provide authenticated encryption (AEAD)", () => {
      const config = getCryptoConfig();

      expect(config.algorithm.includes("gcm")).toBe(true);
      expect(config.tagLength).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should throw descriptive error for invalid decryption", () => {
      const encrypted = encrypt("test");
      const buffer = Buffer.from(encrypted, "base64");
      buffer[buffer.length - 1] = 0;
      const corrupted = buffer.toString("base64");

      expect(() => decrypt(corrupted)).toThrow(/Decryption failed/);
    });

    it("should handle missing master key gracefully", () => {
      const originalKey = process.env.ENCRYPTION_MASTER_KEY;

      delete process.env.ENCRYPTION_MASTER_KEY;

      expect(() => encrypt("test")).toThrow(
        /ENCRYPTION_MASTER_KEY environment variable is not set/
      );

      process.env.ENCRYPTION_MASTER_KEY = originalKey;
    });
  });
});
