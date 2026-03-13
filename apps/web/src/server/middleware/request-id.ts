/**
 * Request ID propagation utility
 *
 * Generates or forwards a unique request ID for each incoming request.
 * Load balancers may forward an existing ID via x-request-id header.
 * Used for end-to-end request tracing in logs and observability tools.
 *
 * ISO 27001:2022 A.8.15 — Logging
 */

const REQUEST_ID_HEADER = "x-request-id";

/**
 * Get the request ID from existing headers or generate a new UUID v4.
 * Prefers an existing x-request-id forwarded by a load balancer.
 */
export function getRequestId(requestHeaders: Headers): string {
  const existing = requestHeaders.get(REQUEST_ID_HEADER);
  if (existing && existing.trim().length > 0) {
    return existing.trim();
  }
  return crypto.randomUUID();
}
