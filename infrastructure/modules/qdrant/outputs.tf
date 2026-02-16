output "qdrant_url" {
  description = "Qdrant API URL"
  value       = var.qdrant_ip_address_type == "Public" ? "http://${azurerm_container_group.qdrant.fqdn}:6333" : "http://${azurerm_container_group.qdrant.ip_address}:6333"
}

output "qdrant_grpc_url" {
  description = "Qdrant gRPC URL"
  value       = var.qdrant_ip_address_type == "Public" ? "${azurerm_container_group.qdrant.fqdn}:6334" : "${azurerm_container_group.qdrant.ip_address}:6334"
}

output "qdrant_fqdn" {
  description = "FQDN of the Qdrant container group"
  value       = azurerm_container_group.qdrant.fqdn
}

output "qdrant_ip_address" {
  description = "IP address of the Qdrant container group"
  value       = azurerm_container_group.qdrant.ip_address
}
