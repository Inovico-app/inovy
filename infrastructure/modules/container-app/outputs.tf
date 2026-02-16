output "container_app_environment_id" {
  description = "ID of the Container App Environment"
  value       = azurerm_container_app_environment.inovy.id
}

output "container_app_id" {
  description = "ID of the Container App"
  value       = azurerm_container_app.inovy.id
}

output "container_app_fqdn" {
  description = "FQDN of the Container App"
  value       = azurerm_container_app.inovy.latest_revision_fqdn
}

output "container_app_url" {
  description = "URL of the Container App"
  value       = var.container_app_external_ingress ? "https://${azurerm_container_app.inovy.latest_revision_fqdn}" : "http://${azurerm_container_app.inovy.latest_revision_fqdn}"
}

output "container_app_managed_identity_id" {
  description = "ID of the Container App managed identity"
  value       = azurerm_user_assigned_identity.container_app.id
}

output "container_app_managed_identity_principal_id" {
  description = "Principal ID of the Container App managed identity"
  value       = azurerm_user_assigned_identity.container_app.principal_id
}
