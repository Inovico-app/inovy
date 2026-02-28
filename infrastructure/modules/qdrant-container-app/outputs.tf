output "qdrant_hostname" {
  description = "Hostname/FQDN of the Qdrant Container App (use for internal connections)"
  value       = azurerm_container_app.qdrant.latest_revision_fqdn
}

output "qdrant_url" {
  description = "Qdrant REST API URL (HTTP, internal only)"
  value       = "http://${azurerm_container_app.qdrant.latest_revision_fqdn}"
}

output "qdrant_grpc_url" {
  description = "Qdrant gRPC URL (host:port for internal connections)"
  value       = "${azurerm_container_app.qdrant.latest_revision_fqdn}:6334"
}
