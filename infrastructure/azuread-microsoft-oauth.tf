# Entra ID federated identity credential: trust the Container App user-assigned managed identity
# to authenticate as the Microsoft OAuth app registration (client assertion instead of client secret
# for token endpoints used by apps/web Microsoft Graph integration).
# See: https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation-config-app-trust-managed-identity

data "azuread_application" "microsoft_oauth" {
  count = local.microsoft_federated_credential_enabled ? 1 : 0

  client_id = var.microsoft_client_id
}

resource "azuread_application_federated_identity_credential" "microsoft_oauth_container_app_mi" {
  count = local.microsoft_federated_credential_enabled ? 1 : 0

  # azuread v3.x: application_id is the Entra application (object) ID
  application_id = data.azuread_application.microsoft_oauth[0].object_id
  display_name   = "inovy-container-app-uami-${var.environment}"
  description    = "Trust user-assigned MI for OAuth client assertion (Graph / token exchange)"
  audiences      = ["api://AzureADTokenExchange"]
  issuer         = "https://login.microsoftonline.com/${var.entra_tenant_id}/v2.0"
  subject        = module.container_app_identity.managed_identity_principal_id

  depends_on = [module.container_app_identity]
}
