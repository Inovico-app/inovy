import { describe, expect, it } from "vitest";
import {
  sanitizeString,
  sanitizeUrl,
  sanitizeObject,
  sanitizeErrorMessage,
  isolateExternalData,
  validateExternalApiResponse,
} from "@/lib/external-api-validation";
import { z } from "zod";

describe("External API Validation", () => {
  describe("sanitizeString", () => {
    it("should remove XSS vectors", () => {
      expect(sanitizeString("<script>alert('xss')</script>")).toBe(
        "scriptalert('xss')/script"
      );
      expect(sanitizeString("<img src=x onerror=alert(1)>")).toBe(
        "img src=x alert(1)"
      );
    });

    it("should remove javascript: protocol", () => {
      expect(sanitizeString("javascript:alert(1)")).toBe("alert(1)");
      expect(sanitizeString("JAVASCRIPT:alert(1)")).toBe("alert(1)");
    });

    it("should remove inline event handlers", () => {
      expect(sanitizeString("onclick=alert(1)")).toBe("alert(1)");
      expect(sanitizeString("onload=evil()")).toBe("evil()");
    });

    it("should handle non-string inputs", () => {
      expect(sanitizeString(123)).toBe("");
      expect(sanitizeString(null)).toBe("");
      expect(sanitizeString(undefined)).toBe("");
      expect(sanitizeString({})).toBe("");
    });

    it("should trim whitespace", () => {
      expect(sanitizeString("  test  ")).toBe("test");
    });
  });

  describe("sanitizeUrl", () => {
    it("should accept valid HTTPS URLs", () => {
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com/");
      expect(sanitizeUrl("https://api.example.com/path")).toBe(
        "https://api.example.com/path"
      );
    });

    it("should accept valid HTTP URLs", () => {
      expect(sanitizeUrl("http://localhost:3000")).toBe(
        "http://localhost:3000/"
      );
    });

    it("should reject javascript: URLs", () => {
      expect(sanitizeUrl("javascript:alert(1)")).toBeNull();
    });

    it("should reject data: URLs", () => {
      expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    });

    it("should reject invalid URLs", () => {
      expect(sanitizeUrl("not a url")).toBeNull();
      expect(sanitizeUrl("")).toBeNull();
    });

    it("should handle non-string inputs", () => {
      expect(sanitizeUrl(123)).toBeNull();
      expect(sanitizeUrl(null)).toBeNull();
      expect(sanitizeUrl(undefined)).toBeNull();
    });
  });

  describe("sanitizeObject", () => {
    it("should sanitize string values", () => {
      const input = { key: "<script>alert(1)</script>" };
      const result = sanitizeObject(input);
      expect(result.key).toBe("scriptalert(1)/script");
    });

    it("should preserve numbers and booleans", () => {
      const input = { num: 42, bool: true };
      const result = sanitizeObject(input);
      expect(result.num).toBe(42);
      expect(result.bool).toBe(true);
    });

    it("should recursively sanitize nested objects", () => {
      const input = {
        outer: {
          inner: "<script>alert(1)</script>",
        },
      };
      const result = sanitizeObject(input);
      expect(result.outer).toEqual({ inner: "scriptalert(1)/script" });
    });

    it("should sanitize keys", () => {
      const input = { "<script>": "value" };
      const result = sanitizeObject(input);
      expect(result.script).toBe("value");
    });

    it("should handle non-object inputs", () => {
      expect(sanitizeObject(null)).toEqual({});
      expect(sanitizeObject(undefined)).toEqual({});
      expect(sanitizeObject(123)).toEqual({});
      expect(sanitizeObject("string")).toEqual({});
    });

    it("should ignore arrays", () => {
      const input = { arr: [1, 2, 3] };
      const result = sanitizeObject(input);
      expect(result.arr).toBeUndefined();
    });
  });

  describe("sanitizeErrorMessage", () => {
    it("should sanitize Error objects", () => {
      const error = new Error("<script>alert(1)</script>");
      expect(sanitizeErrorMessage(error)).toBe("scriptalert(1)/script");
    });

    it("should sanitize string errors", () => {
      expect(sanitizeErrorMessage("<script>alert(1)</script>")).toBe(
        "scriptalert(1)/script"
      );
    });

    it("should sanitize error objects with message", () => {
      const error = {
        error: { message: "<script>alert(1)</script>" },
      };
      expect(sanitizeErrorMessage(error)).toBe("scriptalert(1)/script");
    });

    it("should return default for unknown errors", () => {
      expect(sanitizeErrorMessage(null)).toBe("Unknown error");
      expect(sanitizeErrorMessage(undefined)).toBe("Unknown error");
      expect(sanitizeErrorMessage(123)).toBe("Unknown error");
    });
  });

  describe("isolateExternalData", () => {
    it("should extract only allowed fields", () => {
      const data = {
        id: 1,
        name: "test",
        secret: "should not be extracted",
      };
      const result = isolateExternalData(data, ["id", "name"] as const);
      expect(result).toEqual({ id: 1, name: "test" });
      expect(result.secret).toBeUndefined();
    });

    it("should handle missing fields", () => {
      const data = { id: 1 };
      const result = isolateExternalData(data, ["id", "name"] as const);
      expect(result).toEqual({ id: 1 });
    });
  });

  describe("validateExternalApiResponse", () => {
    const schema = z.object({
      id: z.number(),
      name: z.string(),
    });

    it("should validate and sanitize valid responses", () => {
      const response = { id: 1, name: "test" };
      const result = validateExternalApiResponse(response, schema, "TestAPI");
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, name: "test" });
    });

    it("should reject invalid responses", () => {
      const response = { id: "not a number", name: "test" };
      const result = validateExternalApiResponse(response, schema, "TestAPI");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("should sanitize XSS in responses", () => {
      const response = { id: 1, name: "<script>alert(1)</script>" };
      const result = validateExternalApiResponse(response, schema, "TestAPI");
      expect(result.success).toBe(true);
      expect(result.data?.name).toBe("scriptalert(1)/script");
    });
  });
});
