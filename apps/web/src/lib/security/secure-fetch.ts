import { getSecureHttpsAgent } from "./https-agent";
import { logger } from "../logger";

interface SecureFetchOptions extends RequestInit {
  skipCertValidation?: boolean;
  logRequest?: boolean;
}

export async function secureFetch(
  url: string | URL,
  options: SecureFetchOptions = {}
): Promise<Response> {
  const {
    skipCertValidation = false,
    logRequest = false,
    ...fetchOptions
  } = options;

  const urlString = url.toString();
  const isHttps = urlString.startsWith("https://");

  if (skipCertValidation) {
    logger.warn("Certificate validation is intentionally skipped", {
      component: "secureFetch",
      url: urlString,
      warning:
        "This should only be used in development or with explicit security approval",
    });
  }

  if (isHttps && !skipCertValidation) {
    const agent = getSecureHttpsAgent();

    const requestOptions: RequestInit = {
      ...fetchOptions,
      // @ts-expect-error - Node.js fetch supports agent option but it's not in the types
      agent,
    };

    if (logRequest) {
      logger.debug("Making secure HTTPS request", {
        component: "secureFetch",
        url: urlString,
        method: requestOptions.method ?? "GET",
        hasCertValidation: true,
      });
    }

    try {
      const response = await fetch(url, requestOptions);

      if (logRequest) {
        logger.debug("Secure HTTPS request completed", {
          component: "secureFetch",
          url: urlString,
          status: response.status,
          statusText: response.statusText,
        });
      }

      return response;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("certificate") ||
          error.message.includes("CERT_") ||
          error.message.includes("SSL"))
      ) {
        logger.error("Certificate validation failed", {
          component: "secureFetch",
          url: urlString,
          error: error.message,
          advice:
            "This error indicates that the server's SSL/TLS certificate is not trusted. Check the certificate validity and CA chain.",
        });
      }

      throw error;
    }
  }

  if (logRequest) {
    logger.debug("Making HTTP request (not HTTPS)", {
      component: "secureFetch",
      url: urlString,
      method: fetchOptions.method ?? "GET",
      warning: "This request is not using HTTPS",
    });
  }

  return fetch(url, fetchOptions);
}

export function createSecureFetchWithDefaults(
  defaultOptions: SecureFetchOptions = {}
): typeof secureFetch {
  return (url: string | URL, options: SecureFetchOptions = {}) => {
    return secureFetch(url, { ...defaultOptions, ...options });
  };
}
