import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  secureFetch,
  isSecureUrl,
  validateSecureConnection,
  isTlsSupported,
  getTlsInfo,
  isTlsError,
  TLS_CONFIG,
} from "../secure-http-client";

/**
 * Secure HTTP Client Tests
 *
 * Tests for TLS 1.2+ enforcement and secure connection validation
 * Validates SSD-4.1.01 compliance requirements
 */

describe("secure-http-client", () => {
  describe("TLS configuration constants", () => {
    it("should enforce TLS 1.2 minimum", () => {
      expect(TLS_CONFIG.MIN_VERSION).toBe("TLSv1.2");
    });

    it("should support TLS 1.3 maximum", () => {
      expect(TLS_CONFIG.MAX_VERSION).toBe("TLSv1.3");
    });

    it("should have reasonable default timeout", () => {
      expect(TLS_CONFIG.DEFAULT_TIMEOUT).toBe(30000);
      expect(TLS_CONFIG.DEFAULT_TIMEOUT).toBeGreaterThan(5000);
    });
  });

  describe("isSecureUrl", () => {
    it("should return true for HTTPS URLs", () => {
      expect(isSecureUrl("https://example.com")).toBe(true);
      expect(isSecureUrl("https://api.example.com/path")).toBe(true);
      expect(isSecureUrl("https://localhost:3000")).toBe(true);
    });

    it("should return false for HTTP URLs", () => {
      expect(isSecureUrl("http://example.com")).toBe(false);
      expect(isSecureUrl("http://api.example.com/path")).toBe(false);
      expect(isSecureUrl("http://localhost:3000")).toBe(false);
    });

    it("should return false for other protocols", () => {
      expect(isSecureUrl("ftp://example.com")).toBe(false);
      expect(isSecureUrl("ws://example.com")).toBe(false);
      expect(isSecureUrl("file:///path/to/file")).toBe(false);
    });

    it("should return false for invalid URLs", () => {
      expect(isSecureUrl("not-a-url")).toBe(false);
      expect(isSecureUrl("")).toBe(false);
      expect(isSecureUrl("javascript:alert(1)")).toBe(false);
    });
  });

  describe("validateSecureConnection", () => {
    it("should accept valid HTTPS URLs", () => {
      expect(() =>
        validateSecureConnection("https://api.example.com", "Test API")
      ).not.toThrow();
    });

    it("should reject HTTP URLs", () => {
      expect(() =>
        validateSecureConnection("http://api.example.com", "Test API")
      ).toThrow(/must use HTTPS protocol/);
    });

    it("should reject invalid URL format", () => {
      expect(() =>
        validateSecureConnection("not-a-valid-url", "Test API")
      ).toThrow(/Invalid URL format/);
    });

    it("should reject localhost in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      expect(() =>
        validateSecureConnection("https://localhost:3000", "Test API")
      ).toThrow(/cannot use localhost URLs in production/);

      expect(() =>
        validateSecureConnection("https://127.0.0.1:3000", "Test API")
      ).toThrow(/cannot use localhost URLs in production/);

      process.env.NODE_ENV = originalEnv;
    });

    it("should allow localhost in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      expect(() =>
        validateSecureConnection("https://localhost:3000", "Test API")
      ).not.toThrow();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("isTlsSupported", () => {
    it("should return true for Node.js v12+", () => {
      const supported = isTlsSupported();
      expect(supported).toBe(true);
    });

    it("should verify current Node version supports TLS 1.2+", () => {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0] ?? "0");

      expect(majorVersion).toBeGreaterThanOrEqual(12);
    });
  });

  describe("getTlsInfo", () => {
    it("should return complete TLS configuration info", () => {
      const info = getTlsInfo();

      expect(info).toHaveProperty("minVersion");
      expect(info).toHaveProperty("maxVersion");
      expect(info).toHaveProperty("nodeVersion");
      expect(info).toHaveProperty("supported");
    });

    it("should match TLS configuration constants", () => {
      const info = getTlsInfo();

      expect(info.minVersion).toBe(TLS_CONFIG.MIN_VERSION);
      expect(info.maxVersion).toBe(TLS_CONFIG.MAX_VERSION);
    });

    it("should include current Node version", () => {
      const info = getTlsInfo();

      expect(info.nodeVersion).toBe(process.version);
      expect(info.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
    });

    it("should indicate TLS support status", () => {
      const info = getTlsInfo();

      expect(typeof info.supported).toBe("boolean");
      expect(info.supported).toBe(true);
    });
  });

  describe("isTlsError", () => {
    it("should detect certificate errors", () => {
      const certError = new Error("CERT_HAS_EXPIRED");
      expect(isTlsError(certError)).toBe(true);
    });

    it("should detect SSL/TLS errors", () => {
      const sslError = new Error("SSL_ERROR_NO_CYPHER_OVERLAP");
      const tlsError = new Error("TLS_HANDSHAKE_FAILED");

      expect(isTlsError(sslError)).toBe(true);
      expect(isTlsError(tlsError)).toBe(true);
    });

    it("should detect certificate-related errors", () => {
      const certError = new Error("certificate verification failed");
      expect(isTlsError(certError)).toBe(true);
    });

    it("should detect handshake errors", () => {
      const handshakeError = new Error("SSL handshake failed");
      expect(isTlsError(handshakeError)).toBe(true);
    });

    it("should detect protocol version errors", () => {
      const versionError = new Error("unsupported protocol version");
      expect(isTlsError(versionError)).toBe(true);
    });

    it("should return false for non-TLS errors", () => {
      const networkError = new Error("Network timeout");
      const notFoundError = new Error("404 Not Found");

      expect(isTlsError(networkError)).toBe(false);
      expect(isTlsError(notFoundError)).toBe(false);
    });

    it("should return false for non-Error objects", () => {
      expect(isTlsError("string error")).toBe(false);
      expect(isTlsError(null)).toBe(false);
      expect(isTlsError(undefined)).toBe(false);
      expect(isTlsError({ message: "error" })).toBe(false);
    });
  });

  describe("SSD-4.1.01 acceptance criteria", () => {
    it("should enforce TLS 1.2+ minimum version", () => {
      const tlsInfo = getTlsInfo();
      expect(tlsInfo.minVersion).toBe("TLSv1.2");
    });

    it("should support TLS 1.3", () => {
      const tlsInfo = getTlsInfo();
      expect(tlsInfo.maxVersion).toBe("TLSv1.3");
    });

    it("should not allow deprecated SSL/TLS versions", () => {
      const tlsInfo = getTlsInfo();

      const deprecatedVersions = ["SSLv2", "SSLv3", "TLSv1", "TLSv1.1"];
      deprecatedVersions.forEach((version) => {
        expect(tlsInfo.minVersion).not.toBe(version);
      });
    });

    it("should reject non-HTTPS connections", () => {
      expect(() =>
        validateSecureConnection("http://example.com", "API")
      ).toThrow();
    });

    it("should verify Node.js supports TLS 1.2+", () => {
      expect(isTlsSupported()).toBe(true);
    });
  });

  describe("compliance verification", () => {
    it("should meet NIST SP 800-52 Rev. 2 requirements", () => {
      const tlsInfo = getTlsInfo();

      expect(tlsInfo.minVersion).toBe("TLSv1.2");
      expect(["TLSv1.2", "TLSv1.3"]).toContain(tlsInfo.maxVersion);
    });

    it("should enforce HTTPS for all external connections", () => {
      const externalServices = [
        "https://api.example.com",
        "https://recall.ai",
        "https://www.googleapis.com",
      ];

      externalServices.forEach((url) => {
        expect(() => validateSecureConnection(url, "Service")).not.toThrow();
      });
    });

    it("should reject insecure protocols", () => {
      const insecureUrls = [
        "http://api.example.com",
        "ftp://files.example.com",
        "ws://socket.example.com",
      ];

      insecureUrls.forEach((url) => {
        expect(isSecureUrl(url)).toBe(false);
      });
    });
  });
});
