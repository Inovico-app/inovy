import { type NextRequest, NextResponse } from "next/server";

/**
 * Security Headers Middleware
 *
 * Implements comprehensive HTTP security headers following:
 * - SSD-4.1.01: Use industry-standard secure protocols
 * - SSD-24: HTTP Security Headers
 * - SSD-33: Secure HTTP Response Headers
 * - OWASP Secure Headers Project
 *
 * @see CRYPTOGRAPHY_COMPLIANCE.md
 */

/**
 * Security headers configuration
 *
 * These headers are applied to all responses to enhance browser security
 * and protect against common web vulnerabilities.
 */
export const SECURITY_HEADERS = {
  /**
   * Strict-Transport-Security (HSTS)
   *
   * Enforces HTTPS for all connections to prevent protocol downgrade attacks.
   *
   * - max-age=31536000: Enforce HTTPS for 1 year
   * - includeSubDomains: Apply to all subdomains
   * - preload: Eligible for browser HSTS preload lists
   *
   * NIST SP 800-52 Rev. 2 recommends HSTS for TLS enforcement.
   */
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",

  /**
   * X-Content-Type-Options
   *
   * Prevents MIME type sniffing attacks by forcing browser to respect
   * declared Content-Type header.
   *
   * SSD-24.1.02 requires this header.
   */
  "X-Content-Type-Options": "nosniff",

  /**
   * X-Frame-Options
   *
   * Prevents clickjacking attacks by controlling iframe embedding.
   *
   * - DENY: Prevents any domain from framing the content
   * - Alternative: Use CSP frame-ancestors directive
   *
   * SSD-24.1.03 requires this header.
   */
  "X-Frame-Options": "DENY",

  /**
   * X-XSS-Protection
   *
   * Legacy header for older browsers. Modern browsers use CSP instead.
   *
   * - 1: Enable XSS filter
   * - mode=block: Block page if XSS attack detected
   */
  "X-XSS-Protection": "1; mode=block",

  /**
   * Referrer-Policy
   *
   * Controls how much referrer information is sent with requests.
   *
   * - strict-origin-when-cross-origin: Send full URL for same-origin,
   *   origin only for cross-origin HTTPS, nothing for HTTP
   */
  "Referrer-Policy": "strict-origin-when-cross-origin",

  /**
   * Permissions-Policy
   *
   * Controls which browser features and APIs can be used.
   *
   * Disables unnecessary features to reduce attack surface:
   * - geolocation: Disable location access
   * - microphone: Disable microphone (except for recording features)
   * - camera: Disable camera
   * - payment: Disable payment APIs
   * - usb: Disable USB device access
   * - magnetometer/gyroscope/accelerometer: Disable motion sensors
   */
  "Permissions-Policy":
    "geolocation=(), microphone=(self), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",

  /**
   * Content-Security-Policy (CSP)
   *
   * Powerful defense against XSS and injection attacks.
   *
   * This is a baseline policy. Adjust based on application needs:
   * - default-src 'self': Only load resources from same origin
   * - script-src: Control script execution
   * - style-src: Control stylesheet loading
   * - img-src: Control image sources
   * - font-src: Control font sources
   * - connect-src: Control fetch/XHR/WebSocket connections
   * - frame-ancestors: Control who can frame this page
   * - base-uri: Prevent <base> tag injection
   * - form-action: Control form submission targets
   *
   * SSD-24.1.04 requires CSP header.
   *
   * Note: This is a restrictive policy. You may need to adjust based on
   * your specific needs (e.g., if using CDNs, analytics, etc.)
   */
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: Consider using nonces/hashes instead of 'unsafe-inline'
    "style-src 'self' 'unsafe-inline'", // Note: Consider using nonces/hashes instead of 'unsafe-inline'
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; "),

  /**
   * Cross-Origin-Embedder-Policy
   *
   * Controls cross-origin resource loading.
   * Required for certain powerful features like SharedArrayBuffer.
   */
  "Cross-Origin-Embedder-Policy": "require-corp",

  /**
   * Cross-Origin-Opener-Policy
   *
   * Isolates browsing context exclusively to same-origin documents.
   * Prevents cross-origin attacks via window references.
   */
  "Cross-Origin-Opener-Policy": "same-origin",

  /**
   * Cross-Origin-Resource-Policy
   *
   * Protects against cross-origin information leaks.
   */
  "Cross-Origin-Resource-Policy": "same-origin",
} as const;

