import type { TLSSocket } from "node:tls";
import { logger } from "../../lib/logger";

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
 * Certificate information extracted from TLS socket
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
 * @param cert - Certificate information
 * @param hostname - Hostname for logging context
 * @param options - Validation options
 * @throws {CertificateValidationError} If certificate is expired or not yet valid
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

    logger.security.suspiciousActivity(
      `Certificate not yet valid for ${hostname}`,
      {
        hostname,
        validFrom: validFrom.toISOString(),
        validTo: validTo.toISOString(),
        fingerprint: cert.fingerprint,
      }
    );

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

    logger.error("Expired certificate detected", {
      component: "CertificateValidation",
      hostname,
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
      expiredDays: Math.floor((now.getTime() - validTo.getTime()) / (1000 * 60 * 60 * 24)),
      fingerprint: cert.fingerprint,
      serialNumber: cert.serialNumber,
    });

    throw error;
  }

  const daysUntilExpiry = Math.floor(
    (validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysUntilExpiry <= nearExpiryWarningDays) {
    logger.warn("Certificate nearing expiry", {
      component: "CertificateValidation",
      hostname,
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
      daysUntilExpiry,
      warningThreshold: nearExpiryWarningDays,
      fingerprint: cert.fingerprint,
      serialNumber: cert.serialNumber,
    });
  } else {
    logger.debug("Certificate validity verified", {
      component: "CertificateValidation",
      hostname,
      daysUntilExpiry,
      validTo: validTo.toISOString(),
    });
  }
}

/**
 * Validate certificate on TLS connection
 * This is the main entry point for certificate validation
 */
export function validateCertificateOnConnection(
  socket: TLSSocket,
  hostname: string,
  options: CertificateValidationOptions = {}
): void {
  if (!socket.authorized) {
    const authError = socket.authorizationError;
    logger.error("TLS certificate authorization failed", {
      component: "CertificateValidation",
      hostname,
      error: authError?.message ?? "Unknown authorization error",
    });

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
    logger.warn("Unable to extract certificate information", {
      component: "CertificateValidation",
      hostname,
    });

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
