import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

describe("Security Headers", () => {
  it("should have headers function defined", () => {
    expect(nextConfig.headers).toBeDefined();
    expect(typeof nextConfig.headers).toBe("function");
  });

  it("should include X-Frame-Options header", async () => {
    const headers = await nextConfig.headers!();
    const allHeaders = headers[0]?.headers || [];
    const xFrameOptions = allHeaders.find((h) => h.key === "X-Frame-Options");
    expect(xFrameOptions).toBeDefined();
    expect(xFrameOptions?.value).toBe("DENY");
  });

  it("should include X-Content-Type-Options header", async () => {
    const headers = await nextConfig.headers!();
    const allHeaders = headers[0]?.headers || [];
    const xContentType = allHeaders.find(
      (h) => h.key === "X-Content-Type-Options"
    );
    expect(xContentType).toBeDefined();
    expect(xContentType?.value).toBe("nosniff");
  });

  it("should include Strict-Transport-Security header", async () => {
    const headers = await nextConfig.headers!();
    const allHeaders = headers[0]?.headers || [];
    const hsts = allHeaders.find((h) => h.key === "Strict-Transport-Security");
    expect(hsts).toBeDefined();
    expect(hsts?.value).toContain("max-age=31536000");
    expect(hsts?.value).toContain("includeSubDomains");
  });

  it("should include Content-Security-Policy header", async () => {
    const headers = await nextConfig.headers!();
    const allHeaders = headers[0]?.headers || [];
    const csp = allHeaders.find((h) => h.key === "Content-Security-Policy");
    expect(csp).toBeDefined();
    expect(csp?.value).toContain("default-src 'self'");
  });

  it("should restrict frame-ancestors in CSP", async () => {
    const headers = await nextConfig.headers!();
    const allHeaders = headers[0]?.headers || [];
    const csp = allHeaders.find((h) => h.key === "Content-Security-Policy");
    expect(csp?.value).toContain("frame-ancestors 'none'");
  });

  it("should set object-src to none in CSP", async () => {
    const headers = await nextConfig.headers!();
    const allHeaders = headers[0]?.headers || [];
    const csp = allHeaders.find((h) => h.key === "Content-Security-Policy");
    expect(csp?.value).toContain("object-src 'none'");
  });

  it("should include upgrade-insecure-requests in CSP", async () => {
    const headers = await nextConfig.headers!();
    const allHeaders = headers[0]?.headers || [];
    const csp = allHeaders.find((h) => h.key === "Content-Security-Policy");
    expect(csp?.value).toContain("upgrade-insecure-requests");
  });

  it("should restrict external connections in CSP", async () => {
    const headers = await nextConfig.headers!();
    const allHeaders = headers[0]?.headers || [];
    const csp = allHeaders.find((h) => h.key === "Content-Security-Policy");

    expect(csp?.value).toContain("connect-src");
    expect(csp?.value).toContain("https://api.deepgram.com");
    expect(csp?.value).toContain("https://*.vercel-storage.com");
  });

  it("should include Permissions-Policy header", async () => {
    const headers = await nextConfig.headers!();
    const allHeaders = headers[0]?.headers || [];
    const permissionsPolicy = allHeaders.find(
      (h) => h.key === "Permissions-Policy"
    );
    expect(permissionsPolicy).toBeDefined();
    expect(permissionsPolicy?.value).toContain("camera=()");
    expect(permissionsPolicy?.value).toContain("microphone=(self)");
  });

  it("should include Referrer-Policy header", async () => {
    const headers = await nextConfig.headers!();
    const allHeaders = headers[0]?.headers || [];
    const referrerPolicy = allHeaders.find((h) => h.key === "Referrer-Policy");
    expect(referrerPolicy).toBeDefined();
    expect(referrerPolicy?.value).toBe("strict-origin-when-cross-origin");
  });

  it("should apply headers to all paths", async () => {
    const headers = await nextConfig.headers!();
    expect(headers[0]?.source).toBe("/:path*");
  });
});
