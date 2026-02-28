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
