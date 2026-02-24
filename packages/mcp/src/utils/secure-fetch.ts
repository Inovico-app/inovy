import https from "node:https";
import type { TLSSocket } from "node:tls";

/**
 * Certificate validation errors
 */
export class CertificateValidationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CERT_EXPIRED"
      | "CERT_NOT_YET_VALID"
      | "CERT_VALIDATION_FAILED",
    public readonly hostname?: string,
    public readonly validFrom?: Date,
    public readonly validTo?: Date
  ) {
    super(message);
    this.name = "CertificateValidationError";
  }
}

/**
 * Certificate validation configuration
 */
export interface CertificateValidationOptions {
  /**
   * Number of days before expiry to trigger a warning
   * @default 30
   */
  nearExpiryWarningDays?: number;

  /**
   * Whether to enforce strict certificate validation
   * @default true
   */
  strictValidation?: boolean;

  /**
   * Custom certificate authority bundle (PEM format)
   */
  customCaBundle?: string;
}

/**
 * Certificate information
 */
export interface CertificateInfo {
  subject: Record<string, string>;
  issuer: Record<string, string>;
  validFrom: Date;
  validTo: Date;
  fingerprint?: string;
  serialNumber?: string;
}

const DEFAULT_NEAR_EXPIRY_WARNING_DAYS = 30;

/**
 * Extract certificate information from TLS socket
 */
export function extractCertificateInfo(
  socket: TLSSocket
): CertificateInfo | null {
  const cert = socket.getPeerCertificate();
  if (!cert || Object.keys(cert).length === 0) {
    return null;
  }

  return {
    subject: (cert.subject ?? {}) as unknown as Record<string, string>,
    issuer: (cert.issuer ?? {}) as unknown as Record<string, string>,
    validFrom: new Date(cert.valid_from),
    validTo: new Date(cert.valid_to),
    fingerprint: cert.fingerprint,
    serialNumber: cert.serialNumber,
  };
}

/**
 * Validate certificate validity period
 */
export function validateCertificateValidity(
  cert: CertificateInfo,
  hostname: string,
  options: CertificateValidationOptions = {}
): void {
  const {
    nearExpiryWarningDays = DEFAULT_NEAR_EXPIRY_WARNING_DAYS,
    strictValidation = true,
  } = options;

  const now = new Date();
  const { validFrom, validTo } = cert;

  if (now < validFrom) {
    const error = new CertificateValidationError(
      `Certificate for ${hostname} is not yet valid. Valid from: ${validFrom.toISOString()}`,
      "CERT_NOT_YET_VALID",
      hostname,
      validFrom,
      validTo
    );

    console.warn(`[WARN] Certificate not yet valid for ${hostname}`, {
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
    });

    if (strictValidation) {
      throw error;
    }
  }

  if (now > validTo) {
    const error = new CertificateValidationError(
      `Certificate for ${hostname} has expired. Expired on: ${validTo.toISOString()}`,
      "CERT_EXPIRED",
      hostname,
      validFrom,
      validTo
    );

    console.error(
      `[ERROR] Expired certificate detected for ${hostname}`,
      {
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        expiredDays: Math.floor(
          (now.getTime() - validTo.getTime()) / (1000 * 60 * 60 * 24)
        ),
      }
    );

    throw error;
  }

  const daysUntilExpiry = Math.floor(
    (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry <= nearExpiryWarningDays) {
    console.warn(
      `[WARN] Certificate nearing expiry for ${hostname}`,
      {
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        daysUntilExpiry,
        warningThreshold: nearExpiryWarningDays,
      }
    );
  }
}

/**
 * Validate certificate on TLS connection
 */
export function validateCertificateOnConnection(
  socket: TLSSocket,
  hostname: string,
  options: CertificateValidationOptions = {}
): void {
  if (!socket.authorized) {
    const authError = socket.authorizationError;
    console.error(
      `[ERROR] TLS certificate authorization failed for ${hostname}`,
      authError?.message
    );

    if (options.strictValidation !== false) {
      throw new CertificateValidationError(
        `Certificate validation failed for ${hostname}: ${authError?.message ?? "Authorization failed"}`,
        "CERT_VALIDATION_FAILED",
        hostname
      );
    }
    return;
  }

  const certInfo = extractCertificateInfo(socket);
  if (!certInfo) {
    console.warn(
      `[WARN] Unable to extract certificate information for ${hostname}`
    );

    if (options.strictValidation !== false) {
      throw new CertificateValidationError(
        `Unable to extract certificate information for ${hostname}`,
        "CERT_VALIDATION_FAILED",
        hostname
      );
    }
    return;
  }

  validateCertificateValidity(certInfo, hostname, options);
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
 */
interface SecureFetchOptions extends RequestInit {
  certificateValidation?: CertificateValidationOptions;
}

export async function secureFetch(
  url: string | URL,
  options: SecureFetchOptions = {}
): Promise<Response> {
  const { certificateValidation, ...fetchOptions } = options;

  const urlObj = typeof url === "string" ? new URL(url) : url;
  const hostname = urlObj.hostname;

  if (urlObj.protocol !== "https:") {
    console.warn(`[WARN] Non-HTTPS request: ${urlObj.toString()}`);
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
        console.error(
          `[ERROR] Certificate validation error for ${hostname}`,
          error.message
        );

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
