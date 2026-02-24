/**
 * Example: Integrating Certificate Revocation Checking with Recall API Service
 *
 * This file demonstrates how to integrate the certificate revocation checking
 * with existing API services.
 */

import { secureFetch } from './fetch-with-revocation-check';
import { err, ok } from 'neverthrow';
import type { ActionResult } from '../../lib/server-action-client/action-errors';
import { ActionErrors } from '../../lib/server-action-client/action-errors';
import { logger, serializeError } from '../../lib/logger';

/**
 * Example: Secure API client with certificate revocation checking
 */
export class SecureApiClient {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  /**
   * Make a secure GET request with certificate validation
   */
  async get<T>(endpoint: string): Promise<ActionResult<T>> {
    try {
      const response = await secureFetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        validateCertificate: true,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return err(
          ActionErrors.internal(
            `API error: ${response.statusText}`,
            new Error(errorText),
            'SecureApiClient.get'
          )
        );
      }

      const data = await response.json();
      return ok(data as T);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Certificate revoked')
      ) {
        logger.error(
          'Certificate revocation detected',
          {
            component: 'SecureApiClient.get',
            endpoint,
          },
          error
        );

        return err(
          ActionErrors.forbidden(
            'Certificate revocation detected - connection rejected',
            { endpoint },
            'SecureApiClient.get'
          )
        );
      }

      return err(
        ActionErrors.internal(
          'Request failed',
          error as Error,
          'SecureApiClient.get'
        )
      );
    }
  }

  /**
   * Make a secure POST request with certificate validation
   */
  async post<T>(endpoint: string, body: unknown): Promise<ActionResult<T>> {
    try {
      const bodyStr =
        typeof body === 'string' ? body : JSON.stringify(body);

      const response = await secureFetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Token ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: bodyStr,
        validateCertificate: true,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return err(
          ActionErrors.internal(
            `API error: ${response.statusText}`,
            new Error(errorText),
            'SecureApiClient.post'
          )
        );
      }

      const data = await response.json();
      return ok(data as T);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes('Certificate revoked')
      ) {
        logger.error(
          'Certificate revocation detected',
          {
            component: 'SecureApiClient.post',
            endpoint,
          },
          error
        );

        return err(
          ActionErrors.forbidden(
            'Certificate revocation detected - connection rejected',
            { endpoint },
            'SecureApiClient.post'
          )
        );
      }

      return err(
        ActionErrors.internal(
          'Request failed',
          error as Error,
          'SecureApiClient.post'
        )
      );
    }
  }
}

/**
 * Example: How to update RecallApiService to use secure fetch
 *
 * Replace standard fetch calls with secureFetch:
 *
 * Before:
 * ```typescript
 * const response = await fetch(`${API_BASE_URL}/bot/`, {
 *   method: 'POST',
 *   headers: { ... },
 *   body: JSON.stringify({ ... }),
 * });
 * ```
 *
 * After:
 * ```typescript
 * import { secureFetch } from './lib/fetch-with-revocation-check';
 *
 * const response = await secureFetch(`${API_BASE_URL}/bot/`, {
 *   method: 'POST',
 *   headers: { ... },
 *   body: JSON.stringify({ ... }),
 *   validateCertificate: true, // Optional, defaults to true for HTTPS
 * });
 * ```
 */

/**
 * Example: Direct usage with custom validation
 */
export async function exampleDirectValidation() {
  const { verifyCertificateRevocation } =
    await import('./certificate-revocation');
  const tls = await import('tls');

  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: 'api.example.com',
        port: 443,
        rejectUnauthorized: true,
      },
      async () => {
        try {
          const cert = socket.getPeerCertificate();

          const result = await verifyCertificateRevocation(cert, {
            enableCRL: true,
            enableOCSP: true,
            timeout: 5000,
            strictMode: false,
          });

          if (result.isRevoked) {
            socket.destroy();
            reject(new Error('Certificate is revoked'));
          } else {
            resolve({
              valid: true,
              method: result.method,
              checkedAt: result.checkedAt,
            });
            socket.end();
          }
        } catch (error) {
          socket.destroy();
          reject(error);
        }
      }
    );

    socket.on('error', reject);
  });
}
