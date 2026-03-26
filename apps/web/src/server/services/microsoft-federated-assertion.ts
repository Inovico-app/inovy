import "server-only";

import { ManagedIdentityCredential } from "@azure/identity";

/**
 * Scope for the Entra workload identity exchange: MI token is used as
 * `client_assertion` against the Microsoft token endpoint.
 * @see https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-config-app-trust-managed-identity
 */
const AZURE_AD_TOKEN_EXCHANGE_SCOPE = "api://AzureADTokenExchange/.default";

export async function getMicrosoftClientAssertionToken(): Promise<string> {
  const clientId = process.env.MICROSOFT_ASSERTION_IDENTITY_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error(
      "MICROSOFT_ASSERTION_IDENTITY_CLIENT_ID is required for federated Microsoft Graph OAuth",
    );
  }

  const credential = new ManagedIdentityCredential(clientId);
  const result = await credential.getToken(AZURE_AD_TOKEN_EXCHANGE_SCOPE);
  if (!result?.token) {
    throw new Error(
      "Managed identity did not return a token for Azure AD token exchange",
    );
  }

  return result.token;
}
