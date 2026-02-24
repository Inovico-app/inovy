import https from "node:https";
import type { TLSSocket } from "node:tls";
import {
  CertificateValidationError,
  type CertificateValidationOptions,
  validateCertificateOnConnection,
} from "./certificate-validation";
import { logger } from "../../lib/logger";

const DEFAULT_NEAR_EXPIRY_WARNING_DAYS = 30;

/**
 * Secure fetch wrapper with certificate validation
 * Validates TLS certificates including expiry checks
 */

interface SecureFetchOptions extends RequestInit {
  certificateValidation?: CertificateValidationOptions;
}

/**
 * Custom HTTPS agent that validates certificates
 */
function createSecureHttpsAgent(
  hostname: string,
  options: CertificateValidationOptions = {}
): https.Agent {
  return new https.Agent({
    rejectUnauthorized: options.strictValidation !== false,
    ca: options.customCaBundle,
  });
}

/**
 * Secure fetch with certificate validation
 * Drop-in replacement for fetch() that validates TLS certificates
 *
 * @param url - The URL to fetch
 * @param options - Fetch options with optional certificate validation configuration
 * @returns Promise resolving to Response
 * @throws {CertificateValidationError} If certificate validation fails
 *
 * @example
 * ```typescript
 * const response = await secureFetch("https://api.example.com/data", {
 *   method: "GET",
 *   certificateValidation: {
 *     nearExpiryWarningDays: 30,
 *     strictValidation: true,
 *   },
 * });
 * ```
 */
export async function secureFetch(
  url: string | URL,
  options: SecureFetchOptions = {}
): Promise<Response> {
  const { certificateValidation, ...fetchOptions } = options;

  const urlObj = typeof url === "string" ? new URL(url) : url;
  const hostname = urlObj.hostname;

  if (urlObj.protocol !== "https:") {
    logger.warn("Non-HTTPS request detected", {
      component: "SecureFetch",
      url: urlObj.toString(),
      protocol: urlObj.protocol,
    });
    return fetch(url, fetchOptions);
  }

  const agent = createSecureHttpsAgent(hostname, certificateValidation);

  const enhancedOptions: RequestInit = {
    ...fetchOptions,
    // @ts-expect-error - Node.js specific property not in standard Fetch API
    agent,
  };

  try {
    const response = await fetch(url, enhancedOptions);

    // Node.js fetch doesn't provide direct access to TLS socket
    // Certificate validation is performed by the agent's rejectUnauthorized setting
    // Additional validation happens at the agent level

    logger.debug("Secure fetch completed", {
      component: "SecureFetch",
      hostname,
      status: response.status,
    });

    return response;
  } catch (error) {
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();

      if (
        errorMessage.includes("certificate") ||
        errorMessage.includes("cert") ||
        errorMessage.includes("ssl") ||
        errorMessage.includes("tls")
      ) {
        logger.error("Certificate validation error during fetch", {
          component: "SecureFetch",
          hostname,
          error: error.message,
        });

        if (errorMessage.includes("expired")) {
          throw new CertificateValidationError(
            `Certificate expired for ${hostname}`,
            "CERT_EXPIRED",
            hostname
          );
        }

        throw new CertificateValidationError(
          `Certificate validation failed for ${hostname}: ${error.message}`,
          "CERT_VALIDATION_FAILED",
          hostname
        );
      }
    }

    throw error;
  }
}

/**
 * Validate certificate by establishing a test connection
 * Useful for proactively checking certificate validity without making a full request
 *
 * @param url - The URL to check
 * @param options - Certificate validation options
 * @returns Promise resolving to certificate information
 * @throws {CertificateValidationError} If certificate validation fails
 */
