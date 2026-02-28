import { SecureHttpsAgent } from './https-agent';
import { getRevocationCheckOptions } from '../config/certificate-validation';

let globalSecureAgent: SecureHttpsAgent | null = null;

export function getSecureAgent(): SecureHttpsAgent {
  if (!globalSecureAgent) {
    globalSecureAgent = new SecureHttpsAgent({
      revocationCheck: getRevocationCheckOptions(),
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 60000,
    });
  }
  return globalSecureAgent;
}

export interface SecureFetchOptions extends RequestInit {
  validateCertificate?: boolean;
}

export async function secureFetch(
  url: string | URL,
  options?: SecureFetchOptions
): Promise<Response> {
  const { validateCertificate = true, ...fetchOptions } = options || {};

  if (!validateCertificate || !url.toString().startsWith('https://')) {
    return fetch(url, fetchOptions);
  }

  const agent = getSecureAgent();

  return fetch(url, {
    ...fetchOptions,
    // @ts-expect-error - Node.js specific agent option
    agent,
  });
}
