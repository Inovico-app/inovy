# Resource Group outputs
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
  value       = module.networking.vnet_id
}

output "vnet_name" {
  description = "Name of the Virtual Network"
  value       = module.networking.vnet_name
}

output "subnet_container_apps_id" {
  description = "ID of the Container Apps subnet"
  value       = module.networking.subnet_container_apps_id
}

output "subnet_postgresql_id" {
  description = "ID of the PostgreSQL subnet"
  value       = module.networking.subnet_postgresql_id
}

# Database outputs
output "postgresql_server_id" {
  description = "ID of the PostgreSQL Flexible Server"
  value       = module.database.postgresql_server_id
}

output "postgresql_server_fqdn" {
  description = "FQDN of the PostgreSQL Flexible Server"
  value       = module.database.postgresql_server_fqdn
}

output "postgresql_database_name" {
  description = "Name of the PostgreSQL database"
  value       = module.database.postgresql_database_name
}

output "postgresql_connection_string" {
  description = "PostgreSQL connection string (without password)"
  value       = module.database.postgresql_connection_string
  sensitive   = true
}

# Backup outputs
output "backup_vault_id" {
  description = "ID of the Backup Vault"
  value       = module.backup.backup_vault_id
}

output "backup_vault_name" {
  description = "Name of the Backup Vault"
  value       = module.backup.backup_vault_name
}

output "backup_vault_identity_principal_id" {
  description = "Principal ID of the Backup Vault identity"
  value       = module.backup.backup_vault_identity_principal_id
}

# Redis outputs (Container App)
output "redis_hostname" {
  description = "Hostname/FQDN of the Redis Container App"
  value       = module.redis.redis_hostname
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.redis_port
}

output "redis_url" {
  description = "Redis connection URL"
  value       = module.redis.redis_url
  sensitive   = true
}

output "container_app_environment_id" {
  description = "ID of the Container App Environment"
  value       = module.container_app_environment.container_app_environment_id
}

# Qdrant outputs
# output "qdrant_url" {
#   description = "Qdrant API URL"
#   value       = module.qdrant.qdrant_url
# }

# output "qdrant_grpc_url" {
#   description = "Qdrant gRPC URL"
#   value       = module.qdrant.qdrant_grpc_url
# }

# output "qdrant_fqdn" {
#   description = "FQDN of the Qdrant container group"
#   value       = module.qdrant.qdrant_fqdn
# }

# output "qdrant_api_key" {
#   description = "Qdrant API key (if configured)"
#   value       = var.qdrant_api_key
#   sensitive   = true
# }

# Storage outputs
output "storage_account_name" {
  description = "Name of the storage account"
  value       = module.storage.storage_account_name
}

output "storage_account_primary_connection_string" {
  description = "Primary connection string for the storage account"
  value       = module.storage.storage_account_primary_connection_string
  sensitive   = true
}

output "storage_account_primary_access_key" {
  description = "Primary access key for the storage account"
  value       = module.storage.storage_account_primary_access_key
  sensitive   = true
}

output "storage_container_name" {
  description = "Name of the recordings container"
  value       = module.storage.storage_container_name
}

output "storage_account_primary_blob_endpoint" {
  description = "Primary blob endpoint URL"
  value       = module.storage.storage_account_primary_blob_endpoint
}

# Container App Identity outputs
output "container_app_managed_identity_id" {
  description = "ID of the Container App managed identity"
  value       = module.container_app_identity.managed_identity_id
}

output "container_app_managed_identity_principal_id" {
  description = "Principal ID of the Container App managed identity"
  value       = module.container_app_identity.managed_identity_principal_id
}

output "container_app_managed_identity_client_id" {
  description = "Client ID of the Container App managed identity"
  value       = module.container_app_identity.managed_identity_client_id
}

# Container App outputs
# output "container_app_environment_id" {
#   description = "ID of the Container App Environment"
#   value       = module.container_app.container_app_environment_id
# }

# output "container_app_id" {
#   description = "ID of the Container App"
#   value       = module.container_app.container_app_id
# }

# output "container_app_fqdn" {
#   description = "FQDN of the Container App"
#   value       = module.container_app.container_app_fqdn
# }

# output "container_app_url" {
#   description = "URL of the Container App"
#   value       = module.container_app.container_app_url
# }
