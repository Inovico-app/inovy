output "acr_id" {
  description = "ID of the Azure Container Registry"
  value       = azurerm_container_registry.inovy.id
}

output "acr_name" {
  description = "Name of the Azure Container Registry"
  value       = azurerm_container_registry.inovy.name
}

output "acr_login_server" {
  description = "Login server URL for the registry (e.g., inovyacrprd.azurecr.io)"
  value       = azurerm_container_registry.inovy.login_server
}
