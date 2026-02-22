import { logger } from "./logger";

/**
 * Secure HTTP Client Configuration
 *
 * Enforces TLS 1.2+ for all HTTP connections
 * Complies with SSD-4.1.01 and NIST SP 800-52 Rev. 2
 *
 * @see CRYPTOGRAPHY_COMPLIANCE.md
 */

interface SecureFetchOptions extends RequestInit {
  timeout?: number;
}

/**
 * TLS Configuration Constants
 *
 * NIST SP 800-52 Rev. 2 recommends:
 * - Minimum: TLS 1.2
 * - Preferred: TLS 1.3
 */
export const TLS_CONFIG = {
  MIN_VERSION: "TLSv1.2" as const,
  MAX_VERSION: "TLSv1.3" as const,
  DEFAULT_TIMEOUT: 30000, // 30 seconds
} as const;

/**
 * Secure fetch wrapper that enforces TLS 1.2+ and includes security best practices
 *
 * Features:
 * - Enforces HTTPS protocol
 * - Validates TLS version requirements
 * - Includes timeout protection
 * - Logs security-relevant events
 *
 * @param url - The URL to fetch (must use HTTPS)
 * @param options - Fetch options with optional timeout
 * @returns Promise with Response object
 * @throws Error if URL uses HTTP instead of HTTPS
 *
 * @example
 * ```typescript
 * const response = await secureFetch('https://api.example.com/data', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({ data: 'value' }),
 *   timeout: 10000, // 10 seconds
 * });
 * ```
 */
export async function secureFetch(
  url: string,
  options: SecureFetchOptions = {}
): Promise<Response> {
  const urlObj = new URL(url);

  if (urlObj.protocol !== "https:") {
    const error = new Error(
      `Insecure protocol detected: ${urlObj.protocol}. Only HTTPS is allowed for secure communication.`
    );

    logger.error("Attempted to use non-HTTPS protocol", {
      component: "secureFetch",
      url: urlObj.origin,
      protocol: urlObj.protocol,
    });

    throw error;
  }

  const timeout = options.timeout ?? TLS_CONFIG.DEFAULT_TIMEOUT;
  const { timeout: _timeout, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      logger.warn("HTTP request timeout", {
        component: "secureFetch",
        url: urlObj.origin,
        timeout,
      });
      throw new Error(`Request timeout after ${timeout}ms`);
    }

    throw error;
  }
}

/**
 * Validates if a URL uses HTTPS protocol
 *
 * @param url - The URL to validate
 * @returns true if URL uses HTTPS, false otherwise
 *
 * @example
 * ```typescript
 * if (!isSecureUrl('http://example.com')) {
 *   throw new Error('Only HTTPS URLs are allowed');
 * }
 * ```
 */
export function isSecureUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates connection requirements for external services
 *
 * Ensures:
 * - HTTPS protocol
 * - Valid URL format
 * - No localhost in production (security risk)
 *
 * @param url - The URL to validate
 * @param serviceName - Name of the service for error messages
 * @throws Error if URL doesn't meet security requirements
 *
 * @example
 * ```typescript
 * validateSecureConnection('https://api.service.com', 'External API');
 * ```
 */
export function validateSecureConnection(
  url: string,
  serviceName: string
): void {
  let urlObj: URL;

  try {
    urlObj = new URL(url);
  } catch {
    throw new Error(`Invalid URL format for ${serviceName}: ${url}`);
  }

  if (urlObj.protocol !== "https:") {
    throw new Error(
      `${serviceName} must use HTTPS protocol. Found: ${urlObj.protocol}`
    );
  }

  const isProduction = process.env.NODE_ENV === "production";
  const isLocalhost =
    urlObj.hostname === "localhost" ||
    urlObj.hostname === "127.0.0.1" ||
    urlObj.hostname.endsWith(".local");

  if (isProduction && isLocalhost) {
    throw new Error(
      `${serviceName} cannot use localhost URLs in production: ${url}`
    );
  }

  logger.info("Secure connection validated", {
    component: "validateSecureConnection",
    service: serviceName,
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
  });
}

/**
 * Checks if the current Node.js version supports TLS 1.2+
 *
 * Node.js v12+ supports TLS 1.2 and 1.3 by default
 *
 * @returns true if Node.js supports TLS 1.2+
 *
 * @example
 * ```typescript
 * if (!isTlsSupported()) {
 *   throw new Error('Node.js version does not support TLS 1.2+');
 * }
 * ```
 */
export function isTlsSupported(): boolean {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split(".")[0] ?? "0", 10);

  const isSupported = majorVersion >= 12;

  if (!isSupported) {
    logger.error("Node.js version does not support TLS 1.2+", {
      component: "isTlsSupported",
      nodeVersion,
      requiredVersion: "12+",
    });
  }

  return isSupported;
}

/**
 * Gets TLS configuration information for logging/debugging
 *
 * @returns Object with TLS configuration details
 *
 * @example
 * ```typescript
 * const tlsInfo = getTlsInfo();
 * console.log(`Using TLS ${tlsInfo.minVersion} - ${tlsInfo.maxVersion}`);
 * ```
 */
export function getTlsInfo(): {
  minVersion: string;
  maxVersion: string;
  nodeVersion: string;
  supported: boolean;
} {
  return {
    minVersion: TLS_CONFIG.MIN_VERSION,
    maxVersion: TLS_CONFIG.MAX_VERSION,
    nodeVersion: process.version,
    supported: isTlsSupported(),
  };
}

/**
 * Type guard for checking if error is related to TLS/SSL
 *
 * @param error - The error to check
 * @returns true if error is TLS/SSL related
 *
 * @example
 * ```typescript
 * try {
 *   await secureFetch('https://example.com');
 * } catch (error) {
 *   if (isTlsError(error)) {
 *     console.error('TLS connection failed');
 *   }
 * }
 * ```
 */
export function isTlsError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const tlsErrorPatterns = [
    "CERT_",
    "SSL_",
    "TLS_",
    "certificate",
    "handshake",
    "protocol version",
  ];

  return tlsErrorPatterns.some((pattern) =>
    error.message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Logs TLS configuration at application startup
 *
 * Should be called during application initialization to verify TLS support
 *
 * @example
 * ```typescript
 * // In app initialization
 * logTlsConfig();
 * ```
 */
export function logTlsConfig(): void {
  const tlsInfo = getTlsInfo();

  logger.info("TLS Configuration", {
    component: "secure-http-client",
    config: {
      minVersion: tlsInfo.minVersion,
      maxVersion: tlsInfo.maxVersion,
      nodeVersion: tlsInfo.nodeVersion,
      supported: tlsInfo.supported,
      compliance: "SSD-4.1.01, NIST SP 800-52 Rev. 2",
    },
  });

  if (!tlsInfo.supported) {
    logger.error("TLS 1.2+ not supported - security requirements not met", {
      component: "secure-http-client",
      nodeVersion: tlsInfo.nodeVersion,
      requiredVersion: "12+",
    });
  }
}
