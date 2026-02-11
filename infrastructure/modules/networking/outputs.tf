output "vnet_id" {
  description = "ID of the Virtual Network"
  value       = azurerm_virtual_network.inovy.id
}

output "vnet_name" {
  description = "Name of the Virtual Network"
  value       = azurerm_virtual_network.inovy.name
}

output "subnet_container_apps_id" {
  description = "ID of the Container Apps subnet"
  value       = azurerm_subnet.container_apps.id
}

output "subnet_postgresql_id" {
  description = "ID of the PostgreSQL subnet"
  value       = azurerm_subnet.postgresql.id
}

output "subnet_redis_id" {
  description = "ID of the Redis subnet"
  value       = azurerm_subnet.redis.id
}
