import * as https from 'https';
import * as tls from 'tls';
import {
  CertificateRevocationChecker,
  type RevocationCheckOptions,
} from './certificate-revocation';

interface SecureAgentOptions extends https.AgentOptions {
  revocationCheck?: RevocationCheckOptions;
}

export class SecureHttpsAgent extends https.Agent {
  private revocationChecker: CertificateRevocationChecker;

  constructor(options?: SecureAgentOptions) {
    super(options);
    this.revocationChecker = new CertificateRevocationChecker(
      options?.revocationCheck
    );
  }

  createConnection(
    options: any,
    callback: (err: Error | null, socket?: any) => void
  ): any {
    const socket = tls.connect({
      ...options,
      rejectUnauthorized: true,
    });

    socket.on('secureConnect', async () => {
      try {
        const cert = socket.getPeerCertificate();

        if (!cert || Object.keys(cert).length === 0) {
          socket.destroy();
          callback(new Error('No peer certificate found'));
          return;
        }

        const result = await this.revocationChecker.checkCertificate(cert);

        if (result.isRevoked) {
          socket.destroy();
          callback(
            new Error(
              `Certificate revoked via ${result.method}: ${result.error || 'Certificate is on revocation list'}`
            )
          );
          return;
        }

        if (result.error && options.strictMode) {
          socket.destroy();
          callback(
            new Error(`Certificate revocation check failed: ${result.error}`)
          );
          return;
        }

        callback(null, socket);
      } catch (error) {
        socket.destroy();
        callback(
          error instanceof Error
            ? error
            : new Error('Certificate validation failed')
        );
      }
    });

    socket.on('error', (error) => {
      callback(error);
    });

    return socket;
  }
}

export function createSecureAgent(
  options?: SecureAgentOptions
): SecureHttpsAgent {
  return new SecureHttpsAgent(options);
}
