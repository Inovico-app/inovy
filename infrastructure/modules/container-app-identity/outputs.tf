output "managed_identity_id" {
  description = "ID of the Container App managed identity"
  value       = azurerm_user_assigned_identity.container_app.id
}

output "managed_identity_principal_id" {
  description = "Principal ID of the Container App managed identity"
  value       = azurerm_user_assigned_identity.container_app.principal_id
}

output "managed_identity_client_id" {
  description = "Client ID of the Container App managed identity"
  value       = azurerm_user_assigned_identity.container_app.client_id
}