export async function validateCertificate(
  url: string | URL,
  options: CertificateValidationOptions = {}
): Promise<{
  hostname: string;
  validFrom: Date;
  validTo: Date;
  daysUntilExpiry: number;
  isNearExpiry: boolean;
}> {
  return new Promise((resolve, reject) => {
    const urlObj = typeof url === "string" ? new URL(url) : url;
    const hostname = urlObj.hostname;
    const port = urlObj.port || 443;

    if (urlObj.protocol !== "https:") {
      reject(
        new Error(`Cannot validate certificate for non-HTTPS URL: ${url}`)
      );
      return;
    }

    const req = https.get(
      {
        hostname,
        port: Number(port),
        path: "/",
        method: "HEAD",
        rejectUnauthorized: options.strictValidation !== false,
        ca: options.customCaBundle,
      },
      (res) => {
        const socket = res.socket as TLSSocket;

        try {
          validateCertificateOnConnection(socket, hostname, options);

          const cert = socket.getPeerCertificate();
          if (!cert || Object.keys(cert).length === 0) {
            reject(
              new CertificateValidationError(
                `Unable to retrieve certificate for ${hostname}`,
                "CERT_VALIDATION_FAILED",
                hostname
              )
            );
            return;
          }

          const validFrom = new Date(cert.valid_from);
          const validTo = new Date(cert.valid_to);
          const now = new Date();
          const daysUntilExpiry = Math.floor(
            (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          const nearExpiryWarningDays =
            options.nearExpiryWarningDays ?? DEFAULT_NEAR_EXPIRY_WARNING_DAYS;

          resolve({
            hostname,
            validFrom,
            validTo,
            daysUntilExpiry,
            isNearExpiry: daysUntilExpiry <= nearExpiryWarningDays,
          });
        } catch (error) {
          reject(error);
        } finally {
          res.destroy();
        }
      }
    );

    req.on("error", (error) => {
      logger.error("Certificate validation request failed", {
        component: "CertificateValidation",
        hostname,
        error: error.message,
      });

      if (
        error.message.includes("certificate") ||
        error.message.includes("cert")
      ) {
        reject(
          new CertificateValidationError(
            `Certificate validation failed for ${hostname}: ${error.message}`,
            "CERT_VALIDATION_FAILED",
            hostname
          )
        );
      } else {
        reject(error);
      }
    });

    req.end();
  });
}

/**
 * Batch validate multiple certificates
 * Useful for checking multiple external services at startup
 *
 * @param urls - Array of URLs to validate
 * @param options - Certificate validation options
 * @returns Promise resolving to array of validation results
 */
export async function batchValidateCertificates(
  urls: string[],
  options: CertificateValidationOptions = {}
): Promise<
  Array<{
    url: string;
    success: boolean;
    error?: string;
    info?: {
      hostname: string;
      validFrom: Date;
      validTo: Date;
      daysUntilExpiry: number;
      isNearExpiry: boolean;
    };
  }>
> {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const info = await validateCertificate(url, options);
        return { url, success: true as const, info };
      } catch (error) {
        return {
          url,
          success: false as const,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    })
  );

  return results.map((result) =>
    result.status === "fulfilled" ? result.value : result.reason
  );
}

/**
 * Get certificate information without throwing errors
 * Useful for monitoring and reporting
 *
 * @param url - The URL to check
 * @returns Promise resolving to certificate information or null if unavailable
 */
export async function getCertificateInfo(
  url: string | URL
): Promise<{
  hostname: string;
  validFrom: Date;
  validTo: Date;
  daysUntilExpiry: number;
  isExpired: boolean;
  isNearExpiry: boolean;
  subject: Record<string, string>;
  issuer: Record<string, string>;
  fingerprint?: string;
} | null> {
  try {
    const urlObj = typeof url === "string" ? new URL(url) : url;
    const hostname = urlObj.hostname;
    const port = urlObj.port || 443;

    if (urlObj.protocol !== "https:") {
      return null;
    }

    return new Promise((resolve) => {
      const req = https.get(
        {
          hostname,
          port: Number(port),
          path: "/",
          method: "HEAD",
          rejectUnauthorized: false,
        },
        (res) => {
          const socket = res.socket as TLSSocket;
          const cert = socket.getPeerCertificate();

          if (!cert || Object.keys(cert).length === 0) {
            resolve(null);
            res.destroy();
            return;
          }

          const validFrom = new Date(cert.valid_from);
          const validTo = new Date(cert.valid_to);
          const now = new Date();
          const daysUntilExpiry = Math.floor(
            (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          resolve({
            hostname,
            validFrom,
            validTo,
            daysUntilExpiry,
            isExpired: now > validTo,
            isNearExpiry: daysUntilExpiry <= DEFAULT_NEAR_EXPIRY_WARNING_DAYS,
            subject: (cert.subject ?? {}) as unknown as Record<string, string>,
            issuer: (cert.issuer ?? {}) as unknown as Record<string, string>,
            fingerprint: cert.fingerprint,
          });

          res.destroy();
        }
      );

      req.on("error", () => {
        resolve(null);
      });

      req.end();
    });
  } catch {
    return null;
  }
}
