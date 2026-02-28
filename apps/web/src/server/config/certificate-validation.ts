import type { RevocationCheckOptions } from '../lib/certificate-revocation';

interface CertificateValidationConfig {
  enabled: boolean;
  revocation: RevocationCheckOptions;
  logFailures: boolean;
  allowSelfSigned: boolean;
}

function getBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function getNumberEnv(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

export const certificateValidationConfig: CertificateValidationConfig = {
  enabled: getBooleanEnv('CERT_VALIDATION_ENABLED', true),

  revocation: {
    enableCRL: getBooleanEnv('CERT_CRL_CHECK_ENABLED', true),
    enableOCSP: getBooleanEnv('CERT_OCSP_CHECK_ENABLED', true),
    timeout: getNumberEnv('CERT_REVOCATION_TIMEOUT', 5000),
    strictMode: getBooleanEnv('CERT_STRICT_MODE', false),
    cacheTimeout: getNumberEnv('CERT_CACHE_TIMEOUT', 3600000),
  },

  logFailures: getBooleanEnv('CERT_LOG_FAILURES', true),

  allowSelfSigned:
    process.env.NODE_ENV === 'development' &&
    getBooleanEnv('CERT_ALLOW_SELF_SIGNED', false),
};

export function shouldValidateCertificates(): boolean {
  if (process.env.NODE_ENV === 'development') {
    return certificateValidationConfig.enabled;
  }
  return true;
}

export function getRevocationCheckOptions(): RevocationCheckOptions {
  return certificateValidationConfig.revocation;
}
