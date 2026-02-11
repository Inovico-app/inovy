output "resource_group_name" {
  description = "Name of the Inovy application resource group"
  value       = azurerm_resource_group.inovy.name
}

output "resource_group_id" {
  description = "ID of the Inovy application resource group"
  value       = azurerm_resource_group.inovy.id
}

output "resource_group_location" {
  description = "Location of the Inovy application resource group"
  value       = azurerm_resource_group.inovy.location
}

# Networking outputs
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

# Database outputs
output "postgresql_server_id" {
  description = "ID of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.inovy.id
}

output "postgresql_server_fqdn" {
  description = "FQDN of the PostgreSQL Flexible Server"
  value       = azurerm_postgresql_flexible_server.inovy.fqdn
}

output "postgresql_database_name" {
  description = "Name of the PostgreSQL database"
  value       = azurerm_postgresql_flexible_server_database.inovy.name
}

output "postgresql_connection_string" {
  description = "PostgreSQL connection string (without password)"
  value       = "postgresql://${azurerm_postgresql_flexible_server.inovy.administrator_login}@${azurerm_postgresql_flexible_server.inovy.fqdn}:5432/${azurerm_postgresql_flexible_server_database.inovy.name}?sslmode=require"
  sensitive   = true
}

# Backup outputs
output "backup_vault_id" {
  description = "ID of the Backup Vault"
  value       = azurerm_data_protection_backup_vault.inovy.id
}

output "backup_vault_name" {
  description = "Name of the Backup Vault"
  value       = azurerm_data_protection_backup_vault.inovy.name
}

# Redis outputs
output "redis_cache_hostname" {
  description = "Hostname of the Redis Cache"
  value       = azurerm_redis_cache.inovy.hostname
}

output "redis_cache_port" {
  description = "Port of the Redis Cache"
  value       = azurerm_redis_cache.inovy.port
}

output "redis_cache_ssl_port" {
  description = "SSL port of the Redis Cache"
  value       = azurerm_redis_cache.inovy.ssl_port
}

output "redis_cache_primary_access_key" {
  description = "Primary access key for Redis Cache"
  value       = azurerm_redis_cache.inovy.primary_access_key
  sensitive   = true
}

output "redis_cache_secondary_access_key" {
  description = "Secondary access key for Redis Cache"
  value       = azurerm_redis_cache.inovy.secondary_access_key
  sensitive   = true
}

# Note: Application uses @upstash/redis SDK which expects REST API
# Azure Redis Cache Basic tier does not provide REST API
# Consider upgrading to Standard/Premium tier or updating application to use Azure Redis SDK

# Qdrant outputs
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

output "qdrant_api_key" {
  description = "Qdrant API key (if configured)"
  value       = var.qdrant_api_key
  sensitive   = true
}

# Storage outputs
output "storage_account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.recordings.name
}

output "storage_account_primary_connection_string" {
  description = "Primary connection string for the storage account"
  value       = azurerm_storage_account.recordings.primary_connection_string
  sensitive   = true
}

output "storage_account_primary_access_key" {
  description = "Primary access key for the storage account"
  value       = azurerm_storage_account.recordings.primary_access_key
  sensitive   = true
}

output "storage_container_name" {
  description = "Name of the recordings container"
  value       = azurerm_storage_container.recordings.name
}

output "storage_account_primary_blob_endpoint" {
  description = "Primary blob endpoint URL"
  value       = azurerm_storage_account.recordings.primary_blob_endpoint
}

# Container App outputs
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
