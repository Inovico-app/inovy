import type { RevocationCheckResult } from './certificate-revocation';
import type { PeerCertificate } from 'tls';

export interface CertificateLogEntry {
  timestamp: Date;
  hostname?: string;
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
  revocationCheck: RevocationCheckResult;
}

class CertificateLogger {
  private logs: CertificateLogEntry[] = [];
  private maxLogs = 1000;

  log(
    certificate: PeerCertificate,
    result: RevocationCheckResult,
    hostname?: string
  ): void {
    const entry: CertificateLogEntry = {
      timestamp: new Date(),
      hostname,
      subject: certificate.subject
        ? this.formatSubject(certificate.subject as any)
        : 'Unknown',
      issuer: certificate.issuer
        ? this.formatSubject(certificate.issuer as any)
        : 'Unknown',
      serialNumber: certificate.serialNumber || 'Unknown',
      validFrom: certificate.valid_from || 'Unknown',
      validTo: certificate.valid_to || 'Unknown',
      revocationCheck: result,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    if (result.isRevoked) {
      console.error('Certificate revocation detected:', {
        hostname,
        subject: entry.subject,
        method: result.method,
        error: result.error,
      });
    } else if (result.error) {
      console.warn('Certificate revocation check warning:', {
        hostname,
        subject: entry.subject,
        error: result.error,
      });
    } else {
      console.info('Certificate validated successfully:', {
        hostname,
        subject: entry.subject,
        method: result.method,
      });
    }
  }

  private formatSubject(
    subject: Record<string, string | string[]> | string
  ): string {
    if (typeof subject === 'string') {
      return subject;
    }

    const parts: string[] = [];
    for (const [key, value] of Object.entries(subject)) {
      if (Array.isArray(value)) {
        parts.push(`${key}=${value.join(', ')}`);
      } else {
        parts.push(`${key}=${value}`);
      }
    }
    return parts.join(', ');
  }

  getLogs(): CertificateLogEntry[] {
    return [...this.logs];
  }

  getRecentRevocations(hours = 24): CertificateLogEntry[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.logs.filter(
      (log) =>
        log.revocationCheck.isRevoked && log.timestamp > cutoff
    );
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const certificateLogger = new CertificateLogger();