/**
 * Apply security headers to response
 *
 * @param response - The NextResponse to add headers to
 * @returns Modified response with security headers
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

/**
 * Security headers middleware for Next.js
 *
 * Automatically applies security headers to all responses.
 *
 * @param request - The incoming request
 * @returns Response with security headers applied
 *
 * @example
 * Add to middleware.ts:
 * ```typescript
 * import { securityHeadersMiddleware } from './middleware/security-headers';
 *
 * export function middleware(request: NextRequest) {
 *   const response = securityHeadersMiddleware(request);
 *   // Add other middleware logic here
 *   return response;
 * }
 * ```
 */
export function securityHeadersMiddleware(
  request: NextRequest
): NextResponse {
  const response = NextResponse.next();
  return applySecurityHeaders(response);
}

/**
 * Get security headers as object for use in API routes
 *
 * @returns Object with all security headers
 *
 * @example
 * In API route:
 * ```typescript
 * import { getSecurityHeaders } from '@/middleware/security-headers';
 *
 * export async function GET() {
 *   return new Response('OK', {
 *     headers: {
 *       ...getSecurityHeaders(),
 *       'Content-Type': 'application/json',
 *     },
 *   });
 * }
 * ```
 */
export function getSecurityHeaders(): Record<string, string> {
  return { ...SECURITY_HEADERS };
}

/**
 * Validate that required security headers are present in response
 *
 * Useful for testing and compliance verification.
 *
 * @param headers - Headers object to validate
 * @returns Object with validation results
 *
 * @example
 * ```typescript
 * const validation = validateSecurityHeaders(response.headers);
 * if (!validation.valid) {
 *   console.error('Missing headers:', validation.missing);
 * }
 * ```
 */
export function validateSecurityHeaders(
  headers: Headers | Record<string, string>
): {
  valid: boolean;
  missing: string[];
  present: string[];
} {
  const requiredHeaders = [
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Content-Security-Policy",
  ];

  const headersObj =
    headers instanceof Headers
      ? Object.fromEntries(headers.entries())
      : headers;

  const present: string[] = [];
  const missing: string[] = [];

  requiredHeaders.forEach((header) => {
    const headerLower = header.toLowerCase();
    const hasHeader = Object.keys(headersObj).some(
      (key) => key.toLowerCase() === headerLower
    );

    if (hasHeader) {
      present.push(header);
    } else {
      missing.push(header);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
    present,
  };
}

/**
 * Get CSP policy for specific environment
 *
 * Returns different CSP policies based on environment:
 * - Development: More permissive for hot reload, debugging
 * - Production: Stricter policy
 *
 * @param env - Environment ('development' or 'production')
 * @returns CSP policy string
 */
export function getCspForEnvironment(
  env: "development" | "production"
): string {
  if (env === "development") {
    return [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' ws: wss: https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");
  }

  return SECURITY_HEADERS["Content-Security-Policy"];
}

/**
 * Log security headers configuration at startup
 *
 * Useful for debugging and compliance verification.
 */
export function logSecurityHeaders(): void {
  console.log("Security Headers Configuration:");
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  console.log("\nCompliance:");
  console.log("  - SSD-4.1.01: Secure protocols");
  console.log("  - SSD-24: HTTP security headers");
  console.log("  - SSD-33: Secure HTTP response headers");
  console.log("  - OWASP Secure Headers Project");
}
