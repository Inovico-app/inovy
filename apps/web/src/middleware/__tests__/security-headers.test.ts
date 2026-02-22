import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import {
  SECURITY_HEADERS,
  applySecurityHeaders,
  getSecurityHeaders,
  validateSecurityHeaders,
  getCspForEnvironment,
} from "../security-headers";

/**
 * Security Headers Tests
 *
 * Tests for HTTP security headers implementation
 * Validates SSD-24, SSD-33, and SSD-4.1.01 compliance
 */

describe("security-headers", () => {
  describe("SECURITY_HEADERS constants", () => {
    it("should include HSTS header with appropriate settings", () => {
      const hsts = SECURITY_HEADERS["Strict-Transport-Security"];

      expect(hsts).toContain("max-age=31536000");
      expect(hsts).toContain("includeSubDomains");
      expect(hsts).toContain("preload");
    });

    it("should include X-Content-Type-Options with nosniff", () => {
      expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    });

    it("should include X-Frame-Options to prevent clickjacking", () => {
      const xfo = SECURITY_HEADERS["X-Frame-Options"];

      expect(xfo).toBe("DENY");
    });

    it("should include Content-Security-Policy", () => {
      const csp = SECURITY_HEADERS["Content-Security-Policy"];

      expect(csp).toBeDefined();
      expect(csp).toContain("default-src");
      expect(csp).toContain("script-src");
      expect(csp).toContain("style-src");
    });

    it("should include Referrer-Policy", () => {
      expect(SECURITY_HEADERS["Referrer-Policy"]).toBe(
        "strict-origin-when-cross-origin"
      );
    });

    it("should include Permissions-Policy", () => {
      const permPolicy = SECURITY_HEADERS["Permissions-Policy"];

      expect(permPolicy).toContain("geolocation=()");
      expect(permPolicy).toContain("camera=()");
      expect(permPolicy).toContain("payment=()");
    });

    it("should include CORS headers", () => {
      expect(SECURITY_HEADERS["Cross-Origin-Embedder-Policy"]).toBe(
        "require-corp"
      );
      expect(SECURITY_HEADERS["Cross-Origin-Opener-Policy"]).toBe(
        "same-origin"
      );
      expect(SECURITY_HEADERS["Cross-Origin-Resource-Policy"]).toBe(
        "same-origin"
      );
    });
  });

  describe("applySecurityHeaders", () => {
    it("should apply all security headers to response", () => {
      const response = NextResponse.next();
      const securedResponse = applySecurityHeaders(response);

      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        expect(securedResponse.headers.get(key)).toBe(value);
      });
    });

    it("should not remove existing headers", () => {
      const response = NextResponse.next();
      response.headers.set("X-Custom-Header", "custom-value");

      const securedResponse = applySecurityHeaders(response);

      expect(securedResponse.headers.get("X-Custom-Header")).toBe(
        "custom-value"
      );
      expect(securedResponse.headers.get("Strict-Transport-Security")).toBe(
        SECURITY_HEADERS["Strict-Transport-Security"]
      );
    });
  });

  describe("getSecurityHeaders", () => {
    it("should return all security headers as object", () => {
      const headers = getSecurityHeaders();

      expect(headers).toHaveProperty("Strict-Transport-Security");
      expect(headers).toHaveProperty("X-Content-Type-Options");
      expect(headers).toHaveProperty("X-Frame-Options");
      expect(headers).toHaveProperty("Content-Security-Policy");
    });

    it("should match SECURITY_HEADERS constants", () => {
      const headers = getSecurityHeaders();

      Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
        expect(headers[key]).toBe(value);
      });
    });
  });

  describe("validateSecurityHeaders", () => {
    it("should validate all required headers are present", () => {
      const headers = getSecurityHeaders();
      const validation = validateSecurityHeaders(headers);

      expect(validation.valid).toBe(true);
      expect(validation.missing).toHaveLength(0);
      expect(validation.present.length).toBeGreaterThan(0);
    });

    it("should detect missing required headers", () => {
      const headers = {
        "X-Content-Type-Options": "nosniff",
      };

      const validation = validateSecurityHeaders(headers);

      expect(validation.valid).toBe(false);
      expect(validation.missing).toContain("Strict-Transport-Security");
      expect(validation.missing).toContain("Content-Security-Policy");
    });

    it("should handle Headers object", () => {
      const headers = new Headers();
      headers.set("Strict-Transport-Security", "max-age=31536000");
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("X-Frame-Options", "DENY");
      headers.set("Content-Security-Policy", "default-src 'self'");

      const validation = validateSecurityHeaders(headers);

      expect(validation.valid).toBe(true);
      expect(validation.missing).toHaveLength(0);
    });

    it("should be case-insensitive for header names", () => {
      const headers = {
        "strict-transport-security": "max-age=31536000",
        "x-content-type-options": "nosniff",
        "x-frame-options": "DENY",
        "content-security-policy": "default-src 'self'",
      };

      const validation = validateSecurityHeaders(headers);

      expect(validation.valid).toBe(true);
    });
  });

  describe("getCspForEnvironment", () => {
    it("should return production CSP by default", () => {
      const csp = getCspForEnvironment("production");

      expect(csp).toBe(SECURITY_HEADERS["Content-Security-Policy"]);
      expect(csp).toContain("default-src 'self'");
    });

    it("should return more permissive CSP for development", () => {
      const devCsp = getCspForEnvironment("development");

      expect(devCsp).toContain("ws:");
      expect(devCsp).toContain("wss:");
      expect(devCsp).toContain("'unsafe-eval'");
    });

    it("should include upgrade-insecure-requests in production", () => {
      const prodCsp = getCspForEnvironment("production");

      expect(prodCsp).toContain("upgrade-insecure-requests");
    });
  });

  describe("SSD-24 compliance (HTTP Security Headers)", () => {
    it("should include X-Content-Type-Options (SSD-24.1.02)", () => {
      expect(SECURITY_HEADERS["X-Content-Type-Options"]).toBe("nosniff");
    });

    it("should include X-Frame-Options (SSD-24.1.03)", () => {
      const xfo = SECURITY_HEADERS["X-Frame-Options"];
      expect(xfo === "DENY" || xfo === "SAMEORIGIN").toBe(true);
    });

    it("should include Content-Security-Policy (SSD-24.1.04)", () => {
      const csp = SECURITY_HEADERS["Content-Security-Policy"];
      expect(csp).toBeDefined();
      expect(csp.length).toBeGreaterThan(0);
    });

    it("should include Strict-Transport-Security (SSD-24.1.05)", () => {
      const hsts = SECURITY_HEADERS["Strict-Transport-Security"];
      expect(hsts).toContain("max-age=");
      expect(parseInt(hsts.match(/max-age=(\d+)/)?.[1] ?? "0")).toBeGreaterThan(
        0
      );
    });
  });

  describe("SSD-33 compliance (Secure HTTP Response Headers)", () => {
    it("should configure comprehensive security headers (SSD-33.1.01)", () => {
      const headers = getSecurityHeaders();
      const headerCount = Object.keys(headers).length;

      expect(headerCount).toBeGreaterThanOrEqual(8);
    });

    it("should include all recommended OWASP headers", () => {
      const headers = getSecurityHeaders();

      const recommendedHeaders = [
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Content-Security-Policy",
        "Referrer-Policy",
        "Permissions-Policy",
      ];

      recommendedHeaders.forEach((header) => {
        expect(headers).toHaveProperty(header);
      });
    });
  });

  describe("SSD-4.1.01 compliance (Secure Protocols)", () => {
    it("should enforce HTTPS via HSTS", () => {
      const hsts = SECURITY_HEADERS["Strict-Transport-Security"];

      expect(hsts).toContain("max-age=");
      const maxAge = parseInt(hsts.match(/max-age=(\d+)/)?.[1] ?? "0");
      expect(maxAge).toBeGreaterThanOrEqual(31536000);
    });

    it("should include includeSubDomains in HSTS", () => {
      const hsts = SECURITY_HEADERS["Strict-Transport-Security"];
      expect(hsts).toContain("includeSubDomains");
    });

    it("should upgrade insecure requests via CSP", () => {
      const csp = SECURITY_HEADERS["Content-Security-Policy"];
      expect(csp).toContain("upgrade-insecure-requests");
    });
  });

  describe("CSP policy validation", () => {
    it("should include default-src directive", () => {
      const csp = SECURITY_HEADERS["Content-Security-Policy"];
      expect(csp).toContain("default-src");
    });

    it("should restrict script sources", () => {
      const csp = SECURITY_HEADERS["Content-Security-Policy"];
      expect(csp).toContain("script-src");
    });

    it("should restrict style sources", () => {
      const csp = SECURITY_HEADERS["Content-Security-Policy"];
      expect(csp).toContain("style-src");
    });

    it("should prevent framing via frame-ancestors", () => {
      const csp = SECURITY_HEADERS["Content-Security-Policy"];
      expect(csp).toContain("frame-ancestors 'none'");
    });

    it("should restrict base-uri", () => {
      const csp = SECURITY_HEADERS["Content-Security-Policy"];
      expect(csp).toContain("base-uri 'self'");
    });

    it("should restrict form-action", () => {
      const csp = SECURITY_HEADERS["Content-Security-Policy"];
      expect(csp).toContain("form-action");
    });
  });

  describe("HSTS configuration", () => {
    it("should use at least 1 year max-age", () => {
      const hsts = SECURITY_HEADERS["Strict-Transport-Security"];
      const maxAge = parseInt(hsts.match(/max-age=(\d+)/)?.[1] ?? "0");

      const oneYearInSeconds = 31536000;
      expect(maxAge).toBeGreaterThanOrEqual(oneYearInSeconds);
    });

    it("should be eligible for preload", () => {
      const hsts = SECURITY_HEADERS["Strict-Transport-Security"];

      expect(hsts).toContain("preload");
      expect(hsts).toContain("includeSubDomains");

      const maxAge = parseInt(hsts.match(/max-age=(\d+)/)?.[1] ?? "0");
      expect(maxAge).toBeGreaterThanOrEqual(31536000);
    });
  });

  describe("Permissions-Policy configuration", () => {
    it("should disable geolocation by default", () => {
      const policy = SECURITY_HEADERS["Permissions-Policy"];
      expect(policy).toContain("geolocation=()");
    });

    it("should disable camera by default", () => {
      const policy = SECURITY_HEADERS["Permissions-Policy"];
      expect(policy).toContain("camera=()");
    });

    it("should disable payment APIs", () => {
      const policy = SECURITY_HEADERS["Permissions-Policy"];
      expect(policy).toContain("payment=()");
    });

    it("should disable USB access", () => {
      const policy = SECURITY_HEADERS["Permissions-Policy"];
      expect(policy).toContain("usb=()");
    });
  });
});
